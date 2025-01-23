var exported = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/sdk/process_request", function(ob) {
        if (ob.params.qstring.metrics && ob.params.qstring.metrics._browser) {
            ob.params.collectedMetrics.brw = ob.params.qstring.metrics._browser;
        }
    });
}(exported));

module.exports = exported;