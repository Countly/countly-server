var plugin = {};
(function (plugin) {
	plugin.init = function(app, countlyDb) {
		app.get(countlyConfig.path+'/feedback', function (req, res, next) {
            res.setHeader('X-Frame-Options','ALLOW-FROM *');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        });
	};
}(plugin));

module.exports = plugin;