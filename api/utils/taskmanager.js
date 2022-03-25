/**
* Module for handling possibly long running tasks
* @module api/utils/taskmanager
*/

/** @lends module:api/utils/taskmanager */
var taskmanager = {};
var common = require("./common.js");
var countlyConfig = require("../../frontend/express/config.js");
var countlyFs = require("./countlyFs.js");
var crypto = require("crypto");
var request = require("request");
var plugins = require('../../plugins/pluginManager.js');
const log = require('./log.js')('core:taskmanager');

/**
* Monitors DB query or some other potentially long task and switches to long task manager if it exceeds threshold
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {params} options.params - params object
* @param {number} options.threshold - amount of seconds to wait before switching to long running task
* @param {number} options.force - force to use taskmanager, ignoring threshold
* @param {string} options.type - type of data, as which module or plugin uses this data
* @param {string} options.meta - any information about the tast
* @param {string} options.name - provide user friendly task running condition string(Like, "Session (sc > 1024)" shows the report will filter by session count bigger than 1024)
* @param {string} options.report_name - name inputed by user create from report form
* @param {string} options.report_desc - report desc from report form
* @param {string} options.period_desc - target period report data from report form
* @param {string} options.name - provide user friendly task running condition string
* @param {string} options.view - browser side view hash prepended with job id to display result
* @param {string} options.app_id - id of the app for which data is meant for
* @param {function} options.processData - function to which to feed fetched data to post process it if needed, should accept err, data and callback to which to feed processed data
* @param {function} options.outputData - function to which to feed post processed data, if task did not exceed threshold
* @param {string} options.creator - the task creator
* @param {boolean} options.global - the task is private or global visit. 
* @param {boolean} options.autoRefresh - the task is will auto run periodically or not. 
* @param {number} options.r_hour - the task local hour of time to run, when autoRefresh is true.
* @param {boolean} options.forceCreateTask - force createTask with id supplied ( for import)
* @param {boolean} options.gridfs - store result in gridfs instead of MongoDB document
* @returns {function} standard nodejs callback function accepting error as first parameter and result as second one. This result is passed to processData function, if such is available.
* @example
* common.db.collection("data").findOne({_id:"test"}, taskmanager.longtask({
*   db:common.db, 
*   threshold:30, 
*   force:false,
*   app_id:"58b6d13bf1de9562e5a8029f",
*   params: params,
*   type:"funnels", 
*   meta: {},
*   name:"FunnelName",
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
taskmanager.longtask = function(options) {
    options.db = options.db || common.db;
    var exceeds = false;
    var start = new Date().getTime();
    var timeout;
    /** switching to long task */
    function switchToLongTask() {
        timeout = null;
        exceeds = true;
        if (!options.request && options.params && options.params.qstring) {
            var json = options.params.qstring || {};
            json = JSON.parse(JSON.stringify(json));
            //we don't need to have task_id, it will be automatically applied
            delete json.task_id;
            //we want to get raw json data without jsonp
            delete json.callback;
            //delete jquery param to prevent caching
            delete json._;
            //delete api_key param
            delete json.api_key;

            options.request = {
                uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + options.params.fullPath,
                method: 'POST',
                json: json
            };
        }

        if (!options.id) {
            if (options.params && options.params.member && options.params.member._id) {
                options.creator = options.params.member._id + "";
            }
            if (!options.app_id) {
                if (options.params) {
                    options.app_id = (options.params.app_id || (options.params.app && options.params.app._id) || options.params.qstring.app_id) + "";
                }
            }
            if (options.params && options.params.qstring && options.params.qstring.task_id) {
                options.id = options.params.qstring.task_id;
            }
            else {
                options.id = taskmanager.getId();
                options.start = start;
                taskmanager.createTask(options);
            }
        }
        // force createTask with id supplied ( for import)
        if (options.id && options.forceCreateTask) {
            if (options.params && options.params.member && options.params.member._id) {
                options.creator = options.params.member._id + "";
            }
            if (!options.app_id) {
                if (options.params) {
                    options.app_id = (options.params.app_id || options.params.app._id || options.params.qstring.app_id) + "";
                }
            }
            options.start = start;
            taskmanager.createTask(options);
        }
        options.outputData(null, {task_id: options.id});
    }
    if (options.force) {
        switchToLongTask();
    }
    else {
        timeout = setTimeout(switchToLongTask, options.threshold * 1000);
    }
    return function(err, res) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        if (typeof options.processData === "function") {
            options.processData(err, res, function(err1, res1) {
                if (!exceeds) {
                    options.outputData(err1, res1);
                }
                else {
                    if (err1) {
                        options.errored = true;
                        options.errormsg = err1;
                    }
                    taskmanager.saveResult(options, res1);
                }
            });
        }
        else {
            if (!exceeds) {
                options.outputData(err, res);
            }
            else {
                if (err) {
                    options.errored = true;
                    options.errormsg = err;
                }
                taskmanager.saveResult(options, res);
            }
        }

    };
};

