/**
* Module for handling possibly long running tasks
* @module api/utils/taskmanager
*/

/** @lends module:api/utils/taskmanager */
var calculatedDataManager = {};
var common = require("./common.js");
var crypto = require("crypto");
var fetch = require("../parts/data/fetch.js");

var collection = "drill_data_cache";
const log = require('./log.js')('core:calculatedDataManager');


//1. check if there is cached value based on params  and it is not old- then return it.
//2. if there is none - try creating calculating document (_id base don hash+calculating)
//3. if it is already calculating - return id for cache that is beeing calucalted.

/**
 * Looks if there is any cached data for given query, if there is not marks it as calculating. returns result if can be calculated in time
 * @param {object} options - options object
 * @param {object} options.query_data - query data
 * @param {object} options.db - db connection
 * @param {function} options.outputData - function to output data
 * @param {number} options.threshold - threshold in seconds
 */
calculatedDataManager.longtask = async function(options) {
    options.id = calculatedDataManager.getId(options.query_data);
    options.db = options.db || common.db;
    var timeout;

    /**
     * Return message in case it takes too long
     * @param {object} options5  - options
     */
    function notifyClient(options5) {
        if (!options5.retuned) {
            options5.returned = true;
            options5.outputData(null, {"_id": options5.id, "running": true});
        }
    }
    /** switching to long task
     * @param {object} options - options
     * @param {object} options.query_data - query data
     * @param {object} options.db - db connection
     * @param {function} options.outputData - function to output data
     * @param {number} options.threshold - threshold in seconds
     */
    async function switchToLongTask(options) {
        timeout = setTimeout(notifyClient, options.threshold * 1000);
        try {
            await common.db.collection(collection).insertOne({_id: options.id, status: "calculating", "lu": new Date()});
        }
        catch (e) {
            options.outputData(e, {"_id": options.id, "running": false, "error": true});
            clearTimeout(timeout);
            return;
        }
        fetch.fetchFromGranuralData(options.query_data, function(err, res) {
            if (err) {
                options.errored = true;
                options.errormsg = err;
            }
            calculatedDataManager.saveResult(options, res);
            clearTimeout(timeout);
            if (!options.returned) {
                options.outputData(err, {"_id": options.id, "data": res, "lu": new Date()});
            }
        });
    }
    var data = await common.db.collection(collection).findOne({_id: options.id});
    if (data) {
        if (data.status === "done") {
            //check if it is not too old
            if (data.lu && (new Date().getTime() - data.lu.getTime()) < options.threshold * 1000) {
                options.outputData(null, {"data": data.data, "lu": data.lu, "_id": options.id});
                return;
            }
            else {
                common.db.collection(collection).deleteOne({_id: options.id}, function(ee) {
                    if (ee) {
                        log.e("Error while deleting calculated data", ee);
                    }
                    switchToLongTask(options);
                });
            }
        }
        else if (data.status === "calculating") {
            if (data.start && (new Date().getTime() - data.start) > 1000 * 60 * 60) {
                options.outputData(err, {"_id": options.id, "running": true});
                return;
            }
            else {
                common.db.collection(collection).deleteOne({_id: options.id}, function(ee) {
                    if (ee) {
                        log.e("Error while deleting calculated data", ee);
                    }
                    switchToLongTask(options);
                });

            }
        }
    }
    else {
        switchToLongTask(options);
        return;
    }
};

calculatedDataManager.saveResult = function(options, data) {
    options.db.collection(collection).updateOne({_id: options.id}, {$set: {status: "done", data: data, lu: new Date()}}, {upsert: true}, function(err) {
        if (err) {
            log.e("Error while saving calculated data", err);
        }
    });
};
calculatedDataManager.getId = function(data) {
    //Period should be given as 2 date
    var keys = ["appID", "event", "name", "queryName", "query", "period", "periodOffset", "bucket"];
    var dataString = "";
    for (var i = 0; i < keys.length; i++) {
        if (data[keys[i]]) {
            dataString += data[keys[i]];
        }
    }
    console.log(dataString);
    console.log(crypto.createHash('sha1').update(dataString).digest('hex'));
    return crypto.createHash('sha1').update(dataString).digest('hex');
};


module.exports = calculatedDataManager;