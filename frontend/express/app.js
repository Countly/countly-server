// Set process name
process.title = "countly: dashboard node " + process.argv[1];

var versionInfo = require('./version.info'),
    COUNTLY_VERSION = versionInfo.version,
    COUNTLY_TYPE = versionInfo.type,
    COUNTLY_PAGE = versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null,
    COUNTLY_NAME = versionInfo.title = versionInfo.title || "Countly",
    express = require('express'),
    SkinStore = require('connect-mongoskin'),
    expose = require('./libs/express-expose.js'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    jimp = require('jimp'),
    request = require('request'),
    flash = require('connect-flash'),
    cookieParser = require('cookie-parser'),
    formidable = require('formidable'),
    session = require('express-session'),
    methodOverride = require('method-override'),
    csrf = require('csurf')(),
    errorhandler = require('errorhandler'),
    basicAuth = require('basic-auth'),
    bodyParser = require('body-parser'),
    _ = require('underscore'),
    countlyMail = require('../../api/parts/mgmt/mail.js'),
    countlyStats = require('../../api/parts/data/stats.js'),
    countlyFs = require('../../api/utils/countlyFs.js'),
    common = require('../../api/utils/common.js'),
    bruteforce = require('./libs/preventBruteforce.js'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./config', 'dont-enclose'),
    log = require('../../api/utils/log.js')('core:app'),
    ip = require('../../api/parts/mgmt/ip.js'),
    url = require('url'),
    authorize = require('../../api/utils/authorizer.js'), //for token validations
    render = require('../../api/utils/render.js'),
    argon2 = require('argon2');


var COUNTLY_NAMED_TYPE = "Countly Community Edition v" + COUNTLY_VERSION;
var COUNTLY_TYPE_CE = true;
var COUNTLY_TRIAL = (versionInfo.trial) ? true : false;
var COUNTLY_TRACK_TYPE = "OSS";
if (versionInfo.footer) {
    COUNTLY_NAMED_TYPE = versionInfo.footer;
    COUNTLY_TYPE_CE = false;
    if (COUNTLY_NAMED_TYPE === "Countly Cloud") {
        COUNTLY_TRACK_TYPE = "Cloud";
    }
    else if (COUNTLY_TYPE !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
        COUNTLY_TRACK_TYPE = "Enterprise";
    }
}
else if (COUNTLY_TYPE !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
    COUNTLY_NAMED_TYPE = "Countly Enterprise Edition v" + COUNTLY_VERSION;
    COUNTLY_TYPE_CE = false;
    COUNTLY_TRACK_TYPE = "Enterprise";
}

plugins.setConfigs("frontend", {
    production: true,
    theme: "",
    session_timeout: 30,
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

plugins.setConfigs("security", {
    login_tries: 3,
    login_wait: 5 * 60,
    password_min: 8,
    password_char: true,
    password_number: true,
    password_symbol: true,
    password_expiration: 0,
    password_rotation: 3,
    dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains\nX-Content-Type-Options: nosniff",
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block"
});

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    if (log && log.e) {
        log.e('Logging caught exception');
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled rejection at: Promise ", p, " reason: ", reason);
    if (log && log.e) {
        log.e("Logging unhandled rejection");
    }
});

var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));

/**
* Check remote configuration
**/
function recheckConfigs() {
    var checkUrl = "https://count.ly/configurations/ce/tracking";
    if (COUNTLY_TYPE !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
        checkUrl = "https://count.ly/configurations/ee/tracking";
    }
    request(checkUrl, function(error, response, body) {
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            }
            catch (ex) {
                body = null;
            }
        }
        if (body) {
            if (countlyConfigOrig.web.use_intercom && typeof body.intercom !== "undefined") {
                countlyConfig.web.use_intercom = body.intercom;
            }
            if (typeof countlyConfigOrig.web.track === "undefined" && typeof body.stats !== "undefined") {
                if (body.stats) {
                    countlyConfig.web.track = null;
                }
                else {
                    countlyConfig.web.track = "none";
                }
            }
        }
    });
}
recheckConfigs();

var countlyDb = plugins.dbConnection(countlyConfig);

/**
* Create sha1 hash string
* @param {string} str - string to hash
* @param {boolean} addSalt - should salt be added
* @returns {string} hashed string
**/
function sha1Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

/**
* Create sha512 hash string
* @param {string} str - string to hash
* @param {boolean} addSalt - should salt be added
* @returns {string} hashed string
**/
function sha512Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha512', salt + "").update(str + "").digest('hex');
}

/**
* Create argon2 hash string
* @param {string} str - string to hash
* @returns {promise} hash promise
**/
function argon2Hash(str) {
    return argon2.hash(str);
}

/**
* Verify argon2 hash string
* @param {string} hashedStr - argon2 hashed string
* @param {string} str - string for verify
* @returns {promise} verify promise
**/
function verifyArgon2Hash(hashedStr, str) {
    return argon2.verify(hashedStr, str);
}

/**
 * Is hashed string argon2?
 * @param {string} hashedStr | argon2 hashed string
 * @returns {boolean} return true if string hashed by argon2
 */
function isArgon2Hash(hashedStr) {
    return hashedStr.includes("$argon2");
}

/**
* Create md5 hash string
* @param {string} str - string to hash
* @returns {string} hashed string
**/
function md5Hash(str) {
    return crypto.createHash('md5').update(str + "").digest('hex');
}

/**
 * Verify member for Argon2 Hash
 * @param {string} username | User name
 * @param {password} password | Password string
 * @param {Function} callback | Callback function
 */
function verifyMemberArgon2Hash(username, password, callback) {
    countlyDb.collection('members').findOne({$and: [{ $or: [ {"username": username}, {"email": username}]}]}, (err, member) => {
        if (member) {
            if (isArgon2Hash(member.password)) {
                verifyArgon2Hash(member.password, password).then(match => {
                    if (match) {
                        callback(undefined, member);
                    }
                    else {
                        callback("Password is wrong!");
                    }
                });
            }
            else {
                var password_SHA1 = sha1Hash(password);
                var password_SHA5 = sha512Hash(password);

                if (member.password === password_SHA1 || member.password === password_SHA5) {
                    argon2Hash(password).then(password_ARGON2 => {
                        updateUserPasswordToArgon2(member._id, password_ARGON2);
                        callback(undefined, member);
                    });
                }
                else {
                    callback("Password is wrong!");
                }
            }
        }
        else {
            callback("Username is wrong!");
        }
    });
}

/**
* Update user password to new sha512 hash
* @param {string} id - id of the user document
* @param {string} password - password to hash
**/
function updateUserPasswordToArgon2(id, password) {
    countlyDb.collection('members').update({ _id: id}, { $set: { password: password}});
}

/**
* Check if user is global admin
* @param {object} req - request object
* @returns {boolean} true if global admin
**/
function isGlobalAdmin(req) {
    return (req.session.gadm);
}

