var http = require('http'),
	express = require('express'),
	mongoStore = require('connect-mongodb'),
	expose = require('express-expose'),
	mongo = require('mongoskin'),
	crypto = require('crypto'),
	fs = require('fs'),
	im = require('imagemagick'),
	nodemailer = require('nodemailer'),
	countlyConfig = require('./config'),
	countlyDb = mongo.db(countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db + '?auto_reconnect'),
	Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	server_config = new Server(countlyConfig.mongodb.host, countlyConfig.mongodb.port, {auto_reconnect: true, native_parser: true}),
	sessionDb = new Db(countlyConfig.mongodb.db, server_config, {});

console.log('Server running on port ' + countlyConfig.web.port);

var redirect = function(res, url) {
    res.redirect(countlyConfig.web.base +  url);
}

function sha1Hash(str, addSalt) {
	var salt = (addSalt)? new Date().getTime() : "";
	return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

function isGlobalAdmin(req) {
	if (req.session.gadm) {
		return true;
	} else {
		return false;
	}
}

function sortBy(arrayToSort, sortList) {
	
	if (!sortList.length) {
		return arrayToSort;
	}
	
	var tmpArr = [],
		retArr = [];
	
	for (var i=0; i < arrayToSort.length; i++) {
		var objId = arrayToSort[i]["_id"] + "";
		if (sortList.indexOf(objId) !== -1) {
			tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
		}
	}
	
	for (var i=0; i < tmpArr.length; i++) {
		if (tmpArr[i]) {
			retArr[retArr.length] = tmpArr[i];
		}
	}
	
	for (var i=0; i < arrayToSort.length; i++) {
		if (retArr.indexOf(arrayToSort[i]) === -1) {
			retArr[retArr.length] = arrayToSort[i];
		}
	}

	return retArr;
}

var app = module.exports = express.createServer();

app.configure(function() {
	app.register('.html', require('ejs'));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'html');
	app.set('view options', {layout: false});
	app.use(express.bodyParser({uploadDir: __dirname + '/uploads'}));
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'countlyss',
		store: new mongoStore({db: sessionDb, collection: 'user_sessions'})
	}));
	app.use(express.methodOverride());
	app.use(express.csrf());
	app.use(app.router);
    var oneYear = 31557600000;
    app.use(express.static(__dirname + '/public'), { maxAge: oneYear });
});

app.configure('development', function() {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
	app.use(express.errorHandler());
});

app.get('/', function(req, res, next) {
	redirect(res, 'login');
});

app.get('/logout', function(req, res, next) {
  if (req.session) {
    req.session.uid = null;
	req.session.gadm = null;
    res.clearCookie('uid');
	res.clearCookie('gadm');
    req.session.destroy(function() {});
  }
  redirect(res, 'login');
});

