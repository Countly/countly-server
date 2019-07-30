const job = require("../parts/jobs/job.js");
const async = require("async");
const crypto = require("crypto");
const countlyApi = {
    data: {
        fetch: require("../parts/data/fetch.js"),
        lib: require("../lib/countly.model.js")
    }
};
const countlyEvents = countlyApi.data.lib.load("event");

/** Class for job of top events widget **/
class TopEventsJob extends job.Job {
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
                        result.list = result.list.filter(l => !l.includes('[CLY]'));
                        const eventMap = [];
                        for (const mapKey of result.list) {
                            if (result.map) {
                                if (typeof result.map[mapKey] === "undefined") {
                                    result.map[mapKey] = true;
                                }
                                if (typeof result.map[mapKey] !== "object" && result.map[mapKey]) {
                                    eventMap.push(mapKey);
                                }
                            }
                            else {
                                eventMap.push(mapKey);
                            }
                        }
                        if (eventMap instanceof Array) {
                            const collectionName = "top_events";
                            db.collection(collectionName).remove({app_id: _id});
                            const arrPeriod = ["30days", "hour"];
                            async.eachSeries(arrPeriod, (givenPeriod, eachCallback) => {
                                const data = {};
                                const ob = {
                                    app_id: _id,
                                    appTimezone: timezone,
                                    qstring: {
                                        period: givenPeriod
                                    }
                                };
                                async.each(eventMap, (event, doneEventMap) => {
                                    const collectionNameEvents = "events" + crypto.createHash("sha1").update(event + _id).digest("hex");
                                    countlyApi.data.fetch.getTimeObjForEvents(collectionNameEvents, ob, (doc)=> {
                                        countlyEvents.setDb(doc || {});
                                        const countProp = countlyEvents.getNumber("c");
                                        data[event] = {};
                                        data[event].data = {
                                            count: countProp
                                        };
                                        doneEventMap();
                                    });
                                }, () => {
                                    const ts = Math.round(new Date().getTime() / 1000);
                                    const period = givenPeriod === "hour" ? "today" : givenPeriod;
                                    db.collection(collectionName).insert({app_id: _id, ts, period, data}, (error, records) => {
                                        if (!error && records) {
                                            eachCallback();
                                        }
                                    });
                                });

                            }, ()=>{
                                resultEachCallback();
                            });
                        }
                    }
                });
            });
        });
        done();
    }
}

module.exports = TopEventsJob;