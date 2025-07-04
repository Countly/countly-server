var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'density';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    plugins.register("/master", function() {
        common.dbUserMap.density = 'dnst';
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.densities = "dnst";
    });
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        predefinedMetrics.push({
            db: "density",
            metrics: [
                { name: "_density", set: "density", short_code: common.dbUserMap.density }
            ]
        });
    });
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "density") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'density');
            return true;
        }
        return false;
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('density').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('density').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('density').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('density').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });
}(exported));

module.exports = exported;