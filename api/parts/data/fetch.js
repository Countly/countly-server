var fetch = {},
    common = require('./../../utils/common.js'),
    async = require('./../../utils/async.min.js'),
    countlySession = require('../../lib/countly.session.js'),
    countlyCarrier = require('../../lib/countly.carrier.js'),
    countlyDeviceDetails = require('../../lib/countly.device.detail.js'),
    countlyLocation = require('../../lib/countly.location.js'),
    countlyCommon = require('../../lib/countly.common.js');

(function (fetch) {

    fetch.prefetchEventData = function (collection, params) {
        if (!params.qstring.event) {
            common.db.collection('events').findOne({'_id':params.app_id}, function (err, result) {
                if (result && result.list) {
                    if (result.order) {
                        collection = result.order[0];
                    } else {
                        result.list.sort();
                        collection = result.list[0];
                    }

                    fetch.fetchEventData(collection + params.app_id, params);
                } else {
                    common.returnOutput(params, {});
                }
            });
        } else {
            fetch.fetchEventData(params.qstring.event + params.app_id, params);
        }
    };

    fetch.fetchEventData = function (collection, params) {
        var fetchFields = {};

        if (params.qstring.action == "refresh") {
            fetchFields[params.time.daily] = 1;
            fetchFields['meta'] = 1;
        }

        common.db.collection(collection).find({}, fetchFields).toArray(function (err, result) {
            if (!result.length) {
                now = new common.time.Date();
                result = {};
                result[now.getFullYear()] = {};
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchMergedEventData = function (params) {
        var eventKeysArr = [];

        for (var i = 0; i < params.qstring.events.length; i++) {
            eventKeysArr.push(params.qstring.events[i] + params.app_id);
        }

        if (!eventKeysArr.length) {
            common.returnOutput(params, {});
        } else {
            async.map(eventKeysArr, getEventData, function (err, allEventData) {
                var mergedEventOutput = {};

                for (var i = 0; i < allEventData.length; i++) {
                    delete allEventData[i].meta;

                    for (var levelOne in allEventData[i]) {
                        if (typeof allEventData[i][levelOne] !== 'object') {
                            if (mergedEventOutput[levelOne]) {
                                mergedEventOutput[levelOne] += allEventData[i][levelOne];
                            } else {
                                mergedEventOutput[levelOne] = allEventData[i][levelOne];
                            }
                        } else {
                            for (var levelTwo in allEventData[i][levelOne]) {
                                if (!mergedEventOutput[levelOne]) {
                                    mergedEventOutput[levelOne] = {};
                                }

                                if (typeof allEventData[i][levelOne][levelTwo] !== 'object') {
                                    if (mergedEventOutput[levelOne][levelTwo]) {
                                        mergedEventOutput[levelOne][levelTwo] += allEventData[i][levelOne][levelTwo];
                                    } else {
                                        mergedEventOutput[levelOne][levelTwo] = allEventData[i][levelOne][levelTwo];
                                    }
                                } else {
                                    for (var levelThree in allEventData[i][levelOne][levelTwo]) {
                                        if (!mergedEventOutput[levelOne][levelTwo]) {
                                            mergedEventOutput[levelOne][levelTwo] = {};
                                        }

                                        if (typeof allEventData[i][levelOne][levelTwo][levelThree] !== 'object') {
                                            if (mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                                mergedEventOutput[levelOne][levelTwo][levelThree] += allEventData[i][levelOne][levelTwo][levelThree];
                                            } else {
                                                mergedEventOutput[levelOne][levelTwo][levelThree] = allEventData[i][levelOne][levelTwo][levelThree];
                                            }
                                        } else {
                                            for (var levelFour in allEventData[i][levelOne][levelTwo][levelThree]) {
                                                if (!mergedEventOutput[levelOne][levelTwo][levelThree]) {
                                                    mergedEventOutput[levelOne][levelTwo][levelThree] = {};
                                                }

                                                if (typeof allEventData[i][levelOne][levelTwo][levelThree][levelFour] !== 'object') {
                                                    if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] += allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                    } else {
                                                        mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = allEventData[i][levelOne][levelTwo][levelThree][levelFour];
                                                    }
                                                } else {
                                                    for (var levelFive in allEventData[i][levelOne][levelTwo][levelThree][levelFour]) {
                                                        if (!mergedEventOutput[levelOne][levelTwo][levelThree][levelFour]) {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour] = {};
                                                        }

                                                        if (mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive]) {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive] += allEventData[i][levelOne][levelTwo][levelThree][levelFour][levelFive];
                                                        } else {
                                                            mergedEventOutput[levelOne][levelTwo][levelThree][levelFour][levelFive] = allEventData[i][levelOne][levelTwo][levelThree][levelFour][levelFive];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                common.returnOutput(params, mergedEventOutput);
            });
        }

        function getEventData(eventKey, callback) {
            common.db.collection(eventKey).findOne({"_id": "no-segment"}, {"_id": 0}, function (err, eventData) {
                callback(err, eventData || {});
            });
        }
    };

    fetch.fetchCollection = function (collection, params) {
        common.db.collection(collection).findOne({'_id':params.app_id}, function (err, result) {
            if (!result) {
                result = {};
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchTimeData = function (collection, params) {

        var fetchFields = {};

        if (params.qstring.action == "refresh") {
            fetchFields[params.time.yearly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.monthly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.weekly + "." + common.dbMap.unique] = 1;
            fetchFields[params.time.daily] = 1;
            fetchFields['meta'] = 1;
        }

        common.db.collection(collection).findOne({'_id':params.app_id}, fetchFields, function (err, result) {
            if (!result) {
                now = new common.time.Date();
                result = {};
                result[now.getFullYear()] = {};
            }

            common.returnOutput(params, result);
        });
    };

    fetch.fetchDashboard = function(params) {

        common.db.collection("sessions").findOne({'_id': params.app_id}, function (err, sessionsDoc) {
            common.db.collection("device_details").findOne({'_id': params.app_id}, function (err, deviceDetailsDoc) {
                common.db.collection("carriers").findOne({'_id': params.app_id}, function (err, carriersDoc) {

                    var output = {},
                        periods = [
                            {period: "30days", out: "30days"},
                            {period: "7days", out: "7days"},
                            {period: "hour", out: "today"}
                        ];

                    countlyCommon.setTimezone(params.appTimezone);
                    countlySession.setDb(sessionsDoc || {});
                    countlyDeviceDetails.setDb(deviceDetailsDoc || {});
                    countlyCarrier.setDb(carriersDoc || {});

                    for (var i = 0; i < periods.length; i++) {
                        countlyCommon.setPeriod(periods[i].period);

                        output[periods[i].out] = {
                            dashboard: countlySession.getSessionData(),
                            top: {
                                platforms: countlyDeviceDetails.getPlatformBars(),
                                resolutions: countlyDeviceDetails.getResolutionBars(),
                                carriers: countlyCarrier.getCarrierBars(),
                                users: countlySession.getTopUserBars()
                            },
                            period: countlyCommon.getDateRange()
                        };
                    }

                    common.returnOutput(params, output);
                });
            });
        });
    }

    fetch.fetchCountries = function(params) {

        common.db.collection("locations").findOne({'_id': params.app_id}, function (err, locationsDoc) {
            var output = {},
                periods = [
                    {period: "30days", out: "30days"},
                    {period: "7days", out: "7days"},
                    {period: "hour", out: "today"}
                ];

            countlyCommon.setTimezone(params.appTimezone);
            countlyLocation.setDb(locationsDoc || {});

            for (var i = 0; i < periods.length; i++) {
                countlyCommon.setPeriod(periods[i].period);

                output[periods[i].out] = countlyLocation.getLocationData({maxCountries: 10});
            }

            common.returnOutput(params, output);
        });
    }

}(fetch));

module.exports = fetch;