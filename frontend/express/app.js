var versionInfo = require('./version.info'),
    COUNTLY_VERSION = versionInfo.version,
    COUNTLY_TYPE = versionInfo.type,
    COUNTLY_PAGE = versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null;
    COUNTLY_NAME = versionInfo.title = versionInfo.title || "Countly";
    http = require('http'),
    express = require('express'),
    SkinStore = require('connect-mongoskin'),
    expose = require('express-expose'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    im = require('imagemagick'),
    request = require('request'),
    async = require('async'),
    stringJS = require('string'),
    flash = require('connect-flash'),
    countlyMail = require('../../api/parts/mgmt/mail.js'),
    countlyStats = require('../../api/parts/data/stats.js'),
	plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./config');
    
    var COUNTLY_NAMED_TYPE = "Countly Community Edition v"+COUNTLY_VERSION;
    var COUNTLY_TYPE_CE = true;
    var COUNTLY_TRIAL = (versionInfo.trial) ? true : false;
    if(versionInfo.footer){
        COUNTLY_NAMED_TYPE = versionInfo.footer;
        COUNTLY_TYPE_CE = false;
    }
    else if(COUNTLY_TYPE != "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6"){
        COUNTLY_NAMED_TYPE = "Countly Enterprise Edition v"+COUNTLY_VERSION; 
        COUNTLY_TYPE_CE = false;
    }
    
plugins.setConfigs("frontend", {
    production: true,
    theme: "",
    session_timeout: 30*60*1000,
});

var countlyDb = plugins.dbConnection(countlyConfig);

function sha1Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

function md5Hash(str) {
    return crypto.createHash('md5').update(str + "").digest('hex');
}

function isGlobalAdmin(req) {
    return (req.session.gadm);
}

function sortBy(arrayToSort, sortList) {
    if (!sortList.length) {
        return arrayToSort;
    }

    var tmpArr = [],
        retArr = [];

    for (var i = 0; i < arrayToSort.length; i++) {
        var objId = arrayToSort[i]["_id"] + "";
        if (sortList.indexOf(objId) !== -1) {
            tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
        }
    }

    for (var i = 0; i < tmpArr.length; i++) {
        if (tmpArr[i]) {
            retArr[retArr.length] = tmpArr[i];
        }
    }

    for (var i = 0; i < arrayToSort.length; i++) {
        if (retArr.indexOf(arrayToSort[i]) === -1) {
            retArr[retArr.length] = arrayToSort[i];
        }
    }

    return retArr;
}

var app = express();

var themeFiles = {css:[], js:[]};
var curTheme;
app.loadThemeFiles = function(theme){
    if(curTheme != theme){
        curTheme = theme;
        themeFiles = {css:[], js:[]};
        if(theme && theme.length){
            var themeDir = path.resolve(__dirname, "public/themes/"+theme+"/");
            fs.readdir(themeDir, function(err, list) {
                if (err) return ;
                var ext;
                for(var i = 0; i < list.length; i++){
                    ext = list[i].split(".").pop();
                    if(!themeFiles[ext])
                        themeFiles[ext] = [];
                    themeFiles[ext].push(countlyConfig.path+'/themes/'+theme+"/"+list[i]);
                }
            });
        }
    }
};

plugins.loadConfigs(countlyDb, function(){
    app.loadThemeFiles(plugins.getConfig("frontend").theme);
});

app.configure(function () {
    app.engine('html', require('ejs').renderFile);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.set('view options', {layout:false});
    plugins.loadAppStatic(app, countlyDb, express);
    //server theme images
    app.use(function(req, res, next) {
        if(req.url.indexOf(countlyConfig.path+'/images/') === 0){
            var url = req.url.replace(countlyConfig.path, "");
            if(curTheme && curTheme.length){
                fs.exists(__dirname + '/public/themes/'+curTheme + url, function(exists) {
                    if (exists) {
                        res.sendfile(__dirname + '/public/themes/'+curTheme + url);
                    } else {
                        res.sendfile(__dirname + '/public' + url);
                    }
                });
            }
            else{ //serve default location
                res.sendfile(__dirname + '/public' + url);
            }
        }
        else{
            next();
        }
    });
    var oneYear = 31557600000;
    app.use(countlyConfig.path, express.static(__dirname + '/public'), { maxAge:oneYear });
    app.use(express.cookieParser());
    app.use(express.session({
        secret:'countlyss',
        store:new SkinStore(countlyDb)
    }));
    app.use(express.bodyParser({uploadDir:__dirname + '/uploads'}));
    app.use(flash());
    app.use(function(req, res, next) {
        res.locals.flash = req.flash.bind(req);
        req.config = plugins.getConfig("frontend");
        var _render = res.render;
        res.render = function(view, opts, fn, parent, sub){
            if(!opts["path"])
                opts["path"] = countlyConfig.path || "";
            if(!opts["cdn"])
                opts["cdn"] = countlyConfig.cdn || "";
            if(!opts["themeFiles"])
                opts["themeFiles"] = themeFiles;
            _render.call(res, view, opts, fn, parent, sub);
        };
        next();
    });
    app.use(express.methodOverride());
    var csrf = express.csrf();
    app.use(function (req, res, next) {
        if (req.method == "GET" || req.method == 'HEAD' || req.method == 'OPTIONS'){
            //csrf not used, but lets regenerate token
            csrf(req, res, next);
        }
        else if (!plugins.callMethod("skipCSRF", {req:req, res:res, next:next})) {
            //none of the plugins requested to skip csrf for this request
            csrf(req, res, next);
        } else {
            //skipping csrf step, some plugin needs it without csrf
            next();
        }
    });
	plugins.loadAppPlugins(app, countlyDb, express);
    app.use(app.router);
});



app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

app.get(countlyConfig.path+'/', function (req, res, next) {
    res.redirect(countlyConfig.path+'/login');
});

//serve app images
app.get(countlyConfig.path+'/appimages/*', function(req, res) {
    res.sendfile(__dirname + '/public/images/default_app_icon.png');
});

if(plugins.getConfig("frontend").session_timeout){
	var extendSession = function(req, res, next){
		req.session.expires = Date.now() + plugins.getConfig("frontend").session_timeout;
	};
	var checkRequestForSession = function(req, res, next){
		if (req.session.uid) {
			if(Date.now() > req.session.expires){
				//logout user
				res.redirect(countlyConfig.path+'/logout?message=logout.inactivity');
			}
			else{
				//extend session
				extendSession(req, res, next);
				next();
			}
		}
		else
			next();
	};
	
	app.get(countlyConfig.path+'/session', function(req, res, next) {
		if (req.session.uid) {
			if(Date.now() > req.session.expires){
				//logout user
				res.send("logout");
			}
			else{
				//extend session
				extendSession(req, res, next);
				res.send("success");
			}
		}
		else
			res.send("login");
	});
	app.get(countlyConfig.path+'/dashboard', checkRequestForSession);
	app.post('*', checkRequestForSession);
}

app.get(countlyConfig.path+'/logout', function (req, res, next) {
    if (req.session) {
        plugins.callMethod("userLogout", {req:req, res:res, next:next, data:{uid:req.session.uid, email:req.session.email}});
        req.session.uid = null;
        req.session.gadm = null;
        req.session.email = null;
        res.clearCookie('uid');
        res.clearCookie('gadm');
        req.session.destroy(function () {
        });
    }
	if(req.query.message)
		res.redirect(countlyConfig.path+'/login?message='+req.query.message);
	else
		res.redirect(countlyConfig.path+'/login');
});

app.get(countlyConfig.path+'/dashboard', function (req, res, next) {
    if (!req.session.uid) {
        res.redirect(countlyConfig.path+'/login');
    } else {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (member) {
                var adminOfApps = [],
                    userOfApps = [],
                    countlyGlobalApps = {},
                    countlyGlobalAdminApps = {};

                if (member['global_admin']) {
                    countlyDb.collection('apps').find({}).toArray(function (err, apps) {
                        adminOfApps = apps;
                        userOfApps = apps;

                        countlyDb.collection('graph_notes').find().toArray(function (err, notes) {
                            var appNotes = [];
                            for (var i = 0; i < notes.length; i++) {
                                appNotes[notes[i]["_id"]] = notes[i]["notes"];
                            }

                            for (var i = 0; i < apps.length; i++) {
                                apps[i].type = apps[i].type || "mobile";
								apps[i]["notes"] = appNotes[apps[i]["_id"]] || null;
                                countlyGlobalApps[apps[i]["_id"]] = apps[i];
								countlyGlobalApps[apps[i]["_id"]]["_id"] = "" + apps[i]["_id"];
                            }

                            countlyGlobalAdminApps = countlyGlobalApps;
                            renderDashboard();
                        });
                    });
                } else {
                    var adminOfAppIds = [],
                        userOfAppIds = [];

                    if (member.admin_of.length == 1 && member.admin_of[0] == "") {
                        member.admin_of = [];
                    }

                    for (var i = 0; i < member.admin_of.length; i++) {
                        if (member.admin_of[i] == "") {
                            continue;
                        }

                        adminOfAppIds[adminOfAppIds.length] = countlyDb.ObjectID(member.admin_of[i]);
                    }

                    for (var i = 0; i < member.user_of.length; i++) {
                        if (member.user_of[i] == "") {
                            continue;
                        }

                        userOfAppIds[userOfAppIds.length] = countlyDb.ObjectID(member.user_of[i]);
                    }

                    countlyDb.collection('apps').find({ _id:{ '$in':adminOfAppIds } }).toArray(function (err, admin_of) {

                        for (var i = 0; i < admin_of.length; i++) {
                            countlyGlobalAdminApps[admin_of[i]["_id"]] = admin_of[i];
							countlyGlobalAdminApps[admin_of[i]["_id"]]["_id"] = "" + admin_of[i]["_id"];
                        }

                        countlyDb.collection('apps').find({ _id:{ '$in':userOfAppIds } }).toArray(function (err, user_of) {
                            adminOfApps = admin_of;
                            userOfApps = user_of;

                            countlyDb.collection('graph_notes').find({ _id:{ '$in':userOfAppIds } }).toArray(function (err, notes) {
                                var appNotes = [];
                                for (var i = 0; i < notes.length; i++) {
                                    appNotes[notes[i]["_id"]] = notes[i]["notes"];
                                }

                                for (var i = 0; i < user_of.length; i++) {
									user_of[i]["notes"] = appNotes[user_of[i]["_id"]] || null;
                                    countlyGlobalApps[user_of[i]["_id"]] = user_of[i];
									countlyGlobalApps[user_of[i]["_id"]]["_id"] = "" + user_of[i]["_id"];
                                    countlyGlobalApps[user_of[i]["_id"]].type = countlyGlobalApps[user_of[i]["_id"]].type || "mobile";
                                }
                                
                                renderDashboard();
                            });
                        });
                    });
                }

                function renderDashboard() {
                    req.session.uid = member["_id"];
                    req.session.gadm = (member["global_admin"] == true);
                    req.session.email = member["email"];
                    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

                    delete member["password"];
                    
                    adminOfApps = sortBy(adminOfApps, member.appSortList || []);
                    userOfApps = sortBy(userOfApps, member.appSortList || []);
                    
                    var defaultApp = userOfApps[0];

                    var countlyGlobal = {
                        countlyTitle:COUNTLY_NAME,
                        apps:countlyGlobalApps,
                        defaultApp:defaultApp,
                        admin_apps:countlyGlobalAdminApps,
                        csrf_token:req.session._csrf,
                        member:member,
                        config: req.config,
						plugins:plugins.getPlugins(),
						path:countlyConfig.path || "",
						cdn:countlyConfig.cdn || "",
                        message: req.flash("message")
                    }; 
                    
                    var toDashboard = {
                        countlyTitle:COUNTLY_NAME,
                        adminOfApps:adminOfApps,
                        userOfApps:userOfApps,
                        defaultApp:defaultApp,
                        member:member,
                        intercom:countlyConfig.web.use_intercom,
                        countlyVersion:COUNTLY_VERSION,
						countlyType: COUNTLY_TYPE_CE,
						countlyTrial: COUNTLY_TRIAL,
						countlyTypeName: COUNTLY_NAMED_TYPE,
			            production: plugins.getConfig("frontend").production || false,
						plugins:plugins.getPlugins(),
                        config: req.config,
						path:countlyConfig.path || "",
						cdn:countlyConfig.cdn || "",
                        themeFiles:themeFiles
                    };
                    
                    plugins.callMethod("renderDashboard", {req:req, res:res, next:next, data:{member:member, adminApps:countlyGlobalAdminApps, userApps:countlyGlobalApps, countlyGlobal:countlyGlobal, toDashboard:toDashboard}});

                    res.expose(countlyGlobal, 'countlyGlobal');
                    
                    res.render('dashboard', toDashboard);
                }
            } else {
                if (req.session) {
                    req.session.uid = null;
                    req.session.gadm = null;
                    req.session.email = null;
                    res.clearCookie('uid');
                    res.clearCookie('gadm');
                    req.session.destroy(function () {});
                }
                res.redirect(countlyConfig.path+'/login');
            }
        });
    }
});

