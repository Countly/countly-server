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
    sharp = require('sharp'),
    request = require('request'),
    async = require('async'),
    stringJS = require('string'),
    flash = require('connect-flash'),
    cookieParser = require('cookie-parser'),
    formidable = require('formidable'),
    session = require('express-session'),
    methodOverride = require('method-override'),
    csrf = require('csurf'),
    errorhandler = require('errorhandler'),
    basicAuth = require('basic-auth'),
    bodyParser = require('body-parser'),
    _ = require('underscore'),
    countlyMail = require('../../api/parts/mgmt/mail.js'),
    countlyStats = require('../../api/parts/data/stats.js'),
	plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./config', 'dont-enclose');
    
    var COUNTLY_NAMED_TYPE = "Countly Community Edition v"+COUNTLY_VERSION;
    var COUNTLY_TYPE_CE = true;
    var COUNTLY_TRIAL = (versionInfo.trial) ? true : false;
    var COUNTLY_TRACK_TYPE = "OSS";
    if(versionInfo.footer){
        COUNTLY_NAMED_TYPE = versionInfo.footer;
        COUNTLY_TYPE_CE = false;
        if(COUNTLY_NAMED_TYPE == "Countly Cloud")
            COUNTLY_TRACK_TYPE = "Cloud";
        else if(COUNTLY_TYPE != "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6")
            COUNTLY_TRACK_TYPE = "Enterprise";
    }
    else if(COUNTLY_TYPE != "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6"){
        COUNTLY_NAMED_TYPE = "Countly Enterprise Edition v"+COUNTLY_VERSION; 
        COUNTLY_TYPE_CE = false;
        COUNTLY_TRACK_TYPE = "Enterprise";
    }
    
plugins.setConfigs("frontend", {
    production: true,
    theme: "",
    session_timeout: 30*60*1000,
    use_google: true,
    code: true
});

plugins.setUserConfigs("frontend", {
    production: false,
    theme: false,
    session_timeout: false,
    use_google: false,
    code: false
});

