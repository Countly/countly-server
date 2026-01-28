
var plugins = require('../../pluginManager.ts');

(function() {
    plugins.register("/session/metrics", function(ob) {
        ob.predefinedMetrics.push({
            db: "browser",
            metrics: [
                { name: "_browser", set: "browser", short_code: "brw" },
                { name: "_browser_version", set: "browser_version", short_code: "brwv" }
            ]
        });
    });
}());
