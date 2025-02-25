var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

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