app.get('/dashboard', function(req, res, next) {
	if (!req.session.uid) {
		redirect(res, 'login');
	} else {
		countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member){
			if (member) {
				var adminOfApps = [],
					userOfApps = [],
					countlyGlobalApps = {},
					countlyGlobalAdminApps = {};
			
				if (member['global_admin']) {
					countlyDb.collection('apps').find({}).toArray(function(err, apps) {
						adminOfApps = apps;
						userOfApps = apps;
						
						for (var i = 0; i < apps.length ;i++) {
							countlyGlobalApps[apps[i]["_id"]] = {
								"_id": "" + apps[i]["_id"],
								"name": apps[i]["name"],
								"key": apps[i]["key"],
								"category": apps[i]["category"],
								"timezone": apps[i]["timezone"],
								"country": apps[i]["country"]
							};	
						}
						
						countlyGlobalAdminApps = countlyGlobalApps;
						renderDashboard();
					});
				} else {
					var adminOfAppIds = [],
						userOfAppIds = [];
					
					if (member.admin_of) {
						for (var i = 0; i < member.admin_of.length ;i++) {
							adminOfAppIds[adminOfAppIds.length] = countlyDb.ObjectID(member.admin_of[i]);
						}
					}
					
					if (member.user_of) {
						for (var i = 0; i < member.user_of.length ;i++) {
							userOfAppIds[userOfAppIds.length] = countlyDb.ObjectID(member.user_of[i]);
						}
					}
					
					countlyDb.collection('apps').find({ _id : { '$in': adminOfAppIds } }).toArray(function(err, admin_of) {
						
						for (var i = 0; i < admin_of.length ;i++) {
							countlyGlobalAdminApps[admin_of[i]["_id"]] = {
								"_id": "" + admin_of[i]["_id"],
								"name": admin_of[i]["name"],
								"key": admin_of[i]["key"],
								"category": admin_of[i]["category"],
								"timezone": admin_of[i]["timezone"],
								"country": admin_of[i]["country"]
							};	
						}
						
						countlyDb.collection('apps').find({ _id : { '$in': userOfAppIds } }).toArray(function(err, user_of) {
							adminOfApps = admin_of;
							userOfApps = user_of;

							for (var i = 0; i < user_of.length ;i++) {
								countlyGlobalApps[user_of[i]["_id"]] = {
									"_id": "" + user_of[i]["_id"],
									"name": user_of[i]["name"],
									"key": user_of[i]["key"],
									"category": user_of[i]["category"],
									"timezone": user_of[i]["timezone"],
									"country": user_of[i]["country"]
								};	
							}
							
							renderDashboard();
						});
					});
				}
				
				function renderDashboard() {
					countlyDb.collection('settings').findOne({}, function(err, settings) {
						
						req.session.uid = member["_id"];
						req.session.gadm = (member["global_admin"] == true);
						res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
						
						res.expose({
							"apps": countlyGlobalApps,
							"admin_apps": countlyGlobalAdminApps,
							"csrf_token": req.session._csrf
						}, 'countlyGlobal');
						
						if (settings && !err) {
							adminOfApps = sortBy(adminOfApps, settings.appSortList);
							userOfApps = sortBy(userOfApps, settings.appSortList);
						}
						
						res.render('dashboard', { 
							adminOfApps: adminOfApps,
							userOfApps: userOfApps,
							member: {
								username: member["username"],
								global_admin: (member["global_admin"] == true)
							},
                            base: countlyConfig.web.base
						});
					});
				}
			} else {
				if (req.session) {
					req.session.uid = null;
					req.session.gadm = null;
					res.clearCookie('uid');
					res.clearCookie('gadm');
					req.session.destroy(function() {});
				}
				redirect(res, 'login');
			}
		});
	}
});

app.get('/setup', function(req, res, next) {
	countlyDb.collection('members').count({}, function(err, memberCount){
		if (memberCount) {
			redirect(res, 'login');
		} else {
			res.render('setup', { "csrf": req.session._csrf, "base": countlyConfig.web.base });
		}
	});
});

app.get('/login', function(req, res, next) {
	if (req.session.uid) {
		redirect(res, 'dashboard');
	} else {
		countlyDb.collection('members').count({}, function(err, memberCount){
			if (memberCount) {
				res.render('login', { "message": req.flash('info'), "csrf": req.session._csrf, "base": countlyConfig.web.base });
			} else {
				redirect(res, 'setup');
			}
		});
	}
});

app.get('/forgot', function(req, res, next) {
	if (req.session.uid) {
		redirect(res, 'dashboard');
	} else {
		res.render('forgot', { "csrf": req.session._csrf, "message": req.flash('info'), "base": countlyConfig.web.base });
	}
});

app.get('/reset/:prid', function(req, res, next) {
	if (req.params.prid) {
		countlyDb.collection('password_reset').findOne({prid: req.params.prid}, function(err, passwordReset){
			var timestamp = Math.round(new Date().getTime() / 1000);
			
			if (passwordReset && !err) {
				if (timestamp > (passwordReset.timestamp + 600)) {
					req.flash('info', 'reset.invalid');
					redirect(res, 'forgot');
				} else {
					res.render('reset', { "csrf": req.session._csrf, "prid": req.params.prid, "message": "", "base": countlyConfig.web.base });
				}
			} else {
				req.flash('info', 'reset.invalid');
				redirect(res, 'forgot');
			}
		});
	} else {
		req.flash('info', 'reset.invalid');
		redirect(res, 'forgot');
	}
});