app.get(countlyConfig.path+'/setup', function (req, res, next) {
    countlyDb.collection('members').count({}, function (err, memberCount) {
        if (memberCount) {
            res.redirect(countlyConfig.path+'/login');
        } else {
            res.render('setup', {countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles});
        }
    });
});

app.get(countlyConfig.path+'/login', function (req, res, next) {
    if (req.session.uid) {
        res.redirect(countlyConfig.path+'/dashboard');
    } else {
        countlyDb.collection('members').count({}, function (err, memberCount) {
            if (memberCount) {
				if(req.query.message)
					req.flash('info', req.query.message);
                res.render('login', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "message":req.flash('info'), "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
            } else {
                res.redirect(countlyConfig.path+'/setup');
            }
        });
    }
});

app.get(countlyConfig.path+'/forgot', function (req, res, next) {
    if (req.session.uid) {
        res.redirect(countlyConfig.path+'/dashboard');
    } else {
        res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "message":req.flash('info'), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
    }
});

app.get(countlyConfig.path+'/reset/:prid', function (req, res, next) {
    if (req.params.prid) {
        countlyDb.collection('password_reset').findOne({prid:req.params.prid}, function (err, passwordReset) {
            var timestamp = Math.round(new Date().getTime() / 1000);

            if (passwordReset && !err) {
                if (timestamp > (passwordReset.timestamp + 600)) {
                    req.flash('info', 'reset.invalid');
                    res.redirect(countlyConfig.path+'/forgot');
                } else {
                    res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "prid":req.params.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
                }
            } else {
                req.flash('info', 'reset.invalid');
                res.redirect(countlyConfig.path+'/forgot');
            }
        });
    } else {
        req.flash('info', 'reset.invalid');
        res.redirect(countlyConfig.path+'/forgot');
    }
});

app.post(countlyConfig.path+'/reset', function (req, res, next) {
    if (req.body.password && req.body.again && req.body.prid) {
        var password = sha1Hash(req.body.password);

        countlyDb.collection('password_reset').findOne({prid:req.body.prid}, function (err, passwordReset) {
            countlyDb.collection('members').update({_id:passwordReset.user_id}, {'$set':{ "password":password }}, function (err, member) {
                plugins.callMethod("passwordReset", {req:req, res:res, next:next, data:member[0]});
                req.flash('info', 'reset.result');
                res.redirect(countlyConfig.path+'/login');
            });

            countlyDb.collection('password_reset').remove({prid:req.body.prid}, function () {});
        });
    } else {
        res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "prid":req.body.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
    }
});

app.post(countlyConfig.path+'/forgot', function (req, res, next) {
    if (req.body.email) {
        countlyDb.collection('members').findOne({"email":req.body.email}, function (err, member) {
            if (member) {
                var timestamp = Math.round(new Date().getTime() / 1000),
                    prid = sha1Hash(member.username + member.full_name, timestamp);
                member.lang = member.lang || req.body.lang || "en";
                countlyDb.collection('password_reset').insert({"prid":prid, "user_id":member._id, "timestamp":timestamp}, {safe:true}, function (err, password_reset) {
                    countlyMail.sendPasswordResetInfo(member, prid);
                    plugins.callMethod("passwordRequest", {req:req, res:res, next:next, data:req.body});
                    res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "message":"forgot.result", "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
                });
            } else {
                res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE,"message":"forgot.result", "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:themeFiles });
            }
        });
    } else {
        res.redirect(countlyConfig.path+'/forgot');
    }
});

app.post(countlyConfig.path+'/setup', function (req, res, next) {
    countlyDb.collection('members').count({}, function (err, memberCount) {
        if (memberCount) {
            res.redirect(countlyConfig.path+'/login');
        } else {
            if (req.body.full_name && req.body.username && req.body.password && req.body.email) {
                var password = sha1Hash(req.body.password);
                
                var doc = {"full_name":req.body.full_name, "username":req.body.username, "password":password, "email":req.body.email, "global_admin":true};
                if(req.body.lang)
                    doc.lang = req.body.lang;
                countlyDb.collection('members').insert(doc, {safe:true}, function (err, member) {
                    member = member.ops;
                    if (countlyConfig.web.use_intercom) {
                        var options = {uri:"https://cloud.count.ly/s", method:"POST", timeout:4E3, json:{email:req.body.email, full_name:req.body.full_name, v:COUNTLY_VERSION, t:COUNTLY_TYPE}};
                        request(options, function(a, c, b) {
                            a = {};
                            a.api_key = md5Hash(member[0]._id + (new Date).getTime());
                            b && (b.in_user_id && (a.in_user_id = b.in_user_id), b.in_user_hash && (a.in_user_hash = b.in_user_hash));

                            countlyDb.collection("members").update({_id:member[0]._id}, {$set:a}, function(err, mem) {
                                plugins.callMethod("setup", {req:req, res:res, next:next, data:member[0]});
                                req.session.uid = member[0]._id;
                                req.session.gadm = !0;
                                req.session.email = member[0].email;
                                res.redirect(countlyConfig.path+"/dashboard")
                            })
                        });
                    } else {
                        a = {};
                        a.api_key = md5Hash(member[0]._id + (new Date).getTime());

                        countlyDb.collection("members").update({_id:member[0]._id}, {$set:a}, function() {
                            req.session.uid = member[0]._id;
                            req.session.gadm = !0;
                            req.session.email = member[0].email;
                            res.redirect(countlyConfig.path+"/dashboard")
                        })
                    }
                });
            } else {
                res.redirect(countlyConfig.path+'/setup');
            }
        }
    });
});

app.post(countlyConfig.path+'/login', function (req, res, next) {
    if (req.body.username && req.body.password) {
        var password = sha1Hash(req.body.password);

        countlyDb.collection('members').findOne({$or: [ {"username":req.body.username}, {"email":req.body.username} ], "password":password}, function (err, member) {
            if (member) {
                plugins.callMethod("loginSuccessful", {req:req, res:res, next:next, data:member});
                if (countlyConfig.web.use_intercom && member['global_admin']) {
                    countlyStats.getOverall(countlyDb, function(statsObj){
                        request({
                            uri:"https://cloud.count.ly/s",
                            method:"POST",
                            timeout:4E3,
                            json:{
                                email:member.email,
                                full_name:member.full_name,
                                v:COUNTLY_VERSION,
                                t:COUNTLY_TYPE,
                                u:statsObj["total-users"],
                                e:statsObj["total-events"],
                                a:statsObj["total-apps"],
                                m:statsObj["total-msg-users"],
                                mc:statsObj["total-msg-created"],
                                ms:statsObj["total-msg-sent"]
                            }
                        }, function(a, c, b) {
                            a = {};
                            b && (b.in_user_id && !member.in_user_id && (a.in_user_id = b.in_user_id), b.in_user_hash && !member.in_user_hash && (a.in_user_hash = b.in_user_hash));
                            Object.keys(a).length && countlyDb.collection("members").update({_id:member._id}, {$set:a}, function() {})
                        });
                    });
                }

                req.session.uid = member["_id"];
                req.session.gadm = (member["global_admin"] == true);
				req.session.email = member["email"];
                if(req.body.lang && req.body.lang != member["lang"]){
                    countlyDb.collection('members').update({_id:member["_id"]}, {$set:{lang:req.body.lang}}, function(){});
                }
				if(plugins.getConfig("frontend").session_timeout)
					req.session.expires = Date.now()+plugins.getConfig("frontend").session_timeout;
                res.redirect(countlyConfig.path+'/dashboard');
            } else {
                plugins.callMethod("loginFailed", {req:req, res:res, next:next, data:req.body});
				res.redirect(countlyConfig.path+'/login?message=login.result');
            }
        });
    } else {
        res.redirect(countlyConfig.path+'/login?message=login.result');
    }
});

var auth = express.basicAuth(function(user, pass, callback) {
    var password = sha1Hash(pass);
    countlyDb.collection('members').findOne({$or: [ {"username":user}, {"email":user} ], "password":password}, function (err, member) {
        if(member)
			callback(null, member);
		else
			callback("err", user);
    });
});

app.get(countlyConfig.path+'/api-key', auth, function (req, res, next) {
    if (req.user && req.user._id) {
        plugins.callMethod("apikeySuccessful", {req:req, res:res, next:next, data:req.user});
        res.send(req.user.api_key);
    } else {
        plugins.callMethod("apikeyFailed", {req:req, res:res, next:next, data:{username:req.user}});
        res.send("-1");
    }
});

app.post(countlyConfig.path+'/mobile/login', function (req, res, next) {
    if (req.body.username && req.body.password) {
        var password = sha1Hash(req.body.password);

        countlyDb.collection('members').findOne({$or: [ {"username":req.body.username}, {"email":req.body.username} ], "password":password}, function (err, member) {
            if (member) {
                plugins.callMethod("mobileloginSuccessful", {req:req, res:res, next:next, data:member});
                res.render('mobile/key', { "key": member.api_key || -1 });
            } else {
                plugins.callMethod("mobileloginFailed", {req:req, res:res, next:next, data:req.body});
                res.render('mobile/login', { "message":"login.result", "csrf":req.session._csrf });
            }
        });
    } else {
        res.render('mobile/login', { "message":"login.result", "csrf":req.session._csrf });
    }
});

app.post(countlyConfig.path+'/dashboard/settings', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var newAppOrder = req.body.app_sort_list;

    if (!newAppOrder || newAppOrder.length == 0) {
        res.end();
        return false;
    }

    countlyDb.collection('members').update({_id:countlyDb.ObjectID(req.session.uid)}, {'$set':{'appSortList':newAppOrder}}, {'upsert':true}, function(){
        res.end();
        return false;
    });
});

