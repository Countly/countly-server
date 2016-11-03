var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	
	//read api call
	plugins.register("/o", function(ob){
		var params = ob.params
		var validate = ob.validateUserForGlobalAdmin;
		if(params.qstring.method == 'systemlogs'){
            var query = {};
            if(typeof params.qstring.query === "string"){
                try{
                    query = JSON.parse(params.qstring.query);
                }
                catch(ex){
                    console.log("Can't parse systelogs query");
                    query = {};
                }
                if(params.qstring.sSearch && params.qstring.sSearch != ""){
                    query["i"] = {"$regex": new RegExp(".*"+params.qstring.sSearch+".*", 'i')};
                    //filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
                }
                query._id = {$ne:"meta_v2"};
            }
            validate(params, function(params){
                var columns = ["ts", "u", "a", "ip", "i"];
                common.db.collection('systemlogs').count({},function(err, total) {
                    total--;
                    var cursor = common.db.collection('systemlogs').find(query);
                    cursor.count(function (err, count) {
                        if(params.qstring.iDisplayStart && params.qstring.iDisplayStart != 0)
                            cursor.skip(parseInt(params.qstring.iDisplayStart));
                        if(params.qstring.iDisplayLength && params.qstring.iDisplayLength != -1)
                            cursor.limit(parseInt(params.qstring.iDisplayLength));
                        if(params.qstring.iSortCol_0 && params.qstring.sSortDir_0){
                            var ob = {};
                            ob[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 == "asc") ? 1 : -1;
                            cursor.sort(ob);
                        }
                    
                        cursor.toArray(function(err, res) {
                            if(err)
                                console.log(err);
                            res = res || [];
                            common.returnOutput(params, {sEcho:params.qstring.sEcho, iTotalRecords:total, iTotalDisplayRecords:count, aaData:res});
                        });
                    });
                });
			});
			return true;
		}
        else if(params.qstring.method == 'systemlogs_actions'){
            validate(params, function(params){
                common.db.collection('systemlogs').findOne({_id:"meta_v2"}, {_id:0}, function(err, res){
                    var result = [];
                    if(!err && res){
                        result = Object.keys(res).map(function(arg){return common.db.decode(arg);});
                    }
                    common.returnOutput(params, result);
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
        recordAction(ob.params, ob.params.member, "App Created", ob.data);
	});
	
	plugins.register("/i/apps/update", function(ob){
		var appId = ob.appId;
		ob.data._id = appId;
        recordAction(ob.params, ob.params.member, "App Updated", ob.data);
	});
	
	plugins.register("/i/apps/delete", function(ob){
        recordAction(ob.params, ob.params.member, "App Deleted", ob.data);
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
        ob.data._id = appId;
        recordAction(ob.params, ob.params.member, "App Reset", ob.data);
	});
	
	plugins.register("/i/users/create", function(ob){
        recordAction(ob.params, ob.params.member, "User Created", ob.data);
	});
	
	plugins.register("/i/users/update", function(ob){
        recordAction(ob.params, ob.params.member, "User Updated", ob.data);
	});
	
	plugins.register("/i/users/delete", function(ob){
        recordAction(ob.params, ob.params.member, "User Deleted", ob.data);
	});
    
    plugins.register("/systemlogs", function(ob){
        var user = ob.user || ob.params.member;
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
            log.user_id = user._id + "";
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
                        log.user_id = res._id + "";
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
            common.db.collection("systemlogs").update({_id:"meta_v2"}, {$set:{a:common.db.encode(action)}}, {upsert:true}, function(){});
        }
    };
}(plugin));

module.exports = plugin;