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
        recordAction(ob.req, ob.data, "account_settings_updated", ob.data.change);
    };
    
    plugin.logAction = function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data._csrf;
        recordAction(ob.req, ob.user, ob.action, ob.data);
    };
    
    function recordAction(req, user, action, data){
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = getTimestamp();
        log.u = user.email || user.username || "";
        log.ip = getIpAddress(req);
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
    };
    
}(plugin));

module.exports = plugin;