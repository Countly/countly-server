var plugin = {},
	fs = require('fs'),
	path = require("path"),
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	plugins.register("/i/plugins", function(ob){
		var params = ob.params;
		var validateUserForWriteAPI = ob.validateUserForWriteAPI;
		validateUserForWriteAPI(function(){
			if (!params.member.global_admin) {
				common.returnMessage(params, 401, 'User is not a global administrator');
				return false;
			}
			if(typeof params.qstring.plugin !== 'undefined' && typeof params.qstring.state !== 'undefined' && params.qstring.plugin != "plugins"){
				var dir = path.resolve(__dirname, "../../plugins.json");
				var pluginList = plugins.getPlugins();
				var index = pluginList.indexOf(params.qstring.plugin);
				var ret = "";
				var cnt = 0;
				function handler(add){
					ret += add;
					cnt++;
					if(cnt == 2){
						common.returnOutput(params, ret);
						plugins.restartCountly();
					}
				}
				if (index > -1 && params.qstring.state+"" == 'false') {
					pluginList.splice(index, 1);
					fs.writeFile(dir, JSON.stringify( pluginList ), "utf8", function(){
						plugins.reloadPlugins();
						plugins.uninstallPlugin(params.qstring.plugin, handler);
						plugins.prepareProduction(handler);
					});
				}
				else if (index == -1 && params.qstring.state+"" == "true") {
					pluginList.push(params.qstring.plugin);
					fs.writeFile(dir, JSON.stringify( pluginList ), "utf8", function(){
						plugins.reloadPlugins();
						plugins.installPlugin(params.qstring.plugin, handler);
						plugins.prepareProduction(handler);
					});
				}
				else{
					common.returnOutput(params, "No need to install plugin");
				}
			}
			else
				common.returnOutput(params, "Not enough parameters");
		}, params);
		return true;
	});
	plugins.register("/o/plugins", function(ob){
		var params = ob.params;
		var pluginList = plugins.getPlugins();
		var walk = function(dir, done) {
			var results = [];
			fs.readdir(dir, function(err, list) {
				if (err) return done(err);
				var pending = list.length;
				if (!pending) return done(null, results);
				list.forEach(function(file) {
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