/**
* Generates ID for the task
* @returns {string} id to be used when saving the task
*/
taskmanager.getId = function() {
    return crypto.createHash('sha1').update(crypto.randomBytes(16).toString("hex") + "" + new Date().getTime()).digest('hex');
};

/**
* Create task with data, without result
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id to use for this task
* @param {string} options.type - type of data, as which module or plugin uses this data
* @param {string} options.meta - any information about the taskManager
* @param {string} options.name - provide user friendly task running condition string(Like, "Session (sc > 1024)" shows the report will filter by session count bigger than 1024)
* @param {string} options.report_name - name inputed by user create from report form
* @param {string} options.report_desc - report desc from report form
* @param {string} options.period_desc - target period report data from report form
* @param {string} options.view - browser side view hash prepended with job id to display result
* @param {object} options.request - api request to be able to rerun this task
* @param {string} options.app_id - id of the app for which data is for
* @param {number} options.start - start time of the task in miliseconds (by default now)
* @param {string} options.creator - the task creator
* @param {string} options.global - the task is private or global visit. 
* @param {boolean} options.autoRefresh - the task is will auto run periodically or not. 
* @param {number} options.r_hour - the task local hour of time to run, when autoRefresh is true.
* @param {boolean} options.manually_create - the task is create from form input
* @param {boolean} options.gridfs - store result in gridfs instead of MongoDB document
*  @param {function=} callback - callback when data is stored
*/
taskmanager.createTask = function(options, callback) {
    options.db = options.db || common.db;
    var update = {};
    update.ts = new Date().getTime();
    update.start = options.start || new Date().getTime();
    update.status = "running";
    update.type = options.type || "";
    update.meta = options.meta || "";
    update.name = options.name || null;
    update.view = options.view || "";
    update.request = JSON.stringify(options.request || {});
    update.app_id = options.app_id || "";
    update.creator = options.creator;
    update.global = options.global;
    update.r_hour = options.r_hour || 0;
    update.autoRefresh = options.autoRefresh || false;
    update.report_name = options.report_name || "";
    update.report_desc = options.report_desc || "";
    update.period_desc = options.period_desc || "";
    update.manually_create = options.manually_create || false;
    update.subtask_key = options.subtask_key || "";
    update.taskgroup = options.taskgroup || false;
    update.linked_to = options.linked_to;
    if (options.subtask && options.subtask !== "") {
        update.subtask = options.subtask;
        var updateSub = {$set: {}};
        updateSub.$set["subtasks." + options.id + ".status"] = "running";
        updateSub.$set["subtasks." + options.id + ".start"] = new Date().getTime();
        options.db.collection("long_tasks").update({_id: update.subtask}, updateSub, {'upsert': false}, function(err, res) {
            if (err) {
                callback(err, res);
            }
            else {
                options.db.collection("long_tasks").update({_id: options.id}, {$set: update}, {'upsert': true}, callback);
            }
        });
    }
    else {
        options.db.collection("long_tasks").update({_id: options.id}, {$set: update}, {'upsert': true}, callback);
        if (options.manually_create) {
            plugins.dispatch("/systemlogs", {params: options.params, action: "task_manager_task_created", data: update});
        }
    }
};