/**
* Sort array by list of
* @param {array} arrayToSort - array to sort
* @param {array} sortList - list of values by which to sort
* @returns {array} sorted array
**/
function sortBy(arrayToSort, sortList) {
    if (!sortList.length) {
        return arrayToSort;
    }

    var tmpArr = [],
        retArr = [];

    for (let i = 0; i < arrayToSort.length; i++) {
        var objId = arrayToSort[i]._id + "";
        if (sortList.indexOf(objId) !== -1) {
            tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
        }
    }

    for (let i = 0; i < tmpArr.length; i++) {
        if (tmpArr[i]) {
            retArr[retArr.length] = tmpArr[i];
        }
    }

    for (let i = 0; i < arrayToSort.length; i++) {
        if (retArr.indexOf(arrayToSort[i]) === -1) {
            retArr[retArr.length] = arrayToSort[i];
        }
    }

    return retArr;
}

var app = express();
app = expose(app);
app.enable('trust proxy');
app.set('x-powered-by', false);

var loadedThemes = {};
var curTheme;

/**
* Load theme files
* @param {string} theme - theme name
* @param {function} callback - when loading files done
**/
app.loadThemeFiles = function(theme, callback) {
    if (!loadedThemes[theme]) {
        var tempThemeFiles = {css: [], js: []};
        if (theme && theme.length) {
            var themeDir = path.resolve(__dirname, "public/themes/" + theme + "/");
            fs.readdir(themeDir, function(err, list) {
                if (err) {
                    if (callback) {
                        callback(tempThemeFiles);
                    }
                    return ;
                }
                var ext;
                for (var i = 0; i < list.length; i++) {
                    ext = list[i].split(".").pop();
                    if (!tempThemeFiles[ext]) {
                        tempThemeFiles[ext] = [];
                    }
                    tempThemeFiles[ext].push(countlyConfig.path + '/themes/' + theme + "/" + list[i]);
                }
                if (callback) {
                    callback(tempThemeFiles);
                }
                loadedThemes[theme] = tempThemeFiles;
            });
        }
        else if (callback) {
            callback(tempThemeFiles);
        }
    }
    else if (callback) {
        callback(loadedThemes[theme]);
    }
};

plugins.loadConfigs(countlyDb, function() {
    curTheme = plugins.getConfig("frontend").theme;
    app.loadThemeFiles(plugins.getConfig("frontend").theme);
    app.dashboard_headers = plugins.getConfig("security").dashboard_additional_headers;
});

app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('view options', {layout: false});

app.use('/stylesheets/ionicons/fonts/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/fonts/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/**
* Add headers to request
* @param {object} req - request object
* @param {object} res - response object
**/
function add_headers(req, res) {
    if (countlyConfig.web.secure_cookies) {
        //we can't detect if it uses https behind nginx, without specific nginx configuration, so we assume it does
        req.headers["x-forwarded-proto"] = "https";
    }
    //set provided in configuration headers
    if (app.dashboard_headers) {
        var headers = app.dashboard_headers.replace(/\r\n|\r|\n/g, "\n").split("\n");
        var parts;
        for (let i = 0; i < headers.length; i++) {
            if (headers[i] && headers[i].length) {
                parts = headers[i].split(/:(.+)?/);
                if (parts.length === 3) {
                    res.header(parts[0], parts[1]);
                }
            }
        }
    }
}

app.use(function(req, res, next) {
    add_headers(req, res);
    next();
});

plugins.loadAppStatic(app, countlyDb, express);
app.use(cookieParser());
//server theme images
app.use(function(req, res, next) {
    if (req.url.indexOf(countlyConfig.path + '/images/') === 0) {
        var urlPath = req.url.replace(countlyConfig.path, "");
        var theme = req.cookies.theme || curTheme;
        if (theme && theme.length) {
            fs.exists(__dirname + '/public/themes/' + theme + urlPath, function(exists) {
                if (exists) {
                    res.sendFile(__dirname + '/public/themes/' + theme + urlPath);
                }
                else {
                    next();
                }
            });
        }
        else { //serve default location
            next();
        }
    }
    else {
        next();
    }
});
//serve app images
app.get(countlyConfig.path + '/appimages/*', function(req, res) {
    countlyFs.getStats("appimages", __dirname + '/public/' + req.path, {id: req.params[0]}, function(err, stats) {
        if (err || !stats || !stats.size) {
            res.sendFile(__dirname + '/public/images/default_app_icon.png');
        }
        else {
            countlyFs.getStream("appimages", __dirname + '/public/' + req.path, {id: req.params[0]}, function(err2, stream) {
                if (err2 || !stream) {
                    res.sendFile(__dirname + '/public/images/default_app_icon.png');
                }
                else {
                    res.writeHead(200, {
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'public, max-age=31536000',
                        'Connection': 'keep-alive',
                        'Date': new Date().toUTCString(),
                        'Last-Modified': stats.mtime.toUTCString(),
                        'Server': 'nginx/1.10.3 (Ubuntu)',
                        'Content-Type': 'image/png',
                        'Content-Length': stats.size
                    });
                    stream.pipe(res);
                }
            });
        }
    });
});
var oneYear = 31557600000;
app.use(countlyConfig.path, express.static(__dirname + '/public', { maxAge: oneYear }));
app.use(session({
    secret: 'countlyss',
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 365, secure: countlyConfig.web.secure_cookies || false },
    store: new SkinStore(countlyDb),
    saveUninitialized: false,
    resave: true,
    rolling: true,
    proxy: true,
    unset: "destroy"
}));
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(function(req, res, next) {
    var contentType = req.headers['content-type'];
    if (req.method.toLowerCase() === 'post' && contentType && contentType.indexOf('multipart/form-data') >= 0) {
        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/uploads';
        form.parse(req, function(err, fields, files) {
            req.files = files;
            if (!req.body) {
                req.body = {};
            }
            for (let i in fields) {
                if (typeof req.body[i] === "undefined") {
                    req.body[i] = fields[i];
                }
            }
            next();
        });
    }
    else {
        next();
    }
});

app.use(flash());
app.use(function(req, res, next) {
    req.template = {};
    req.template.html = "";
    req.template.js = "";
    req.template.css = "";
    req.template.form = "";
    req.countly = {
        version: COUNTLY_VERSION,
        type: COUNTLY_TYPE,
        page: COUNTLY_PAGE,
        title: COUNTLY_NAME,
        favicon: "images/favicon.png"
    };
    plugins.loadConfigs(countlyDb, function() {
        app.dashboard_headers = plugins.getConfig("security").dashboard_additional_headers;
        add_headers(req, res);
        bruteforce.fails = plugins.getConfig("security").login_tries || 3;
        bruteforce.wait = plugins.getConfig("security").login_wait || 5 * 60;

        curTheme = plugins.getConfig("frontend", req.session && req.session.settings).theme;
        app.loadThemeFiles(req.cookies.theme || plugins.getConfig("frontend", req.session && req.session.settings).theme, function(themeFiles) {
            res.locals.flash = req.flash.bind(req);
            req.config = plugins.getConfig("frontend", req.session && req.session.settings);
            req.themeFiles = themeFiles;
            var _render = res.render;
            res.render = function(view, opts, fn, parent, sub) {
                if (!opts.path) {
                    opts.path = countlyConfig.path || "";
                }
                if (!opts.cdn) {
                    opts.cdn = countlyConfig.cdn || "";
                }
                if (!opts.themeFiles) {
                    opts.themeFiles = themeFiles;
                }
                _render.call(res, view, opts, fn, parent, sub);
            };
            next();
        });
    });
});
app.use(methodOverride());
app.use(function(req, res, next) {
    if (!plugins.callMethod("skipCSRF", {req: req, res: res, next: next})) {
        //none of the plugins requested to skip csrf for this request
        csrf(req, res, next);
    }
    else {
        //skipping csrf step, some plugin needs it without csrf
        next();
    }
});