app.post(countlyConfig.path+'/apps/icon', function (req, res, next) {
    if (!req.files.app_image || !req.body.app_image_id) {
        res.end();
        return true;
    }

    var tmp_path = req.files.app_image.path,
        target_path = __dirname + '/public/appimages/' + req.body.app_image_id + ".png",
        type = req.files.app_image.type;

    if (type != "image/png" && type != "image/gif" && type != "image/jpeg") {
        fs.unlink(tmp_path, function () {});
        res.send(false);
        return true;
    }
    plugins.callMethod("iconUpload", {req:req, res:res, next:next, data:req.body});
    fs.rename(tmp_path, target_path, function (err) {
        fs.unlink(tmp_path, function () {});
        im.crop({
            srcPath:target_path,
            dstPath:target_path,
            format:'png',
            width:72,
            height:72
        }, function (err, stdout, stderr) {});

        res.send(countlyConfig.path+"/appimages/" + req.body.app_image_id + ".png");
    });
});

app.post(countlyConfig.path+'/user/settings', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.username) {
        updatedUser.username = req.body["username"];
        if (req.body.lang) {
            updatedUser.lang = req.body.lang;
        }

        countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
            if ((member && member._id != req.session.uid) || err) {
                res.send("username-exists");
            } else {
                if (req.body.old_pwd) {
                    var password = sha1Hash(req.body.old_pwd),
                        newPassword = sha1Hash(req.body.new_pwd);

                    updatedUser.password = newPassword;
                    plugins.callMethod("userSettings", {req:req, res:res, next:next, data:member});
                    countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid), "password":password}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                        if (member && !err) {
                            res.send(true);
                        } else {
                            res.send(false);
                        }
                    });
                } else {
                    countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid)}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                        if (member && !err) {
                            res.send(true);
                        } else {
                            res.send(false);
                        }
                    });
                }
            }
        });
    } else {
        res.send(false);
        return false;
    }
});