/**
* Save result from the task
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id to use for this task
* @param {boolean} options.errored - if errored then true
* @param {object} options.errormsg - data object for error msg  - can be also error msg (string)
* @param {string} options.errormsg.message - Optional. if exists check for message here. If not uses options.errormsg. 
* @param {object} data - result data of the task
* @param {boolean} options.gridfs - store result in gridfs instead of MongoDB document
* @param {function=} callback - callback when data is stored
*/
taskmanager.saveResult = function(options, data, callback) {
    options = options || {};
    options.db = options.db || common.db;
    var update = {
        end: new Date().getTime(),
        status: "completed",
        hasData: true
    };

    if (options.errored) {
        var message = "";
        if (options.errormsg) {
            message = options.errormsg;
        }
        if (message.message) {
            message = message.message;
        }
        update.status = "errored";
        update.errormsg = message;
    }
    else {
        update.errormsg = "";//rewrite any old error message
    }
    /** function to update subtasks
	**/
    function updateSubtasks() {
        var updateObj = {$set: {}};
        updateObj.$set["subtasks." + options.id + ".status"] = options.errored ? "errored" : "completed";
        updateObj.$set["subtasks." + options.id + ".hasData"] = true;
        updateObj.$set["subtasks." + options.id + ".end"] = new Date().getTime();
        if (update.errormsg) {
            updateObj.$set["subtasks." + options.id + ".errormsg"] = update.errormsg;
        }
        else {
            updateObj.$unset = {};
            updateObj.$unset["subtasks." + options.id + ".errormsg"] = "";
        }
        options.db.collection("long_tasks").update({_id: options.subtask}, updateObj, {'upsert': false}, function() {});
    }

    options.db.collection("long_tasks").findOne({_id: options.id}, function(error, task) {
        if (options.gridfs || (task && task.gridfs)) {
            //let's store it in gridfs
            update.data = {};
            update.gridfs = true;
            if (options.errored) {
                options.db.collection("long_tasks").update({_id: options.id}, {$set: update}, function(err) {
                    if (options.subtask && !err) {
                        var updateObj = {$set: {}};
                        updateObj.$set["subtasks." + options.id + ".status"] = options.errored ? "errored" : "completed";
                        updateObj.$set["subtasks." + options.id + ".hasData"] = true;
                        updateObj.$set["subtasks." + options.id + ".end"] = new Date().getTime();
                        if (update.errormsg) {
                            updateObj.$set["subtasks." + options.id + ".errormsg"] = update.errormsg;
                        }
                        else {
                            updateObj.$unset = {};
                            updateObj.$unset["subtasks." + options.id + ".errormsg"] = "";
                        }

                        options.db.collection("long_tasks").update({_id: options.subtask}, updateObj, {'upsert': false}, function() {});
                    }
                    data = JSON.stringify(data || {});
                    countlyFs.gridfs.saveData("task_results", options.id, data, {id: options.id}, function(err2, res2) {
                        if (callback) {
                            callback(err2, res2);
                        }
                    });

                });
            }
            else {
                if (!options.binary) {
                    data = JSON.stringify(data || {});
                    countlyFs.gridfs.saveData("task_results", options.id, data, {id: options.id}, function(err2, res2) {
                        options.db.collection("long_tasks").update({_id: options.id}, {$set: update}, function(err) {
                            if (options.subtask && !err) {
                                updateSubtasks();
                            }
                            if (callback) {
                                callback(err2, res2);
                            }
                        });
                    });
                }
                else {
                    countlyFs.gridfs.saveStream("task_results", options.id, data, {id: options.id}, function(err2, res2) {
                        options.db.collection("long_tasks").update({_id: options.id}, {$set: update}, function(err) {
                            if (options.subtask && !err) {
                                updateSubtasks();
                            }
                            if (callback) {
                                callback(err2, res2);
                            }
                        });
                    });
                }
            }
        }
        else {
            update.data = JSON.stringify(data || {});
            options.db.collection("long_tasks").update({_id: options.id}, {
                $set: update
            }, {'upsert': false}, function(err, res) {
                if (options.subtask && !err) {
                    var updateObj = {$set: {}};
                    updateObj.$set["subtasks." + options.id + ".status"] = options.errored ? "errored" : "completed";
                    updateObj.$set["subtasks." + options.id + ".hasData"] = true;
                    updateObj.$set["subtasks." + options.id + ".end"] = new Date().getTime();
                    if (update.errormsg) {
                        updateObj.$set["subtasks." + options.id + ".errormsg"] = update.errormsg;
                    }
                    else {
                        updateObj.$unset = {};
                        updateObj.$unset["subtasks." + options.id + ".errormsg"] = "";
                    }

                    options.db.collection("long_tasks").update({_id: options.subtask}, updateObj, {'upsert': false}, function() {});
                }

                if (callback) {
                    callback(err, res);
                }
            });
        }
    });
};

