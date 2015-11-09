var plugin = {},
    crypto = require('crypto'),
	common = require('../../../api/utils/common.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js');

(function (plugin) {
    plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "views") {
			validateUserForDataReadAPI(params, fetch.fetchTimeObj, 'views');
			return true;
		}
		return false;
	});
    
    plugins.register("/o/actions", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (common.drillDb && params.qstring.view) {
			validateUserForDataReadAPI(params, function(){
                var result = {types:[], data:[]};
                var collectionName = "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
                common.drillDb.collection(collectionName).findOne( {"_id": "meta"},{_id:0, "sg.type":1, "sg.domain":1} ,function(err,meta){
                    result.types = meta.sg.type.values
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
        var params = ob.params;
        var dbAppUser = ob.dbAppUser;
        if(dbAppUser && dbAppUser.vc){
            common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id },{}, {$set:{vc:0}},{upsert:true, new:false}, function (err, user){
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
                }
            });
        }
    });
    plugins.register("/i", function(ob){
        var params = ob.params;
        if (params.qstring.events) {
            var currEvent;
            for (var i=0; i < params.qstring.events.length; i++) {
                currEvent = params.qstring.events[i];
                if (currEvent.key == "[CLY]_view" && currEvent.segmentation && currEvent.segmentation.name)
                    processView(params, currEvent);
            }
        }
    });
    
    function processView(params, currEvent){
        var escapedMetricVal = (currEvent.segmentation.name+"").replace(/^\$/, "").replace(/\./g, "&#46;");
            
        var update = {$set:{lv:currEvent.segmentation.name}};
        
        if(currEvent.segmentation.visit){
            update["$inc"] = {vc:1};
            update["$max"] = {lvt:params.time.timestamp};
        }
            
        common.db.collection('app_users' + params.app_id).findAndModify({'_id': params.app_user_id },{}, update,{upsert:true, new:false}, function (err, user){
            if(currEvent.segmentation.visit){
                var lastView = {};
                lastView[escapedMetricVal] = params.time.timestamp;           
                common.db.collection('app_views' + params.app_id).findAndModify({'_id': params.app_user_id },{}, {$max:lastView},{upsert:true, new:false}, function (err, view){
                    recordMetrics(params, currEvent, user, view);
                });
            }
            else{
                recordMetrics(params, currEvent, user);
            }
        });
	}
    
    function recordMetrics(params, currEvent, user, view){
        var tmpMetric = { name: "_view", set: "views", short_code: "v" },
        tmpTimeObjZero = {},
        tmpTimeObjMonth = {},
        tmpSet = {},
        zeroObjUpdate = [],
        monthObjUpdate = [],
        escapedMetricVal = (currEvent.segmentation.name+"").replace(/^\$/, "").replace(/\./g, "&#46;");
    
        //making sure metrics are strings
        tmpSet["meta." + tmpMetric.set] = escapedMetricVal;
        
        if(currEvent.segmentation.visit){
            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap['total']);
            if (!user || !user.lv) {
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
        
        if(currEvent.dur){
            common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + '.' + common.dbMap['duration'], currEvent.dur, true);
        }
        
        var dateIds = common.getDateIds(params),
            tmpZeroId = params.app_id + "_" + dateIds.zero,
            tmpMonthId = params.app_id + "_" + dateIds.month;
        
        if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
            var update = {$set: {m: dateIds.zero, a: params.app_id + ""}};
            if(Object.keys(tmpTimeObjZero).length)
                update["$inc"] = tmpTimeObjZero;
            if(Object.keys(tmpSet).length)
                update["$addToSet"] = tmpSet;
            common.db.collection("views").update({'_id': tmpZeroId}, update, {'upsert': true}, function(){});
        }
        
        if (Object.keys(tmpTimeObjMonth).length)
            common.db.collection("views").update({'_id': tmpMonthId}, {$set: {m: dateIds.month, a: params.app_id + ""}, '$inc': tmpTimeObjMonth}, {'upsert': true}, function(){});
    }
	
}(plugin));

module.exports = plugin;