var plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/sdk/process_request", function(ob) {
        if (ob.params.qstring.sdk_name && ob.params.qstring.sdk_version) {
            ob.params.user.sdk_name = ob.params.qstring.sdk_name;
            ob.params.user.sdk_version = "[" + ob.params.qstring.sdk_name + "]_" + ob.params.qstring.sdk_version;
            ob.params.collectedMetrics["sdk.name"] = ob.params.qstring.sdk_name;
            ob.params.collectedMetrics["sdk.version"] = ob.params.qstring.sdk_version;
        }
    });

    plugins.register("/sdk/process_user", async function(ob) {
        var params = ob.params;
        if (params.qstring.rr) {
            ob.updates.push({$set: {rr: parseInt(params.qstring.rr, 10)}});
        }

        if (params.qstring.hc) {
            if (typeof params.qstring.hc === "string") {
                try {
                    params.qstring.hc = JSON.parse(params.qstring.hc);
                }
                catch (ex) {
                    console.log(params.qstring.hc);
                    console.log("Parse hc failed", ex);
                }
            }
            ob.updates.push({$set: {hc: params.qstring.hc}});
        }
    });
})();