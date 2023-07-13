var exported = {},
    plugins = require('../../pluginManager.js'),
    countlyModel = require('../../../api/lib/countly.model.js'),
    countlySession = countlyModel.load("users"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    common = require('../../../api/utils/common.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    crypto = require('crypto'),
    async = require('async'),
    log = common.log('compare:api'),
    { validateRead, getUserApps } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'compare';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    /**
    * @api {get} o/compare/events Compare Events
    * @apiName CompareEvents
    * @apiGroup Compare
    * @apiDescription Compare Events
    * @apiQuery {String} period Default period format for Countly
    * @apiQuery {String} events stringified argument with  an array of events to be compared
    * Example: [
                "Fund Transfer Begin",
                "Fund Transfer"
               ]
    * @apiQuery {String} api_id Application ID
    * @apiSuccessExample {Object} Success-Response:
    * HTTP/1.1 200 OK
    * {"Login":{"2022":{"4":{"28":{"0":{"c":2},"1":{"c":3},"2":{"c":2},"3":{"c":3},"4":{"c":1},"5":{"c":2},"6":{"c":2},"7":{"c":4},"8":{"c":3},"9":{"c":408},"c":430}}},"meta":{"Method":["Password","Face ID"],"segments":["Method"]}},"Credit Card Application":{"2022":{"4":{"28":{"0":{"c":5},"1":{"c":5},"2":{"c":4},"3":{"c":2},"4":{"c":3},"5":{"c":4},"6":{"c":2},"7":{"c":2},"8":{"c":6},"9":{"c":383},"c":416}}},"meta":{"Card Type":["Premium","Black","Basic"],"segments":["Card Type"]}}}
    * @apiErrorExample Error Response (example):
    *     HTTP/1.1 400 Bad Request
    *     {
                "result": "Missing parameter: events"
          }
    **/
    plugins.register('/o/compare/events', function(ob) {
        var params = ob.params;

        if (params.qstring.events) {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
            }
            catch (SyntaxError) {
                log.w('Parse /o/compare/events JSON failed');
            }
        }

        if (!params.qstring.events || params.qstring.events.length === 0) {
            common.returnMessage(params, 400, 'Missing parameter: events');
            return true;
        }

        if (params.qstring.events.length > 20) {
            common.returnMessage(params, 400, 'Maximum length for parameter events is 20');
            return true;
        }

        validateRead(params, FEATURE_NAME, function() {
            var eventKeysArr = params.qstring.events;
            var collectionNames = [];

            for (var i = 0; i < eventKeysArr.length; i++) {
                collectionNames.push(
                    (eventKeysArr[i].startsWith('[CLY]_group_')) ? eventKeysArr[i] : "events" + crypto.createHash('sha1').update(eventKeysArr[i] + params.app_id).digest('hex')
                );
            }

            async.map(collectionNames, getEventData, function(err, allEventData) {
                var outputObj = {};

                for (var eventDataIndex = 0; eventDataIndex < allEventData.length; eventDataIndex++) {
                    outputObj[eventKeysArr[eventDataIndex]] = allEventData[eventDataIndex];
                }

                common.returnOutput(params, outputObj);
            });
        });

        /**
        * Get events by collection name
        * @param {string} collectionName - collection name value
        * @param {function} callback - callback method
        **/
        function getEventData(collectionName, callback) {
            if (collectionName.startsWith('[CLY]_group_')) {
                fetch.getMergedEventGroups(params, collectionName, {}, function(output) {
                    callback(null, output || {});
                });
            }
            else {
                fetch.getTimeObjForEvents(collectionName, params, function(output) {
                    callback(null, output || {});
                });
            }
        }

        return true;
    });
    /**
    * @api {get} o/compare/apps Compare Apps
    * @apiName CompareApps
    * @apiGroup Compare
    * @apiDescription Compare Apps
    * @apiQuery {String} period Default period format for Countly
    * @apiQuery {String} apps stringified argument with  an array of apps to be compared
    * Example: [
                    "6263b8cef96e9e029d9802dc",
                 "6267cc30b395e185d91faec2"
               ]
    * @apiQuery {String} api_key API_KEY of user, with permission to access this app
    * @apiSuccessExample {Object} Success-Response:
    * HTTP/1.1 200 OK
    * [{"id":"6263b8cef96e9e029d9802dc","name":"test","sessions":{"total":0,"change":"∞","trend":"d"},"users":{"total":0,"change":"∞","trend":"d","is_estimate":false},"newusers":{"total":0,"change":"∞","trend":"d"},"duration":{"total":"0.0 min","change":"∞","trend":"d"},"avgduration":{"total":"0.0 min","change":"∞","trend":"d"},"charts":{"total-users":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"new-users":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"total-sessions":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"time-spent":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"total-time-spent":[[0,"0.0"],[1,"0.0"],[2,"0.0"],[3,"0.0"],[4,"0.0"],[5,"0.0"],[6,"0.0"],[7,"0.0"],[8,"0.0"],[9,"0.0"],[10,"0.0"],[11,"0.0"],[12,"0.0"],[13,"0.0"],[14,"0.0"],[15,"0.0"],[16,"0.0"],[17,"0.0"],[18,"0.0"],[19,"0.0"],[20,"0.0"],[21,"0.0"],[22,"0.0"],[23,"0.0"]],"avg-events-served":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]]}},{"id":"6267cc30b395e185d91faec2","name":"Test App","sessions":{"total":87,"change":"47.5%","trend":"u"},"users":{"total":78,"change":"32.2%","trend":"u","is_estimate":false},"newusers":{"total":22,"change":"120%","trend":"u"},"duration":{"total":"3.3 hours","change":"420.1%","trend":"u"},"avgduration":{"total":"2.2 min","change":"252.7%","trend":"u"},"charts":{"total-users":[[0,1],[1,3],[2,1],[3,0],[4,0],[5,2],[6,4],[7,2],[8,4],[9,70],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"new-users":[[0,1],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,1],[9,20],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"total-sessions":[[0,1],[1,3],[2,1],[3,0],[4,0],[5,2],[6,4],[7,2],[8,4],[9,70],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"time-spent":[[0,"3.0"],[1,"0.2"],[2,"2.0"],[3,0],[4,0],[5,"0.3"],[6,"0.1"],[7,"1.0"],[8,"0.3"],[9,"2.6"],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]],"total-time-spent":[[0,"3.0"],[1,"0.5"],[2,"2.0"],[3,"0.5"],[4,"1.0"],[5,"0.5"],[6,"0.5"],[7,"2.0"],[8,"1.0"],[9,"184.0"],[10,"0.0"],[11,"0.0"],[12,"0.0"],[13,"0.0"],[14,"0.0"],[15,"0.0"],[16,"0.0"],[17,"0.0"],[18,"0.0"],[19,"0.0"],[20,"0.0"],[21,"0.0"],[22,"0.0"],[23,"0.0"]],"avg-events-served":[[0,"9.0"],[1,"2.0"],[2,"8.0"],[3,0],[4,0],[5,"2.0"],[6,"1.3"],[7,"3.5"],[8,"2.3"],[9,"10.8"],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0]]}}]
     * @apiErrorExample Error Response (example):
    *     HTTP/1.1 400 Bad Request
    *     {
                "result": "Missing parameter: apps"
          }
    **/
    plugins.register('/o/compare/apps', function(ob) {
        var params = ob.params;

        if (params.qstring.apps) {
            try {
                params.qstring.apps = JSON.parse(params.qstring.apps);
            }
            catch (SyntaxError) {
                log.w('Parse /o/compare/apps JSON failed');
            }
        }

        if (!params.qstring.apps || params.qstring.apps.length === 0) {
            common.returnMessage(params, 400, 'Missing parameter: apps');
            return true;
        }

        if (params.qstring.apps.length > 20) {
            common.returnMessage(params, 400, 'Maximum length for parameter apps is 20');
            return true;
        }

        var appsToFetch = params.qstring.apps;
        for (var appsFetchIndex = 0; appsFetchIndex < appsToFetch.length; appsFetchIndex++) {
            if (appsToFetch[appsFetchIndex].length !== 24) {
                common.returnMessage(params, 400, 'Invalid app id length in apps parameter, each app id should be 24 characters long');
                return true;
            }
        }
        params.qstring.app_id = appsToFetch[0];

        validateRead(params, FEATURE_NAME, function() {
            const userApps = getUserApps(params.member);
            if (!params.member.global_admin) {
                for (var i = 0; i < appsToFetch.length; i++) {
                    if (params.member && userApps) {
                        if (userApps.indexOf(appsToFetch[i]) === -1) {
                            common.returnMessage(params, 401, 'User does not have view rights for one or more apps provided in apps parameter');
                            return true;
                        }
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have view rights for one or more apps provided in apps parameter');
                        return true;
                    }
                }
            }

            for (var appsIndex = 0; appsIndex < appsToFetch.length; appsIndex++) {
                appsToFetch[appsIndex] = common.db.ObjectID(appsToFetch[appsIndex]);
            }

            common.db.collection("apps").find({_id: {$in: appsToFetch}}, {_id: 1, name: 1}).toArray(function(err, apps) {

                /**
                * Extract data for chart from db
                * @param {object} db - data object
                * @param {object} props - props for chart
                * @returns {object} returns chart data object
                **/
                function extractData(db, props) {
                    var chartData = [
                            { data: [], label: "", color: '#333933' }
                        ],
                        dataProps = [];
                    dataProps.push(props);
                    return countlyCommon.extractChartData(db, countlySession.clearObject, chartData, dataProps).chartDP[0].data;
                }

                /**
                * Set app id value
                * @param {string} inAppId - app id value
                */
                function setAppId(inAppId) {
                    params.app_id = inAppId + "";
                }

                countlyCommon.setTimezone(params.appTimezone);

                async.map(apps, function(app, callback) {
                    console.log(JSON.stringify(app));
                    setAppId(app._id);

                    fetch.getTimeObj('users', params, function(usersDoc) {

                        // We need to set app_id once again here because after the callback
                        // it is reset to it's original value
                        setAppId(app._id);

                        fetch.getTotalUsersObj("users", params, function(dbTotalUsersObj) {
                            countlySession.setDb(usersDoc || {});
                            countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, null, true));

                            var sessionData = countlySession.getSessionData();
                            var charts = {
                                "total-users": extractData(usersDoc || {}, {
                                    name: "t",
                                    func: function(dataObj) {
                                        return dataObj.u;
                                    }
                                }),
                                "new-users": extractData(usersDoc || {}, { name: "n" }),
                                "total-sessions": extractData(usersDoc || {}, { name: "t" }),
                                "time-spent": extractData(usersDoc || {}, {
                                    name: "average",
                                    func: function(dataObj) {
                                        return ((dataObj.t === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                                    }
                                }),
                                "total-time-spent": extractData(usersDoc || {}, {
                                    name: "t",
                                    func: function(dataObj) {
                                        return ((dataObj.d / 60).toFixed(1));
                                    }
                                }),
                                "avg-events-served": extractData(usersDoc || {}, {
                                    name: "average",
                                    func: function(dataObj) {
                                        return ((dataObj.u === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                                    }
                                })
                            };

                            var data = {id: app._id, name: app.name, sessions: sessionData.total_sessions, users: sessionData.total_users, newusers: sessionData.new_users, duration: sessionData.total_time, avgduration: sessionData.avg_time, charts: charts};
                            callback(null, data);
                        });
                    });
                },
                function(err2, res) {
                    if (err2) {
                        return common.returnMessage(params, 503, 'Fetch apps data failed');
                    }
                    common.returnOutput(params, res);
                });
            });
        });

        return true;
    });

}(exported));

module.exports = exported;