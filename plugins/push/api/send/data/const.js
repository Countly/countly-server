'use strict';

/* eslint-disable key-spacing, no-multi-spaces */


const DEFAULTS = {
    schedule_ahead: 5 * 60000,  // schedule job needs to be scheduled this much ms prior to the job date
};

/**
 * Internal message states
 * State machine for regular messages:
 *  null
 *      -> Created [created] on insertion
 * 
 *  Created [created]
 *      -> Scheduling [created] during schedule job
 *      -> Created | Deleted [created x] on deletion
 *      -> Created [created results.error] | Error on error before scheduling job
 *  
 *  Scheduling [created]
 *      -> Stremable [scheduled] on schedule job done
 *      -> Scheduling | Error [created results.error] on error during schedule job
 *      -> Done [failed results.error] if no recipients is found during scheduling
 * 
 *  Streamable [scheduled]
 *      -> Streaming [sending] on send job start
 *      -> Streamable | Deleted [scheduled x] on deletion
 *      -> Streamable | Error [scheduled results.error] on error during start of send job
 *      -> Done | Error [failed x results.error='terminated'] on termination
 *      -> Done | Streamable | Error [failed x results.error='terminated'] on termination
 *      -> Done | Error [failed results.error='terminated'] on termination
 *  
 *  Streaming [sending]
 *      -> Done [sent] after send job run
 *      -> Paused [sending results.error] during backoffs
 *      -> ??? Streaming | Error [sending results.error] for recoverable streaming errors
 *      -> Done | Error [failed results.error] after unrecoverable errors or a number of times being Paused 
 *      -> Done | Error [failed results.error='terminated'] on termination
 * 
 *  Streaming | Error [sending results.error]
 *      -> ... same as Streaming ... 
 * 
 *  Paused [sending results.error]
 *      -> Streaming [sending results.error] on next backoff
 *      -> Done | Error [failed results.error] on too many attempts
 *      -> Paused | Deleted [failed x results.error] on deletion
 *  
 *  Done | Error [failed results.error]
 *      -> Streaming [sending] on resume (reset of errors)
 *      -> Done | Error | Deleted [failed x results.error] on deletion
 *      
 * 
 *  
 * State machine for auto/tx messages:
 *  null
 *      -> Streamable [scheduled] for auto/tx
 * 
 *  Created [created]
 *      -> Streamable [scheduled] on activation
 *      -> Created | Deleted [created x] on deletion
 *      -> Created | Error [created results.error] on error during activation
 *  
 *  Streamable [scheduled]
 *      -> Streaming [sending] on send job start
 *      -> Streamable | Deleted [scheduled x] on deletion
 *      -> Streamable | Error [scheduled results.error] on error during start of send job, during /push, /toggle or auto hooks
 *      -> Created [created] when auto/tx are toggled to inactive
 *  
 *  Streaming [sending]
 *      -> Streamable [scheduled] after send job run
 *      -> Paused [sending results.error] during backoffs
 *      -> ??? Streaming | Error [sending results.error] for recoverable streaming errors
 *      -> Done | Error [failed results.error] after unrecoverable errors or a number of times being Paused 
 *      -> !!! Created when auto/tx are toggled to inactive
 *  
 *  Streaming | Error [sending results.error]
 *      -> ... same as Streaming ... 
 * 
 *  Paused [sending results.error]
 *      -> Streaming [sending] on next backoff
 *      -> Done | Error [failed results.error] on too many attempts
 *      -> Paused | Deleted [failed x results.error] on deletion
 * 
 *  Done | Error [failed results.error]
 *      -> Streamable [scheduled] on reactivation / reset of errors
 *      -> Done | Deleted [failed x results.error] on deletion
 * 
 */
const State = {
    Created:    0,              // 0  [created]
    Inactive:   1 << 0,         // 1  [inactive, draft]
    Scheduling: 1 << 1,         // 2  [created] crunching data and putting into queue
    Streamable: 1 << 2,         // 4  [scheduled] in queue, ready to be streamed
    Streaming:  1 << 3,         // 8  [sending] streaming to a sender
    Paused:     1 << 4,         // 16 [sending] paused, exponential backoff, waiting for networking issues to get sorted out
    Done:       1 << 5,         // 32 [sent, stopped, failed] done

    Deleted:    1 << 7,         // 128 Deleted
    Error:      1 << 8,         // 256 Error
    Cleared:    1 << 9          // 512 Cleared queue
};

/**
 * User-facing message statuses.
 */
