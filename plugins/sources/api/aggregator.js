var exported = {},
    plugins = require('../../pluginManager.ts');

(function() {
    plugins.register("/session/metrics", function(ob) {
        ob.predefinedMetrics.push({
            db: "sources",
            metrics: [
                { name: "_store", set: "sources", short_code: "src"}
            ]
        });

    });
}(exported));

module.exports = exported;