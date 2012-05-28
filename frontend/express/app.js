var express = require('express'),
	mongoStore = require('connect-mongodb'),
	expose = require('express-expose'),
	mongo = require('mongoskin'),
	crypto = require('crypto'),
	countlyDb = mongo.db('localhost:27017/countly?auto_reconnect'),
	Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	server_config = new Server('localhost', 27017, {auto_reconnect: true, native_parser: true}),
	sessionDb = new Db('countly', server_config, {}),
	fs = require('fs'),
	im = require('imagemagick');
	
var app = module.exports = express.createServer();

app.configure(function(){
	app.register('.html', require('ejs'));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'html');
	app.set('view options', {layout: false});
	app.use(express.bodyParser({uploadDir: __dirname + '/uploads'}));
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'countlyss',
		store: new mongoStore({db: sessionDb, collection: 'usersessions'})
	}));
	app.use(express.methodOverride());
	app.use(app.router);
    var oneYear = 31557600000;
    app.use(express.static(__dirname + '/public'), { maxAge: oneYear });
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req, res, next){
	res.redirect('/login');
});

app.get('/logout', function(req, res, next){
  if (req.session) {
    req.session.uid = null;
    res.clearCookie('uid');
    req.session.destroy(function() {});
  }
  res.redirect('/login');
});

app.get('/dashboard', function(req, res, next) {
	if (!req.session.uid) {
		res.redirect('/login');
	} else {
		countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member){
			if (member) {
				if (member.apps && member.apps.length) {
					var appIdArr = [];

					for (var i = 0; i < member.apps.length ;i++) {
						appIdArr[appIdArr.length] = countlyDb.ObjectID(member.apps[i]);	
					}
				
					countlyDb.collection('apps').find({ _id : { '$in': appIdArr } }, {"admins": 0}).toArray(function(err, apps) {
					
						var memberApps = {};
					
						for (var i = 0; i < apps.length ;i++) {
							memberApps[apps[i]["_id"]] = {
								"name": apps[i]["name"],
								"key": apps[i]["key"],
								"category": apps[i]["category"],
								"timezone": apps[i]["timezone"],
								"country": apps[i]["country"]
							};	
						}
									
						req.session.uid = member["_id"];
						
						res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
						res.expose(memberApps, "gCountlyApps");
						res.render('dashboard', { apps: apps, username: member["username"] });
					});
				} else {
					req.session.uid = member["_id"];

					res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
					res.expose([], "gCountlyApps");
					res.render('dashboard', { apps: [], username: member["username"] });
				}
			} else {
				if (req.session) {
					req.session.uid = null;
					res.clearCookie('uid');
					req.session.destroy(function() {});
				}
				res.redirect('/login');
			}
		});
	}
});

app.get('/setup', function(req, res, next){
	countlyDb.collection('members').count({}, function(err, memberCount){
		if (memberCount) {
			res.redirect('/login');
		} else {
			res.render('setup');
		}
	});
});

app.get('/login', function(req, res, next){
	if (req.session.uid) {
		res.redirect('/dashboard');
	} else {
		countlyDb.collection('members').count({}, function(err, memberCount){
			if (memberCount) {
				res.render('login', { title: "Login" });
			} else {
				res.redirect('/setup');
			}
		});
	}
});

app.post('/setup', function(req, res, next) {
	if (req.body.username && req.body.password) {
		var password = crypto.createHash('sha1').update(req.body.password + "").digest('hex');
	
		countlyDb.collection('members').insert({"username": req.body.username, "password": password}, {safe: true}, function(err, member){
			req.session.uid = member[0]["_id"];
			res.redirect('/dashboard');
		});
	} else {
		res.redirect('/setup');
	}
});

app.post('/login', function(req, res, next) {
	if (req.body.username && req.body.password) {
		var password = crypto.createHash('sha1').update(req.body.password + "").digest('hex');
	
		countlyDb.collection('members').findOne({"username": req.body.username, "password": password}, function(err, member){
			if (member) {
				req.session.uid = member["_id"];
				res.redirect('/dashboard');
			} else {
				res.render('login', { title: "Login Failed" });
			}
		});
	} else {
		res.render('login', { title: "Login Failed" });
		res.end();
	}
});

app.post('/dashboard/apps/add', function(req, res, next) {
	
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	var appObj = {
		"name": req.body.app_name,
		"category": req.body.category,
		"timezone": req.body.timezone,
		"country": req.body.country,
		"admins": [req.session.uid],
		"key": ""
	}

	countlyDb.collection('apps').insert(appObj, function(err, app) {
		var salt = new Date().getTime(),
				appKey = crypto.createHmac('sha1', salt + "").update(app[0]["_id"] + "").digest('hex');
	
		countlyDb.collection('apps').update({"_id": app[0]["_id"]}, {$set: {key: appKey}}, function(err, app) {});
		countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {$addToSet: {"apps": "" + app[0]["_id"]}}, function(err, app) {});

		appObj.key = appKey;

		res.send(appObj);
		res.end();
	});
});

app.post('/dashboard/apps/edit', function(req, res, next) {
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

	countlyDb.collection('apps').update({"_id": countlyDb.ObjectID(req.body.app_id), "admins": req.session.uid}, {$set: appObj}, function(err, app) {
		res.send(appObj);
	});
});

app.post('/dashboard/apps/delete', function(req, res, next) {
	if (!req.session.uid) {
		res.end();
		return false;
	}
	
	countlyDb.collection('apps').remove({"_id": countlyDb.ObjectID(req.body.app_id), "admins": req.session.uid}, {safe: true}, function(err, result) {
	
		if (!result) {
			res.send(false);
			return false;
		}
	
		var iconPath = __dirname + '/public/appimages/' + req.body.app_id + ".png";
		fs.unlink(iconPath, function() {});
	
		countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {$pull: {"apps": req.body.app_id}}, function(err, app) {});
		countlyDb.collection('sessions').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('users').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('carriers').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('locations').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('realtime').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('app_users').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('devices').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		countlyDb.collection('device_details').remove({"_id": countlyDb.ObjectID(req.body.app_id)});
		
		res.send(true);
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
		var password = crypto.createHash('sha1').update(req.body.old_pwd + "").digest('hex'),
			newPassword = crypto.createHash('sha1').update(req.body.new_pwd + "").digest('hex');
			
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

app.post('/dashboard/apps/icon', function(req, res) {
	
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
		im.resize({
		  srcPath: target_path,
		  dstPath: target_path,
		  format: 'png',
		  width: 25,
		  height: 25
		}, function(err, stdout, stderr){});
		
		res.send("/appimages/" + req.body.app_image_id + ".png");
	});
});

app.listen(6001);