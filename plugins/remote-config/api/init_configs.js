var plugins = require('../../pluginManager.js');
const FEATURE_NAME = 'remote_config';
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});
plugins.setConfigs("remote-config", {
    maximum_allowed_parameters: 2000,
    conditions_per_paramaeters: 20
});