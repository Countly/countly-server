var versionInfo = {
    version: "18.01.1",
    type: "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6"
};
try {
    var plugins = require('../../plugins/pluginManager.js');
    plugins.extendModule("version.info", versionInfo);
} catch(_) {
}
module.exports = versionInfo;