//for csrf error handling. redirect to login if getting bad token while logging in(not show forbidden page)
app.use(function(err, req, res, next) {
    var mylink = req.url.split('?');
    mylink = mylink[0];
    if (err.code === 'EBADCSRFTOKEN' && mylink === countlyConfig.path + "/login") {
        res.status(403);
        res.redirect(countlyConfig.path + '/login?message=login.token-expired');
    }
    else {
        return next(err);
    }
});


//prevent bruteforce attacks
bruteforce.db = countlyDb;
bruteforce.mail = countlyMail;
bruteforce.paths.push(countlyConfig.path + "/login");
bruteforce.paths.push(countlyConfig.path + "/mobile/login");
app.use(bruteforce.defaultPrevent);

plugins.loadAppPlugins(app, countlyDb, express);

var env = process.env.NODE_ENV || 'development';
if ('development' === env) {
    app.use(errorhandler(true));
}

app.get(countlyConfig.path + '/', function(req, res) {
    res.redirect(countlyConfig.path + '/login');
});

var getSessionTimeoutInMs = function(req) {
    var myTimeoutValue = parseInt(plugins.getConfig("frontend", req.session && req.session.settings).session_timeout) * 1000 * 60;
    //max value used by set timeout function
    if (myTimeoutValue > 2147483647) {
        myTimeoutValue = 1800000;
    }//30 minutes
    return myTimeoutValue;
};
var extendSession = function(req) {
    req.session.expires = Date.now() + getSessionTimeoutInMs(req);
    if (req.session.auth_token) {
        var ChangeTime = getSessionTimeoutInMs(req);
        if (ChangeTime > 0) {
            authorize.extend_token({token: req.session.auth_token, db: countlyDb, extendTill: Date.now() + ChangeTime}, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
        else { //changed to not expire
            authorize.extend_token({token: req.session.auth_token, db: countlyDb, extendBy: 0}, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
};
var checkRequestForSession = function(req, res, next) {
    if (parseInt(plugins.getConfig("frontend", req.session && req.session.settings).session_timeout)) {
        if (req.session.uid) {
            if (Date.now() > req.session.expires) {
                //logout user
                res.redirect(countlyConfig.path + '/logout?message=logout.inactivity');
            }
            else {
                //extend session
                extendSession(req, res, next);
                next();
            }
        }
        else {
            next();
        }
    }
    else {
        next();
    }
};

app.get(countlyConfig.path + '/ping', function(req, res) {
    countlyDb.collection("plugins").findOne({_id: "plugins"}, function(err) {
        if (err) {
            res.status(404).send("DB Error");
        }
        else {
            res.send("Success");
        }
    });
});

app.get(countlyConfig.path + '/configs', function(req, res) {
    recheckConfigs();
    res.send("Success");
});

app.get(countlyConfig.path + '/session', function(req, res, next) {
    if (req.session.uid) {
        if (Date.now() > req.session.expires) {
            //logout user
            res.send("logout");
        }
        else {
            //extend session
            if (req.query.check_session) {
                res.send("success");
            }
            else {
                extendSession(req, res, next);
                res.send("success");
            }
        }
    }
    else {
        res.send("login");
    }
});
app.get(countlyConfig.path + '/dashboard', checkRequestForSession);
app.post('*', checkRequestForSession);


app.get(countlyConfig.path + '/logout', function(req, res, next) {
    if (req.session) {
        if (req.session.uid && req.session.email) {
            plugins.callMethod("userLogout", {req: req, res: res, next: next, data: {uid: req.session.uid, email: req.session.email, query: req.query}});
        }
        req.session.uid = null;
        req.session.gadm = null;
        req.session.email = null;

        if (req.session.auth_token) {
            countlyDb.collection("auth_tokens").remove({_id: req.session.auth_token});
            req.session.auth_token = null;
        }
        req.session.settings = null;
        res.clearCookie('uid');
        res.clearCookie('gadm');
        req.session.destroy(function() {
        });
    }
    if (req.query.message) {
        res.redirect(countlyConfig.path + '/login?message=' + req.query.message);
    }
    else {
        res.redirect(countlyConfig.path + '/login');
    }
});

/**
* Render dashboard
* @param {object} req - request object
* @param {object} res - response object
* @param {function} next - callback for next middleware
* @param {object} member - dashboard member document
* @param {array} adminOfApps - list of apps member is admin of
* @param {array} userOfApps - list of apps member is user of
* @param {object} countlyGlobalApps - all apps user has any access to, where key is app id and value is app document
* @param {object} countlyGlobalAdminApps - all apps user has write access to, where key is app id and value is app document
**/
function renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps) {
    var configs = plugins.getConfig("frontend", member.settings);
    configs.export_limit = plugins.getConfig("api").export_limit;
    app.loadThemeFiles(configs.theme, function(theme) {
        res.cookie("theme", configs.theme);
        req.session.uid = member._id;
        req.session.gadm = (member.global_admin === true);
        req.session.email = member.email;
        req.session.settings = member.settings;
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.header('Expires', '0');
        res.header('Pragma', 'no-cache');
        if (member.upgrade) {
            countlyDb.collection('members').update({"_id": member._id}, {$unset: {upgrade: ""}}, function() {});
        }

        member._id += "";
        delete member.password;

        adminOfApps = sortBy(adminOfApps, member.appSortList || []);
        userOfApps = sortBy(userOfApps, member.appSortList || []);

        var defaultApp = userOfApps[0];
        _.extend(req.config, configs);
        var countlyGlobal = {
            countlyTitle: req.countly.title,
            countlyVersion: req.countly.version,
            countlyFavicon: req.countly.favicon,
            pluginsSHA: sha1Hash(plugins.getPlugins()),
            apps: countlyGlobalApps,
            defaultApp: defaultApp,
            admin_apps: countlyGlobalAdminApps,
            csrf_token: req.csrfToken(),
            auth_token: req.session.auth_token,
            member: member,
            config: req.config,
            security: plugins.getConfig("security"),
            plugins: plugins.getPlugins(),
            path: countlyConfig.path || "",
            cdn: countlyConfig.cdn || "",
            message: req.flash("message")
        };

        var toDashboard = {
            countlyTitle: req.countly.title,
            countlyFavicon: req.countly.favicon,
            adminOfApps: adminOfApps,
            userOfApps: userOfApps,
            defaultApp: defaultApp,
            member: member,
            intercom: countlyConfig.web.use_intercom,
            track: countlyConfig.web.track || false,
            installed: req.session.install || false,
            cpus: require('os').cpus().length,
            countlyVersion: req.countly.version,
            countlyType: COUNTLY_TYPE_CE,
            countlyTrial: COUNTLY_TRIAL,
            countlyTypeName: COUNTLY_NAMED_TYPE,
            countlyTypeTrack: COUNTLY_TRACK_TYPE,
            production: configs.production || false,
            pluginsSHA: sha1Hash(plugins.getPlugins()),
            plugins: plugins.getPlugins(),
            config: req.config,
            path: countlyConfig.path || "",
            cdn: countlyConfig.cdn || "",
            use_google: configs.use_google || false,
            themeFiles: theme,
            inject_template: req.template,
            javascripts: []
        };

        var plgns = [].concat(plugins.getPlugins());
        if (plgns.indexOf('push') !== -1) {
            plgns.splice(plgns.indexOf('push'), 1);
            plgns.unshift('push');
        }
        plgns.forEach(plugin => {
            try {
                let contents = fs.readdirSync(__dirname + `/../../plugins/${plugin}/frontend/public/javascripts`) || [];
                toDashboard.javascripts.push.apply(toDashboard.javascripts, contents.filter(n => n.indexOf('.js') === n.length - 3).map(n => `${plugin}/javascripts/${n}`));
            }
            catch (e) {
                console.log('Error while reading folder of plugin %s: %j', plugin, e.stack);
            }
        });

        if (req.session.install) {
            req.session.install = null;
            res.clearCookie('install');
        }
        plugins.callMethod("renderDashboard", {req: req, res: res, next: next, data: {member: member, adminApps: countlyGlobalAdminApps, userApps: countlyGlobalApps, countlyGlobal: countlyGlobal, toDashboard: toDashboard}});

        res.expose(countlyGlobal, 'countlyGlobal');

        res.render('dashboard', toDashboard);
    });
}

app.get(countlyConfig.path + '/dashboard', function(req, res, next) {
    if (!req.session.uid) {
        res.redirect(countlyConfig.path + '/login');
    }
    else {
        countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member) {
            if (member) {
                var adminOfApps = [],
                    userOfApps = [],
                    countlyGlobalApps = {},
                    countlyGlobalAdminApps = {};

                if (member.global_admin) {
                    countlyDb.collection('apps').find({}).toArray(function(err2, apps) {
                        adminOfApps = apps;
                        userOfApps = apps;

                        countlyDb.collection('graph_notes').find().toArray(function(err3, notes) {
                            var appNotes = [];
                            for (let i = 0; i < notes.length; i++) {
                                appNotes[notes[i]._id] = notes[i].notes;
                            }

                            for (let i = 0; i < apps.length; i++) {
                                apps[i].type = apps[i].type || "mobile";
                                apps[i].notes = appNotes[apps[i]._id] || null;
                                countlyGlobalApps[apps[i]._id] = apps[i];
                                countlyGlobalApps[apps[i]._id]._id = "" + apps[i]._id;
                            }

                            countlyGlobalAdminApps = countlyGlobalApps;
                            renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps);
                        });
                    });
                }
                else {
                    var adminOfAppIds = [],
                        userOfAppIds = [];

                    if (member.admin_of.length === 1 && member.admin_of[0] === "") {
                        member.admin_of = [];
                    }

                    for (let i = 0; i < member.admin_of.length; i++) {
                        if (member.admin_of[i] === "") {
                            continue;
                        }

                        adminOfAppIds[adminOfAppIds.length] = countlyDb.ObjectID(member.admin_of[i]);
                    }

                    for (let i = 0; i < member.user_of.length; i++) {
                        if (member.user_of[i] === "") {
                            continue;
                        }

                        userOfAppIds[userOfAppIds.length] = countlyDb.ObjectID(member.user_of[i]);
                    }

                    countlyDb.collection('apps').find({ _id: { '$in': adminOfAppIds } }).toArray(function(err2, admin_of) {

                        for (let i = 0; i < admin_of.length; i++) {
                            countlyGlobalAdminApps[admin_of[i]._id] = admin_of[i];
                            countlyGlobalAdminApps[admin_of[i]._id]._id = "" + admin_of[i]._id;
                        }

                        countlyDb.collection('apps').find({ _id: { '$in': userOfAppIds } }).toArray(function(err3, user_of) {
                            adminOfApps = admin_of;
                            userOfApps = user_of;

                            countlyDb.collection('graph_notes').find({ _id: { '$in': userOfAppIds } }).toArray(function(err4, notes) {
                                var appNotes = [];
                                for (let i = 0; i < notes.length; i++) {
                                    appNotes[notes[i]._id] = notes[i].notes;
                                }

                                for (let i = 0; i < user_of.length; i++) {
                                    if (user_of[i].apn) {
                                        user_of[i].apn.forEach(a => a._id = '' + a._id);
                                    }
                                    if (user_of[i].gcm) {
                                        user_of[i].gcm.forEach(a => a._id = '' + a._id);
                                    }
                                    user_of[i].notes = appNotes[user_of[i]._id] || null;
                                    countlyGlobalApps[user_of[i]._id] = user_of[i];
                                    countlyGlobalApps[user_of[i]._id]._id = "" + user_of[i]._id;
                                    countlyGlobalApps[user_of[i]._id].type = countlyGlobalApps[user_of[i]._id].type || "mobile";
                                }

                                renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps);
                            });
                        });
                    });
                }
            }
            else {
                if (req.session) {
                    req.session.uid = null;
                    req.session.gadm = null;
                    req.session.email = null;
                    req.session.settings = null;
                    res.clearCookie('uid');
                    res.clearCookie('gadm');
                    req.session.destroy(function() {});
                }
                res.redirect(countlyConfig.path + '/login');
            }
        });
    }
});

