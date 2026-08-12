var common = require('../../../api/utils/common.js'),
    reports = require("./reports"),
    async = require('async'),
    moment = require('moment-timezone'),
    log = require('../../../api/utils/log')('reports:api'),
    ejs = require("ejs"),
    fs = require("fs"),
    plugins = require('../../pluginManager.js'),
    pdf = require('../../../api/utils/pdf'),
    { validateCreate, validateRead, validateUpdate, validateDelete, getAdminApps, getUserAppsForFeaturePermission } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'reports';

//What a client may set on a report, taken from what the drawer binds plus the
//metrics map it assembles on submit. Everything else on a report document is
//the generator's own work at send time: messages, data, subject, mailTemplate,
//properties, period, start, end, date, total_new, universe.
//
//The direction matters. Removing known-dangerous keys would leave every field
//added later writable until somebody remembers to deny it, and the cost of
//forgetting is unbounded, because these values are not only stored but consumed:
//messages[].html is the string handed to the pdf renderer, so a request must
//never be able to supply it. Declaring what the drawer sends fails the other
//way, and the cost of forgetting is a setting that stops saving, which someone
//notices and files.
const REPORT_FIELDS = [
    "title",
    "report_type",
    "apps",
    "dashboards",
    "date_range",
    "emails",
    "frequency",
    "day",
    "hour",
    "minute",
    "timezone",
    "sendPdf",
    "selectedEvents",
    "metrics"
];