app.post(countlyConfig.path+'/users/check/email', function (req, res, next) {
    if (!req.session.uid || !isGlobalAdmin(req) || !req.body.email) {
        res.send(false);
        return false;
    }

    countlyDb.collection('members').findOne({email:req.body.email}, function (err, member) {
        if (member || err) {
            res.send(false);
        } else {
            res.send(true);
        }
    });
});

app.post(countlyConfig.path+'/users/check/username', function (req, res, next) {
    if (!req.session.uid || !isGlobalAdmin(req) || !req.body.username) {
        res.send(false);
        return false;
    }

    countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
        if (member || err) {
            res.send(false);
        } else {
            res.send(true);
        }
    });
});

app.post(countlyConfig.path+'/events/map/edit', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id) {
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.admin_of && member.admin_of.indexOf(req.body.app_id) != -1) {
                countlyDb.collection('events').update({"_id":countlyDb.ObjectID(req.body.app_id)}, {'$set':{"map":req.body.event_map, "order":req.body.event_order}}, function (err, events) {
                });
                res.send(true);
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        countlyDb.collection('events').update({"_id":countlyDb.ObjectID(req.body.app_id)}, {'$set':{"map":req.body.event_map, "order":req.body.event_order}}, function (err, events) {
        });
        res.send(true);
        return true;
    }
});

