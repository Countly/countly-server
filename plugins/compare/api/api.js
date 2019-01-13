var exported = {},
    plugins = require('../../pluginManager.js'),
    countlyModel = require('../../../api/lib/countly.model.js'),
    countlySession = countlyModel.load("users"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    common = require('../../../api/utils/common.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    crypto = require('crypto'),
    async = require('async'),
    log = common.log('compare:api');

(function() {

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
            return common.returnMessage(params, 400, 'Missing parameter: events');
        }

        if (params.qstring.events.length > 10) {
            return common.returnMessage(params, 400, 'Maximum length for parameter events is 10');
        }

        ob.validateUserForDataReadAPI(params, function() {
            var eventKeysArr = params.qstring.events;
            var collectionNames = [];

            for (var i = 0; i < eventKeysArr.length; i++) {
                collectionNames.push(
                    "events" + crypto.createHash('sha1').update(eventKeysArr[i] + params.app_id).digest('hex')
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
            fetch.getTimeObjForEvents(collectionName, params, function(output) {
                callback(null, output || {});
            });
        }

        return true;
    });

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
            return common.returnMessage(params, 400, 'Missing parameter: apps');
        }

        if (params.qstring.apps.length > 10) {
            return common.returnMessage(params, 400, 'Maximum length for parameter apps is 10');
        }

        var appsToFetch = params.qstring.apps;
        for (var appsFetchIndex = 0; appsFetchIndex < appsToFetch.length; appsFetchIndex++) {
            if (appsToFetch[appsFetchIndex].length !== 24) {
                return common.returnMessage(params, 400, 'Invalid app id length in apps parameter, each app id should be 24 characters long');
            }
        }
        params.qstring.app_id = appsToFetch[0];

        ob.validateUserForDataReadAPI(params, function() {
            if (!params.member.global_admin) {
                for (var i = 0; i < appsToFetch.length; i++) {
                    if (params.member && params.member.user_of) {
                        if (params.member.user_of.indexOf(appsToFetch[i]) === -1) {
                            return common.returnMessage(params, 401, 'User does not have view rights for one or more apps provided in apps parameter');
                        }
                    }
                    else {
                        return common.returnMessage(params, 401, 'User does not have view rights for one or more apps provided in apps parameter');
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
                            countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj), fetch.formatTotalUsersObj(dbTotalUsersObj, true));

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