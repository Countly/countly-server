var plugins = require('../../plugins/pluginManager.js');
var versionInfo = {
    version: "15.06",
    type: "2fb8d2c65f7919fa1ce594302618febe0a46cb2f",
    footer: "Countly Development Server",
    title: "Countly Test"
};
plugins.extendModule("versionInfo", versionInfo);
module.exports = versionInfo;