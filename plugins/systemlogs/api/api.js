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
    
    plugins.register("/i/systemlogs", function(ob){
		var params = ob.params;
        if(typeof params.qstring.data === "string"){
            try{
                params.qstring.data = JSON.parse(params.qstring.data);
            }
            catch(ex){
                console.log("Error parsing systemlogs data", params.qstring.data);
            }
        }
        if(typeof params.qstring.action == "string")
            recordAction(params, {}, params.qstring.action, params.qstring.data);
	});
	
	plugins.register("/i/apps/create", function(ob){
        ob.data._id = ob.appId;
        recordAction(ob.params, params.member, "App Created", ob.data);
	});
	
	plugins.register("/i/apps/update", function(ob){
		var appId = ob.appId;
		ob.data._id = appId;
        recordAction(ob.params, params.member, "App Updated", ob.data);
	});
	
	plugins.register("/i/apps/delete", function(ob){
        recordAction(ob.params, params.member, "App Deleted", ob.data);
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
        ob.data._id = appId;
        recordAction(ob.params, params.member, "App Reset", ob.data);
	});
	
	plugins.register("/i/users/create", function(ob){
        recordAction(ob.params, params.member, "User Created", ob.data);
	});
	
	plugins.register("/i/users/update", function(ob){
        recordAction(ob.params, params.member, "User Updated", ob.data);
	});
	
	plugins.register("/i/users/delete", function(ob){
        recordAction(ob.params, params.member, "User Deleted", ob.data);
	});
    
    plugins.register("/systemlogs", function(ob){
        var user = ob.user || params.member;
        recordAction(ob.params, user, ob.action, ob.data);
    });
    
    function recordAction(params, user, action, data){
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = Math.round(new Date().getTime()/1000);
        log.u = user.email || user.username || "";
        log.ip = common.getIpAddress(params.req);
        if(user._id){
            log.user_id = user._id;
            common.db.collection('systemlogs').insert(log, function () {});
        }
        else{
            var query = {};
            if(user.username)
                query.username = user.username;
            else if(user.email)
                query.email = user.email;
            else if (params.qstring.api_key)
                query.api_key = params.qstring.api_key;
            if(Object.keys(query).length){
                common.db.collection('members').findOne(query, function(err, res){
                    if(!err && res){
                        log.user_id = res._id;
                        if(log.u == ""){
                            log.u = res.email || res.username;
                        }
                    }
                     common.db.collection('systemlogs').insert(log, function () {});
                });
            }
            else{
                common.db.collection('systemlogs').insert(log, function () {});
            }
        }
    };
}(plugin));

module.exports = plugin;