const job = require('../parts/jobs/job.js');
const async = require('async');
const _ = require('underscore');
const crypto = require('crypto');
const common = require('../utils/common.js');
const countlyApi = {
    data: {
        fetch: require('../parts/data/fetch.js'),
        lib: require('../lib/countly.model.js')
    }
};
const countlyEvents = countlyApi.data.lib.load("event");
const countlyCommon = countlyApi.data.lib.load("common");

/** Class for job of top events widget **/
class TopEventsJob extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        common.db.collection('apps').find({}, {}).toArray(function(err, result) {
            async.eachSeries(result, function(givenApps, eachSeriesCallback) {
                const app_id = givenApps._id;
                const appTimezone = givenApps.timezone;
                common.db.collection('events').findOne({
                    '_id': app_id
                }, function(err, result) {
                    if(!err && result && result.hasOwnProperty('list')) {
                        result.list = _.filter(result.list, function(l) {
                            return l.indexOf('[CLY]') !== 0;
                        });
                        let eventMap = [];
                        for (let index = 0; index < result.list.length; index++) {
                            if (result.map) {
                                let mapKey = result.list[index];
                                if (typeof result.map[mapKey] === "undefined") {
                                    result.map[mapKey] = true;
                                }
                                if (typeof result.map[mapKey] !== 'object' && result.map[mapKey]) {
                                    eventMap.push(result.list[index]);
                                }
                            } else {
                                eventMap.push(result.list[index]);
                            }
                        }
                        if (Array.isArray(eventMap)) {
                            const arrPeriod = ['30days', 'hour'];
                            const appID = String(app_id.toString());
                            const collectionName = "top_events" + crypto.createHash('sha1').update(appID).digest('hex');
                            common.db.collection(collectionName).drop();
                            async.eachSeries(arrPeriod, function(givenPeriod, eachCallback) {
                                var data = {};
                                var ob = {
                                    app_id,
                                    appTimezone,
                                    qstring: {
                                        period: givenPeriod
                                    }
                                }
                                setTimeout(function() {
                                    async.each(eventMap, function(event, done) {
                                            var collectionName = "events" + crypto.createHash('sha1').update(event + app_id).digest('hex');
                                            countlyApi.data.fetch.getTimeObjForEvents(collectionName, ob, function(doc) {
                                                countlyEvents.setDb(doc || {});
                                                var countProp = countlyEvents.getNumber("c");
                                                data[event] = {};
                                                data[event].data = {
                                                    "count": countProp
                                                };
                                                done();
                                            });
                                        },
                                        function() {
                                            givenPeriod === "hour" ? givenPeriod = "today" : givenPeriod;
                                            common.db.collection(collectionName).insert({
                                                ts: Math.round(new Date().getTime() / 1000),
                                                period: givenPeriod,
                                                data
                                            });
                                        });
                                    eachCallback();
                                }, 2000);
                            })
                        }
                    }
                });
                eachSeriesCallback();
            });
        });
        done();
    }
}

module.exports = TopEventsJob;