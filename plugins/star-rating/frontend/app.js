var exported = {},
    countlyConfig = require("../../../frontend/express/config");
(function(plugin) {
    plugin.init = function(app) {
        app.get(countlyConfig.path + '/feedback', function(req, res) {
            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        });
    };
}(exported));

module.exports = exported;