const Status = {
    Created:    'created',      // [Created] Created, haven't beeing scheduled yet or Stopped for automated/tx (sending is forbidden)
    Inactive:   'inactive',     // [Inactive] Second Created (waiting for approval)
    Draft:      'draft',        // [Inactive] Cannot be sent, can only be duplicated
    Scheduled:  'scheduled',    // [Streamable] Will be sent when appropriate
    Sending:    'sending',      // [Streaming, Paused] Sending right now
    Sent:       'sent',         // [Done] Sent, no further actions
    Stopped:    'stopped',      // [Done] Stopped sending (one time from UI)
    Failed:     'failed',       // [Done] Removed from queue, no further actions
    // pretty much all of above have a corresponding "& Error" companion from State which would make result.error be non empty
};

/**
 * Trigger kinds (types).
 */
const TriggerKind = {
    Plain:      'plain',        // One-time message
    Event:      'event',        // Automated on-event message
    Cohort:     'cohort',       // Automated on-cohort message
    API:        'api',          // API (Transactional) message
};


/* eslint-enable key-spacing, no-multi-spaces */

/**
 * Separator used in property keys
 */
const S = '|';

/**
 * Convert whatever date we have to Date instance
 * 
 * @param {number|string|Date|undefined} date date in any format
 * @returns {Date} Date instance
 */
function toDate(date) {
    if (date) {
        if (typeof date === 'number' || typeof date === 'string') {
            return new Date(date);
        }
        else if (typeof date === 'object') {
            return date;
        }
        else {
            throw new require('./error').PushError(`Invalid date value: ${date}`);
        }
    }
}

/**
 * Base class for push data classes for json getter
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
                else {
                    json[k] = v;
                }
            });
        return json;
    }
}

/**
 * Validation class
 */
class Validatable extends Jsonable {
    /**
     * Class scheme
     */
    static get scheme() {
        throw new Error('Must be overridden');
    }

    /**
     * Validate data 
     * 
     * @param {object} data data to validate
     * @returns {object} common.validateArgs object with replaced by class instance: {errors: [], result: true, obj: Validatable}
     */
    static validate(data) {
        return require('../../../../../api/utils/common').validateArgs(data, this.constructor.scheme, true);
    }

    /**
     * Validate data 
     * 
     * @returns {String[]|undefined} array of string errors or undefined if validation passed
     */
    validate() {
        let ret = require('../../../../../api/utils/common').validateArgs(this._data, this.constructor.scheme, true);
        if (!ret.result) {
            return ret.errors;
        }
    }
}

/**
 * Base class for MongoDB-backed instances
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
        let data = await require('../../../../../api/utils/common').db.collection(this.collection).findOne(query);
        if (data) {
            return new this(data);
        }
        else {
            return null;
        }
    }

    /**
     * Find multiple records in db and map them to instances of this class
     * 
     * @param {object|string} query query for find
     * @returns {This[]} array of instances of this class if the records are found in the database, empty array otherwise
     */
    static async findMany(query) {
        let data = await require('../../../../../api/utils/common').db.collection(this.collection).find(query).toArray();
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
        return await require('../../../../../api/utils/common').db.collection(this.collection).count(query);
    }

    /**
     * Delete record from collection
     * 
     * @param {object} query query for count
     * @returns {Number} count of records in collection satisfying the query
     */
    static async deleteOne(query) {
        return await require('../../../../../api/utils/common').db.collection(this.collection).deleteOne(query);
    }

    /**
     * Pass current data to mongo's save
     */
    async save() {
        await require('../../../../../api/utils/common').db.collection(this.constructor.collection).save(this.json);
    }

    /**
     * Run an update operation modifying this's _data
     * 
     * @param {object|string} update query for an update
     * @param {function} op op to run to modify state of this in case of success
     */
    async update(update, op) {
        await require('../../../../../api/utils/common').db.collection(this.constructor.collection).updateOne({_id: this._id}, update);
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
        let data = await require('../../../../../api/utils/common').db.collection(this.collection).findOneAndUpdate(filter, update, {returnDocument: 'after'});
        if (data.ok) {
            return new this.constructor(data.value);
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
        let data = await require('../../../../../api/utils/common').db.collection(this.constructor.collection).findOneAndUpdate(filter, update, {returnDocument: 'after'});
        if (data.ok) {
            this.setData(data.value);
            return this;
        }
        return false;
    }
}

module.exports = { S, State, Status, STATUSES: Object.values(Status), TriggerKind, Jsonable, Mongoable, toDate, DEFAULTS };