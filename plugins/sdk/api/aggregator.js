var plugins = require('../../pluginManager.ts');

(function() {
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        predefinedMetrics.push({
            db: "sdks",
            metrics: [
                {
                    is_user_prop: true,
                    name: "sdk_name",
                    set: "sdks",
                    short_code: "sdk_name"
                },
                {
                    is_user_prop: true,
                    name: "sdk_version",
                    set: "sdk_version",
                    short_code: "sdk_version",
                    getMetricValue: function(user) {
                        if (user && user.up && user.up.sdk_name && user.up.sdk_version) {
                            return "[" + user.up.sdk_name + "]_" + user.up.sdk_version;
                        }
                        else {
                            return;
                        }
                    }
                }
            ]
        });
    });

})();