var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'browser';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    plugins.register("/worker", function() {
        common.dbUserMap.browser = 'brw';
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.browser = "brw";
    });
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        predefinedMetrics.push({
            db: "browser",
            metrics: [
                { name: "_browser", set: "browser", short_code: common.dbUserMap.browser },
                { name: "_browser_version", set: "browser_version", short_code: "brwv" }
            ]
        });
    });
    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "browser") {
            ob.data = ["browser", "browser"];
        }
        else if (ob.metric === "browser_version") {
            ob.data = ["browser", "browser_version"];
        }
    });
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "browser") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'browser');
            return true;
        }
        return false;
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('browser').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('browser').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('browser').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('browser').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });
}(exported));

module.exports = exported;