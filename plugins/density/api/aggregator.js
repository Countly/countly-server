var exported = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/session/metrics", function(ob) {
        ob.predefinedMetrics.push({
            db: "density",
            metrics: [
                { name: "_density", set: "density", short_code: "dnst" }
            ]
        });
    });
}(exported));

module.exports = exported;