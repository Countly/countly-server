var plugin = {},
	crypto = require("crypto");

(function (plugin) {
    var countlyDb;
	function getIpAddress(req) {
		var ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	
		/* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
		return ipAddress.split(',')[0];
	};
    
    function getTimestamp(){
        return Math.round(new Date().getTime()/1000);
    }
	
	function sha1Hash(str, addSalt) {
		var salt = (addSalt) ? new Date().getTime() : "";
		return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
	};
	plugin.init = function(app, db, express){
        countlyDb = db;
    };
    
    plugin.userLogout = function(ob){
        recordAction(ob.req, ob.data, "logout", ob.data.query || {});
    };
    
    plugin.passwordReset = function(ob){
        recordAction(ob.req, ob.data, "password_reset", {});
    };
    
    plugin.passwordRequest = function(ob){
        recordAction(ob.req, ob.data, "password_request", {});
    };
    
    plugin.loginSuccessful = function(ob){
        recordAction(ob.req, ob.data, "login_success", {});
    };
    
    plugin.loginFailed = function(ob){
        recordAction(ob.req, ob.data, "login_failed", {});
    };
    
    plugin.apikeySuccessful = function(ob){
        recordAction(ob.req, ob.data, "api-key_success", {});
    };
    
    plugin.apikeyFailed = function(ob){
        recordAction(ob.req, ob.data, "api-key_failed", {});
    };
    
    plugin.mobileloginSuccessful = function(ob){
        recordAction(ob.req, ob.data, "mobile_login_success", {});
    };
    
    plugin.mobileloginFailed = function(ob){
        recordAction(ob.req, ob.data, "mobile_login_failed", {});
    };
    
    plugin.userSettings = function(ob){
        var data = {};
        data.before = {};
        data.after = {};
        data.update = ob.data.change;
        compareChanges(data, ob.data, ob.data.change);
        if(typeof data.before.password != "undefined"){
            data.before.password = true;
            data.after.password = true;
        }
        recordAction(ob.req, ob.data, "account_settings_updated", data);
    };
    
    plugin.logAction = function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data._csrf;
        if(typeof ob.data.before != "undefined" && typeof ob.data.update != "undefined"){
            var data = {};
            if(typeof ob.data.app_id != "undefined")
                data.app_id = ob.data.app_id;
            if(typeof ob.data.user_id != "undefined")
                data.user_id = ob.data.user_id;
            if(typeof ob.data._id != "undefined")
                data._id = ob.data._id;
            data.before = {};
            data.after = {};
            data.update = ob.data.update;
            compareChanges(data, ob.data.before, ob.data.update);
            recordAction(ob.req, ob.user, ob.action, data);
        }
        else{
            recordAction(ob.req, ob.user, ob.action, ob.data);
        }
    };
    
    function compareChanges(data, before, after){
        for(var i in after){
            if(typeof after[i] == "object" && after[i] && before[i]){
                if(Array.isArray(after[i]) && JSON.stringify(after[i]) != JSON.stringify(before[i])){
                    data.before[i] = before[i];
                    data.after[i] = after[i];
                }
                else{
                    for (var propName in after[i]) {
                        if(after[i][propName] != before[i][propName]){
                            if(!data.before[i])
                                data.before[i] = {};
                            if(!data.after[i])
                                data.after[i] = {};
                            
                            data.before[i][propName] = before[i][propName];
                            data.after[i][propName] = after[i][propName];
                        }
                    }
                }
            }
            else if(after[i] != before[i]){
                data.before[i] = before[i];
                data.after[i] = after[i];
            }
        }
    }
    
    function recordAction(req, user, action, data){
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = getTimestamp();
        log.u = user.email || user.username || "";
        log.ip = getIpAddress(req);
        if(typeof data.app_id != "undefined")
            log.app_id = data.app_id;
        if(user._id){
            log.user_id = user._id + "";
            countlyDb.collection('systemlogs').insert(log, function () {});
        }
        else{
            var query = {};
            if(user.username)
                query = {$or: [ {"username":user.username}, {"email":user.username} ]};
            else if(user.email)
                query.email = user.email;
            if(Object.keys(query).length){
                countlyDb.collection('members').findOne(query, function(err, res){
                    if(!err && res){
                        log.user_id = res._id + "";
                        if(log.u == ""){
                            log.u = res.email || res.username;
                        }
                    }
                     countlyDb.collection('systemlogs').insert(log, function () {});
                });
            }
            else{
                countlyDb.collection('systemlogs').insert(log, function () {});
            }
        }
        var update = {};
        update["a."+countlyDb.encode(action)] = true;
        countlyDb.collection("systemlogs").update({_id:"meta_v2"}, {$set:update}, {upsert:true}, function(err, res){});
    };
    
}(plugin));

module.exports = plugin;