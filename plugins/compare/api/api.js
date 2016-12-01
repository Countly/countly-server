var plugin = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    crypto = require('crypto'),
    async = require('async'),
    log = common.log('compare:api');

(function (plugin) {

    plugins.register('/o/compare/events', function(ob) {
        var params = ob.params;

        if (params.qstring.events) {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
            } catch (SyntaxError) {
                log.w('Parse /o/compare/events JSON failed');
            }
        }

        if (!params.qstring.events || params.qstring.events.length == 0) {
            return common.returnMessage(params, 400, 'Missing parameter: events');
        }

        if (params.qstring.events.length > 10) {
            return common.returnMessage(params, 400, 'Maximum length for parameter events is 10');
        }

        ob.validateUserForDataReadAPI(params, function(){
            var eventKeysArr = params.qstring.events;
            var collectionNames = [];

            for (var i = 0; i < eventKeysArr.length; i++) {
                collectionNames.push(
                    "events" + crypto.createHash('sha1').update(eventKeysArr[i] + params.app_id).digest('hex')
                );
            }

            async.map(collectionNames, getEventData, function (err, allEventData) {
                var outputObj = {};

                for (var i = 0; i < allEventData.length; i++) {
                    outputObj[eventKeysArr[i]] = allEventData[i];
                }

                common.returnOutput(params, outputObj);
            });
        });

        function getEventData(collectionName, callback) {
            fetch.getTimeObjForEvents(collectionName, params, function(output) {
                callback(null, output || {});
            });
        }

        return true;
    });

}(plugin));

module.exports = plugin;