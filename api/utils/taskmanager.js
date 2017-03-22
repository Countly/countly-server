/**
* Module for handling possibly long running tasks
* @module api/utils/taskmanager
*/

/** @lends module:api/utils/taskmanager */
var taskmanager = {};
var common = require("./common.js");
var crypto = require("crypto");
var request = require("request");
    
(function (taskmanager) {
    /**
    * Monitors DB query or some other potentially long task and switches to long task manager if it exceeds threshold
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {params} options.params - params object
    * @param {number} options.threshold - amount of seconds to wait before switching to long running task
    * @param {string} options.type - type of data, as which module or plugin uses this data
    * @param {string} options.meta - any information about the tast
    * @param {string} options.view - browser side view hash prepended with job id to display result
    * @param {string} options.app_id - id of the app for which data is meant for
    * @param {function} options.processData - function to which to feed fetched data to post process it if needed, should accept err, data and callback to which to feed processed data
    * @param {function} options.outputData - function to which to feed post processed data, if task did not exceed threshold
    * @returns {function} standard nodejs callback function accepting error as first parameter and result as second one. This result is passed to processData function, if such is available.
    * @example
    * common.db.collection("data").findOne({_id:"test"}, taskmanager.longtask({
    *   db:common.db, 
    *   threshold:30, 
    *   app_id:"58b6d13bf1de9562e5a8029f",
    *   params: params,
    *   type:"funnels", 
    *   meta:"FunnelName",
    *   view:"#/funnels/task/",
    *   processData:function(err, res, callback){
    *       if(!err)
    *           callback(null, res);
    *       else
    *           callback(null, {});
    *   }, outputData:function(err, data){
    *       common.returnOutput(params, data);
    *   }
    * })); 
    */
    taskmanager.longtask = function (options) {
        options.db = options.db || common.db;
        var exceeds = false;
        var start = new Date().getTime();
        var timeout = setTimeout(function(){
            timeout = null;
            exceeds = true;
            if(!options.id){
                if(options.params && options.params.qstring && options.params.qstring.task_id){
                    options.id = options.params.qstring.task_id;
                }
                else{
                    options.id = taskmanager.getId();
                }
                if(!options.app_id){
                    if(options.params){
                        options.app_id = (options.params.app_id || options.params.app._id || options.params.qstring.app_id)+"";
                    }
                }
                taskmanager.createTask(options);
            }
            if(!options.request && options.params){
                var json = options.params.qstring || {};
                json = JSON.parse(JSON.stringify(json));
                delete json.task_id;
                options.request = {
                    uri: "http://localhost"+options.params.fullPath,
                    method: 'POST',
                    json:json
                }
            }
            options.outputData(null, {task_id:options.id});
        }, options.threshold*1000);
        return function(err, res){
            if(timeout){
                clearTimeout(timeout);
                timeout = null;
            }
            if(typeof options.processData === "function"){
                options.processData(err, res, function(err, res){
                    if(!exceeds){
                        options.outputData(err, res);
                    }
                    else{
                        taskmanager.saveResult(options, res);
                    }
                });
            }
            else{
                if(!exceeds){
                    options.outputData(err, res);
                }
                else{
                    taskmanager.saveResult(options, res);
                }
            }
            
        };
    };
    
    /**
    * Generates ID for the task
    * @returns {string} id to be used when saving the task
    */
    taskmanager.getId = function(){
        return crypto.createHash('sha1').update(crypto.randomBytes(16).toString("hex")+""+new Date().getTime()).digest('hex');
    };
    
    /**
    * Create task with data, without result
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.id - id to use for this task
    * @param {string} options.type - type of data, as which module or plugin uses this data
    * @param {string} options.meta - any information about the taskManager
    * @param {string} options.view - browser side view hash prepended with job id to display result
    * @param {string} options.app_id - id of the app for which data is for
    * @param {function=} callback - callback when data is stored
    */
    taskmanager.createTask = function(options, callback){
        options.db = options.db || common.db;
        var update = {};
        update.ts = new Date().getTime();
        update.start = new Date().getTime();
        update.status = "running";
        update.type = options.type || "";
        update.meta = options.meta || "";
        update.view = options.view || "";
        update.app_id = options.app_id || "";
        options.db.collection("long_tasks").update({_id:options.id}, {$set:update}, {'upsert': true}, callback);
    };
    
    /**
    * Save result from the task
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.id - id to use for this task
    * @param {string} options.request - api request to be able to rerun this task
    * @param {object} data - result data of the task
    * @param {function=} callback - callback when data is stored
    */
    taskmanager.saveResult = function(options, data, callback){
        options.db = options.db || common.db;
        options.db.collection("long_tasks").update({_id:options.id}, {$set:{
            end: new Date().getTime(),
            status:"completed",
            data:JSON.stringify(data || {})}}, {'upsert': true}, callback);
    };
    
    /**
    * Get specific task result
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.id - id of the task result
    * @param {funciton} callback - callback for the result
    */
    taskmanager.getResult = function(options, callback){
        options.db = options.db || common.db;
        options.db.collection("long_tasks").findOne({_id:options.id}, callback);
    };
    
    /**
    * Get multiple task results based on query
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {object} options.query - mongodb query
    * @param {object} options.projection - mongodb projection
    * @param {funciton} callback - callback for the result
    */
    taskmanager.getResults = function(options, callback){
        options.db = options.db || common.db;
        options.query = options.query || {};
        options.projection = options.projection || {data:0};
        options.db.collection("long_tasks").find(options.query, options.projection).toArray(callback);
    };
    
    /**
    * Delete specific task result
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.id - id of the task result
    * @param {funciton} callback - callback for the result
    */
    taskmanager.deleteResult = function(options, callback){
        options.db = options.db || common.db;
        options.db.collection("long_tasks").remove({_id:options.id}, callback);
    };
    
    /**
    * Rerun specific task
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.id - id of the task result
    * @param {funciton} callback - callback for the result
    */
    taskmanager.rerunTask = function(options, callback){
        options.db = options.db || common.db;
        options.db.collection("long_tasks").findAndModify({_id:options.id}, {}, {$set:{status:"rerunning"}},function(err, res){
            res = res && res.ok ? res.value : null;
            if(!err && res && res.request){
                try{
                    res.request = JSON.parse(res.request);
                }
                catch(ex){
                    res.request = {};
                }
                if(res.request.uri){
                    res.request.json.task_id = options.id;
                    request(res.request, function (error, response, body) {});
                    callback(null, "Success");
                }
                else{
                    callback(null, "This task cannot be run again");
                }
            }
            else{
                callback(null, "This task cannot be run again");
            }
        });
    };
}(taskmanager));

module.exports = taskmanager;