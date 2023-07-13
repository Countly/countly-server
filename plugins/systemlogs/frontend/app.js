var exported = {},
    common = require('../../../api/utils/common'),
    plugins = require('../../../plugins/pluginManager');

(function(plugin) {
    var countlyDb;
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
     * @param  {Object} data - data object
     * @param  {Object} before - before values
     * @param  {Object} after - after values
     */
    function compareChanges(data, before, after) {
        if (before && after) {
            if (typeof before._id !== "undefined") {
                before._id += "";
                data._id = before._id;
                if (typeof before.name !== "undefined") {
                    data.name = before.name;
                }
            }
            if (typeof after._id !== "undefined") {
                after._id += "";
            }
            compareChangesInside(data.after, data.before, before, after, Object.keys(after) || [], Object.keys(before) || []);
        }
    }

    /**
     * recursive function to compare changes
     * @param  {Object} dataafter - after data values
     * @param  {Object} databefore - before data values
     * @param  {Object} before - before
     * @param  {Object} after - after
     * @param  {Array} keys - keys for after object
     * @param  {Array} keys2 - keys for before object
     */
    function compareChangesInside(dataafter, databefore, before, after, keys, keys2) {
        for (let i = 0; i < keys2.length; i++) {
            if (keys.indexOf(keys2[i]) === -1) {
                keys.push(keys2[i]);
            }
        }
        for (let i = 0; i < keys.length; i++) {
            if (typeof after[keys[i]] !== "undefined" && typeof before[keys[i]] !== "undefined") {
                if (typeof after[keys[i]] === "object") {
                    if (Array.isArray(after[keys[i]])) {
                        if (JSON.stringify(after[keys[i]]) !== JSON.stringify(before[keys[i]])) {
                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                    }
                    else {
                        var keys00 = Object.keys(after[keys[i]]) || [];
                        var keys02 = Object.keys(before[keys[i]] || {}) || [];

                        if (keys00.length === 0 && keys02.length !== 0) {
                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                        else if (keys02.length === 0 && keys00.length !== 0) {
                            databefore[keys[i]] = before[keys[i]];
                            dataafter[keys[i]] = after[keys[i]];
                        }
                        else {
                            if (!databefore[keys[i]]) {
                                databefore[keys[i]] = {};
                            }
                            if (!dataafter[keys[i]]) {
                                dataafter[keys[i]] = {};
                            }
                            compareChangesInside(dataafter[keys[i]], databefore[keys[i]], before[keys[i]], after[keys[i]], keys00, keys02);
                            if (typeof dataafter[keys[i]] === "object" && typeof databefore[keys[i]] === "object" && (Object.keys(dataafter[keys[i]])).length === 0 && (Object.keys(databefore[keys[i]])).length === 0) {
                                delete databefore[keys[i]];
                                delete dataafter[keys[i]];
                            }
                        }
                    }
                }
                else {
                    if (after[keys[i]] !== before[keys[i]]) {
                        databefore[keys[i]] = before[keys[i]];
                        dataafter[keys[i]] = after[keys[i]];
                    }
                }
            }
            else {
                if (typeof after[keys[i]] !== 'undefined') {
                    dataafter[keys[i]] = after[keys[i]];
                    databefore[keys[i]] = {};
                }
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
        var PreventIPTracking = plugins.getConfig("systemlogs").preventIPTracking;
        if (PreventIPTracking) {
            log.ip = null;
        }
        else {
            log.ip = common.getIpAddress(req);
        }
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