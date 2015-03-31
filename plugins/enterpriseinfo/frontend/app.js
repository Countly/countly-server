var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	async = require('async');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		function getTotalUsers(callback) {
			countlyDb.collection("apps").find({}, {_id:1}).toArray(function (err, allApps) {
					if(err || !allApps)
						callback(0, 0);
					else
						async.map(allApps, getUserCountForApp, function (err, results) {
							if (err)
								callback(0, 0);
			
							var userCount = 0;
			
							for (var i = 0; i < results.length; i++) {
								userCount += results[i];
							}
			
							callback(userCount, allApps.length);
						});
			});
		};
			
		function getUserCountForApp(app, callback) {
			countlyDb.collection("app_users" + app._id).find({}).count(function (err, count) {
					if (err || !count)
					callback(0);
					else
						callback(err, count);
			});
		};
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
		app.get(countlyConfig.path+'/dashboard', function (req, res, next) {
			if (req.session.uid) {
				countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
					if(typeof member.offer == "undefined" || member.offer < 2){
						countlyDb.collection('members').findAndModify({_id:countlyDb.ObjectID(req.session.uid)},{},{$inc:{offer:1}}, function(err,member){});
						getTotalUsers(function(totalUsers, totalApps) {
							if(totalUsers > 5000){
								res.expose({
									discount: "AWESOMECUSTOMER20"
								}, 'countlyGlobalEE');
							}
						});
					}
				})
			}
			next();
		});
	};
}(plugin));

module.exports = plugin;