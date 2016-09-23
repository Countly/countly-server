var plugin = {},
	countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
	versionInfo = require('../../../frontend/express/version.info'),
    path = require('path'),
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
            var filename = path.resolve(__dirname, "public/templates/login.html");
             fs.readFile(filename, "utf8", function (err, data) {
                if(!err && data){
                    var parts = data.split("<!-- JS PART -->");
                    req.template.html += parts[0];
                    req.template.js += parts[1];
                }
                next();
             });
		});
		app.get(countlyConfig.path+'/dashboard', function (req, res, next) {
			if (req.session.uid && versionInfo.type == "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6" && !versionInfo.footer) {
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