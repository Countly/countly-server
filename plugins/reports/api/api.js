var plugin = {},
	common = require('../../../api/utils/common.js'),
    path = require("path"),
    cron = require("crontab"),
    reports = require("./reports"),
    plugins = require('../../pluginManager.js');
    
var dir = path.resolve(__dirname, '');
var crontab;
cron.load(function(err, tab){
    crontab = tab;
})

(function (plugin) {
	plugins.register("/o/reports", function(ob){
		var params = ob.params;
		var validate = ob.validateUserForGlobalAdmin;
		var paths = ob.paths;
		if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse ' + apiPath + ' JSON failed');
            }
        }

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
		switch (paths[3]) {
            case 'all':
                validate(params, function (params) {
					common.db.collection('reports').find({}).toArray(function(err, result){
                        common.returnOutput(params, result);
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
		var validate = ob.validateUserForGlobalAdmin;
		var paths = ob.paths;
		if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                console.log('Parse ' + apiPath + ' JSON failed');
            }
        }

        if (!params.qstring.api_key) {
            common.returnMessage(params, 400, 'Missing parameter "api_key"');
            return false;
        }
		switch (paths[3]) {
            case 'create':
                validate(params, function (params) {
                    if(crontab){
                        var argProps = {
                                'frequency':{ 'required': true, 'type': 'String'},
                                'apps':     { 'required': true, 'type': 'Array'},
                                'hour':     { 'required': false, 'type': 'String' },
                                'minute':   { 'required': false, 'type': 'String' },
                                'day':      { 'required': false, 'type': 'String' },
                                'emails':   { 'required': true, 'type': 'Array' },
                                'metrics':	{ 'required': true, 'type': 'Object' }
                            },
                            props = {};
    
                        if (!(props = common.validateArgs(params.qstring.args, argProps))) {
                            common.returnMessage(params, 200, 'Not enough args');
                            return false;
                        }
                        props.frequency = (props.frequency != "daily") ? "weekly" : "daily";
                        props.minute = (props.minute) ? parseInt(props.minute) : 0;
                        props.hour = (props.hour) ? parseInt(props.hour) : 0;
                        props.day = (props.day) ? parseInt(props.day) : 0;
                        common.db.collection('reports').insert(props, function(err, result) {
                            if(err){
                                err = err.err;
                                common.returnMessage(params, 200, err);
                            }
                            else{
                                var id = result[0]._id;
                                createCronjob(id, props);
                                saveCronjob(function(err, crontab) {
                                    if(err){
                                        common.returnMessage(params, 200, err);
                                    }
                                    else{
                                        common.returnMessage(params, 200, "Success");
                                    }
                                });
                            }
                        });
                    }
                    else{
                        common.returnMessage(params, 200, "Try again later");
                    }
				});
                break;
            case 'update':
                validate(params, function (params) {
                    if(crontab){
                        var argProps = {
                                '_id':      { 'required': true, 'type': 'String'},
                                'frequency':{ 'required': false, 'type': 'String'},
                                'apps':     { 'required': false, 'type': 'Array'},
                                'hour':     { 'required': false, 'type': 'String' },
                                'minute':   { 'required': false, 'type': 'String' },
                                'day':      { 'required': false, 'type': 'String' },
                                'emails':   { 'required': false, 'type': 'Array' },
                                'metrics':	{ 'required': false, 'type': 'Object' }
                            },
                            props = {};
    
                        if (!(props = common.validateArgs(params.qstring.args, argProps))) {
                            common.returnMessage(params, 200, 'Not enough args');
                            return false;
                        }
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
                        common.db.collection('reports').update({_id:common.db.ObjectID(id)}, {$set:props}, function(err, app) {
                            if(err){
                                err = err.err;
                                common.returnMessage(params, 200, err);
                            }
                            else{
                                deleteCronjob(id);
                                createCronjob(id, props);
                                saveCronjob(function(err, crontab) {
                                    if(err){
                                        common.returnMessage(params, 200, err);
                                    }
                                    else{
                                        common.returnMessage(params, 200, "Success");
                                    }
                                });
                            }
                        });
                    }
                    else{
                        common.returnMessage(params, 200, "Try again later");
                    }
				});
                break;
			case 'delete':
                validate(params, function (params) {
                    if(crontab){
                        var argProps = {
                                '_id': { 'required': true, 'type': 'String'}
                            },
                            id = '';
                
                        if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                            common.returnMessage(params, 200, 'Not enough args');
                            return false;
                        }
                        common.db.collection('reports').remove({'_id': common.db.ObjectID(id)}, {safe: true}, function(err, result) {
                            if (err) {
                                common.returnMessage(params, 200, 'Error deleting report');
                                return false;
                            }
                            deleteCronjob(id);
                            saveCronjob(function(err, crontab) {
                                if(err){
                                    common.returnMessage(params, 200, err);
                                }
                                else{
                                    common.returnMessage(params, 200, "Success");
                                }
                            });
                        });
                    }
                    else{
                        common.returnMessage(params, 200, "Try again later");
                    }
				});
                break;
            case 'send':
                validate(params, function (params) {
                    var argProps = {
                            '_id': { 'required': true, 'type': 'String'}
                        },
                        id = '';
                
                    if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                        common.returnMessage(params, 200, 'Not enough args');
                        return false;
                    }
                    reports.sendReport(common.db, id, function(err, res){
                        if(err){
                            common.returnMessage(params, 200, err);
                        }
                        else{
                            common.returnMessage(params, 200, "Success");
                        }
                    });
				});
                break;
            case 'preview':
                validate(params, function (params) {
                    var argProps = {
                            '_id': { 'required': true, 'type': 'String'}
                        },
                        id = '';
                
                    if (!(id = common.validateArgs(params.qstring.args, argProps)._id)) {
                        common.returnMessage(params, 200, 'Not enough args');
                        return false;
                    }
                    reports.getReport(common.db, id, function(err, res){
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
				});
                break;
            default:
                common.returnMessage(params, 400, 'Invalid path');
                break;
        }
		return true;
	});
    
    function createCronjob(id, props){
        var job = crontab.create('nodejs '+dir+'/process_reports.js '+id);
        job.comment(id);
        job.minute().at(props.minute);
        job.hour().at(props.hour);
        if(props.frequency == "weekly"){
            job.dow().at(props.day);
        }
    }
    
    function saveCronjob(callback){
        crontab.save(callback);
    }
    
    function deleteCronjob(id){
        crontab.remove({command:'nodejs '+dir+'/process_reports.js '+id, comment:id});
    }
}(plugin));

module.exports = plugin;