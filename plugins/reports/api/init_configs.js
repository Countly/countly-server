var plugins = require('../../pluginManager.ts');
const FEATURE_NAME = 'reports';
var countlyApiConfig = require('./../../../api/config');
plugins.setConfigs("reports", {
    secretKey: countlyApiConfig?.encryption?.reports_key || "Ydqa7Omkd3yhV33M3iWV1oFcOEk898h9",
});
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});