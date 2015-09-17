var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	
	//read api call
	plugins.register("/o", function(ob){
		var params = ob.params
		var validate = ob.validateUserForGlobalAdmin;
		if(params.qstring.method == 'systemlogs'){
            validate(params, function(params){
				common.db.collection('systemlogs').find().sort( { $natural: -1 } ).limit(1000).toArray(function(err, items) {
					if(err)
						console.log(err);
					common.returnOutput(params, items);
				});
			});
			return true;
		}
	});
	
	plugins.register("/i/apps/create", function(ob){
		var appId = ob.appId;
		var params = ob.params;
		var data = {_id:appId, name:ob.data.name};
		var now = Math.round(new Date().getTime()/1000);
		common.db.collection('systemlogs').insert({ts:now, a:"App Created", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/apps/update", function(ob){
		var appId = ob.appId;
		var params = ob.params;
		var data = ob.data;
		data._id = appId;
		var now = Math.round(new Date().getTime()/1000);
		common.db.collection('systemlogs').insert({ts:now, a:"App Updated", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		var params = ob.params;
		var now = Math.round(new Date().getTime()/1000);
		var data = ob.data;
		common.db.collection('systemlogs').insert({ts:now, a:"App Deleted", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
		var params = ob.params;
		var now = Math.round(new Date().getTime()/1000);
		var data = {_id:appId, name:ob.data.name};
		common.db.collection('systemlogs').insert({ts:now, a:"App Reset", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/users/create", function(ob){
		var params = ob.params;
		var data = ob.data;
		var now = Math.round(new Date().getTime()/1000);
		common.db.collection('systemlogs').insert({ts:now, a:"User Created", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/users/update", function(ob){
		var params = ob.params;
		var data = ob.data;
		var now = Math.round(new Date().getTime()/1000);
		common.db.collection('systemlogs').insert({ts:now, a:"User Updated", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
	
	plugins.register("/i/users/delete", function(ob){
		var params = ob.params;
		var data = ob.data;
		var now = Math.round(new Date().getTime()/1000);
		common.db.collection('systemlogs').insert({ts:now, a:"User Deleted", u:params.member.email, ip:common.getIpAddress(params.req), i:data}, function () {});
	});
}(plugin));

module.exports = plugin;