app.get(countlyConfig.path + '/setup', function(req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '0');
    res.header('Pragma', 'no-cache');
    countlyDb.collection('members').count({}, function(err, memberCount) {
        if (!err && memberCount === 0) {
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.header('Expires', '0');
            res.header('Pragma', 'no-cache');
            res.render('setup', {countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "csrf": req.csrfToken(), path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template});
        }
        else if (err) {
            res.status(500).send('Server Error');
        }
        else {
            res.redirect(countlyConfig.path + '/login');
        }
    });
});

app.get(countlyConfig.path + '/login', function(req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '0');
    res.header('Pragma', 'no-cache');
    if (req.session.uid) {
        res.redirect(countlyConfig.path + '/dashboard');
    }
    else {
        countlyDb.collection('members').count({}, function(err, memberCount) {
            if (memberCount) {
                if (req.query.message) {
                    req.flash('info', req.query.message);
                }
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.header('Expires', '0');
                res.header('Pragma', 'no-cache');
                res.render('login', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "message": req.flash('info'), "csrf": req.csrfToken(), path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template });
            }
            else {
                res.redirect(countlyConfig.path + '/setup');
            }
        });
    }
});

app.get(countlyConfig.path + '/forgot', function(req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '0');
    res.header('Pragma', 'no-cache');
    if (req.session.uid) {
        res.redirect(countlyConfig.path + '/dashboard');
    }
    else {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.header('Expires', '0');
        res.header('Pragma', 'no-cache');
        res.render('forgot', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "csrf": req.csrfToken(), "message": req.flash('info'), path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template});
    }
});

