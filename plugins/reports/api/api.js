var plugin = {},
	common = require('../../../api/utils/common.js'),
    path = require("path"),
    reports = require("./reports"),
    time = require('time'),
    plugins = require('../../pluginManager.js');
    
var dir = path.resolve(__dirname, '');
var logpath = path.resolve(__dirname, '../../../log/countly-api.log');
(function (plugin) {
    plugins.register("/master", function(ob){
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('reports:send').replace().schedule("every 1 hour starting on the 0 min");
        }, 10000);
    });
    
	plugins.register("/o/reports", function(ob){
		var params = ob.params;
		var validate = ob.validateUserForDataReadAPI;
		var paths = ob.paths;
		if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
		switch (paths[3]) {
            case 'all':
                validate(params, function (params) {
					common.db.collection('reports').find({user:common.db.ObjectID(params.member._id)}).toArray(function(err, result){
                        common.returnOutput(params, result);
                    });
				});
                break;
            case 'email':
                validate(params, function (params) {
                    common.db.collection('members').find({}).toArray(function(err, result){
                        const data = [];
                        result.forEach((member) => {
                            data.push({name: member.full_name, email: member.email});
                        })
                        common.returnOutput(params, data);
                    });
                });
                break;
            default:
                common.returnMessage(params, 400, 'Invalid path');
                break;
        }
		return true;
	});
    
	plugins.register("/i/reports", function(ob){
		var params = ob.params;
		var validate = ob.validateUserForWriteAPI;
		var paths = ob.paths;
		if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
		switch (paths[3]) {
            case 'create':
                validate(function (params) {
                    var argProps = {
                            'frequency':{ 'required': false, 'type': 'String'},
                            'apps':     { 'required': true, 'type': 'Array'},
                            'hour':     { 'required': false, 'type': 'String' },
                            'minute':   { 'required': false, 'type': 'String' },
                            'timezone': { 'required': false, 'type': 'String' },
                            'day':      { 'required': false, 'type': 'String' },
                            'emails':   { 'required': true, 'type': 'Array' },
                            'metrics':	{ 'required': true, 'type': 'Object' }
                        },
                        props = {};
                    props = params.qstring.args;
                    props.frequency = (props.frequency != "weekly") ? "daily" : "weekly";
                    props.minute = (props.minute) ? parseInt(props.minute) : 0;
                    props.hour = (props.hour) ? parseInt(props.hour) : 0;
                    props.day = (props.day) ? parseInt(props.day) : 0;
                    props.timezone = props.timezone || "Etc/GMT";
                    props.user = params.member._id;
                    
                    
                    convertToTimezone(props);
                    
                    if (validateUserApp(params, props.apps)) {
                        common.db.collection('reports').insert(props, function(err, result) {
                            result = result.ops;
                            if(err){
                                err = err.err;
                                common.returnMessage(params, 200, err);
                            }
                            else{
                                plugins.dispatch("/systemlogs", {params:params, action:"reports_create", data:result[0]});
                                common.returnMessage(params, 200, "Success");
                            }
                        });
                    }
				}, params);
                break;
            case 'update':
                validate(function (params) {
                    var argProps = {
                            '_id':      { 'required': true, 'type': 'String'},
                            'frequency':{ 'required': false, 'type': 'String'},
                            'apps':     { 'required': false, 'type': 'Array'},
                            'hour':     { 'required': false, 'type': 'String' },
                            'minute':   { 'required': false, 'type': 'String' },
                            'timezone': { 'required': false, 'type': 'String' },
                            'day':      { 'required': false, 'type': 'String' },
                            'emails':   { 'required': false, 'type': 'Array' },
                            'metrics':	{ 'required': false, 'type': 'Object' }
                        },
                        props = {};
        
                    props = params.qstring.args;

                    var id = props._id;
                    delete props._id;
                    if(props.frequency != "daily" && props.frequency != "weekly")
                        delete props.frequency;
                    if(props.minute)
                        props.minute = parseInt(props.minute);
                    if(props.hour)
                        props.hour = parseInt(props.hour);
                    if(props.day)
                        props.day = parseInt(props.day);
                    props.timezone = props.timezone || "Etc/GMT";
                    
                    convertToTimezone(props);

                    if (validateUserApp(params, props.apps)) {
                        common.db.collection('reports').findOne({_id:common.db.ObjectID(id),user:common.db.ObjectID(params.member._id)}, function(err, report) {
                            common.db.collection('reports').update({_id:common.db.ObjectID(id),user:common.db.ObjectID(params.member._id)}, {$set:props}, function(err, app) {
                                if(err){
                                    err = err.err;
                                    common.returnMessage(params, 200, err);
                                }
                                else{
                                    plugins.dispatch("/systemlogs", {params:params, action:"reports_edited", data:{_id:id, before:report, update:props}});
                                    common.returnMessage(params, 200, "Success");
                                }
                            });
                        });
                    }
				}, params);
                break;
			case 'delete':
                validate(function (params) {
                    var argProps = {
                            '_id': { 'required': true, 'type': 'String'}
                        },
                        id = '';
                    
                    if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                        common.returnMessage(params, 200, 'Not enough args');
                        return false;
                    }
                    common.db.collection('reports').findOne({'_id': common.db.ObjectID(id),user:common.db.ObjectID(params.member._id)}, function(err, props){
                        common.db.collection('reports').remove({'_id': common.db.ObjectID(id),user:common.db.ObjectID(params.member._id)}, {safe: true}, function(err, result) {
                            if (err) {
                                common.returnMessage(params, 200, 'Error deleting report');
                            }
                            else{
                                if(props)
                                    plugins.dispatch("/systemlogs", {params:params, action:"reports_deleted", data:props});
                                common.returnMessage(params, 200, "Success");
                            }
                        });
                    });
				}, params);
                break;
            case 'send':
                validate(function (params) {
                    var argProps = {
                            '_id': { 'required': true, 'type': 'String'}
                        },
                        id = '';
                
                    if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                        common.returnMessage(params, 200, 'Not enough args');
                        return false;
                    }
                    common.db.collection('reports').findOne({_id:common.db.ObjectID(id), user:common.db.ObjectID(params.member._id)}, function(err, result){
                        if(err || !result){
                            common.returnMessage(params, 200, 'Report not found');
                            return false;
                        }

                        if (validateUserApp(params, result.apps)) {
                            reports.sendReport(common.db, id, function(err, res){
                                if(err){
                                    common.returnMessage(params, 200, err);
                                }
                                else{
                                    common.returnMessage(params, 200, "Success");
                                }
                            });
                        }
                    });
				}, params);
                break;
            case 'preview':
                validate(function (params) {
                    var argProps = {
                            '_id': { 'required': true, 'type': 'String'}
                        },
                        id = '';
                
                    if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                        common.returnMessage(params, 200, 'Not enough args');
                        return false;
                    }
                    common.db.collection('reports').findOne({_id:common.db.ObjectID(id), user:common.db.ObjectID(params.member._id)}, function(err, result){
                        if(err || !result){
                            common.returnMessage(params, 200, 'Report not found');
                            return false;
                        }
                        if (validateUserApp(params, result.apps)) {
                            reports.getReport(common.db, result, function(err, res){
                                if(err){
                                    common.returnMessage(params, 200, err);
                                }
                                else{
                                    if (params && params.res) {
                                        params.res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin':'*'});
                                        params.res.write(res.message);
                                        params.res.end();
                                    }
                                }
                            });
                        }
                    });
				}, params);
                break;
            case 'status': 
                validate(function (params) {
                    const statusList = params.qstring.args;
                    const batch = [];
                    for (const id in statusList) {
                        batch.push(
                            common.db.collection("reports").findAndModify(
                                { _id: common.db.ObjectID(id) },
                                {},
                                { $set: { enabled: statusList[id] } },
                                { new: false, upsert: false }
                            )
                        );
                    }
                    Promise.all(batch).then(function (result) {
                        common.returnMessage(params, 200, "Success");
                    }).catch((e)=>{
                        common.returnMessage(params, 200, e);
                    });
                }, params);
                break;
            default:
                common.returnMessage(params, 400, 'Invalid path');
                break;
        }
		return true;
	});
    
    /*plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
        common.db.collection("reports").update({}, {$pull:{apps:appId+""}}, { multi: true }, function(err, res){});
	});*/
    
    plugins.register("/i/users/delete", function(ob){
        common.db.collection("reports").remove({user:common.db.ObjectID(ob.data._id)}, { multi: true }, function(err, res){});
	});
    
    function convertToTimezone(props){
        //convert time
        var date = new time.Date();
        var serverOffset = date.getTimezoneOffset();
        date.setTimezone(props.timezone);
        var clientOffset = date.getTimezoneOffset()
        var diff = serverOffset - clientOffset;
        var day = props.day;
        var hour = props.hour - Math.floor(diff/60);
        var minute = props.minute - diff%60;
        
        if(minute < 0){
            minute = 60 + minute;
            hour--;
        }
        else if(minute > 59){
            minute = minute - 60;
            hour++;
        }
        
        if(hour < 0){
            hour = 24 + hour;
            day--;
        }
        else if(hour > 23){
            hour = hour - 24;
            day++;
        }
        
        if(day < 1){
            day = 7 + day;
        }
        else if(day > 7){
            day = day - 7;
        }
        
        props.r_day = day;
        props.r_hour = hour;
        props.r_minute = minute;
    }
    
     function validateUserApp(params, apps) {

        var isAppUser = apps.every(function (app) {
            return params.member.user_of && params.member.user_of.indexOf(app) > -1
        });

        if (!params.member.global_admin && !isAppUser){
            common.returnMessage(params, 401, 'User does not have right to access this information');
            return false;
        }
        else 
            return true;

    }
}(plugin));

module.exports = plugin;