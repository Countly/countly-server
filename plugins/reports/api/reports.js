var reports = {},
    async = require("async"),
    moment = require("moment"),
    ejs = require("ejs"),
    fs = require('fs'),
    path = require('path'),
    parser = require('properties-parser'),
    request = require('request'),
    crypto = require('crypto'),
    mail = require("../../../api/parts/mgmt/mail"),
    plugins = require("../../pluginManager"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    localize = require('../../../api/utils/localization.js'),
    versionInfo = require('../../../frontend/express/version.info');
    
versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null;
versionInfo.title = versionInfo.title || "Countly";
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var metrics = {
    "analytics":{
        "total_sessions":true,
        "total_users":true,
        "new_users":true,
        "total_time":true,
        "avg_time":true,
    },
    "revenue":{
        "paying_users":true,
        "purchases":true,
    },
    "push":{
        "messaging_users":true,
        "push_sent":true,
        "push_open":true,
        "push_action":true,
    },
    "crash":{
        "new_crashes":true,
        "total_crashes":true,
        "fatal_crashes":true,
        "non_fatal_crashes":true,
        "resolved_upgrades":true,
    }
};
(function (reports) {
    reports.sendReport = function(db, id, callback){
        reports.loadReport(db, id, function(err, report){
            reports.getReport(db, report, function(err, ob){
                if(!err){
                    reports.send(ob.report, ob.message, function(){
                        if(callback)
                            callback(err, ob.message);
                    });
                }
                else if(callback)
                    callback(err, ob.message);
            });
        });
    };
    
    reports.loadReport = function(db, id, callback){
        db.collection('reports').findOne({_id:db.ObjectID(id)},function(err, report){
            if(callback)
                callback(err, report)
        });
    };
    
    reports.getReport = function(db, report, callback, cache){
        cache = cache || {};
        if(report && report.apps){
            db.collection('members').findOne({_id:db.ObjectID(report.user)}, function (err, member) {
                if(member)
                    report.apps = sortBy(report.apps, member.appSortList || []);
                var endDate = new Date();
                endDate.setDate(endDate.getDate()-1);
                endDate.setHours(23, 59);
                report.end = endDate.getTime();
                report.start = report.end - 24*60*59*1000;
                if(report.frequency == "weekly")
                    report.start = report.end - 7*24*60*59*1000;
                
                var startDate = new Date(report.start);
                report.date = startDate.getDate()+" "+months[startDate.getMonth()];
                report.period = "yesterday";
                if(report.frequency == "weekly"){
                    report.period = "["+report.start+","+report.end+"]";
                    report.date += " - "+endDate.getDate()+" "+months[endDate.getMonth()];
                }
                
                function appIterator(app_id, done){
                    var params = {qstring:{period:report.period}};
                    if(!cache[app_id]){
                        function metricIterator(metric, done){
                            if(metric.indexOf("events") == 0){
                                var parts = metric.split(".");
                                var event = null;
                                //replace with app's iap_key
                                if(parts[1] == "purchases"){
                                    if(params.app.iap_event && params.app.iap_event != "")
                                        event = params.app.iap_event;
                                }
                                else if(parts[1] == "[CLY]_push_sent" || parts[1] == "[CLY]_push_open" || parts[1] == "[CLY]_push_action"){
                                    if((params.app.gcm && Object.keys(params.app.gcm).length) || (params.app.apn && Object.keys(params.app.apn).length))
                                        event = parts[1];
                                }
                                if(event){
                                    var collectionName = "events" + crypto.createHash('sha1').update(event + app_id).digest('hex');
                                    fetchTimeObj(db, collectionName, params, true, function(output){
                                        done(null, {metric:parts[1], data:output});
                                    });
                                }
                                else{
                                    done(null, null);
                                }
                            }
                            else
                                fetchTimeObj(db, metric, params, null, function(output){
                                    done(null, {metric:metric, data:output});
                                });
                        };
                        db.collection('apps').findOne({_id:db.ObjectID(app_id)},function(err, app){
                            if (app) {
                                params.app_id = app['_id'];
                                params.app_cc = app['country'];
                                params.app_name = app['name'];
                                params.appTimezone = app['timezone'];
                                params.app = app;
                                async.map(metricsToCollections(report.metrics), metricIterator, function(err, results) {
                                    app.results = {};
                                    for(var i = 0; i < results.length; i++){
                                        if(results[i] && results[i].metric)
                                            app.results[results[i].metric] = results[i].data;
                                    }
                                    cache[app_id] = JSON.parse(JSON.stringify(app));
                                    done(null, app);
                                });
                            }
                            else
                            done(null, null); 
                        });
                    }
                    else{
                        done(null, JSON.parse(JSON.stringify(cache[app_id])));
                    }
                };
    
                async.map(report.apps, appIterator, function(err, results) {
                    report.total_new = 0;
                    var total = 0;
                    for(var i = 0; i < results.length; i++){
                        if(results[i] && results[i].results){
                            for(var j in results[i].results){
                                if(j == "users"){
                                    results[i].results[j] = getSessionData(results[i].results[j] || {});
                                    if(results[i].results[j].total_sessions.total > 0)
                                        results[i].display = true;
                                    total += results[i].results[j].total_sessions.total;
                                    report.total_new += results[i].results[j].new_users.total;
                                    
                                    results[i].results["analytics"] = results[i].results[j];
                                    delete results[i].results[j];
                                    
                                    if(results[i].iap_event && results[i].iap_event != ""){
                                        if(!results[i].results["revenue"]){
                                            results[i].results["revenue"] = {};
                                        }
                                        results[i].results["revenue"].paying_users = results[i].results["analytics"].paying_users;
                                    }
                                    delete results[i].results["analytics"].paying_users;
                                    
                                    if((results[i].gcm && Object.keys(results[i].gcm).length) || (results[i].apn && Object.keys(results[i].apn).length)){
                                        if(!results[i].results["push"]){
                                            results[i].results["push"] = {};
                                        }
                                        results[i].results["push"].messaging_users = results[i].results["analytics"].messaging_users;
                                    }
                                    delete results[i].results["analytics"].messaging_users;
                                }
                                else if(j == "crashdata"){
                                    results[i].results["crash"] = getCrashData(results[i].results[j] || {});
                                    delete results[i].results[j];
                                }
                                else if(j == "[CLY]_push_sent" || j == "[CLY]_push_open" || j == "[CLY]_push_action"){
                                    if(!results[i].results["push"]){
                                        results[i].results["push"] = {};
                                    }
                                    results[i].results["push"][j.replace("[CLY]_", "")] = getEventData(results[i].results[j] || {});
                                    delete results[i].results[j];
                                }
                                else if(j == "purchases"){
                                    if(!results[i].results["revenue"]){
                                        results[i].results["revenue"] = {};
                                    }
                                    results[i].results["revenue"][j] = getEventData(results[i].results[j] || {});
                                    delete results[i].results[j];
                                }
                            }
                        }
                    }
                    
                    if(total > 0){                  
                        function process(){
                            mail.lookup(function(err, host) {
                                //generate html
                                var dir = path.resolve(__dirname, '../frontend/public');
                                //get template
                                fs.readFile(dir+'/templates/email.html', 'utf8', function (err,template) {
                                    if (err) {
                                        if(callback)
                                            callback(err, {report:report});
                                    }
                                    else{
                                        member.lang = member.lang || "en";
                                        //get language property file
                                        localize.getProperties(member.lang, function (err,props) {
                                            if (err) {
                                                if(callback)
                                                    callback(err, {report:report});
                                            }
                                            else{
                                                report.properties = props;
                                                var allowedMetrics = {};
                                                for(var i in report.metrics){
                                                    if(metrics[i]){
                                                        for(var j in metrics[i]){
                                                            allowedMetrics[j] = true;
                                                        }
                                                    }
                                                }
                                                var message = ejs.render(template, {"apps":results, "host":host, "report":report, "version":versionInfo, "properties":props, metrics:allowedMetrics});
                                                if(callback){
                                                    callback(err, {"apps":results, "host":host, "report":report, "version":versionInfo, "properties":props, message:message});
                                                }
                                            }
                                        });
                                    }
                                });
                            });
                        }
                        
                        if(versionInfo.title.indexOf("Countly") > -1){
                            var options = {
                                uri: 'http://count.ly/email-news.txt',
                                method: 'GET'
                            };
                    
                            request(options, function (error, response, body) {
                                if(!error){
                                    try{
                                        var arr = JSON.parse(body);
                                        report.universe = arr[Math.floor(Math.random()*arr.length)];
                                    }
                                    catch(ex){}
                                }
                                process();
                            });
                        }
                        else{
                            process();
                        }
                    }
                    else if(callback)
                        callback("No data to report", {report:report});
                });
            });
        }
        else if(callback)
            callback("Report not found", {report:report});
    };
    
    reports.send = function(report, message, callback){
        if(report.emails){
            for(var i = 0; i < report.emails.length; i++){
                var msg = {
                    to:report.emails[i],
                    from:versionInfo.title,
                    subject:versionInfo.title+': You had '+report.total_new+' new users '+report.properties["reports.time-"+report.frequency]+'!',
                    html: message
                };
                if(mail.sendPoolMail)
                    mail.sendPoolMail(msg, callback);
                else
                    mail.sendMail(msg, callback);
            }
        }
    };
    
    function metricsToCollections(metrics){
        var collections = {users:true};
        for(var i in metrics){
            if(metrics[i]){
                if(i == "analytics")
                    collections["users"] = true;
                else if(i == "crash" && plugins.getConfig("plugins").crashes)
                    collections["crashdata"] = true;
                else if(i == "push"){
                    collections["events.[CLY]_push_sent"] = true;
                    collections["events.[CLY]_push_open"] = true;
                    collections["events.[CLY]_push_action"] = true;
                }
                else if(i == "revenue"){
                    collections["events.purchases"] = true;
                }
            }
        }
        return Object.keys(collections);
    }
    
    function fetchTimeObj(db, collection, params, isCustomEvent, callback) {
        var periodObj = getPeriodObj(params),
            documents = [];

        if (isCustomEvent) {
            var segment = params.qstring.segmentation || "no-segment";

            for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
            }

            for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                documents.push(segment + "_" + periodObj.reqMonthDbDateIds[i]);
            }
        } else {
            for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push(params.app_id + "_" + periodObj.reqZeroDbDateIds[i]);
            }

            for (var i = 0; i < periodObj.reqMonthDbDateIds.length; i++) {
                documents.push(params.app_id + "_" + periodObj.reqMonthDbDateIds[i]);
            }
        }

        db.collection(collection).find({'_id': {$in: documents}}, {}).toArray(function(err, dataObjects) {
            callback(getMergedObj(dataObjects));
        });

        function getMergedObj(dataObjects, isRefresh) {
            var mergedDataObj = {};

            if(dataObjects){
                for (var i = 0; i < dataObjects.length; i++) {
                    if (!dataObjects[i] || !dataObjects[i].m) {
                        continue;
                    }
    
                    var mSplit = dataObjects[i].m.split(":"),
                        year = mSplit[0],
                        month = mSplit[1];
    
                    if (!mergedDataObj[year]) {
                        mergedDataObj[year] = {};
                    }
    
                    if (month == 0) {
                        if (mergedDataObj['meta']) {
                            for (var metaEl in dataObjects[i]['meta']) {
                                if (mergedDataObj['meta'][metaEl]) {
                                    mergedDataObj['meta'][metaEl] = union(mergedDataObj['meta'][metaEl], dataObjects[i]['meta'][metaEl]);
                                } else {
                                    mergedDataObj['meta'][metaEl] = dataObjects[i]['meta'][metaEl];
                                }
                            }
                        } else {
                            mergedDataObj['meta'] = dataObjects[i]['meta'] || [];
                        }
    
                        if (mergedDataObj[year]) {
                            for (var prop in dataObjects[i]['d']) {
                                mergedDataObj[year][prop] = dataObjects[i]['d'][prop];
                            }
                        } else {
                            mergedDataObj[year] = dataObjects[i]['d'] || {};
                        }
                    } else {
                        if (mergedDataObj[year][month]) {
                            for (var prop in dataObjects[i]['d']) {
                                mergedDataObj[year][month][prop] = dataObjects[i]['d'][prop];
                            }
                        } else {
                            mergedDataObj[year][month] = dataObjects[i]['d'] || {};
                        }
    
                        if (!isRefresh) {
                            for (var day in dataObjects[i]['d']) {
                                for (var prop in dataObjects[i]['d'][day]) {
                                    if ((collection == 'users' || dataObjects[i]['s'] == 'no-segment') && prop <= 23 && prop >= 0) {
                                        continue;
                                    }
    
                                    if (typeof dataObjects[i]['d'][day][prop] === 'object') {
                                        for (var secondLevel in dataObjects[i]['d'][day][prop]) {
                                            if (secondLevel == "t" || secondLevel == 'n' ||
                                                secondLevel == 'c' || secondLevel == 's') {
                                                if (!mergedDataObj[year][month][prop]) {
                                                    mergedDataObj[year][month][prop] = {};
                                                }
    
                                                if (mergedDataObj[year][month][prop][secondLevel]) {
                                                    mergedDataObj[year][month][prop][secondLevel] += dataObjects[i]['d'][day][prop][secondLevel];
                                                } else {
                                                    mergedDataObj[year][month][prop][secondLevel] = dataObjects[i]['d'][day][prop][secondLevel];
                                                }
    
                                                if (!mergedDataObj[year][prop]) {
                                                    mergedDataObj[year][prop] = {};
                                                }
    
                                                if (mergedDataObj[year][prop][secondLevel]) {
                                                    mergedDataObj[year][prop][secondLevel] += dataObjects[i]['d'][day][prop][secondLevel];
                                                } else {
                                                    mergedDataObj[year][prop][secondLevel] = dataObjects[i]['d'][day][prop][secondLevel];
                                                }
                                            }
                                        }
                                    } else if (prop == 't' || prop == 'n' ||
                                        prop == 'd' || prop == 'e' ||
                                        prop == 'c' || prop == 's') {
    
                                        if (mergedDataObj[year][month][prop]) {
                                            mergedDataObj[year][month][prop] += dataObjects[i]['d'][day][prop];
                                        } else {
                                            mergedDataObj[year][month][prop] = dataObjects[i]['d'][day][prop];
                                        }
    
                                        if (mergedDataObj[year][prop]) {
                                            mergedDataObj[year][prop] += dataObjects[i]['d'][day][prop];
                                        } else {
                                            mergedDataObj[year][prop] = dataObjects[i]['d'][day][prop];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return mergedDataObj;
        }
    };
    
    function getPeriodObj(params) {
		params.qstring.period = params.qstring.period || "month";
        if (params.qstring.period && params.qstring.period.indexOf(",") !== -1) {
            try {
                params.qstring.period = JSON.parse(params.qstring.period);
            } catch (SyntaxError) {
				console.log('Parse period JSON failed');
                return false;
            }
        }

        countlyCommon.setPeriod(params.qstring.period);
        countlyCommon.setTimezone(params.appTimezone);

        return countlyCommon.periodObj;
    }
    
    function getSessionData(_sessionDb) {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentPayingTotal = 0,
            previousPayingTotal = 0,
            currentMsgEnabledTotal = 0,
            previousMsgEnabledTotal = 0,
            currentNew = 0,
            previousNew = 0,
            currentUnique = 0,
            previousUnique = 0,
            currentDuration = 0,
            previousDuration = 0,
            currentEvents = 0,
            previousEvents = 0,
            isEstimate = false;

        if (_periodObj.isSpecialPeriod) {

            isEstimate = true;

            for (var i = 0; i < (_periodObj.uniquePeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodArr[i]);
                tmp_x = clearSessionObject(tmp_x);
                currentUnique += tmp_x["u"];
                currentPayingTotal += tmp_x["p"];
                currentMsgEnabledTotal += tmp_x["m"];
            }

            var tmpUniqObj,
                tmpCurrentUniq = 0,
                tmpCurrentPaying = 0,
                tmpCurrentMsgEnabled = 0;

            for (var i = 0; i < (_periodObj.uniquePeriodCheckArr.length); i++) {
                tmpUniqObj = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodCheckArr[i]);
                tmpUniqObj = clearSessionObject(tmpUniqObj);
                tmpCurrentUniq += tmpUniqObj["u"];
                tmpCurrentPaying += tmpUniqObj["p"];
                tmpCurrentMsgEnabled += tmpUniqObj["m"];
            }

            //console.log(currentPayingTotal + " " + tmpCurrentPaying)

            if (currentUnique > tmpCurrentUniq) {
                currentUnique = tmpCurrentUniq;
            }

            if (currentPayingTotal > tmpCurrentPaying) {
                currentPayingTotal = tmpCurrentPaying;
            }

            if (currentMsgEnabledTotal > tmpCurrentMsgEnabled) {
                currentMsgEnabledTotal = tmpCurrentMsgEnabled;
            }

            for (var i = 0; i < (_periodObj.previousUniquePeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodArr[i]);
                tmp_y = clearSessionObject(tmp_y);
                previousUnique += tmp_y["u"];
                previousPayingTotal += tmp_y["p"];
                previousMsgEnabledTotal += tmp_y["m"];
            }

            var tmpUniqObj2,
                tmpPreviousUniq = 0,
                tmpPreviousPaying = 0,
                tmpPreviousMsgEnabled = 0;

            for (var i = 0; i < (_periodObj.previousUniquePeriodCheckArr.length); i++) {
                tmpUniqObj2 = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodCheckArr[i]);
                tmpUniqObj2 = clearSessionObject(tmpUniqObj2);
                tmpPreviousUniq += tmpUniqObj2["u"];
                tmpPreviousPaying += tmpUniqObj2["p"];
                tmpPreviousMsgEnabled += tmpUniqObj2["m"];
            }

            if (previousUnique > tmpPreviousUniq) {
                previousUnique = tmpPreviousUniq;
            }

            if (previousPayingTotal > tmpPreviousPaying) {
                previousPayingTotal = tmpPreviousPaying;
            }

            if (currentMsgEnabledTotal > tmpCurrentMsgEnabled) {
                currentMsgEnabledTotal = tmpCurrentMsgEnabled;
            }

            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriodArr[i]);
                tmp_x = clearSessionObject(tmp_x);
                tmp_y = clearSessionObject(tmp_y);

                currentTotal += tmp_x["t"];
                previousTotal += tmp_y["t"];
                currentNew += tmp_x["n"];
                previousNew += tmp_y["n"];
                currentDuration += tmp_x["d"];
                previousDuration += tmp_y["d"];
                currentEvents += tmp_x["e"];
                previousEvents += tmp_y["e"];
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriod);
            tmp_x = clearSessionObject(tmp_x);
            tmp_y = clearSessionObject(tmp_y);

            currentTotal = tmp_x["t"];
            previousTotal = tmp_y["t"];
            currentNew = tmp_x["n"];
            previousNew = tmp_y["n"];
            currentUnique = tmp_x["u"];
            previousUnique = tmp_y["u"];
            currentDuration = tmp_x["d"];
            previousDuration = tmp_y["d"];
            currentEvents = tmp_x["e"];
            previousEvents = tmp_y["e"];
            currentPayingTotal = tmp_x["p"];
            previousPayingTotal = tmp_y["p"];
            currentMsgEnabledTotal = tmp_x["m"];
            previousMsgEnabledTotal = tmp_y["m"];
        }

        var sessionDuration = (currentDuration / 60),
            previousSessionDuration = (previousDuration / 60),
            previousDurationPerUser = (previousTotal == 0) ? 0 : previousSessionDuration / previousTotal,
            durationPerUser = (currentTotal == 0) ? 0 : (sessionDuration / currentTotal),
            previousEventsPerUser = (previousUnique == 0) ? 0 : previousEvents / previousUnique,
            eventsPerUser = (currentUnique == 0) ? 0 : (currentEvents / currentUnique),
            changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeDuration = countlyCommon.getPercentChange(previousDuration, currentDuration),
            changeDurationPerUser = countlyCommon.getPercentChange(previousDurationPerUser, durationPerUser),
            changeNew = countlyCommon.getPercentChange(previousNew, currentNew),
            changeUnique = countlyCommon.getPercentChange(previousUnique, currentUnique),
            changeReturning = countlyCommon.getPercentChange((previousUnique - previousNew), (currentUnique - currentNew)),
            changeEvents = countlyCommon.getPercentChange(previousEvents, currentEvents),
            changeEventsPerUser = countlyCommon.getPercentChange(previousEventsPerUser, eventsPerUser),
            changePaying = countlyCommon.getPercentChange(previousPayingTotal, currentPayingTotal),
            changeMsgEnabled = countlyCommon.getPercentChange(previousMsgEnabledTotal, currentMsgEnabledTotal);

        var timeSpentString = (sessionDuration.toFixed(1)) + " min";

        if (sessionDuration >= 142560) {
            timeSpentString = (sessionDuration / 525600).toFixed(1) + " years";
        } else if (sessionDuration >= 1440) {
            timeSpentString = (sessionDuration / 1440).toFixed(1) + " days";
        } else if (sessionDuration >= 60) {
            timeSpentString = (sessionDuration / 60).toFixed(1) + " hours";
        }
        
        //var timeSpentString = countlyCommon.timeString(sessionDuration);

        dataArr =
        {
            "total_sessions":{
                "total":currentTotal,
                "change":changeTotal.percent,
                "trend":changeTotal.trend
            },
            "paying_users":{
                "total":currentPayingTotal,
                "prev-total":previousPayingTotal,
                "change":changePaying.percent,
                "trend":changePaying.trend,
                "isEstimate":isEstimate
            },
            "total_users":{
                "total":currentUnique,
                "prev-total":previousUnique,
                "change":changeUnique.percent,
                "trend":changeUnique.trend,
                "isEstimate":isEstimate
            },
            "messaging_users":{
                "total":currentMsgEnabledTotal,
                "prev-total":previousMsgEnabledTotal,
                "change":changeMsgEnabled.percent,
                "trend":changeMsgEnabled.trend,
                "isEstimate":isEstimate
            },
            "new_users":{
                "total":currentNew,
                "change":changeNew.percent,
                "trend":changeNew.trend
            },
            "returning_users":{
                "total":(currentUnique - currentNew),
                "change":changeReturning.percent,
                "trend":changeReturning.trend
            },
            "total_time":{
                "total":timeSpentString,
                "change":changeDuration.percent,
                "trend":changeDuration.trend
            },
            "avg_time":{
                "total":countlyCommon.timeString(durationPerUser),
                "change":changeDurationPerUser.percent,
                "trend":changeDurationPerUser.trend
            },
            "total_requests":{
                "total":currentEvents,
                "change":changeEvents.percent,
                "trend":changeEvents.trend
            },
            "avg_requests":{
                "total":eventsPerUser.toFixed(1),
                "change":changeEventsPerUser.percent,
                "trend":changeEventsPerUser.trend
            }
        };

        return dataArr;
    };
    
    function getCrashData(_crashTimeline) {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentUnique = 0,
            previousUnique = 0,
            currentNonfatal = 0,
            previousNonfatal = 0,
            currentFatal = 0,
            previousFatal = 0,
            currentResolved = 0,
            previousResolved = 0;

        if (_periodObj.isSpecialPeriod) {

            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.currentPeriodArr[i]);
                tmp_x = clearCrashObject(tmp_x);
                currentUnique += tmp_x["cru"];
                currentTotal += tmp_x["cr"];
                currentNonfatal += tmp_x["crnf"];
                currentFatal += tmp_x["crf"];
                currentResolved += tmp_x["crru"];
            }

            for (var i = 0; i < (_periodObj.previousPeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriodArr[i]);
                tmp_y = clearCrashObject(tmp_y);
                previousUnique += tmp_y["cru"];
                previousTotal += tmp_y["cr"];
                previousNonfatal += tmp_y["crnf"];
                previousFatal += tmp_y["crf"];
                previousResolved += tmp_y["crru"];
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriod);
            tmp_x = clearCrashObject(tmp_x);
            tmp_y = clearCrashObject(tmp_y);

            currentTotal = tmp_x["cr"];
            previousTotal = tmp_y["cr"];
            currentNonfatal = tmp_x["crnf"];
            previousNonfatal = tmp_y["crnf"];
            currentUnique = tmp_x["cru"];
            previousUnique = tmp_y["cru"];
            currentFatal = tmp_x["crf"];
            previousFatal = tmp_y["crf"];
            currentResolved = tmp_x["crru"];
            previousResolved = tmp_y["crru"];
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeNonfatal = countlyCommon.getPercentChange(previousNonfatal, currentNonfatal),
            changeUnique = countlyCommon.getPercentChange(previousUnique, currentUnique),
            changeFatal = countlyCommon.getPercentChange(previousFatal, currentFatal);
            changeResolved = countlyCommon.getPercentChange(previousResolved, currentResolved);

        dataArr =
        {
            "total_crashes":{
                "total":currentTotal,
                "change":changeTotal.percent,
                "trend":changeTotal.trend,
                "isEstimate":false
            },
            "new_crashes":{
                "total":currentUnique,
                "prev-total":previousUnique,
                "change":changeUnique.percent,
                "trend":changeUnique.trend,
                "isEstimate":false
            },
            "non_fatal_crashes":{
                "total":currentNonfatal,
                "prev-total":previousNonfatal,
                "change":changeNonfatal.percent,
                "trend":changeNonfatal.trend,
                "isEstimate":false
            },
            "fatal_crashes":{
                "total":currentFatal,
                "change":changeFatal.percent,
                "trend":changeFatal.trend,
                "isEstimate":false
            },
            "resolved_upgrades":{
                "total":currentResolved,
                "change":changeResolved.percent,
                "trend":changeResolved.trend,
                "isEstimate":false
            }
        };

        return dataArr;
    };
    
    function getEventData(eventDb) {
        _periodObj = countlyCommon.periodObj;

        if (!eventDb) {
            return {
                total: 0,
                change: 'NA',
                trend: 'u',
                sparkline: '0,0'
            };
        }

        var currentTotal = 0,
            previousTotal = 0;

        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                currentTotal += eventCount(eventDb, _periodObj.currentPeriodArr[i]);
                previousTotal += eventCount(eventDb, _periodObj.previousPeriodArr[i]);
            }
        } else {
            currentTotal = eventCount(eventDb, _periodObj.activePeriod);
            previousTotal = eventCount(eventDb, _periodObj.previousPeriod);
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal);

        return {
            "total":currentTotal,
            "change":changeTotal.percent,
            "trend":changeTotal.trend
        };
    };
    
    function eventCount(eventDb, period) {
        var tmpObj = countlyCommon.getDescendantProp(eventDb, period);
        return (tmpObj && tmpObj.c) ? tmpObj.c : 0;
    }
    
    function clearCrashObject(obj) {
        if (obj) {
            if (!obj["cr"]) obj["cr"] = 0;
            if (!obj["cru"]) obj["cru"] = 0;
            if (!obj["crnf"]) obj["crnf"] = 0;
            if (!obj["crf"]) obj["crf"] = 0;
            if (!obj["crru"]) obj["crru"] = 0;
        }
        else {
            obj = {"cr":0, "cru":0, "crnf":0, "crf":0, "crru":0};
        }

        return obj;
    };
    
    function clearSessionObject(obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
            if (!obj["d"]) obj["d"] = 0;
            if (!obj["e"]) obj["e"] = 0;
            if (!obj["p"]) obj["p"] = 0;
            if (!obj["m"]) obj["m"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0, "d":0, "e":0, "p":0, "m":0};
        }

        return obj;
    };
    
    function sortBy(arrayToSort, sortList) {
        if (!sortList.length) {
            return arrayToSort;
        }
    
        var tmpArr = [],
            retArr = [];
    
        for (var i = 0; i < arrayToSort.length; i++) {
            var objId = arrayToSort[i];
            if (sortList.indexOf(objId) !== -1) {
                tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
            }
        }
    
        for (var i = 0; i < tmpArr.length; i++) {
            if (tmpArr[i]) {
                retArr[retArr.length] = tmpArr[i];
            }
        }
    
        for (var i = 0; i < arrayToSort.length; i++) {
            if (retArr.indexOf(arrayToSort[i]) === -1) {
                retArr[retArr.length] = arrayToSort[i];
            }
        }
    
        return retArr;
    }
    
}(reports));

module.exports = reports;