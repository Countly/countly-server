var plugins = require('./plugins.json', 'dont-enclose'),
    pluginsApis = {}, 
    mongo = require('mongoskin'),
    countlyConfig = require('../frontend/express/config', 'dont-enclose'),
    fs = require('fs'),
    path = require('path'),
    cp = require('child_process'),
    async = require("async"),
    _ = require('underscore'),
    cluster = require('cluster'),
    Promise = require("bluebird"),
    exec = cp.exec;
    
var pluginManager = function pluginManager(){
    var events = {};
    var plugs = [];
    var methodCache = {};
    var configCache = {};
    var configs = {};
    var defaultConfigs = {};
    var configsOnchanges = {};
    var excludeFromUI = {plugins:true};
    var finishedSyncing = true;
    
    this.internalEvents = [];
    this.internalDrillEvents = ["[CLY]_session"];

    this.init = function(){
        for(var i = 0, l = plugins.length; i < l; i++){
            try{
                pluginsApis[plugins[i]] = require("./"+plugins[i]+"/api/api");
            } catch (ex) {
                console.error(ex.stack);
            }
        }
    }
    
    this.loadConfigs = function(db, callback, api){
        var self = this;
        db.collection("plugins").findOne({_id:"plugins"}, function(err, res){
            if(!err){
                res = res || {};
                for (var ns in configsOnchanges) {
                    if (configs && res && (!configs[ns] || !res[ns] || !_.isEqual(configs[ns], res[ns]))) {
                        configs[ns] = res[ns];
                        configsOnchanges[ns](configs[ns]);
                    }
                }
                configs = res;
                delete configs._id;
                self.checkConfigs(db, configs, defaultConfigs, callback);
                if(api && self.getConfig("api").sync_plugins)
                    self.checkPlugins(db);
            }
            else if(callback)
                callback();
        });
    }
    
    this.setConfigs = function(namespace, conf, exclude, onchange){
        if(!defaultConfigs[namespace])
            defaultConfigs[namespace] = conf;
        else{
            for(var i in conf){
                defaultConfigs[i] = conf[i];
            }
        }
        if(exclude)
            excludeFromUI[namespace] = true;
        if(onchange)
            configsOnchanges[namespace] = onchange;
    };
    
    this.setUserConfigs = function(namespace, conf){
        if(!defaultConfigs[namespace])
            defaultConfigs[namespace] = {};
        
        if(!defaultConfigs[namespace]._user){
            defaultConfigs[namespace]._user = {};
        }
        
        for(var i in conf){
            defaultConfigs[namespace]._user[i] = conf[i];
        }
    };
    
    this.getConfig = function(namespace, userSettings){
        var ob = {};
        if(configs[namespace])
            ob = configs[namespace];
        else if(defaultConfigs[namespace])
            ob = defaultConfigs[namespace];
        
        //overwrite server settings by userSettings
        if(userSettings && userSettings[namespace] && ob._user){
            for(var i in ob._user){
                //check if this config is allowed to be overwritten
                if(ob._user[i]){
                    //over write it
                    ob[i] = userSettings[namespace][i];
                }
            }
        }
        return JSON.parse(JSON.stringify(ob));
    };
    
    this.getAllConfigs = function(){
        //get unique namespaces
        var a = Object.keys(configs);
        var b = Object.keys(defaultConfigs);
        var c = a.concat(b.filter(function (item) { return a.indexOf(item) < 0; }));
        var ret = {};
        for(var i = 0; i < c.length; i++){
            if(!excludeFromUI[c[i]])
                ret[c[i]] = this.getConfig(c[i]);
        }
        return ret;
    }
    
    this.getUserConfigs = function(userSettings){
        userSettings = userSettings || {};
        //get unique namespaces
        var a = Object.keys(configs);
        var b = Object.keys(defaultConfigs);
        var c = a.concat(b.filter(function (item) { return a.indexOf(item) < 0; }));
        var ret = {};
        for(var i = 0; i < c.length; i++){
            if(!excludeFromUI[c[i]]){
                var conf = this.getConfig(c[i], userSettings);
                for(var name in conf){
                    if(conf._user && conf._user[name]){
                        if(!ret[c[i]])
                            ret[c[i]] = {};
                        ret[c[i]][name] = conf[name];
                    }
                }
            }
        }
        return ret;
    }
    
    this.checkConfigs = function(db, current, provided, callback){
        var diff = getObjectDiff(current, provided);
        if(Object.keys(diff).length > 0){
            db.collection("plugins").update({_id:"plugins"}, {$set:flattenObject(diff)}, {upsert:true}, function(err, res){
                if(callback)
                    callback();
            });
        }
        else if(callback)
            callback();
    };
    
    this.updateConfigs = function(db, namespace, configs, callback){
        var update = {};
        if(namespace == "_id" || namespace == "plugins" && !this.getConfig("api").sync_plugins){
            if(callback)
                callback();
        }
        else{
            update[namespace] = configs;
            db.collection("plugins").update({_id:"plugins"}, {$set:flattenObject(update)}, {upsert:true}, function(err, res){
                if(callback)
                    callback();
            });
        }
    };
    
    this.updateAllConfigs = function(db, changes, callback){
        for (var k in changes) {
            _.extend(configs[k], changes[k]);
            if (k in configsOnchanges) { 
                configsOnchanges[k](configs[k]); 
            }
        }
        db.collection("plugins").update({_id:"plugins"}, {$set:flattenObject(configs)}, {upsert:true}, function(err, res){
            if(callback)
                callback();
        });
    };
    
    this.updateUserConfigs = function(db, changes, user_id, callback){
        var update = {}
        for (var k in changes) {
            update[k] = {};
            _.extend(update[k], configs[k], changes[k]);
        }
        db.collection("members").update({_id:db.ObjectID(user_id)}, {$set:flattenObject(update, "settings")}, {upsert:true}, function(err, res){
            if(callback)
                callback();
        });
    };
    
    this.extendModule = function(name, object){     
        //plugin specific extend
        for(var i = 0, l = plugins.length; i < l; i++){
            try{
                require("./"+plugins[i]+"/extend/"+name)(object);
            } catch (ex) {}
        }
        
        //global extend
        try{
            require("../extend/"+name)(object);
        } catch (ex) {}
    }
    
    this.register = function(event, callback){
        if(!events[event])
            events[event] = [];
        events[event].push(callback);
    } 
    
    this.dispatch = function(event, params, callback){
        var used = false,
            promises = [];
        var promise;
        if(events[event]){
            try{
                for(var i = 0, l = events[event].length; i < l; i++){
                    promise = events[event][i].call(null, params)
                    if(promise)
                        used = true;
                    promises.push(promise);
                }
            } catch (ex) {
                console.error(ex.stack);
            }
            //should we create a promise for this dispatch
            if(params && params.params && params.params.promises){
                params.params.promises.push(new Promise(function(resolve, reject){
                    function resolver(){
                        resolve();
                        if(callback){
                            callback();
                        }
                    }
                    Promise.all(promises).then(resolver, resolver);
                }));
            }
            else if(callback){
                Promise.all(promises).then(callback, callback);
            }
        }
        return used;
    }
    
    this.loadAppStatic = function(app, countlyDb, express){
        var self = this;
        for(var i = 0, l = plugins.length; i < l; i++){
            try{
                var plugin = require("./"+plugins[i]+"/frontend/app");
                plugs.push(plugin);
                app.use(countlyConfig.path+'/'+plugins[i], express.static(__dirname + '/'+plugins[i]+"/frontend/public", { maxAge:31557600000 }));
                if(plugin.staticPaths)
                    plugin.staticPaths(app, countlyDb, express);
            } catch (ex) {
                console.error(ex.stack);
            }
        }
    };
    
    this.loadAppPlugins = function(app, countlyDb, express){
        for(var i = 0; i < plugs.length; i++){
            try{
                plugs[i].init(app, countlyDb, express);
            } catch (ex) {
                console.error(ex.stack);
            }
        }
    }
    
    this.callMethod = function(method, params){
        var res = false;
        if(methodCache[method]){
            if(methodCache[method].length > 0){
                for(var i = 0; i < methodCache[method].length; i++){
                    try{
                        if(methodCache[method][i][method](params)){
                            res = true;
                        }
                    } catch (ex) {
                        console.error(ex.stack);
                    }
                }
            }
        }
        else{
            methodCache[method] = [];
            for(var i = 0; i < plugs.length; i++){
                try{
                    if(plugs[i][method]){
                        methodCache[method].push(plugs[i]);
                        if(plugs[i][method](params)){
                            res = true;
                        }
                    }
                } catch (ex) {
                    console.error(ex.stack);
                }
            }
        }
        return res;
    }
    
    this.getPlugins = function(){
        return plugins;
    }
    
    this.getPluginsApis = function(){
        return pluginsApis;
    }
    
    this.setPluginApi = function(plugin, name, func){
        return pluginsApis[plugin][name] = func;
    }
    
    this.reloadPlugins = function(){
        delete require.cache[require.resolve('./plugins.json', 'dont-enclose')];
        plugins = require('./plugins.json', 'dont-enclose');
    }
    
    this.isPluginEnabled = function(plugin){
        return !!plugins[plugin];
    };
    
    //checking plugins on master process
    this.checkPluginsMaster = function(){
        var self = this;
        if(finishedSyncing){
            finishedSyncing = false;
            var db = self.dbConnection();
            db.collection("plugins").findOne({_id:"plugins"}, function(err, res){
                if(!err){
                    configs = res;
                    self.checkPlugins(db, function(){
                        db.close();
                        finishedSyncing = true;
                    }); 
                }
            });
        }
    }
    
    this.startSyncing = function(){
        finishedSyncing = false;
    }
    
    this.stopSyncing = function(){
        finishedSyncing = true;
    }
    
    this.checkPlugins = function(db, callback){
        if(cluster.isMaster){
            var plugs = this.getConfig("plugins");
            if(Object.keys(plugs).length == 0){
                //no plugins inserted yet, upgrading by inserting current plugins
                var list = this.getPlugins();
                for(var i = 0; i < list.length; i++){
                    plugs[list[i]] = true;
                }
                this.updateConfigs(db, "plugins", plugs, callback);
            }
            else{
                this.syncPlugins(plugs, callback);
            }
        }
        else{
            //check if we need to sync plugins
            var pluginList = this.getPlugins();
            var plugs = this.getConfig("plugins") || {};
            //let master know we need to include initial plugins
            if(Object.keys(plugs).length == 0){
                process.send({ cmd: "checkPlugins" });
            }
            else{
                //check if we need to sync plugins
                var changes = 0;
                for(var plugin in plugs){
                    var state = plugs[plugin],
                    index = pluginList.indexOf(plugin);
                    if (index !== -1 && !state){
                        changes++;
                        plugins.splice(plugins.indexOf(plugin), 1);
                    } else if (index === -1 && state) {
                        changes++;
                        plugins.push(plugin);
                    }
                }
                if(changes > 0){
                    //let master process know we need to sync plugins
                    process.send({ cmd: "checkPlugins" });
                }
            }
        }
    };
    
    this.syncPlugins = function(pluginState, callback, db){
        var self = this;
        var dir = path.resolve(__dirname, './plugins.json');
        var pluginList = this.getPlugins().slice(), newPluginsList = pluginList.slice();
        var changes = 0;
        async.each(Object.keys(pluginState), function(plugin, callback){
            var state = pluginState[plugin],
                index = pluginList.indexOf(plugin);
            if (index !== -1 && !state) {
                self.uninstallPlugin(plugin, function(err){
                    if(!err){
                        changes++;
                        newPluginsList.splice(newPluginsList.indexOf(plugin), 1);
                        plugins.splice(plugins.indexOf(plugin), 1);
                    }
                    callback();
                })
            } else if (index === -1 && state) {
                self.installPlugin(plugin, function(err){
                    if(!err){
                        changes++;
                        plugins.push(plugin);
                        newPluginsList.push(plugin);
                    }
                    callback();
                })
            } else {
                callback();
            }
        }, function(error){
            if (error) {
                if(callback)
                    callback(true);
            } else {
                if(changes > 0){
                    if(db && self.getConfig("api").sync_plugins)
                        self.updateConfigs(db, "plugins", pluginState);
                    async.series([fs.writeFile.bind(fs, dir, JSON.stringify(newPluginsList), 'utf8'), self.prepareProduction.bind(self)], function(error){
                        if(callback)
                            callback(error ? true : false);
                        setTimeout(self.restartCountly.bind(self), 500);
                    });
                }
                else if(callback){
                    callback(false);
                }
            }
        });
    }
    
    this.installPlugin = function(plugin, callback){
        console.log('Installing plugin %j...', plugin);
        callback = callback || function() {};
        try{
            var errors;
            var scriptPath = path.join(__dirname, plugin, 'install.js');
            delete require.cache[require.resolve(scriptPath)];
            require(scriptPath);
        }
        catch(ex){
            console.log(ex.stack);
            errors = true;
            return callback(errors);
        }
        var eplugin = global.enclose ? global.enclose.plugins[plugin] : null;
        if (eplugin && eplugin.prepackaged) return callback(errors);
        var cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
        var child = exec('npm install --unsafe-perm', {cwd: cwd}, function(error) {
            if (error){
                errors = true;
                console.log('error: %j', error);
            }
            console.log('Done installing plugin %j', plugin);
            callback(errors);
        });
    }
    
    this.uninstallPlugin = function(plugin, callback){
        console.log('Uninstalling plugin %j...', plugin);
        callback = callback || function() {};
        try{
            var errors;
            var scriptPath = path.join(__dirname, plugin, 'uninstall.js');
            delete require.cache[require.resolve(scriptPath)];
            require(scriptPath);
        }
        catch(ex){
            console.log(ex.stack);
            errors = true;
            return callback(errors);
        }
        console.log('Done uninstalling plugin %j', plugin);
        callback(errors);
    }
    
    this.prepareProduction = function(callback) {
        console.log('Preparing production files');
        exec('grunt plugins locales', {cwd: path.dirname(process.argv[1])}, function(error, stdout) {
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
        exec("sudo countly restart", function (error, stdout, stderr) {
            console.log('Done restarting countly with %j / %j / %j', error, stderr, stdout);
            if(error)
                console.log('error: %j', error);
            if(stderr)
                console.log('stderr: %j', stderr);
        });
    };
    
    this.singleDefaultConnection = function() {
        var conf = Object.assign({}, countlyConfig.mongodb);
        for (var k in conf) {
            if (typeof k === 'object') {
                conf[k] = Object.assign({}, conf[k]);
            }
        }
        conf.max_pool_size = 1;
        return this.dbConnection({mongodb: conf});
    };
    
    this.dbConnection = function(config) {
        var db;
        if(typeof config == "string"){
            db = config;
            config = countlyConfig;
        }
        else
            config = config || countlyConfig;
            
        var dbName;
        var dbOptions = {
            server:{poolSize: config.mongodb.max_pool_size, reconnectInterval: 100, socketOptions: { autoReconnect:true, noDelay:true, keepAlive: 1, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
            replSet:{poolSize: config.mongodb.max_pool_size, reconnectInterval: 100, socketOptions: { autoReconnect:true, noDelay:true, keepAlive: 1, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
            mongos:{poolSize: config.mongodb.max_pool_size, reconnectInterval: 100, socketOptions: { autoReconnect:true, noDelay:true, keepAlive: 1, connectTimeoutMS: 0, socketTimeoutMS: 0 }}
        };
        if (typeof config.mongodb === 'string') {
            dbName = db ? config.mongodb.replace(new RegExp('countly$'), db) : config.mongodb;
        } else{
            config.mongodb.db = db || config.mongodb.db || 'countly';
            if ( typeof config.mongodb.replSetServers === 'object'){
                //mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
                dbName = config.mongodb.replSetServers.join(',')+'/'+config.mongodb.db;
                if(config.mongodb.replicaName){
                    dbOptions.replSet.replicaSet = config.mongodb.replicaName;
                }
            } else {
                dbName = (config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.db);
            }
        }
        
        if(config.mongodb.dbOptions){
            dbOptions.db = config.mongodb.dbOptions;
        }
        
        if(config.mongodb.serverOptions){
            _.extend(dbOptions.server, config.mongodb.serverOptions);
            _.extend(dbOptions.replSet, config.mongodb.serverOptions);
            _.extend(dbOptions.mongos, config.mongodb.serverOptions);   
        }
        
        if(config.mongodb.username && config.mongodb.password){
            dbName = config.mongodb.username + ":" + config.mongodb.password +"@" + dbName;
        }
        
        if(dbName.indexOf('mongodb://') !== 0){
            dbName = 'mongodb://'+dbName;
        }

        var countlyDb = mongo.db(dbName, dbOptions);
        countlyDb._emitter.setMaxListeners(0);
        if(!countlyDb.ObjectID)
            countlyDb.ObjectID = mongo.ObjectID;
        
        return countlyDb;
    };

    var getObjectDiff = function(current, provided){
        var toReturn = {};
        
        for (var i in provided) {
            if(typeof current[i] == "undefined"){
                toReturn[i] = provided[i];
            }
            else if((typeof provided[i]) == 'object' && provided[i] != null) {
                var diff = getObjectDiff(current[i], provided[i]);
                if(Object.keys(diff).length > 0)
                    toReturn[i] = diff;
            }
        }
        return toReturn;
    };
    
    var flattenObject = function(ob, prefix) {
        if(prefix){
            prefix += ".";
        }
        else{
            prefix = "";
        }
        var toReturn = {};
        
        for (var i in ob) {
            if (!ob.hasOwnProperty(i)) continue;
            
            if ((typeof ob[i]) == 'object' && ob[i] != null) {
                var flatObject = flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) continue;
                    
                    toReturn[prefix + i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[prefix + i] = ob[i];
            }
        }
        return toReturn;
    };
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
        this.instance.extendModule("pluginManager", this.instance);
    }
    return this.instance;
}
 
module.exports = pluginManager.getInstance();