/**
* Keep only what a client may set on a report.
* @param {object} args - the submitted args object
* @returns {object} a new object holding the allowed fields that were sent
**/
function publicReportFields(args) {
    const props = {};
    REPORT_FIELDS.forEach(function(field) {
        if (typeof args[field] !== "undefined") {
            props[field] = args[field];
        }
    });
    return props;
}

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/master", function() {
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('reports:send').replace().schedule("every 1 hour starting on the 0 min");
        }, 10000);
    });

    /**
     * @api {get} /o/reports/all Get reports data 
     * @apiName  getData
     * @apiGroup reports 
     *
     * @apiDescription get user created reports data
     * @apiQuery {string} app_id app_id is for read permission check. 
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * [
          {
            "_id": "6262742dbf7392a8bfd8c1f6",
            "title": "test",
            "report_type": "core",
            "apps": [
              "615f0c4120543a8ed03a89b8",
              "610cea5f6229f9e738d30d0a",
              "61f3e6ba92aa2af464d9d7c1"
            ],
            "emails": [
              "test@test.com"
            ],
            "metrics": {
              "analytics": true,
              "crash": true
            },
            "metricsArray": [],
            "frequency": "monthly",
            "timezone": "Asia/Yerevan",
            "day": 0,
            "hour": 2,
            "minute": 0,
            "dashboards": null,
            "date_range": null,
            "selectedEvents": [],
            "sendPdf": true,
            "user": "60afbaa84723f369db477fee",
            "r_day": 6,
            "r_hour": 22,
            "r_minute": 0,
            "isValid": true
          }
        ]
     */

    /**
     * @api {get} /o/reports/send trigger sending reports by email now 
     * @apiName  sendReportNow 
     * @apiGroup reports 
     *
     * @apiDescription trigger email sending for the report. 
     * @apiQuery {string} args JSON string of an object contains target report "_id"
     * @apiQuery {string} app_id app_id is for read permission check. 
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {"result":"No data to report"}
     *
     **/
    plugins.register("/o/reports", function(ob) {
        let paramsInstance = ob.params;
        var paths = ob.paths;
        if (paramsInstance.qstring.args) {
            try {
                paramsInstance.qstring.args = JSON.parse(paramsInstance.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse ' + paramsInstance.qstring.args + ' JSON failed');
                common.returnMessage(paramsInstance, 400, 'Invalid JSON in args');
                return true;
            }
        }

        switch (paths[3]) {
        case 'all':
            validateRead(paramsInstance, FEATURE_NAME, function(params) {
                const query = {};
                if (params.member.global_admin !== true) {
                    query.$or = [
                        {user: common.db.ObjectID(params.member._id)},
                        {emails: params.member.email},
                    ];
                }
                common.db.collection('reports').find(query).toArray(function(err, result) {
                    var parallelTashs = [];

                    for (var i = 0; i < result.length; i++) {
                        result[i].report_type = result[i].report_type || "core";

                        if (result[i].report_type !== "core") {
                            parallelTashs.push(validateReportDispatchRequest.bind(null, result[i]));
                        }
                        else {
                            result[i].isValid = true;
                        }
                    }

                    async.parallel(parallelTashs, function() {
                        common.returnOutput(params, result);
                    });

                    /**
                     * validate report dispatcher
                     * @param {object} report - report object
                     * @param {func} cb - callback function
                     */
                    function validateReportDispatchRequest(report, cb) {
                        plugins.dispatch("/report/verify", { params: params, report: report }, function() {
                            report.isValid = report.isValid || false;
                            cb();
                        });
                    }
                });
            });
            break;
        default:
            common.returnMessage(paramsInstance, 400, 'Invalid path');
            break;
        }
        return true;
    });


    /**
     * @api {get} /i/reports/create  
     * @apiName  createReport 
     * @apiGroup reports 
     *
     * @apiDescription create report 
     * @apiQuery {string} args JSON string of new report object. 
     * @apiQuery {String} app_id target app id. 
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {"result":"Success"}
     *
     */

    /**
     * @api {get} /i/reports/update
     * @apiName updateReport 
     * @apiGroup reports 
     *
     * @apiDescription update report 
     * @apiQuery {string} args JSON string of new report object, contains "_id" value. 
     * @apiQuery {String} app_id target app id. 
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {"result":"Success"}
     */

    /**
     * @api {post} /i/reports/status change hook status
     * @apiName changeReportsStatus 
     * @apiGroup reports 
     *
     * @apiDescription change reports status by boolean flag.
     * @apiQuery {string} JSON string of status object for reports record want to update.
     *  for example: {"626270afbf7392a8bfd8c1f3":false, "42dafbf7392a8bfd8c1e1": true}
     * @apiQuery {String} app_id target app id of the alert.  
     *
     * @apiSuccessExample {text} Success-Response:
     * HTTP/1.1 200 OK
     *
     * true
     *
    */

    /**
     * @api {get} /i/reports/delete delete report 
     * @apiName deleteReport 
     * @apiGroup reports 
     *
     * @apiDescription delet report by id 
     * @apiQuery {string} args JSON string of an object contains the report "_id". 
     * @apiQuery {String} app_id target app id. 
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     *
     * {"result":"Success"}
     */
    plugins.register("/i/reports", function(ob) {
        var paramsInstance = ob.params;
        var paths = ob.paths;
        if (paramsInstance.qstring.args) {
            try {
                paramsInstance.qstring.args = JSON.parse(paramsInstance.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse ' + paramsInstance.qstring.args + ' JSON failed');
                common.returnMessage(paramsInstance, 400, 'Invalid JSON in args');
                return true;
            }
        }
        const recordUpdateOrDeleteQuery = function(params, recordID) {
            const query = {_id: common.db.ObjectID(recordID)};
            if (params.member.global_admin !== true) {
                query.user = common.db.ObjectID(params.member._id);
            }
            return query;
        };

        switch (paths[3]) {
        case 'create':
            validateCreate(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                var props = publicReportFields(params.qstring.args);
                props.minute = (props.minute) ? parseInt(props.minute) : 0;
                props.hour = (props.hour) ? parseInt(props.hour) : 0;
                props.day = (props.day) ? parseInt(props.day) : 0;
                props.timezone = props.timezone || "Etc/GMT";
                props.user = params.member._id;

                if (props.frequency !== "weekly") {
                    if (props.frequency !== "monthly") {
                        props.frequency = "daily";
                    }
                    else {
                        props.frequency = "monthly";
                    }
                }
                else {
                    props.frequency = "weekly";
                }

                convertToTimezone(props);

                //a missing report_type is treated as "core" by the generator
                //(reports.js: report.report_type || "core"), so normalize it
                //here too - otherwise the per-app authorization below could be
                //skipped by omitting report_type while still producing a core
                //report for arbitrary apps.
                props.report_type = props.report_type || "core";

                if (props.report_type === "core") {
                    if (!props.apps || !Array.isArray(props.apps) || props.apps.length === 0) {
                        common.returnMessage(params, 400, 'Invalid or missing apps');
                        return;
                    }

                    if (!params.member.global_admin) {
                        let allowedApps = (getAdminApps(params.member) || [])
                            .concat(getUserAppsForFeaturePermission(params.member, FEATURE_NAME, 'r') || []);
                        if (typeof params.member.permission === "undefined" && Array.isArray(params.member.user_of)) {
                            allowedApps = allowedApps.concat(params.member.user_of);
                        }
                        let notPermitted = props.apps.some(function(appId) {
                            return allowedApps.indexOf(appId) === -1;
                        });
                        if (notPermitted) {
                            return common.returnMessage(params, 401, 'User does not have right to access this information');
                        }
                    }
                }

                common.db.collection('reports').insert(props, function(err0, result) {
                    result = result.ops;
                    if (err0) {
                        err0 = err0.err;
                        common.returnMessage(params, 200, err0);
                    }
                    else {
                        plugins.dispatch("/systemlogs", {params: params, action: "reports_create", data: result[0]});
                        common.returnMessage(params, 200, "Success");
                    }
                });
            });
            break;
        case 'update':
            validateUpdate(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                //_id names the report to update and is not part of the document;
                //user is set at creation and must not be changed on update, since
                //repointing it to an unresolvable id would make the scheduled
                //sender fall back to a global admin and render the report (e.g. a
                //dashboard) with elevated access. Neither is in REPORT_FIELDS, so
                //the allow-list drops both.
                var id = params.qstring.args._id;
                var props = publicReportFields(params.qstring.args);
                if (props.frequency !== "daily" && props.frequency !== "weekly" && props.frequency !== "monthly") {
                    delete props.frequency;
                }
                if (props.minute) {
                    props.minute = parseInt(props.minute);
                }
                if (props.hour) {
                    props.hour = parseInt(props.hour);
                }
                if (props.day) {
                    props.day = parseInt(props.day);
                }
                props.timezone = props.timezone || "Etc/GMT";

                convertToTimezone(props);

                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err_update, report) {
                    if (err_update) {
                        console.log(err_update);
                    }
                    if (!report) {
                        return common.returnMessage(params, 404, 'Report not found');
                    }

                    //determine the effective report type after the update: a
                    //missing report_type (in the payload and the stored report)
                    //is treated as "core" by the generator, so authorize the
                    //apps whenever the merged report is core - otherwise omitting
                    //report_type on update would bypass the per-app check.
                    //mirror the generator's falsy-defaulting (report_type ||
                    //"core"): a falsy report_type ("" / null) must not be
                    //treated as a non-core type to skip the per-app check.
                    var effectiveType = props.report_type || report.report_type || "core";

                    if (effectiveType === "core" && typeof props.apps !== "undefined") {
                        if (!Array.isArray(props.apps) || props.apps.length === 0) {
                            return common.returnMessage(params, 400, 'Invalid or missing apps');
                        }
                        if (!params.member.global_admin) {
                            let allowedApps = (getAdminApps(params.member) || [])
                                .concat(getUserAppsForFeaturePermission(params.member, FEATURE_NAME, 'r') || []);
                            if (typeof params.member.permission === "undefined" && Array.isArray(params.member.user_of)) {
                                allowedApps = allowedApps.concat(params.member.user_of);
                            }
                            let notPermitted = props.apps.some(function(appId) {
                                return allowedApps.indexOf(appId) === -1;
                            });
                            if (notPermitted) {
                                return common.returnMessage(params, 401, 'User does not have right to access this information');
                            }
                        }
                    }

                    common.db.collection('reports').update(recordUpdateOrDeleteQuery(params, id), {$set: props}, function(err_update2) {
                        if (err_update2) {
                            err_update2 = err_update2.err;
                            common.returnMessage(params, 200, err_update2);
                        }
                        else {
                            plugins.dispatch("/systemlogs", {params: params, action: "reports_edited", data: {_id: id, before: report, update: props}});
                            common.returnMessage(params, 200, "Success");
                        }
                    });
                });
            });
            break;
        case 'delete':
            validateDelete(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }

                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err, props) {
                    common.db.collection('reports').remove(recordUpdateOrDeleteQuery(params, id), {safe: true}, function(err_del) {
                        if (err_del) {
                            common.returnMessage(params, 200, 'Error deleting report');
                        }
                        else {
                            if (props) {
                                plugins.dispatch("/systemlogs", {params: params, action: "reports_deleted", data: props});
                            }
                            common.returnMessage(params, 200, "Success");
                        }
                    });
                });
            });
            break;
        case 'send':
            validateRead(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 200, 'Report not found');
                        return false;
                    }

                    reports.sendReport(common.db, id, function(err2) {
                        if (err2) {
                            log.d("Error occurred while sending out report.", err);
                            common.returnMessage(params, 200, err2);
                        }
                        else {
                            common.returnMessage(params, 200, "Success");
                        }
                    });
                });
            });
            break;
        case 'preview':
            validateRead(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 200, 'Report not found');
                        return false;
                    }

                    // TODO: Handle report type check

                    reports.getReport(common.db, result, function(err2, res) {
                        if (err2) {
                            common.returnMessage(params, 200, err2);
                        }
                        else if (res) {
                            var html = res.message;
                            if (result.report_type !== "core") {
                                html = ejs.render(res.message.template, res.message.data);
                            }

                            common.returnRaw(params, 200, html, {'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*'});
                        }
                        else {
                            common.returnMessage(params, 200, 'No data to report');
                        }
                    });
                });
            });
            break;
        case 'pdf':
            validateRead(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 200, 'Report not found');
                        return false;
                    }

                    // TODO: Handle report type check

                    reports.getReport(common.db, result, function(err2, res) {
                        if (err2) {
                            common.returnMessage(params, 200, err2);
                        }
                        else if (res) {
                            var html = res.message;
                            if (result.report_type !== "core") {
                                html = ejs.render(res.message.template, res.message.data);
                            }
                            const filePath = '/tmp/email_report_' + new Date().getTime() + '.pdf';
                            const options = { "path": filePath, "width": "1028px", height: "1000px" };

                            //the template loads its images from this host, and the
                            //renderer refuses every other origin
                            const renderOrigins = [res.message && res.message.data && res.message.data.host];

                            pdf.renderPDF(html, function() {
                                //output created file to browser
                                fs.readFile(filePath, function(err3, data) {
                                    if (err3) {
                                        console.log(err3);
                                        common.returnMessage(params, 500, 'Cannot read pdf file');
                                    }
                                    else {
                                        common.returnRaw(params, 200, data, {
                                            'Content-Type': 'application/pdf',
                                            'Content-Disposition': 'inline; filename="report.pdf"',
                                            'Content-Length': data.length,
                                            'Access-Control-Allow-Origin': '*'
                                        });
                                    }
                                    fs.unlink(filePath, function(unlinkErr) {
                                        if (unlinkErr) {
                                            console.log("Cannot remove temp pdf file");
                                            console.log(unlinkErr);
                                        }
                                    });
                                });
                            }, options, {
                                //kept for the same reason as the send path: a data:
                                //url document cannot load its own origin's images
                                //without it. renderOrigins is what bounds the requests.
                                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
                            }, true, renderOrigins);
                        }
                        else {
                            common.returnMessage(params, 200, 'No data to report');
                        }
                    });
                });
            });
            break;
        case 'status':
            validateUpdate(paramsInstance, FEATURE_NAME, function() {
                var params = paramsInstance;
                const statusList = params.qstring.args;

                console.log(statusList, 'status-list');

                var bulk = common.db.collection("reports").initializeUnorderedBulkOp();
                for (const id in statusList) {
                    //scope to records the caller may modify (owner / global
                    //admin); otherwise any report's enabled state could be
                    //toggled by _id alone.
                    bulk.find(recordUpdateOrDeleteQuery(params, id)).updateOne({ $set: { enabled: statusList[id] } });
                }
                if (bulk.length > 0) {
                    bulk.execute(function(err) {
                        if (err) {
                            common.returnMessage(params, 200, err);
                        }
                        common.returnMessage(params, 200, "Success");
                    });
                }
            });
            break;
        default:
            common.returnMessage(paramsInstance, 400, 'Invalid path');
            break;
        }
        return true;
    });

    /*plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
        common.db.collection("reports").update({}, {$pull:{apps:appId+""}}, { multi: true }, function(err, res){});
	});*/

    plugins.register("/i/users/delete", async function(ob) {
        await common.db.collection("reports").remove({user: common.db.ObjectID(ob.data._id)}, { multi: true }, function() {});
    });

    /**
     * convert to app timezone
     * @param {object} props - props contains date info 
     */
    function convertToTimezone(props) {
        //convert time
        var serverOffset = moment().utcOffset();
        var clientOffset = moment().tz(props.timezone).utcOffset();
        var diff = clientOffset - serverOffset;
        var day = props.day;
        var hour = props.hour - Math.floor(diff / 60);
        var minute = props.minute - diff % 60;

        if (minute < 0) {
            minute = 60 + minute;
            hour--;
        }
        else if (minute > 59) {
            minute = minute - 60;
            hour++;
        }

        if (hour < 0) {
            hour = 24 + hour;
            day--;
        }
        else if (hour > 23) {
            hour = hour - 24;
            day++;
        }

        if (day < 1) {
            day = 7 + day;
        }
        else if (day > 7) {
            day = day - 7;
        }

        props.r_day = day;
        props.r_hour = hour;
        props.r_minute = minute;
    }

    /**
     * validation function for verifing user have permission to access infomation or not for core type of report
     * @param {object} params - request params object
     * @param {object} props  - report related props
     * @param {func} cb - callback function
     * @return {func} cb - callback function
    
    function validateCoreUser(params, props, cb) {
        var userApps = getUserApps(params.member);
        var apps = props.apps;
        var isAppUser = apps.every(function(app) {
            return userApps && userApps.indexOf(app) > -1;
        });

        if (!params.member.global_admin && !isAppUser) {
            return cb(null, false);
        }
        else {
            return cb(null, true);
        }

    }
    */

    /**
     * validation function for verifing user have permission to access infomation or not for not core type of report
     * @param {object} params - request params object
     * @param {object} props  - report related props
     * @param {func} cb - callback function
     
    function validateNonCoreUser(params, props, cb) {
        plugins.dispatch("/report/authorize", { params: params, report: props }, function() {
            var authorized = props.authorized || false;
            cb(null, authorized);
        });
    }
    */
}());
