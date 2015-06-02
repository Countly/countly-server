var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	//write api call
	plugins.register("/i", function(ob){
		var params = ob.params;
		var now = Math.round(new Date().getTime()/1000);
		var ts = (params.qstring.timestamp) ? parseInt(params.qstring.timestamp) : now;
		var device = {};
		device.id = params.qstring.device_id || "";
		var location = {};
		location.ip = params.ip_address;
		var version = "";
		common.db.collection('app_users' + params.app_id).findOne({'_id':params.app_user_id}, function (err, result) {
			if(err)
				console.log(err);
			else if(result){
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
			var known = false;
			if (params.qstring.begin_session) {
				known = true;
				var type = "session";
				var info = {"begin_session":params.qstring.begin_session};
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
			if (params.qstring.session_duration) {
				known = true;
				var type = "session";
				var info = {"session_duration":params.qstring.session_duration};
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
			if (params.qstring.end_session) {
				known = true;
				var type = "session";
				var info = {"end_session":params.qstring.end_session};
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
			if (params.qstring.metrics) {
				known = true;
				var type = "metrics";
				var info = params.qstring.metrics;
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
			if (params.qstring.events) {
				known = true;
				var events = params.qstring.events;
				if(events.constructor === Array)
					for (var i=0; i < events.length; i++) {
						var type = "event";
						var info = events[i];
						common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
					}
				else{
					var type = "event";
					var info = events;
					common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
				}
					
			}
            if (params.qstring.user_details) {
				known = true;
				var type = "user_details";
				var info = params.qstring.user_details;
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
            if (params.qstring.crash) {
				known = true;
				var type = "crash";
				var info = params.qstring.crash;
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
			if(!known){
				var type = "unknown";
				var info = {};
				for(var i in params.qstring){
					if(i != "app_key" && i != "device_id" && i != "ip_address" && i != "timestamp")
						info[i] = params.qstring[i];
				}
				common.db.collection('logs' + params.app_id).insert({ts:ts, reqts:now, d:device, l:location, v:version, t:type, i:info}, function () {});
			}
		});
	});
	
	//read api call
	plugins.register("/o", function(ob){
		var params = ob.params
		var validate = ob.validateUserForDataReadAPI;
		if(params.qstring.method == 'logs'){
            validate(params, function(params){
				common.db.collection('logs' + params.app_id).find().toArray(function(err, items) {
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
		common.db.createCollection('logs' + appId, {capped: true, size: 10000000, max: 1000}, function(){});
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
}(plugin));

module.exports = plugin;