var pluginInstance = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    stores = require("../stores.json"),
    fetch = require('../../../api/parts/data/fetch.js'),

    { validateRead } = require('../../../api/utils/rights.js'),
    urlParse = require('url');

var searchEngineKeyWord = {};
try {
    searchEngineKeyWord = require("../keywords.json");
}
catch (e) {
    console.log("There is no keywords file defined for source plugin.");
}

const FEATURE_NAME = 'sources';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/master", function() {
        common.dbUserMap.source = 'src';
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.sources = "src";
    });
    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "sources") {
            ob.data = ["sources", "sources", "sources"];
        }
    });

    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;

        predefinedMetrics.push({
            db: "sources",
            metrics: [
                { name: "_store", set: "sources", short_code: common.dbUserMap.source }
            ]
        });
    });
    plugins.register("/o", function(ob) {
        var params = ob.params;
        if (params.qstring.method === "sources") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, "sources");
            return true;
        }
        return false;
    });

    plugins.register("/o/keywords", function(ob) {
        var params = ob.params;
        validateRead(params, FEATURE_NAME, function() {
            fetch.getMetric(params, "sources", null, function(data) {
                var result = [];
                for (var i = 0; i < data.length; i++) {
                    var parts = urlParse.parse(common.db.decode(data[i]._id), true);
                    if ((parts.href || parts.hostname) && parts.query) {
                        parts.hostname = parts.hostname || parts.href.split("/")[0];
                        for (var c in searchEngineKeyWord) {
                            if (typeof parts.query[c] !== "undefined" && parts.query[c] !== "") {
                                if (typeof searchEngineKeyWord[c] === "boolean" || (typeof searchEngineKeyWord[c] === "string" && parts.hostname.indexOf(searchEngineKeyWord[c]) !== -1)) {
                                    data[i]._id = common.db.encode(parts.query[c] + "");
                                    result.push(data[i]);
                                    break;
                                }
                            }
                        }
                    }
                }
                common.returnOutput(params, result);
            });
        });
        return true;
    });

    plugins.register("/o/sources", function(ob) {
        common.returnOutput(ob.params, stores);
        return true;
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('sources').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });
}(pluginInstance));

module.exports = pluginInstance;