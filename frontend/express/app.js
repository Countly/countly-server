/**
 * Main dashboard process app.js
 * @module frontend/express/app
 */

// Set process name
process.title = "countly: dashboard node " + process.argv[1];

var versionInfo = require('./version.info'),
    pack = require('../../package.json'),
    COUNTLY_VERSION = versionInfo.version,
    COUNTLY_COMPANY = versionInfo.company || '',
    COUNTLY_TYPE = versionInfo.type,
    COUNTLY_PAGE = versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null,
    COUNTLY_NAME = versionInfo.title = versionInfo.title || "Countly",
    COUNTLY_DOCUMENTATION_LINK = (typeof versionInfo.documentationLink === "undefined") ? true : (typeof versionInfo.documentationLink === "string") ? versionInfo.documentationLink : (typeof versionInfo.documentationLink === "boolean") ? versionInfo.documentationLink : true,
    COUNTLY_FEEDBACK_LINK = (typeof versionInfo.feedbackLink === "undefined") ? true : (typeof versionInfo.feedbackLink === "string") ? versionInfo.feedbackLink : (typeof versionInfo.feedbackLink === "boolean") ? versionInfo.feedbackLink : true,
    COUNTLY_HELPCENTER_LINK = (typeof versionInfo.helpCenterLink === "undefined") ? true : (typeof versionInfo.helpCenterLink === "string") ? versionInfo.helpCenterLink : (typeof versionInfo.helpCenterLink === "boolean") ? versionInfo.helpCenterLink : true,
    COUNTLY_FEATUREREQUEST_LINK = (typeof versionInfo.featureRequestLink === "undefined") ? true : (typeof versionInfo.featureRequestLink === "string") ? versionInfo.featureRequestLink : (typeof versionInfo.featureRequestLink === "boolean") ? versionInfo.featureRequestLink : true,
    express = require('express'),
    SkinStore = require('./libs/connect-mongo.js'),
    expose = require('./libs/express-expose.js'),
    dollarDefender = require('./libs/dollar-defender.js')({
        message: "Dollar sign is not allowed in keys",
        hook: function(req) {
            console.log("Possible Dollar sign injection", req.originalUrl, req.query, req.params, req.body);
        }
    }),
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
    // countlyStats = require('../../api/parts/data/stats.js'),
    countlyFs = require('../../api/utils/countlyFs.js'),
    common = require('../../api/utils/common.js'),
    preventBruteforce = require('./libs/preventBruteforce.js'),
    plugins = require('../../plugins/pluginManager.js'),
    countlyConfig = require('./config', 'dont-enclose'),
    log = require('../../api/utils/log.js')('core:app'),
    url = require('url'),
    authorize = require('../../api/utils/authorizer.js'), //for token validations
    languages = require('../../frontend/express/locale.conf'),
    render = require('../../api/utils/render.js'),
    rateLimit = require("express-rate-limit"),
    membersUtility = require("./libs/members.js"),
    argon2 = require('argon2'),
    countlyCommon = require('../../api/lib/countly.common.js'),
    timezones = require('../../api/utils/timezones.js').getTimeZones,
    { validateCreate } = require('../../api/utils/rights.js');

console.log("Starting Countly", "version", pack.version);

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

/**
* Create params object for validation
* @param {obj} obj - express request object
* @returns {object} params object
**/
function paramsGenerator(obj) {
    var params = {
        req: obj.req,
        res: obj.res,
        qstring: obj.req.query,
        fullPath: url.parse(obj.req.url, true).pathname
    };

    params.qstring.auth_token = obj.req.session.auth_token;
    params.qstring.app_id = obj.req.body.app_id;

    return params;
}

if (!countlyConfig.cookie) {
    countlyConfig.cookie = {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        secure: countlyConfig.web.secure_cookies || false,
        maxAgeLogin: 1000 * 60 * 60 * 24 * 365
    };
}

plugins.setConfigs("frontend", {
    production: true,
    theme: countlyConfig.web.theme || "",
    session_timeout: 30,
    use_google: true,
    code: true,
    google_maps_api_key: "",
    offline_mode: false
});

plugins.setUserConfigs("frontend", {
    production: false,
    theme: false,
    session_timeout: false,
    use_google: false,
    code: false,
    google_maps_api_key: ""
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
    password_autocomplete: true,
    robotstxt: "User-agent: *\nDisallow: /",
    dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains\nX-Content-Type-Options: nosniff",
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nAccess-Control-Allow-Origin:*",
    dashboard_rate_limit_window: 60,
    dashboard_rate_limit_requests: 500
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

if (countlyConfig.web && countlyConfig.web.track === "all") {
    countlyConfig.web.track = null;
}

var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));

