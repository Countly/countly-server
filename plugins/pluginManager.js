var plugins = require('./plugins.json', 'dont-enclose'),
    pluginsApis = {}, 
    mongo = require('mongoskin'),
    countlyConfig = require('../frontend/express/config', 'dont-enclose'),
    utils = require('../api/utils/utils.js'),
    fs = require('fs'),
    path = require('path'),
    cp = require('child_process'),
    async = require("async"),
    _ = require('underscore'),
    cluster = require('cluster'),
    Promise = require("bluebird"),
    log = require('../api/utils/log.js'),
    logDbRead = log('db:read'),
    logDbWrite = log('db:write'),
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
    
    this.appTypes = [];
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
                defaultConfigs[namespace][i] = conf[i];
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
        } else if (callback) {
            callback();
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
        if(plugins.indexOf(plugin) === -1)
            return false;
        return true;
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
        if (process.argv[1].endsWith('executor.js') && (!config || !config.mongodb || config.mongodb.max_pool_size !== 1)) {
            console.log('************************************ executor.js common.db ***********************************', process.argv);
            return this.singleDefaultConnection();
        }
            
        var db;
        if(typeof config == "string"){
            db = config;
            config = JSON.parse(JSON.stringify(countlyConfig));
        }
        else
            config = config || JSON.parse(JSON.stringify(countlyConfig));

        var dbName;
        var dbOptions = {
            poolSize: config.mongodb.max_pool_size, 
            reconnectInterval: 1000,
            reconnectTries:999999999,
            autoReconnect:true, 
            noDelay:true, 
            keepAlive: 0, 
            connectTimeoutMS: 999999999, 
            socketTimeoutMS: 999999999
        };
        if (typeof config.mongodb === 'string') {
            dbName = db ? config.mongodb.replace(new RegExp('countly$'), db) : config.mongodb;
        } else{
            config.mongodb.db = db || config.mongodb.db || 'countly';
            if ( typeof config.mongodb.replSetServers === 'object'){
                //mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
                dbName = config.mongodb.replSetServers.join(',')+'/'+config.mongodb.db;
                if(config.mongodb.replicaName){
                    dbOptions.replicaSet = config.mongodb.replicaName;
                }
            } else {
                dbName = (config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.db);
            }
        }
        
        if(config.mongodb.dbOptions){
            _.extend(dbOptions, config.mongodb.dbOptions);  
        }
        
        if(config.mongodb.serverOptions){
            _.extend(dbOptions, config.mongodb.serverOptions);  
        }
        
        if(config.mongodb.username && config.mongodb.password){
            dbName = config.mongodb.username + ":" + utils.decrypt(config.mongodb.password) +"@" + dbName;
        }
        
        if(dbName.indexOf('mongodb://') !== 0){
            dbName = 'mongodb://'+dbName;
        }

        var countlyDb = mongo.db(dbName, dbOptions);
        countlyDb._emitter.setMaxListeners(0);
        if(!countlyDb.ObjectID)
            countlyDb.ObjectID = mongo.ObjectID;
        countlyDb.encode = function(str){
            return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
        };
        
        countlyDb.decode = function(str){
            return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.');
        };
        countlyDb.on('error', console.log);
        countlyDb.s = {};
        //overwrite some methods
        countlyDb._collection = countlyDb.collection;
        countlyDb.collection = function(collection, options, callback){
            
            function copyArguments(arg, name){
                var data = {};
                data.name = name || arg.callee;
                data.args = [];
                for(var i = 0; i < arg.length; i++){
                    data.args.push(arg[i]);
                }
                return data;
            }
            
            //get original collection object
            var ob = this._collection(collection, options, callback);
            
            //overwrite with retry policy
            var retryifNeeded = function(callback, retry, e, data){
                return function(err, res){
                    if(err){
                        if(retry && err.code == 11000){
                            if(typeof retry === "function"){
                                logDbWrite.d("Retrying writing "+collection+" %j", data);
                                retry();
                            }
                            else{
                                logDbWrite.e("Error writing "+collection+" %j %s %j", data, err, err);
                                if(e)
                                    logDbWrite.e(e.stack)
                                if(callback){
                                    callback(err, res);
                                }
                            }
                        }
                        else{
                            logDbWrite.e("Error writing "+collection+" %j %s %j", data, err, err);
                            if(e)
                                logDbWrite.e(e.stack)
                            if(callback){
                                callback(err, res);
                            }
                        }
                    }
                    else if(callback){
                        callback(err, res);
                    }
                };
            };
            ob._findAndModify = ob.findAndModify;
            ob.findAndModify = function(query, sort, doc, options, callback){
                var e;
                var at = "";
                if(log.getLevel("db") === "debug" || log.getLevel("db") === "info"){
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n|\/n/g, "\n").split("\n")[2];
                }
                if(typeof options === "function"){
                    //options was not passed, we have callback
                    logDbWrite.d("findAndModify "+collection+" %j %j %j"+at, query, sort, doc);
                    this._findAndModify(query, sort, doc, retryifNeeded(options, null, e, copyArguments(arguments, "findAndModify")));
                }
                else{
                    //we have options
                    logDbWrite.d("findAndModify "+collection+" %j %j %j %j"+at, query, sort, doc, options);
                    if(options.upsert){
                        var self = this;
                        
                        this._findAndModify(query, sort, doc, options, retryifNeeded(callback, function(){
                            logDbWrite.d("retrying findAndModify "+collection+" %j %j %j %j"+at, query, sort, doc, options);
                            self._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, "findAndModify")));
                        }, e, copyArguments(arguments, "findAndModify")));
                    }
                    else{
                        this._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, "findAndModify")));
                    }
                }
            };
            
            var overwriteRetryWrite = function(ob, name){
                ob["_"+name] = ob[name];
                ob[name] = function(selector, doc, options, callback){
                    var e;
                    var at = "";
                    if(log.getLevel("db") === "debug" || log.getLevel("db") === "info"){
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n|\/n/g, "\n").split("\n")[2];
                    }
                    if(typeof options === "function"){
                        //options was not passed, we have callback
                        logDbWrite.d(name+" "+collection+" %j %j"+at, selector, doc);
                        this["_"+name](selector, doc, retryifNeeded(options, null, e, copyArguments(arguments, name)));
                    }
                    else{
                        options = options || {};
                        //we have options
                        logDbWrite.d(name+" "+collection+" %j %j %j"+at, selector, doc, options);
                        if(options.upsert){
                            var self = this;
                            
                            this["_"+name](selector, doc, options, retryifNeeded(callback, function(){
                                logDbWrite.d("retrying "+name+" "+collection+" %j %j %j"+at, selector, doc, options);
                                self["_"+name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                            }, e, copyArguments(arguments, name)));
                        }
                        else{
                            this["_"+name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                        }
                    }
                };
            }
            
            overwriteRetryWrite(ob, "update");
            overwriteRetryWrite(ob, "updateOne");
            
            //overwrite with write logging
            var logForWrites = function(callback, e, data){
                return function(err, res){
                    if(err){
                        logDbWrite.e("Error writing "+collection+" %j %s %j", data, err, err);
                        if(e)
                            logDbWrite.e(e.stack)
                    }
                    if(callback)
                        callback(err, res);
                };
            };
            
            var overwriteDefaultWrite = function(ob, name){
                ob["_"+name] = ob[name];
                ob[name] = function(selector, options, callback){
                    var e;
                    var at = "";
                    if(log.getLevel("db") === "debug" || log.getLevel("db") === "info"){
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n|\/n/g, "\n").split("\n")[2];
                    }
                    if(typeof options === "function"){
                        //options was not passed, we have callback
                        logDbWrite.d(name+" "+collection+" %j"+at, selector);
                        this["_"+name](selector, logForWrites(options, e, copyArguments(arguments, name)));
                    }
                    else{
                        //we have options
                        logDbWrite.d(name+" "+collection+" %j %j"+at, selector, options);
                        this["_"+name](selector, options, logForWrites(callback, e, copyArguments(arguments, name)));
                    }
                };
            };
            overwriteDefaultWrite(ob, "remove");
            overwriteDefaultWrite(ob, "insert");
            overwriteDefaultWrite(ob, "save");
            overwriteDefaultWrite(ob, "deleteMany");
            
            //overwrite with read logging
            var logForReads = function(callback, e, data){
                return function(err, res){
                    if(err){
                        logDbRead.e("Error reading "+collection+" %j %s %j", data, err, err);
                        if(e)
                            logDbRead.e(e.stack)
                    }
                    if(callback)
                        callback(err, res);
                };
            };
            
            var overwriteDefaultRead = function(ob, name){
                ob["_"+name] = ob[name];
                ob[name] = function(query, options, callback){
                    var e;
                    var at = "";
                    if(log.getLevel("db") === "debug" || log.getLevel("db") === "info"){
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n|\/n/g, "\n").split("\n")[2];
                    }
                    if(typeof options === "function"){
                        //options was not passed, we have callback
                        logDbRead.d(name+" "+collection+" %j"+at, query);
                        this["_"+name](query, logForReads(options, e, copyArguments(arguments, name)));
                    }
                    else{
                        //we have options
                        logDbRead.d(name+" "+collection+" %j %j"+at, query, options);
                        this["_"+name](query, options, logForReads(callback, e, copyArguments(arguments, name)));
                    }
                };
            };
            
            overwriteDefaultRead(ob, "findOne");
            overwriteDefaultRead(ob, "aggregate");
            
            ob._find = ob.find;
            ob.find = function(query, options){
                var e;
                var cursor;
                var at = "";
                if(log.getLevel("db") === "debug" || log.getLevel("db") === "info"){
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n|\/n/g, "\n").split("\n")[2];
                }
                logDbRead.d("find "+collection+" %j %j"+at, query, options);
                var cursor = this._find(query, options);
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(callback){
                    cursor._toArray(logForReads(callback, e, copyArguments(arguments, "find")));
                };
                return cursor;
            };
            
            //return original collection object
            return ob;
        };
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