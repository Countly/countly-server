const { ConnectionError, ERROR, SendError, PushError } = require('../data/error'),
    { Base, util } = require('../std'),
    logger = require('../../../../../api/utils/log'),
    { Creds } = require('../data/creds'),
    { threadId } = require('worker_threads');

const key = 't';

/**
 * Make an estimated guess about request platform
 * 
 * @param {string} userAgent user-agent header
 * @returns {string} platform key if it looks like request made by this platform
 */
function guess(userAgent) {
    return userAgent.includes('TestUserAgent') && key;
}

/**
 * Connection implementation for FCM
 */
class TestConnection extends Base {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Creds} creds credentials
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.concurrency number of notifications which can be processed concurrently
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, options);
        this.log = logger(log).sub(`wrk-${threadId}-t`);
        this.e_connect = options.e_connect ? new ConnectionError(options.e_connect[2], options.e_connect[0]).setConnectionError(options.e_connect[1], options.e_connect[2]) : undefined;
        this.e_send_recoverable = options.e_send_recoverable;
        this.e_send_nonrecoverable = options.e_send_nonrecoverable;
    }

    /**
     * Simulates sending process
     * @param {Object[]} datas pushes to send
     * @param {integer} length number of bytes in data
     * @returns {Promise} sending promise
     */
    send(datas, length) {
        return this.with_retries(datas, length, (pushes, bytes, attempt) => {
            this.log.d('%d-th attempt for %d bytes', attempt, bytes);
            return new Promise((res, rej) => {
                let one = Math.floor(bytes / pushes.length);
                if (this.e_send_recoverable) {
                    setTimeout(() => {
                        this.send_results([pushes[0]._id], one);
                        setImmediate(() => {
                            this.send_push_error(new SendError(this.e_send_recoverable, ERROR.CONNECTION_PROVIDER)
                                .setAffected([pushes[1]._id], one)
                                .setLeft(pushes.slice(2), bytes - 2 * one));
                            if (pushes.length > 2) {
                                setImmediate(() => {
                                    this.send_results(pushes.slice(2).map(dt => dt._id), bytes - 2 * one);
                                    res();
                                });
                            }
                            else {
                                res();
                            }
                        });
                    }, 500);
                }
                else {
                    setTimeout(() => {
                        if (this.e_send_nonrecoverable) {
                            if (this.e_send_nonrecoverable[1] === ERROR.CONNECTION_PROXY && pushes.length === 3) {
                                rej(new ConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setAffected([pushes.shift()], one)
                                    .setLeft(pushes, bytes - one));
                            }
                            else {
                                this.send_results(pushes[0]._id, one);
                                pushes.shift();
                                rej(new ConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setLeft(pushes, bytes - one));
                            }
                        }
                        else if (this.batch) {
                            let sent = 0;

                            /**
                             * "send" next batch
                             */
                            let next = () => {
                                let data = pushes.splice(0, this.batch),
                                    dataBytes = pushes.length ? data.length * one : bytes - sent;
                                sent += dataBytes;
                                this.send_results(data.map(dt => dt._id), dataBytes);
                                if (pushes.length) {
                                    setTimeout(next, Math.random() * 3000);
                                }
                            };

                            next();
                        }
                        else {
                            let processed = 0,
                                results = [],
                                sent = 0,
                                done = false,
                                /**
                                 * for timeouts
                                 * 
                                 * @returns {any} anything
                                 */
                                proceed = () => {
                                    while (processed < pushes.length) {
                                        let push = pushes[processed++];
                                        if (push.connection_error) {
                                            if (results.length) {
                                                sent += results.length * one;
                                                this.send_results(results, results.length * one);
                                                results = [];
                                            }
                                            sent += one;
                                            rej(new ConnectionError("Connection error", ERROR.CONNECTION_PROVIDER)
                                                .setConnectionError("Provider unavailable", 500)
                                                .setAffected([push], one)
                                                .setLeft(pushes.slice(processed), bytes - sent));
                                            return;
                                        }
                                        else if (push.token_invalid) {
                                            if (results.length) {
                                                sent += results.length * one;
                                                this.send_results(results, results.length * one);
                                                results = [];
                                            }
                                            sent += one;
                                            this.send_push_error(new SendError('Token invalid', ERROR.DATA_TOKEN_INVALID).addAffected(push._id, one));
                                            return setTimeout(proceed, Math.random() * 100);
                                        }
                                        else if (push.token_expired) {
                                            sent += one;
                                            this.send_push_error(new SendError('Token expired', ERROR.DATA_TOKEN_EXPIRED).addAffected(push._id, one));
                                            return setTimeout(proceed, Math.random() * 100);
                                        }
                                        else if (push.token_changed) {
                                            sent += one;
                                            this.send_results([[push._id, 'new_token']], one);
                                            return setTimeout(proceed, Math.random() * 100);
                                        }
                                        else {
                                            results.push(push._id);
                                        }
                                    }

                                    setTimeout(() => {
                                        if (results.length) {
                                            this.send_results(results, bytes - sent);
                                            results = [];
                                        }
                                        if (!done && processed === pushes.length) {
                                            done = true;
                                            res();
                                        }
                                    }, Math.random() * 1000);
                                };
                            proceed();
                            // let [p0, p1, p2, p3] = pushes;
                            // this.send_results([p0._id], one);
                            // if (!p1) {
                            //     return res();
                            // }
                            // setTimeout(() => {
                            //     this.send_push_error(new SendError('Token expired', ERROR.DATA_TOKEN_EXPIRED).addAffected(p1._id, one));
                            //     if (!p2) {
                            //         return res();
                            //     }
                            //     setTimeout(() => {
                            //         this.send_results([[p2._id, 'new_token']], one);
                            //         if (!p3) {
                            //             return res();
                            //         }
                            //         setTimeout(() => {
                            //             this.send_push_error(new SendError('Token invalid', ERROR.DATA_TOKEN_INVALID).addAffected(p3._id, one));
                            //             if (pushes.length <= 4) {
                            //                 return res();
                            //             }
                            //             setTimeout(() => {
                            //                 this.send_results(pushes.slice(4).map(dt => dt._id), bytes - 4 * one);
                            //                 res();
                            //             }, Math.random() * 1000);
                            //         }, Math.random() * 1000);
                            //     }, Math.random() * 1000);
                            // }, Math.random() * 1000);
                        }
                    }, Math.random() * 1000);
                }
            });
        });
    }

    /**
     * Simulating connection errors
     * 
     * @param {Object[]|undefined} messages messages array
     */
    async connect(messages) {
        if (messages) {
            if (!this.connected) {
                let ok = await this.connect();
                if (!ok) {
                    return ok;
                }
            }
            if (!this.connected) {
                throw new Error('Failed to connect');
            }
            messages.forEach(m => this.message(m._id, m));
            return true;
        }
        else if (this.e_connect) {
            this.log.d('simulating connection error');
            this.closingForcefully = this.e_connect;
            setImmediate(() => {
                this.closingForcefully = this.e_connect = undefined;
                // this.destroy(this.closingForcefully);
            });
            throw this.closingForcefully;
        }
        else {
            this.log.d('simulating connection');
            await util.wait(Math.random() * 1000);
            this.log.d('simulating connection done');
            this.connected = true;
        }
    }
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
};

