var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
	fetch = require('../../../api/parts/data/fetch.js');

(function (plugin) {
	plugins.register("/worker", function(ob){
		common.dbUserMap['density'] = 'dnst';
	});
    plugins.register("/o/method/total_users", function(ob){
        ob.shortcodesForMetrics["densities"] = "dnst";
    });
	plugins.register("/session/metrics", function(ob){
        var params = ob.params;
        if (params.qstring.metrics["_os"] && params.qstring.metrics["_density"]) {		
            if(common.os_mapping[params.qstring.metrics["_os"].toLowerCase()])		
                params.qstring.metrics["_density"] = common.os_mapping[params.qstring.metrics["_os"].toLowerCase()] + params.qstring.metrics["_density"];		
            else		
                params.qstring.metrics["_density"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_density"];		
        }
		var predefinedMetrics = ob.predefinedMetrics;
		predefinedMetrics.push({
            db: "density",
            metrics: [
                { name: "_density", set: "density", short_code: common.dbUserMap['density'] }
            ]
        });
	});
	plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "density") {
			validateUserForDataReadAPI(params, fetch.fetchTimeObj, 'density');
			return true;
		}
		return false;
	});
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('density').remove({'_id': {$regex: appId + ".*"}},function(){});
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
		common.db.collection('density').remove({'_id': {$regex: appId + ".*"}},function(){});
	});
    
    plugins.register("/i/apps/clear", function(ob){
		var appId = ob.appId;
        var ids = ob.ids;
		common.db.collection('density').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:ids}}]},function(){});
	});
}(plugin));

module.exports = plugin;