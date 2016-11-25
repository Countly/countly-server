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
            }
            query._id = {$ne:"meta_v2"};
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
        else if(params.qstring.method == 'systemlogs_meta'){
            validate(params, function(params){
                //get all users
                common.db.collection('members').find({}, {username:1, email:1, full_name:1}).toArray(function(err, users){
                    common.db.collection('systemlogs').findOne({_id:"meta_v2"}, {_id:0}, function(err, res){
                        var result = {};
                        if(!err && res){
                            for(var i in res){
                                result[i] = Object.keys(res[i]).map(function(arg){return common.db.decode(arg);});
                            }
                        }
                        result.users = users || [];
                        common.returnOutput(params, result);
                    });
                });
            });
            return true;
        }
	});
    
    plugins.register("/i/systemlogs", function(ob){
		var params = ob.params;
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
            params.member = member;
            if(typeof params.qstring.data === "string"){
                try{
                    params.qstring.data = JSON.parse(params.qstring.data);
                }
                catch(ex){
                    console.log("Error parsing systemlogs data", params.qstring.data);
                }
            }
            if(typeof params.qstring.action == "string")
                recordAction(params, {}, params.qstring.action, params.qstring.data || {});
            
            common.returnOutput(params, {result:"Success"});
        });
        return true;
	});
	
	plugins.register("/i/apps/create", function(ob){
        ob.data.app_id = ob.appId;
        recordAction(ob.params, ob.params.member, "app_created", ob.data);
	});
	
	plugins.register("/i/apps/update", function(ob){
		var appId = ob.appId;
		ob.data.app_id = appId;
        recordAction(ob.params, ob.params.member, "app_updated", ob.data);
	});
	
	plugins.register("/i/apps/delete", function(ob){
        ob.data.app_id = ob.data._id;
        recordAction(ob.params, ob.params.member, "app_deleted", ob.data);
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
        ob.data.app_id = appId;
        recordAction(ob.params, ob.params.member, "app_reset", ob.data);
	});
    
    plugins.register("/i/apps/clear_all", function(ob){
		var appId = ob.appId;
        ob.data.app_id = appId;
        recordAction(ob.params, ob.params.member, "clear_all", ob.data);
	});
    
    plugins.register("/i/apps/clear", function(ob){
		var appId = ob.appId;
        ob.data.app_id = appId;
        ob.data.before = ob.moment.format("YYYY-MM-DD");
        recordAction(ob.params, ob.params.member, "app_clear_old_data", ob.data);
	});
	
	plugins.register("/i/users/create", function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data.password;
        recordAction(ob.params, ob.params.member, "user_created", ob.data);
	});
	
	plugins.register("/i/users/update", function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        if(ob.data.password)
            ob.data.password = true;
        recordAction(ob.params, ob.params.member, "user_updated", ob.data);
	});
	
	plugins.register("/i/users/delete", function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data.password;
        recordAction(ob.params, ob.params.member, "user_deleted", ob.data);
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
        if(typeof data.app_id != "undefined")
            log.app_id = data.app_id;
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
        }
        var update = {};
        update["a."+common.db.encode(action)] = true;
        common.db.collection("systemlogs").update({_id:"meta_v2"}, {$set:update}, {upsert:true}, function(){});
    };
}(plugin));

module.exports = plugin;