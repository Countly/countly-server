var plugins = require('../../pluginManager.js');
const FEATURE_NAME = 'logger';
var RequestLoggerStateEnum = {
    ON: "on",
    OFF: "off",
    AUTOMATIC: "automatic"
};
Object.freeze(RequestLoggerStateEnum);
plugins.setConfigs("logger", {
    state: RequestLoggerStateEnum.AUTOMATIC,
    limit: 1000,
});
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});