process.on('uncaughtException', (err) => {
  console.log('Caught exception: %j', err, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
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
app = expose(app);

var loadedThemes = {};
var curTheme;
app.loadThemeFiles = function(theme, callback){
    if(!loadedThemes[theme]){
        var tempThemeFiles = {css:[], js:[]};
        if(theme && theme.length){
            var themeDir = path.resolve(__dirname, "public/themes/"+theme+"/");
            fs.readdir(themeDir, function(err, list) {
                if (err){
                    if(callback)
                        callback(tempThemeFiles);
                    return ;
                }
                var ext;
                for(var i = 0; i < list.length; i++){
                    ext = list[i].split(".").pop();
                    if(!tempThemeFiles[ext])
                        tempThemeFiles[ext] = [];
                    tempThemeFiles[ext].push(countlyConfig.path+'/themes/'+theme+"/"+list[i]);
                }
                if(callback)
                    callback(tempThemeFiles);
                loadedThemes[theme] = tempThemeFiles;
            });
        }
        else if(callback)
            callback(tempThemeFiles);
    }
    else if(callback)
        callback(loadedThemes[theme]);
};

plugins.loadConfigs(countlyDb, function(){
    curTheme = plugins.getConfig("frontend").theme;
    app.loadThemeFiles(plugins.getConfig("frontend").theme);
});

app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('view options', {layout:false});
plugins.loadAppStatic(app, countlyDb, express);
app.use(cookieParser());
//server theme images
app.use(function(req, res, next) {
    if(req.url.indexOf(countlyConfig.path+'/images/') === 0){
        var url = req.url.replace(countlyConfig.path, "");
        var theme = req.cookies.theme || curTheme;
        if(theme && theme.length){
            fs.exists(__dirname + '/public/themes/'+theme + url, function(exists) {
                if (exists) {
                    res.sendFile(__dirname + '/public/themes/'+theme + url);
                } else {
                    next();
                }
            });
        }
        else{ //serve default location
            next();
        }
    }
    else{
        next();
    }
});
var oneYear = 31557600000;
app.use(countlyConfig.path, express.static(__dirname + '/public', { maxAge:oneYear }));
app.use(session({
    secret:'countlyss',
    store:new SkinStore(countlyDb),
    saveUninitialized: false,
    resave: false
}));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(function(req, res, next){
    var contentType = req.headers['content-type'];
    if(req.method.toLowerCase() == 'post' && contentType && contentType.indexOf('multipart/form-data') >= 0){
        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/uploads';
        form.parse(req, function(err, fields, files) {
            req.files = files;
            if(!req.body)
                req.body = {};
            for(var i in fields){
                if(typeof req.body[i] === "undefined")
                    req.body[i] = fields[i];
            }
            next();
        });
    }
    else
        next();
});
app.use(flash());
app.use(function(req, res, next) {
    plugins.loadConfigs(countlyDb, function(){
        curTheme = plugins.getConfig("frontend").theme;
        app.loadThemeFiles(req.cookies.theme || plugins.getConfig("frontend").theme, function(themeFiles){
            res.locals.flash = req.flash.bind(req);
            req.config = plugins.getConfig("frontend");
            req.themeFiles = themeFiles;
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
    });
});
app.use(methodOverride());
var csrf = csrf();
app.use(function (req, res, next) {
    if (!plugins.callMethod("skipCSRF", {req:req, res:res, next:next})) {
        //none of the plugins requested to skip csrf for this request
        csrf(req, res, next);
    } else {
        //skipping csrf step, some plugin needs it without csrf
        next();
    }
});
plugins.loadAppPlugins(app, countlyDb, express);

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
    app.use(errorhandler(true));
}

app.get(countlyConfig.path+'/', function (req, res, next) {
    res.redirect(countlyConfig.path+'/login');
});

//serve app images
app.get(countlyConfig.path+'/appimages/*', function(req, res) {
    res.sendFile(__dirname + '/public/images/default_app_icon.png');
});


var extendSession = function(req, res, next){
	req.session.expires = Date.now() + plugins.getConfig("frontend", req.session.settings).session_timeout;
};
var checkRequestForSession = function(req, res, next){
    if(parseInt(plugins.getConfig("frontend", req.session.settings).session_timeout)){
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
    }
    else
        next();
};

app.get(countlyConfig.path+'/ping', function(req, res, next) {
    countlyDb.collection("plugins").findOne({_id:"plugins"}, function(err, result){
        if(err)
            res.status(404).send("DB Error");
        else
            res.send("Success");
    });
});

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


app.get(countlyConfig.path+'/logout', function (req, res, next) {
    if (req.session) {
        plugins.callMethod("userLogout", {req:req, res:res, next:next, data:{uid:req.session.uid, email:req.session.email}});
        req.session.uid = null;
        req.session.gadm = null;
        req.session.email = null;
        req.session.settings = null;
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
                    var configs = plugins.getConfig("frontend", member.settings);
                    app.loadThemeFiles(configs.theme, function(theme){
                        res.cookie("theme", configs.theme);
                        req.session.uid = member["_id"];
                        req.session.gadm = (member["global_admin"] == true);
                        req.session.email = member["email"];
                        req.session.settings = member.settings;
                        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    
                        delete member["password"];
                        
                        adminOfApps = sortBy(adminOfApps, member.appSortList || []);
                        userOfApps = sortBy(userOfApps, member.appSortList || []);
                        
                        var defaultApp = userOfApps[0];
                        _.extend(req.config, configs);
                        var countlyGlobal = {
                            countlyTitle:COUNTLY_NAME,
                            apps:countlyGlobalApps,
                            defaultApp:defaultApp,
                            admin_apps:countlyGlobalAdminApps,
                            csrf_token:req.csrfToken(),
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
                            track:countlyConfig.web.track || false,
                            installed: req.session.install || false,
                            cpus: require('os').cpus().length,
                            countlyVersion:COUNTLY_VERSION,
                            countlyType: COUNTLY_TYPE_CE,
                            countlyTrial: COUNTLY_TRIAL,
                            countlyTypeName: COUNTLY_NAMED_TYPE,
                            countlyTypeTrack: COUNTLY_TRACK_TYPE,
                            production: configs.production || false,
                            plugins:plugins.getPlugins(),
                            config: req.config,
                            path:countlyConfig.path || "",
                            cdn:countlyConfig.cdn || "",
                            use_google:configs.use_google || false,
                            themeFiles:theme
                        };
                        
                        if(req.session.install){
                            req.session.install = null;
                            res.clearCookie('install');
                        }
                        plugins.callMethod("renderDashboard", {req:req, res:res, next:next, data:{member:member, adminApps:countlyGlobalAdminApps, userApps:countlyGlobalApps, countlyGlobal:countlyGlobal, toDashboard:toDashboard}});
    
                        res.expose(countlyGlobal, 'countlyGlobal');
                        
                        res.render('dashboard', toDashboard);
                    });
                }
            } else {
                if (req.session) {
                    req.session.uid = null;
                    req.session.gadm = null;
                    req.session.email = null;
                    req.session.settings = null;
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
            res.render('setup', {countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.csrfToken(), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles});
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
                res.render('login', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "message":req.flash('info'), "csrf":req.csrfToken(), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
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
        res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.csrfToken(), "message":req.flash('info'), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
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
                    res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.csrfToken(), "prid":req.params.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
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
            countlyDb.collection('members').findAndModify({_id:passwordReset.user_id}, {}, {'$set':{ "password":password }}, function (err, member) {
                member = member && member.ok ? member.value : null;
                plugins.callMethod("passwordReset", {req:req, res:res, next:next, data:member});
                req.flash('info', 'reset.result');
                res.redirect(countlyConfig.path+'/login');
            });

            countlyDb.collection('password_reset').remove({prid:req.body.prid}, function () {});
        });
    } else {
        res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.csrfToken(), "prid":req.body.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
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
                    res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "message":"forgot.result", "csrf":req.csrfToken(), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
                });
            } else {
                res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE,"message":"forgot.result", "csrf":req.csrfToken(), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
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
                                req.session.install = true;
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
                            req.session.install = true;
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
                if (!countlyConfig.web.track || countlyConfig.web.track == "GA" && member['global_admin'] || countlyConfig.web.track == "noneGA" && !member['global_admin']) {
                    countlyStats.getUser(countlyDb, member, function(statsObj){
                        var date = new Date();
                        request({
                            uri:"https://stats.count.ly/i",
                            method:"GET",
                            timeout:4E3,
                            qs:{
                                device_id:member.email,
                                app_key:"386012020c7bf7fcb2f1edf215f1801d6146913f",
                                timestamp: Math.round(date.getTime()/1000),
                                hour: date.getHours(),
                                dow: date.getDay(),
                                user_details:JSON.stringify(
                                    {
                                        custom:{
                                            apps: (member.user_of) ? member.user_of.length : 0,
                                            platforms:{"$addToSet":statsObj["total-platforms"]},
                                            events:statsObj["total-events"],
                                            pushes:statsObj["total-msg-sent"],
                                            crashes:statsObj["total-crash-groups"],
                                            users:statsObj["total-users"]
                                        }
                                    }
                                )
                                
                            }
                        }, function(a, c, b) {});
                    });
                }

                req.session.uid = member["_id"];
                req.session.gadm = (member["global_admin"] == true);
				req.session.email = member["email"];
                req.session.settings = member.settings;
                if(req.body.lang && req.body.lang != member["lang"]){
                    countlyDb.collection('members').update({_id:member["_id"]}, {$set:{lang:req.body.lang}}, function(){});
                }
				if(plugins.getConfig("frontend", member.settings).session_timeout)
					req.session.expires = Date.now()+plugins.getConfig("frontend", member.settings).session_timeout;
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

app.get(countlyConfig.path+'/api-key', function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401).send("-1");
    };
    var user = basicAuth(req);
    
    if (!user || !user.name || !user.pass) {
        plugins.callMethod("apikeyFailed", {req:req, res:res, next:next, data:{username:""}});
        unauthorized(res);
        return;
    };
    
    var password = sha1Hash(user.pass);
    countlyDb.collection('members').findOne({$or: [ {"username":user.name}, {"email":user.name} ], "password":password}, function (err, member) {
        if(member){
            plugins.callMethod("apikeySuccessful", {req:req, res:res, next:next, data:{username:member.username}});
            res.status(200).send(member.api_key);
        }
		else{
            plugins.callMethod("apikeyFailed", {req:req, res:res, next:next, data:{username:user.name}});
            unauthorized(res);
        }
    });
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
                res.render('mobile/login', { "message":"login.result", "csrf":req.csrfToken() });
            }
        });
    } else {
        res.render('mobile/login', { "message":"login.result", "csrf":req.csrfToken() });
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
        sharp(target_path)
        .resize(72, 72)
        .embed()
        .toFile(target_path, function(err) {});

        res.send(countlyConfig.path+"/appimages/" + req.body.app_image_id + ".png");
    });
});

app.post(countlyConfig.path+'/user/settings', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.username && req.body.api_key) {
        updatedUser.username = req.body["username"];
        updatedUser.api_key = req.body["api_key"];
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

app.post(countlyConfig.path+'/user/settings/lang', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.username && req.body.lang) {
        updatedUser.lang = req.body.lang;

        countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
            if ((member && member._id != req.session.uid) || err) {
                res.send("username-exists");
            } else {
                countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid)}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                    if (member && !err) {
                        res.send(true);
                    } else {
                        res.send(false);
                    }
                });
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