function deleteEvent(req, event_key, app_id, callback){
    var updateThese = {
        "$unset": {},
        "$pull": {
            "list": event_key,
            "order": event_key
        }
    };

    if(event_key.indexOf('.') != -1){
        updateThese["$unset"]["map." + event_key.replace(/\./g,':')] = 1;
        updateThese["$unset"]["segments." + event_key.replace(/\./g,':')] = 1;
    }
    else{
        updateThese["$unset"]["map." + event_key] = 1;
        updateThese["$unset"]["segments." + event_key] = 1;
    }

    var collectionNameWoPrefix = crypto.createHash('sha1').update(event_key + app_id).digest('hex');
    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.admin_of && member.admin_of.indexOf(app_id) != -1) {
                countlyDb.collection('events').update({"_id":countlyDb.ObjectID(app_id)}, updateThese, function (err, events) {
                    if(callback)
                        callback(true);
                });
                countlyDb.collection("events" + collectionNameWoPrefix).drop();
                return true;
            } else {
                if(callback)
                    callback(false);
                return false;
            }
        });
    } else {
        countlyDb.collection('events').update({"_id":countlyDb.ObjectID(app_id)}, updateThese, function (err, events) {
            if(callback)
                callback(true);
        });
        countlyDb.collection("events" + collectionNameWoPrefix).drop();
        return true;
    }
}

