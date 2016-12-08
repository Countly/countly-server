var plugin = {},
    fs = require('fs'),
    path = require("path"),
    async = require('async'),
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
    var logs = {api: "../../../log/countly-api.log", dashboard: "../../../log/countly-dashboard.log"};
    var dir = path.resolve(__dirname, '');
	//write api call
	plugins.register("/o/errorlogs", function(ob){
		//get parameters
        var params = ob.params; //request params
        var validate = ob.validateUserForGlobalAdmin; //user validation
        var paths = ob.paths;
        
        validate(params, function (params) {
            if(params.qstring.log && logs[params.qstring.log]){
                if(params.qstring.download){
                    fs.readFile(dir+"/"+logs[params.qstring.log], 'utf8', function (err,data) {
                        if (err)
                            data = "";
                        params.res.writeHead(200, {'Content-Type': 'plain/text; charset=utf-8', 'Content-disposition':'attachment; filename=countly-'+params.qstring.log+'.log'});
                        params.res.write(data);
                        params.res.end();
                    });
                }
                else{
                    fs.readFile(dir+"/"+logs[params.qstring.log], 'utf8', function (err,data) {
                        if (err)
                            data = "";
                        common.returnOutput(params, data);
                    });
                }
            }
            else{
                function readLog(key, done){
                    fs.readFile(dir+"/"+logs[key], 'utf8', function (err,data) {
                        if (err)
                            data = "";
                        done(null, {key:key, val:data});
                    });
                };
                async.map(Object.keys(logs), readLog, function(err, results) {
                    var ret = {};
                    for(var i = 0; i < results.length; i++){
                        ret[results[i].key] = results[i].val;
                    }
                    common.returnOutput(params, ret);
                });
            }
        });
        return true;
	});
    
    plugins.register("/i/errorlogs", function(ob){
		//get parameters
        var params = ob.params; //request params
        var validate = ob.validateUserForGlobalAdmin; //user validation
        
        validate(params, function (params) {
            if(params.qstring.log && logs[params.qstring.log]){
                plugins.dispatch("/systemlogs", {params:params, action:"errologs_clear", data:{log:params.qstring.log}});
                fs.truncate(dir+"/"+logs[params.qstring.log], 0, function(err){
                    if(err)
                        common.returnMessage(params, 200, err);
                    else
                        common.returnMessage(params, 200, 'Success');
                });
            }
        });
        return true;
	});
}(plugin));

module.exports = plugin;