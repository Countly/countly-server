const EventEmitter = require('events');
const crypto = require('crypto');
const cluster = require('cluster');
const plugins = require('../../../plugins/pluginManager.js');
const log = require('../../utils/log.js')("batcher");

/**
 *  Class for batching database operations for aggregated data 
 *  @example
 *  let batcher = new WriteBatcher(common.db);
 *  batcher.set("eventsa8bb6a86cc8026768c0fbb8ed5689b386909ee5c", "no-segment_2020:0_2", {"$set":{"segments.name":true, "name.Runner":true}});
 */
class WriteBatcher extends EventEmitter {
    /**
     *  Create batcher instance
     *  @param {Db} db - database object
     */
    constructor(db) {
        super();
        this.db = db;
        this.data = {};
        plugins.loadConfigs(db, () => {
            this.loadConfig();
            this.schedule();
        });
    }

    /**
     *  Reloads server configs
     */
    loadConfig() {
        let config = plugins.getConfig("api");
        this.period = config.batch_period * 1000;
        this.process = config.batch_processing;
        this.shared = config.batch_on_master;
    }

    /**
     *  Writes data to database for specific collection
     *  @param {string} collection - name of the collection for which to write data
     */
    async flush(collection) {
        if (Object.keys(this.data[collection]).length) {
            var queries = [];
            for (let key in this.data[collection]) {
                if (Object.keys(this.data[collection][key]).length) {
                    queries.push({
                        updateOne: {
                            filter: {_id: this.data[collection][key].id},
                            update: this.data[collection][key].value,
                            upsert: true
                        }
                    });
                }
            }
            this.data[collection] = {};
            try {
                await this.db.collection(collection).bulkWrite(queries, {ordered: false});
                this.emit("flushed");
            }
            catch (ex) {
                this.emit("error", ex);
                log.e("Error updating documents", ex);

                //trying to rollback operations to try again on next iteration
                for (let i = 0; i < queries.length; i++) {
                    //if we don't have anything for this document yet just use query
                    if (!this.data[collection][queries[i].updateOne.filter._id]) {
                        this.data[collection][queries[i].updateOne.filter._id] = {id: queries[i].updateOne.filter._id, value: queries[i].updateOne.update};
                    }
                    else {
                        //if we have, then we can try to merge query back in
                        this.data[collection][queries[i].updateOne.filter._id].value = mergeQuery(queries[i].updateOne.update, this.data[collection][queries[i].updateOne.filter._id].value);
                    }
                }
            }
        }
    }

    /**
     *  Run all pending database queries
     */
    flushAll() {
        let promises = [];
        for (let collection in this.data) {
            promises.push(this.flush(collection));
        }
        Promise.all(promises).finally(() => {
            this.schedule();
        });
    }

    /**
     *  Schedule next flush
     */
    schedule() {
        setTimeout(() => {
            this.loadConfig();
            this.flushAll();
        }, this.period);
    }

    /**
     *  Get operation on document by id
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} id - id of the document
     *  @returns {object} bulkwrite query for document by reference, you can modify it synchronously or data may be lost
     */
    get(collection, id) {
        if (!this.data[collection]) {
            this.data[collection] = {};
        }
        if (!this.data[collection][id]) {
            this.data[collection][id] = {id: id, value: {}};
        }
        return this.data[collection][id].value;
    }

    /**
     *  Provide operation for document id and batcher will try to merge multiple operations
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} id - id of the document
     *  @param {object} operation - operation
     */
    add(collection, id, operation) {
        if (!this.shared) {
            if (!this.data[collection]) {
                this.data[collection] = {};
            }
            if (!this.data[collection][id]) {
                this.data[collection][id] = {id: id, value: operation};
            }
            else {
                this.data[collection][id].value = mergeQuery(this.data[collection][id].value, operation);
            }
            if (!this.process) {
                this.flush(collection);
            }
        }
        else {
            process.send({ cmd: "batch_write", data: {collection, id, operation} });
        }
    }
}

/**
 *  Class for caching read from database
 *  @example
 *  let batcher = new ReadBatcher(common.db);
 *  let promise = batcher.getOne("events", {"_id":"5689b386909ee5c"});
 */