app.get(countlyConfig.path + '/reset/:prid', function(req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '0');
    res.header('Pragma', 'no-cache');
    if (req.params.prid) {
        req.params.prid += "";
        countlyDb.collection('password_reset').findOne({prid: req.params.prid}, function(err, passwordReset) {
            var timestamp = Math.round(new Date().getTime() / 1000);

            if (passwordReset && !err) {
                if (timestamp > (passwordReset.timestamp + 600)) {
                    req.flash('info', 'reset.invalid');
                    res.redirect(countlyConfig.path + '/forgot');
                }
                else {
                    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                    res.header('Expires', '0');
                    res.header('Pragma', 'no-cache');
                    res.render('reset', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "csrf": req.csrfToken(), "prid": req.params.prid, "message": "", path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template });
                }
            }
            else {
                req.flash('info', 'reset.invalid');
                res.redirect(countlyConfig.path + '/forgot');
            }
        });
    }
    else {
        req.flash('info', 'reset.invalid');
        res.redirect(countlyConfig.path + '/forgot');
    }
});

app.post(countlyConfig.path + '/reset', function(req, res, next) {
    var result = validatePassword(req.body.password);

    if (result === false) {
        if (req.body.password && req.body.again && req.body.prid) {
            req.body.prid += "";

            argon2Hash(req.body.password).then(password => {
                countlyDb.collection('password_reset').findOne({ prid: req.body.prid }, function(err, passwordReset) {
                    countlyDb.collection('members').findAndModify({ _id: passwordReset.user_id }, {}, { '$set': { "password": password } }, function(err2, member) {
                        member = member && member.ok ? member.value : null;
                        plugins.callMethod("passwordReset", { req: req, res: res, next: next, data: member });
                        req.flash('info', 'reset.result');
                        res.redirect(countlyConfig.path + '/login');
                    });

                    countlyDb.collection('password_reset').remove({ prid: req.body.prid }, function() { });
                });
            });
        }
        else {
            res.render('reset', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "csrf": req.csrfToken(), "prid": req.body.prid, "message": "", path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template });
        }
    }
    else {
        res.render('reset',
            {
                countlyFavicon: req.countly.favicon,
                countlyTitle: req.countly.title,
                countlyPage: req.countly.page,
                "csrf": req.csrfToken(),
                "prid": req.body.prid,
                path: countlyConfig.path || "",
                cdn: countlyConfig.cdn || "",
                themeFiles: req.themeFiles,
                inject_template: req.template,
                message: result,
                password_min: plugins.getConfig("security").password_min
            });
    }
});

app.post(countlyConfig.path + '/forgot', function(req, res, next) {
    if (req.body.email) {
        req.body.email = (req.body.email + "").trim();
        countlyDb.collection('members').findOne({"email": req.body.email}, function(err, member) {
            if (member) {
                var timestamp = Math.round(new Date().getTime() / 1000),
                    prid = sha512Hash(member.username + member.full_name, timestamp);
                member.lang = member.lang || req.body.lang || "en";
                countlyDb.collection('password_reset').insert({"prid": prid, "user_id": member._id, "timestamp": timestamp}, {safe: true}, function() {
                    countlyMail.sendPasswordResetInfo(member, prid);
                    plugins.callMethod("passwordRequest", {req: req, res: res, next: next, data: req.body});
                    res.render('forgot', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "message": "forgot.result", "csrf": req.csrfToken(), path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template});
                });
            }
            else {
                res.render('forgot', { countlyFavicon: req.countly.favicon, countlyTitle: req.countly.title, countlyPage: req.countly.page, "message": "forgot.result", "csrf": req.csrfToken(), path: countlyConfig.path || "", cdn: countlyConfig.cdn || "", themeFiles: req.themeFiles, inject_template: req.template});
            }
        });
    }
    else {
        res.redirect(countlyConfig.path + '/forgot');
    }
});

app.post(countlyConfig.path + '/setup', function(req, res, next) {
    countlyDb.collection('members').count({}, function(err, memberCount) {
        if (!err && memberCount === 0) {
            if (req.body.full_name && req.body.username && req.body.password && req.body.email) {
                argon2Hash(req.body.password).then(password => {
                    req.body.email = (req.body.email + "").trim();
                    req.body.username = (req.body.username + "").trim();
                    var doc = {"full_name": req.body.full_name, "username": req.body.username, "password": password, "email": req.body.email, "global_admin": true, created_at: Math.floor(((new Date()).getTime()) / 1000), password_changed: Math.floor(((new Date()).getTime()) / 1000)};
                    if (req.body.lang) {
                        doc.lang = req.body.lang;
                    }
                    countlyDb.collection('members').insert(doc, {safe: true}, function(err2, member) {
                        member = member.ops;
                        if (countlyConfig.web.use_intercom) {
                            var options = {uri: "https://try.count.ly/s", method: "POST", timeout: 4E3, json: {email: req.body.email, full_name: req.body.full_name, v: COUNTLY_VERSION, t: COUNTLY_TYPE}};
                            request(options, function(a, c, b) {
                                a = {};
                                a.api_key = md5Hash(member[0]._id + (new Date).getTime());
                                b && (b.in_user_id && (a.in_user_id = b.in_user_id), b.in_user_hash && (a.in_user_hash = b.in_user_hash));

                                countlyDb.collection("members").update({_id: member[0]._id}, {$set: a}, function() {
                                    plugins.callMethod("setup", {req: req, res: res, next: next, data: member[0]});
                                    req.session.uid = member[0]._id;
                                    req.session.gadm = !0;
                                    req.session.email = member[0].email;
                                    req.session.install = true;
                                    authorize.save({
                                        db: countlyDb,
                                        multi: true,
                                        owner: req.session.uid,
                                        purpose: "LoggedInAuth",
                                        ttl: getSessionTimeoutInMs(req),
                                        callback: function(err3, token) {
                                            if (err3) {
                                                console.log(err3);
                                            }
                                            if (token) {
                                                req.session.auth_token = token;
                                            }
                                            res.redirect(countlyConfig.path + '/dashboard');
                                        }
                                    });
                                });
                            });
                        }
                        else {
                            var a = {};
                            a.api_key = md5Hash(member[0]._id + (new Date).getTime());

                            countlyDb.collection("members").update({_id: member[0]._id}, {$set: a}, function() {
                                req.session.uid = member[0]._id;
                                req.session.gadm = !0;
                                req.session.email = member[0].email;
                                req.session.install = true;

                                authorize.save({
                                    db: countlyDb,
                                    multi: true,
                                    owner: req.session.uid,
                                    purpose: "LoggedInAuth",
                                    ttl: getSessionTimeoutInMs(req),
                                    callback: function(err3, token) {
                                        if (err3) {
                                            console.log(err3);
                                        }
                                        if (token) {
                                            req.session.auth_token = token;
                                        }
                                        res.redirect(countlyConfig.path + '/dashboard');
                                    }
                                });
                            });
                        }
                    });
                });
            }
            else {
                res.redirect(countlyConfig.path + '/setup');
            }
        }
        else if (err) {
            res.status(500).send('Server Error');
        }
        else {
            res.redirect(countlyConfig.path + '/login');
        }
    });
});

