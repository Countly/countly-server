var plugins = require('../../plugins/pluginManager.js');
var versionInfo = {
    version: "15.08",
    type: "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6"
};
plugins.extendModule("version.info", versionInfo);
module.exports = versionInfo;