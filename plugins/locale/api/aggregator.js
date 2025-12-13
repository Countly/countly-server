var exported = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        predefinedMetrics.push({
            db: "langs",
            metrics: [
                { name: "_lang", set: "langs", short_code: "la"}
            ]
        });

    });
}(exported));

module.exports = exported;