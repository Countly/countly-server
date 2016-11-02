var plugin = {},
    crypto = require('crypto'),
    request = require('request'),
    Promise = require("bluebird"),
	common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js');

(function (plugin) {
    plugins.setConfigs("views", {
        view_limit: 1000
    });
    
    plugins.internalDrillEvents.push("[CLY]_view");
    plugins.internalDrillEvents.push("[CLY]_action");
    
    plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "views") {
			validateUserForDataReadAPI(params, function(){
                fetch.fetchTimeObj("app_viewdata"+params.app_id, params, true);
            });
			return true;
		}
        else if (params.qstring.method == "get_view_segments") {
			validateUserForDataReadAPI(params, function(){
                common.db.collection("app_viewdata"+params.app_id).findOne({'_id': "meta"}, function(err, res){
                    common.returnOutput(params,res);
                });
            });
			return true;
		}
		return false;
	});
    
    plugins.register("/o/urltest", function(ob){
        var params = ob.params;
        if(params.qstring.url){
            var options = {
                url: params.qstring.url,
                headers: {
                    'User-Agent': 'CountlySiteBot'
                }
            };
            request(options, function (error, response, body) {
                if (!error && response.statusCode >= 200 && response.statusCode < 400) {
                    common.returnOutput(params,{result:true});
                }
                else{
                    common.returnOutput(params,{result:false});
                }
            });
        }
        else{
            common.returnOutput(params,{result:false});
        }
        return true;
    });
    
    plugins.register("/o/urlredir", function(ob){
        var params = ob.params;
        if(params.qstring.url){
            params.res.writeHead(302, {
                'Location': params.qstring.url,
            });
            params.res.end();
        }
        else{
            common.returnOutput(params,{result:false});
        }
        return true;
    });
    
    plugins.register("/o/actions", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (common.drillDb && params.qstring.view) {
			validateUserForDataReadAPI(params, function(){
                var result = {types:[], data:[]};
                var collectionName = "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
                common.drillDb.collection(collectionName).findOne( {"_id": "meta"},{_id:0, "sg.type":1, "sg.domain":1} ,function(err,meta){
                    if(meta && meta.sg && meta.sg.type)
                        result.types = meta.sg.type.values || values
                    else
                        result.types = [];
                    if(meta && meta.sg && meta.sg.domain)
                        result.domains = meta.sg.domain.values || values
                    else
                        result.domains = [];
                    if (params.qstring.period) {
                        //check if period comes from datapicker
                        if (params.qstring.period.indexOf(",") !== -1) {
                            try {
                                params.qstring.period = JSON.parse(params.qstring.period);
                            } catch (SyntaxError) {
                                console.log('Parsing custom period failed!');
                                common.returnMessage(params, 400, 'Bad request parameter: period');
                                return false;
                            }
                        }
                        else{
                            switch (params.qstring.period){
                                case "month":
                                case "day":
                                case "yesterday":
                                case "hour":
                                case "7days":
                                case "30days":
                                case "60days":
                                    break;
                                default:
                                    common.returnMessage(params, 400, 'Bad request parameter: period');
                                    return false;
                                    break;
                            }
                        }
                    } else {
                        common.returnMessage(params, 400, 'Missing request parameter: period');
                        return false;
                    }
                    countlyCommon.setPeriod(params.qstring.period);
                    countlyCommon.setTimezone(params.appTimezone);
                    var periodObj = countlyCommon.periodObj,
                        queryObject = {"up.lv":params.qstring.view},
                        now = params.time.now.toDate();
            
                    //create current period array if it does not exist
                    if (!periodObj.currentPeriodArr) {
                        periodObj.currentPeriodArr = [];
            
                        //create a period array that starts from the beginning of the current year until today
                        if (params.qstring.period == "month") {
                            for (var i = 0; i < (now.getMonth() + 1); i++) {
                                var daysInMonth = moment().month(i).daysInMonth();
            
                                for (var j = 0; j < daysInMonth; j++) {
                                    periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));
            
                                    // If current day of current month, just break
                                    if ((i == now.getMonth()) && (j == (now.getDate() - 1))) {
                                        break;
                                    }
                                }
                            }
                        }
                        //create a period array that starts from the beginning of the current month until today
                        else if(params.qstring.period == "day") {
                            for(var i = 0; i < now.getDate(); i++) {
                                periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1));
                            }
                        }
                        //create one day period array
                        else{
                            periodObj.currentPeriodArr.push(periodObj.activePeriod);
                        }
                    }
            
                    //get timestamps of start of days (DD-MM-YYYY-00:00) with respect to apptimezone for both beginning and end of period arrays
                    var tmpArr;
                    queryObject.ts = {};
            
                    tmpArr = periodObj.currentPeriodArr[0].split(".");
                    queryObject.ts.$gte = new Date(Date.UTC(parseInt( tmpArr[0]),parseInt(tmpArr[1])-1,parseInt(tmpArr[2]) ));
                    queryObject.ts.$gte.setTimezone(params.appTimezone);
                    queryObject.ts.$gte = queryObject.ts.$gte.getTime() + queryObject.ts.$gte.getTimezoneOffset()*60000;
            
                    tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
                    queryObject.ts.$lt = new Date(Date.UTC(parseInt( tmpArr[0]),parseInt(tmpArr[1])-1,parseInt(tmpArr[2]) ));
                    queryObject.ts.$lt.setDate(queryObject.ts.$lt.getDate() + 1);
                    queryObject.ts.$lt.setTimezone(params.appTimezone);
                    queryObject.ts.$lt = queryObject.ts.$lt.getTime() + queryObject.ts.$lt.getTimezoneOffset()*60000;
                    
                    if(params.qstring.segment)
                        queryObject["sg.segment"] = params.qstring.segment;
                    common.drillDb.collection(collectionName).find( queryObject,{_id:0, c:1, "sg.type":1, "sg.x":1, "sg.y":1, "sg.width":1, "sg.height":1}).toArray(function(err,data){
                        result.data = data;
                        common.returnOutput(params,result);
                    });
                });
            });
			return true;
		}
		return false;
	});
    
    plugins.register("/session/post", function(ob){
        return new Promise(function(resolve, reject){
            var params = ob.params;
            var dbAppUser = ob.dbAppUser;
            if(dbAppUser && dbAppUser.vc){
                var user = params.app_user;
                if(user && user.vc){
                    var ranges = [
                        [0,2],
                        [3,5],
                        [6,10],
                        [11,15],
                        [16,30],
                        [31,50],
                        [51,100]
                    ],
                    rangesMax = 101,
                    calculatedRange,
                    updateUsers = {},
                    updateUsersZero = {},
                    dbDateIds = common.getDateIds(params),
                    monthObjUpdate = [];
        
                    if (user.vc >= rangesMax) {
                        calculatedRange = (ranges.length) + '';
                    } else {
                        for (var i=0; i < ranges.length; i++) {
                            if (user.vc <= ranges[i][1] && user.vc >= ranges[i][0]) {
                                calculatedRange = i + '';
                                break;
                            }
                        }
                    }
                
                    monthObjUpdate.push('vc.' + calculatedRange);
                    common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
                    common.fillTimeObjectZero(params, updateUsersZero, 'vc.' + calculatedRange);
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {'$inc': updateUsers}, function(){});
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero}, {'$inc': updateUsersZero, '$addToSet': {'meta.v-ranges': calculatedRange}}, function(){});
                    
                    if(user.lv){
                        if(ob.end_session || user.lvt && params.time.timestamp - user.lvt > 300){
                            var segmentation = {name:user.lv.replace(/^\$/, "").replace(/\./g, "&#46;"), exit:1};
                            if(user.vc == 1){
                                segmentation.bounce = 1;
                            }
                            recordMetrics(params, {key:"[CLY]_view", segmentation:segmentation}, user);
                        }
                    }
                    common.updateAppUser(params, {$set:{vc:0}});
                    resolve();
                }
                else{
                    resolve();
                }
            }
            else{
                resolve();
            }
        });
    });
    
    plugins.register("/i", function(ob){
        return new Promise(function(resolve, reject){
            var params = ob.params;
            if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
                params.qstring.events = params.qstring.events.filter(function(currEvent){
                    if (currEvent.key == "[CLY]_view"){
                        if(currEvent.segmentation && currEvent.segmentation.name){
                            processView(params, currEvent);
                            if(currEvent.segmentation.visit){
                                var events = [currEvent];
                                plugins.dispatch("/plugins/drill", {params:params, dbAppUser:params.app_user, events:events});
                            }
                            else{
                                if(currEvent.dur || currEvent.segmentation.dur){
                                    plugins.dispatch("/view/duration", {params:params, duration:currEvent.dur || currEvent.segmentation.dur});
                                }
                            }
                        }
                        return false;
                    }
                    return true;
                });
            }
            resolve();
        });
    });
    
    function processView(params, currEvent){
        var escapedMetricVal = common.db.encode(currEvent.segmentation.name+"");
            
        var update = {$set:{lv:currEvent.segmentation.name}};
        
        if(currEvent.segmentation.visit){
            update["$inc"] = {vc:1};
            update["$max"] = {lvt:params.time.timestamp};
        }
        common.updateAppUser(params, update);
        if(currEvent.segmentation.visit){
            var lastView = {};
            lastView[escapedMetricVal] = params.time.timestamp;           
            common.db.collection('app_views' + params.app_id).findAndModify({'_id': params.app_user_id },{}, {$max:lastView},{upsert:true, new:false}, function (err, view){
                recordMetrics(params, currEvent, params.app_user, view && view.ok ? view.value : null);
            });
        }
        else{
            recordMetrics(params, currEvent, params.app_user);
        }
	}
    
    function recordMetrics(params, currEvent, user, view){
        var tmpMetric = { name: "_view", set: "views", short_code: "v" },
        tmpTimeObjZero = {},
        tmpTimeObjMonth = {},
        tmpSet = {},
        zeroObjUpdate = [],
        monthObjUpdate = [],
        escapedMetricVal = common.db.encode(currEvent.segmentation.name+""),
        postfix = common.crypto.createHash("md5").update(escapedMetricVal).digest('base64')[0];
    
        //making sure metrics are strings
        tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;
        
        var dateIds = common.getDateIds(params),
            tmpZeroId = "no-segment_" + dateIds.zero + "_" + postfix,
            tmpMonthId = "no-segment_" + dateIds.month + "_" + postfix;
                
        common.db.collection("app_viewdata"+params.app_id).findOne({'_id': tmpZeroId}, {meta_v2:1}, function(err, res){
            //checking if view should be ignored because of limit
            if(!err && res && res.meta_v2 && res.meta_v2.views && Object.keys(res.meta_v2.views).length >= plugins.getConfig("views").view_limit){
                return;
            }
            if(currEvent.segmentation.visit){
                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['total']);
                if (view && !view[escapedMetricVal]) {
                    monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['new']);
                }
                if (view && view[escapedMetricVal]) {
                    var lastViewTimestamp = view[escapedMetricVal],
                        currDate = common.getDate(params.time.timestamp, params.appTimezone),
                        lastViewDate = common.getDate(lastViewTimestamp, params.appTimezone),
                        secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                        secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                        secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                        secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;
                        
                    if (lastViewTimestamp < (params.time.timestamp - secInMin)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                    }
            
                    if (lastViewTimestamp < (params.time.timestamp - secInHour)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                    }
            
                    if (lastViewDate.getFullYear() == params.time.yearly &&
                        Math.ceil(common.moment(lastViewDate).format("DDD") / 7) < params.time.weekly) {
                        tmpTimeObjZero["d.w" + params.time.weekly + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                    }
            
                    if (lastViewTimestamp < (params.time.timestamp - secInMonth)) {
                        tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                    }
            
                    if (lastViewTimestamp < (params.time.timestamp - secInYear)) {
                        tmpTimeObjZero['d.' + escapedMetricVal + '.' + common.dbMap['unique']] = 1;
                    }
                }
                else{
                    common.fillTimeObjectZero(params, tmpTimeObjZero, escapedMetricVal + '.' + common.dbMap['unique']);
                    common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + '.' + common.dbMap['unique'], 1, true);
                }
            }
            
            if(currEvent.segmentation.start){
                monthObjUpdate.push(escapedMetricVal + '.s');
            }
            
            if(currEvent.segmentation.exit){
                monthObjUpdate.push(escapedMetricVal + '.e');
            }
            
            
            if(currEvent.segmentation.bounce){
                monthObjUpdate.push(escapedMetricVal + '.b');
            }
            
            common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
            common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate, 1, true);
            
            if(currEvent.dur || currEvent.segmentation.dur){
                var dur = 0;
                if(currEvent.dur)
                    dur = parseInt(currEvent.dur);
                else if(currEvent.segmentation.dur)
                    dur = parseInt(currEvent.segmentation.dur);
                common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + '.' + common.dbMap['duration'], dur, true);
            }
            
            if(typeof currEvent.segmentation.segment != "undefined"){
                currEvent.segmentation.segment = common.db.encode(currEvent.segmentation.segment+"");
                common.db.collection("app_viewdata"+params.app_id).update({'_id': "meta"}, {$addToSet: {"segments":currEvent.segmentation.segment}}, {'upsert': true}, function(){});
            }
            
            if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                tmpSet.m = dateIds.zero;
                tmpSet.a = params.app_id + "";
                var update = {$set: tmpSet};
                if(Object.keys(tmpTimeObjZero).length)
                    update["$inc"] = tmpTimeObjZero;
                common.db.collection("app_viewdata"+params.app_id).update({'_id': tmpZeroId}, update, {'upsert': true}, function(){});
                if(typeof currEvent.segmentation.segment != "undefined"){
                    common.db.collection("app_viewdata"+params.app_id).update({'_id': currEvent.segmentation.segment+"_"+dateIds.zero + "_" + postfix}, update, {'upsert': true}, function(){});
                }
            }
            
            if (Object.keys(tmpTimeObjMonth).length){
                var update = {$set: {m: dateIds.month, a: params.app_id + ""}};
                if(Object.keys(tmpTimeObjMonth).length)
                    update["$inc"] = tmpTimeObjMonth;
                common.db.collection("app_viewdata"+params.app_id).update({'_id': tmpMonthId}, update, {'upsert': true}, function(){});
                if(typeof currEvent.segmentation.segment != "undefined"){
                    common.db.collection("app_viewdata"+params.app_id).update({'_id': currEvent.segmentation.segment+"_"+dateIds.month + "_" + postfix}, update, {'upsert': true}, function(){});
                }
            }
        });
    }
    
    plugins.register("/i/apps/create", function(ob){
		var params = ob.params;
		var appId = ob.appId;
        common.db.collection("app_viewdata" + appId).insert({_id:"meta"},function(){});
	});
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('app_viewdata' + appId).drop(function() {});
		common.db.collection('app_views' + appId).drop(function() {});
        if(common.drillDb){
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }
	});
    
    plugins.register("/i/apps/clear", function(ob){
		var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('app_viewdata' + appId).findOne({_id:"meta"}, function(err, doc){
            if(!err && doc && doc.segments){
                doc.segments.push("no-segment");
                for(var i = 0; i < doc.segments.length; i++){
                    common.db.collection('app_viewdata' + appId).remove({$and:[{'_id': {$regex: doc.segments[i] + ".*"}}, {'_id': {$nin:ids}}]},function(){}); 
                }
            }
        });
        if(common.drillDb){
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).remove({ts:{$lt:ob.moment.valueOf()}}, function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).remove({ts:{$lt:ob.moment.valueOf()}}, function() {});
        }
	});
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
        common.db.collection('app_viewdata' + appId).drop(function() {
            common.db.collection("app_viewdata" + appId).insert({_id:"meta"},function(){});
        });
		common.db.collection('app_views' + appId).drop(function() {});
        if(common.drillDb){
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }
	});
	
}(plugin));

module.exports = plugin;