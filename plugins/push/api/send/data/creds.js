'use strict';

const { Mongoable } = require('./const'),
    log = require('../../../../../api/utils/log')('push:credentials');

/**
 * Credentials base class, to be subclassed by platform specific implementation
 */
class Creds extends Mongoable {
    /**
     * Constructor
     * 
     * @param {object} data object with data
     */
    constructor(data) {
        super(data);
    }

    /**
     * Hash string of the credentials used to compare them
     */
    get hash() {
        return this._data.hash;
    }

    /**
     * Validation scheme of this class
     * 
     * @returns {object} validateArgs scheme
     */
    static get scheme() {
        return {
            _id: { required: false, type: 'ObjectID' },
            type: { required: true, type: 'String' },
        };
    }

    /**
     * Collection name for Mongoable
     */
    static get collection() {
        return 'creds';
    }

    /**
     * Factory method for loading credentials from database and constructing a platform specific Credentials subclass instance.
     * 
     * @param {object|string|ObjectID} query MongoDB query
     * @returns {Creds|null} platform specific Credentials subclass instance or null otherwise
     */
    static async load(query) {
        let c = await Creds.findOne(query);
        if (c) {
            let Cls = require('../platforms').PLATFORM[c._data.platform].CREDS[c._data.type];
            if (Cls) {
                log.d('Loaded credentials %j', query);
                return new Cls(c._data);
            }
            else {
                log.e('No credentials %j for type %s', query, c._data.type);
            }
        }
        else {
            log.w('No credentials for query %j', query);
        }
        return null;
    }

    /**
     * Check whether config was changed
     * 
     * @param {object} neo new config
     * @returns {boolean} true if changed
     */
    equals(neo) {
        return require('../../../../../api/utils/common').equal(this.view, neo.view, true)
            || require('../../../../../api/utils/common').equal(this.json, neo.json, true);
    }

    /**
     * "View" json, that is some truncated/simplified version of credentials that is "ok" to display
     */
    get view() {
        return this.json;
    }

    /**
     * Migrate credentials to new data structures
     * 
     * @deprecated
     * @param {object} c legacy Credentials object
     * @returns {Creds} creds instance
     */
    static fromCredentials(c) {
        let data = {
            _id: c._id,
            type: c.type
        };

        if (c.type === 'apn_token') {
            let comps = c.secret.split('[CLY]');
            if (comps.length !== 3) {
                console.error('Wrong secret for Creds %s/%s', c.type, c._id);
                return null;
            }

            data.key = c.key;
            data.keyid = comps[0];
            data.team = comps[0];
            data.bundle = comps[0];
        }
        else if (c.type === 'apn_universal') {
            data.cert = c.key;
            if (c.secret) {
                data.secret = c.secret;
            }
        }
        else if (c.type === 'fcm') {
            data.key = c.key;
        }
        else if (c.type === 'hms') {
            data.key = c.key;
            data.secret = c.secret;
        }
        else {
            console.error('Cred type %s is unsupported in %s', c.type, c._id);
            return null;
        }

        let Cred = require('../platforms').CREDS[c.type];
        if (!Cred) {
            console.error('Cred type %s is not supported in %s', c.type, c._id);
            return null;
        }
        let cred = new Cred(data);
        if (cred.validate()) {
            console.error('Cred %s validation error', c._id, cred.validate());
            return null;
        }

        return cred;
    }

}

module.exports = { Creds };