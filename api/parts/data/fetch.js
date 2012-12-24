var fetch = {},
    common = require('./../../utils/common.js');

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

}(fetch));

module.exports = fetch;