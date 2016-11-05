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
        recordAction(ob.req, ob.data, "Logout", {});
    };
    
    plugin.passwordReset = function(ob){
        recordAction(ob.req, ob.data, "Password reset", {});
    };
    
    plugin.passwordRequest = function(ob){
        recordAction(ob.req, ob.data, "Password request", {});
    };
    
    plugin.loginSuccessful = function(ob){
        recordAction(ob.req, ob.data, "Login Successful", {});
    };
    
    plugin.loginFailed = function(ob){
        recordAction(ob.req, ob.data, "Login Unsuccessful", {});
    };
    
    plugin.apikeySuccessful = function(ob){
        recordAction(ob.req, ob.data, "API KEY Successful", {});
    };
    
    plugin.apikeyFailed = function(ob){
        recordAction(ob.req, ob.data, "API KEY Unsuccessful", {});
    };
    
    plugin.mobileloginSuccessful = function(ob){
        recordAction(ob.req, ob.data, "Mobile Login Successful", {});
    };
    
    plugin.mobileloginFailed = function(ob){
        recordAction(ob.req, ob.data, "Mobile Login Unsuccessful", {});
    };
    
    plugin.userSettings = function(ob){
        recordAction(ob.req, ob.data, "Settings changed", ob.data.change);
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