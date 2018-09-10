var plugin = {},
    countlyConfig = require("../../../frontend/express/config");
(function(pluginInstance) {
    pluginInstance.init = function(app) {
        app.get(countlyConfig.path + '/feedback', function(req, res) {
            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        });
    };
}(plugin));

module.exports = plugin;