/**
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS = {
    '0': 'p', // prod
    '1': 'd', // dev
    '2': 't', // test
};

/**
 * APN development token reuqires different host
 */
const FIELD_DEV = 'd';

/**
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS_TITLES = {
    '0': 'TEST Production Token', // prod
    '1': 'TEST Deveplopment Token', // dev
    '2': 'TEST Test Token', // test
};

/**
 * Extract token & field from token_session request
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} array of [platform, field, token] if qstring has platform-specific token data, undefined otherwise
 */
function extractor(qstring) {
    if (qstring.test_token !== undefined && qstring.test_mode in FIELDS) {
        return [key, FIELDS[qstring.test_mode], qstring.test_token];
    }
}

/**
 * Credential types for FCM
 */
const CREDS = {
    'test': class TestCreds extends Creds {
        /**
         * constructor
         */
        constructor() {
            super({type: 'test'});
        }

        /**
         * Check credentials for correctness, throw PushError otherwise
         * 
         * @throws PushError in case the check fails
         * @returns {undefined}
         */
        check() {
            if (this.key.length < 5) {
                throw new PushError('Invalid key', ERROR.INVALID_CREDENTIALS);
            }
            logger.d('checked credentials %s');
        }
    },
};

module.exports = {
    key,
    title: 'Test',
    extractor,
    guess,
    FIELDS,
    FIELDS_TITLES,
    FIELD_DEV,
    CREDS,

    empty,
    finish,
    fields,
    map,
    connection: TestConnection
};
