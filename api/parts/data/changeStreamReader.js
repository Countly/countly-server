const common = require("../../utils/common");
const log = require('../../utils/log.js')("changeStreamReader");


class changeStreamReader {

    constructor(db, options, onData,) {
        this.db = db;
        this.pipeline = options.pipeline || [];
        this.lastToken = null;
        this.name = options.name || "";
        this.collection = options.collection;
        this.options = options.options;
        this.onClose = options.onClose;


        //I give data
        //Processor function processes. Sends last processed tken from time to time.
        //Update last processed token to database
        //On startup - read token, resume from that token.

        this.setUp(onData);
    }

    async resetPoint(callback) {
        var unset = {};
        unset[this.name] = "";
        await common.db.collection("plugins").updateOne({"_id": "_changeStreams"}, {"$unset": unset});
        this.lastToken = "";
    }

    async setUp(onData) {
        try {
            var res = await common.db.collection("plugins").findOne({"_id": "_changeStreams"});

            var options = JSON.parse(JSON.stringify(this.options || {}));
            if (res && res[this.name]) {
                this.lastToken = res[this.name];
                options.resumeAfter = this.lastToken;
            }
            else {
                this.lastToken = "";
                delete options.lastToken;
            }
            if (this.collection) {
                this.stream = this.db.collection(this.collection).watch(this.pipeline, options);
            }
            else {
                this.stream = this.db.watch(this.pipeline, options);
            }
            var self = this;
            this.stream.on('change', (change) => {
                onData(self.stream.resumeToken, change);
            });

            this.stream.on('error', async(err) => {
                log.e("Error in change stream", err);
                for (var key in err) {
                    console.log(key);
                }
                console.log(typeof err.code);
                if (err.code === 286) {
                    //lost history.
                    //forget token
                    self.resetPoint(function() {
                        self.setUp(onData);
                    });
                }
                else {
                    if (this.onClose) {
                        this.onClose();
                    }
                    //Try reopening after failure
                    setTimeout(() => {
                        log.e("Reopening stream.");
                        self.setUp(onData);
                    }, 10000);
                }

            });

            //Turns out it is closing on exhausted. So we have to let aggregator know to flush aggregated data.
            this.stream.on('close', () => {
                console.trace();
                console.log(this.name);
                //Trigger flushing data
                if (this.onClose) {
                    this.onClose();
                }
                setTimeout(() => {
                    log.e("Reopening stream.");
                    self.setUp(onData);
                }, 10000);

                log.e("Stream closed.");
            });
        }
        catch (err) {
            log.e("Error on creating change stream", JSON.stringify(err));
            for (var key in err) {
                console.log(key);
            }
            if (err.code === 286) {
                self.resetPoint(function() {
                    self.setUp(onData);
                });
            }
        }
    }

    acknowledgeToken(token) {
        this.lastToken = token;
        //Update last processed token to database
        common.db.collection("plugins").updateOne({"_id": "_changeStreams"}, {$set: {[this.name]: token}}, {"upsert": true});
    }


}

module.exports = {changeStreamReader};