/**
* Give a name to task result or rename it
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id to use for this task
* @param {string} options.name - name of the task result, for later reference
* @param {object} data - not used at all. pass anything. left for compability
* @param {function=} callback - callback when data is stored
*/
taskmanager.nameResult = function(options, data, callback) {
    options.db = options.db || common.db;
    options.db.collection("long_tasks").update({_id: options.id}, {$set: {name: options.name}}, {'upsert': false}, callback);
};

/**
* Get specific task result
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id of the task result
* @param {funciton} callback - callback for the result
*/
taskmanager.getResult = function(options, callback) {
    options.db = options.db || common.db;
    if (options.only_info) {
        options.db.collection("long_tasks").findOne({_id: options.id}, {data: 0}, getResult(callback, options));
    }
    else {
        options.db.collection("long_tasks").findOne({_id: options.id}, getResult(callback, options));
    }
};

/**
* Get specific task result
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.query - query for the task result
* @param {funciton} callback - callback for the result
*/
taskmanager.getResultByQuery = function(options, callback) {
    options.db = options.db || common.db;
    options.db.collection("long_tasks").findOne(options.query, getResult(callback, options));
};

/**
* Edit specific task
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {object} options.id - ID of the target task 
* @param {string} options.data - data of the task want to modify
* @param {funciton} callback - callback for the result
*/
taskmanager.editTask = function(options, callback) {
    options.db = options.db || common.db;
    options.db.collection("long_tasks").findOne({_id: options.id}, function(err, data) {
        if (!err) {
            try {
                var req = JSON.parse(data.request);
                if (options.data.period_desc && options.data.period_desc !== "" && options.data.period_desc !== "false") {
                    req.json.period = options.data.period_desc === 'today' ? 'hour' : options.data.period_desc;
                    req.json.period_desc = options.data.period_desc;
                }
                options.data.request = JSON.stringify(req);
                options.db.collection("long_tasks").update({_id: options.id}, {$set: options.data}, function() {
                    callback(null, {before: data, after: options.data});
                });
            }
            catch (e) {
                log.e(' got error while process task request parse', e);
            }
        }
    });

};

/**
* Check task's status
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id of the task result
* @param {funciton} callback - callback for the result
*/
taskmanager.checkResult = function(options, callback) {
    options.db = options.db || common.db;
    if (Array.isArray(options.id)) {
        options.db.collection("long_tasks").find({_id: {$in: options.id}}, {
            _id: 1,
            status: 1,
            report_name: 1,
            type: 1,
            manually_create: 1,
            view: 1
        }).toArray(function(err, res) {
            if (err) {
                callback(err);
            }
            else {
                var statuses = {};
                options.id.forEach(function(id) {
                    statuses[id] = {_id: id, status: "deleted"}; // if it is present in res, will be overwritten.
                });
                res.forEach(function(item) {
                    statuses[item._id] = item;
                });
                callback(null, Object.keys(statuses).map(function(_id) {
                    var item = statuses[_id];
                    item.result = item.status;
                    delete item.status;
                    return item;
                }));
            }
        });
    }
    else {
        options.db.collection("long_tasks").findOne({_id: options.id}, {
            _id: 0,
            status: 1
        }, callback);
    }
};

