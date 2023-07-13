var exported = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.appTypes.push("desktop");
}(exported));

module.exports = exported;