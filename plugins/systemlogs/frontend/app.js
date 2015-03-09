var plugin = {},
	crypto = require("crypto"),
	countlyConfig = require('../../../frontend/express/config');

(function (plugin) {
	function getIpAddress(req) {
		var ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	
		/* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
		return ipAddress.split(',')[0];
	};
	
	function sha1Hash(str, addSalt) {
		var salt = (addSalt) ? new Date().getTime() : "";
		return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
	};
	plugin.init = function(app, countlyDb, express){
		app.post(countlyConfig.path+'/reset', function (req, res, next) {
			if (req.body.password && req.body.again && req.body.prid) {
				var now = Math.round(new Date().getTime()/1000);
				countlyDb.collection('password_reset').findOne({prid:req.body.prid}, function (err, passwordReset) {
					countlyDb.collection('members').findOne({_id:passwordReset.user_id}, function (err, member) {
						countlyDb.collection('systemlogs').insert({ts:now, a:"Password reset", u:member.email, ip:getIpAddress(req), i:""}, function () {});
					});
				});
			}
			next();
		});
		
		app.post(countlyConfig.path+'/forgot', function (req, res, next) {
			if (req.body.email) {
				var now = Math.round(new Date().getTime()/1000);
				countlyDb.collection('systemlogs').insert({ts:now, a:"Password request", u:req.body.email, ip:getIpAddress(req), i:""}, function () {});
			}
			next();
		});
		
		app.post(countlyConfig.path+'/login', function (req, res, next) {
			if (req.body.username && req.body.password) {
				var now = Math.round(new Date().getTime()/1000);
				var password = sha1Hash(req.body.password);
				countlyDb.collection('members').findOne({$or: [ {"username":req.body.username}, {"email":req.body.username} ], "password":password}, function (err, member) {
					if (member) {
						countlyDb.collection('systemlogs').insert({ts:now, a:"Login Successful", u:member.email, ip:getIpAddress(req), i:""}, function () {});
					}
					else{
						countlyDb.collection('systemlogs').insert({ts:now, a:"Login Unsuccessful", u:req.body.username, ip:getIpAddress(req), i:""}, function () {});
					}
				});
			}
			next();
		});
		
		app.post(countlyConfig.path+'/mobile/login', function (req, res, next) {
			if (req.body.username && req.body.password) {
				var password = sha1Hash(req.body.password);
				var now = Math.round(new Date().getTime()/1000);
				countlyDb.collection('members').findOne({$or: [ {"username":req.body.username}, {"email":req.body.username} ], "password":password}, function (err, member) {
					if (member) {
						countlyDb.collection('systemlogs').insert({ts:now, a:"Login Successful", u:member.email, ip:getIpAddress(req), i:""}, function () {});
					}
					else{
						countlyDb.collection('systemlogs').insert({ts:now, a:"Login Unsuccessful", u:req.body.username, ip:getIpAddress(req), i:""}, function () {});
					}
				});
			} 
			next();
		});
		
		app.post(countlyConfig.path+'/user/settings', function (req, res, next) {
			if (req.session.uid) {
				var now = Math.round(new Date().getTime()/1000);
				countlyDb.collection('systemlogs').insert({ts:now, a:"Settings changed", u:req.session.email, ip:getIpAddress(req), i:""}, function () {});
			}
			next();
		});
		app.get(countlyConfig.path+'/api-key', express.basicAuth(function(user, pass, callback){
			var password = sha1Hash(pass);
			countlyDb.collection('members').findOne({$or: [ {"username":user}, {"email":user} ], "password":password}, function (err, member) {
				if(member)
					callback(null, member);
				else
					callback(null, user);
			});
		}), 
		function (req, res, next) {
			var now = Math.round(new Date().getTime()/1000);
			if (req.user && req.user._id) {
				countlyDb.collection('systemlogs').insert({ts:now, a:"API KEY Successful", u:req.user.email, ip:getIpAddress(req), i:""}, function () {});
			}
			else{
				countlyDb.collection('systemlogs').insert({ts:now, a:"API KEY Unsuccessful", u:req.user, ip:getIpAddress(req), i:""}, function () {});
			}
			next();
		});
	};
}(plugin));

module.exports = plugin;