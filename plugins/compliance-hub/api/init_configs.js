var plugins = require('../../pluginManager.js');

const FEATURE_NAME = 'compliance_hub';
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

plugins.internalDrillEvents.push("[CLY]_consent");