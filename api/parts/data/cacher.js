const plugins = require('../../../plugins/pluginManager.js');
//const log = require('../../utils/log.js')("cacher");

/**
 * Use it to read data and keep cached in memory in transformed state.
 */
class Cacher {
/**
     *  Create batcher instance
     *  @param {Db} db - database object
     *  @param {object} options - options object
     */
    constructor(db, options) {
        this.db = db;
        this.data = {};
        this.promises = {};
        this.options = options || {};

        this.transformationFunctions = {};
        var configs_db = (this.options.configs_db || this.db);
        plugins.loadConfigs(configs_db, () => {
            this.loadConfig(options);
            this.schedule();
        });
    }

    /**
     *  Reloads server configs
     */
    loadConfig() {
        let config = plugins.getConfig("api");
        this.period = config.batch_read_period * 1000;
        this.ttl = config.batch_read_ttl * 1000;
        this.process = config.batch_processing;

        if (this.options && this.options.ttl) {
            this.ttl = this.options.ttl * 1000;
            this.process = true;
        }
        if (this.options && this.options.period) {
            this.period = this.options.period * 1000;
            this.process = true;
        }
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
     *  Get data from database
     *  @param {string} collection - name of the collection for which to write data
     *  @param {string} id - id of cache
     *  @param {string} query - query for the document
     *  @param {string} projection - which fields to return
     *  @param {string} transformation - transformation function name
     *  @param {bool} multi - true if multiple documents
     *  @returns {Promise} promise
     */
    getData = async function(collection, id, query, projection, transformation, multi) {
        var res;
        if (multi) {
            try {
                res = await this.db.collection(collection).find(query, projection).toArray();
                if (transformation && this.transformationFunctions[transformation]) {
                    res = this.transformationFunctions[transformation](res);
                }
                this.cache(collection, id, query, projection, res, true);
                return res;
            }
            catch (err) {
                if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                    this.data[collection][id].promise = null;
                }
                throw err;
            }
        }
        else {
            try {
                res = await this.db.collection(collection).findOne(query, projection);
                res = res || {};
                if (transformation && this.transformationFunctions[transformation]) {
                    res = this.transformationFunctions[transformation](res);
                }
                this.cache(collection, id, query, projection, res, false);
                return res;
            }
            catch (err) {
                if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                    this.data[collection][id].promise = null;
                }
                throw err;
            }
        }
    };

    /**
     *  Get data from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {object} query - query for the document
     *  @param {object} projection - which fields to return
     *  @param {object} transformation - transformation function name
     *  @param {bool} refetch - true if need to refetch
     *  @param {bool} multi - true if multiple documents
     *  @returns {Promise} promise
     */
    get(collection, query, projection, transformation, refetch, multi) {
        var id = JSON.stringify(query) + "_" + multi;
        if (transformation) {
            id += "_" + JSON.stringify(transformation);
        }
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

        if (refetch || !this.process || !good_projection || !this.data[collection][id] || (this.data[collection][id].last_updated < Date.now() - this.period)) {
            if (this.process) {
                this.data[collection][id] = {
                    query: query,
                    promise: this.getData(collection, id, query, projection, transformation, multi),
                    projection: projection,
                    last_used: Date.now(),
                    last_updated: Date.now(),
                    multi: multi
                };
                return this.data[collection][id].promise;
            }
            else {
                return this.getData(collection, id, query, projection, transformation, multi);
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

    /**
     *  Get single document from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {string} query - query for the document
     *  @param {object} options - options object
     *  @param {function=} callback - optional to get result, or else will return promise
     *  @returns {Promise} if callback not passed, returns promise
     */
    getOne(collection, query, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }
        return promiseOrCallback(this.get(collection, query, options.projection, options.transformation, options.refetch, false), callback);
    }


    /**
     *  Get multiple documents from cache or from db and cache it
     *  @param {string} collection - name of the collection where to update data
     *  @param {object} query - query for the documents
     *  @param {object} options - options object
     *  @param {function=} callback - optional to get result, or else will return promise
     *  @returns {Promise} if callback not passed, returns promise
     */
    getMany(collection, query, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }
        return promiseOrCallback(this.get(collection, query, options.projection, options.transformation, options.refetch, true), callback);
    }

    /**
     * 
     * @param {string} collection  - collection name
     * @param {object} query  - query to match data
     * @param {object} update  - data object to update
     */
    updateCacheOne(collection, query, update) {
        var id = JSON.stringify(query) + "_" + false;
        if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].data) {
            for (var key in update) {
                this.data[key] = update[key];
            }
        }
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
        var id = JSON.stringify(query) + "_" + multi;
        if (!this.data[collection]) {
            this.data[collection] = {};
        }
        if (this.data[collection][id] && !this.data[collection][id].promise) {
            delete this.data[collection][id];
        }
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

module.exports = {Cacher};