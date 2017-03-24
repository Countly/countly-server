var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	//write api call
	plugins.register("/i", function(ob){
		var params = ob.params;
		var now = Math.round(new Date().getTime()/1000);
		var ts = common.initTimeObj(null, params.qstring.timestamp || now).timestamp;
		var device = {};
		device.id = params.qstring.device_id || "";
		var location = {};
		location.ip = params.ip_address;
        var sdk = {};
        sdk.version = params.qstring.sdk_version;
        sdk.name = params.qstring.sdk_name;
		var version = (params.qstring.metrics) ? (params.qstring.metrics._app_version || "") : "";
        var result = params.app_user;
		if(result){
			if(result.d)
				device.d = result.d;
			if(result.p)
				device.p = result.p;
			if(result.pv)
				device.pv = result.pv;
			
			if(result.cc)
				location.cc = result.cc;
			if(result.cty)
				location.cty = result.cty;
			version = result.av || version;
		}
		var types = {};
		if (params.qstring.begin_session) {
			if(!types["session"])
                types["session"] = {};
			types["session"]["begin_session"] = params.qstring.begin_session;
		}
		if (params.qstring.session_duration) {
			if(!types["session"])
                types["session"] = {};
			types["session"]["session_duration"] = params.qstring.session_duration;
		}
		if (params.qstring.end_session) {
			if(!types["session"])
                types["session"] = {};
			types["session"]["end_session"] = params.qstring.end_session;
		}
		if (params.qstring.metrics) {
			types["metrics"] = params.qstring.metrics;
            if(types["metrics"] && typeof types["metrics"] == "object"){
                types["metrics"] = JSON.stringify(types["metrics"]);
            }
		}
		if (params.qstring.events) {
			types["events"] = params.qstring.events;
            if(types["events"] && typeof types["events"] == "object"){
                types["events"] = JSON.stringify(types["events"]);
            }
				
		}
        if (params.qstring.user_details) {
			types["user_details"] = params.qstring.user_details;
            if(types["user_details"] && typeof types["user_details"] == "object"){
                types["user_details"] = JSON.stringify(types["user_details"]);
            }
		}
        if (params.qstring.crash) {
			types["crash"] = params.qstring.crash;
            if(types["crash"] && typeof types["crash"] == "object"){
                types["crash"] = JSON.stringify(types["crash"]);
            }
		}
        common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:types, q:JSON.stringify(params.qstring), s:sdk, h:params.req.headers, m:params.req.method, b:params.bulk || false}, function () {});
	});
	
	//read api call
	plugins.register("/o", function(ob){
		var params = ob.params
		var validate = ob.validateUserForDataReadAPI;
		if(params.qstring.method == 'logs'){
            var filter = {};
            if(typeof params.qstring.filter !== "undefined"){
                try{
                    filter = JSON.parse(params.qstring.filter);
                }
                catch(ex){filter = {}}
            }
            validate(params, function(params){
				common.db.collection('logs' + params.app_id).find(filter).toArray(function(err, items) {
					if(err)
						console.log(err);
					common.returnOutput(params, items);
				});
			});
			return true;
		}
	});
    
    plugins.register("/i/apps/create", function(ob){
		var params = ob.params;
		var appId = ob.appId;
        common.db.command({"convertToCapped": 'logs' + appId, size: 10000000, max: 1000}, function(err,data){
            if(err){
                common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function(err,data){});
            }
        });
	});
    plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('logs' + appId).drop(function() {});
	});
    plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
        common.db.collection('logs' + appId).drop(function() {
            common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function(){});
        });
	});
    
    plugins.register("/i/apps/clear_all", function(ob){
        var appId = ob.appId;
        common.db.collection('logs' + appId).drop(function() {
            common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function(){});
        });
    });
}(plugin));

module.exports = plugin;