var plugin = {},
	countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
    versionInfo = require('../../../frontend/express/version.info');
    
var config;
try{
    config = require("../config.js");
}
catch(err) {}

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.get(countlyConfig.path+'/crash/*', function(req, res) {
            var parts = req.url.split("/");
			var code = parts[parts.length-1];
            countlyDb.collection('crash_share').findOne({_id:code},function(err, crash) {
                if(crash){
                    countlyDb.collection('app_users' + crash.app_id).count({},function(err, total) {
                        countlyDb.collection('app_crashgroups' + crash.app_id).findOne({_id:crash.crash_id}, function(err, result){
                            if(result){
                                result.total = total-1;
                                if(!result.share)
                                    result.share = {};
                                
                                if(!result.share.loss)
                                    delete result.loss;
                                
                                if(!result.share.users)
                                    delete result.users;
                                
                                if(result.share.reports){
                                    var cursor = countlyDb.collection('app_crashes' + crash.app_id).find({group:result._id}).sort( { $natural: -1 } );
                                    if(config && config.report_limit)
                                        cursor.limit(config.report_limit);
                                    else
                                        cursor.limit(100);
                                    cursor.toArray(function(err, data){
                                        result.data = data;
                                        res.render('../../../plugins/crashes/frontend/public/templates/crash', {path:countlyConfig.path || "", cdn:countlyConfig.cdn || "../../", countlyVersion:versionInfo.version, data:result});
                                    });
                                }
                                else{
                                    res.render('../../../plugins/crashes/frontend/public/templates/crash', {path:countlyConfig.path || "", cdn:countlyConfig.cdn || "../../", countlyVersion:versionInfo.version, data:result});
                                }
                            }
                            else{
                                res.status(404);
                                res.type('txt').send('Not found');
                            }
                        });
                    });
                }
                else{
                    res.status(404);
                    res.type('txt').send('Not found');
                }
            });
		});
	};
}(plugin));

module.exports = plugin;