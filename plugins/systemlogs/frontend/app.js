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
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Settings changed", u:ob.data.email, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.passwordReset = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Password reset", u:ob.data.email, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.passwordRequest = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Password request", u:ob.data.email, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.loginSuccessful = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Login Successful", u:ob.data.email+" ("+ob.data.username+")", ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.loginFailed = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Login Unsuccessful", u:ob.data.username, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.apikeySuccessful = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"API KEY Successful", u:ob.data.email+" ("+ob.data.username+")", ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.apikeyFailed = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"API KEY Unsuccessful", u:ob.data.username, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.mobileloginSuccessful = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Mobile Login Successful", u:ob.data.email+" ("+ob.data.username+")", ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.mobileloginFailed = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Mobile Login Unsuccessful", u:ob.data.username, ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
    plugin.userSettings = function(ob){
        countlyDb.collection('systemlogs').insert({ts:getTimestamp(), a:"Settings changed", u:ob.data.email+" ("+ob.data.username+")", ip:getIpAddress(ob.req), i:""}, function () {});
    };
    
}(plugin));

module.exports = plugin;