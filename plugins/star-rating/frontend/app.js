var plugin = {},
    countlyConfig = require("../../../frontend/express/config");
(function (plugin) {
	plugin.init = function(app, countlyDb) {
		app.get(countlyConfig.path+'/feedback', function (req, res, next) {
            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        });
	};
}(plugin));

module.exports = plugin;