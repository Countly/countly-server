var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    stores = require("../stores.json"),
	fetch = require('../../../api/parts/data/fetch.js'),
    urlParse = require('url');

(function (plugin) {
	plugins.register("/worker", function(ob){
		common.dbUserMap['source'] = 'src';
	});
    plugins.register("/o/method/total_users", function(ob){
        ob.shortcodesForMetrics["sources"] = "src";
    });
	plugins.register("/session/metrics", function(ob){
		var predefinedMetrics = ob.predefinedMetrics;
        var params = ob.params;
        var user = ob.user;
        if (params.qstring.metrics && (!user || typeof user[common.dbUserMap['source']] == "undefined")) {
            if(typeof params.qstring.metrics._store == "undefined" && params.qstring.metrics._os){
                params.qstring.metrics._store = params.qstring.metrics._os;
            }
        }
        if(params.qstring.metrics && typeof params.qstring.metrics._store != "undefined"){
            params.qstring.metrics._store = common.db.encode(params.qstring.metrics._store);
        }
		predefinedMetrics.push({
            db: "sources",
            metrics: [
                { name: "_store", set: "sources", short_code: common.dbUserMap['source'] }
            ]
        });
	});
	plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "sources") {
			validateUserForDataReadAPI(params, fetch.fetchTimeObj, 'sources');
			return true;
		}
		return false;
	});
    
    plugins.register("/o/keywords", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
        validateUserForDataReadAPI(params, function(){
            var check = {
                "q":true, 
                "search":true,
                "searchfor": true,
                "query": true,
                "wd":"baidu", //only for baidu domains
                "p":"yahoo" //only for yahoo domains
            };
            fetch.getMetric(params, "sources", null, function(data){
                var result = [];
                for(var i = 0; i < data.length; i ++){
                    var parts = urlParse.parse(decodeURIComponent(common.db.decode(data[i]._id)), true);
                    if(parts.hostname && parts.query){
                        for(var c in check){
                            if(typeof parts.query[c] != "undefined" && parts.query[c] != ""){
                                if(typeof check[c] === "boolean" || (typeof check[c] === "string" && parts.hostname.indexOf(check[c]) !== -1)){
                                    data[i]._id = common.db.encode(parts.query[c]+"");
                                    result.push(data[i]);
                                    break;
                                }
                            }
                        }
                    }
                }
                common.returnOutput(params, result);
            });
        });
		return true;
	});
    
    plugins.register("/o/sources", function(ob){
		common.returnOutput(ob.params, stores);
		return true;
	});
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}},function(){});
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
		common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}},function(){});
	});
    
    plugins.register("/i/apps/clear_all", function(ob){
		var appId = ob.appId;
		common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}},function(){});
	});
    
    plugins.register("/i/apps/clear", function(ob){
		var appId = ob.appId;
        var ids = ob.ids;
		common.db.collection('sources').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:ids}}]},function(){});
	});
}(plugin));

module.exports = plugin;