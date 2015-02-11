var plugins = require('./plugins.json'),
	countlyConfig = require('../frontend/express/config'),
	path = require("path"),
	sys = require('sys'),
	npm = require("npm"),
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
				plugin.init(app, countlyDb);
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
		var ret = "";
		try{
			var dir = path.resolve(__dirname, '');
			var child = cp.fork(dir+"/"+plugin+"/install.js");
			child.on('error', function(err){
				console.log(plugins + " install errored: " + err);
				var cmd = "cd "+dir+"/"+plugin+"; npm install";
				var child = exec(cmd, function (error, stdout, stderr) {
					if(stdout)
						ret += stdout+"\n";
						//console.log('stdout: ' + stdout);
					if(stderr)
						ret += stderr+"\n";
						//console.log('stderr: ' + stderr);
					if (error)
						ret += error+"\n";					
						//console.log('exec error: ' + error);
					
					if(callback)
						callback(ret);
				});
			}); 
			child.on('exit', function(code){
				console.log(plugins + " installed with code " + code);
				var cmd = "cd "+dir+"/"+plugin+"; npm install";
				var child = exec(cmd, function (error, stdout, stderr) {
					if(stdout)
						ret += stdout+"\n";
						//console.log('stdout: ' + stdout);
					if(stderr)
						ret += stderr+"\n";
						//console.log('stderr: ' + stderr);
					if (error)
						ret += error+"\n";					
						//console.log('exec error: ' + error);
					
					if(callback)
						callback(ret);
				});
			}); 
		}
		catch(ex){
			console.log(ex);
			if(callback)
				callback(ret);
		}
	}
	
	this.uninstallPlugin = function(plugin, callback){
		var ret = "";
		try{
			var dir = path.resolve(__dirname, '');
			var child = cp.fork(dir+"/"+plugin+"/uninstall.js");
			child.on('error', function(err){
				console.log(plugins + " uninstall errored: " + err);
				if(callback)
					callback(ret);
			}); 
			child.on('exit', function(code){
				console.log(plugins + " uninstalled with code " + code);
				if(callback)
					callback(ret);
			}); 
		}
		catch(ex){
			console.log(ex);
			if(callback)
				callback(ret);
		}
	}
	
	this.prepareProduction = function(callback){
		var ret = "";
		var cnt = 0;
		
		var dir = path.resolve(__dirname, '');
		var js = '',
			css = '';
			img = '';
		js += 'java -jar '+dir+'/../bin/scripts/closure-compiler.jar \\\n';
		css += 'cat '+dir+'/../frontend/express/public/stylesheets/main.css';
		img += 'cp -r';
		for(var i = 0, l = plugins.length; i < l; i++){
			js += '--js='+dir+'/'+plugins[i]+'/frontend/public/javascripts/countly.models.js \\\n';
			js += '--js='+dir+'/'+plugins[i]+'/frontend/public/javascripts/countly.views.js \\\n';
			css += ' '+dir+'/'+plugins[i]+'/frontend/public/stylesheets/main.css';
			img += ' '+dir+'/'+plugins[i]+'/frontend/public/images/'+plugins[i];
		}
		js += '--js_output_file='+dir+'/../frontend/express/public/javascripts/min/countly.plugins.js';
		css += ' > '+dir+'/../frontend/express/public/stylesheets/main.min.css';
		img += ' '+dir+'/../frontend/express/public/images/ 2>/dev/null';
		
		// http://nodejs.org/api.html#_child_processes
		var sys = require('sys')
		var exec = require('child_process').exec;
		
		// executes `js`
		var child = exec(js, function(error, stdout, stderr){
			if(stdout)
				ret += stdout+"\n";
			if(stderr)
				ret += stderr+"\n";
			if (error)
				ret += error+"\n";
			//executes css
			var child = exec(css, function(error, stdout, stderr){
				if(stdout)
					ret += stdout+"\n";
				if(stderr)
					ret += stderr+"\n";
				if (error)
					ret += error+"\n";
				//executes img copy
				var child = exec(img, function(error, stdout, stderr){
					if(stdout)
						ret += stdout+"\n";
					if(stderr)
						ret += stderr+"\n";
					if (error && error != "Error: Command failed: ")
						ret += error+"\n";
					//executes img copy
					if(callback)
						callback(ret);
				});
			});
		});
		// executes `img`
		//var child = exec(img, handler)
	}
	
	this.restartCountly = function(){
		var child = exec("restart countly-supervisor", function (error, stdout, stderr) {
			if(stdout)
				console.log('stdout: ' + stdout);
		});
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