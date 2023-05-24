const mongodb = require('mongodb');

/**
 * Base class for data classes for json getter
 * 
 * @see push/api/data/* for examples
 */
class Jsonable {
    /**
     * Constructor
     * 
     * @param {object} data data object
     */
    constructor(data = {}) {
        this.setData(data);
    }

    /**
     * Set data doing any decoding / transformations along the way
     * 
     * @param {object} data data to set
     */
    setData(data) {
        this._data = Object.assign({}, data);
    }

    /**
     * Update internal data doing any decoding / transformations along the way
     * 
     * @param {object} update data update
     */
    updateData(update) {
        Object.assign(this._data, update);
    }

    /**
     * Get new object containing all fields ready for sending to client side
     */
    get json() {
        let json = {};
        Object.keys(this._data)
            .filter(k => this._data[k] !== null && this._data[k] !== undefined)
            .forEach(k => {
                let v = this._data[k];
                if (v instanceof Jsonable) {
                    json[k] = v.json;
                }
                else if (Array.isArray(v)) {
                    json[k] = v.map(x => x instanceof Jsonable ? x.json : x);
                }
                else if (typeof v === 'object') {
                    let ret = {};
                    for (let key in v) {
                        if (v[key] && v[key] instanceof Jsonable) {
                            ret[key] = v[key].json;
                        }
                        else {
                            ret[key] = v[key];
                        }
                    }
                    json[k] = ret;
                }
                else {
                    json[k] = v;
                }
            });
        return json;
    }

    /**
     * Compatibility layer for cache & standard node.js functions IPC
     * 
     * @returns {string} json string
     */
    toJSON() {
        return this.json;
    }
}

/**
 * Validation class
 * 
 * @see push/api/data/* for examples
 */
class Validatable extends Jsonable {
    /**
     * Class scheme
     */
    static get scheme() {
        throw new Error('Must be overridden');
    }

    /**
     * Class schema per given data, allows schema variativity for given data (validates according to subclasses schemas using a discriminator field)
     * @see push/api/data/trigger.js
     * 
     * @returns {object} class schema by default
     */
    static discriminator(/*data*/) {
        return this.constructor.scheme;
    }

    /**
     * Override Jsonable logic allowing only valid data to be saved
     */
    get json() {
        let json = {},
            scheme = this.constructor.scheme;
        Object.keys(scheme)
            .filter(k => this._data[k] !== null && this._data[k] !== undefined)
            .forEach(k => {
                let v = this._data[k];
                if (v instanceof Validatable) {
                    json[k] = v.json;
                }
                else if (Array.isArray(v)) {
                    json[k] = v.map(x => x instanceof Validatable ? x.json : x);
                }
                else if (scheme[k].type === 'Object') {
                    let ret = {};
                    for (let key in v) {
                        if (v[key] && v[key] instanceof Validatable) {
                            ret[key] = v[key].json;
                        }
                        else {
                            ret[key] = v[key];
                        }
                    }
                    json[k] = ret;
                }
                else {
                    let valid = require('./common').validateArgs({data: this._data[k]}, {data: scheme[k]});
                    if (valid) {
                        json[k] = valid.data;
                    }
                }
            });
        return json;
    }

    /**
     * Validate data 
     * 
     * @param {object} data data to validate
     * @param {object} scheme optional scheme override
     * @returns {object} common.validateArgs object with replaced by class instance: {errors: [], result: true, obj: Validatable}
     */
    static validate(data, scheme) {
        return require('./common').validateArgs(data, scheme || this.scheme, true);
    }

    /**
     * Validate data 
     * 
     * @returns {String[]|undefined} array of string errors or undefined if validation passed
     */
    validate() {
        let ret = require('./common').validateArgs(this._data, this.constructor.scheme, true);
        if (!ret.result) {
            return ret.errors;
        }
    }
}

/**
 * Base class for MongoDB-backed instances
 * 
 * @see push/api/data/* for examples
 */
class Mongoable extends Validatable {
    /**
     * Must be overridden in subclasses to return collection name
     */
    static get collection() {
        throw new Error('Not implemented');
    }

    /**
     * Getter for id as a string
     */
    get id() {
        return this._data._id ? this._data._id.toString() : undefined;
    }

    /**
     * Getter for id as is
     */
    get _id() {
        return this._data._id;
    }

    /**
     * Setter for _id
     * 
     * @param {ObjectID} id ObjectID value
     */
    set _id(id) {
        if (id !== null && id !== undefined) {
            this._data._id = id;
        }
        else {
            delete this._data._id;
        }
    }

    /**
     * Find a record in db and map it to instance of this class 
     * 
     * @param {object|string} query query for findOne
     * @returns {This|null} instance of this class if the record is found in database, null otherwise
     */
    static async findOne(query) {
        if (typeof query === 'string') {
            query = {_id: require('./common').db.ObjectID(query)};
        }
        else if (query instanceof mongodb.ObjectId) {
            query = {_id: query};
        }
        let data = await require('./common').db.collection(this.collection).findOne(query);
        if (data) {
            return new this(data);
        }
        else {
            return null;
        }
    }

