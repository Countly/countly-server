var plugins = require('../../pluginManager.ts');
const FEATURE_NAME = 'hooks';
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});
plugins.setConfigs("hooks", {
    batchActionSize: 0, // size for processing actions each time
    refreshRulesPeriod: 3000, // miliseconds to fetch hook records
    pipelineInterval: 1000, // milliseconds to batch process pipeline
    requestLimit: 0, //maximum request that can be handled in given time frame. 0 means no rate limit applied
    timeWindowForRequestLimit: 60000, //time window for request limits in milliseconds
});