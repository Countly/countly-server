const { ConnectionError, ERROR, SendError, PushError } = require('../data/error'),
    logger = require('../../../../../api/utils/log'),
    { Splitter } = require('./utils/splitter'),
    { Creds } = require('../data/creds'),
    { threadId } = require('worker_threads'),
    { util } = require('../std'),
    https = require('https'),
    qs = require('querystring'),
    FORGE = require('node-forge');


/**
 * Platform key
 */
const key = 'h';

/**
 * Extract token & field from token_session request
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} array of [platform, field, token] if qstring has platform-specific token data, undefined otherwise
 */
function extractor(qstring) {
    if (qstring.android_token !== undefined && (qstring.token_provider === 'HMS' || qstring.token_provider === 'HPK')) {
        const token = qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token;
        return [key, FIELDS['0'], token, util.hashInt(token)];
    }
}

/**
 * Make an estimated guess about request platform
 * 
 * @param {string} userAgent user-agent header
 * @returns {string} platform key if it looks like request made by this platform
 */
function guess(userAgent) {
    return userAgent.includes('Android') && userAgent.includes('Huawei') && key;
}

/**
 * Connection implementation for Huawei Push Kit
 */
class HPK extends Splitter {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ht, hp
     * @param {Credentials} creds HMS server key
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.pool.pushes number of notifications which can be processed concurrently, this parameter is strictly set to 500
     * @param {string} options.proxy.host proxy host
     * @param {string} options.proxy.port proxy port
     * @param {string} options.proxy.user proxy user
     * @param {string} options.proxy.pass proxy pass
     * @param {string} options.proxy.auth proxy require https correctness
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, options);

        this.log = logger(log).sub(`${threadId}-h`);
        this.opts = {
            agent: this.agent,
            hostname: 'push-api.cloud.huawei.com',
            port: 443,
            path: '/v1/' + creds._data.app + '/messages:send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': null,
            },
        };
        this.log.i('Initialized');
    }

    /**
     * Get new access token from Huawei
     * 
     * @return {Promise} resolves to {token: "token string", until: expiration timestamp} or error
     */
    getToken() {
        return new Promise((resolve, reject) => {
            let data = qs.stringify({
                grant_type: 'client_credentials',
                client_id: this.creds._data.app,
                client_secret: this.creds._data.secret
            });

            let req = https.request({
                agent: this.agent,
                hostname: 'oauth-login.cloud.huawei.com',
                port: 443,
                path: '/oauth2/v2/token',
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            }, res => {
                let text = '', json;
                res.on('data', chunk => {
                    text = text + chunk;
                });
                res.on('end', () => {
                    this.log.d('Done updating access token: %s', text);
                    try {
                        json = JSON.parse(text);
                    }
                    catch (e) {
                        this.log.d('Not json received during token acquisition: %j', e);
                    }
                    if (res.statusCode === 200 && json && json.access_token) {
                        resolve({token: json.access_token, expires: Date.now() + json.expires_in * 1000 - 10000});
                    }
                    else if (!json) {
                        reject(new ConnectionError('Authorization error: bad response', ERROR.CONNECTION_PROVIDER));
                    }
                    else if (json.error_description) {
                        reject(new ConnectionError('Huawei authorization error: ' + json.error_description, ERROR.INVALID_CREDENTIALS));
                    }
                    else {
                        reject(new ConnectionError('Authorization error: unknown (' + text + ')', ERROR.CONNECTION_PROVIDER));
                    }
                });
            });

            req.on('error', err => {
                this.log.e('Error during token acquisition: %j', err);
                reject(new ConnectionError('Authorization error' + (err.message && ': ' + err.message || ''), ERROR.CONNECTION_PROVIDER));
            });

            req.end(data);
        });
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
            if (!this.token) {
                return this.getToken().then(token => {
                    if (token && token.token) {
                        this.token = token;
                        this.opts.headers.Authorization = `Bearer ${token.token}`;
                    }
                }).then(() => this.send(data, length));
            }

            this.log.d('%d-th attempt for %d bytes', attempt, bytes);

            let content = this.template(pushes[0].m).compile(pushes[0]),
                one = Math.ceil(bytes / pushes.length);

            content.message.token = pushes.map(p => p.t);

            return this.sendRequest(JSON.stringify(content)).then(resp => {
                try {
                    if (typeof resp === 'string' && resp[0] === '"' && resp[resp.length - 1] === '"') {
                        resp = resp.substring(1, resp.length - 2);
                    }
                    resp = JSON.parse(resp);
                }
                catch (error) {
                    this.log.e('Bad HW response format: %j', resp, error);
                    throw PushError.deserialize(error);
                }


                /**
                 * Send error for all tokens
                 * 
                 * @param {string} message error message
                 * @param {string} code error code
                 * @returns {undefined}
                 */
                let sendFullError = (message, code) => this.send_push_error(new SendError(message, code).setAffected(pushes.map(p => p._id), bytes));

                if (resp.code === '80000000') {
                    this.send_results(pushes.map(p => p._id), bytes);
                }
                else if (resp.code === '80100000') {
                    // Some tokens are successfully sent. Tokens identified by illegal_token are those failed to be sent.
                    try {
                        let sub = JSON.parse(resp.msg),
                            illegal_tokens = sub.illegal_tokens && sub.illegal_tokens.map(t => pushes.filter(p => p.t === t)[0]).filter(x => !!x) || [];

                        if (illegal_tokens.length) {
                            let illegal_bytes = illegal_tokens.length * one;
                            this.send_push_error(new SendError('IllegalToken', ERROR.DATA_TOKEN_INVALID)
                                .setAffected(illegal_tokens.map(p => p._id), illegal_bytes));
                            if (illegal_tokens.length < this.pushes.length) {
                                let successes = pushes.filter(p => illegal_tokens.filter(i => i._id === p._id).length === 0);
                                this.send_results(successes.map(s => s._id), bytes - illegal_bytes);
                            }
                        }
                        else {
                            this.log.w('Failed to filter illegal_tokens, sending success for all: %j / %j', resp, sub);
                            this.send_results(pushes.map(s => s._id), bytes);
                        }
                    }
                    catch (e) {
                        this.log.e('Failed to filter illegal_tokens: %j / %j', resp, e);
                        sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                    }
                }
                else if (resp.code === '80100001') {
                    // Some token parameters are incorrect.
                    this.log.e('Huawei: failed to filter illegal_tokens: %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80100003') {
                    // Incorrect message structure.
                    this.log.e('Huawei: incorrect message structure (80100003) %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80100004') {
                    // The message expiration time is earlier than the current time.
                    this.log.e('Huawei: message expiration time is earlier than the current time (80100004) %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80100013') {
                    // the collapse_key message field is invalid
                    this.log.e('Huawei: the collapse_key message field is invalid (80100013) %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80100016') {
                    // The message contains sensitive information.
                    this.log.e('Huawei: the message contains sensitive information (80100016) %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80200001') {
                    // OAuth authentication error.
                    this.log.w('Huawei auth error (80200001) %j', resp);
                    return this.getToken().then(token => {
                        if (token && token.token) {
                            this.token = token;
                            this.opts.headers.Authorization = `Bearer ${token.token}`;
                        }
                    }).then(() => {
                        throw new PushError('AuthRetryError', ERROR.CONNECTION_PROVIDER);
                    });
                }
                else if (resp.code === '80200003') {
                    // OAuth token expired.
                    this.log.w('Huawei OAuth token expired (80200003) %j', resp);
                    return this.getToken().then(token => {
                        if (token && token.token) {
                            this.token = token;
                            this.opts.headers.Authorization = `Bearer ${token.token}`;
                        }
                    }).then(() => {
                        throw new PushError('AuthRetryError', ERROR.WRONG_CREDENTIALS);
                    });
                }
                else if (resp.code === '80300002') {
                    // The current app does not have the permission to send push messages
                    this.log.e('Huawei: the current app does not have the permission to send push messages (80300002) %j', resp);
                    sendFullError('BadResponse', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '80300007') {
                    // All tokens are invalid
                    sendFullError('IllegalToken', ERROR.DATA_TOKEN_INVALID);
                }
                else if (resp.code === '80300008') {
                    // The message body size exceeds the default value
                    this.log.e('Huawei: the message body size exceeds the default value (80300008) %j', resp);
                    sendFullError('MessageBodyTooBig', ERROR.DATA_COUNTLY);
                }
                else if (resp.code === '80300010') {
                    // The number of tokens in the message body exceeds the default value
                    this.log.e('Huawei: the number of tokens in the message body exceeds the default value (80300010) %j', resp);
                    sendFullError('TooManyTokens', ERROR.DATA_COUNTLY);
                }
                else if (resp.code === '80300011') {
                    // You are not authorized to send high-priority notification messages
                    this.log.e('Huawei: you are not authorized to send high-priority notification messages (80300011) %j', resp);
                    sendFullError('NotAuthorizedPriority', ERROR.DATA_PROVIDER);
                }
                else if (resp.code === '81000001') {
                    // System internal error.
                    this.log.e('Huawei: system internal error. (81000001) %j', resp);
                    sendFullError('InternalHuaweiError', ERROR.CONNECTION_PROVIDER);
                }
                else {
                    // Unknown error.
                    this.log.e('Huawei: uknown error %j', resp);
                    sendFullError('UnknownError', ERROR.CONNECTION_PROVIDER);
                }

            }, ([code, error]) => {
                this.log.w('Huawei error %d / %j', code, error);
                if (code === 0) {
                    throw PushError.deserialize(error);
                }
                else if (code >= 500) {
                    throw new ConnectionError(`Huawei Unavailable: ${code}`, ERROR.CONNECTION_PROVIDER);
                }
                else if (code === 401) {
                    throw new ConnectionError(`Huawei Unauthorized: ${code}`, ERROR.INVALID_CREDENTIALS);
                }
                else if (code === 400) {
                    throw new ConnectionError(`Huawei Bad message: ${code}`, ERROR.DATA_PROVIDER);
                }
                else {
                    throw new ConnectionError(`Huawei Bad response code: ${code}`, ERROR.EXCEPTION);
                }
            });
        });
    }

}

/**
 * Create new empty payload for the note object given
 * 
 * @param {Message} msg NMessageote object
 * @returns {object} empty payload object
 */
function empty(msg) {
    return {data: {'c.i': msg.id}, android: {}};
}

/**
 * Finish data object after setting all the properties
 * 
 * @param {object} obj platform-specific obj to finalize
 * @return {object} resulting object
 */
function finish(obj) {
    if (!obj.data.message && !obj.data.sound) {
        obj.data.data['c.s'] = 'true';
    }

    obj.data = JSON.stringify(obj.data);

    return {message: obj};
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
            t.result.data['c.b'] = buttons.map(b => ({t: b.title, l: b.link}));
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
            template.android.collapse_key = ck;
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
            template.android.time_to_live = ttl;
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
        Object.assign(template.result.data, util.flattenObject(data));
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

    /**
     * Sends platform specific fields
     * 
     * @param {Template} template template
     * @param {object} specific platform specific props to be sent
     */
    specific: function(template, specific) {
        if (specific) {
            if (specific.large_icon) {
                template.result.data['c.li'] = specific.large_icon;
            }
        }
    },
};

/**
 * Token types for HMS
 * A number comes from SDK, we need to map it into smth like tkhp/tkht
 */
const FIELDS = {
    '0': 'p',
};

/**
 * Token types for HMS
 * A number comes from SDK, we need to map it into smth like tkhp/tkht
 */
const FIELDS_TITLES = {
    '0': 'HMS Token',
};

/**
 * Credential types for HMS
 */
const CREDS = {
    'hms': class HMSCreds extends Creds {
        /**
         * Validation scheme of this class
         * 
         * @returns {object} validateArgs scheme
         */
        static get scheme() {
            return Object.assign(super.scheme, {
                app: { required: true, type: 'String', 'min-length': 7, 'max-length': 12},
                secret: { required: true, type: 'String', 'min-length': 64, 'max-length': 64},
                hash: { required: false, type: 'String' },
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
            this._data.hash = FORGE.md.sha256.create().update(this._data.secret).digest().toHex();
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
                app: this._data.app,
                secret: `HPK secret "${this._data.secret.substr(0, 10)} ... ${this._data.secret.substr(this._data.secret.length - 10)}"`,
                hash: this._data.hash,
            };
        }
    },

};

module.exports = {
    key,
    parent: 'a',
    title: 'Android (Huawei Push Kit)',
    extractor,
    guess,
    FIELDS,
    FIELDS_TITLES,
    CREDS,

    empty,
    finish,
    fields,
    map,
    connection: HPK,

};
