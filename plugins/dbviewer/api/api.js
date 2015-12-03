var plugin = {},
	common = require('../../../api/utils/common.js'),
	async = require('async'),
	crypto = require('crypto'),
    plugins = require('../../pluginManager.js'),
	connections = {};

(function (plugin) {
	plugins.register("/o/db", function(ob){
		var dbs = {countly:common.db, countly_drill:common.drillDb};
		var params = ob.params;
		var validateUserForGlobalAdmin = ob.validateUserForGlobalAdmin;
		validateUserForGlobalAdmin(params, function(){
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
                common.db.collection('apps').find({}).toArray(function (err, apps) {
                    if(err) {
                        console.error(err);
                    }
                    var lookup = {};
                    for (var i = 0; i < apps.length ;i++) {
                        lookup[apps[i]._id+""] = apps[i].name;
                    }
                    
                    function getEvents(app, callback){
                        var result = {};
                        common.db.collection('events').findOne({'_id': common.db.ObjectID(app._id+"")}, function(err, events) {
                            if (!err && events && events.list) {
                                for (var i = 0; i < events.list.length; i++) {
                                    result[crypto.createHash('sha1').update(events.list[i] + app._id + "").digest('hex')] = "("+app.name+": "+events.list[i]+")";
                                }
                                result[crypto.createHash('sha1').update("[CLY]_session" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_session)";
                                result[crypto.createHash('sha1').update("[CLY]_crash" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_crash)";
                            }
                            callback(null, result);
                        });
                    }
                    
                    async.map(apps, getEvents, function (err, events) {
                        var eventList = {};
                        for(var i = 0; i < events.length; i++){
                            for(var j in events[i]){
                                eventList[j] = events[i][j];
                            }
                        }
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
                                dbs[name].collections(function (err, results) {
                                    var db = {name:name, collections:{}};
                                    for (var i = 0; i < results.length; i++) {
                                        
                                        if(results[i].s.name.indexOf("system.indexes") == -1 && results[i].s.name.indexOf("sessions_") == -1){
                                            var col = parseCollectionName(results[i].s.name, lookup, eventList);
                                            db.collections[col.pretty] = col.name;
                                        }
                                    }
                                    callback(err, db);
                                });
                            }
                            else
                                callback(null, null);
                        }
                    });
                });
			}
		});		
		return true;
	});
	
	var parseCollectionName = function parseCollectionName(full_name, apps, events) {
		var coll_parts = full_name.split('.');
		var database = "countly";
		if (coll_parts.length > 1) {
            database = coll_parts.splice(0,1);
		}
		var name = coll_parts.join('.');
        var pretty = name;
        
        for(var i in apps){
            if(name.indexOf(i, name.length - i.length) !== -1){
                pretty = name.replace(i, "("+apps[i]+")");
            }
        }
        
        for(var i in events){
            if(name.indexOf(i, name.length - i.length) !== -1){
                pretty = name.replace(i, events[i]);
            }
        }
           
		return { name: name, pretty: pretty, database: database.toString() };
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