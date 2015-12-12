var plugin = {},
	fs = require('fs'),
	path = require('path'),
	common = require('../../../api/utils/common.js'),
	async = require('async'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	plugins.register('/i/plugins', function(ob){
		var params = ob.params;
		var validateUserForWriteAPI = ob.validateUserForWriteAPI;
		validateUserForWriteAPI(function(){
			if (!params.member.global_admin) {
				common.returnMessage(params, 401, 'User is not a global administrator');
				return false;
			}
			if (typeof params.qstring.plugin !== 'undefined' && params.qstring.plugin != 'plugins'){
				try {
					params.qstring.plugin = JSON.parse(params.qstring.plugin);
				}
				catch(err){
					console.log('Error parsing plugins');
				}
				
				if (params.qstring.plugin && typeof params.qstring.plugin === 'object') {
                    plugins.syncPlugins(params.qstring.plugin, function(err){
                        if(err)
                            common.returnOutput(params, 'Errors');
                        else{
                            common.returnOutput(params, 'Success');
                        }
                    }, common.db);
				}
			} else {
				common.returnOutput(params, 'Not enough parameters');
			}
		}, params);
		return true;
	});
	plugins.register("/o/plugins", function(ob){
		var params = ob.params;
		var pluginList = plugins.getPlugins();
		var ignore = {"empty":true, "plugins":true};
		var walk = function(dir, done) {
			var results = [];
			fs.readdir(dir, function(err, list) {
				if (err) return done(err);
				var pending = list.length;
				if (!pending) return done(null, results);
				list.forEach(function(file) {
					if(!ignore[file]){
						var fullpath = dir + '/' + file;
						fs.stat(fullpath, function(err, stat) {
							if (stat && stat.isDirectory()) {
								var data
								try{
									data = require(fullpath+'/package.json');
								} catch(ex){}
								var ob = {};
								if (data){
									ob.title = data.title || file;
									ob.name = data.name || file;
									ob.description = data.description || file;
									ob.version = data.version || "unknown";
									ob.author = data.author || "unknown";
									ob.homepage = data.homepage || "";
								}
								else
									ob = {name:file, title:file, description:file, version:"unknown", author:"unknown", homepage:""};
								if(pluginList.indexOf(file) > -1)
									ob.enabled = true;
								else
									ob.enabled = false;
								ob.code = file;
								results.push(ob);
								if (!--pending) done(null, results);
							}
							else{
								if (!--pending) done(null, results);
							}
						});
					}
					else
						if (!--pending) done(null, results);
				});
			});
		};
		var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
		validateUserForMgmtReadAPI(function(){
            if (!params.member.global_admin) {
				common.returnMessage(params, 401, 'User is not a global administrator');
				return false;
			}
			var dir = path.resolve(__dirname, "../../");
			walk(dir, function(err, results) {
				if (err) console.error(err);
				common.returnOutput(params, results || {});
			});
		}, params);
		return true;
	});
    
    plugins.register("/i/configs", function(ob){
		var params = ob.params;
        var validateUserForWriteAPI = ob.validateUserForWriteAPI;
		validateUserForWriteAPI(function(){
			if (!params.member.global_admin) {
				common.returnMessage(params, 401, 'User is not a global administrator');
				return false;
			}
            var data = {}
            if(params.qstring.configs){
                try{
                    data = JSON.parse(params.qstring.configs);
                }
                catch(err){
                    console.log("Error parsing configs", params.qstring.configs);
                }
            }
            if(Object.keys(data).length > 0){
                plugins.updateAllConfigs(common.db, data, function(){
                    plugins.loadConfigs(common.db, function(){
                        common.returnOutput(params, plugins.getAllConfigs());
                    });
                });
            }
            else{
                common.returnMessage(params, 400, 'Error updating configs');
            }
        }, params);
        return true;
    });
    
    plugins.register("/o/configs", function(ob){
		var params = ob.params;
        var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
		validateUserForMgmtReadAPI(function(){
			if (!params.member.global_admin) {
				common.returnMessage(params, 401, 'User is not a global administrator');
				return false;
			}
            var confs = plugins.getAllConfigs();
            delete confs.services;
            common.returnOutput(params, confs);
        }, params);
        return true;
    });
    
    plugins.register("/o/themes", function(ob){
		var params = ob.params;
        var themeDir = path.resolve(__dirname, "../../../frontend/express/public/themes/");
        fs.readdir(themeDir, function(err, list) {
            if(!Array.isArray(list))
                list = [];
            list.unshift("");
            var index = list.indexOf(".gitignore");
            if (index > -1) {
                list.splice(index, 1);
            }
            common.returnOutput(params, list);
        });
        return true;
    });
}(plugin));

module.exports = plugin;