Promise.all([plugins.dbConnection(countlyConfig), plugins.dbConnection("countly_fs")]).then(function(dbs) {
    var countlyDb = dbs[0];
    //reference for consistency between app and api processes
    membersUtility.db = common.db = countlyDb;
    countlyFs.setHandler(dbs[1]);

    //checking remote configuration
    membersUtility.recheckConfigs(countlyConfigOrig, countlyConfig);
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
    * Verify member for Argon2 Hash
    * @param {string} username | User name
    * @param {password} password | Password string
    * @param {Function} callback | Callback function
    */
    function verifyMemberArgon2Hash(username, password, callback) {
        var secret = countlyConfig.passwordSecret || "";
        password = password + secret;
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
                    }).catch(function() {
                        callback("Password is wrong!");
                    });
                }
                else {
                    var password_SHA1 = sha1Hash(password);
                    var password_SHA5 = sha512Hash(password);

                    if (member.password === password_SHA1 || member.password === password_SHA5) {
                        argon2Hash(password).then(password_ARGON2 => {
                            updateUserPasswordToArgon2(member._id, password_ARGON2);
                            callback(undefined, member);
                        }).catch(function() {
                            callback("Password is wrong!");
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
    const limiter = rateLimit({
        windowMs: parseInt(plugins.getConfig("security").dashboard_rate_limit_window) * 1000,
        max: parseInt(plugins.getConfig("security").dashboard_rate_limit_requests),
        headers: false,
        //limit only in production mode
        skip: function() {
            return !plugins.getConfig("frontend").production || plugins.getConfig("security").dashboard_rate_limit_requests <= 0;
        }
    });

    //  apply to all requests
    app.use(limiter);

    var loadedThemes = {};
    var curTheme = countlyConfig.web.theme || "";

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
        app.loadThemeFiles(curTheme);
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

    app.use('*.svg', function(req, res, next) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=UTF-8');
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

        if (!req.params || !req.params[0] || req.params[0] === '') {
            res.sendFile(__dirname + '/public/images/default_app_icon.png');
        }
        else {
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
                                'Content-Type': 'image/png',
                                'Content-Length': stats.size
                            });
                            stream.pipe(res);
                        }
                    });
                }
            });
        }
    });

    //serve member images
    app.get(countlyConfig.path + '/memberimages/*', function(req, res) {

        if (!req.params || !req.params[0] || req.params[0] === '') {
            res.sendFile(__dirname + '/public/images/default_member_icon.png');
        }
        else {
            countlyFs.getStats("memberimages", __dirname + '/public/' + req.path, {id: req.params[0]}, function(err, stats) {
                if (err || !stats || !stats.size) {
                    res.sendFile(__dirname + '/public/images/default_member_icon.png');
                }
                else {
                    countlyFs.getStream("memberimages", __dirname + '/public/' + req.path, {id: req.params[0]}, function(err2, stream) {
                        if (err2 || !stream) {
                            res.sendFile(__dirname + '/public/images/default_member_icon.png');
                        }
                        else {
                            res.writeHead(200, {
                                'Accept-Ranges': 'bytes',
                                'Cache-Control': 'public, max-age=31536000',
                                'Connection': 'keep-alive',
                                'Date': new Date().toUTCString(),
                                'Last-Modified': stats.mtime.toUTCString(),
                                'Content-Type': 'image/png',
                                'Content-Length': stats.size
                            });
                            stream.pipe(res);
                        }
                    });
                }
            });
        }
    });

    app.get(countlyConfig.path + "*/screenshots/*", function(req, res) {
        countlyFs.getStats("screenshots", __dirname + '/public/' + req.path, {id: "core"}, function(err, stats) {
            if (err || !stats || !stats.size) {
                return res.send(false);
            }

            countlyFs.getStream("screenshots", __dirname + '/public/' + req.path, {id: "core"}, function(err2, stream) {
                if (err2 || !stream) {
                    return res.send(false);
                }

                res.writeHead(200, {
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=31536000',
                    'Connection': 'keep-alive',
                    'Date': new Date().toUTCString(),
                    'Last-Modified': stats.mtime.toUTCString(),
                    'Content-Type': 'image/png',
                    'Content-Length': stats.size
                });
                stream.pipe(res);
            });
        });
    });

    var oneYear = 31557600000;
    app.use(countlyConfig.path, express.static(__dirname + '/public', { maxAge: oneYear }));

    app.use(session({
        secret: countlyConfig.web.session_secret || 'countlyss',
        name: countlyConfig.web.session_name || 'connect.sid',
        cookie: countlyConfig.cookie,
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
    var convertLink = function(val, defaultVal) {
        if (typeof val === "undefined" || val === true) {
            return defaultVal;
        }
        return val;
    };
    app.use(flash());
    app.use(function(req, res, next) {
        req.template = {};
        req.template.html = "";
        req.template.js = "";
        req.template.css = "";
        req.template.form = "";
        req.countly = {
            company: COUNTLY_COMPANY,
            version: COUNTLY_VERSION,
            type: COUNTLY_TYPE,
            page: COUNTLY_PAGE,
            title: COUNTLY_NAME,
            favicon: "images/favicon.png",
            documentationLink: convertLink(versionInfo.documentationLink, "https://support.count.ly/hc/en-us/categories/360002373332-Knowledge-Base"),
            helpCenterLink: convertLink(versionInfo.helpCenterLink, "https://support.count.ly/hc/en-us"),
            featureRequestLink: convertLink(versionInfo.featureRequestLink, "https://support.count.ly/hc/en-us/community/topics/360001464272-Feature-Requests"),
            feedbackLink: convertLink(versionInfo.feedbackLink, "https://count.ly/legal/privacy-policy"),
        };
        plugins.loadConfigs(countlyDb, function() {
            var securityConf = plugins.getConfig("security");
            app.dashboard_headers = securityConf.dashboard_additional_headers;
            add_headers(req, res);
            preventBruteforce.fails = Number.isInteger(securityConf.login_tries) ? securityConf.login_tries : 3;
            preventBruteforce.wait = securityConf.login_wait || 5 * 60;

            curTheme = plugins.getConfig("frontend", req.session && req.session.settings).theme;
            app.loadThemeFiles(req.cookies.theme || curTheme, function(themeFiles) {
                res.locals.flash = req.flash.bind(req);
                req.config = plugins.getConfig("frontend", req.session && req.session.settings);
                req.themeFiles = themeFiles;
                var _render = res.render;
                res.render = function(view, opts, fn, parent, sub) {
                    if (!opts) {
                        opts = {};
                    }
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

    app.use(function(req, res, next) {
        if (!plugins.callMethod("skipDollarCheck", {req: req, res: res, next: next})) {
        //none of the plugins requested to skip dollar sign check
            dollarDefender(req, res, next);
        }
        else {
        //skipping dollar sign check, some plugin needs mongo object as parameters
            next();
        }
    });

    //for csrf error handling. redirect to login if getting bad token while logging in(not show forbidden page)
    app.use(function(err, req, res, next) { // eslint-disable-line no-unused-vars
        var mylink = req.url.split('?');
        mylink = mylink[0];
        if (err.code === 'EBADCSRFTOKEN' && mylink === countlyConfig.path + "/login") {
            res.status(403);
            res.redirect(countlyConfig.path + '/login?message=login.token-expired');
        }
        else {
            res.status(403).send("Forbidden Token");
        }
    });


    //prevent bruteforce attacks
    preventBruteforce.db = countlyDb;
    preventBruteforce.mail = countlyMail;

    for (let pathPart of ["/login", "/mobile/login"]) {
        const absPath = countlyConfig.path + pathPart;
        preventBruteforce.pathIdentifiers[absPath] = "login";
        preventBruteforce.userIdentifiers[absPath] = (req) => req.body.username;
    }

    preventBruteforce.blockHooks.login = function(uid, req, res) { // eslint-disable-line no-unused-vars
        preventBruteforce.db.collection("members").findOne({username: uid}, function(err, member) {
            if (member) {
                preventBruteforce.mail.sendTimeBanWarning(member, preventBruteforce.db);
            }
        });
    };

    preventBruteforce.pathIdentifiers[countlyConfig.path + "/forgot"] = "forgot";

    app.use(preventBruteforce.middleware);

    plugins.loadAppPlugins(app, countlyDb, express);

    var env = process.env.NODE_ENV || 'development';
    if ('development' === env) {
        app.use(errorhandler(true));
    }

    app.get(countlyConfig.path + '/', function(req, res) {
        res.redirect(countlyConfig.path + '/login');
    });

    var extendSession = function(req) {
        membersUtility.extendSession(req);
    };
    var checkRequestForSession = function(req, res, next) {
        if (parseInt(plugins.getConfig("frontend", req.session && req.session.settings).session_timeout)) {
            if (req.session.uid) {
                if (Date.now() > req.session.expires) {
                    membersUtility.logout(req, res);
                    res.redirect(countlyConfig.path + '/login?message=logout.inactivity');
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

    app.get(countlyConfig.path + '/robots.txt', function(req, res) {
        res.contentType('text/plain');
        res.send(plugins.getConfig("security").robotstxt);
    });

    app.get(countlyConfig.path + '/configs', function(req, res) {
        membersUtility.recheckConfigs(countlyConfigOrig, countlyConfig);
        res.send("Success");
    });

    app.get(countlyConfig.path + '/session', function(req, res, next) {
        if (req.session.auth_token) {
            authorize.verify_return({
                db: countlyDb,
                token: req.session.auth_token,
                req_path: "",
                callback: function(valid) {
                    if (!valid) {
                        //logout user
                        res.send("logout");
                    }
                    else {
                        if (req.session.uid) {
                            if (Date.now() > req.session.expires) {
                                //logout user
                                membersUtility.logout(req, res);
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
                    }
                }
            });
        }
        else {
            res.send("login");
        }
    });
    app.get(countlyConfig.path + '/dashboard', checkRequestForSession);
    app.post('*', checkRequestForSession);

    app.get(countlyConfig.path + '/logout', function(req, res) {
        if (req.query.message) {
            res.redirect(countlyConfig.path + '/login?message=' + req.query.message);
        }
        else {
            res.redirect(countlyConfig.path + '/login');
        }
    });

    app.post(countlyConfig.path + '/logout', function(req, res/*, next*/) {
        membersUtility.logout(req, res);
        if (req.query.message) {
            res.redirect(countlyConfig.path + '/login?message=' + req.query.message);
        }
        else {
            res.redirect(countlyConfig.path + '/login');
        }
    });

    /**
     * Stringify all object nested properties named `prop`
     * 
     * @param {object} obj object to fix
     * @param {string} prop property name
     */
    function stringifyIds(obj, prop = '_id') {
        for (let k in obj) {
            if (k === prop && common.dbext.isoid(obj[k])) {
                obj[k] = obj[k].toString();
            }
            else if (typeof obj[k] === 'object') {
                stringifyIds(obj[k]);
            }
        }
    }

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
            if (configs._user.theme) {
                res.cookie("theme", configs.theme);
            }
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

            stringifyIds(adminOfApps);
            stringifyIds(userOfApps);
            stringifyIds(countlyGlobalApps);
            stringifyIds(countlyGlobalAdminApps);

            var defaultApp = userOfApps[0];
            var serverSideRendering = req.query.ssr;
            _.extend(req.config, configs);
            var countlyGlobal = {
                COUNTLY_CONTAINER: process.env.COUNTLY_CONTAINER,
                countlyTitle: req.countly.title,
                company: req.countly.company,
                languages: languages,
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
                message: req.flash("message"),
                ssr: serverSideRendering,
                timezones: timezones,
                countlyTypeName: COUNTLY_NAMED_TYPE,
                usermenu: {
                    feedbackLink: COUNTLY_FEEDBACK_LINK,
                    documentationLink: COUNTLY_DOCUMENTATION_LINK,
                    helpCenterLink: COUNTLY_HELPCENTER_LINK,
                    featureRequestLink: COUNTLY_FEATUREREQUEST_LINK,
                }
            };

            var toDashboard = {
                countlyTitle: req.countly.title,
                languages: languages,
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
                feedbackLink: COUNTLY_FEEDBACK_LINK,
                documentationLink: COUNTLY_DOCUMENTATION_LINK,
                helpCenterLink: COUNTLY_HELPCENTER_LINK,
                featureRequestLink: COUNTLY_FEATUREREQUEST_LINK,
                countlyTypeTrack: COUNTLY_TRACK_TYPE,
                frontend_app: versionInfo.frontend_app,
                frontend_server: versionInfo.frontend_server,
                production: configs.production || false,
                pluginsSHA: sha1Hash(plugins.getPlugins()),
                plugins: plugins.getPlugins(),
                config: req.config,
                path: countlyConfig.path || "",
                cdn: countlyConfig.cdn || "",
                use_google: configs.use_google || false,
                themeFiles: theme,
                inject_template: req.template,
                javascripts: [],
                stylesheets: [],
                offline_mode: configs.offline_mode || false
            };

            // google services cannot work when offline mode enable
            if (toDashboard.offline_mode) {
                toDashboard.use_google = false;
            }
            if (countlyGlobal.config.offline_mode) {
                countlyGlobal.config.use_google = false;
            }

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
                try {
                    let contents = fs.readdirSync(__dirname + `/../../plugins/${plugin}/frontend/public/stylesheets`) || [];
                    toDashboard.stylesheets.push.apply(toDashboard.stylesheets, contents.filter(n => n.indexOf('.css') === n.length - 4).map(n => `${plugin}/stylesheets/${n}`));
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
            countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid + "")}, function(err, member) {
                if (member) {
                    req.session.cookie.maxAge = countlyConfig.cookie.maxAgeLogin;
                    var adminOfApps = [],
                        userOfApps = [],
                        countlyGlobalApps = {},
                        countlyGlobalAdminApps = {};

                    if (member.global_admin) {
                        countlyDb.collection('apps').find({}).toArray(function(err2, apps) {
                            adminOfApps = apps;
                            userOfApps = apps;

                            for (let i = 0; i < apps.length; i++) {
                                apps[i].type = apps[i].type || "mobile";
                                countlyGlobalApps[apps[i]._id] = apps[i];
                                countlyGlobalApps[apps[i]._id]._id = "" + apps[i]._id;
                            }
                            countlyGlobalAdminApps = countlyGlobalApps;
                            renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps);
                        });
                    }
                    else {
                        var adminOfAppIds = [],
                            userOfAppIds = [];

                        /*
                        We keep this section for backward compatibility.
                        This block will run if member has legacy permission properties like user_of, admin_of.
                        */
                        if (typeof member.permission === "undefined") {
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

                                    for (let i = 0; i < user_of.length; i++) {
                                        countlyGlobalApps[user_of[i]._id] = user_of[i];
                                        countlyGlobalApps[user_of[i]._id]._id = "" + user_of[i]._id;
                                        countlyGlobalApps[user_of[i]._id].type = countlyGlobalApps[user_of[i]._id].type || "mobile";
                                    }

                                    renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps);
                                });
                            });
                        }
                        else {
                            var writableAppIds = member.permission._.a;
                            var readableAppIds = Object.keys(member.permission.r).filter(readableApp => readableApp !== 'global');
                            var preparedReadableIds = [];
                            var preparedWritableIds = [];

                            for (let i = 0; i < readableAppIds.length; i++) {
                                if (readableAppIds[i] !== 'undefined' && (member.permission.r[readableAppIds[i]].all || Object.keys(member.permission.r[readableAppIds[i]].allowed).length > 0)) {
                                    preparedReadableIds.push(countlyDb.ObjectID(readableAppIds[i]));
                                }
                            }

                            for (let i = 0; i < writableAppIds.length; i++) {
                                preparedWritableIds.push(countlyDb.ObjectID(writableAppIds[i]));
                            }

                            countlyDb.collection('apps').find({ _id: { '$in': preparedReadableIds } }).toArray(function(err4, readableApps) {
                                countlyDb.collection('apps').find({ _id: { '$in': preparedWritableIds } }).toArray(function(err5, writableApps) {
                                    adminOfApps = writableApps;
                                    userOfApps = readableApps.concat(writableApps);

                                    for (let i = 0; i < userOfApps.length; i++) {
                                        countlyGlobalApps[userOfApps[i]._id] = userOfApps[i];
                                        countlyGlobalApps[userOfApps[i]._id]._id = "" + userOfApps[i]._id;
                                        countlyGlobalApps[userOfApps[i]._id].type = countlyGlobalApps[userOfApps[i]._id].type || "mobile";

                                        if (adminOfApps.indexOf(userOfApps[i]) !== -1) {
                                            countlyGlobalAdminApps[userOfApps[i]._id] = userOfApps[i];
                                            countlyGlobalAdminApps[userOfApps[i]._id]._id = "" + userOfApps[i]._id;
                                            countlyGlobalAdminApps[userOfApps[i]._id].type = userOfApps[i].type || "mobile";
                                        }
                                    }
                                    renderDashboard(req, res, next, member, adminOfApps, userOfApps, countlyGlobalApps, countlyGlobalAdminApps);
                                });
                            });
                        }
                    }
                }
                else {
                    membersUtility.clearReqAndRes(req, res);
                    res.redirect(countlyConfig.path + '/login');
                }
            });
        }
    });

    app.get(countlyConfig.path + '/setup', function(req, res) {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.header('Expires', '0');
        res.header('Pragma', 'no-cache');
        countlyDb.collection('members').count(function(err, memberCount) {
            if (!err && memberCount === 0) {
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.header('Expires', '0');
                res.header('Pragma', 'no-cache');
                var config = plugins.getConfig("security");
                res.render('setup', {
                    documentationLink: req.countly.documentationLink,
                    helpCenterLink: req.countly.helpCenterLink,
                    feedbackLink: req.countly.feedbackLink,
                    featureRequestLink: req.countly.featureRequestLink,
                    languages: languages,
                    countlyFavicon: req.countly.favicon,
                    countlyTitle: req.countly.title,
                    countlyPage: req.countly.page,
                    "csrf": req.csrfToken(),
                    path: countlyConfig.path || "",
                    cdn: countlyConfig.cdn || "",
                    themeFiles: req.themeFiles,
                    inject_template: req.template,
                    params: {},
                    error: {},
                    security: {
                        password_min: config.password_min,
                        password_char: config.password_char,
                        password_number: config.password_number,
                        password_symbol: config.password_symbol,
                        autocomplete: config.password_autocomplete || false
                    }
                });
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
            countlyDb.collection('members').estimatedDocumentCount(function(err, memberCount) {
                if (memberCount) {
                    if (req.query.message) {
                        req.flash('info', req.query.message);
                    }
                    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                    res.header('Expires', '0');
                    res.header('Pragma', 'no-cache');
                    var config = plugins.getConfig("security");
                    res.render('login', {
                        documentationLink: req.countly.documentationLink,
                        helpCenterLink: req.countly.helpCenterLink,
                        feedbackLink: req.countly.feedbackLink,
                        featureRequestLink: req.countly.featureRequestLink,
                        languages: languages,
                        countlyFavicon: req.countly.favicon,
                        countlyTitle: req.countly.title,
                        countlyPage: req.countly.page,
                        "message": req.flash('info'),
                        "csrf": req.csrfToken(),
                        path: countlyConfig.path || "",
                        cdn: countlyConfig.cdn || "",
                        themeFiles: req.themeFiles,
                        inject_template: req.template,
                        security: {autocomplete: config.password_autocomplete || false}
                    });
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
            res.render('forgot', {
                documentationLink: req.countly.documentationLink,
                helpCenterLink: req.countly.helpCenterLink,
                feedbackLink: req.countly.feedbackLink,
                featureRequestLink: req.countly.featureRequestLink,
                languages: languages,
                countlyFavicon: req.countly.favicon,
                countlyTitle: req.countly.title,
                countlyPage: req.countly.page,
                "csrf": req.csrfToken(),
                "message": req.query.message || "",
                path: countlyConfig.path || "",
                cdn: countlyConfig.cdn || "",
                themeFiles: req.themeFiles,
                inject_template: req.template
            });
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
                        var config = plugins.getConfig("security");
                        res.render('reset', {
                            documentationLink: req.countly.documentationLink,
                            helpCenterLink: req.countly.helpCenterLink,
                            feedbackLink: req.countly.feedbackLink,
                            featureRequestLink: req.countly.featureRequestLink,
                            languages: languages,
                            countlyFavicon: req.countly.favicon,
                            countlyTitle: req.countly.title,
                            countlyPage: req.countly.page,
                            "csrf": req.csrfToken(),
                            "prid": req.params.prid,
                            "message": req.query.message || "",
                            path: countlyConfig.path || "",
                            cdn: countlyConfig.cdn || "",
                            "newinvite": passwordReset.newInvite,
                            themeFiles: req.themeFiles,
                            inject_template: req.template,
                            security: {autocomplete: config.password_autocomplete || false, password_min: config.password_min}
                        });
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

    app.post(countlyConfig.path + '/reset', function(req, res/*, next*/) {
        membersUtility.reset(req, function(result, member) {
            if (result === false) {
                if (member) {
                    req.flash('info', 'reset.result');
                    res.redirect(countlyConfig.path + '/login');
                }
                else {
                    res.redirect(countlyConfig.path + '/reset/' + req.body.prid);
                }
            }
            else {
                res.redirect(countlyConfig.path + '/reset/' + req.body.prid + "?message=" + result);
            }
        });
    });

    app.post(countlyConfig.path + '/forgot', function(req, res/*, next*/) {
        if (req.body.email) {
            if (countlyCommon.validateEmail(req.body.email)) {
                membersUtility.forgot(req, function(/*member*/) {
                    preventBruteforce.fail("forgot", req.ip);
                    res.redirect(countlyConfig.path + '/forgot?message=forgot.result');
                });
            }
            else {
                res.redirect(countlyConfig.path + '/forgot?message=forgot.result');
            }
        }
        else {
            res.redirect(countlyConfig.path + '/forgot');
        }
    });

    app.post(countlyConfig.path + '/setup', function(req, res/*, next*/) {
        var params = req.body || {};
        membersUtility.setup(req, function(err) {
            if (!err) {
                res.redirect(countlyConfig.path + '/dashboard');
            }
            else if (err === "User exists") {
                res.redirect(countlyConfig.path + '/login');
            }
            else if (err && err.message) {
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.header('Expires', '0');
                res.header('Pragma', 'no-cache');
                var config = plugins.getConfig("security");
                var data = {
                    documentationLink: req.countly.documentationLink,
                    helpCenterLink: req.countly.helpCenterLink,
                    feedbackLink: req.countly.feedbackLink,
                    featureRequestLink: req.countly.featureRequestLink,
                    languages: languages,
                    countlyFavicon: req.countly.favicon,
                    countlyTitle: req.countly.title,
                    countlyPage: req.countly.page,
                    "csrf": req.csrfToken(),
                    path: countlyConfig.path || "",
                    cdn: countlyConfig.cdn || "",
                    themeFiles: req.themeFiles,
                    inject_template: req.template,
                    params: {},
                    error: err || {},
                    security: {password_min: config.password_min, password_char: config.password_char, password_number: config.password_number, password_symbol: config.password_symbol, autocomplete: config.password_autocomplete || false}
                };
                if (params.email) {
                    data.params.email = params.email;
                }
                if (params.full_name) {
                    data.params.full_name = params.full_name;
                }
                if (params.username) {
                    data.params.username = params.username;
                }
                if (params.password) {
                    data.params.password = params.password;
                }
                res.render('setup', data);
            }
            else {
                res.status(500).send('Server Error');
            }
        });
    });

    app.post(countlyConfig.path + '/login', function(req, res/*, next*/) {
        membersUtility.login(req, res, function(member) {
            if (member) {
                if (member.locked) {
                    res.redirect(countlyConfig.path + '/login?message=login.locked');
                }
                else {
                    res.redirect(countlyConfig.path + '/dashboard');
                    preventBruteforce.reset("login", req.body.username);
                }
            }
            else {
                res.redirect(countlyConfig.path + '/login?message=login.result');
                if (req.body.username) {
                    preventBruteforce.fail("login", req.body.username);
                }
            }
        });
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
            preventBruteforce.isBlocked("login", user.name, function(isBlocked, fails, err) {
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
                                preventBruteforce.reset("login", user.name);
                                countlyDb.collection('members').update({_id: member._id}, {$set: {last_login: Math.round(new Date().getTime() / 1000)}}, function() {});
                                res.status(200).send(member.api_key);
                            }
                        }
                        else {
                            plugins.callMethod("apikeyFailed", {req: req, res: res, next: next, data: {username: user.name}});
                            preventBruteforce.fail("login", user.name);
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
        if (!plugins.getConfig("api").offline_mode) {
            var options = {uri: "http://code.count.ly/js/sdks.js", method: "GET", timeout: 4E3};
            request(options, function(a, c, b) {
                res.set('Content-type', 'application/javascript').status(200).send(b);
            });
        }
        else {
            res.status(403).send("Server is in offline mode, this request cannot be completed.");
        }
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
                        preventBruteforce.reset("login", req.body.username);
                        countlyDb.collection('members').update({_id: member._id}, {$set: {last_login: Math.round(new Date().getTime() / 1000)}}, function() {});
                        res.render('mobile/key', { "key": member.api_key || -1 });
                    }
                }
                else {
                    plugins.callMethod("mobileloginFailed", {req: req, res: res, next: next, data: req.body});
                    preventBruteforce.fail("login", req.body.username);
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

        countlyDb.collection('members').update({_id: countlyDb.ObjectID(req.session.uid + "")}, {'$set': {'appSortList': newAppOrder}}, {'upsert': true}, function() {
            res.end();
            return false;
        });
    });

    app.post(countlyConfig.path + '/apps/icon', function(req, res, next) {
        var params = paramsGenerator({req, res});
        validateCreate(params, 'global_upload', function() {
            if (!req.session.uid) {
                res.end();
                return false;
            }

            if (!req.files.app_image || !req.body.app_image_id) {
                res.end();
                return true;
            }

            req.body.app_image_id = common.sanitizeFilename(req.body.app_image_id);

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
                            res.send("appimages/" + req.body.app_image_id + ".png");
                        });
                    }); // save
                });
            }
            catch (e) {
                console.log(e.stack);
            }
        });
    });

    app.post(countlyConfig.path + '/member/icon', function(req, res, next) {

        var params = paramsGenerator({req, res});
        validateCreate(params, 'global_upload', function() {
            if (!req.files.member_image || !req.body.member_image_id) {
                res.end();
                return true;
            }

            req.body.member_image_id = common.sanitizeFilename(req.body.member_image_id);
            var tmp_path = req.files.member_image.path,
                target_path = __dirname + '/public/memberimages/' + req.body.member_image_id + ".png",
                type = req.files.member_image.type;

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
                        countlyFs.saveData("memberimages", target_path, buffer, {id: req.body.member_image_id + ".png", writeMode: "overwrite"}, function() {
                            fs.unlink(tmp_path, function() {});
                            countlyDb.collection('members').updateOne({_id: countlyDb.ObjectID(req.session.uid + "")}, {'$set': {'member_image': "memberimages/" + req.body.member_image_id + ".png"}}, function() {
                                res.send("memberimages/" + req.body.member_image_id + ".png");
                            });
                        });
                    }); // save
                });
            }
            catch (e) {
                console.log(e.stack);
            }
        });
    });

    app.post(countlyConfig.path + '/user/settings', function(req, res/*, next*/) {
        if (!req.session.uid) {
            res.end();
            return false;
        }
        membersUtility.settings(req, function(result, message) {
            if (result && req.body.member_image === "delete") {
                var target_path = __dirname + '/public/memberimages/' + req.session.uid + ".png";
                countlyFs.deleteFile("memberimages", target_path, {id: req.session.uid + ".png"}, function() { });
            }
            if (message) {
                res.send(message);
            }
            else {
                res.send(result);
            }
            return result;
        });
    });

    app.post(countlyConfig.path + '/user/settings/lang', function(req, res) {
        if (!req.session.uid) {
            res.end();
            return false;
        }

        var updatedUser = {};

        if (req.body.lang) {
            updatedUser.lang = req.body.lang;

            countlyDb.collection('members').update({"_id": countlyDb.ObjectID(req.session.uid + "")}, {'$set': updatedUser}, {safe: true}, function(err, member) {
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

            countlyDb.collection('members').update({ "_id": countlyDb.ObjectID(req.session.uid + "") }, { '$set': updatedUser }, { safe: true }, function(err, member) {
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
        else {
            membersUtility.checkEmail(req.body.email, function(result) {
                res.send(result);
            });
        }
    });

    app.post(countlyConfig.path + '/users/check/username', function(req, res) {
        if (!req.session.uid || !req.body.username) {
            res.send(false);
            return false;
        }
        else {
            membersUtility.checkUsername(req.body.username, function(result) {
                res.send(result);
            });
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
        options.source = "core";

        authorize.save({
            db: countlyDb,
            multi: false,
            owner: req.session.uid,
            ttl: 300,
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

                    return res.send({path: countlyConfig.path + "/images/screenshots/" + imageName});
                });
            }
        });
    });

    app.get(countlyConfig.path + '/login/token/:token', function(req, res) {
        membersUtility.loginWithToken(req, function(member) {
            if (member) {
                var serverSideRendering = req.query.ssr || false;
                preventBruteforce.reset("login", member.username);
                var options = "";
                if (serverSideRendering) {
                    options += "ssr=" + serverSideRendering;
                }

                if (options && options.length) {
                    options = ("?").concat(options);
                }

                res.redirect(countlyConfig.path + '/dashboard' + options);
            }
            else {
                res.redirect(countlyConfig.path + '/login?message=login.result');
            }
        });
    });

    countlyDb.collection('apps').createIndex({"key": 1}, { unique: true }, function() {});
    countlyDb.collection('members').createIndex({"api_key": 1}, { unique: true }, function() {});
    countlyDb.collection('members').createIndex({ email: 1 }, { unique: true }, function() {});
    countlyDb.collection('jobs').createIndex({ finished: 1 }, function() {});
    countlyDb.collection('jobs').createIndex({ name: 1 }, function() {});
    countlyDb.collection('long_tasks').createIndex({ manually_create: 1, start: -1 }, function() {});

    app.listen(countlyConfig.web.port, countlyConfig.web.host || '');
});
