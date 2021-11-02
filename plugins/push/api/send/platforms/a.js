const { ConnectionError, ERROR, SendError, PushError } = require('../data/error'),
    logger = require('../../../../../api/utils/log'),
    { Splitter } = require('./utils/splitter'),
    { Creds } = require('../data/creds'),
    { threadId } = require('worker_threads'),
    FORGE = require('node-forge');


/**
 * Platform key
 */
const key = 'a';

/**
 * Extract token & field from token_session request
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} array of [platform, field, token] if qstring has platform-specific token data, undefined otherwise
 */
function extractor(qstring) {
    if (qstring.android_token !== undefined && qstring.test_mode in FIELDS && (!qstring.token_provider || qstring.token_provider === 'FCM')) {
        return [key, FIELDS[qstring.test_mode], qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token];
    }
}

/**
 * Connection implementation for FCM
 */
class FCM extends Splitter {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Credentials} creds FCM server key
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.concurrency number of notifications which can be processed concurrently, this parameter is strictly set to 500
     * @param {string} options.proxy.host proxy host
     * @param {string} options.proxy.port proxy port
     * @param {string} options.proxy.user proxy user
     * @param {string} options.proxy.pass proxy pass
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, Object.assign(options, {concurrency: 500}));

        this.log = logger(log).sub(`wa-${threadId}`);
        this.opts = {
            agent: this.agent,
            hostname: 'fcm.googleapis.com',
            port: 443,
            path: '/fcm/send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `key=${creds._data.key}`,
            },
        };
        this.log.i('Initialized');
    }

    /**
     * Compile & send messages 
     * 
     * @param {Object[]} data pushes to send, no more than 500 per function call as enforced by stream writableHighWaterMark
     * @param {integer} length number of bytes in data
     * @returns {Promise} sending promise
     */
    send(data, length) {
        return this.with_retries(data, length, (pushes, bytes, attempt) => {
            this.log.d('%d-th attempt for %d bytes', attempt, bytes);

            let content = this.template(pushes[0].m).compile(pushes[0]),
                one = Math.floor(pushes.length / bytes);

            content.registration_ids = pushes.map(p => p.t);

            return this.sendRequest(JSON.stringify(content)).then(resp => {
                try {
                    resp = JSON.parse(resp);
                }
                catch (error) {
                    this.log.e('Bad FCM response format: %j', resp, error);
                    throw PushError.deserialize(error);
                }

                if (resp.failure === 0 && resp.canonical_ids === 0) {
                    this.send_results(pushes.map(p => p._id), bytes);
                    return;
                }

                if (resp.results) {
                    let oks = [],
                        errors = {},
                        /**
                         * Get an error for given code & message, create it if it doesn't exist yet
                         * 
                         * @param {number} code error code
                         * @param {string} message error message
                         * @returns {SendError} error instance
                         */
                        error = (code, message) => {
                            let err = code + message;
                            if (!(err in errors)) {
                                errors[err] = new SendError(message, code);
                            }
                            return errors[err];
                        };

                    resp.results.forEach((r, i) => {
                        if (r.message_id) {
                            if (r.registration_id) {
                                oks.push([pushes[i]._id, r.registration_id]);
                                // oks.push([pushes[i]._id, r.registration_id], one); ???
                            }
                            else {
                                oks.push(pushes[i]._id);
                            }
                        }
                        else if (r.error === 'NotRegistered') {
                            this.log.d('Token %s expired (%s)', pushes[i].t, r.error);
                            error(ERROR.DATA_TOKEN_EXPIRED, r.error).addAffected(pushes[i]._id, one);
                        }
                        else if (r.error === 'InvalidRegistration' || r.error === 'MismatchSenderId' || r.error === 'InvalidPackageName') {
                            this.log.d('Token %s is invalid (%s)', pushes[i].t, r.error);
                            error(ERROR.DATA_TOKEN_INVALID, r.error).addAffected(pushes[i]._id, one);
                        }
                        else if (r.error === 'InvalidParameters') { // still hasn't figured out why this error is thrown, therefore not critical yet
                            error(ERROR.DATA_PROVIDER, r.error).addAffected(pushes[i]._id, one);
                        }
                        else if (r.error === 'MessageTooBig' || r.error === 'InvalidDataKey' || r.error === 'InvalidTtl') {
                            error(ERROR.DATA_PROVIDER, '' + r.error).addAffected(pushes[i]._id, one);
                        }
                        else {
                            error(ERROR.DATA_PROVIDER, r.error).addAffected(pushes[i]._id, one);
                        }
                    });
                    let errored = 0;
                    for (let k in errors) {
                        errored += errors[k].affectedBytes;
                        this.send_push_error(errors[k]);
                    }
                    if (oks.length) {
                        this.send_results(oks, bytes - errored);
                    }
                }

            }, ([code, error]) => {
                this.log.w('FCM error %d / %j', code, error);
                if (code === 0) {
                    throw PushError.deserialize(error);
                }
                else if (code >= 500) {
                    throw new ConnectionError(`FCM Unavailable: ${code}`, ERROR.CONNECTION_PROVIDER);
                }
                else if (code === 401) {
                    throw new ConnectionError(`FCM Unauthorized: ${code}`, ERROR.INVALID_CREDENTIALS);
                }
                else if (code === 400) {
                    throw new ConnectionError(`FCM Bad message: ${code}`, ERROR.DATA_PROVIDER);
                }
                else {
                    throw new ConnectionError(`FCM Bad response code: ${code}`, ERROR.EXCEPTION);
                }
            });
        });
    }

}

