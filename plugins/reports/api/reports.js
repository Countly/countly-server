var reportsInstance = {},
    async = require("async"),
    moment = require('moment-timezone'),
    ejs = require("ejs"),
    fs = require('fs'),
    path = require('path'),
    plugins = require("../../pluginManager"),
    request = require('countly-request')(null, null, null, plugins.getConfig("security")),
    crypto = require('crypto'),
    mail = require("../../../api/parts/mgmt/mail"),
    fetch = require("../../../api/parts/data/fetch"),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    localize = require('../../../api/utils/localization.js'),
    common = require('../../../api/utils/common.js'),
    log = require('../../../api/utils/log')('reports:reports'),
    versionInfo = require('../../../frontend/express/version.info'),
    countlyConfig = require('../../../frontend/express/config.js'),
    pdf = require('../../../api/utils/pdf');

countlyConfig.passwordSecret || "";

plugins.setConfigs("reports", {
    secretKey: "Ydqa7Omkd3yhV33M3iWV1oFcOEk898h9",
});

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
var metricProps = {
    "analytics": ["metric", "count", "change"],
    "events": ["event", "count", "change"],
    "crash": ["crash", "occurrences", "change"],
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
         *  Load event group information
         *  @param {function} cb - callback function
         */
        function loadEventGroups(cb) {
            db.collection('event_groups').find({}, {projection: {name: 1, status: 1}}).toArray(function(err1, event_groups) {
                var mapping = {};
                if (event_groups && event_groups.length) {
                    for (let i = 0; i < event_groups.length; i++) {
                        mapping[event_groups[i]._id] = event_groups[i];
                    }
                }
                return cb(null, mapping);
            });
        }
        /**
         * process to get news from countly offical site
         * @param {func} cb - callback function
         */
        function processUniverse(cb) {
            if (!plugins.getConfig("api").offline_mode) {
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
            else {
                cb(null);
            }
        }
        cache = cache || {};
        var reportType = report.report_type || "core";
        if (report) {
            var parallelTasks = [
                findMember.bind(null),
                processUniverse.bind(null),
                loadEventGroups.bind(null)
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
                                    else if (event && event.startsWith('[CLY]_group_')) {
                                        fetch.getMergedEventGroups(params, event, {db: db}, function(output) {
                                            var displayName = data[2][parts[1]] && data[2][parts[1]].name || parts[1];
                                            done2(null, {metric: displayName, data: output});
                                        });
                                    }
                                    else {
                                        var collectionName = "events" + crypto.createHash('sha1').update(event + app_id).digest('hex');
                                        fetch.getTimeObjForEvents(collectionName, params, {db: db}, function(output) {
                                            var displayName = data[3] && data[3][app_id] && data[3][app_id][parts[1]] && data[3][app_id][parts[1]].name || parts[1];
                                            done2(null, {metric: displayName, data: output});
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
                                    // process in reports plugin
                                    if (["users", "revenue"].indexOf(metric) >= 0) {
                                        fetch.getTimeObj(metric, params, {db: db}, function(output) {
                                            fetch.getTotalUsersObj(metric, params, function(dbTotalUsersObj) {
                                                output.correction = fetch.formatTotalUsersObj(dbTotalUsersObj);
                                                output.prev_correction = fetch.formatTotalUsersObj(dbTotalUsersObj, null, true);
                                                done2(null, {metric: metric, data: output});
                                            });
                                        });
                                    }
                                    else {
                                        // process outside reports plugin
                                        // set plugin report dispatch max duration to 30s
                                        const cancelReportCallTimeout = setTimeout(() => {
                                            done2("cancel report plugin dispatcher:" + metric, null);
                                        }, 30000);
                                        plugins.dispatch("/email/report", {
                                            params: {
                                                db: db,
                                                report: report,
                                                member: member,
                                                moment: moment,
                                                app: params.app,
                                            },
                                            metric: metric,
                                            reportAPICallback: (callErr, callData) => {
                                                clearTimeout(cancelReportCallTimeout);
                                                if (callErr) {
                                                    log.e('Error during report plugin dispatch: %j', callErr);
                                                    done2(callErr, null);
                                                }
                                                else {
                                                    done2(null, {plugin_metric: metric, data: callData});
                                                }
                                            },
                                        });
                                    }
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
                                db.collection('events').findOne({_id: params2.app_id}, {projection: {list: 1, map: 1}}, function(err_events, events) {
                                    if (err_events) {
                                        console.log(err_events);
                                    }
                                    events = events || {};
                                    events.list = events.list || [];
                                    events.map = events.map || {};
                                    if (report.selectedEvents) {
                                        events.list = report.selectedEvents.map(function(event) {
                                            return (event + "").split("***").pop();
                                        });
                                    }
                                    if (!data[3]) {
                                        data[3] = {};
                                    }
                                    if (!data[3][app._id]) {
                                        data[3][app._id] = events.map;
                                    }
                                    const metricIterator = metricIteratorCurryFunc(params2);
                                    async.map(metricsToCollections(report.metrics, events.list), metricIterator, function(err1, results) {
                                        if (err1) {
                                            console.log(err1);
                                        }
                                        app.results = {};
                                        app.plugin_metrics = {};
                                        for (var i = 0; i < results.length; i++) {
                                            if (results[i] && results[i].metric) {
                                                app.results[results[i].metric] = results[i].data;
                                            }
                                            if (results[i] && results[i].plugin_metric) {
                                                app.plugin_metrics[results[i].plugin_metric] = results[i].data;
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
                        log.d("Plugin is not enabled, no data to report. Report type: " + reportType, {report: report});
                        return callback("Plugin is not enabled, no data to report. Report type: " + reportType, {report: report});
                    }

                    plugins.dispatch("/email/report", { params: params }, function() {
                        if (!params.report || !params.report.data) {
                            log.d("There was no data from plugin.");
                            return callback("No data to report from other plugins", {report: report});
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
                    async.map(report.apps, appIterator, function(err2, apps) {
                        if (err2) {
                            return callback(err2);
                        }
                        report.total_new = 0;
                        var total = 0;
                        for (var i = 0; i < apps.length; i++) {
                            if (apps[i] && apps[i].results) {
                                countlyCommon.setPeriod(report.period);
                                countlyCommon.setTimezone(apps[i].timezone);
                                for (var j in apps[i].results) {
                                    if (j === "users") {
                                        apps[i].results[j] = getSessionData(
                                            apps[i].results[j] || {},
                                            (apps[i].results[j] && apps[i].results[j].correction) ? apps[i].results[j].correction : {},
                                            (apps[i].results[j] && apps[i].results[j].prev_correction) ? apps[i].results[j].prev_correction : {}
                                        );
                                        if (apps[i].results[j].total_sessions.total > 0) {
                                            apps[i].display = true;
                                        }
                                        total += apps[i].results[j].total_sessions.total;
                                        report.total_new += apps[i].results[j].new_users.total;

                                        apps[i].results.analytics = apps[i].results[j];
                                        delete apps[i].results[j];

                                        let iap_events = common.dot(apps[i], 'plugins.revenue.iap_events');
                                        if (iap_events && iap_events.length) {
                                            if (!apps[i].results.revenue) {
                                                apps[i].results.revenue = {};
                                            }
                                            apps[i].results.revenue.paying_users = apps[i].results.analytics.paying_users;
                                        }
                                        delete apps[i].results.analytics.paying_users;

                                        if ((apps[i].gcm && Object.keys(apps[i].gcm).length) || (apps[i].apn && Object.keys(apps[i].apn).length)) {
                                            if (!apps[i].results.push) {
                                                apps[i].results.push = {};
                                            }
                                            apps[i].results.push.messaging_users = apps[i].results.analytics.messaging_users;
                                        }
                                        delete apps[i].results.analytics.messaging_users;
                                    }
                                    else if (j === "crashdata") {
                                        apps[i].results.crash = getCrashData(apps[i].results[j] || {});
                                        delete apps[i].results[j];
                                    }
                                    else if (j === "[CLY]_push_sent" || j === "[CLY]_push_open" || j === "[CLY]_push_action") {
                                        if (!apps[i].results.push) {
                                            apps[i].results.push = {};
                                        }
                                        apps[i].results.push[j.replace("[CLY]_", "")] = getEventData(apps[i].results[j] || {});
                                        delete apps[i].results[j];
                                    }
                                    else if (j === "purchases") {
                                        if (!apps[i].results.revenue) {
                                            apps[i].results.revenue = {};
                                        }
                                        var revenueData = getRevenueData(apps[i].results[j] || {});
                                        apps[i].results.revenue[j + "_c"] = revenueData.c;
                                        apps[i].results.revenue[j + "_s"] = revenueData.s;
                                        delete apps[i].results[j];
                                    }
                                    else {
                                        if (!apps[i].results.events) {
                                            apps[i].results.events = {};
                                        }
                                        apps[i].results.events[j] = getEventData(apps[i].results[j] || {});
                                        delete apps[i].results[j];
                                    }
                                }
                                if (apps[i].results.events) {
                                    const keysSorted = Object.keys(apps[i].results.events)
                                        .sort(function(a, b) {
                                            return apps[i].results.events[b].total - apps[i].results.events[a].total;
                                        });
                                    const eventData = [];
                                    keysSorted.forEach((k) => {
                                        eventData.push({...apps[i].results.events[k], name: k});
                                    });
                                    apps[i].results.events = eventData;
                                }
                            }
                        }
                        if (total > 0) {
                            report.apps = apps;
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
                                        props["reports.sent-by"] = localize.format(props["reports.sent-by"]);
                                        props["reports.view-in-browser"] = localize.format(props["reports.view-in-browser"]);
                                        props["reports.get-help"] = localize.format(props["reports.get-help"]);
                                        report.unsubscribe_local_string = props["reports.unsubscribe"];

                                        const metricPropsString = {};
                                        for (let k in metricProps) {
                                            metricPropsString[k] = metricProps[k].map((item) => {
                                                return props["reports.metric-" + item];
                                            });
                                        }
                                        report.properties = props;
                                        var allowedMetrics = {};
                                        for (var k in report.metrics) {
                                            if (metrics[k]) {
                                                for (var j in metrics[k]) {
                                                    allowedMetrics[j] = true;
                                                }
                                            }
                                        }
                                        const messages = [];
                                        try {
                                            for (let i = 0; i < report.emails.length; i++) {
                                                const msg = reports.genUnsubscribeCode(report, report.emails[i]);
                                                const unsubscribeLink = host + "/unsubscribe_report?data=" + encodeURIComponent(msg);
                                                const html = ejs.render(template, {"apps": report.apps, "host": host, "report": report, "version": versionInfo, "properties": props, metrics: allowedMetrics, metricProps: metricPropsString, "unsubscribe_link": unsubscribeLink});
                                                messages.push({html, unsubscribeLink});
                                            }
                                        }
                                        catch (e) {
                                            log.e(e);
                                        }
                                        report.subject = versionInfo.title + ': ' + localize.format(
                                            (
                                                (report.frequency === "weekly") ? report.properties["reports.subject-week"] :
                                                    ((report.frequency === "monthly") ? report.properties["reports.subject-month"] : report.properties["reports.subject-day"])
                                            ), report.total_new);
                                        report.messages = messages;

                                        const message = ejs.render(template, {"apps": report.apps, "host": host, "report": report, "version": versionInfo, "properties": props, metrics: allowedMetrics, metricProps: metricPropsString, "unsubscribe_link": ""});
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

    reports.decryptUnsubscribeCode = function(data) {
        try {
            const reportConfig = plugins.getConfig("reports", null, true);
            const key = reportConfig.secretKey;
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'hex'), {authTagLength: 16});
            decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
            const decrpyted = Buffer.concat([decipher.update(Buffer.from(data.content, 'hex')), decipher.final()]);
            const result = JSON.parse(decrpyted.toString());
            return result;
        }
        catch (e) {
            log.e("decrypt unsubscribe code err", e);
        }
    };

    reports.genUnsubscribeCode = function(report, email) {
        try {
            const reportConfig = plugins.getConfig("reports", null, true);

            const iv = crypto.randomBytes(16);
            const key = reportConfig.secretKey;
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            const data = {
                "reportID": report._id,
                "email": email,
            };

            const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
            const result = {
                iv: iv.toString('hex'),
                content: encrypted.toString('hex'),
                authTag: cipher.getAuthTag().toString('hex')
            };
            return JSON.stringify(result);
        }
        catch (e) {
            console.log(e, "[report subscription encode]");
        }
    };

    reports.send = function(report, message, callback) {
        if (report.emails) {
            for (let i = 0; i < report.emails.length; i++) {
                let unsubscribeLink = report.messages && report.messages[i] && report.messages[i].unsubscribeLink;
                let html = report.messages && report.messages[i] && report.messages[i].html;
                if (!html && message.data && message.template) { // report from dashboard
                    const msg = reports.genUnsubscribeCode(report, report.emails[i]);
                    message.data.unsubscribe_link = message.data.host + "/unsubscribe_report?data=" + encodeURIComponent(msg);
                    html = ejs.render(message.template, message.data);
                }
                const msg = {
                    to: report.emails[i],
                    from: versionInfo.title,
                    subject: report.subject,
                    // if report contains customize message for each email address, use reports.messages[i]
                    html: html,
                };

                const filePath = '/tmp/email_report_' + new Date().getTime() + '.pdf';
                const options = { "path": filePath, "width": "1028px", height: "1000px" };
                if (report.messages && report.messages[i]) {
                    msg.list = {
                        unsubscribe: {
                            url: unsubscribeLink,
                            comment: report.unsubscribe_local_string || 'Unsubscribe'
                        }
                    };
                }

                if (report.sendPdf === true) {
                    pdf.renderPDF(html, function() {
                        msg.attachments = [{filename: "Countly_Report.pdf", path: filePath}];

                        /**
                         * callback function after sending email to delete pdf file
                         */
                        const deletePDFCallback = function() {
                            if (fs.existsSync(filePath)) {
                                fs.unlink(filePath, (e) => {
                                    if (e) {
                                        log.d(e);
                                    }
                                });
                            }
                        };
                        if (mail.sendPoolMail) {
                            mail.sendPoolMail(msg, deletePDFCallback);
                        }
                        else {
                            mail.sendMail(msg, deletePDFCallback);
                        }
                    }, options, {
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    }, true).catch(err => {
                        log.d(err);
                    });

                }
                else {
                    if (mail.sendPoolMail) {
                        mail.sendPoolMail(msg);
                    }
                    else {
                        mail.sendMail(msg);
                    }
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
                        if (events[j].indexOf("[CLY]_") === -1 || events[j].startsWith('[CLY]_group_')) {
                            collections["events." + events[j]] = true;
                        }
                    }
                }
                else {
                    collections[i] = true;
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
                if ((tmp_x.cruf !== undefined) && (tmp_x.crunf !== undefined)) {
                    currentUnique += tmp_x.cruf + tmp_x.crunf;
                }
                currentTotal += tmp_x.crf + tmp_x.crnf;
                currentNonfatal += tmp_x.crnf;
                currentFatal += tmp_x.crf;
                currentResolved += tmp_x.crru;
            }

            for (let i = 0; i < (_periodObj.previousPeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriodArr[i]);
                tmp_y = clearCrashObject(tmp_y);
                if ((tmp_y.cruf !== undefined) && (tmp_y.crunf !== undefined)) {
                    previousUnique += tmp_y.cruf + tmp_y.crunf;
                }
                previousTotal += tmp_y.crf + tmp_y.crnf;
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

            currentTotal = tmp_x.crf + tmp_x.crnf;
            previousTotal = tmp_y.crf + tmp_y.crnf;
            currentNonfatal = tmp_x.crnf;
            previousNonfatal = tmp_y.crnf;
            currentUnique = tmp_x.cruf + tmp_x.crunf;
            previousUnique = tmp_y.cruf + tmp_y.crunf;
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
