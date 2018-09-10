var common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require("../../../api/parts/data/fetch"),
    async = require('async'),
    crypto = require('crypto'),
    countlyModel = require('../../../api/lib/countly.model.js'),
    countlyEvents = countlyModel.load("event");

(function() {

    /**
    * Creates sparkline and data object with respect to given event names
    * @param {string} params - ob.params object is expected, it contains all necessary info
    * @returns {object} returns sparkline and data asynchronously via common.returnOutput
    **/
    function fetchDataEventsOverview(params) {
        var ob = {
            app_id: params.qstring.app_id,
            appTimezone: params.appTimezone,
            qstring: {
                period: params.qstring.period
            },
            time: common.initTimeObj(params.qstring.timezone, params.qstring.timestamp)
        };
        if (typeof params.qstring.events === "string") {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
                if (typeof params.qstring.events === "string") {
                    params.qstring.events = [params.qstring.events];
                }
            }
            catch (ex) {
                common.returnMessage(params, 400, 'Must provide valid array with event keys as events param.');
                return false;
            }
        }
        if (Array.isArray(params.qstring.events)) {
            var data = {};
            async.each(params.qstring.events, function(event, done) {
                var collectionName = "events" + crypto.createHash('sha1').update(event + params.qstring.app_id).digest('hex');
                fetch.getTimeObjForEvents(collectionName, ob, function(doc) {
                    countlyEvents.setDb(doc || {});
                    var my_line1 = countlyEvents.getNumber("c");
                    var my_line2 = countlyEvents.getNumber("s");
                    var my_line3 = countlyEvents.getNumber("dur");
                    data[event] = {};
                    data[event].data = {
                        "count": my_line1,
                        "sum": my_line2,
                        "dur": my_line3
                    };
                    done();
                });
            },
            function() {
                common.returnOutput(params, data);
            });
        }
    }

    plugins.register('/o', function(ob) {
        if (ob.params.qstring.method === 'monetization') {
            var params = ob.params;
            var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
            var expectedPeriodNames = ["month", "day", "yesterday", "hour"];
            if (typeof params.qstring.period !== "string") {
                common.returnMessage(params, 400, 'Period must be defined.');
                return true;
            }
            else if ((!expectedPeriodNames.includes(params.qstring.period) && !/([0-9]+)days/.test(params.qstring.period) && !/^(\[\s*(\d+)\s*,s*(\d+)\s*\])$/.test(params.qstring.period))) {
                common.returnMessage(params, 400, 'Invalid period.');
                return true;
            }
            else {
                validateUserForDataReadAPI(params, function() {
                    var defaultEvents = ['VI_AdClick', 'VI_AdStart', 'VI_AdComplete'];
                    if (!params.qstring.event && !params.qstring.events) {
                        params.qstring.events = defaultEvents;
                    }
                    fetchDataEventsOverview(params);
                });
                return true;
            }
        }
        return false;
    });
}());

module.exports = {};