app.post(countlyConfig.path + '/login', function(req, res, next) {
    if (req.body.username && req.body.password) {
        req.body.username = (req.body.username + "").trim();
        verifyMemberArgon2Hash(req.body.username, req.body.password, (err, member) => {
            if (member) {
                if (member.locked) {
                    plugins.callMethod("loginFailed", {req: req, res: res, next: next, data: req.body});
                    res.redirect(countlyConfig.path + '/login?message=login.locked');
                }
                else {
                    plugins.callMethod("loginSuccessful", {req: req, res: res, next: next, data: member});
                    if (countlyConfig.web.use_intercom && member.global_admin) {
                        countlyStats.getOverall(countlyDb, function(statsObj) {
                            request({
                                uri: "https://try.count.ly/s",
                                method: "POST",
                                timeout: 4E3,
                                json: {
                                    email: member.email,
                                    full_name: member.full_name,
                                    v: COUNTLY_VERSION,
                                    t: COUNTLY_TYPE,
                                    u: statsObj["total-users"],
                                    e: statsObj["total-events"],
                                    a: statsObj["total-apps"],
                                    m: statsObj["total-msg-users"],
                                    mc: statsObj["total-msg-created"],
                                    ms: statsObj["total-msg-sent"]
                                }
                            }, function(a, c, b) {
                                a = {};
                                if (b) {
                                    if (b.in_user_id && b.in_user_id !== member.in_user_id) {
                                        a.in_user_id = b.in_user_id;
                                    }
                                    if (b.in_user_hash && b.in_user_hash !== member.in_user_hash) {
                                        a.in_user_hash = b.in_user_hash;
                                    }
                                }
                                Object.keys(a).length && countlyDb.collection("members").update({_id: member._id}, {$set: a}, function() {});
                            });
                        });
                    }
                    if (!countlyConfig.web.track || countlyConfig.web.track === "GA" && member.global_admin || countlyConfig.web.track === "noneGA" && !member.global_admin) {
                        countlyStats.getUser(countlyDb, member, function(statsObj) {
                            var custom = {
                                apps: (member.user_of) ? member.user_of.length : 0,
                                platforms: {"$addToSet": statsObj["total-platforms"]},
                                events: statsObj["total-events"],
                                pushes: statsObj["total-msg-sent"],
                                crashes: statsObj["total-crash-groups"],
                                users: statsObj["total-users"]
                            };
                            var date = new Date();
                            request({
                                uri: "https://stats.count.ly/i",
                                method: "GET",
                                timeout: 4E3,
                                qs: {
                                    device_id: member.email,
                                    app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
                                    timestamp: Math.round(date.getTime() / 1000),
                                    hour: date.getHours(),
                                    dow: date.getDay(),
                                    user_details: JSON.stringify(
                                        {
                                            custom: custom
                                        }
                                    )
                                }
                            }, function() {});
                        });
                    }
                    req.session.regenerate(function() {
                        // will have a new session here
                        req.session.uid = member._id;
                        req.session.gadm = (member.global_admin === true);
                        req.session.email = member.email;
                        req.session.settings = member.settings;

                        var update = {last_login: Math.round(new Date().getTime() / 1000)};
                        if (typeof member.password_changed === "undefined") {
                            update.password_changed = Math.round(new Date().getTime() / 1000);
                        }
                        if (req.body.lang && req.body.lang !== member.lang) {
                            update.lang = req.body.lang;
                        }
                        if (Object.keys(update).length) {
                            countlyDb.collection('members').update({_id: member._id}, {$set: update}, function() {});
                        }
                        if (parseInt(plugins.getConfig("frontend", member.settings).session_timeout)) {
                            req.session.expires = Date.now() + parseInt(plugins.getConfig("frontend", member.settings).session_timeout) * 1000 * 60;
                        }
                        if (member.upgrade) {
                            res.set({
                                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
                                'Expires': '0',
                                'Pragma': 'no-cache'
                            });
                        }
                        //create token
                        authorize.save({
                            db: countlyDb,
                            multi: true,
                            owner: req.session.uid,
                            ttl: getSessionTimeoutInMs(req),
                            purpose: "LoggedInAuth",
                            callback: function(err2, token) {

                                if (err2) {
                                    console.log(err2);
                                }
                                if (token) {
                                    req.session.auth_token = token;
                                }
                                res.redirect(countlyConfig.path + '/dashboard');
                                bruteforce.reset(req.body.username);

                            }
                        });


                    });
                }
            }
            else {
                plugins.callMethod("loginFailed", {req: req, res: res, next: next, data: req.body});
                bruteforce.fail(req.body.username);
                res.redirect(countlyConfig.path + '/login?message=login.result');
            }
        });
    }
    else {
        res.redirect(countlyConfig.path + '/login?message=login.result');
    }
});

app.get(countlyConfig.path + '/api-key', function(req, res, next) {
    /**
    * Handles unauthorized access attempt
    * @param {object} response - response object
    * @returns {void} void
    **/
    function unauthorized(response) {
        response.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return response.status(401).send("-1");
    }
    var user = basicAuth(req);
    if (user && user.name && user.pass) {
        bruteforce.isBlocked(user.name, function(isBlocked, fails, err) {
            if (isBlocked) {
                if (err) {
                    res.status(500).send('Server Error');
                }
                else {
                    unauthorized(res);
                }
            }
            else {
                user.name = (user.name + "").trim();
                verifyMemberArgon2Hash(user.name, user.pass, (err2, member) => {
                    if (member) {
                        if (member.locked) {
                            plugins.callMethod("apikeyFailed", {req: req, res: res, next: next, data: {username: user.name}});
                            unauthorized(res);
                        }
                        else {
                            plugins.callMethod("apikeySuccessful", {req: req, res: res, next: next, data: {username: member.username}});
                            bruteforce.reset(user.name);
                            countlyDb.collection('members').update({_id: member._id}, {$set: {last_login: Math.round(new Date().getTime() / 1000)}}, function() {});
                            res.status(200).send(member.api_key);
                        }
                    }
                    else {
                        plugins.callMethod("apikeyFailed", {req: req, res: res, next: next, data: {username: user.name}});
                        bruteforce.fail(user.name);
                        unauthorized(res);
                    }
                });
            }
        });
    }
    else {
        plugins.callMethod("apikeyFailed", {req: req, res: res, next: next, data: {username: ""}});
        unauthorized(res);
    }
});

