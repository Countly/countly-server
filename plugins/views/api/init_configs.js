var plugins = require('../../pluginManager.ts');
const FEATURE_NAME = 'views';

//This file is included in all processes.(api, ingestor and aggregator)
(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.setConfigs("views", {
        view_limit: 50000,
        view_name_limit: 128,
        segment_value_limit: 10,
        segment_limit: 100
    });

    plugins.internalDrillEvents.push("[CLY]_view");
    plugins.internalDrillEvents.push("[CLY]_action");
}());