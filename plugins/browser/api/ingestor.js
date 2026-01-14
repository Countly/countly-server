var exported = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/sdk/process_request", function(ob) {
        if (ob.params.qstring.metrics && ob.params.qstring.metrics._browser) {
            ob.params.collectedMetrics.brw = ob.params.qstring.metrics._browser;
        }
        if (ob.params.qstring.metrics && ob.params.qstring.metrics._browser_version) {
            ob.params.collectedMetrics.brwv = ob.params.qstring.metrics._browser_version;
        }
    });
}(exported));

module.exports = exported;