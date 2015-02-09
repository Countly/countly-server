var plugin = {},
	countlyConfig = require('../../../frontend/express/config');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.get(countlyConfig.path+'/login', function (req, res, next) {
			if (req.session.uid) {
				res.redirect(countlyConfig.path+'/dashboard');
			} else {
				countlyDb.collection('members').count({}, function (err, memberCount) {
					if (memberCount) {
						res.render('../../../plugins/enterpriseinfo/frontend/public/templates/login', { "message":req.flash('info'), "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "" });
					} else {
						res.redirect(countlyConfig.path+'/setup');
					}
				});
			}
		});
	};
}(plugin));

module.exports = plugin;