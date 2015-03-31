var plugins = require('./plugins.json'),
	countlyConfig = require('../frontend/express/config'),
	path = require("path"),
	cp = require('child_process'),
	exec = cp.exec;
	
var pluginManager = function pluginManager(){
	var events = {};
	var plugs = [];

	this.init = function(){
		for(var i = 0, l = plugins.length; i < l; i++){
			try{
				require("./"+plugins[i]+"/api/api");
			} catch (ex) {
				console.error(ex);
			}
		}
	}
	
	this.register = function(event, callback){
		if(!events[event])
			events[event] = [];
		events[event].push(callback);
	} 
	
	this.dispatch = function(event, params){
		var used = false;
		if(events[event]){
			try{
				for(var i = 0, l = events[event].length; i < l; i++){
					if(events[event][i].call(null, params))
						used = true;
				}
			} catch (ex) {
				console.error(ex);
			}
		}
		return used;
	}
	
	this.loadAppPlugins = function(app, countlyDb, express){
		for(var i = 0, l = plugins.length; i < l; i++){
			try{
				app.use(countlyConfig.path+'/'+plugins[i], express.static(__dirname + '/'+plugins[i]+"/frontend/public"));
				var plugin = require("./"+plugins[i]+"/frontend/app");
				plugin.init(app, countlyDb, express);
				plugs.push(plugin);
			} catch (ex) {
				console.error(ex);
			}
		}
	}
	
	this.getPlugins = function(){
		return plugins;
	}
	
	this.reloadPlugins = function(){
		delete require.cache[require.resolve('./plugins.json')];
		plugins = require('./plugins.json');
	}
	
	this.installPlugin = function(plugin, callback){
		console.log('Installing plugin %j...', plugin);
		var ret = "";
		try{
			var dir = path.resolve(__dirname, '');
			var child = cp.fork(dir+"/"+plugin+"/install.js");
			var errors;
			var handler = function (error, stdout) {
				if (error){
					errors = true;					
					console.log('error: %j', error);
				}
				
				if(callback)
					callback(errors);
				console.log('Done installing plugin %j', plugin);
			};
			child.on('error', function(err){
				console.log(plugin + " install errored: " + err);
				var cmd = "cd "+dir+"/"+plugin+"; npm install";
				var child = exec(cmd, handler);
			}); 
			child.on('exit', function(code){
				var cmd = "cd "+dir+"/"+plugin+"; npm install";
				var child = exec(cmd, handler);
			}); 
		}
		catch(ex){
			console.log(ex);
			errors = true;
			if(callback)
				callback(errors);
		}
	}
	
	this.uninstallPlugin = function(plugin, callback){
		console.log('Uninstalling plugin %j...', plugin);
		var ret = "";
		try{
			var dir = path.resolve(__dirname, '');
			var child = cp.fork(dir+"/"+plugin+"/uninstall.js");
			var errors;
			var handler = function (error, stdout) {
				if (error){
					errors = true;					
					console.log('error: %j', error);
				}
				
				if(callback)
					callback(errors);
			
				console.log('Done uninstalling plugin %j', plugin);
			};
			child.on('error', handler); 
			child.on('exit', handler); 
		}
		catch(ex){
			console.log(ex);
			errors = true;
			if(callback)
				callback(errors);
		}
	}
	
	this.prepareProduction = function(callback) {
		console.log('Preparing production files');
		exec('grunt plugins locales', {cwd: path.join(__dirname, '..')}, function(error, stdout) {
			console.log('Done preparing production files with %j / %j', error, stdout);
			var errors;
			if (error && error != 'Error: Command failed: ') {
				errors = true;					
				console.log('error: %j', error);
			}
			if (callback) {
				callback(errors);
			}
		});
	};
	
	this.restartCountly = function(){
		console.log('Restarting Countly ...');
		if (process.env.INSIDE_DOCKER) {
			console.log('Restarting runit services ...');
			exec("sudo /usr/bin/sv restart countly-api countly-dashboard", function (error, stdout, stderr) {
				console.log('Done restarting runit services with %j / %j / %j', error, stderr, stdout);
				if(error)
					console.log('error: %j', error);
				if(stderr)
					console.log('stderr: %j', stderr);
			});
		} else {
			console.log('Restarting countly-supervisor ...');
			exec("sudo restart countly-supervisor", function (error, stdout, stderr) {
				console.log('Done restarting countly-supervisor with %j / %j / %j', error, stderr, stdout);
				if(error)
					console.log('error: %j', error);
				if(stderr)
					console.log('stderr: %j', stderr);
			});
		}
	}
}
/* ************************************************************************
SINGLETON CLASS DEFINITION
************************************************************************ */
pluginManager.instance = null;
 
/**
 * Singleton getInstance definition
 * @return pluginManager class
 */
pluginManager.getInstance = function(){
    if(this.instance === null){
        this.instance = new pluginManager();
    }
    return this.instance;
}
 
module.exports = pluginManager.getInstance();