app.post('/reset', function(req, res, next) {
	if (req.body.password && req.body.again && req.body.prid) {		
		var password = sha1Hash(req.body.password);
		
		countlyDb.collection('password_reset').findOne({prid: req.body.prid}, function(err, passwordReset){
			countlyDb.collection('members').update({_id: passwordReset.user_id}, {'$set': { "password": password }}, function(err, member){
				req.flash('info', 'reset.result');
				redirect(res, 'login');
			});
			
			countlyDb.collection('password_reset').remove({prid: req.body.prid}, function(){});
		});
	} else {
		res.render('reset', { "csrf": req.session._csrf, "prid": req.body.prid, "message": "", "base": countlyConfig.web.base });
	}
});

app.post('/forgot', function(req, res, next) {
	if (req.body.email) {
		countlyDb.collection('members').findOne({"email": req.body.email}, function(err, member){
			if (member) {
				var timestamp = Math.round(new Date().getTime() / 1000),
					prid = sha1Hash(member.username + member.full_name, timestamp);
			
				countlyDb.collection('password_reset').insert({"prid": prid, "user_id": member._id, "timestamp": timestamp}, {safe: true}, function(err, password_reset){
					
					var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail"),
						userName = (member.full_name).split(" "),
						message = {
							from: '"Countly"',
							to: req.body.email,
							subject: 'Countly Account - Password Reset',
							html:'Hello '+ userName[0] +',<br/><br/>'+
								 'You can reset your Countly account password by following '+
								 '<a href="'+ req.headers.host +'/reset/'+ prid +'">this link</a>.<br/><br/>'+
								 'If you did not request to reset your password ignore this email.<br/><br/>'+
								 'Best,<br/>'+
								 'A fellow Countly Admin'
						};

					transport.sendMail(message, function(error){
						if(error){
							console.log('Error sending /forgot email');
							console.log(error.message);
							return;
						}
						console.log('/forgot email sent successfully!');
					});
					
					res.render('forgot', { "message": "forgot.result", "csrf": req.session._csrf, "base": countlyConfig.web.base });
				});
			} else {
				res.render('forgot', { "message": "forgot.result", "csrf": req.session._csrf, "base": countlyConfig.web.base });
			}
		});
	} else {
		redirect(res, 'forgot');
	}
});

app.post('/setup', function(req, res, next) {
	countlyDb.collection('members').count({}, function(err, memberCount){
		if (memberCount) {
			redirect(res, 'login');
		} else {
			if (req.body.username && req.body.password && req.body.email) {
				var password = sha1Hash(req.body.password);
			
				countlyDb.collection('members').insert({"full_name": req.body.username, "username": req.body.username, "password": password, "email": req.body.email, "global_admin": true}, {safe: true}, function(err, member){
					http.get('http://count.ly/t?a=f7f718f83b4282a31e98ab974948a318');
					
					req.session.uid = member[0]["_id"];
					req.session.gadm = true;
					redirect(res, 'dashboard');
				});
			} else {
				redirect(res, 'setup');
			}
		}
	});
});

app.post('/login', function(req, res, next) {
	if (req.body.username && req.body.password) {
		var password = sha1Hash(req.body.password);
	
		countlyDb.collection('members').findOne({"username": req.body.username, "password": password}, function(err, member){
			if (member) {
				req.session.uid = member["_id"];
				req.session.gadm = (member["global_admin"] == true);
				redirect(res, 'dashboard');
			} else {
				res.render('login', { "message": "login.result", "csrf": req.session._csrf, "base": countlyConfig.web.base });
			}
		});
	} else {
		res.render('login', { "message": "login.result", "csrf": req.session._csrf, "base": countlyConfig.web.base });
		res.end();
	}
});

app.post('/dashboard/settings', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}

	var newAppOrder = req.body.app_sort_list;
	
	if (!newAppOrder || newAppOrder.length == 0) {
		res.end();
		return false;
	}
	
	countlyDb.collection('settings').update({}, {'$set': {'appSortList': newAppOrder}}, {'upsert': true});
});

