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
                var props = {};
                props = params.qstring.args;
                props.minute = (props.minute) ? parseInt(props.minute) : 0;
                props.hour = (props.hour) ? parseInt(props.hour) : 0;
                props.day = (props.day) ? parseInt(props.day) : 0;
                props.timezone = props.timezone || "Etc/GMT";
                props.user = params.member._id;
                //authorized is how /report/authorize reports its result back, so the
                //request must not be able to supply one: it would both answer the
                //non-core check for the caller and be written onto the report below
                delete props.authorized;

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

                /**
                 * Insert the authorized report document
                 * @returns {void}
                 */
                function insertReport() {
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
                }

                //apps is authorized whatever the report type. It used to be checked
                //only for core reports, so a non-core report could be stored with an
                //arbitrary apps list, and a later update flipping report_type to "core"
                //would start using that list without it ever having been checked. The
                //dashboards drawer hides the app picker, so a legitimate non-core report
                //carries an empty apps and is unaffected by this.
                if (typeof props.apps !== "undefined" && props.apps !== null && !Array.isArray(props.apps)) {
                    return common.returnMessage(params, 400, 'Invalid apps');
                }
                if (!appsArePermitted(params, props.apps)) {
                    return common.returnMessage(params, 401, 'User does not have right to access this information');
                }

                if (props.report_type === "core") {
                    if (!props.apps || !Array.isArray(props.apps) || props.apps.length === 0) {
                        common.returnMessage(params, 400, 'Invalid or missing apps');
                        return;
                    }
                    insertReport();
                }
                else {
                    //a non-core report targets another plugin's object - a
                    //"dashboards" report renders the dashboard named in
                    //props.dashboards - and only that plugin knows whether the
                    //member may use it. Previously nothing checked this, so any
                    //member with reports-create rights could schedule a report
                    //against an arbitrary dashboard id.
                    validateNonCoreUser(params, props, function(authErr, authorized) {
                        if (!authorized) {
                            return common.returnMessage(params, 401, 'User does not have right to access this information');
                        }
                        insertReport();
                    });
                }
            });
            break;
        case 'update':
            validateUpdate(paramsInstance, FEATURE_NAME, function() {
                var props = {};
                var params = paramsInstance;
                props = params.qstring.args;
                var id = props._id;
                delete props._id;
                //the report owner is set at creation and must not be changed on
                //update: repointing it to an unresolvable id would make the
                //scheduled sender fall back to a global admin and render the
                //report (e.g. a dashboard) with elevated access
                delete props.user;
                //see create: the authorize flag comes back through the object passed to
                //the dispatch, so a submitted one must reach neither that nor $set
                delete props.authorized;
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

                    /**
                     * Apply the authorized update
                     * @returns {void}
                     */
                    function applyUpdate() {
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
                    }

                    //Authorize the apps the report will actually have, which is the
                    //submitted list when one is sent and the stored list otherwise.
                    //Checking only the submitted list let an update omit apps to keep a
                    //stored list that was never checked, and flip report_type to "core"
                    //so that list started being used.
                    if (typeof props.apps !== "undefined" && props.apps !== null && !Array.isArray(props.apps)) {
                        return common.returnMessage(params, 400, 'Invalid apps');
                    }
                    var effectiveApps = (typeof props.apps !== "undefined") ? props.apps : report.apps;
                    if (!appsArePermitted(params, effectiveApps)) {
                        return common.returnMessage(params, 401, 'User does not have right to access this information');
                    }

                    if (effectiveType === "core") {
                        if (typeof props.apps !== "undefined" && (!Array.isArray(props.apps) || props.apps.length === 0)) {
                            return common.returnMessage(params, 400, 'Invalid or missing apps');
                        }
                        applyUpdate();
                    }
                    else {
                        //authorize the merged report, not just the payload: a
                        //partial update may leave the target (props.dashboards)
                        //in the stored document, and repointing an existing
                        //report at another dashboard must be checked too. A copy
                        //is passed so the authorize flag never reaches $set.
                        var mergedReport = Object.assign({}, report, props);
                        mergedReport.report_type = effectiveType;
                        validateNonCoreUser(params, mergedReport, function(authErr, authorized) {
                            if (!authorized) {
                                return common.returnMessage(params, 401, 'User does not have right to access this information');
                            }
                            applyUpdate();
                        });
                    }
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

                    //Owning a report does not mean still being allowed to read the apps
                    //it covers. Without this check somebody who lost access to an app
                    //could send themselves that app's figures on demand, which is the
                    //most direct form of the problem the scheduled path also has.
                    if (!appsArePermitted(params, result.apps)) {
                        log.d("Rejected report send: report " + id + " targets apps the caller may not read");
                        common.returnMessage(params, 401, 'User does not have right to access this information');
                        return false;
                    }

                    reports.sendReport(common.db, id, function(err2, res2, skipped) {
                        if (err2) {
                            log.d("Error occurred while sending out report.", err2);
                            common.returnMessage(params, 200, err2);
                        }
                        else if (skipped) {
                            //deliberately not sent: the member the report is scheduled as
                            //may no longer read the apps it covers. Saying "Success" here
                            //would report an email that never went out.
                            log.d("Report " + id + " was not sent: its owner may no longer read the apps it covers");
                            common.returnMessage(params, 200, "Report not sent: its owner no longer has access to the apps it covers");
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

                    //renders the report's contents straight into the response, so the
                    //apps it covers have to be readable by the caller now, not merely
                    //at the time they created it
                    if (!appsArePermitted(params, result.apps)) {
                        log.d("Rejected report preview: report " + id + " targets apps the caller may not read");
                        common.returnMessage(params, 401, 'User does not have right to access this information');
                        return false;
                    }

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

                    //same as preview: this hands back the rendered report, so the apps
                    //it covers have to be readable by the caller now
                    if (!appsArePermitted(params, result.apps)) {
                        log.d("Rejected report pdf: report " + id + " targets apps the caller may not read");
                        common.returnMessage(params, 401, 'User does not have right to access this information');
                        return false;
                    }

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
                                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
                            }, true);
                        }
                        else {
                            common.returnMessage(params, 200, 'No data to report');
                        }
                    });
                });
            });
            break;
        case 'status':
            validateUpdate(paramsInstance, FEATURE_NAME, async function() {
                var params = paramsInstance;
                const statusList = (params.qstring.args && typeof params.qstring.args === "object") ? params.qstring.args : {};

                /**
                 * The enabled state a status change asks for, as a strict boolean.
                 *
                 * The authorization below and the write further down have to read the
                 * request the same way. The sender only tests `enabled + "" !== "false"`,
                 * so a truthy value that is not exactly true - a 1, say - would leave the
                 * report enabled while skipping the authorization, which is the whole
                 * point of it. Anything else is stored as false, and switching a report
                 * off needs no authorization.
                 *
                 * @param {*} value - the value submitted for one report id
                 * @returns {boolean} true when the change asks for the report to be enabled
                 */
                function asksToEnable(value) {
                    return value === true || value === "true" || value === 1 || value === "1";
                }

                //Owning a report is not the same as being allowed to act on the apps it
                //targets, so enabling one is authorized against its *stored* apps.
                //Without this, somebody who lost access to an app could switch their old
                //report back on and keep that app's figures arriving by email.
                //
                //Switching one off stays allowed. It only reduces what the report does,
                //and refusing would leave them unable to stop mail they no longer want.
                const requestedIds = Object.keys(statusList);
                const enablingIds = requestedIds.filter(function(id) {
                    return asksToEnable(statusList[id]);
                });
                if (enablingIds.length > 0 && !params.member.global_admin) {
                    let toEnable = [];
                    try {
                        //scoped to records the caller may modify, the same as the write
                        //below. An id belonging to somebody else must stay the silent
                        //no-op it already was, rather than returning a 403 that would
                        //confirm a report with those apps exists.
                        toEnable = await common.db.collection("reports").find({
                            _id: {
                                $in: enablingIds.map(function(id) {
                                    return common.db.ObjectID(id);
                                })
                            },
                            user: common.db.ObjectID(params.member._id)
                        }, { projection: { apps: 1 } }).toArray();
                    }
                    catch (e) {
                        log.e("Failed to load reports for a status change", e);
                        common.returnMessage(params, 500, "Failed to change report status");
                        return;
                    }
                    const unauthorized = toEnable.filter(function(report) {
                        return !appsArePermitted(params, report.apps);
                    });
                    if (unauthorized.length > 0) {
                        log.d("Rejected report status change: report(s) "
                            + unauthorized.map(function(r) {
                                return r._id;
                            }).join(", ") + " target apps the caller may not read");
                        common.returnMessage(params, 401, 'User does not have right to access this information');
                        return;
                    }
                }

                //nothing to act on: answer, rather than leaving the request open,
                //which is what happened while the write below was the only responder
                if (requestedIds.length === 0) {
                    common.returnMessage(params, 400, 'Invalid or missing args');
                    return;
                }

                var bulk = common.db.collection("reports").initializeUnorderedBulkOp();
                requestedIds.forEach(function(id) {
                    //scope to records the caller may modify (owner / global
                    //admin); otherwise any report's enabled state could be
                    //toggled by _id alone.
                    bulk.find(recordUpdateOrDeleteQuery(params, id)).updateOne({ $set: { enabled: asksToEnable(statusList[id]) } });
                });
                bulk.execute(function(err) {
                    if (err) {
                        log.e("Failed to change report status", err);
                        common.returnMessage(params, 200, err);
                        return;
                    }
                    common.returnMessage(params, 200, "Success");
                });
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
     * Whether the member may schedule a report for every app in a list.
     *
     * An empty or absent list is permitted: a non-core report legitimately has no apps,
     * since the dashboards drawer hides the app picker. What must never pass is a list
     * naming an app the member cannot read, whatever the report type, because a later
     * update can flip report_type to "core" and the stored list would then be used.
     *
     * Legacy members have no permission object and reach apps through user_of, so they
     * are allowed for those, matching how /o/reports/all and the alerts endpoints treat
     * them. Without it they could not schedule reports for their own apps.
     *
     * @param {object} params - request params object, for member and global_admin
     * @param {Array} apps - app ids the report targets
     * @returns {boolean} true when every app is permitted
     */
    function appsArePermitted(params, apps) {
        if (params.member.global_admin) {
            return true;
        }
        if (typeof apps === "undefined" || apps === null) {
            return true;
        }
        //a value that is not a list cannot be authorized app by app. Passing it through
        //as if it were "no apps" let a non-core report store an unchecked list, which an
        //update flipping report_type to "core" then started using.
        if (!Array.isArray(apps)) {
            return false;
        }
        if (apps.length === 0) {
            return true;
        }
        let allowedApps = (getAdminApps(params.member) || [])
            .concat(getUserAppsForFeaturePermission(params.member, FEATURE_NAME, 'r') || []);
        if (typeof params.member.permission === "undefined" && Array.isArray(params.member.user_of)) {
            allowedApps = allowedApps.concat(params.member.user_of);
        }
        allowedApps = allowedApps.map(String);
        return apps.every(function(appId) {
            return allowedApps.indexOf(appId + "") > -1;
        });
    }

    /**
     * Verify the member may use a non-core report's target.
     *
     * A non-core report_type names the plugin that owns the report, and that
     * plugin authorizes the target through the /report/authorize event: the
     * dashboards plugin checks view access to report.dashboards there. This
     * fails closed, so a report type whose plugin does not answer the event is
     * not authorized. A plugin adding a new report type must implement
     * /report/authorize for it.
     *
     * Core reports are authorized inline against the member's per-app reports
     * permission instead, so they never reach this.
     *
     * @param {object} params - request params object
     * @param {object} props - report related props
     * @param {function} cb - callback receiving (err, authorized)
     */
    function validateNonCoreUser(params, props, cb) {
        //the flag is only how the dispatch reports its result back, and props is built
        //from the request, so a submitted authorized:true has to be cleared before the
        //dispatch runs. Any path where no plugin overwrites it - an unrecognised report
        //type, a disabled plugin, the dashboards handler's missing-dashboard and error
        //paths - would otherwise read the caller's own value and fail open, which is
        //what this check exists to prevent.
        delete props.authorized;
        plugins.dispatch("/report/authorize", { params: params, report: props }, function() {
            //only an explicit true from a plugin that recognised the type authorizes
            var authorized = props.authorized === true;
            //and it must not be persisted onto the report document either
            delete props.authorized;
            cb(null, authorized);
        });
    }
}());