/**
* Check if task like that is arleady running or not
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string=} options.id - id of the task result
* @param {string=} options.type - type of data, as which module or plugin uses this data
* @param {string=} options.meta - any information about the taskManager
* @param {params=} options.params - params object
* @param {object=} options.request - api request to be able to rerun this task
* @param {funciton} callback - callback for the result
*/
taskmanager.checkIfRunning = function(options, callback) {
    options.db = options.db || common.db;
    var query = {};
    if (options.id) {
        query._id = options.id;
    }
    if (options.type) {
        query.type = options.type;
    }
    if (options.meta) {
        query.meta = options.meta;
    }
    if (options.request) {
        query.request = options.request;
    }
    if (!query.request && options.params && options.params.qstring) {
        var json = options.params.qstring || {};
        json = JSON.parse(JSON.stringify(json));
        //make sure not to have same task already running
        if (json.task_id) {
            query._id = {$ne: json.task_id};
            delete json.task_id;
        }
        //we want to get raw json data without jsonp && api_key
        delete json.callback;
        delete json.api_key;

        //delete jquery param to prevent caching
        delete json._;
        query.request = {
            uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + options.params.fullPath,
            method: 'POST',
            json: json
        };
    }
    if (query.request) {
        query.request = JSON.stringify(query.request);
    }
    query.$and = [
        {$or: [ { status: "running" }, { status: "rerunning" } ]},
        {$or: [{"global": {"$ne": false}}, {"creator": options.params.member._id + ""}]}
    ];
    options.db.collection("long_tasks").findOne(query, {status: 1}, function(err, res) {
        if (res && res.status && (res.status === "running" || res.status === "rerunning")) {
            callback(res._id);
        }
        else {
            callback(false);
        }
    });
};

/**
* Get multiple task results based on query
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {object} options.query - mongodb query
* @param {object} options.projection - mongodb projection
* @param {funciton} callback - callback for the result
*/
taskmanager.getResults = function(options, callback) {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.projection = options.projection || {data: 0};
    options.db.collection("long_tasks").find(options.query, options.projection).toArray(callback);
};

/**
* Get task counts based on query and grouped by app_id
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {object} options.query - mongodb query
* @param {funciton} callback - callback for the result
*/
taskmanager.getCounts = function(options, callback) {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.db.collection("long_tasks").aggregate([
        {$match: options.query},
        {
            $group:
            {
                _id: '$app_id',
                c: {$sum: 1}
            }
        }
    ], {allowDiskUse: true}, function(err, docs) {
        callback(err, docs);
    });
};

/**
* Get dataTable query results for tasks
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {object} options.query - mongodb query
* @param {object} options.projection - mongodb projection
* @param {object} options.page - mongodb offset & limit
* @param {object} options.keyword - search task "report_name" or "report_desc"
* @param {funciton} callback - callback for the result
*/
taskmanager.getTableQueryResult = async function(options, callback) {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.projection = options.projection || {data: 0};

    if (options.keyword) {
        options.query.$and = options.query.$and ? options.query.$and : [];
        const keywordRegx = new RegExp(options.keyword, 'i');
        options.query.$and.push({
            $or: [
                {"report_name": {$regex: keywordRegx}},
                {"report_desc": {$regex: keywordRegx}},
            ]
        });
    }
    let sortBy = {'end': -1};
    if (options.sort.sortBy) {
        const orderbyKey = { 0: 'report_name', 2: 'status', 3: 'type', 7: 'end', 8: 'start'};
        const keyName = orderbyKey[options.sort.sortBy];
        const seq = options.sort.sortSeq === 'desc' ? -1 : 1;
        sortBy = {[keyName]: seq};
    }

    let skip = 0;
    let limit = 10;
    try {
        skip = parseInt(options.page.skip, 10);
        limit = parseInt(options.page.limit, 10);
    }
    catch (e) {
        log.e(' got error while process task request parse', e);
    }
    const count = await options.db.collection("long_tasks").find(options.query, options.projection).count();
    return options.db.collection("long_tasks").find(options.query, options.projection).sort(sortBy).skip(skip).limit(limit).toArray((err, list) => {
        if (!err) {
            callback(null, {list, count});
        }
        else {
            callback(err, {});
        }
    });
};