app.post('/apps/all', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}

	countlyDb.collection('apps').find({}).toArray(function(err, apps) {

		if (!apps || err) {
			res.send(false);
			return false;
		}
	
		var appsObj = {};
	
		for (var i = 0; i < apps.length ;i++) {
			appsObj[apps[i]["_id"]] = {
				"_id": apps[i]["_id"],
				"category" : apps[i]['category'], 
				"country" : apps[i]['country'], 
				"key" : apps[i]['key'], 
				"name" : apps[i]['name'], 
				"timezone" : apps[i]['timezone']
			};
		}

		res.send(appsObj);
	});
});

app.post('/apps/add', function(req, res, next) {
	
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}
	
	var appObj = {
		"name": req.body.app_name,
		"category": req.body.category,
		"timezone": req.body.timezone,
		"country": req.body.country,
		"key": ""
	}

	countlyDb.collection('apps').insert(appObj, function(err, app) {
		var appKey = sha1Hash(app[0]["_id"], true);
	
		countlyDb.collection('apps').update({"_id": app[0]["_id"]}, {$set: {key: appKey}}, function(err, app) {});

		appObj._id = app[0]["_id"];
		appObj.key = appKey;

		res.send(appObj);
		res.end();
	});
});

app.post('/apps/edit', function(req, res, next) {
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	var appObj = {
		"name": req.body.app_name,
		"category": req.body.category,
		"timezone": req.body.timezone,
		"country": req.body.country
	}
	
	if (!isGlobalAdmin(req)) {
		countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, {admin_of: 1}, function(err, member){
			if (member["admin_of"].indexOf(req.body.app_id) != -1) {
				countlyDb.collection('apps').update({"_id": countlyDb.ObjectID(req.body.app_id)}, {$set: appObj}, function(err, app) {
					res.send(appObj);
				});
			}
		});
	} else {
		countlyDb.collection('apps').update({"_id": countlyDb.ObjectID(req.body.app_id)}, {$set: appObj}, function(err, app) {
			res.send(appObj);
		});
	}
});

app.post('/apps/delete', function(req, res, next) {
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}
	
	countlyDb.collection('apps').remove({"_id": countlyDb.ObjectID(req.body.app_id)}, {safe: true}, function(err, result) {
	
		if (!result) {
			res.send(false);
			return false;
		}
	
		var iconPath = __dirname + '/public/appimages/' + req.body.app_id + ".png";
		fs.unlink(iconPath, function() {});
	
		countlyDb.collection('members').update({}, {$pull: {"apps": req.body.app_id, "admin_of": req.body.app_id, "user_of": req.body.app_id,}, }, {multi: true}, function(err, app) {});
		countlyDb.collection('sessions').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('users').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('carriers').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('locations').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('cities').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('realtime').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('app_users' + req.body.app_id).drop();
		countlyDb.collection('devices').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('device_details').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('app_versions').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		
		countlyDb.collection('events').findOne({"_id": countlyDb.ObjectID(req.body.app_id)}, function(err, events) {
			if (!err && events && events.list) {
				for (var i = 0; i < events.list.length; i++) {
					countlyDb.collection(events.list[i] + req.body.app_id).drop();
				}
				
				countlyDb.collection('events').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
			}
		});
		
		res.send(true);
	});
});

app.post('/apps/reset', function(req, res, next) {
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}
	
	countlyDb.collection('sessions').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('users').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('carriers').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('locations').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('cities').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('app_users' + req.body.app_id).drop();
	countlyDb.collection('devices').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('device_details').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
	countlyDb.collection('app_versions').remove({"_id": countlyDb.ObjectID(req.body.app_id)});

	countlyDb.collection('events').findOne({"_id": countlyDb.ObjectID(req.body.app_id)}, function(err, events) {
		if (!err && events && events.list) {
			for (var i = 0; i < events.list.length; i++) {
				countlyDb.collection(events.list[i] + req.body.app_id).drop();
			}
			
			countlyDb.collection('events').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		}
	});
	
	res.send(true);
});

