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
					var dir = path.resolve(__dirname, '../../plugins.json');
					var pluginList = plugins.getPlugins(), newPluginsList = pluginList.slice();

					var transforms = Object.keys(params.qstring.plugin).map(function(plugin){
						var state = params.qstring.plugin[plugin],
							index = pluginList.indexOf(plugin);
						if (index !== -1 && !state) {
							newPluginsList.splice(newPluginsList.indexOf(plugin), 1);
							return plugins.uninstallPlugin.bind(plugins, plugin);
						} else if (index === -1 && state) {
							newPluginsList.push(plugin);
							return plugins.installPlugin.bind(plugins, plugin);
						} else {
							return function(clb){ clb(); };
						}
					});

					async.parallel(transforms, function(error){
						if (error) {
							common.returnOutput(params, 'Errors');
						} else {
							async.series([fs.writeFile.bind(fs, dir, JSON.stringify(newPluginsList), 'utf8'), plugins.prepareProduction.bind(plugins)], function(error){
								plugins.reloadPlugins();
								common.returnOutput(params, error ? 'Errors' : 'Success');
								setTimeout(plugins.restartCountly.bind(plugins), 500);
							});
						}
					});
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
			var dir = path.resolve(__dirname, "../../");
			walk(dir, function(err, results) {
				if (err) console.error(err);
				common.returnOutput(params, results || {});
			});
		}, params);
		return true;
	});
}(plugin));

module.exports = plugin;