/**
* Delete specific task result
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id of the task result
* @param {funciton} callback - callback for the result
*/
taskmanager.deleteResult = function(options, callback) {
    options.db = options.db || common.db;
    options.db.collection("long_tasks").findOne({_id: options.id}, function(err, task) {
        if (err || !task) {
            return callback(err);
        }
        if (task.gridfs) {
            countlyFs.gridfs.deleteFile("task_results", options.id, {id: options.id}, function() {});
        }
        options.db.collection("long_tasks").remove({_id: options.id}, function() {
            callback(null, task);
        });
        if (task.taskgroup) {
            options.db.collection("long_tasks").find({subtask: options.id}, {_id: 1}).toArray(function(err2, tasks) {
                if (tasks && tasks.length) {
                    for (var i = 0; i < tasks.length; i++) {
                        taskmanager.deleteResult({id: tasks[i]._id, db: options.db}, function() {});
                    }
                }
            });
        }
    });
};

/**
* Mark all running or rerunning tasks as errored
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {funciton} callback - callback for the result
*/
taskmanager.errorResults = function(options, callback) {
    options.db = options.db || common.db;
    options.db.collection("long_tasks").update({status: "running"}, {$set: {status: "errored", errormsg: "Task was killed during server restart."}}, {multi: true}, function() {
        options.db.collection("long_tasks").update({status: "rerunning"}, {$set: {status: "errored", errormsg: "Task was killed during server restart."}}, {multi: true}, function() {
            options.db.collection("long_tasks").find({status: "errored", subtask: {$exists: true}}).toArray(function(err, res) {
                if (res && res.length > 0) {
                    for (var k = 0; k < res.length; k++) {
                        var updateSub = {$set: {}};
                        updateSub.$set["subtasks." + res[k]._id + ".status"] = "errored";
                        updateSub.$set["subtasks." + res[k]._id + ".errormsg"] = "Task was killed during server restart.";
                        options.db.collection("long_tasks").update({_id: res[k].subtask}, updateSub, {}, function(/*err,res*/) {});
                    }
                }
                if (callback) {
                    callback(err, {});
                }
            });
        });
    });
};