app.get(countlyConfig.path + '/sdks.js', function(req, res) {
    var options = {uri: "http://code.count.ly/js/sdks.js", method: "GET", timeout: 4E3};
    request(options, function(a, c, b) {
        res.set('Content-type', 'application/javascript').status(200).send(b);
    });
});

app.post(countlyConfig.path + '/mobile/login', function(req, res, next) {
    if (req.body.username && req.body.password) {
        req.body.username = (req.body.username + "").trim();

        verifyMemberArgon2Hash(req.body.username, req.body.password, (err, member) => {
            if (member) {
                if (member.locked) {
                    plugins.callMethod("mobileloginFailed", {req: req, res: res, next: next, data: req.body});
                    res.render('mobile/login', { "message": "login.locked", "csrf": req.csrfToken() });
                }
                else {
                    plugins.callMethod("mobileloginSuccessful", {req: req, res: res, next: next, data: member});
                    bruteforce.reset(req.body.username);
                    countlyDb.collection('members').update({_id: member._id}, {$set: {last_login: Math.round(new Date().getTime() / 1000)}}, function() {});
                    res.render('mobile/key', { "key": member.api_key || -1 });
                }
            }
            else {
                plugins.callMethod("mobileloginFailed", {req: req, res: res, next: next, data: req.body});
                bruteforce.fail(req.body.username);
                res.render('mobile/login', { "message": "login.result", "csrf": req.csrfToken() });
            }
        });
    }
    else {
        res.render('mobile/login', { "message": "login.result", "csrf": req.csrfToken() });
    }
});

app.post(countlyConfig.path + '/dashboard/settings', function(req, res) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var newAppOrder = req.body.app_sort_list;

    if (!newAppOrder || newAppOrder.length === 0) {
        res.end();
        return false;
    }

    countlyDb.collection('members').update({_id: countlyDb.ObjectID(req.session.uid)}, {'$set': {'appSortList': newAppOrder}}, {'upsert': true}, function() {
        res.end();
        return false;
    });
});

app.post(countlyConfig.path + '/apps/icon', function(req, res, next) {
    if (!req.files.app_image || !req.body.app_image_id) {
        res.end();
        return true;
    }

    var tmp_path = req.files.app_image.path,
        target_path = __dirname + '/public/appimages/' + req.body.app_image_id + ".png",
        type = req.files.app_image.type;

    if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
        fs.unlink(tmp_path, function() {});
        res.send(false);
        return true;
    }
    plugins.callMethod("iconUpload", {req: req, res: res, next: next, data: req.body});
    try {
        jimp.read(tmp_path, function(err, icon) {
            if (err) {
                console.log(err, err.stack);
            }
            icon.cover(72, 72).getBuffer(jimp.MIME_PNG, function(err2, buffer) {
                countlyFs.saveData("appimages", target_path, buffer, {id: req.body.app_image_id + ".png", writeMode: "overwrite"}, function() {
                    fs.unlink(tmp_path, function() {});
                    res.send(countlyConfig.path + "/appimages/" + req.body.app_image_id + ".png");
                });
            }); // save
        });
    }
    catch (e) {
        console.log(e.stack);
    }
});

/**
* Validate password based on configured settings
* @param {string} password - password to validatePassword
* @returns {vary} returns string if there is error, or false if everything is ok
**/
function validatePassword(password) {
    if (password.length < plugins.getConfig("security").password_min) {
        return "management-users.password.length";
    }
    if (plugins.getConfig("security").password_char && !/[A-Z]/.test(password)) {
        return "management-users.password.has-char";
    }
    if (plugins.getConfig("security").password_number && !/\d/.test(password)) {
        return "management-users.password.has-number";
    }
    if (plugins.getConfig("security").password_symbol && !/[^A-Za-z\d]/.test(password)) {
        return "management-users.password.has-special";
    }
    return false;
}

/**
* Removes all other active sessions for user
* @param {string} userId - id of the user for which to remove sessions
* @param {string} my_token - current auth token
* @param {string} my_session - current session id
**/
function killOtherSessionsForUser(userId, my_token, my_session) {
    countlyDb.collection('sessions_').find({"session": { $regex: userId }}).toArray(function(err, sessions) {
        var delete_us = [];
        for (var i = 0; i < sessions.length; i++) {
            var parsed_data = "";
            try {
                parsed_data = JSON.parse(sessions[i].session);
            }
            catch (error) {
                console.log(error);
            }
            if (sessions[i]._id !== my_session && parsed_data && parsed_data.uid === userId) {
                delete_us.push(sessions[i]._id);
            }
        }
        if (delete_us.length > 0) {
            countlyDb.collection('sessions_').remove({'_id': {$in: delete_us}});
        }
    });
    //delete other auth tokens with purpose:"LoggedInAuth"
    countlyDb.collection('auth_tokens').remove({'owner': countlyDb.ObjectID(userId), 'purpose': "LoggedInAuth", '_id': {$ne: my_token}});
}

app.post(countlyConfig.path + '/user/settings', function(req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};
    if (req.body.username && req.body.api_key) {
        if (req.body.api_key.length !== 32) {
            res.send("user-settings.api-key-length");
            return false;
        }
        req.body.username = (req.body.username + "").trim();
        updatedUser.username = req.body.username;
        updatedUser.api_key = req.body.api_key;
        if (req.body.lang) {
            updatedUser.lang = req.body.lang;
        }
        var change = JSON.parse(JSON.stringify(updatedUser));
        countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member) {
            countlyDb.collection('members').findOne({username: req.body.username}, async function(err2, user) {
                member.change = change;

                if ((user && user._id.toString() !== req.session.uid) || err2) {
                    res.send("username-exists");
                }
                else {
                    if (req.body.old_pwd && req.body.old_pwd.length) {
                        member.change.password = true;
                        var newPassword_SHA5 = sha512Hash(req.body.new_pwd),
                            newPassword_ARGON2 = await argon2Hash(req.body.new_pwd);

                        let isUsedBefore = false;
                        if (plugins.getConfig('security').password_rotation > 0) {
                            // Check if used before
                            const promises = [];
                            const passwordHistory = member.password_history || [];

                            for (let i = 0; i < passwordHistory.length; i++) {
                                const oldPassword = passwordHistory[i];
                                if (isArgon2Hash(oldPassword)) {
                                    promises.push(verifyArgon2Hash(oldPassword, req.body.new_pwd));
                                }
                                else if (oldPassword === newPassword_SHA5) {
                                    isUsedBefore = true;
                                    break;
                                }
                            }

                            if (!isUsedBefore && promises.length > 0) {
                                const promiseResults = await Promise.all(promises);
                                isUsedBefore = promiseResults.some(x => x === true);
                            }
                        }

                        if (req.body.new_pwd !== req.body.old_pwd && !isUsedBefore) {
                            var passRes = validatePassword(req.body.new_pwd);
                            if (passRes === false) {
                                updatedUser.password = newPassword_ARGON2;
                                updatedUser.password_changed = Math.round(new Date().getTime() / 1000);
                                countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {'$set': updatedUser, $push: {password_history: {$each: [newPassword_ARGON2], $slice: -parseInt(plugins.getConfig('security').password_rotation)}}}, {safe: true}, function(err3, result) {
                                    if (result && result.result && result.result.ok && result.result.nModified > 0 && !err3) {
                                        killOtherSessionsForUser(req.session.uid, req.session.auth_token, req.sessionID);
                                        plugins.callMethod("userSettings", {req: req, res: res, next: next, data: member});
                                        res.send(updatedUser.password_changed + "");
                                    }
                                    else {
                                        res.send("user-settings.old-password-not-match");
                                    }
                                });
                            }
                            else {
                                res.send(passRes);
                            }
                        }
                        else {
                            res.send("user-settings.password-not-old");
                        }
                    }
                    else {
                        countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {'$set': updatedUser}, {safe: true}, function(err3, result) {
                            if (result && !err3) {
                                plugins.callMethod("userSettings", {req: req, res: res, next: next, data: member});
                                res.send(true);
                            }
                            else {
                                res.send(false);
                            }
                        });
                    }
                }
            });
        });
    }
    else {
        res.send(false);
        return false;
    }
});

