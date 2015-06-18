var plugin = {},
	common = require('../../../api/utils/common.js'),
	async = require('async'),
    plugins = require('../../pluginManager.js'),
	connections = {};

(function (plugin) {
	plugins.register("/o/db", function(ob){
		var dbs = {countly:common.db, countly_drill:common.drillDb};
		var params = ob.params;
		var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
		validateUserForMgmtReadAPI(function(){
			if(params.qstring.dbs && params.qstring.collection && params.qstring.document && params.qstring.collection.indexOf("system.indexes") == -1 && params.qstring.collection.indexOf("sessions_") == -1){
				if(dbs[params.qstring.dbs]){
					if(isObjectId(params.qstring.document)){
						params.qstring.document = common.db.ObjectID(params.qstring.document);
					}
					dbs[params.qstring.dbs].collection(params.qstring.collection).findOne({_id:params.qstring.document}, function(err, results){
						if(err) {
							console.error(err);
						} 
						common.returnOutput(params, results || {});
					});
				}
			}
			else if(params.qstring.dbs && params.qstring.collection && params.qstring.collection.indexOf("system.indexes") == -1 && params.qstring.collection.indexOf("sessions_") == -1){
				var limit = parseInt(params.qstring.limit || 20);
				var skip = parseInt(params.qstring.skip || 0);
				var filter = params.qstring.filter || "{}";
				try {
                    filter = JSON.parse(filter);
                } catch (SyntaxError) {
					filter = {};
				}
				if(filter._id && isObjectId(filter._id)){
					filter._id = common.db.ObjectID(filter._id);
				}
				if(dbs[params.qstring.dbs]){
					var cursor = dbs[params.qstring.dbs].collection(params.qstring.collection).find(filter);
					cursor.count(function (err, total) {
						cursor.skip(skip).limit(limit).toArray(function(err, results){
							if(err) {
								console.error(err);
							}
							results = results || [];
							common.returnOutput(params, {limit:limit, start:skip+1, end:Math.min(skip+limit, total), collections:results, total:total, pages:Math.ceil(total/limit), curPage:Math.ceil((skip+1)/limit)});
						});
					});
				}
			}
			else{
				async.map(Object.keys(dbs), getCollections, function (err, results) {
					if(err) {
						console.error(err);
					}
					if(results){
						results = results.filter(function(val) { return val !== null; });
					}
					common.returnOutput(params, results || []);
				});
					
				function getCollections(name, callback) {
					if(dbs[name]){
						dbs[name].collectionNames(function (err, results) {
							var db = {name:name, collections:[]};
							for (var r in results) {
								if(results[r].name.indexOf("system.indexes") == -1 && results[r].name.indexOf("sessions_") == -1){
									var col = parseCollectionName(results[r].name);
									db.collections.push(col.name);
								}
							}
							db.collections.sort();
							callback(err, db);
						});
					}
					else
						callback(null, null);
				}
			}
		}, params);		
		return true;
	});
	
	var parseCollectionName = function parseCollectionName(full_name) {
		var coll_parts = full_name.split('.');
		
		if (coll_parts.length <= 1) {
			return { name: coll_parts.join('.'), database: "countly" };
		}
		
		var database = coll_parts.splice(0,1);
		return { name: coll_parts.join('.'), database: database.toString() };
	};
	var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
	var isObjectId = function(id) {
		if(id == null) return false;
		if(id != null && 'number' != typeof id && (id.length != 24)) {
			return false;
		} else {
			// Check specifically for hex correctness
			if(typeof id == 'string' && id.length == 24) return checkForHexRegExp.test(id);
			return true;
		}
	};
}(plugin));

module.exports = plugin;