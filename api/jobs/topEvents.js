const job = require("../parts/jobs/job.js");
const async = require("async");
const crypto = require("crypto");
const countlyApi = {
    data: {
        fetch: require("../parts/data/fetch.js"),
        lib: require("../lib/countly.model.js"),
        common: require("../lib/countly.common.js")
    }
};
const countlyEvents = countlyApi.data.lib.load("event");
const countlyCommon = countlyApi.data.common;

/** Class for job of top events widget **/
class TopEventsJob extends job.Job {

    /**
     * Events collections.
     * @param {string} eventName - event name.
     * @param {ObjectId} appId - app id.
     * @return {string} event collection.
     */
    eventsCollentions(eventName, appId) {
        return "events" + crypto.createHash("sha1").update(eventName + appId).digest("hex");
    }

    /**
     * If the event's name include [CLY], removed them.
     * @param {array} eventsData - events list.
     * @return {array} filtered data.
     */
    eventsFilter(eventsData) {
        return eventsData.filter(l => !l.includes('[CLY]'));
    }

    /**
     * Get events count.
     * @param {string} colName - event collection name.
     * @param {Object} ob - it contains all necessary info.
     * @param {Object} data - dummy event data.
     * @param {string} event - event name.
     * @param {function} doneCallback - callback.
     * @returns {Object} topEvents data.
     */
    getEventsCount(colName, ob, data, event, doneCallback) {
        return countlyApi.data.fetch.getTimeObjForEvents(colName, ob, (doc)=> {
            countlyEvents.setDb(doc || {});
            const countProp = countlyEvents.getNumber("c");
            data[event] = {};
            data[event].data = {
                count: countProp
            };
            doneCallback();
        });
    }

    /**
     * Encode event name.
     * @param {Object} data - event data.
     * @return {Object} encoded data.
     */
    encodeEvents(data) {
        const _data = {};
        Object.keys(data).forEach(key => {
            const encodeKey = countlyCommon.encode(key);
            _data[encodeKey] = data[key];
        });
        return _data;
    }

    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        db.collection("apps").find({}, {_id: 1, timezone: 1}).toArray((errorApps, resultApps)=> {
            async.eachSeries(resultApps, (givenApps, resultEachCallback) => {
                const {_id, timezone} = givenApps;
                db.collection("events").findOne({_id}, (errorEvents, result) =>{
                    if (result && 'list' in result) {
                        const eventMap = this.eventsFilter(result.list);
                        if (eventMap && eventMap instanceof Array && eventMap.length >= TopEventsJob.TOTAL_EVENT_COUNT) {
                            db.collection(TopEventsJob.COLLENTION_NAME).remove({app_id: _id});
                            async.eachSeries(TopEventsJob.PERIODS, (givenPeriod, eachCallback) => {
                                const data = {};
                                const ob = { app_id: _id, appTimezone: timezone, qstring: { period: givenPeriod } };
                                async.each(eventMap, (event, doneEventMap) => {
                                    const collectionNameEvents = this.eventsCollentions(event, _id);
                                    this.getEventsCount(collectionNameEvents, ob, data, event, doneEventMap);
                                }, () => {
                                    const encodedData = this.encodeEvents(data);
                                    const ts = Math.round(new Date().getTime() / 1000);
                                    const period = givenPeriod === "hour" ? "today" : givenPeriod;
                                    db.collection(TopEventsJob.COLLENTION_NAME).insert({app_id: _id, ts, period, data: encodedData}, (error, records) => {
                                        if (!error && records) {
                                            eachCallback();
                                        }
                                    });
                                });
                            }, ()=>{
                                resultEachCallback();
                            });
                        }
                        else {
                            db.collection(TopEventsJob.COLLENTION_NAME).remove({app_id: _id});
                            resultEachCallback();
                        }
                    }
                    else {
                        resultEachCallback();
                    }
                });
            });
        });
        done();
    }
}

/**
 * The total count of events for calculating TopEvents widget must be 5 or more.
 * @property {number}
 */
TopEventsJob.TOTAL_EVENT_COUNT = 5;

/**
 * TopEvents collection name.
 * @property {string}
 */
TopEventsJob.COLLENTION_NAME = "top_events";

/**
 * Events periods.
 * @property {array} ["30days", "hour", "month", "60days", "yesterday", "7days"]
 */
TopEventsJob.PERIODS = ["30days", "hour"];

module.exports = TopEventsJob;