app.post(countlyConfig.path + '/user/settings/lang', function(req, res) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.lang) {
        updatedUser.lang = req.body.lang;

        countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid)}, {'$set': updatedUser}, {safe: true}, function(err, member) {
            if (member && !err) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
    }
    else {
        res.send(false);
        return false;
    }
});

app.post(countlyConfig.path + '/user/settings/active-app', function(req, res) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.appId) {
        updatedUser.active_app_id = req.body.appId;

        countlyDb.collection('members').update({ "_id": countlyDb.ObjectID(req.session.uid) }, { '$set': updatedUser }, { safe: true }, function(err, member) {
            if (member && !err) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
    }
    else {
        res.send(false);
        return false;
    }
});

app.post(countlyConfig.path + '/users/check/email', function(req, res) {
    if (!req.session.uid || !isGlobalAdmin(req) || !req.body.email) {
        res.send(false);
        return false;
    }
    req.body.email = (req.body.email + "").trim();

    countlyDb.collection('members').findOne({email: req.body.email}, function(err, member) {
        if (member || err) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    });
});

app.post(countlyConfig.path + '/users/check/username', function(req, res) {
    if (!req.session.uid || !req.body.username) {
        res.send(false);
        return false;
    }
    req.body.username = (req.body.username + "").trim();

    countlyDb.collection('members').findOne({username: req.body.username}, function(err, member) {
        if (member || err) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    });
});

app.post(countlyConfig.path + '/graphnotes/create', function(req, res) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note || req.body.note.length > 50) {
        res.send(false);
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) !== -1) {
                createNote();
                return true;
            }
            else {
                res.send(false);
                return false;
            }
        });
    }
    else {
        createNote();
        return true;
    }
    /**
    * Create new graph note
    **/
    function createNote() {
        var noteObj = {},
            sanNote = common.escape_html(req.body.note, true);

        noteObj["notes." + req.body.date_id] = sanNote;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $addToSet: noteObj }, {upsert: true}, function() {
            plugins.callMethod("logAction", {req: req, user: {_id: req.session.uid, email: req.session.email}, action: "graph_note_created", data: req.body});
        });
        res.send(sanNote);
    }
});

app.post(countlyConfig.path + '/graphnotes/delete', function(req, res) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note) {
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) !== -1) {
                deleteNote();
                return true;
            }
            else {
                res.send(false);
                return false;
            }
        });
    }
    else {
        deleteNote();
        return true;
    }

    /**
    * Deletes graph note
    **/
    function deleteNote() {
        var noteObj = {};
        noteObj["notes." + req.body.date_id] = req.body.note;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $pull: noteObj }, function() {
            plugins.callMethod("logAction", {req: req, user: {_id: req.session.uid, email: req.session.email}, action: "graph_note_deleted", data: req.body});
        });
        res.send(true);
    }
});

app.get(countlyConfig.path + '/render', function(req, res) {
    if (!req.session.uid) {
        return res.redirect(countlyConfig.path + '/login');
    }

    var options = {};
    var view = req.query.view || "";
    var route = req.query.route || "";
    var id = req.query.id || "";

    options.view = view + "#" + route;
    options.id = id ? "#" + id : "";

    var randomString = (+new Date()).toString() + (Math.random()).toString();
    var imageName = "screenshot_" + sha1Hash(randomString) + ".png";

    options.savePath = path.resolve(__dirname, "./public/images/screenshots/" + imageName);

    ip.getHost(function(err, host) {
        if (err) {
            console.log(err);
            return res.send(false);
        }

        options.host = host;

        authorize.save({
            db: countlyDb,
            multi: false,
            owner: req.session.uid,
            purpose: "LoginAuthToken",
            callback: function(err2, token) {
                if (err2) {
                    console.log(err2);
                    return res.send(false);
                }

                options.token = token;
                render.renderView(options, function(err3) {
                    if (err3) {
                        return res.send(false);
                    }

                    return res.send(true);
                });
            }
        });
    });
});

app.get(countlyConfig.path + '/login/token/:token', function(req, res) {
    var token = req.params.token;
    var pathUrl = req.url.replace(countlyConfig.path, "");
    var urlParts = url.parse(pathUrl, true);
    var fullPath = urlParts.pathname;

    authorize.verify_return({
        db: countlyDb,
        token: token,
        req_path: fullPath,
        callback: function(valid) {
            if (!valid) {
                plugins.callMethod("tokenLoginFailed", {req: req, res: res, data: {token: token}});
                return res.redirect(countlyConfig.path + '/login?message=login.result');
            }

            countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(valid)}, function(err, member) {
                if (err || !member) {
                    plugins.callMethod("tokenLoginFailed", {req: req, res: res, data: {token: token, token_owner: valid}});
                    return res.redirect(countlyConfig.path + '/login?message=login.result');
                }

                req.session.regenerate(function() {
                    req.session.uid = member._id;
                    req.session.gadm = (member.global_admin === true);
                    req.session.email = member.email;
                    req.session.settings = member.settings;

                    plugins.callMethod("tokenLoginSuccessful", {req: req, res: res, data: {username: member.username}});
                    bruteforce.reset(member.username);
                    res.redirect(countlyConfig.path + '/dashboard');

                });
            });
        }
    });
});

countlyDb.collection('apps').ensureIndex({"key": 1}, function() {});
countlyDb.collection('members').ensureIndex({"api_key": 1}, function() {});

app.listen(countlyConfig.web.port, countlyConfig.web.host || '');