app.post('/apps/icon', function(req, res) {

	if (!req.files.app_image || !req.body.app_image_id) {
		res.end();
		return true;
	}

	var tmp_path = req.files.app_image.path,
		target_path = __dirname + '/public/appimages/' + req.body.app_image_id + ".png",
		type = 	req.files.app_image.type;
	
	if (type != "image/png" && type != "image/gif" && type != "image/jpeg") {
		fs.unlink(tmp_path, function() {});
		res.send(false);
		return true;
	}
	
	fs.rename(tmp_path, target_path, function(err) {
		fs.unlink(tmp_path, function() {});
		im.crop({
		  srcPath: target_path,
		  dstPath: target_path,
		  format: 'png',
		  width: 25
		}, function(err, stdout, stderr){});
		
		res.send("/appimages/" + req.body.app_image_id + ".png");
	});
});

app.post('/user/settings', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}

	var updatedUser = {};
	
	if (req.body.username) {
		updatedUser.username = req.body["username"].replace(/([.$])/mg, "");
	} else {
		res.send(false);
		return false;
	}

	if (req.body.old_pwd) {
		var password = sha1Hash(req.body.old_pwd),
			newPassword = sha1Hash(req.body.new_pwd);
			
		updatedUser.password = newPassword;
	
		countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid), "password": password}, {'$set': updatedUser}, {safe: true}, function(err, member){
			if (member && !err) {
				res.send(true);
			} else {
				res.send(false);
			}
		});
	} else {
		countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {'$set': updatedUser}, {safe: true}, function(err, member){
			if (member && !err) {
				res.send(true);
			} else {
				res.send(false);
			}
		});
	}
});

app.post('/users/all', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}

	countlyDb.collection('members').find({}).toArray(function(err, members) {

		if (!members || err) {
			res.send(false);
			return false;
		}
	
		var membersObj = {};
	
		for (var i = 0; i < members.length ;i++) {
			membersObj[members[i]["_id"]] = {
				"_id": members[i]["_id"],
				"full_name": members[i]["full_name"],
				"username": members[i]["username"],
				"email": members[i]["email"],
				"admin_of": members[i]["admin_of"],
				"user_of": members[i]["user_of"],
				"global_admin": (members[i]["global_admin"] == true),
				"is_current_user": (members[i]["_id"] == req.session.uid)
			};
		}

		res.send(membersObj);
	});
});

app.post('/users/create', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}

	var newUser = {};
	
	if (req.body.full_name && req.body.username && req.body.password && req.body.email) {
		newUser.full_name = req.body.full_name.replace(/([.$])/mg, "");
		newUser.username = req.body.username.replace(/([.$])/mg, "");
		newUser.password = sha1Hash(req.body.password);
		newUser.email = req.body.email;
		
		if (req.body.admin_of) {
			newUser.admin_of = req.body.admin_of;
		}
		
		if (req.body.user_of) {
			newUser.user_of = req.body.user_of;
		}
		
		if (req.body.global_admin) {
			newUser.global_admin = (req.body.global_admin == "true");
		}
		
		countlyDb.collection('members').findOne({ $or : [ {email: req.body.email}, {username: req.body.username} ] }, function(err, member) {
			if (member || err) {
				res.send(false);
				return false;
			} else {
				createUser();
			}
		});
		
	} else {
		res.send(false);
		return false;
	}
	
	function createUser() {
		countlyDb.collection('members').insert(newUser, {safe: true}, function(err, user) {
			if (user && !err) {
				var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail"),
					userName = (req.body.full_name).split(" "),
					message = {
						from: '"Countly"',
						to: req.body.email,
						subject: 'Your Countly Account',
						html:'Hello '+ userName[0] +',<br/><br/>'+
							 'Your Countly account on <a href="'+ req.headers.host +'">'+ req.headers.host +'</a> is created with the following details;<br/><br/>'+
							 'Username: '+ req.body.username +'<br/>'+
							 'Password: '+ req.body.password +'<br/><br/>'+
							 'Enjoy,<br/>'+
							 'A fellow Countly Admin'
					};

				transport.sendMail(message, function(error){
					if(error){
						console.log('Error sending /users/create email');
						console.log(error.message);
						return;
					}
					console.log('/users/create email sent successfully!');
				});
			
				res.send(user[0]["_id"]);
			} else {
				res.send(false);
			}
		});
	}
});

