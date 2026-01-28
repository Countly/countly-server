var exported = {},
    plugins = require('../../pluginManager.ts');

(function() {
    plugins.appTypes.push("desktop");
}(exported));

module.exports = exported;