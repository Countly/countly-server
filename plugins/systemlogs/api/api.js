var plugin = {},
	common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
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
            }
            if(params.qstring.sSearch && params.qstring.sSearch != ""){
                query["i"] = {"$regex": new RegExp(".*"+params.qstring.sSearch+".*", 'i')};
                //filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
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
        var data = {};
        data.before = {};
        data.after = {};
        data.update = ob.data.update;
		data.app_id = ob.appId;
        compareChanges(data, ob.data.app, ob.data.update);
        recordAction(ob.params, ob.params.member, "app_updated", data);
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
        
        var data = {};
        data.user_id = ob.data._id;
        data.before = {};
        data.after = {};
        data.update = ob.data;
        compareChanges(data, ob.member, ob.data);
        if(typeof data.before.password != "undefined"){
            data.before.password = true;
            data.after.password = true;
        }
        recordAction(ob.params, ob.params.member, "user_updated", data);
	});
	
	plugins.register("/i/users/delete", function(ob){
        ob.data = JSON.parse(JSON.stringify(ob.data));
        delete ob.data.password;
        recordAction(ob.params, ob.params.member, "user_deleted", ob.data);
	});
    
    plugins.register("/i/app_users/create", function(ob){
        ob.params = ob.params || {};
        var data = {app_id:ob.app_id, user:ob.user, uids:ob.user.uid || "", res:ob.res};
        recordAction(ob.params, ob.params.member || {_id:"", username:"[code]"}, "app_user_created", data);
	});
    
    plugins.register("/i/app_users/update", function(ob){
        ob.params = ob.params || {};
        var data = {app_id:ob.app_id, query:ob.query, update:JSON.stringify(ob.update), before:ob.user};
        recordAction(ob.params, ob.params.member || {_id:"", username:"[code]"}, "app_user_updated", data);
	});
    
    plugins.register("/i/app_users/delete", function(ob){
        ob.params = ob.params || {};
        var data = {app_id:ob.app_id, query:ob.query, uids:ob.uids};
        recordAction(ob.params, ob.params.member || {_id:"", username:"[code]"}, "app_user_deleted", data);
	});
    
    plugins.register("/systemlogs", function(ob){
        var user = ob.user || ob.params.member;
        if(typeof ob.data.before != "undefined" && typeof ob.data.update != "undefined"){
            var data = {};
            for(var i in ob.data){
                if(i != "before" && i != "after"){
                    data[i] = ob.data[i];
                }
            }
            data.before = {};
            data.after = {};
            compareChanges(data, ob.data.before, ob.data.update);
            recordAction(ob.params, user, ob.action, data);
        }
        else{
            recordAction(ob.params, user, ob.action, ob.data);
        }
    });
    
    //recursive function to compare changes
    function compareChangesInside(dataafter,databefore,before,after){
        var keys = Object.keys(after);
        var keys2 = Object.keys(before);
        for(var i=0; i<keys2.length; i++)
        {
            if(!after[keys2[i]])
                keys.push(keys2[i]);
        }
        
        for(var i=0; i<keys.length; i++)
        {
            if(typeof after[keys[i]]!== "undefined" && typeof before[keys[i]]!== "undefined")
            {
                if(typeof after[keys[i]] == "object")
                {
                    if(Array.isArray(after[keys[i]]) && JSON.stringify(after[keys[i]]) != JSON.stringify(before[keys[i]])){
                        databefore[keys[i]] = before[keys[i]];
                        dataafter[keys[i]] = after[keys[i]];
                    }
                    else{
                        if(!databefore[keys[i]])
                            databefore[keys[i]] = {};
                        if(!dataafter[keys[i]])
                            dataafter[keys[i]] = {};
                                    
                        compareChangesInside(dataafter[keys[i]],databefore[keys[i]],before[keys[i]],after[keys[i]]);
                        if(typeof dataafter[keys[i]] == "object" && typeof databefore[keys[i]] =="object" && Object.keys(dataafter[keys[i]])==0 && Object.keys(databefore[keys[i]])==0)
                        {
                            delete databefore[keys[i]];
                            delete dataafter[keys[i]];
                        }
                    }
                }
                else
                {
                    if(after[keys[i]] != before[keys[i]])
                    {
                        databefore[keys[i]] = before[keys[i]];
                        dataafter[keys[i]] = after[keys[i]];
                    }
                }
            }
            else
            {
                if(typeof after[keys[i]] == 'undefined')
                {
                    dataafter[keys[i]] = {};
                    databefore[keys[i]] = before[keys[i]];
                }
                else
                {
                    dataafter[keys[i]] = after[keys[i]];
                    databefore[keys[i]] = {};
                }   
            }
        }
    }
    
    function compareChanges(data, before, after){
        if(before && after){
            if(typeof before._id != "undefined")
                before._id += "";
            if(typeof after._id != "undefined")
                after._id += ""; 
            compareChangesInside(data.after,data.before,before,after);
        }
    }
    
    function recordAction(params, user, action, data){
        var log = {};
        log.a = action;
        log.i = data;
        log.ts = Math.round(new Date().getTime()/1000);
        log.cd = new Date();
        log.u = user.email || user.username || "";
        log.ip = common.getIpAddress(params.req);
        if(typeof data.app_id != "undefined")
            log.app_id = data.app_id;
        if(user._id){
            log.user_id = user._id + "";
            if(log.u =="")
            {
                common.db.collection('members').findOne({_id:common.db.ObjectID.createFromHexString(user._id)}, function(err, res){
                    if(!err && res){
                        log.u = res.email || res.username;
                    }
                     common.db.collection('systemlogs').insert(log, function () {});
                });
            }
            else
            {
                common.db.collection('systemlogs').insert(log, function () {});
            }
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