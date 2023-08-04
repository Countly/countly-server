const crypto = require('crypto');
const cluster = require('cluster');
const plugins = require('../../../plugins/pluginManager.js');
const log = require('../../utils/log.js')("batcher");
const common = require('../../utils/common.js');


/**
 *  Class for batching database insert operations
 *  @example
 *  let batcher = new InsertBatcher(common.db);
 *  batcher.insert("drill_eventsa8bb6a86cc8026768c0fbb8ed5689b386909ee5c", document);
 */
class InsertBatcher {
    /**
     *  Create batcher instance
     *  @param {Db} db - database object
     */
    constructor(db) {
        this.dbs = {countly: db};
        this.data = {countly: {}};
        plugins.loadConfigs(db, () => {
            this.loadConfig();
            this.schedule();
        });
    }

    /**
     *  Add another database to batch
     *  @param {string} name - name of the database
     *  @param {Db} connection - MongoDB connection to that database
     */
    addDb(name, connection) {
        this.dbs[name] = connection;
        this.data[name] = {};
    }

    /**
     *  Reloads server configs
     */
    loadConfig() {
        let config = plugins.getConfig("api");
        this.period = config.batch_period * 1000;
        this.process = config.batch_processing;
        this.shared = false;
    }

    /**
     *  Writes data to database for specific collection
     *  @param {string} db - name of the database for which to write data
     *  @param {string} collection - name of the collection for which to write data
     */
    async flush(db, collection) {
        var no_fallback_errors = [10334, 17419, 14, 56];
        if (this.data[db][collection].length) {
            var docs = this.data[db][collection];
            this.data[db][collection] = [];
            try {
                await new Promise((resolve, reject) => {
                    this.dbs[db].collection(collection).insertMany(docs, {ordered: false, ignore_errors: [11000]}, function(err, res) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
                });
            }
            catch (ex) {
                if (ex.code !== 11000) {
                    log.e("Error inserting documents into", db, collection, ex, ex.writeErrors);
                }

                //trying to rollback operations to try again on next iteration
                if (ex.writeErrors && ex.writeErrors.length) {
                    for (let i = 0; i < ex.writeErrors.length; i++) {
                        if (no_fallback_errors.indexOf(ex.writeErrors[i].code) !== -1) {
                            continue;
                        }
                        let index = ex.writeErrors[i].index;
                        if (docs[index]) {
                            this.data[db][collection].push(docs[index]);
                        }
                    }
                }
            }
        }
    }

    /**
     *  Run all pending database queries
     *  @returns {Promise} promise
     */
    flushAll() {
        let promises = [];
        for (let db in this.data) {
            for (let collection in this.data[db]) {
                promises.push(this.flush(db, collection));
            }
        }
        return Promise.all(promises).finally(() => {
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
     *  Provide provide a document to insert into collection
     *  @param {string} collection - name of the collection where to update data
     *  @param {Object|Array} doc - one document or array of documents to insert
     *  @param {string} db - name of the database for which to write data
     */
    insert(collection, doc, db = "countly") {
        if (!this.shared || cluster.isMaster) {
            if (!this.data[db][collection]) {
                this.data[db][collection] = [];
            }
            if (Array.isArray(doc)) {
                for (let i = 0; i < doc.length; i++) {
                    this.data[db][collection].push(doc[i]);
                }
            }
            else {
                this.data[db][collection].push(doc);
            }
            if (!this.process) {
                this.flush(db, collection);
            }
        }
        else {
            process.send({ cmd: "batch_insert", data: {collection, doc, db} });
        }
    }
}

/**
 *  Class for batching database operations for aggregated data 
 *  @example
 *  let batcher = new WriteBatcher(common.db);
 *  batcher.add("eventsa8bb6a86cc8026768c0fbb8ed5689b386909ee5c", "no-segment_2020:0_2", {"$set":{"segments.name":true, "name.Runner":true}});
 */
class WriteBatcher {
    /**
     *  Create batcher instance
     *  @param {Db} db - database object
     */
    constructor(db) {
        this.dbs = {countly: db};
        this.data = {countly: {}};
        plugins.loadConfigs(db, () => {
            this.loadConfig();
            this.schedule();
        });
    }

    /**
     *  Add another database to batch
     *  @param {string} name - name of the database
     *  @param {Db} connection - MongoDB connection to that database
     */
    addDb(name, connection) {
        this.dbs[name] = connection;
        this.data[name] = {};
    }

    /**
     *  Reloads server configs
     */
    loadConfig() {
        let config = plugins.getConfig("api");
        this.period = config.batch_period * 1000;
        this.process = config.batch_processing;
        this.shared = false;
    }

    /**
     *  Writes data to database for specific collection
     *  @param {string} db - name of the database for which to write data
     *  @param {string} collection - name of the collection for which to write data
     */
    async flush(db, collection) {
        var no_fallback_errors = [10334, 17419, 14, 56];
        if (Object.keys(this.data[db][collection]).length) {
            var queries = [];
            for (let key in this.data[db][collection]) {
                if (Object.keys(this.data[db][collection][key]).length) {
                    queries.push({
                        updateOne: {
                            filter: {_id: this.data[db][collection][key].id},
                            update: this.data[db][collection][key].value,
                            upsert: true
                        }
                    });
                }
            }
            this.data[db][collection] = {};
            try {
                await new Promise((resolve, reject) => {
                    this.dbs[db].collection(collection).bulkWrite(queries, {ordered: false, ignore_errors: [11000]}, function(err, res) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
                });
            }
            catch (ex) {
                if (ex.code !== 11000) {
                    log.e("Error updating documents into", db, collection, ex, ex.writeErrors);
                }

                //trying to rollback operations to try again on next iteration
                if (ex.writeErrors && ex.writeErrors.length) {
                    for (let i = 0; i < ex.writeErrors.length; i++) {
                        if (no_fallback_errors.indexOf(ex.writeErrors[i].code) !== -1) {
                            continue;
                        }
                        let index = ex.writeErrors[i].index;
                        if (queries[index]) {
                            //if we don't have anything for this document yet just use query
                            if (!this.data[db][collection][queries[index].updateOne.filter._id]) {
                                this.data[db][collection][queries[index].updateOne.filter._id] = {id: queries[index].updateOne.filter._id, value: queries[index].updateOne.update};
                            }
                            else {
                                //if we have, then we can try to merge query back in
                                this.data[db][collection][queries[index].updateOne.filter._id].value = common.mergeQuery(queries[index].updateOne.update, this.data[db][collection][queries[index].updateOne.filter._id].value);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     *  Run all pending database queries
     *  @returns {Promise} promise
     */
    flushAll() {
        let promises = [];
        for (let db in this.data) {
            for (let collection in this.data[db]) {
                promises.push(this.flush(db, collection));
            }
        }
        return Promise.all(promises).finally(() => {
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
     *  @param {string} db - name of the database for which to write data
     *  @returns {object} bulkwrite query for document by reference, you can modify it synchronously or data may be lost
     */
    get(collection, id, db = "countly") {
        if (!this.data[db][collection]) {
            this.data[db][collection] = {};
        }
        if (!this.data[db][collection][id]) {
            this.data[db][collection][id] = {id: id, value: {}};
        }
        return this.data[db][collection][id].value;
    }

    /**
     *  Provide operation for document id and batcher will try to merge multiple operations
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} id - id of the document
     *  @param {object} operation - operation
     *  @param {string} db - name of the database for which to write data
     */
    add(collection, id, operation, db = "countly") {
        if (!this.shared || cluster.isMaster) {
            if (!this.data[db][collection]) {
                this.data[db][collection] = {};
            }
            if (!this.data[db][collection][id]) {
                this.data[db][collection][id] = {id: id, value: operation};
            }
            else {
                this.data[db][collection][id].value = common.mergeQuery(this.data[db][collection][id].value, operation);
            }
            if (!this.process) {
                this.flush(db, collection);
            }
        }
        else {
            process.send({ cmd: "batch_write", data: {collection, id, operation, db} });
        }
    }
}

/**
 *  Class for caching read from database
 *  @example
 *  let batcher = new ReadBatcher(common.db);
 *  let promise = batcher.getOne("events", {"_id":"5689b386909ee5c"});
 */
class ReadBatcher {
    /**
     *  Create batcher instance
     *  @param {Db} db - database object
     */
    constructor(db) {
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
        this.onMaster = false;
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
                    if (!err) {
                        this.cache(collection, id, query, projection, res, true);
                        resolve(res);
                    }
                    else {
                        if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                            this.data[collection][id].promise = null;
                        }
                        reject(err);
                    }
                });
            }
            else {
                this.db.collection(collection).findOne(query, projection, (err, res) => {
                    if (!err) {
                        this.cache(collection, id, query, projection, res, false);
                        resolve(res);
                    }
                    else {
                        if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                            this.data[collection][id].promise = null;
                        }
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
     *  Invalidate specific cache
     *  @param {string} collection - name of the collection where to update data
     *  @param {object} query - query for the document
     *  @param {object} projection - which fields to return
     *  @param {bool} multi - true if multiple documents
     */
    invalidate(collection, query, projection, multi) {
        if (!this.onMaster || cluster.isMaster) {
            var id = JSON.stringify(query) + "_" + multi;
            if (!this.data[collection]) {
                this.data[collection] = {};
            }
            if (this.data[collection][id] && !this.data[collection][id].promise) {
                delete this.data[collection][id];
            }
        }
        else {
            process.send({ cmd: "batch_invalidate", data: {collection, query, projection, multi} });
        }
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
            var id = JSON.stringify(query) + "_" + multi;
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

            if (!this.process || !good_projection || !this.data[collection][id] || this.data[collection][id].last_updated < Date.now() - this.period) {
                if (this.process) {
                    this.data[collection][id] = {
                        query: query,
                        promise: this.getData(collection, id, query, projection, multi),
                        projection: projection,
                        last_used: Date.now(),
                        last_updated: Date.now(),
                        multi: multi
                    };
                    return this.data[collection][id].promise;
                }
                else {
                    return this.getData(collection, id, query, projection, multi);
                }
            }
            //we already have a read for this
            else if (this.data[collection][id] && this.data[collection][id].promise) {
                return this.data[collection][id].promise;
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
 *  Generate random id
 *  @returns {string} randomly generated id
 */
function getId() {
    return crypto.randomBytes(16).toString("hex");
}

module.exports = {WriteBatcher, ReadBatcher, InsertBatcher};