app.post('/users/delete', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}
	
	if (req.body.user_ids && req.body.user_ids.length) {
		for (var i = 0; i < req.body.user_ids.length; i++) {
			if (req.body.user_ids[i] == req.session.uid) {
				continue;
			}
			
			countlyDb.collection('members').remove({"_id": countlyDb.ObjectID(req.body.user_ids[i])}, function() {})
		}
		res.send(true);
	} else {
		res.send(false);
	}
});

app.post('/users/update', function(req, res, next) {

	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		res.end();
		return false;
	}

	var modifiedUser = {},
		sendNotificationEmail = false;
	
	if (req.body.user_id && req.body.full_name && req.body.username) {
		modifiedUser.full_name = req.body.full_name.replace(/([.$])/mg, "");
		modifiedUser.username = req.body.username.replace(/([.$])/mg, "");
		
		if (req.body.password) {
			modifiedUser.password = sha1Hash(req.body.password);
		}
		
		if (req.body.admin_of) {
			modifiedUser.admin_of = req.body.admin_of;
		}
		
		if (req.body.user_of) {
			modifiedUser.user_of = req.body.user_of;
		}
		
		if (req.body.email) {
			modifiedUser.email = req.body.email;
		}
		
		if (req.body.global_admin) {
			modifiedUser.global_admin = (req.body.global_admin == "true");
		}
		
		if (req.body.send_notification) {
			sendNotificationEmail = true;
		}
	} else {
		res.send(false);
		return false;
	}
	
	countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.body.user_id)}, {'$set': modifiedUser}, {safe: true}, function(err, user) {
		if (user && !err) {
			
			if (sendNotificationEmail) {		
				var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail"),
					userName = (req.body.full_name).split(" "),
					message = {
						from: '"Countly"',
						to: req.body.email,
						subject: 'Countly Account - Password Change',
						html:'Hello '+ userName[0] +',<br/><br/>'+
							 'Your password for your Countly account on <a href="'+ req.headers.host +'">'+ req.headers.host +'</a> has been changed. Below you can find your updated account details;<br/><br/>'+
							 'Username: '+ req.body.username +'<br/>'+
							 'Password: '+ req.body.password +'<br/><br/>'+
							 'Best,<br/>'+
							 'A fellow Countly Admin'
					};

				transport.sendMail(message, function(error){
					if(error){
						console.log('Error sending /users/update email');
						console.log(error.message);
						return;
					}
					console.log('/users/update email sent successfully!');
				});
			}
			
			res.send(true);
		} else {
			res.send(false);
		}
	});
});

app.post('/users/check/email', function(req, res, next) {

	if (!req.session.uid || !isGlobalAdmin(req) || !req.body.email) {
		res.send(false);
		return false;
	}

	countlyDb.collection('members').findOne({email: req.body.email}, function(err, member) {
		if (member || err) {
			res.send(false);
		} else {
			res.send(true);
		}
	});
});

app.post('/users/check/username', function(req, res, next) {

	if (!req.session.uid || !isGlobalAdmin(req) || !req.body.username) {
		res.send(false);
		return false;
	}

	countlyDb.collection('members').findOne({username: req.body.username}, function(err, member) {
		if (member || err) {
			res.send(false);
		} else {
			res.send(true);
		}
	});
});

app.post('/events/map/edit', function(req, res, next) {
	if (!req.session.uid || !req.body.app_id) {
		res.end();
		return false;
	}
	
	if(!isGlobalAdmin(req)) {
		countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member){
			if (!err && member.admin_of && member.admin_of.indexOf(req.body.app_id) != -1) {
				countlyDb.collection('events').update({"_id": countlyDb.ObjectID(req.body.app_id)}, {'$set': {"map": req.body.event_map}}, function(err, events) {});
				res.send(true);
				return true;
			} else {
				res.send(false);
				return false;
			}
		});
	} else {
		countlyDb.collection('events').update({"_id": countlyDb.ObjectID(req.body.app_id)}, {'$set': {"map": req.body.event_map}}, function(err, events) {});
		res.send(true);
		return true;
	}
});

app.listen(countlyConfig.web.port);
