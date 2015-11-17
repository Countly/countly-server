var plugin = {},
	common = require('../../../api/utils/common.js'),
    fetch = require("../../../api/parts/data/fetch.js"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    crypto = require("crypto"),
    plugins = require('../../pluginManager.js');
    
plugins.setConfigs("crashes", {
    report_limit:100
});

(function (plugin) {
    var ranges = ["ram", "bat", "disk", "run", "session"];
	var segments = ["os_version", "manufacture", "device", "resolution", "app_version", "cpu", "opengl", "orientation"];
	var bools = {"root":true, "online":true, "muted":true, "signal":true, "background":true};
    var ios_cpus = {
        "iPhone1,1":"RISC ARM 11",
        "iPhone1,2":"RISC ARM 11",
        "iPhone2,1":"ARM Cortex-A8",
        "iPhone3,1":"ARMv7 A4",
        "iPhone3,2":"ARMv7 A4",
        "iPhone3,3":"ARMv7 A4",
        "iPhone4,1":"ARMv7 A5",
        "iPhone5,1":"ARMv7s A6",
        "iPhone5,2":"ARMv7s A6",
        "iPhone5,3":"ARMv7s A6",
        "iPhone5,4":"ARMv7s A6",
        "iPhone6,1":"ARMv8-A A7",
        "iPhone6,2":"ARMv8-A A7",
        "iPhone7,1":"ARMv8-A A8",
        "iPhone7,2": "ARMv8-A A8",
        "iPod1,1":"ARM11",
        "iPod2,1":"ARM11",
        "iPod3,1":"ARMv7-A",
        "iPod4,1": "ARMv7-A A4",
        "iPod5,1":"ARMv7-A A5",
        "iPad1,1":"ARMv7 A4",
        "iPad2,1":"ARMv7 A5",
        "iPad2,2":"ARMv7 A5",
        "iPad2,3":"ARMv7 A5",
        "iPad2,4":"ARMv7 A5 Rev A",
        "iPad2,5":"ARMv7-A A5",
        "iPad2,6":"ARMv7-A A5",
        "iPad2,7":"ARMv7-A A5",
        "iPad3,1":"ARMv7 A5X",
        "iPad3,2":"ARMv7 A5X",
        "iPad3,3":"ARMv7 A5X",
        "iPad3,4":"ARMv7 A6X",
        "iPad3,5":"ARMv7 A6X",
        "iPad3,6":"ARMv7 A6X",
        "iPad4,1":"ARMv8 A7 Rev A",
        "iPad4,2":"ARMv8 A7 Rev A",
        "iPad4,3":"ARMv8 A7 Rev A",
        "iPad4,4":"ARMv8-A A7",
        "iPad4,5":"ARMv8-A A7",
        "iPad4,6":"ARMv8-A A7",
        "iPad4,7":"ARMv8-A A7",
        "iPad4,8":"ARMv8-A A7",
        "iPad4,9":"ARMv8-A A7",
        "iPad5,3":"ARMv8 A8X",
        "iPad5,4":"ARMv8 A8X",
        "i386":"Simulator",
        "x86_64":"Simulator"
    };
    //check app metric
    plugins.register("/session/metrics", function(ob){
        var params = ob.params;
        if (!params.qstring.crash && params.qstring.metrics && params.qstring.metrics._app_version) {
            function checkCrash(latest_version, hash, uid){
                common.db.collection('app_crashgroups' + params.app_id).findOne({'_id': hash }, function (err, crash){
                    if(crash && crash.is_resolved && crash.resolved_version){
                        if(common.versionCompare(latest_version, crash.resolved_version.replace(/\./g, ":")) > 0){
                            //record resolved user timeline
                            common.recordCustomMetric(params, "crashdata", params.app_id, ["crru"]);
                            
                            //update crash stats
                            common.db.collection('app_crashusers' + params.app_id).update({"group":hash, uid:uid}, {$set:{reports:0}}, function(){});
                            common.db.collection('app_crashgroups' + params.app_id).update({'_id': hash }, {$inc:{users:-1}}, function (err, res){});
                            
                            //update global app stats
                            var mod = {crashes:-1};
                            if(!crash.nonfatal)
                                mod.fatal = -1;
                            common.db.collection('app_crashusers' + params.app_id).update({"group":0, uid:uid}, {$inc:mod}, function(){
                                common.db.collection('app_crashusers' + params.app_id).count({"group":0, crashes: { $gt: 0 }}, function(err, userCount){
                                    common.db.collection('app_crashusers' + params.app_id).count({"group":0, crashes: { $gt: 0 }, fatal: { $gt: 0 }}, function(err, fatalCount){
                                        var set = {};
                                        set.users = userCount;
                                        set.usersfatal = fatalCount;
                                        common.db.collection('app_crashgroups' + params.app_id).update({'_id': "meta" }, {$set:set}, function (err, res){});
                                    });
                                });
                            });
                            
                            //remove crash from user's set
                            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id }, {$pull:{crashes:hash}}, function (err, res){});
                        }
                    }
                });
            };
            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, dbAppUser){
                if(dbAppUser && dbAppUser.uid && dbAppUser.crashes && dbAppUser.crashes.length){
                    var latest_version = params.qstring.metrics._app_version.replace(/\./g, ":");
                    if(dbAppUser.av && common.versionCompare(dbAppUser.av, latest_version) > 0)
                        latest_version = dbAppUser.av;
                    
                    for(var i = 0; i < dbAppUser.crashes.length; i++){
                        checkCrash(latest_version, dbAppUser.crashes[i], dbAppUser.uid);
                    }
                }
            });
        }
    });
	//write api call
	plugins.register("/i", function(ob){
		var params = ob.params;
		if (typeof params.qstring.crash == "string") {
            try {
                params.qstring.crash = JSON.parse(params.qstring.crash);
            } catch (SyntaxError) {
                console.log('Parse crash JSON failed');
				return false;
            }
        }
        
        function preprocessCrash(crash){
            crash._error = crash._error.replace(/\r\n|\r|\n|\/n/g, "\n");
            crash._error = crash._error.replace(/\t/g, "");
            crash._error = crash._error.trim();
            var error = crash._error;
            if(crash._os && crash._os.toLowerCase && crash._os.toLowerCase() == "ios"){
                if(crash._device && !crash._cpu)
                    crash._cpu = ios_cpus[crash._device] || "Unknown";
                
                var rLineNumbers = /^\d+\s*/gim;
                crash._error = crash._error.replace(rLineNumbers, "");
                error = crash._error;
                
                var rHex = /0x([0-9A-F]*)\s/gim;
                var rPlus = /\s\+\s([0-9]*)$/gim;
                error = error.replace(rHex, "0x%%%%%% ").replace(rPlus, " + ");
            }
            //remove same lines for recursive overflows (on different devices may have different amount of internal calls)
            //removing duplicates will result in same stack on different devices
            var lines = error.split("\n");
            lines = lines.filter(function(elem, pos) {
                return lines.indexOf(elem) == pos;
            })
            error = lines.join("\n");
            return error;
        };
		
		if(params.qstring.crash && params.qstring.crash._error && params.qstring.crash._app_version && params.qstring.crash._os){
			var props = [
                //device metrics
                "os",
                "os_version",
                "manufacture", //may not be provided for ios or be constant, like Apple
                "device", //model for Android, iPhone1,1 etc for iOS
                "resolution",
                "app_version",
                "cpu", //type of cpu used on device (for ios will be based on device)
                "opengl", //version of open gl supported
                
                //state of device
                "ram_current", //in megabytes
                "ram_total",
                "disk_current", //in megabytes
                "disk_total",
                "bat_current", //battery level, probably usually from 0 to 100
                "bat_total", //but for consistency also provide total
                "bat", //or simple value from 0 to 100
                "orientation", //in which device was held, landscape, portrait, etc
                
                //bools
                "root", //true if device is rooted/jailbroken, false or not provided if not
                "online", //true if device is connected to the internet (WiFi or 3G), false or not provided if not connected
                "muted", //true if volume is off, device is in muted state
                "signal", //true if have cell/gsm signal or is not in airplane mode, false when no gsm signal or in airplane mode
                "background", //true if app was in background when it crashed
                
                //error info
                "name", //optional if provided by OS/Platform, else will use first line of stack
                "error", //error stack
                "nonfatal", //true if handled exception, false or not provided if crash
                "logs",//some additional logs provided, if any 
                "run", //running time since app start in seconds
                
                //custom key/values provided by developers
                "custom"
			];
			
			var error = preprocessCrash(params.qstring.crash);
			if(error != ""){
				var report = {};
				for(var i = 0, l = props.length; i < l; i++){
					if(params.qstring.crash["_"+props[i]])
						if(bools[props[i]]){
							report[props[i]] = (params.qstring.crash["_"+props[i]] && params.qstring.crash["_"+props[i]] !== "false") ? 1 : 0;
                        }
                        else if(segments[props[i]]){
							report[props[i]] = params.qstring.crash["_"+props[i]]+"";
                        }
                        else if(props[i] == "custom"){
                            report[props[i]] = {};
                            for(var key in params.qstring.crash["_"+props[i]]){
                                var safeKey = key.replace(/^\$/, "").replace(/\./g, ":");
                                if(safeKey)
                                    report[props[i]][safeKey] = params.qstring.crash["_"+props[i]][key];
                            }
                        }
						else
							report[props[i]] = params.qstring.crash["_"+props[i]];
				}
                report.cd = new Date();
                report.nonfatal = (report.nonfatal && report.nonfatal !== "false") ? true : false;
                var hash = common.crypto.createHash('sha1').update(report.os + error + params.app_id + report.nonfatal + "").digest('hex');
				function checkUser(err, dbAppUser, tries){
                    if(!dbAppUser || !dbAppUser.uid){
                        setTimeout(function(){
                            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function(err, dbAppUser){
                                tries++;
                                if(tries < 5)
                                    checkUser(err, dbAppUser, tries);
                            });
                        }, 5000);
                    }
                    else{
                        report.group = hash;
                        report.uid = dbAppUser.uid;
                        report.ts = params.time.timestamp;
                        
                        var set = {group:hash, 'uid':report.uid};
                        if(dbAppUser && dbAppUser.sc)
                            set.sessions = dbAppUser.sc;
                        common.db.collection('app_crashusers' + params.app_id).findAndModify({group:hash, 'uid':report.uid},{}, {$set:set, $inc:{reports:1}},{upsert:true, new:false}, function (err, user){
                            user = user.value;
                            if(user && user.sessions && dbAppUser && dbAppUser.sc && dbAppUser.sc > user.sessions)
                                report.session = dbAppUser.sc - user.sessions;
                            common.db.collection('app_crashes' + params.app_id).insert(report, function (err, res){});
                            
                            //check if drill available
							if(common.drillDb){
                                var data = {};
                                data.crash = report.group;
                                var drillP = [
                                    { name:"manufacture", type: "l" },
                                    { name:"cpu", type: "l" },
                                    { name:"opengl", type: "l" },
                                    { name:"orientation", type: "l" },
                                    { name:"nonfatal", type: "l" },
                                    { name:"root", type: "l" },
                                    { name:"online", type: "l" },
                                    { name:"signal", type: "l" },
                                    { name:"muted", type: "l" },
                                    { name:"background", type: "l" },
                                    { name:"ram_current", type: "n" },
                                    { name:"ram_total", type: "n" },
                                    { name:"disk_current", type: "n" },
                                    { name:"disk_total", type: "n" },
                                    { name:"bat_current", type: "n" },
                                    { name:"bat_total", type: "n" },
                                    { name:"bat", type: "n" },
                                    { name:"run", type: "n" }
                                ];
                                for(var i = 0; i < drillP.length; i++){
                                    if(report[drillP[i].name] != null && typeof report[drillP[i].name] != "undefined"){
                                        if(bools[drillP[i].name]){
                                            if(report[drillP[i].name])
                                                data[drillP[i].name] = "true";
                                            else
                                                data[drillP[i].name] = "false";
                                        }
                                        else
                                            data[drillP[i].name] = report[drillP[i].name];
                                    }
                                }
                                if(report.custom){
                                    for(var i in report.custom){
                                        if(!data[i]){
                                            data[i] = report.custom[i];
                                        }
                                    }
                                }
                                var events = [{
                                    key: "[CLY]_crash",
                                    count: 1,
                                    segmentation: data
                                }];
                                plugins.dispatch("/plugins/drill", {params:params, dbAppUser:dbAppUser, events:events});
                            }
                        
                            function processCrash(userAll){
                                var groupSet = {};
                                var groupInsert = {};
                                var groupInc = {};
                                var groupMin = {};
                                var groupMax = {};
                                
                                groupSet._id = hash;
                                groupSet.os = report.os;
                                groupSet.lastTs = report.ts;
                                groupSet.name = report.name || report.error.split('\n')[0];
                                groupSet.error = report.error;
                                groupSet.nonfatal = (report.nonfatal) ? true : false;
                                
                                groupInc.reports = 1;
                                
                                if(!report.nonfatal && dbAppUser.sc && dbAppUser.sc > 0 && dbAppUser.tp)
                                    groupInc.loss = dbAppUser.tp/dbAppUser.sc;
                                
                                if(user && !user.reports)
                                    groupInc.users = 1;
                                
                                groupInsert.is_new = true;
                                groupInsert.is_resolved = false;
                                groupInsert.startTs = report.ts;
                                groupInsert.latest_version = report.app_version;
                                
                                //process segments
                                for(var i = 0, l = segments.length; i < l; i ++){
                                    if(report[segments[i]] != undefined){
                                        var safeKey = (report[segments[i]]+"").replace(/^\$/, "").replace(/\./g, ":");
                                        if(safeKey){
                                            if(groupInc[segments[i]+"."+safeKey])
                                                groupInc[segments[i]+"."+safeKey]++;
                                            else
                                                groupInc[segments[i]+"."+safeKey] = 1;
                                        }
                                    }
                                }
                                
                                //process custom segments
                                if(report.custom){
                                    for(var key in report.custom){
                                        var safeKey = (report.custom[key]+"").replace(/^\$/, "").replace(/\./g, ":");
                                        if(safeKey){
                                            if(groupInc["custom."+key+"."+safeKey])
                                                groupInc["custom."+key+"."+safeKey]++;
                                            else
                                                groupInc["custom."+key+"."+safeKey] = 1;
                                        }
                                    }
                                }
                                
                                //process bool values
                                for(var i in bools){									
                                    if(report[i]){
                                        if(groupInc[i+".yes"])
                                            groupInc[i+".yes"]++;
                                        else
                                            groupInc[i+".yes"] = 1;
                                    }else{
                                        if(groupInc[i+".no"])
                                            groupInc[i+".no"]++;
                                        else
                                            groupInc[i+".no"] = 1;
                                    }
                                }
                                
                                //process ranges
                                for(var i = 0, l = ranges.length; i < l; i ++){
                                    if(report[ranges[i]+"_current"] && report[ranges[i]+"_total"]){
                                        var ratio = ((parseInt(report[ranges[i]+"_current"])/parseInt(report[ranges[i]+"_total"]))*100).toFixed(2);
                                        groupInc[ranges[i]+".total"] = parseFloat(ratio);
                                        groupInc[ranges[i]+".count"] = 1;
                                        groupMin[ranges[i]+".min"] = parseFloat(ratio);
                                        groupMax[ranges[i]+".max"] = parseFloat(ratio);
                                    }
                                    else if(report[ranges[i]] != undefined){
                                        groupInc[ranges[i]+".total"] = parseFloat(report[ranges[i]]);
                                        groupInc[ranges[i]+".count"] = 1;
                                        groupMin[ranges[i]+".min"] = parseFloat(report[ranges[i]]);
                                        groupMax[ranges[i]+".max"] = parseFloat(report[ranges[i]]);
                                    }
                                }
                                
                                var update = {};
                                if(Object.keys(groupSet).length > 0)
                                    update["$set"] = groupSet;
                                if(Object.keys(groupInsert).length > 0)
                                    update["$setOnInsert"] = groupInsert;
                                if(Object.keys(groupInc).length > 0)
                                    update["$inc"] = groupInc;
                                if(Object.keys(groupMin).length > 0)
                                    update["$min"] = groupMin;
                                if(Object.keys(groupMax).length > 0)
                                    update["$max"] = groupMax;
                                
                                common.db.collection('app_crashgroups' + params.app_id).findAndModify({'_id': hash },{},update,{upsert:true, new:true}, function(err,crashGroup){
                                    crashGroup = crashGroup.value;
                                    var isNew = (crashGroup && crashGroup.reports == 1) ? true : false;
                                    
                                    var metrics = ["cr"];
                                    
                                    if(isNew)
                                        metrics.push("cru");
                                    
                                    if(report.nonfatal)
                                        metrics.push("crnf");
                                    else
                                        metrics.push("crf");
                                    
                                    common.recordCustomMetric(params, "crashdata", params.app_id, metrics);
                                    
                                    var group = {};
                                    if(!isNew){
                                        if(common.versionCompare(report.app_version.replace(/\./g, ":"), crashGroup.latest_version.replace(/\./g, ":")) > 0)
                                            group.latest_version = report.app_version;
                                        if(crashGroup.is_resolved && common.versionCompare(report.app_version.replace(/\./g, ":"), crashGroup.resolved_version.replace(/\./g, ":")) > 0){
                                            group.is_resolved = false;
                                            group.is_renewed = true;
                                        }
                                        if(Object.keys(group).length > 0){
                                            common.db.collection('app_crashgroups' + params.app_id).update({'_id': hash }, {$set:group}, function(){})
                                        }
                                    }
                                                
                                    //update meta document
                                    var groupInc = {};
                                    groupInc.reports = 1;
                                    if(userAll && userAll.crashes == 1)
                                        groupInc.users = 1;
                                        
                                    if(!report.nonfatal && userAll && userAll.fatal == 1)
                                        groupInc.usersfatal = 1;
                                    
                                    if(!report.nonfatal && dbAppUser.sc && dbAppUser.sc > 0 && dbAppUser.tp)
                                        groupInc.loss = dbAppUser.tp/dbAppUser.sc;
                                    
                                    if(isNew){
                                        groupInc.isnew = 1;
                                        groupInc.crashes = 1;
                                    }
                                    if(group.is_renewed){
                                        groupInc.reoccurred = 1;
                                        groupInc.resolved = -1;
                                    }
                                    if(report.nonfatal)
                                        groupInc.nonfatal = 1;
                                    else
                                        groupInc.fatal = 1;
                                    
                                    groupInc["os."+report.os.replace(/^\$/, "").replace(/\./g, ":")] = 1;
                                    groupInc["app_version."+report.app_version.replace(/^\$/, "").replace(/\./g, ":")] = 1;
                                    
                                    common.db.collection('app_crashgroups' + params.app_id).update({'_id': "meta" }, {$inc:groupInc}, function(){})
                                });
                            };
                            
                            if(user && !user.reports){
                                var inc = {crashes:1};
                                if(!report.nonfatal)
                                    inc.fatal = 1;
                        
                                common.db.collection('app_crashusers' + params.app_id).findAndModify({group:0, 'uid':report.uid},{}, {$set:{group:0, 'uid':report.uid}, $inc:inc},{upsert:true, new:true}, function (err, userAll){
                                    userAll = userAll.value;
                                    processCrash(userAll);
                                });
                            }
                            else{
                                processCrash();
                            }
                                
                        });
                    }
				}
                common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id },{},{ $addToSet: { crashes: hash } },{upsert:true, new:false}, function(err, dbAppUser){
                    dbAppUser = dbAppUser.value;
                    checkUser(err, dbAppUser, 0);
                });
			}
			return true;
		}
	});
	
	//read api call
	plugins.register("/o", function(ob){
		var params = ob.params;
		var validate = ob.validateUserForDataReadAPI;
		if(params.qstring.method == 'crashes'){
            validate(params, function(params){
				if (params.qstring.group) {
                    if (params.qstring.userlist) {
                        common.db.collection('app_crashusers' + params.app_id).find({group:params.qstring.group},{uid:1,_id:0}).toArray(function(err, uids){
                            var res = [];
                            for(var i = 0; i < uids.length; i++){
                                res.push(uids[i].uid);
                            }
                            common.returnOutput(params, res);
                        });
                    }
                    else{
                        common.db.collection('app_users' + params.app_id).count({},function(err, total) {
                            common.db.collection('app_crashgroups' + params.app_id).findOne({_id:params.qstring.group}, function(err, result){
                                if(result){
                                    result.total = total-1
                                    result.url = common.crypto.createHash('sha1').update(params.app_id + result._id+"").digest('hex');
                                    if(result.comments)
                                        for(var i = 0; i < result.comments.length; i++){
                                            if(result.comments[i].author_id == params.member._id+""){
                                                result.comments[i].is_owner = true;
                                            }
                                        }
                                    var cursor = common.db.collection('app_crashes' + params.app_id).find({group:result._id}).sort( { $natural: -1 } );
                                    cursor.limit(plugins.getConfig("crashes").report_limit);
                                    cursor.toArray(function(err, res){
                                        result.data = res;
                                        common.returnOutput(params, result);
                                    });
                                    if(result.is_new){
                                        common.db.collection('app_crashgroups' + params.app_id).update({_id:params.qstring.group},{$set:{is_new:false}}, function(err, result){});
                                        common.db.collection('app_crashgroups' + params.app_id).update({_id:"meta"},{$inc:{isnew:-1}}, function(err,result){});
                                    }
                                }
                                else{
                                    common.returnMessage(params, 400, 'Crash group not found');
                                }
                            });
                        });
                    }
				}
                else if (params.qstring.list) {
                    common.db.collection('app_crashgroups' + params.app_id).find({_id:{$ne:"meta"}},{name:1}).toArray(function(err, res){
                        common.returnOutput(params, res);
                    });
                }
				else{
					var result = {};
					common.db.collection('app_users' + params.app_id).count({},function(err, total) {
						result.users = {};
						result.users.total = total-1;
                        result.users.affected = 0;
                        result.users.fatal = 0;
                        result.users.nonfatal = 0;
                        result.crashes = {};
                        result.crashes.total = 0;
                        result.crashes.unique = 0;
                        result.crashes.resolved = 0;
                        result.crashes.unresolved = 0;
                        result.crashes.fatal = 0;
                        result.crashes.nonfatal = 0;
                        result.crashes.news = 0;
                        result.crashes.renewed = 0;
                        result.crashes.os = {};
                        result.crashes.highest_app = "";
                        result.loss = 0;
                        common.db.collection('app_crashgroups' + params.app_id).findOne({_id:"meta"}, function(err, meta){
                            if(meta){
                                result.users.affected = meta.users || 0;
                                result.users.fatal = meta.usersfatal || 0;
                                result.users.nonfatal = result.users.affected - result.users.fatal;
                                result.crashes.total = meta.reports || 0;
                                result.crashes.unique = meta.crashes || 0;
                                result.crashes.resolved = meta.resolved || 0;
                                result.crashes.unresolved = result.crashes.unique - result.crashes.resolved;
                                result.crashes.fatal = meta.fatal || 0;
                                result.crashes.nonfatal = meta.nonfatal || 0;
                                result.crashes.news = meta.isnew || 0;
                                result.crashes.renewed = meta.reoccurred || 0;
                                result.crashes.os = meta.os || {};
                                result.loss = meta.loss || 0;
                                
                                var max = "0:0";
								for(var j in meta.app_version){
									if(meta.app_version[j] > 0 && common.versionCompare(j, max) > 0){
										result.crashes.highest_app = j.replace(/:/g, '.');
										max = j;
									}
								}
                            }
                            
                            common.db.collection('app_crashgroups' + params.app_id).find({_id:{$ne:"meta"}},{uid:1, is_new:1, is_renewed:1, is_hidden:1, os:1, name:1, error:1, users:1, lastTs:1, reports:1, latest_version:1, is_resolved:1, resolved_version:1, nonfatal:1, session:1}).toArray(function(err, res){
                                result.groups = res || [];
                                fetch.getTimeObj("crashdata", params, function(data){
                                    result.data = data;
                                    common.returnOutput(params, result);
                                })
                            });
                        })
					});
				}
			});
			return true;
		}
	});
	
	//manipulating crashes
	plugins.register("/i/crashes", function(ob){
		var params = ob.params;
		var validate = ob.validateUserForDataWriteAPI;
		var paths = ob.paths;
		if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse ' + apiPath + ' JSON failed');
            }
        }

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
		switch (paths[3]) {
            case 'resolve':
                validate(params, function (params) {
					common.db.collection('app_crashgroups' + params.qstring.app_id).findOne({'_id': params.qstring.args.crash_id}, function(err, group){
                        if(group){
                            common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_resolved:true, resolved_version:group.latest_version, is_renewed:false, is_new:false}}, function (err, res){
                                var inc = {resolved:1};
                                if(group.is_renewed)
                                    inc.reoccurred = -1;
                                if(group.is_new)
                                    inc.isnew = -1;
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id:"meta"},{$inc:inc}, function(err,result){});
                                common.returnOutput(params, {version: group.latest_version});
                                return true;
                            });
                        }
                        else{
                            common.returnMessage(params, 404, 'Not found');
                        }
					});
				});
                break;
            case 'unresolve':
                validate(params, function (params) {
					common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_resolved:false, resolved_version:null}}, function (err, res){
						common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id:"meta"},{$inc:{resolved:-1}}, function(err,result){});
						common.returnMessage(params, 200, 'Success');
						return true;
					});
				});
                break;
			case 'view':
                validate(params, function (params) {
					common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_new:false}}, function (err, res){
                        common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id:"meta"},{$inc:{isnew:-1}}, function(err,result){});
						common.returnMessage(params, 200, 'Success');
						return true;
					});
				});
                break;
            case 'share':
                validate(params, function (params) {
                    var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id+"").digest('hex');
					common.db.collection('crash_share').insert({_id:id, app_id:params.qstring.app_id+"", crash_id:params.qstring.args.crash_id+""}, function (err, res){
                        common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_public:true}}, function (err, res){});
						common.returnMessage(params, 200, 'Success');
						return true;
					});
				});
                break;
            case 'unshare':
                validate(params, function (params) {
                    var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id+"").digest('hex');
					common.db.collection('crash_share').remove({'_id': id }, function (err, res){
                        common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_public:false}}, function (err, res){});
						common.returnMessage(params, 200, 'Success');
						return true;
					});
				});
                break;
            case 'modify_share':
                validate(params, function (params) {
                    if(params.qstring.args.data)
                        common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{share:params.qstring.args.data}}, function (err, res){
                            common.returnMessage(params, 200, 'Success');
                            return true;
                        });
                    else
                        common.returnMessage(params, 400, 'No data to save');
				});
                break;
            case 'hide':
                validate(params, function (params) {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_hidden:true}}, function (err, res){
                        common.returnMessage(params, 200, 'Success');
						return true;
                    });
				});
                break;
            case 'show':
                validate(params, function (params) {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set":{is_hidden:false}}, function (err, res){
                        common.returnMessage(params, 200, 'Success');
						return true;
                    });
				});
                break;
            case 'add_comment':
                ob.validateUserForWriteAPI(function(){
                    var comment = {};
                    if(params.qstring.args.time)
                        comment.time = params.qstring.args.time;
                    else
                        comment.time = new Date().getTime();
                    
                    if(params.qstring.args.text)
                        comment.text = params.qstring.args.text;
                    else
                        comment.text = "";
          
                    comment.author = params.member.full_name;
                    comment.author_id = params.member._id+"";
                    comment._id = common.crypto.createHash('sha1').update(params.qstring.args.app_id + params.qstring.args.crash_id+JSON.stringify(comment)+"").digest('hex');
                    common.db.collection('app_crashgroups' + params.qstring.args.app_id).update({'_id': params.qstring.args.crash_id }, {"$push":{'comments':comment}}, function (err, res){
                        common.returnMessage(params, 200, 'Success');
						return true;
                    });
				}, params);
                break;
            case 'edit_comment':
                ob.validateUserForWriteAPI(function(){
                    common.db.collection('app_crashgroups' + params.qstring.args.app_id).findOne({'_id': params.qstring.args.crash_id }, function (err, crash){
                        var comment;
                        if(crash && crash.comments){
                            for(var i = 0; i < crash.comments.length; i++){
                                if(crash.comments[i]._id == params.qstring.args.comment_id){
                                    comment = crash.comments[i];
                                    break;
                                }
                            }
                        }
                        if(comment && (comment.author_id == params.member._id+"" || params.member.global_admin)){
                            if(params.qstring.args.time)
                                comment.edit_time = params.qstring.args.time;
                            else
                                comment.edit_time = new Date().getTime();
                            
                            if(params.qstring.args.text)
                                comment.text = params.qstring.args.text;
                            
                            common.db.collection('app_crashgroups' + params.qstring.args.app_id).update({'_id': params.qstring.args.crash_id,"comments._id":params.qstring.args.comment_id},{$set:{"comments.$": comment}}, function (err, res){
                                common.returnMessage(params, 200, 'Success');
                                return true;
                            });
                        }
                        else{
                            common.returnMessage(params, 200, 'Success');
                            return true;
                        }
                    });
				}, params);
                break;
            case 'delete_comment':
                ob.validateUserForWriteAPI(function(){
                    common.db.collection('app_crashgroups' + params.qstring.args.app_id).findOne({'_id': params.qstring.args.crash_id }, function (err, crash){
                        var comment;
                        if(crash && crash.comments){
                            for(var i = 0; i < crash.comments.length; i++){
                                if(crash.comments[i]._id == params.qstring.args.comment_id){
                                    comment = crash.comments[i];
                                    break;
                                }
                            }
                        }
                        if(comment && (comment.author_id == params.member._id+"" || params.member.global_admin)){
                            common.db.collection('app_crashgroups' + params.qstring.args.app_id).update({'_id': params.qstring.args.crash_id }, { $pull: { comments: { _id: params.qstring.args.comment_id } } }, function (err, res){
                                common.returnMessage(params, 200, 'Success');
                                return true;
                            });
                        }
                        else{
                            common.returnMessage(params, 200, 'Success');
                            return true;
                        }
                    });
				}, params);
                break;
            case 'delete':
                validate(params, function (params) {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).findOne({'_id': params.qstring.args.crash_id }, function (err, crash){
                        if(crash){
                            common.db.collection('app_crashes' + params.qstring.app_id).remove({'group': params.qstring.args.crash_id }, function(){});
                            common.db.collection('app_crashgroups' + params.qstring.app_id).remove({'_id': params.qstring.args.crash_id }, function(){});
                            var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id+"").digest('hex');
                            common.db.collection('crash_share').remove({'_id': id }, function (err, res){});
                            common.db.collection('app_crashusers' + params.qstring.app_id).find({"group":params.qstring.args.crash_id},{uid:1,_id:0}).toArray(function(err, users){
                                var uids = [];
                                for(var i = 0; i < users.length; i++){
                                    uids.push(users[i].uid);
                                }
                                common.db.collection('app_crashusers' + params.qstring.app_id).remove({"group":params.qstring.args.crash_id}, function(){});
                                var mod = {crashes:-1};
                                if(!crash.nonfatal)
                                    mod.fatal = -1;
                                common.db.collection('app_crashusers' + params.qstring.app_id).update({"group":0, uid:{$in:uids}}, {$inc:mod}, {multi:true}, function(err){
                                    common.db.collection('app_crashusers' + params.qstring.app_id).count({"group":0, crashes: { $gt: 0 }}, function(err, userCount){
                                        common.db.collection('app_crashusers' + params.qstring.app_id).count({"group":0, crashes: { $gt: 0 }, fatal: { $gt: 0 }}, function(err, fatalCount){
                                            var set = {};
                                            set.users = userCount;
                                            set.usersfatal = fatalCount;
                                            var inc = {};
                                            inc["crashes"] = -1;
                                            if(crash.nonfatal)
                                                inc["nonfatal"] = -crash.reports;
                                            else
                                                inc["fatal"] = -crash.reports;
                                            
                                            if(crash.is_new)
                                                inc["isnew"] = -1;
                                            
                                            if(crash.is_resolved)
                                                inc["resolved"] = -1;
                                            
                                            if(crash.loss)
                                                inc["loss"] = -crash.loss;
                                            
                                            if(crash.reports)
                                                inc["reports"] = -crash.reports;
                                            
                                            if(crash.is_renewed)
                                                inc["reoccurred"] = -1;
                                            
                                            if(crash.os)
                                                inc["os."+crash.os.replace(/^\$/, "").replace(/\./g, ":")] = -crash.reports;
                                            
                                            if(crash.app_version){
                                                for(var i in crash.app_version){
                                                    inc["app_version."+i] = -crash.app_version[i];
                                                }
                                            }
                                            common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': "meta" }, {$set:set, $inc:inc}, function (err, res){});
                                        });
                                    });
                                });
                            });
                        }
                        common.returnMessage(params, 200, 'Success');
                    });
				});
                break;
            default:
                common.returnMessage(params, 400, 'Invalid path');
                break;
        }
		return true;
	});
	
	plugins.register("/i/apps/create", function(ob){
		var params = ob.params;
		var appId = ob.appId;
        common.db.collection('app_crashgroups' + appId).insert({_id:"meta"},function(){});
		common.db.collection('app_crashusers' + appId).ensureIndex({"group":1, "uid":1}, {unique:true}, function(){});
		common.db.collection('app_crashusers' + appId).ensureIndex({"group":1, "crashes":1, "fatal":1}, {sparse:true}, function(){});
		common.db.collection('app_crashes' + appId).ensureIndex({"group":1},function(){});
	});
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('app_crashgroups' + appId).drop(function() {});
		common.db.collection('app_crashusers' + appId).drop(function() {});
		common.db.collection('app_crashes' + appId).drop(function() {});
        common.db.collection('crash_share').remove({'app_id': appId }, function (err, res){});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}},function(){});
        if(common.drillDb)
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
	});
    
    plugins.register("/i/apps/clear", function(ob){
		var appId = ob.appId;
        var ids = ob.ids;
		common.db.collection('crashdata').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:ids}}]},function(){});
        common.db.collection('app_crashes' + appId).remove({ts:{$lt:ob.moment.unix()}}, function() {});
        if(common.drillDb)
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).remove({ts:{$lt:ob.moment.valueOf()}}, function() {});
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
		common.db.collection('app_crashes' + appId).drop(function() {
            common.db.collection('app_crashes' + appId).ensureIndex({"group":1},function(){});
        });
        common.db.collection('app_crashusers' + appId).drop(function() {
            common.db.collection('app_crashusers' + appId).ensureIndex({"group":1, "uid":1}, {unique:true}, function(){});
            common.db.collection('app_crashusers' + appId).ensureIndex({"group":1, "crashes":1, "fatal":1}, {sparse:true}, function(){});
        });
        common.db.collection('app_crashgroups' + appId).drop(function() {
            common.db.collection('app_crashgroups' + appId).insert({_id:"meta"},function(){});
        });
        common.db.collection('crash_share').remove({'app_id': appId }, function (err, res){});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}},function(){});
        if(common.drillDb)
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
	});
}(plugin));

module.exports = plugin;