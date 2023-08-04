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
    plugins.register("/worker", function() {
        common.dbUserMap.density = 'dnst';
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.densities = "dnst";
    });
    plugins.register("/session/metrics", function(ob) {
        var params = ob.params;
        if (params.qstring.metrics && params.qstring.metrics._density && common.isNumber(params.qstring.metrics._density)) {
            params.qstring.metrics._density = parseFloat(params.qstring.metrics._density).toFixed(2);
        }
        if (params.qstring.metrics && params.qstring.metrics._os && params.qstring.metrics._density) {
            if (common.os_mapping[params.qstring.metrics._os.toLowerCase()]) {
                //for whatewer reason we go there twice. And on second time _density is already modified. Nested if to prevent error.
                if (!params.qstring.metrics._density.startsWith(common.os_mapping[params.qstring.metrics._os.toLowerCase()])) {
                    params.qstring.metrics._density = common.os_mapping[params.qstring.metrics._os.toLowerCase()] + params.qstring.metrics._density;
                }
            }
            else if (!params.qstring.metrics._density.startsWith(params.qstring.metrics._os[0].toLowerCase())) {
                params.qstring.metrics._density = params.qstring.metrics._os[0].toLowerCase() + params.qstring.metrics._density;
            }
        }
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