const common = require("../../utils/common");
const log = require('../../utils/log.js')("changeStreamReader");
var Timestamp = require('mongodb').Timestamp;

/**
 * Class to ruse change streams to read from mongodb.
 */
class changeStreamReader {
    /** 
    * @param {Object} db - Database object
    * @param {Object} options - Options object
    * @param {function} onData - Finction to call when getting new data from stream
    */
    constructor(db, options, onData,) {
        this.db = db;
        this.pipeline = options.pipeline || [];
        this.lastToken = null;
        this.name = options.name || "";
        this.collection = options.collection || "drill_events";
        this.options = options.options;
        this.onClose = options.onClose;
        this.firstDocAfterReset = null;
        this.startupFailure = null;
        this.onData = onData;
        this.interval = options.interval || 10000;
        this.intervalRunner = null;
        this.keep_closed = false;
        this.waitingForAcknowledgement = false;
        this.fallback = options.fallback;

        if (this.fallback && !this.fallback.inteval) {
            this.fallback.interval = 1000;
        }

        //I give data
        //Processor function processes. Sends last processed tken from time to time.
        //Update last processed token to database
        //On startup - read token, resume from that token.
        this.setUp(onData, false);

        if (this.intervalRunner) {
            clearInterval(this.intervalRunner);
        }
        this.intervalRunner = setInterval(this.checkState.bind(this), this.interval);

    }

    /** 
    * Check if stream is closed and restart if needed
    */
    checkState() {
        if ((!this.stream || this.stream.closed) && !this.keep_closed) {
            console.log("Stream is closed. Setting up again");
            this.setUp(this.onData);
        }
        else if (this.waitingForAcknowledgement && Date.now() - this.waitingForAcknowledgement > 60000) {
            console.log("Waiting for acknowledgement for more than 60 seconds. Closing stream and restarting");
            this.keep_closed = false;
            this.stream.close();
        }
    }

    /**
     * Processes range of dates
     * @param {date} cd  - start time
     */
    async processNextDateRange(cd) {
        if (this.fallback) {
            var cd2 = cd.valueOf() + 60000;
            var now = Date.now().valueOf();
            cd2 = cd2 > now ? now : cd2;

            cd2 = new Date(cd2);
            var pipeline = JSON.parse(JSON.stringify(this.fallback.pipeline)) || [];
            var match = this.fallback.match || {};
            match.cd = {$gte: new Date(cd), $lt: cd2};
            pipeline.unshift({"$match": match});
            var cursor = this.db.collection(this.collection).aggregate(pipeline);

            while (await cursor.hasNext()) {
                var doc = await cursor.next();
                this.onData({"token": "timed", "cd": doc.cd, "_id": doc._id}, doc);
            }
            setTimeout(() => {
                this.processNextDateRange(cd2);
            }, this.fallback.interval || 10000);
        }
    }

    /** 
    * Process bad range((when token can't continue))
    * @param {Object} options - Options object
    * @param {Object} tokenInfo - Token info object
    */
    async processBadRange(options, tokenInfo) {
        console.log("Processing bad range");
        console.log(JSON.stringify({cd: {$gte: options.cd1, $lt: options.cd2}}));
        var gotTokenDoc = false;
        var doc;
        var cursor = this.db.collection(this.collection).find({cd: {$gte: new Date(options.cd1), $lt: new Date(options.cd2)}}).sort({cd: 1});
        while (await cursor.hasNext() && !gotTokenDoc) {
            doc = await cursor.next();
            if (JSON.stringify(doc._id) === JSON.stringify(tokenInfo._id) || doc.cd > tokenInfo.cd) {
                gotTokenDoc = true;
            }
            console.log("SKIP:" + JSON.stringify(doc));
        }
        if (doc && doc.cd > tokenInfo.cd) {
            tokenInfo.cd = doc.cd;
            tokenInfo._id = doc._id;
            console.log(this.name + " Process:" + JSON.stringify(doc));
            this.onData(tokenInfo, doc);
        }

        while (await cursor.hasNext()) {
            doc = await cursor.next();
            console.log(this.name + " Process:" + JSON.stringify(doc));
            tokenInfo.cd = doc.cd;
            tokenInfo._id = doc._id;
            this.onData(tokenInfo, doc);
        }
        console.log("done");
    }