/** 
 * Flatten object using dot notation ({a: {b: 1}} becomes {'a.b': 1})
 * 
 * @param {object} ob - object to flatten
 * @returns {object} flattened object
 */
function flattenObject(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }

        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }

                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

/**
 * Create new empty payload for the note object given
 * 
 * @param {Message} msg NMessageote object
 * @returns {object} empty payload object
 */
function empty(msg) {
    return {data: {}, c: {i: msg.id}};
}

/**
 * Finish data object after setting all the properties
 * 
 * @param {object} data platform-specific data to finalize
 */
function finish(data) {
    if (!data.data.message && !data.data.sound) {
        data.data.data['c.s'] = 'true';
    }
}

/**
 * Non-personalizable fields of Note which can be sent for Android
 * !NOTE! order matters!
 */
const fields = [
    'sound',
    'badge',
    'delayWhileIdle',
    'collapseKey',
    'url',
    'media',
];

/**
 * Mapping of Content properties to APN payload props
 */
const map = {
    /**
     * Sends sound 
     * @param {Template} t template
     * @param {string} sound sound string
     */
    sound: function(t, sound) {
        if (sound) {
            t.result.data.sound = sound;
        }
    },

    /**
     * Sends badge 
     * @param {Template} t template
     * @param {number} badge badge (0..N)
     */
    badge: function(t, badge) {
        t.result.data.badge = badge;
    },

    /**
     * Sends buttons
     * !NOTE! buttons & messagePerLocale are inter-dependent as buttons urls/titles are locale-specific
     * 
     * @param {Template} t template
     * @param {number} buttons buttons (1..2)
     */
    buttons: function(t, buttons) {
        if (buttons) {
            t.result.c.b = buttons;
        }
    },

    /**
     * Set title string
     * 
     * @param {Template} t template
     * @param {String} title title string
     */
    title: function(t, title) {
        t.result.data.title = title;
    },

    /**
     * Set message string
     * 
     * @param {Template} t template
     * @param {String} message message string
     */
    message: function(t, message) {
        t.result.data.message = message;
    },

    /**
     * Send collapse_key.
     * 
     * @param {Template} template template
     * @param {boolean} ck collapseKey of the Content
     */
    collapseKey: function(template, ck) {
        if (ck) {
            template.collapse_key = ck;
        }
    },

    /**
     * Send timeToLive.
     * 
     * @param {Template} template template
     * @param {boolean} ttl timeToLive of the Content
     */
    timeToLive: function(template, ttl) {
        if (ttl) {
            template.time_to_live = ttl;
        }
    },

    /**
     * Send notification-tap url
     * 
     * @param {Template} template template
     * @param {string} url on-tap url
     */
    url: function(template, url) {
        template.result.data['c.l'] = url;
    },

    /**
     * Send media (picture, video, gif, etc) along with the message.
     * Sets mutable-content in order for iOS extension to be run.
     * 
     * @param {Template} template template
     * @param {string} media attached media url
     */
    media: function(template, media) {
        template.result.data['c.m'] = media;
    },

    /**
     * Sends custom data along with the message
     * 
     * @param {Template} template template
     * @param {Object} data data to be sent
     */
    data: function(template, data) {
        Object.assign(template.result.data, flattenObject(data));
    },

    /**
     * Sends user props along with the message
     * 
     * @param {Template} template template
     * @param {[string]} extras extra user props to be sent
     * @param {Object} data personalization
     */
    extras: function(template, extras, data) {
        for (let i = 0; i < extras.length; i++) {
            let k = extras[i];
            if (data[k] !== null && data[k] !== undefined) {
                template.result.data['c.e.' + k] = data[k];
            }
        }
    },
};

/**
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS = {
    '0': 'p', // prod
    '2': 't', // test
};

/**
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS_TITLES = {
    '0': 'FCM Production Token', // prod
    '2': 'FCM Test Token', // test
};

/**
 * Credential types for FCM
 */
const CREDS = {
    'fcm': class FCMCreds extends Creds {
        /**
         * Validation scheme of this class
         * 
         * @returns {object} validateArgs scheme
         */
        static get scheme() {
            return Object.assign(super.scheme, {
                key: { required: true, type: 'String', 'min-length': 100},
            });
        }

        /**
         * Check credentials for correctness, throw PushError otherwise
         * 
         * @throws PushError in case the check fails
         * @returns {undefined}
         */
        validate() {
            let res = super.validate();
            if (res) {
                return res;
            }
            this._data.hash = FORGE.md.sha1.create().update(this._data.key).digest().toHex();
        }

        /**
         * "View" json, that is some truncated/simplified version of credentials that is "ok" to display
         * 
         * @returns {object} json without sensitive information
         */
        get view() {
            return {
                _id: this._id,
                type: this._data.type,
                key: `FCM server key "${this._data.key.substr(0, 10)} ... ${this._data.key.substr(this._data.key.length - 10)}"`,
                hash: this._data.hash,
            };
        }
    },

};

module.exports = {
    key: 'a',
    title: 'Android',
    extractor,
    FIELDS,
    FIELDS_TITLES,
    CREDS,

    empty,
    finish,
    fields,
    map,
    connection: FCM,

};
