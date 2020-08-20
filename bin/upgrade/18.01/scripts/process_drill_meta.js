var pluginManager = require("../../../../plugins/pluginManager");
var async = require("async");
var crypto = require("crypto");
var Promise = require("bluebird");

Promise.all([pluginManager.dbConnection("countly"),pluginManager.dbConnection("countly_drill")]).spread(function(countlyDb, db){
    var reg = /^drill_events\.*/;
    
    var preset_sg = {
        "[CLY]_view": {
            "start": { name: "start", type: "l" },
            "exit": { name: "exit", type: "l" },
            "bounce": { name: "bounce", type: "l" }
        },
        "[CLY]_crash": {
            "manufacture": { name: "manufacture", type: "l" },
            "cpu": { name: "cpu", type: "l" },
            "opengl": { name: "opengl", type: "l" },
            "view": { name: "view", type: "l" },
            "browser": { name: "browser", type: "l" },
            "os": { name: "os", type: "l" },
            "orientation": { name: "orientation", type: "l" },
            "nonfatal": { name: "nonfatal", type: "l" },
            "root": { name: "root", type: "l" },
            "online": { name: "online", type: "l" },
            "signal": { name: "signal", type: "l" },
            "muted": { name: "muted", type: "l" },
            "background": { name: "background", type: "l" },
            "ram_current": { name: "ram_current", type: "n" },
            "ram_total": { name: "ram_total", type: "n" },
            "disk_current": { name: "disk_current", type: "n" },
            "disk_total": { name: "disk_total", type: "n" },
            "bat_current": { name: "bat_current", type: "n" },
            "bat_total": { name: "bat_total", type: "n" },
            "bat": { name: "bat", type: "n" },
            "run": { name: "run", type: "n" }
        }
    };
    
    function findProperty(res, prop) {
        for (var i = 0; i < res.length; i++) {
            if (typeof res[i][prop] !== "undefined" && res[i][prop] != "undefined") {
                return res[i][prop];
            }
        }
    }
    
    var processUp = ["up", "cmp", "custom"];
    var drillConfigs = {list_limit: 100, big_list_limit: 128000};
    
    function diffValues(existing, adding) {
        var newVals = {};
        if (Array.isArray(adding)) {
            for (var i = 0; i < adding.length; i++) {
                if (!existing[db.encode(adding[i] + "")] && db.encode(adding[i] + "") != "") {
                    newVals[db.encode(adding[i] + "")] = true;
                }
            }
        }
        else {
            for (var key in adding) {
                if (!existing[db.encode(key + "")] && db.encode(key + "") != "") {
                    newVals[db.encode(key + "")] = true;
                }
            }
        }
        return newVals;
    }
    
    function processProperty(pre, prop, res, query, updates, type, app_id, existingVal) {
        if (res && res.type) {
            if (res.type === "l" || (res.type === "s" && typeof res.values !== "undefined")) {
                if (res.values && typeof res.values !== "undefined") {
                    var existingLength = 0,
                        isBigList = false;
                    if (existingVal && existingVal.values) {
                        if (existingVal.type === "bl") {
                            isBigList = true;
                        }
                        existingLength = Object.keys(existingVal.values).length;
                        res.values = diffValues(existingVal.values, res.values);
                        //nothing new to add
                        if (Object.keys(res.values).length === 0) {
                            return;
                        }
                    }
                    if (!isBigList && ((Array.isArray(res.values) && res.values.length + existingLength <= drillConfigs.list_limit) ||
                        (Object.keys(res.values).length + existingLength <= drillConfigs.list_limit))) {
                        //store as list
                        query[pre + "." + prop + ".type"] = "l";
                        if (Array.isArray(res.values)) {
                            for (var i = 0; i < res.values.length; i++) {
                                if (db.encode(res.values[i] + "") != "") {
                                    query[pre + "." + prop + ".values." + db.encode(res.values[i] + "")] = true;
                                }
                            }
                        }
                        else {
                            for (var key in res.values) {
                                if (key != "") {
                                    query[pre + "." + prop + ".values." + key] = true;
                                }
                            }
                        }
                    }
                    else if ((Array.isArray(res.values) && res.values.length + existingLength <= drillConfigs.big_list_limit) ||
                        (Object.keys(res.values).length + existingLength <= drillConfigs.big_list_limit)) {
                        //store as big list
                        query[pre + "." + prop + ".type"] = "bl";
                        var update = {};
                        if (type === "up") {
                            update._id = "meta_up_" + pre + "." + prop;
                            update.type = "up";
                            update.e = pre;
                        }
                        else {
                            update._id = "meta_" + crypto.createHash('sha1').update(type + app_id).digest('hex') + "_sg." + prop;
                            update.type = "e";
                            update.e = type;
                        }
                        update.app_id = app_id;
                        if (Array.isArray(res.values)) {
                            for (var i = 0; i < res.values.length; i++) {
                                if (db.encode(res.values[i] + "") != "") {
                                    update["values." + db.encode(res.values[i] + "")] = true;
                                }
                            }
                        }
                        else {
                            for (var key in res.values) {
                                if (key != "") {
                                    update["values." + key] = true;
                                }
                            }
                        }
                        updates.push(update);
                    }
                    else {
                        query[pre + "." + prop + ".type"] = "s";
                    }
                }
            }
            else if (res.type !== "bl") {
                query[pre + "." + prop + ".type"] = res.type;
            }
        }
    }
    
    function processCollection(col, done) {
        var c = col.collectionName;
        //find all meta docs
        db.collection(c).find({"_id": {"$regex": "meta.*"}}).toArray(function(err, res) {
            if (err) {
                console.log("Cannot process:", c, err);
            }
            var updates = [];
            //check if we have any results
            if (res && res.length) {
                var app_id = findProperty(res, "app_id") || "";
                var event = findProperty(res, "e") || "";
                if (app_id == "") {
                    console.log("Cannot find app_id for", c, res);
                    return done();
                }
                if (event == "") {
                    console.log("Cannot find event name for", c, res);
                    return done();
                }
                //find current up meta
                db.collection("drill_meta" + app_id).findOne({_id: "meta_up"}, function(err, upMeta) {
                    upMeta = upMeta || {};
                    var query = {up: {}, e: {}};
                    for (var i = 0; i < res.length; i++) {
                        if (res[i]._id === "meta" || res[i]._id === "meta_v2") {
                            for (var key in res[i]) {
                                if (key === "sg") {
                                    for (var prop in res[i].sg) {
                                        if (preset_sg[event] && preset_sg[event][prop]) {
                                            res[i].sg[prop].type = preset_sg[event][prop].type;
                                        }
                                        processProperty("sg", prop, res[i].sg[prop], query.e, updates, event, app_id);
                                    }
                                }
                                else if (processUp.indexOf(key) !== -1) {
                                    if (!upMeta[key]) {
                                        upMeta[key] = {};
                                    }
                                    for (var prop in res[i][key]) {
                                        if (key === "cmp" && (!prop || prop == "_id" || prop == "bv" || prop == "ip" || prop == "os" || prop == "r" || prop == "cty" || prop == "last_click")) {
                                            continue;
                                        }
                                        processProperty(key, prop, res[i][key][prop], query.up, updates, "up", app_id, upMeta[key][prop]);
                                    }
                                }
                            }
                        }
                        else {
                            var prop = res[i]._id.replace("meta_v2_up.", "");
                            delete res[i]._id;
                            var ob = {type: "l", values: res[i]};
                            processProperty("up", prop, ob, query.up, updates, "up", app_id);
                        }
                    }
                    if (Object.keys(query.up).length) {
                        query.up._id = "meta_up";
                        query.up.type = "up";
                        query.up.app_id = app_id;
                        updates.push(query.up);
                    }
                    if (Object.keys(query.e).length) {
                        query.e._id = "meta_" + crypto.createHash('sha1').update(event + app_id).digest('hex');
                        query.e.type = "e";
                        query.e.e = event;
                        query.e.app_id = app_id;
                        updates.push(query.e);
                    }
                    if (updates.length) {
                        async.eachSeries(updates, function(query, callback) {
                            //console.log("update", query);
                            db.collection("drill_meta" + app_id).update({"_id": query._id}, {$set: query}, {upsert: true}, function(err, res) {
                                console.log("inserted new meta", query._id, "for", c, err);
                                setTimeout(function() {
                                    callback();
                                }, 5000);
                            });
                        }, function() {
                            db.collection(c).remove({"_id": {"$regex": "meta.*"}}, function(err, res) {
                                console.log("removed old meta for ", c, err);
                                setTimeout(function() {
                                    done();
                                }, 5000);
                            });
                        });
                        /*
                            var bulk = db.collection("drill_meta"+app_id).initializeUnorderedBulkOp();
                            for(var i = 0; i < updates.length; i++){
                                bulk.find({
                                    "_id": updates[i]._id
                                }).upsert().updateOne({
                                    "$set": updates[i]
                                });
                            }
                            bulk.execute(function (err, updateResult) {
                                if(err){
                                    console.log(err, updateResult);
                                }
                                setTimeout(function(){
                                done(); 
                                }, 5000);
                            });
                        */
                    }
                    else {
                        done();
                    }
                });
            }
            else {
                done();
            }
        });
    }
    
    setTimeout(function() {
        pluginManager.loadConfigs(countlyDb, function() {
            countlyDb.close();
            drillConfigs.list_limit = pluginManager.getConfig("drill").list_limit || drillConfigs.list_limit;
            drillConfigs.big_list_limit = pluginManager.getConfig("drill").big_list_limit || drillConfigs.big_list_limit;
            db.collections(function(err, results) {
                if (err) {
                    throw err;
                }
                else {
                    var events = results.filter(function(col) {
                        return reg.test(col.collectionName);
                    });
                    async.eachSeries(events, processCollection, function() {
                        console.log("Finished processing drill meta data");
                        db.close();
                    });
                }
            });
        });
    }, /*6000*/0);
 });