    /**
     *  Sets up stream to read data from mongodb
     *  @param {function} onData  - function to call on new data
     */
    async setUp(onData) {
        var token;
        try {
            if (this.stream && !this.stream.closed) {
                console.log("Stream is already open. returning");
                return;
            }
            var options = JSON.parse(JSON.stringify(this.options || {}));
            var tokenFailed = false;
            var res = await common.db.collection("plugins").findOne({"_id": "_changeStreams"}, {projection: {[this.name]: 1}});
            if (res && res[this.name] && res[this.name].token) {
                token = res[this.name];
                options.startAfter = token.token;
            }
            if (this.failedToken && JSON.stringify(this.failedToken.token) === JSON.stringify(token.token)) {
                console.log("Do not use failed token");
                tokenFailed = true;
                delete options.startAfter;
                var startTime = Date.now().valueOf() / 1000 - 60;
                if (startTime) {
                    options.startAtOperationTime = new Timestamp({t: startTime, i: 1});
                }
            }
            console.log("Stream options: " + JSON.stringify(options));
            if (this.collection) {
                this.stream = await this.db.collection(this.collection).watch(this.pipeline, options);
            }
            else {
                this.stream = await this.db.watch(this.pipeline, options);
            }
            var self = this;

            if (tokenFailed) {
                //fetch data while cd is less than failed token
                console.log("Fetching data while cd is less or equal cd to failed token");
                var doc;
                do {
                    doc = await this.stream.next();
                    console.log(JSON.stringify(doc));
                }
                while (doc && doc.cd && doc.cd <= token.cd);
                this.keep_closed = true;
                this.stream.close();
                var next_token = {"token": this.stream.resumeToken};
                next_token._id = doc.__id;
                next_token.cd = doc.cd;
                try {
                    this.processBadRange({name: this.name, cd1: token.cd, cd2: next_token.cd}, this.failedToken);
                    this.onData(next_token, doc);
                    this.waitingForAcknowledgement = Date.now();
                    this.restartStream = true;
                    this.failedToken = null;
                }
                catch (err) {
                    log.e("Error on processing bad range", err);
                    if (this.onClose) {
                        this.onClose(function() {
                            this.keep_closed = false;
                        });
                    }
                }
            }
            else {
                this.stream.on('change', (change) => {
                    var my_token = {token: self.stream.resumeToken};
                    my_token._id = change.__id;
                    if (change.cd) {
                        my_token.cd = change.cd;
                        onData(my_token, change);
                    }
                    else {
                        onData(my_token, change);
                    }
                });

                this.stream.on('error', async(err) => {
                    if (err.code === 286 || err.code === 50811 || err.code === 9 || err.code === 14 || err.code === 280) { //Token is not valid
                        log.e("Set Failed token", token);
                        this.failedToken = token;
                    }
                    else if (err.code === 40573) { //change stream is not supported
                        console.log("Change stream is not supported. Keeping streams closed");
                        this.keep_closed = true;
                    }
                    else {
                        log.e("Error on change stream", err);
                    }
                });
                //Turns out it is closing on exhausted. So we have to let aggregator know to flush aggregated data.
                this.stream.on('close', () => {
                    //Trigger flushing data
                    if (this.onClose) {
                        this.onClose(function() {});
                    }
                    log.e("Stream closed.");
                });
            }
        }
        catch (err) {
            if (err.code === 286 || err.code === 50811 || err.code === 9) { //failed because of bad token
                console.log("Set Failed token", token);
                this.failedToken = token;
            }
            //Failed because of db does not support change streams. Run in "query mode";
            else if (err.code === 40573) { //change stream is not supported
                console.log("Change stream is not supported. Keeping streams closed");
                this.keep_closed = true;
                var newCD = Date.now();
                if (token && token.cd) {
                    await this.processBadRange({name: this.name, cd1: token.cd, cd2: newCD}, token);
                }

                this.processNextDateRange(newCD);
                //Call process bad range if there is any info about last token.
                //Switch to query mode
            }
            else {
                log.e("Error on change stream", err);
            }
        }
    }

    /**
     * Acknowledges token as recorded
     * @param {object} token  - token info
     */
    async acknowledgeToken(token) {
        this.lastToken = token;
        //Update last processed token to database
        try {
            await common.db.collection("plugins").updateOne({"_id": "_changeStreams"}, {$set: {[this.name]: token}}, {"upsert": true});
            if (this.restartStream) {
                this.waitingForAcknowledgement = false;
                this.keep_closed = false;
                this.restartStream = false;
                this.stream.close();
            }
        }
        catch (err) {
            log.e("Error on acknowledging token", JSON.stringify(err));
        }
    }

    /**
     * Closes stream permanently
     */
    close() {
        console.log("Closing permanently");
        if (this.intervalRunner) {
            clearInterval(this.intervalRunner);
        }
        this.keep_closed = true;
        this.stream.close(true);
    }


}

module.exports = {changeStreamReader};