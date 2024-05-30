var common = require('../../../api/utils/common.js'),
    reports = require("./reports"),
    async = require('async'),
    moment = require('moment-timezone'),
    log = require('../../../api/utils/log')('reports:api'),
    ejs = require("ejs"),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete, getUserApps, } = require('../../../api/utils/rights.js');

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

                // TODO: handle report type check

                let userApps = getUserApps(params.member);
                let notPermitted = false;
                for (var i = 0; i < props.apps.length; i++) {
                    if (userApps.indexOf(props.apps[i]) === -1) {
                        notPermitted = true;
                    }
                }

                if (notPermitted && !params.member.global_admin) {
                    return common.returnMessage(params, 401, 'User does not have right to access this information');
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
                var props = {};
                var params = paramsInstance;
                props = params.qstring.args;
                var id = props._id;
                delete props._id;
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

                // TODO: Handle report type check
                const userApps = getUserApps(params.member);
                let notPermitted = false;

                for (var i = 0; i < props.apps.length; i++) {
                    if (userApps.indexOf(props.apps[i]) === -1) {
                        notPermitted = true;
                    }
                }

                if (notPermitted && !params.member.global_admin) {
                    return common.returnMessage(params, 401, 'User does not have right to access this information');
                }
                common.db.collection('reports').findOne(recordUpdateOrDeleteQuery(params, id), function(err_update, report) {
                    if (err_update) {
                        console.log(err_update);
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
                        else {
                            if (params && params.res) {
                                var html = res.message;
                                if (result.report_type !== "core") {
                                    html = ejs.render(res.message.template, res.message.data);
                                }

                                common.returnRaw(params, 200, html, {'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*'});
                            }
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
                    bulk.find({ _id: common.db.ObjectID(id) }).updateOne({ $set: { enabled: statusList[id] } });
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