class ReadBatcher extends EventEmitter {
    /**
     *  Create batcher instance
     *  @param {Db} db - database object
     */
    constructor(db) {
        super();
        this.db = db;
        this.data = {};
        this.promises = {};
        plugins.loadConfigs(db, () => {
            this.loadConfig();
            this.schedule();
        });

        if (!cluster.isMaster) {
            process.on("message", (msg) => {
                if (msg.cmd === "batch_read" && msg.data && msg.data.msgId && this.promises[msg.data.msgId]) {
                    if (msg.data.data) {
                        this.promises[msg.data.msgId].resolve(msg.data.data);
                    }
                    else {
                        this.promises[msg.data.msgId].reject(msg.data.err);
                    }
                    delete this.promises[msg.data.msgId];
                }
            });
        }
    }

    /**
     *  Reloads server configs
     */
    loadConfig() {
        let config = plugins.getConfig("api");
        this.period = config.batch_read_period * 1000;
        this.ttl = config.batch_read_ttl * 1000;
        this.process = config.batch_read_processing;
        this.onMaster = config.batch_read_on_master;
    }

    /**
     *  Get data from database
     *  @param {string} collection - name of the collection for which to write data
     *  @param {string} id - id of cache
     *  @param {string} query - query for the document
     *  @param {string} projection - which fields to return
     *  @param {bool} multi - true if multiple documents
     *  @returns {Promise} promise
     */
    getData(collection, id, query, projection, multi) {
        return new Promise((resolve, reject) => {
            if (multi) {
                this.db.collection(collection).find(query, projection).toArray((err, res) => {
                    if (!err && res) {
                        this.cache(collection, id, query, projection, res, true);
                        resolve(res);
                    }
                    else {
                        reject(err);
                    }
                });
            }
            else {
                this.db.collection(collection).findOne(query, projection, (err, res) => {
                    if (!err && res) {
                        this.cache(collection, id, query, projection, res, false);
                        resolve(res);
                    }
                    else {
                        reject(err);
                    }
                });
            }
        });
    }

    /**
     *  Check all cache
     */
    checkAll() {
        for (let collection in this.data) {
            if (Object.keys(this.data[collection]).length) {
                for (let id in this.data[collection]) {
                    if (this.data[collection][id].last_used < Date.now() - this.ttl) {
                        delete this.data[collection][id];
                    }
                }
            }
        }

        this.schedule();
    }

    /**
     *  Schedule next flush
     */
    schedule() {
        setTimeout(() => {
            this.loadConfig();
            this.checkAll();
        }, this.period);
    }

    /**
	* Gets list of keys from projection object which are included
	*  @param {object} projection - which fields to return
	*  @returns {object} {keys - list of keys, have_projection - true if projection not empty}
	*/
    keysFromProjectionObject(projection) {
        var keysSaved = [];
        var have_projection = false;
        projection = projection || {};

        if (projection.projection && typeof projection.projection === 'object') {
            projection = projection.projection;
        }

        if (projection.fields && typeof projection.fields === 'object') {
            projection = projection.fields;
        }

        for (var k in projection) {
            have_projection = true;
            if (projection[k] === 1) {
                keysSaved.push(k);
            }
        }
        return {"keys": keysSaved, "have_projection": have_projection};
    }

    /**
     *  Get data from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {object} query - query for the document
     *  @param {object} projection - which fields to return
     *  @param {bool} multi - true if multiple documents
     *  @returns {Promise} promise
     */
    get(collection, query, projection, multi) {
        if (!this.onMaster || cluster.isMaster) {
            var id = JSON.stringify(query);
            if (!this.data[collection]) {
                this.data[collection] = {};
            }
            var good_projection = true;
            var keysSaved = this.keysFromProjectionObject(this.data[collection][id] && this.data[collection][id].projection);
            var keysNew = this.keysFromProjectionObject(projection);

            if (this.data[collection][id] && (keysSaved.have_projection || keysNew.have_projection)) {
                if (keysSaved.have_projection) {
                    for (let p = 0; p < keysNew.keys.length; p++) {
                        if (keysSaved.keys.indexOf(keysNew.keys[p]) === -1) {
                            good_projection = false;
                            keysSaved.keys.push(keysNew.keys[p]);
                        }
                    }
                }
                if (!good_projection) {
                    projection = {};
                    for (var p = 0; p < keysSaved.keys.length; p++) {
                        projection[keysSaved.keys[p]] = 1;
                    }
                }
            }

            if (!good_projection || !this.data[collection][id] || this.data[collection][id].last_updated < Date.now() - this.period) {
                return this.getData(collection, id, query, projection, multi);
            }
            else {
                this.data[collection][id].last_used = Date.now();

                return new Promise((resolve) => {
                    resolve(this.data[collection][id].data);
                });
            }
        }
        else {
            return new Promise((resolve, reject) => {
                let msgId = getId();
                this.promises[msgId] = {resolve, reject};
                process.send({ cmd: "batch_read", data: {collection, query, projection, multi, msgId} });
            });
        }
    }