/**
* Rerun specific task
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.id - id of the task result
* @param {funciton} callback - callback for the result
*/
taskmanager.rerunTask = function(options, callback) {
    options.db = options.db || common.db;
    /**
    * Runs task
    * @param {object} options1 - options for the task
    * @param {object} options1.db - database connection
    * @param {string} options1.id - id of the task result
    * @param {object} reqData  -  request data
    * @param {funciton} callback1 - callback for the result
    */
    function runTask(options1, reqData, callback1) {
        options.db.collection("long_tasks").update({_id: options1.id}, {
            $set: {
                status: "rerunning",
                start: new Date().getTime()
            }
        }, function(err, res) {
            log.d("calling request");
            log.d(JSON.stringify(reqData));

            request(reqData, function(error, response, body) {
                //we got a redirect, we need to follow it
                log.d("got response");
                log.d(JSON.stringify(response));

                if (response && response.statusCode) {
                    log.d(" with status code: " + response.statusCode);
                }
                if (response && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    log.d("Redirecting to:" + response.headers.location);
                    reqData.uri = response.headers.location;
                    runTask(options1, reqData, function() {});
                }

                //we got response, if it contains task_id, then task is rerunning
                //if it does not, then possibly task completed faster this time and we can get new result
                else if (body) {
                    if (!body.task_id) {
                        var code = "";
                        var msg = "";
                        if (response && response.statusCode) {
                            code = response.statusCode;
                            msg = response.statusMessage || "";
                            if (response.body && response.body !== '') {
                                if (typeof response.body === 'string') {
                                    try {
                                        msg = JSON.parse(response.body);
                                        if (msg.result) {
                                            msg = msg.result;
                                        }
                                    }
                                    catch (exp) {
                                        log.e('Parse ' + response.body + ' JSON failed');
                                        msg = response.body;
                                    }
                                }
                                else {
                                    if (response.body.result) {
                                        msg = response.body.result;
                                    }
                                    else {
                                        msg = JSON.stringify(response.body);
                                    }
                                }
                            }
                        }

                        if (code === 200) {
                            taskmanager.saveResult({
                                db: options1.db,
                                id: options1.id,
                                subtask: options1.subtask,
                                request: res.request
                            }, body);
                        }
                        else {
                            taskmanager.saveResult({
                                db: options1.db,
                                id: options1.id,
                                subtask: options1.subtask,
                                errormsg: msg,
                                errored: true,
                                request: res.request
                            }, body);

                        }
                    }
                    else {
                        //we have task id. so it is running and will update itself
                    }
                }
                else {
                    //We don't have body. Something is definetly wrong. Try logging error
                    taskmanager.saveResult({
                        db: options1.db,
                        id: options1.id,
                        subtask: options1.subtask,
                        errormsg: "Missing body. " + JSON.stringify(error || {}),
                        errored: true,
                        request: res.request
                    }, body);
                }
            });
            callback1(null, "Success");
        });
    }

    options.db.collection("long_tasks").findOne({_id: options.id}, function(err, res) {
        if (!err && res && res.request) {
            var reqData = {};
            try {
                reqData = JSON.parse(res.request);
            }
            catch (ex) {
                reqData = {};
            }
            if (reqData.uri) {
                reqData.json.task_id = options.id;
                reqData.strictSSL = false;
                options.subtask = res.subtask;
                reqData.json.autoUpdate = options.autoUpdate || false;
                if (!reqData.json.api_key && res.creator) {
                    options.db.collection("members").findOne({_id: common.db.ObjectID(res.creator)}, function(err1, member) {
                        if (member && member.api_key) {
                            reqData.json.api_key = member.api_key;
                            runTask(options, reqData, callback);
                        }
                        else if (res.global) {
                            //AD and other outer login users might not have their user documents
                            options.db.collection("members").findOne({global_admin: true}, function(err2, admin) {
                                if (admin && admin.api_key) {
                                    reqData.json.api_key = admin.api_key;
                                    runTask(options, reqData, callback);
                                }
                                else {
                                    callback(null, "No permission to run this task");
                                }
                            });
                        }
                        else {
                            callback(null, "No permission to run this task");
                        }
                    });

                }
                else {
                    runTask(options, reqData, callback);
                }
            }
            else {
                callback(null, "This task cannot be run again");
            }
        }
        else {
            callback(null, "This task cannot be run again");
        }
    });
};

/**
 *  Create a callback for getting result, including checking gridfs
 *  @param {function} callback - callback for the result
 *  @param {object} options - options object
 *  @returns {function} callback to use for db query
 */
function getResult(callback, options) {
    return function(err, data) {
        if (!err) {
            if (options && options.only_info) {
                callback(err, data);
            }
            else if (data && options && options.subtask_key && data.taskgroup === true) {
                taskmanager.getResultByQuery({db: options.db, query: {subtask: data._id, subtask_key: options.subtask_key}}, getResult(function(err2, subtask) {
                    if (!subtask) {
                        taskmanager.rerunTask({db: options.db, id: data._id}, function() {});
                    }
                    callback(err2, subtask);
                }));
            }
            else if (data && data.gridfs) {
                countlyFs.gridfs.getData("task_results", data._id + "", {id: data._id}, function(err2, largeData) {
                    if (!err2) {
                        data.data = largeData;
                        callback(null, data);
                    }
                    else {
                        callback(err2, data);
                    }
                });
            }
            else {
                callback(err, data);
            }
        }
        else {
            callback(err, data);
        }
    };
}
module.exports = taskmanager;