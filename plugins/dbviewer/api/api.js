var plugin = {},
	common = require('../../../api/utils/common.js'),
	async = require('async'),
	crypto = require('crypto'),
    plugins = require('../../pluginManager.js'),
	connections = {},
    _ = require('underscore');

(function (plugin) {
	plugins.register("/o/db", function(ob){
		var dbs = {countly:common.db, countly_drill:common.drillDb};
		var params = ob.params;
        
        function dbGetDocument(){
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
            else{
                common.returnOutput(params, {});
            }
        }
        
        function dbGetCollection(){
            var limit = parseInt(params.qstring.limit || 20);
			var skip = parseInt(params.qstring.skip || 0);
			var filter = params.qstring.filter || "{}";
            var project = params.qstring.project || "{}";
			try {
                filter = JSON.parse(filter);
            } catch (SyntaxError) {
				filter = {};
			}
			if(filter._id && isObjectId(filter._id)){
				filter._id = common.db.ObjectID(filter._id);
			}
            try {
                project = JSON.parse(project);
            } catch (SyntaxError) {
				project = {};
			}
			if(dbs[params.qstring.dbs]){
				var cursor = dbs[params.qstring.dbs].collection(params.qstring.collection).find(filter, project);
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
        
        function dbLoadEventsData(apps, callback){
            function getEvents(app, callback){
                var result = {};
                common.db.collection('events').findOne({'_id': common.db.ObjectID(app._id+"")}, function(err, events) {
                    if (!err && events && events.list) {
                        for (var i = 0; i < events.list.length; i++) {
                            result[crypto.createHash('sha1').update(events.list[i] + app._id + "").digest('hex')] = "("+app.name+": "+events.list[i]+")";
                        }
                        result[crypto.createHash('sha1').update("[CLY]_session" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_session)";
                        result[crypto.createHash('sha1').update("[CLY]_crash" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_crash)";
                        result[crypto.createHash('sha1').update("[CLY]_view" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_view)";
                        result[crypto.createHash('sha1').update("[CLY]_action" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_action)";
                        result[crypto.createHash('sha1').update("[CLY]_push_action" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_push_action)";
                        result[crypto.createHash('sha1').update("[CLY]_push_open" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_push_open)";
                        result[crypto.createHash('sha1').update("[CLY]_push_sent" + app._id + "").digest('hex')] = "("+app.name+": [CLY]_push_sent)";
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
                callback(err, eventList);
            });
        }
        
        function dbGetDb(apps){
            var lookup = {};
            for (var i = 0; i < apps.length ;i++) {
                lookup[apps[i]._id+""] = apps[i].name;
            }
            
            dbLoadEventsData(apps, function(err, eventList){
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
                            async.map(results, function(col, done){
                                if(col.s.name.indexOf("system.indexes") == -1 && col.s.name.indexOf("sessions_") == -1){
                                    if (params.member.global_admin) {
                                        var ob = parseCollectionName(col.s.name, lookup, eventList);
                                        db.collections[ob.pretty] = ob.name;
                                        done(false, true);
                                    }
                                    else{
                                        dbUserHassAccessToCollection(col.s.name, function(hasAccess){
                                            if(hasAccess){
                                                var ob = parseCollectionName(col.s.name, lookup, eventList);
                                                db.collections[ob.pretty] = ob.name;
                                            }
                                            done(false, true);
                                        });
                                    }
                                }
                                else{
                                    done(false, true);
                                }
                            }, function (err, results) {
                                callback(err, db);
                            });
                        });
                    }
                    else
                        callback(null, null);
                }
            });
        }
        
        function dbUserHassAccessToCollection(collection, callback){
            var hasAccess = false;
            var apps = params.member.user_of || [];
            if(collection.indexOf("events") === 0 || collection.indexOf("drill_events") === 0 ){
                var appList = [];
                for(var i = 0; i < apps.length; i++){
                    if(apps[i].length){
                        appList.push({_id:apps[i]});
                    }
                }
                dbLoadEventsData(appList, function(err, eventList){
                    for(var i in eventList){
                        if(collection.indexOf(i, collection.length - i.length) !== -1){
                            return callback(true);
                        }
                    }
                    return callback(false);
                });
            }
            else{
                for(var i = 0; i < apps.length; i++){
                    if(collection.indexOf(apps[i], collection.length - apps[i].length) !== -1){
                        return callback(true);
                    }
                }
                return callback(false);    
            }
        }
        
		var validateUserForWriteAPI = ob.validateUserForWriteAPI;
		validateUserForWriteAPI(function(){
			if(params.qstring.dbs && params.qstring.collection && params.qstring.document && params.qstring.collection.indexOf("system.indexes") == -1 && params.qstring.collection.indexOf("sessions_") == -1){
                if (params.member.global_admin) {
                    dbGetDocument();
                }
                else{
                    dbUserHassAccessToCollection(params.qstring.collection, function(hasAccess){
                        if(hasAccess)
                            dbGetDocument();
                        else
                            common.returnMessage(params, 401, 'User does not have right to view this document');
                    });
                }
			}
			else if(params.qstring.dbs && params.qstring.collection && params.qstring.collection.indexOf("system.indexes") == -1 && params.qstring.collection.indexOf("sessions_") == -1){
                if (params.member.global_admin) {
                    dbGetCollection();
                }
                else{
                    dbUserHassAccessToCollection(params.qstring.collection, function(hasAccess){
                        if(hasAccess)
                            dbGetCollection();
                        else
                            common.returnMessage(params, 401, 'User does not have right to view this collection');
                    });
                }
			}
			else{
                
                if (params.member.global_admin) {
                    common.db.collection('apps').find({}).toArray(function (err, apps) {
                        if(err) {
                            console.error(err);
                        }
                        dbGetDb(apps || []);
                    });
                }
                else{
                    var apps = [];
                    params.member.user_of = params.member.user_of || [];
                    for(var i = 0; i < params.member.user_of.length; i++){
                        apps.push(common.db.ObjectID(params.member.user_of[i]));
                    }
                    common.db.collection('apps').find({_id:{$in:apps}}).toArray(function (err, apps) {
                        if(err) {
                            console.error(err);
                        }
                        dbGetDb(apps || []);
                    });
                }
			}
		},params);		
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

        let isEvent = false;
        let eventHash = null;
        if(name.indexOf("events") === 0) {
            eventHash = name.substring(6);
            isEvent = true;
        } else if(name.indexOf("drill_events") === 0) {
            eventHash = name.substring(12);
            isEvent = true;
        }

        if(!isEvent) {
            let finished = false;
            for (var i in apps) {
                if (name.indexOf(i, name.length - i.length) !== -1) {
                    pretty = name.replace(i, "(" + apps[i] + ")");
                    finished = true;
                    break;
                }
            }
        } else {
            if(eventHash.length === 0) {
                //this is the "events" collection
                pretty = name;
            } else {
                const targetEntry = events[eventHash];
                if(!_.isUndefined(targetEntry)) {
                    pretty = name.replace(eventHash, targetEntry)
                }
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