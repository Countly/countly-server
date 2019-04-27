var common = require('../../../api/utils/common.js'),
    reports = require("./reports"),
    time = require('time'),
    async = require('async'),
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/master", function() {
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('reports:send').replace().schedule("every 1 hour starting on the 0 min");
        }, 10000);
    });

    plugins.register("/o/reports", function(ob) {
        let paramsInstance = ob.params;
        var validate = ob.validateUserForDataReadAPI;
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
            validate(paramsInstance, function(params) {
                common.db.collection('reports').find({user: common.db.ObjectID(params.member._id)}).toArray(function(err, result) {
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
        case 'email':
            validate(paramsInstance, function(params) {
                common.db.collection('members').find({}).toArray(function(err, result) {
                    const data = [];
                    result.forEach((member) => {
                        data.push({name: member.full_name, email: member.email});
                    });
                    common.returnOutput(params, data);
                });
            });
            break;
        default:
            common.returnMessage(paramsInstance, 400, 'Invalid path');
            break;
        }
        return true;
    });

    plugins.register("/i/reports", function(ob) {
        var paramsInstance = ob.params;
        var validate = ob.validateUserForWriteAPI;
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
        case 'create':
            validate(function(params) {
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

                var reportType = props.report_type || "core";
                var validationFn = validateCoreUser;
                if (reportType !== "core") {
                    validationFn = validateNonCoreUser;
                }

                validationFn(params, props, function(err, authorized) {
                    if (err || !authorized) {
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
            }, paramsInstance);
            break;
        case 'update':
            validate(function(params) {
                var props = {};

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

                var reportType = props.report_type || "core";
                var validationFn = validateCoreUser;
                if (reportType !== "core") {
                    validationFn = validateNonCoreUser;
                }

                validationFn(params, props, function(err, authorized) {
                    if (err || !authorized) {
                        return common.returnMessage(params, 401, 'User does not have right to access this information');
                    }

                    common.db.collection('reports').findOne({_id: common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, function(err_update, report) {
                        if (err_update) {
                            console.log(err_update);
                        }
                        common.db.collection('reports').update({_id: common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, {$set: props}, function(err_update2) {
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
            }, paramsInstance);
            break;
        case 'delete':
            validate(function(params) {
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne({'_id': common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, function(err, props) {
                    common.db.collection('reports').remove({'_id': common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, {safe: true}, function(err_del) {
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
            }, paramsInstance);
            break;
        case 'send':
            validate(function(params) {
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne({_id: common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 200, 'Report not found');
                        return false;
                    }

                    var reportType = result.report_type || "core";
                    var validationFn = validateCoreUser;
                    if (reportType !== "core") {
                        validationFn = validateNonCoreUser;
                    }
                    validationFn(params, result, function(err1, authorized) {
                        if (err1 || !authorized) {
                            return common.returnMessage(params, 401, 'User does not have right to access this information');
                        }

                        reports.sendReport(common.db, id, function(err2) {
                            if (err2) {
                                common.returnMessage(params, 200, err2);
                            }
                            else {
                                common.returnMessage(params, 200, "Success");
                            }
                        });
                    });
                });
            }, paramsInstance);
            break;
        case 'preview':
            validate(function(params) {
                var argProps = {
                        '_id': { 'required': true, 'type': 'String'}
                    },
                    id = '';

                if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                    common.returnMessage(params, 200, 'Not enough args');
                    return false;
                }
                common.db.collection('reports').findOne({_id: common.db.ObjectID(id), user: common.db.ObjectID(params.member._id)}, function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 200, 'Report not found');
                        return false;
                    }
                    var reportType = result.report_type || "core";
                    var validationFn = validateCoreUser;
                    if (reportType !== "core") {
                        validationFn = validateNonCoreUser;
                    }
                    validationFn(params, result, function(err1, authorized) {
                        if (err1 || !authorized) {
                            return common.returnMessage(params, 401, 'User does not have right to access this information');
                        }

                        reports.getReport(common.db, result, function(err2, res) {
                            if (err2) {
                                common.returnMessage(params, 200, err2);
                            }
                            else {
                                if (params && params.res) {
                                    common.returnRaw(params, 200, res.message, {'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*'});
                                }
                            }
                        });
                    });
                });
            }, paramsInstance);
            break;
        case 'status':
            validate(function(params) {
                const statusList = params.qstring.args;

                common.db.onOpened(function() {
                    var bulk = common.db._native.collection("reports").initializeUnorderedBulkOp();
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
            }, paramsInstance);
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

    plugins.register("/i/users/delete", function(ob) {
        common.db.collection("reports").remove({user: common.db.ObjectID(ob.data._id)}, { multi: true }, function() {});
    });

    /**
     * convert to app timezone
     * @param {object} props - props contains date info 
     */
    function convertToTimezone(props) {
        //convert time
        var date = new time.Date();
        var serverOffset = date.getTimezoneOffset();
        date.setTimezone(props.timezone);
        var clientOffset = date.getTimezoneOffset();
        var diff = serverOffset - clientOffset;
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
     */
    function validateCoreUser(params, props, cb) {

        var apps = props.apps;
        var isAppUser = apps.every(function(app) {
            return params.member.user_of && params.member.user_of.indexOf(app) > -1;
        });

        if (!params.member.global_admin && !isAppUser) {
            return cb(null, false);
        }
        else {
            return cb(null, true);
        }

    }

    /**
     * validation function for verifing user have permission to access infomation or not for not core type of report
     * @param {object} params - request params object
     * @param {object} props  - report related props
     * @param {func} cb - callback function
     */
    function validateNonCoreUser(params, props, cb) {
        plugins.dispatch("/report/authorize", { params: params, report: props }, function() {
            var authorized = props.authorized || false;
            cb(null, authorized);
        });
    }
}());