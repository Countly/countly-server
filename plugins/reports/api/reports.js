var reportsInstance = {},
    async = require("async"),
    moment = require('moment-timezone'),
    ejs = require("ejs"),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),
    crypto = require('crypto'),
    mail = require("../../../api/parts/mgmt/mail"),
    fetch = require("../../../api/parts/data/fetch"),
    plugins = require("../../pluginManager"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    localize = require('../../../api/utils/localization.js'),
    common = require('../../../api/utils/common.js'),
    log = require('../../../api/utils/log')('reports:reports'),
    versionInfo = require('../../../frontend/express/version.info');

versionInfo.page = (!versionInfo.title) ? "https://count.ly" : null;
versionInfo.title = versionInfo.title || "Countly";
var metrics = {
    "analytics": {
        "total_sessions": true,
        "total_users": true,
        "new_users": true,
        "total_time": true,
        "avg_time": true,
    },
    "revenue": {
        "paying_users": true,
        "purchases_c": true,
        "purchases_s": true,
    },
    "push": {
        "messaging_users": true,
        "push_sent": true,
        "push_open": true,
        "push_action": true,
    },
    "crash": {
        "unique_crashes": true,
        "total_crashes": true,
        "fatal_crashes": true,
        "non_fatal_crashes": true
    },
    "events": {},
    "views": {}
};
(function(reports) {
    let _periodObj = null;
    reports.sendReport = function(db, id, callback) {
        reports.loadReport(db, id, function(err, report) {
            if (err) {
                return callback(err, null);
            }
            reports.getReport(db, report, function(err2, ob) {
                if (!err2) {
                    reports.send(ob.report, ob.message, function() {
                        if (callback) {
                            callback(err2, ob.message);
                        }
                    });
                }
                else if (callback) {
                    callback(err2, ob.message);
                }
            });
        });
    };

    reports.loadReport = function(db, id, callback) {
        db.collection('reports').findOne({_id: db.ObjectID(id)}, function(err, report) {
            if (callback) {
                callback(err, report);
            }
        });
    };

    reports.getReport = function(db, report, callback, cache) {
        /**
         * find Member
         * @param {func} cb - callback function
         */
        function findMember(cb) {
            db.collection('members').findOne({_id: db.ObjectID(report.user)}, function(err1, member) {
                if (!err1 && member) {
                    return cb(null, member);
                }

                db.collection('members').findOne({global_admin: true}, function(err2, globalAdmin) {
                    if (!err2 && globalAdmin) {
                        log.d("Report user not found. Updating it to the global admin.");
                        report.user = globalAdmin._id;
                        return cb(null, globalAdmin);
                    }

                    return cb(err2);
                });
            });
        }
        /**
         * process to get news from countly offical site
         * @param {func} cb - callback function
         */
        function processUniverse(cb) {
            if (versionInfo.title.indexOf("Countly") > -1) {
                var options = {
                    uri: 'http://count.ly/email-news.txt',
                    method: 'GET',
                    timeout: 1000
                };

                request(options, function(error, response, body) {
                    if (!error) {
                        try {
                            var arr = JSON.parse(body);
                            report.universe = arr[Math.floor(Math.random() * arr.length)];
                        }
                        catch (ex) {
                            console.log(ex);
                        }
                    }
                    cb(null);
                });
            }
            else {
                cb(null);
            }
        }
        cache = cache || {};
        var reportType = report.report_type || "core";
        if (report) {
            var parallelTasks = [
                findMember.bind(null),
                processUniverse.bind(null)
            ];

            async.parallel(parallelTasks, function(err, data) {
                /**
                 * iterate app 
                 * @param {string} app_id -  id of app record in db.
                 * @param {func} done - callback function
                 */
                function appIterator(app_id, done) {
                    /**
                     * metricIterator curry function 
                     * @param {obj} params - params injected in inner func
                     * @return {func} metricIterator - function for iterartion
                     */
                    function metricIteratorCurryFunc(params) {
                        /**
                         * fetch metric iterator
                         * @param {array} metric  - martric array
                         * @param {*} done2  - callback function
                         */
                        function metricIterator(metric, done2) {
                            if (metric.indexOf("events") === 0) {
                                var parts = metric.split(".");
                                var event = null;
                                //replace with app's iap_key
                                if (parts[1] === "purchases") {
                                    event = common.dot(params.app, 'plugins.revenue.iap_events');
                                    event = event && event.length ? event : null;
                                }
                                else if (parts[1] === "[CLY]_push_sent" || parts[1] === "[CLY]_push_open" || parts[1] === "[CLY]_push_action") {
                                    if ((params.app.gcm && Object.keys(params.app.gcm).length) || (params.app.apn && Object.keys(params.app.apn).length)) {
                                        event = parts[1];
                                    }
                                }
                                else {
                                    event = parts[1];
                                }
                                if (event) {
                                    if (Array.isArray(event)) {
                                        fetch.getMergedEventData(params, event, {db: db}, function(output) {
                                            done2(null, {metric: parts[1], data: output});
                                        });
                                    }
                                    else {
                                        var collectionName = "events" + crypto.createHash('sha1').update(event + app_id).digest('hex');
                                        fetch.getTimeObjForEvents(collectionName, params, {db: db}, function(output) {
                                            done2(null, {metric: parts[1], data: output});
                                        });
                                    }
                                }
                                else {
                                    done2(null, null);
                                }
                            }
                            else {
                                if (metric === "crashdata") {
                                    fetch.getTimeObj(metric, params, {db: db, unique: "cru"}, function(output) {
                                        done2(null, {metric: metric, data: output});
                                    });
                                }
                                else {
                                    fetch.getTimeObj(metric, params, {db: db}, function(output) {
                                        fetch.getTotalUsersObj(metric, params, function(dbTotalUsersObj) {
                                            output.correction = fetch.formatTotalUsersObj(dbTotalUsersObj);
                                            output.prev_correction = fetch.formatTotalUsersObj(dbTotalUsersObj, true);
                                            done2(null, {metric: metric, data: output});
                                        });
                                    });
                                }
                            }
                        }
                        return metricIterator;
                    }
                    var params2 = {qstring: {period: report.period}};
                    if (!cache[app_id] || !cache[app_id][report.period]) {
                        db.collection('apps').findOne({_id: db.ObjectID(app_id)}, function(err_apps, app) {
                            if (err_apps) {
                                console.log(err_apps);
                            }
                            if (app) {
                                params2.app_id = app._id;
                                params2.app_cc = app.country;
                                params2.app_name = app.name;
                                params2.appTimezone = app.timezone;
                                params2.app = app;
                                db.collection('events').findOne({_id: params2.app_id}, function(err_events, events) {
                                    if (err_events) {
                                        console.log(err_events);
                                    }
                                    events = events || {};
                                    events.list = events.list || [];
                                    const metricIterator = metricIteratorCurryFunc(params2);
                                    async.map(metricsToCollections(report.metrics, events.list), metricIterator, function(err1, results) {
                                        if (err1) {
                                            console.log(err1);
                                        }
                                        app.results = {};
                                        for (var i = 0; i < results.length; i++) {
                                            if (results[i] && results[i].metric) {
                                                app.results[results[i].metric] = results[i].data;
                                            }
                                        }
                                        if (!cache[app_id]) {
                                            cache[app_id] = {};
                                        }
                                        cache[app_id][report.period] = JSON.parse(JSON.stringify(app));
                                        done(null, app);
                                    });
                                });
                            }
                            else {
                                done(null, null);
                            }
                        });
                    }
                    else {
                        done(null, JSON.parse(JSON.stringify(cache[app_id][report.period])));
                    }
                }
                if (err || !data[0]) {
                    return callback("Report user not found.", {report: report});
                }

                var member = data[0];
                var lang = member.lang || 'en';
                if (lang.toLowerCase() === "zh") {
                    moment.locale("zh-cn");
                }
                else {
                    moment.locale(lang.toLowerCase());
                }

                if (reportType !== "core") {
                    var params = {
                        db: db,
                        report: report,
                        member: member,
                        moment: moment
                    };

                    if (!plugins.isPluginEnabled(reportType)) {
                        return callback("No data to report", {report: report});
                    }

                    plugins.dispatch("/email/report", { params: params }, function() {
                        if (!params.report || !params.report.data) {
                            return callback("No data to report", {report: report});
                        }

                        return callback(null, report.data);
                    });
                }
                else if (reportType === "core" && report.apps) {
                    report.apps = sortBy(report.apps, member.appSortList || []);

                    if (report.frequency === "daily") {
                        var endDate = new Date();
                        endDate.setDate(endDate.getDate() - 1);
                        endDate.setHours(23, 59);
                        report.end = endDate.getTime();
                        report.start = report.end - 24 * 60 * 59 * 1000;

                        var startDate = new Date(report.start);

                        var monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");

                        report.date = startDate.getDate() + " " + monthName;
                        report.period = "yesterday";
                    }
                    else if (report.frequency === "weekly") {
                        endDate = new Date();
                        endDate.setHours(23, 59);
                        report.end = endDate.getTime();
                        report.start = report.end - 7 * 24 * 60 * 59 * 1000;
                        report.period = "7days";

                        startDate = new Date(report.start);
                        monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
                        report.date = startDate.getDate() + " " + monthName;

                        monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
                        report.date += " - " + endDate.getDate() + " " + monthName;
                    }
                    else if (report.frequency === "monthly") {
                        endDate = new Date();
                        endDate.setHours(23, 59);
                        report.end = endDate.getTime();
                        report.start = report.end - parseInt(moment(endDate).subtract(1, 'months').daysInMonth()) * 24 * 60 * 60 * 1000;
                        report.period = [report.start, report.end];

                        startDate = new Date(report.start);
                        monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
                        report.date = startDate.getDate() + " " + monthName;

                        monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
                        report.date += " - " + endDate.getDate() + " " + monthName;
                    }
                    async.map(report.apps, appIterator, function(err2, results) {
                        if (err2) {
                            return callback(err2);
                        }
                        report.total_new = 0;
                        var total = 0;
                        for (var i = 0; i < results.length; i++) {
                            if (results[i] && results[i].results) {
                                countlyCommon.setPeriod(report.period);
                                countlyCommon.setTimezone(results[i].timezone);
                                for (var j in results[i].results) {
                                    if (j === "users") {
                                        results[i].results[j] = getSessionData(
                                            results[i].results[j] || {},
                                            (results[i].results[j] && results[i].results[j].correction) ? results[i].results[j].correction : {},
                                            (results[i].results[j] && results[i].results[j].prev_correction) ? results[i].results[j].prev_correction : {}
                                        );
                                        if (results[i].results[j].total_sessions.total > 0) {
                                            results[i].display = true;
                                        }
                                        total += results[i].results[j].total_sessions.total;
                                        report.total_new += results[i].results[j].new_users.total;

                                        results[i].results.analytics = results[i].results[j];
                                        delete results[i].results[j];

                                        let iap_events = common.dot(results[i], 'plugins.revenue.iap_events');
                                        if (iap_events && iap_events.length) {
                                            if (!results[i].results.revenue) {
                                                results[i].results.revenue = {};
                                            }
                                            results[i].results.revenue.paying_users = results[i].results.analytics.paying_users;
                                        }
                                        delete results[i].results.analytics.paying_users;

                                        if ((results[i].gcm && Object.keys(results[i].gcm).length) || (results[i].apn && Object.keys(results[i].apn).length)) {
                                            if (!results[i].results.push) {
                                                results[i].results.push = {};
                                            }
                                            results[i].results.push.messaging_users = results[i].results.analytics.messaging_users;
                                        }
                                        delete results[i].results.analytics.messaging_users;
                                    }
                                    else if (j === "crashdata") {
                                        results[i].results.crash = getCrashData(results[i].results[j] || {});
                                        delete results[i].results[j];
                                    }
                                    else if (j === "[CLY]_push_sent" || j === "[CLY]_push_open" || j === "[CLY]_push_action") {
                                        if (!results[i].results.push) {
                                            results[i].results.push = {};
                                        }
                                        results[i].results.push[j.replace("[CLY]_", "")] = getEventData(results[i].results[j] || {});
                                        delete results[i].results[j];
                                    }
                                    else if (j === "purchases") {
                                        if (!results[i].results.revenue) {
                                            results[i].results.revenue = {};
                                        }
                                        var revenueData = getRevenueData(results[i].results[j] || {});
                                        results[i].results.revenue[j + "_c"] = revenueData.c;
                                        results[i].results.revenue[j + "_s"] = revenueData.s;
                                        delete results[i].results[j];
                                    }
                                    else {
                                        if (!results[i].results.events) {
                                            results[i].results.events = {};
                                        }
                                        results[i].results.events[j] = getEventData(results[i].results[j] || {});
                                        delete results[i].results[j];
                                    }
                                }
                            }
                        }

                        if (total > 0) {
                            report.apps = results;
                            report.mailTemplate = "/templates/email.html";
                            process();
                        }
                        else if (callback) {
                            return callback("No data to report", {report: report});
                        }
                    });
                }
                else {
                    return callback("Report not found", {report: report});
                }
                /**
                 * process  email sending
                 */
                function process() {
                    mail.lookup(function(err0, host) {
                        if (err0) {
                            if (callback) {
                                return callback(err0, {});
                            }
                        }
                        var dir = path.resolve(__dirname, '../frontend/public');
                        fs.readFile(dir + report.mailTemplate, 'utf8', function(err1, template) {
                            if (err1) {
                                if (callback) {
                                    callback(err1, {report: report});
                                }
                            }
                            else {
                                member.lang = member.lang || "en";
                                localize.getProperties(member.lang, function(err2, props) {
                                    if (err2) {
                                        if (callback) {
                                            return callback(err2, {report: report});
                                        }
                                    }
                                    else {
                                        props["reports.report"] = localize.format(props["reports.report"], versionInfo.title);
                                        props["reports.your"] = localize.format(props["reports.your"], props["reports." + report.frequency], report.date);
                                        report.properties = props;
                                        var allowedMetrics = {};
                                        for (var i in report.metrics) {
                                            if (metrics[i]) {
                                                for (var j in metrics[i]) {
                                                    allowedMetrics[j] = true;
                                                }
                                            }
                                        }
                                        var message = ejs.render(template, {"apps": report.apps, "host": host, "report": report, "version": versionInfo, "properties": props, metrics: allowedMetrics});
                                        report.subject = versionInfo.title + ': ' + localize.format(
                                            (
                                                (report.frequency === "weekly") ? report.properties["reports.subject-week"] :
                                                    ((report.frequency === "monthly") ? report.properties["reports.subject-month"] : report.properties["reports.subject-day"])
                                            ), report.total_new);
                                        if (callback) {
                                            return callback(err2, {"apps": report.apps, "host": host, "report": report, "version": versionInfo, "properties": props, message: message});
                                        }
                                    }
                                });
                            }
                        });
                    });
                }

            });
        }
        else if (callback) {
            return callback("Report not found", {report: report});
        }
    };

    reports.send = function(report, message, callback) {
        if (report.emails) {
            for (var i = 0; i < report.emails.length; i++) {
                var msg = {
                    to: report.emails[i],
                    from: versionInfo.title,
                    subject: report.subject,
                    html: message
                };
                if (mail.sendPoolMail) {
                    mail.sendPoolMail(msg);
                }
                else {
                    mail.sendMail(msg);
                }
            }
        }
        callback();
    };

    /**
    * set metrics  in collection 
    * @param {object} metricsObj - metrics data
    * @param {object} events - event data 
    * @return {object} collections - collections names
    */
    function metricsToCollections(metricsObj, events) {
        var collections = {users: true};
        for (let i in metricsObj) {
            if (metricsObj[i]) {
                if (i === "analytics") {
                    collections.users = true;
                }
                else if (i === "crash" && plugins.isPluginEnabled("crashes")) {
                    collections.crashdata = true;
                }
                else if (i === "push") {
                    collections["events.[CLY]_push_sent"] = true;
                    collections["events.[CLY]_push_action"] = true;
                }
                else if (i === "revenue") {
                    collections["events.purchases"] = true;
                }
                else if (i === "events") {
                    for (let j = 0; j < events.length; j++) {
                        if (events[j].indexOf("[CLY]_") === -1) {
                            collections["events." + events[j]] = true;
                        }
                    }
                }
            }
        }
        return Object.keys(collections);
    }

    /**
    * get session data 
    * @param {object} _sessionDb - session original data
    * @param {object} totalUserOverrideObj - user data 
    * @param {object} previousTotalUserOverrideObj - user data for previous period
    * @return {object} dataArr - session statstics contains serveral metrics.
    */
    function getSessionData(_sessionDb, totalUserOverrideObj, previousTotalUserOverrideObj) {
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

            for (let i = 0; i < (_periodObj.uniquePeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodArr[i]);
                tmp_x = clearSessionObject(tmp_x);
                currentUnique += tmp_x.u;
                currentPayingTotal += tmp_x.p;
                currentMsgEnabledTotal += tmp_x.m;
            }

            var tmpUniqObj,
                tmpCurrentUniq = 0,
                tmpCurrentPaying = 0,
                tmpCurrentMsgEnabled = 0;

            for (let i = 0; i < (_periodObj.uniquePeriodCheckArr.length); i++) {
                tmpUniqObj = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodCheckArr[i]);
                tmpUniqObj = clearSessionObject(tmpUniqObj);
                tmpCurrentUniq += tmpUniqObj.u;
                tmpCurrentPaying += tmpUniqObj.p;
                tmpCurrentMsgEnabled += tmpUniqObj.m;
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

            for (let i = 0; i < (_periodObj.previousUniquePeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodArr[i]);
                tmp_y = clearSessionObject(tmp_y);
                previousUnique += tmp_y.u;
                previousPayingTotal += tmp_y.p;
                previousMsgEnabledTotal += tmp_y.m;
            }

            var tmpUniqObj2,
                tmpPreviousUniq = 0,
                tmpPreviousPaying = 0;

            for (let i = 0; i < (_periodObj.previousUniquePeriodCheckArr.length); i++) {
                tmpUniqObj2 = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodCheckArr[i]);
                tmpUniqObj2 = clearSessionObject(tmpUniqObj2);
                tmpPreviousUniq += tmpUniqObj2.u;
                tmpPreviousPaying += tmpUniqObj2.p;
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

            for (let i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriodArr[i]);
                tmp_x = clearSessionObject(tmp_x);
                tmp_y = clearSessionObject(tmp_y);

                currentTotal += tmp_x.t;
                previousTotal += tmp_y.t;
                currentNew += tmp_x.n;
                previousNew += tmp_y.n;
                currentDuration += tmp_x.d;
                previousDuration += tmp_y.d;
                currentEvents += tmp_x.e;
                previousEvents += tmp_y.e;
            }
        }
        else {
            tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriod);
            tmp_x = clearSessionObject(tmp_x);
            tmp_y = clearSessionObject(tmp_y);

            currentTotal = tmp_x.t;
            previousTotal = tmp_y.t;
            currentNew = tmp_x.n;
            previousNew = tmp_y.n;
            currentUnique = tmp_x.u;
            previousUnique = tmp_y.u;
            currentDuration = tmp_x.d;
            previousDuration = tmp_y.d;
            currentEvents = tmp_x.e;
            previousEvents = tmp_y.e;
            currentPayingTotal = tmp_x.p;
            previousPayingTotal = tmp_y.p;
            currentMsgEnabledTotal = tmp_x.m;
            previousMsgEnabledTotal = tmp_y.m;
        }

        currentUnique = (totalUserOverrideObj && totalUserOverrideObj.users) ? totalUserOverrideObj.users : currentUnique;
        previousUnique = (previousTotalUserOverrideObj && previousTotalUserOverrideObj.users) ? previousTotalUserOverrideObj.users : previousUnique;

        if (currentUnique < currentNew) {
            if (totalUserOverrideObj && totalUserOverrideObj.users) {
                currentNew = currentUnique;
            }
            else {
                currentUnique = currentNew;
            }
        }

        if (currentUnique > currentTotal) {
            currentUnique = currentTotal;
        }

        var sessionDuration = (currentDuration / 60),
            previousSessionDuration = (previousDuration / 60),
            previousDurationPerUser = (previousTotal === 0) ? 0 : previousSessionDuration / previousTotal,
            durationPerUser = (currentTotal === 0) ? 0 : (sessionDuration / currentTotal),
            previousEventsPerUser = (previousUnique === 0) ? 0 : previousEvents / previousUnique,
            eventsPerUser = (currentUnique === 0) ? 0 : (currentEvents / currentUnique),
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
        }
        else if (sessionDuration >= 1440) {
            timeSpentString = (sessionDuration / 1440).toFixed(1) + " days";
        }
        else if (sessionDuration >= 60) {
            timeSpentString = (sessionDuration / 60).toFixed(1) + " hours";
        }

        //var timeSpentString = countlyCommon.timeString(sessionDuration);

        dataArr =
        {
            "total_sessions": {
                "total": currentTotal,
                "change": changeTotal.percent,
                "trend": changeTotal.trend
            },
            "paying_users": {
                "total": currentPayingTotal,
                "prev-total": previousPayingTotal,
                "change": changePaying.percent,
                "trend": changePaying.trend,
                "isEstimate": isEstimate
            },
            "total_users": {
                "total": currentUnique,
                "prev-total": previousUnique,
                "change": changeUnique.percent,
                "trend": changeUnique.trend,
                "isEstimate": isEstimate
            },
            "messaging_users": {
                "total": currentMsgEnabledTotal,
                "prev-total": previousMsgEnabledTotal,
                "change": changeMsgEnabled.percent,
                "trend": changeMsgEnabled.trend,
                "isEstimate": isEstimate
            },
            "new_users": {
                "total": currentNew,
                "change": changeNew.percent,
                "trend": changeNew.trend
            },
            "returning_users": {
                "total": (currentUnique - currentNew),
                "change": changeReturning.percent,
                "trend": changeReturning.trend
            },
            "total_time": {
                "total": timeSpentString,
                "change": changeDuration.percent,
                "trend": changeDuration.trend
            },
            "avg_time": {
                "total": countlyCommon.timeString(durationPerUser),
                "change": changeDurationPerUser.percent,
                "trend": changeDurationPerUser.trend
            },
            "total_requests": {
                "total": currentEvents,
                "change": changeEvents.percent,
                "trend": changeEvents.trend
            },
            "avg_requests": {
                "total": eventsPerUser.toFixed(1),
                "change": changeEventsPerUser.percent,
                "trend": changeEventsPerUser.trend
            }
        };

        return dataArr;
    }

    /**
    * get crash data 
    * @param {object} _crashTimeline - timeline object
    * @return {object} dataArr - crash data with several dimension statistics
    */
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

            for (let i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.currentPeriodArr[i]);
                tmp_x = clearCrashObject(tmp_x);
                currentUnique += tmp_x.cru;
                currentTotal += tmp_x.cr;
                currentNonfatal += tmp_x.crnf;
                currentFatal += tmp_x.crf;
                currentResolved += tmp_x.crru;
            }

            for (let i = 0; i < (_periodObj.previousPeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriodArr[i]);
                tmp_y = clearCrashObject(tmp_y);
                previousUnique += tmp_y.cru;
                previousTotal += tmp_y.cr;
                previousNonfatal += tmp_y.crnf;
                previousFatal += tmp_y.crf;
                previousResolved += tmp_y.crru;
            }
        }
        else {
            tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriod);
            tmp_x = clearCrashObject(tmp_x);
            tmp_y = clearCrashObject(tmp_y);

            currentTotal = tmp_x.cr;
            previousTotal = tmp_y.cr;
            currentNonfatal = tmp_x.crnf;
            previousNonfatal = tmp_y.crnf;
            currentUnique = tmp_x.cru;
            previousUnique = tmp_y.cru;
            currentFatal = tmp_x.crf;
            previousFatal = tmp_y.crf;
            currentResolved = tmp_x.crru;
            previousResolved = tmp_y.crru;
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeNonfatal = countlyCommon.getPercentChange(previousNonfatal, currentNonfatal),
            changeUnique = countlyCommon.getPercentChange(previousUnique, currentUnique),
            changeFatal = countlyCommon.getPercentChange(previousFatal, currentFatal),
            changeResolved = countlyCommon.getPercentChange(previousResolved, currentResolved);

        dataArr =
        {
            "total_crashes": {
                "total": currentTotal,
                "change": changeTotal.percent,
                "trend": changeTotal.trend,
                "isEstimate": false
            },
            "unique_crashes": {
                "total": currentUnique,
                "prev-total": previousUnique,
                "change": changeUnique.percent,
                "trend": changeUnique.trend,
                "isEstimate": false
            },
            "non_fatal_crashes": {
                "total": currentNonfatal,
                "prev-total": previousNonfatal,
                "change": changeNonfatal.percent,
                "trend": changeNonfatal.trend,
                "isEstimate": false
            },
            "fatal_crashes": {
                "total": currentFatal,
                "change": changeFatal.percent,
                "trend": changeFatal.trend,
                "isEstimate": false
            },
            "resolved_upgrades": {
                "total": currentResolved,
                "change": changeResolved.percent,
                "trend": changeResolved.trend,
                "isEstimate": false
            }
        };

        return dataArr;
    }


    /**
    * get event data
    * @param {object} eventDb -  original event data
    * @return {number}  - return event calc data
    */
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
        }
        else {
            currentTotal = eventCount(eventDb, _periodObj.activePeriod);
            previousTotal = eventCount(eventDb, _periodObj.previousPeriod);
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal);

        return {
            "total": currentTotal,
            "change": changeTotal.percent,
            "trend": changeTotal.trend
        };
    }

    /**
    * get revenue chart data
    * @param {object} eventDb -  event data
    * @return {object}  - return revenu data chart object
    */
    function getRevenueData(eventDb) {
        _periodObj = countlyCommon.periodObj;

        if (!eventDb) {
            return {
                c: {
                    total: 0,
                    change: 'NA',
                    trend: 'u',
                    sparkline: '0,0'
                },
                s: {
                    total: 0,
                    change: 'NA',
                    trend: 'u',
                    sparkline: '0,0'
                }
            };
        }

        var total = {
            c: 0,
            pc: 0,
            s: 0,
            ps: 0
        };

        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                let tmpObj = countlyCommon.getDescendantProp(eventDb, _periodObj.currentPeriodArr[i]);
                total.c += (tmpObj && tmpObj.c) ? tmpObj.c : 0;
                total.s += (tmpObj && tmpObj.s) ? tmpObj.s : 0;
                let tmpObj2 = countlyCommon.getDescendantProp(eventDb, _periodObj.previousPeriodArr[i]);
                total.pc += (tmpObj2 && tmpObj2.c) ? tmpObj2.c : 0;
                total.ps += (tmpObj2 && tmpObj2.s) ? tmpObj2.s : 0;
            }
        }
        else {
            let tmpObj = countlyCommon.getDescendantProp(eventDb, _periodObj.activePeriod);
            total.c = (tmpObj && tmpObj.c) ? tmpObj.c : 0;
            total.s = (tmpObj && tmpObj.s) ? tmpObj.s : 0;
            let tmpObj2 = countlyCommon.getDescendantProp(eventDb, _periodObj.previousPeriod);
            total.pc = (tmpObj2 && tmpObj2.c) ? tmpObj2.c : 0;
            total.ps = (tmpObj2 && tmpObj2.s) ? tmpObj2.s : 0;
        }

        var changeTotalCount = countlyCommon.getPercentChange(total.pc, total.c);
        var changeTotalSum = countlyCommon.getPercentChange(total.ps, total.s);

        return {
            c: {
                "total": total.c,
                "change": changeTotalCount.percent,
                "trend": changeTotalCount.trend
            },
            s: {
                "total": total.s.toFixed(2),
                "change": changeTotalSum.percent,
                "trend": changeTotalSum.trend
            }
        };
    }

    /**
    * get event count
    * @param {object} eventDb -  event data
    * @param {string/array}  period -  period defined by countly
    * @return {number}  - return event count
    */
    function eventCount(eventDb, period) {
        var tmpObj = countlyCommon.getDescendantProp(eventDb, period);
        return (tmpObj && tmpObj.c) ? tmpObj.c : 0;
    }

    /**
    * clear session object data format, will set properties to 0 if not exisit
    * @param {object} obj - db object
    * @return {object} obj - cleared object
    */
    function clearCrashObject(obj) {
        if (obj) {
            if (!obj.cr) {
                obj.cr = 0;
            }
            if (!obj.cru) {
                obj.cru = 0;
            }
            if (!obj.crnf) {
                obj.crnf = 0;
            }
            if (!obj.crf) {
                obj.crf = 0;
            }
            if (!obj.crru) {
                obj.crru = 0;
            }
        }
        else {
            obj = {"cr": 0, "cru": 0, "crnf": 0, "crf": 0, "crru": 0};
        }

        return obj;
    }

    /**
    * clear session object data format, will set properties to 0 if not exisit
    * @param {object} obj - db object
    * @return {object} obj - cleared object
    */
    function clearSessionObject(obj) {
        if (obj) {
            if (!obj.t) {
                obj.t = 0;
            }
            if (!obj.n) {
                obj.n = 0;
            }
            if (!obj.u) {
                obj.u = 0;
            }
            if (!obj.d) {
                obj.d = 0;
            }
            if (!obj.e) {
                obj.e = 0;
            }
            if (!obj.p) {
                obj.p = 0;
            }
            if (!obj.m) {
                obj.m = 0;
            }
        }
        else {
            obj = {"t": 0, "n": 0, "u": 0, "d": 0, "e": 0, "p": 0, "m": 0};
        }

        return obj;
    }

    /**
    * sort first array base on second array, and render the rest of elements by original relative sequence.
    * @param {object} arrayToSort - array need to sort
    * @param {object} sortList - array for reference.
    * @return {object} retArr - return sorted array
    */
    function sortBy(arrayToSort, sortList) {
        if (!sortList.length) {
            return arrayToSort;
        }

        var tmpArr = [],
            retArr = [];

        for (let i = 0; i < arrayToSort.length; i++) {
            var objId = arrayToSort[i];
            if (sortList.indexOf(objId) !== -1) {
                tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
            }
        }

        for (let i = 0; i < tmpArr.length; i++) {
            if (tmpArr[i]) {
                retArr[retArr.length] = tmpArr[i];
            }
        }

        for (let i = 0; i < arrayToSort.length; i++) {
            if (retArr.indexOf(arrayToSort[i]) === -1) {
                retArr[retArr.length] = arrayToSort[i];
            }
        }

        return retArr;
    }

}(reportsInstance));

module.exports = reportsInstance;