const common = require("../../utils/common");
const log = require('../../utils/log.js')("dataBatchReader");
var plugins = require("../../../plugins/pluginManager.js");
var {fetchDataForAggregator} = require("../queries/aggregator.js");

/**
 * Class to read/aggregate data in batches from mongodb and pass for processing.
 */
class DataBatchReader {
    /** 
    * @param {Object} db - Database object
    * @param {Object} options - Options object
    * @param {function} onData - Finction to call when getting new data from stream
    */
    constructor(db, options, onData,) {
        log.e("Creating dataBatchReader", JSON.stringify(options));
        this.db = db;
        this.pipeline = options.pipeline || [];
        this.match = options.match || {};
        this.timefield = options.timefield || "cd"; //default time field is cd
        this.lastToken = null;
        this.name = options.name || "";
        this.collection = options.collection || "drill_events";
        this.options = options.options;
        this.onData = onData;
        this.interval = options.interval || 10000;
        if (plugins.getConfig("aggregator") && plugins.getConfig("aggregator").interval) {
            log.w("Using aggregator config interval for dataBatchReader", plugins.getConfig("aggregator").interval);
            this.interval = plugins.getConfig("aggregator").interval;
        }

        this.reviveInterval = options.reviveInterval || 60000; //1 minute
        this.setUp();

        this.localId = this.name + Date.now().valueOf();

        this.intervalRunner = setInterval(this.checkState.bind(this), this.reviveInterval);
    }

    /** 
    * Check if stream is closed and restart if needed
    */
    async checkState() {
        log.d("Checking state for batcher to revive if dead");
        //Check last token in database. If it is older than 60 seconds. Set up again
        try {
            var token = await common.db.collection("plugins").findOne({"_id": "_changeStreams"}, {projection: {[this.name]: 1}});
            if (token && token[this.name] && token[this.name].lu) {
                var lu = token[this.name].lu.valueOf();
                var now = Date.now().valueOf();
                if (now - lu > this.reviveInterval) {
                    log.e("Stream is closed. Restarting it");
                    this.setUp();
                }
            }
            else {
                log.e("Processor does not exists. Set it up again.");
                this.setUp();
            }
        }
        catch (err) {
            log.e("Error checking state for batcher", err);
        }
    }

    /**
     * Processes range of dates
     * @param {date} cd  - start time
     */
    async processNextDateRange() {
        var lastToken = await common.db.collection("plugins").findOne({"_id": "_changeStreams"}, {projection: {[this.name]: 1}});
        var cd = lastToken && lastToken[this.name] ? lastToken[this.name].cd : Date.now();
        var end_date = cd.valueOf() + this.interval;
        var now = Date.now().valueOf();
        while (end_date < now) {
            var pipeline = JSON.parse(JSON.stringify(this.pipeline)) || [];
            var match = this.match || {};

            if (this.timefield) {
                match[this.timefield] = {$gte: new Date(cd), $lt: new Date(end_date)};
            }
            else {
                match.cd = {$gte: new Date(cd), $lt: new Date(end_date)};
            }
            pipeline.unshift({"$match": match});
            //Reads from mongodb or clickhouse(if code is defined);
            var data = await fetchDataForAggregator({pipeline: pipeline, name: this.name, cd1: cd, cd2: end_date});

            try {
                if (data.length > 0) {
                    await this.onData({"token": "timed", "cd": new Date(end_date), "_id": null}, data);
                }
                await this.acknowledgeToken({"token": "timed", "cd": new Date(end_date), "_id": null});
                //acknowledge
            }
            catch (err) {
                log.e(this.name + ": Error processing data for - " + end_date + " " + JSON.stringify(err));
                return; //exiting loop.
            }
            cd = end_date;
            end_date = end_date + this.interval;
            now = Date.now().valueOf();
        }
        this.processTimeout = setTimeout(() => {
            this.processNextDateRange();
        }, this.interval);

    }


    /**
     *  Sets up stream to read data from mongodb
     *  @param {function} onData  - function to call on new data
     */
    async setUp() {
        var res = await common.db.collection("plugins").findOne({"_id": "_changeStreams"}, {projection: {[this.name]: 1}});
        if (!res || !res[this.name]) {
            //none exists. create token with current time
            log.e("None exists. Creating new token for " + this.name);
            await common.db.collection("plugins").updateOne({"_id": "_changeStreams"}, {$set: {[this.name]: {"token": "timed", "cd": Date.now(), "_id": null, localId: this.localId}}}, {"upsert": true});
        }
        else {
            log.e("some exits. Checking if it is stale for " + this.name);
            //we have some document. Check last cd and start process on localId if it is stale
            var lu = 0;
            if (res[this.name].lu) {
                lu = res[this.name].lu.valueOf();
            }
            var now = Date.now().valueOf();
            if (now - lu > this.reviveInterval) {
                log.e("It is stale. Setting up again for " + this.name);
                //try setting this as correct local id
                var query = {"_id": "_changeStreams"};
                query[this.name + ".localId"] = res[this.name].localId;

                var set = {};
                set[this.name + ".localId"] = this.localId;
                set[this.name + ".lu"] = Date.now();

                var newDoc = await common.db.collection("plugins").updateOne(query, {$set: set}, {"upsert": false});
                if (newDoc && newDoc.modifiedCount > 0) {
                    //all good
                    log.e(this.name + ": set up with localId - " + this.localId);
                }
                else {
                    log.e(this.name + ": Could not set up with localId - " + this.localId);
                    //Do not contiinue. Some other process might have started thos
                    return;
                }
            }
            else {
                log.e("Seems like there is one running. do not do anything yet.");
                //do not start yet. Wait for next interval
                return;
            }
        }
        this.processNextDateRange();

    }

    /**
     * Acknowledges token as recorded
     * @param {object} token  - token info
     */
    async acknowledgeToken(token) {
        this.lastToken = token;
        //Update last processed token to database
        var query = {"_id": "_changeStreams"};
        query[this.name + ".localId"] = this.localId;
        var set = {};
        set[this.name + ".lu"] = Date.now();
        set[this.name + ".cd"] = token.cd;
        var rezz = await common.db.collection("plugins").updateOne(query, {$set: set}, {"upsert": false});
        if (rezz && rezz.modifiedCount > 0) {
            //all good
        }
        else {
            //could not match. Looks like some other process is aggregating. throw error
            throw new Error("Could not acknowledge token. Looks like some other process is aggregating");
        }
    }

    /**
     * Closes stream permanently
     */
    close() {
        log.i(`[${this.name}] Closing change stream reader permanently`);
        if (this.intervalRunner) {
            clearInterval(this.intervalRunner);
            this.intervalRunner = null;
        }
        if (this.processTimeout) {
            clearTimeout(this.processTimeout);
            this.processTimeout = null;
        }
    }

}

module.exports = {DataBatchReader};