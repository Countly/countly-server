var plugins = require('../../pluginManager.ts');
const FEATURE_NAME = 'two_factor_auth';

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});
plugins.setConfigs("two-factor-auth", {
    globally_enabled: false
});