app.post(countlyConfig.path+'/events/delete', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.event_key) {
        res.end();
        return false;
    }
    
    deleteEvent(req, req.body.event_key, req.body.app_id, function(result){
        res.send(result);
    })
});

app.post(countlyConfig.path+'/events/delete_multi', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.events) {
        res.end();
        return false;
    }
    req.body.events = JSON.parse(req.body.events);
    async.each(req.body.events, function(key, callback){
        deleteEvent(req, key, req.body.app_id, function(result){
            callback();
        })
    }, function(err, results) {
        res.send(true);
    });
});

app.post(countlyConfig.path+'/graphnotes/create', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note || req.body.note.length > 50) {
        res.send(false);
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) != -1) {
                createNote();
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        createNote();
        return true;
    }

    function createNote() {
        var noteObj = {},
            sanNote = stringJS(req.body.note).stripTags().s;

        noteObj["notes." + req.body.date_id] = sanNote;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $addToSet: noteObj }, {upsert: true}, function(err, res) {});
        res.send(sanNote);
    }
});

app.post(countlyConfig.path+'/graphnotes/delete', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note) {
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) != -1) {
                deleteNote();
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        deleteNote();
        return true;
    }

    function deleteNote() {
        var noteObj = {};
        noteObj["notes." + req.body.date_id] = req.body.note;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $pull: noteObj }, function(err, res) {});
        res.send(true);
    }
});

app.listen(countlyConfig.web.port, countlyConfig.web.host  || '');