    /**
     * Refresh current instance with data from the database 
     * 
     * @returns {This|boolean} this instance of this class if the record is found in database, false otherwise
     */
    async refresh() {
        let data = await require('./common').db.collection(this.constructor.collection).findOne({_id: this._id});
        if (data) {
            this.setData(data);
            return this;
        }
        else {
            return false;
        }
    }

    /**
     * Find multiple records in db and map them to instances of this class
     * 
     * @param {object|string} query query for find
     * @returns {This[]} array of instances of this class if the records are found in the database, empty array otherwise
     */
    static async findMany(query) {
        let data = await require('./common').db.collection(this.collection).find(query).toArray();
        if (data && data.length) {
            let Constr = this;
            return data.map(dt => new Constr(dt));
        }
        else {
            return [];
        }
    }

    /**
     * Count records in collection
     * 
     * @param {object} query query for count
     * @returns {Number} count of records in collection satisfying the query
     */
    static async count(query) {
        return await require('./common').db.collection(this.collection).count(query);
    }

    /**
     * Delete record from collection
     * 
     * @param {object} query query for count
     * @returns {Number} count of records in collection satisfying the query
     */
    static async deleteOne(query) {
        return await require('./common').db.collection(this.collection).deleteOne(query);
    }

    /**
     * Pass current data to mongo's save
     */
    async save() {
        let json = this.json;
        await require('./common').db.collection(this.constructor.collection).updateOne({_id: this._id}, {$set: json}, {upsert: true});
    }

    /**
     * Run an update operation modifying this's _data
     * 
     * @param {object|string} update query for an update
     * @param {function} op op to run to modify state of this in case of success
     */
    async update(update, op) {
        await require('./common').db.collection(this.constructor.collection).updateOne({_id: this._id}, update);
        return op(this);
    }

    /**
     * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
     * 
     * @param {object|string} filter filter for an update
     * @param {object|string} update modify for a findAndModify
     * @returns {boolean} true in case of success, false otherwise
     */
    static async findOneAndUpdate(filter, update) {
        let data = await require('./common').db.collection(this.collection).findOneAndUpdate(filter, update, {returnDocument: 'after'});
        if (data.ok) {
            return new this(data.value);
        }
        return false;
    }

    /**
     * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
     * 
     * @param {object|string} filter filter for an update
     * @param {object|string} update modify for a findAndModify
     * @returns {boolean} true in case of success, false otherwise
     */
    async updateAtomically(filter, update) {
        let data = await require('./common').db.collection(this.constructor.collection).findOneAndUpdate(filter, update, {returnDocument: 'after'});
        if (data.ok) {
            this.setData(data.value);
            return this;
        }
        return false;
    }

    /**
     * Simple batch insert object:
     * 
     * let batch = Model.batchInsert(3);
     * await batch.pushAsync({a: 1});
     * await batch.pushAsync({a: 2});
     * await batch.pushAsync({a: 3}); // <- insertMany here
     * await batch.pushAsync({a: 4});
     * ... 
     * await batch.flush(); // flush the rest
     * 
     * --- or ---
     * 
     * for (let n of [1, 2, 3]) {
     *     if (batch.pushSync({a: 1})) {
     *         await batch.flush();
     *     }
     * }
     * 
     * @param {number} batch batch size
     * @returns {object} with 2 async methods: push(record) and flush()
     */
    static batchInsert(batch = 10000) {
        let buffer = [],
            total = 0,
            collection = require('./common').db.collection(this.collection);
        return {
            /**
             * Get current batch buffer length
             */
            get length() {
                return buffer.length;
            },

            /**
             * Get current batch buffer length
             */
            get total() {
                return total;
            },

            /**
             * Async push, that is if we're ok with a promise per insert
             * 
             * @param {object} record document to insert
             */
            async pushAsync(record) {
                total++;
                buffer.push(record);
                if (buffer.length >= batch) {
                    await this.flush();
                }
            },

            /**
             * Sync push, that is if we're NOT ok with a promise per insert
             * 
             * @param {object} record document to insert
             * @returns {boolean} true if buffer needs to be flush()ed
             */
            pushSync(record) {
                total++;
                buffer.push(record);
                return buffer.length >= batch;
            },

            /**
             * Flush the buffer by inserting documents into collection
             * 
             * @param {number[]} ignore_codes error codes to ignore
             */
            async flush(ignore_codes = []) {
                if (buffer.length) {
                    try {
                        let res = await collection.insertMany(buffer);
                        total -= (buffer.length - res.insertedCount);
                        buffer = [];
                        return res.insertedIds;
                    }
                    catch (e) {
                        if (e.result && e.result.result && e.result.result.insertedIds) {
                            total -= (buffer.length - e.result.insertedCount);
                        }
                        if (!e.code || ignore_codes.indexOf(e.code) === -1) {
                            throw e;
                        }
                        else {
                            buffer = [];
                            return e.result.result.insertedIds;
                        }
                    }
                }
            }
        };
    }

}

module.exports = { Jsonable, Validatable, Mongoable };