    /**
     *  Get single document from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} query - query for the document
     *  @param {string} projection - which fields to return
     *  @param {function=} callback - optional to get result, or else will return promise
     *  @returns {Promise} if callback not passed, returns promise
     */
    getOne(collection, query, projection, callback) {
        if (typeof projection === "function") {
            callback = projection;
            projection = {};
        }
        if (!projection) {
            projection = {};
        }
        return promiseOrCallback(this.get(collection, query, projection, false), callback);
    }

    /**
     *  Get multiple document from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} query - query for the document
     *  @param {string} projection - which fields to return
     *  @param {function=} callback - optional to get result, or else will return promise
     *  @returns {Promise} if callback not passed, returns promise
     */
    getMany(collection, query, projection, callback) {
        if (typeof projection === "function") {
            callback = projection;
            projection = {};
        }
        if (!projection) {
            projection = {};
        }
        return promiseOrCallback(this.get(collection, query, projection, true), callback);
    }

    /**
     *  Cache data read from database
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} id - id of the cache
     *  @param {string} query - query for the document
     *  @param {string} projection - which fields to return
     *  @param {object} data - data from database
     *  @param {bool} multi - true if multiple documents
     */
    cache(collection, id, query, projection, data, multi) {
        if (this.process) {
            this.data[collection][id] = {
                query: query,
                data: data,
                projection: projection,
                last_used: Date.now(),
                last_updated: Date.now(),
                multi: multi
            };
        }
    }
}

/**
 *  Return promise or callback based on params
 *  @param {Promise} promise - promise for data
 *  @param {function=} callback - callback to call
 *  @returns {Promise} Returned promise
 */
function promiseOrCallback(promise, callback) {
    if (typeof callback === "function") {
        return promise.then(function(data) {
            callback(null, data);
        })
            .catch(function(err) {
                callback(err, null);
            });
    }
    return promise;
}

/**
 *  Merge 2 mongodb update queries
 *  @param {object} ob1 - existing database update query
 *  @param {object} ob2 - addition to database update query
 *  @returns {object} merged database update query
 */
function mergeQuery(ob1, ob2) {
    if (ob2) {
        for (let key in ob2) {
            if (!ob1[key]) {
                ob1[key] = ob2[key];
            }
            else if (key === "$set" || key === "$setOnInsert" || key === "$unset") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob2[key][val];
                }
            }
            else if (key === "$addToSet") {
                for (let val in ob2[key]) {
                    if (typeof ob1[key][val] !== 'object') {
                        ob1[key][val] = {'$each': [ob1[key][val]]};
                    }

                    if (typeof ob2[key][val] === 'object' && ob2[key][val].$each) {
                        for (var p = 0; p < ob2[key][val].$each.length; p++) {
                            ob1[key][val].$each.push(ob2[key][val].$each[p]);
                        }
                    }
                    else {
                        ob1[key][val].$each.push(ob2[key][val]);
                    }
                }
            }
            else if (key === "$inc") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || 0;
                    ob1[key][val] += ob2[key][val];
                }
            }
            else if (key === "$mul") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || 0;
                    ob1[key][val] *= ob2[key][val];
                }
            }
            else if (key === "$min") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || ob2[key][val];
                    ob1[key][val] = Math.min(ob1[key][val], ob2[key][val]);
                }
            }
            else if (key === "$max") {
                for (let val in ob2[key]) {
                    ob1[key][val] = ob1[key][val] || ob2[key][val];
                    ob1[key][val] = Math.max(ob1[key][val], ob2[key][val]);
                }
            }
        }
    }

    return ob1;
}

/**
 *  Generate random id
 *  @returns {string} randomly generated id
 */
function getId() {
    return crypto.randomBytes(16).toString("hex");
}

module.exports = {WriteBatcher, ReadBatcher};