var exported = {},
    countlyConfig = require('../../../api/config', 'dont-enclose');

(function(plugin) {
    var countlyDb;
    /**
     * Function to get ip address
     * @param  {Object} req - req object
     * @returns {string} ip
     */
    function getIpAddress(req) {
        var ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : '');
        /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
        var ips = ipAddress.split(',');

        //if ignoreProxies not setup, use outmost left ip address
        if (!countlyConfig.ignoreProxies || !countlyConfig.ignoreProxies.length) {
            return ips[0];
        }
        //search for the outmost right ip address ignoring provided proxies
        var ip = "";
        for (var i = ips.length - 1; i >= 0; i--) {
            if (ips[i].trim() !== "127.0.0.1" && (!countlyConfig.ignoreProxies || countlyConfig.ignoreProxies.indexOf(ips[i].trim()) === -1)) {
                ip = ips[i].trim();
                break;
            }
        }
        return ip;
    }
    /**
     * Function to get timestamp
     * @returns {number} timestamp
     */
    function getTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }

    plugin.init = function(app, db) {
        countlyDb = db;
    };

    plugin.userLogout = function(ob) {
        recordAction(ob.req, ob.data, "logout", ob.data.query || {});
    };

    plugin.passwordReset = function(ob) {
        recordAction(ob.req, ob.data, "password_reset", {});
    };

    plugin.passwordRequest = function(ob) {
        recordAction(ob.req, ob.data, "password_request", {});
    };

    plugin.loginSuccessful = function(ob) {
        recordAction(ob.req, ob.data, "login_success", {});
    };

    plugin.loginFailed = function(ob) {
        recordAction(ob.req, ob.data, "login_failed", {});
    };

    plugin.apikeySuccessful = function(ob) {
        recordAction(ob.req, ob.data, "api-key_success", {});
    };

    plugin.apikeyFailed = function(ob) {
        recordAction(ob.req, ob.data, "api-key_failed", {});
    };

    plugin.mobileloginSuccessful = function(ob) {
        recordAction(ob.req, ob.data, "mobile_login_success", {});
    };

    plugin.mobileloginFailed = function(ob) {
        recordAction(ob.req, ob.data, "mobile_login_failed", {});
    };

    plugin.tokenLoginFailed = function(ob) {
        recordAction(ob.req, ob.data, "token_login_failed", {});
    };

    plugin.tokenLoginSuccessful = function(ob) {
        recordAction(ob.req, ob.data, "token_login_successfull", {});
    };

    plugin.accountDeleted = function(ob) {
        recordAction(ob.req, ob.data, "user_account_deleted", {});
    };

    plugin.userSettings = function(ob) {
        var data = {};
        data.before = {};
        data.after = {};
        data.update = ob.data.change;
        compareChanges(data, ob.data, ob.data.change);
        if (typeof data.before.password !== "undefined") {
            data.before.password = true;
            data.after.password = true;
        }
        recordAction(ob.req, ob.data, "account_settings_updated", data);
    };

    plugin.logAction = function(ob) {
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data._csrf;
        if (typeof ob.data.before !== "undefined" && typeof ob.data.update !== "undefined") {
            var data = {};
            for (var i in ob.data) {
                if (i !== "before" && i !== "after") {
                    data[i] = ob.data[i];
                }
            }
            data.before = {};
            data.after = {};
            compareChanges(data, ob.data.before, ob.data.update);
            recordAction(ob.req, ob.user, ob.action, data);
        }
        else {
            recordAction(ob.req, ob.user, ob.action, ob.data);
        }
    };
    /**
     * Function to compare changes
     * @param  {Object} data - The data object
     * @param  {Array} before - before data
     * @param  {Array} after - after data
     */
    function compareChanges(data, before, after) {
        for (var i in after) {
            if (typeof after[i] === "object" && after[i] && before[i]) {
                if (Array.isArray(after[i]) && JSON.stringify(after[i]) !== JSON.stringify(before[i])) {
                    data.before[i] = before[i];
                    data.after[i] = after[i];
                }
                else {
                    for (var propName in after[i]) {
                        if (after[i][propName] !== before[i][propName]) {
                            if (!data.before[i]) {
                                data.before[i] = {};
                            }
                            if (!data.after[i]) {
                                data.after[i] = {};
                            }

                            data.before[i][propName] = before[i][propName];
                            data.after[i][propName] = after[i][propName];
                        }
                    }
                }
            }
            else if (after[i] !== before[i]) {
                data.before[i] = before[i];
                data.after[i] = after[i];
            }
        }
    }
    /**
     * Function to record action
     * @param  {Object} req - The request object
     * @param  {Object} user - User data object
     * @param  {String} action - Action 
     * @param  {Object} data - Data object
     */
    function recordAction(req, user, action, data) {
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = getTimestamp();
        log.cd = new Date();
        log.u = user.email || user.username || "";
        log.ip = getIpAddress(req);
        if (typeof data.app_id !== "undefined") {
            log.app_id = data.app_id;
        }
        if (user._id) {
            log.user_id = user._id + "";
            countlyDb.collection('systemlogs').insert(log, function() {});
        }
        else {
            var query = {};
            if (user.username) {
                query = {$or: [ {"username": user.username}, {"email": user.username} ]};
            }
            else if (user.email) {
                query.email = user.email;
            }
            if (Object.keys(query).length) {
                countlyDb.collection('members').findOne(query, function(err, res) {
                    if (!err && res) {
                        log.user_id = res._id + "";
                        if (log.u === "") {
                            log.u = res.email || res.username;
                        }
                    }
                    countlyDb.collection('systemlogs').insert(log, function() {});
                });
            }
            else {
                countlyDb.collection('systemlogs').insert(log, function() {});
            }
        }
        var update = {};
        update["action." + countlyDb.encode(action)] = true;
        countlyDb.collection("systemlogs").update({_id: "meta_v2"}, {$set: update}, {upsert: true}, function() {});
    }

}(exported));

module.exports = exported;