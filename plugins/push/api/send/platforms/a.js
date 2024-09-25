const { ERROR, SendError, FCM_SDK_ERRORS } = require('../data/error'),
    logger = require('../../../../../api/utils/log'),
    { Splitter } = require('./utils/splitter'),
    { util } = require('../std'),
    { Creds } = require('../data/creds'),
    { threadId } = require('worker_threads'),
    FORGE = require('node-forge'),
    firebaseAdmin = require("firebase-admin");

/**
 * Platform key
 */
const key = 'a';

/**
 * Virtual subplatforms. A virtual platform:
 *  - has its own token fields, is stored in db separately;
 *  - has its own compilation part;
 *  - has its own sending part;
 *  - has no distinct representation in UI, therefore it's virtual.
 * 
 * Huawei push is only available on select Android devices, therefore it doesn't deserve a separate checkbox in UI from users perspective.
 * Yet notification payload, provider communication and a few other things are different, therefore it's a virtual platform. You can send to huawei directly using
 * API, but whenever you send to Android you'll also send to huawei if Huawei credentials are set.
 */
const virtuals = ['h'];

/**
 * Extract token & field from token_session request
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} array of [platform, field, token] if qstring has platform-specific token data, undefined otherwise
 */
function extractor(qstring) {
    if (qstring.android_token !== undefined && (!qstring.token_provider || qstring.token_provider === 'FCM')) {
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
    return userAgent.includes('Android') && key;
}

/**
 * Connection implementation for FCM
 */
class FCM extends Splitter {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Credentials} creds FCM credentials 
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
        this.legacyApi = !creds._data.serviceAccountFile;

        this.log = logger(log).sub(`${threadId}-a`);

        const serviceAccountJSON = FORGE.util.decode64(
            creds._data.serviceAccountFile.substring(creds._data.serviceAccountFile.indexOf(',') + 1)
        );
        const serviceAccountObject = JSON.parse(serviceAccountJSON);
        const appName = creds._data.hash; // using hash as the app name
        const firebaseApp = firebaseAdmin.apps.find(app => app.name === appName)
            ? firebaseAdmin.app(appName)
            : firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(serviceAccountObject, this.agent),
                httpAgent: this.agent
            }, appName);
        this.firebaseMessaging = firebaseApp.messaging();


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
        // CONNECTION TEST data (push document)
        // [
        //     {
        //         _id: -0.4490833548652693,
        //         m: 'test',
        //         pr: {},
        //         t: '0.2124088209996502'
        //     }
        // ]
        // NORMAL data (push document)
        // [
        //     {
        //         _id: '663389a807613e6e79349392',
        //         a: '6600901a71159e99a3434253',
        //         m: '663389a949c58657a8e625b3',
        //         p: 'a',
        //         f: 'p',
        //         u: '1',
        //         t: 'dw_CueiXThqYI9owrQC0Pb:APA91bHanJn9RM-ZYnC-3wCMld5Nk3QaVJppS4HOKrpdV8kCXq7pjQlJjcd8_1xq9G6XaceZfrFPxbfehJ4YCEfMsfQVhZW1WKhnY3TbtO7HIQfYfbj35-sx_-BHAhQ5eSDuiCOZWUDP',
        //         pr: { la: 'en' },
        //         h: 'a535fbb5d4664c49'
        //     }
        // ]
        return this.with_retries(data, length, (pushes, bytes, attempt) => {
            this.log.d('%d-th attempt for %d bytes', attempt, bytes);
            const one = Math.ceil(bytes / pushes.length);
            let content = this.template(pushes[0].m).compile(pushes[0]);

            // new fcm api doesn't allow objects or arrays inside "data" property
            if (content.data && typeof content.data === "object") {
                for (let prop in content.data) {
                    switch (typeof content.data[prop]) {
                    case "object":
                        content.data[prop] = JSON.stringify(content.data[prop]);
                        break;
                    case "number":
                        content.data[prop] = String(content.data[prop]);
                        break;
                    }
                }
            }

            const errors = {};
            /**
             * Get an error for given code & message, create it if it doesn't exist yet
             *
             * @param {number} code error code
             * @param {string} message error message
             * @returns {SendError} error instance
             */
            const errorObject = (code, message) => {
                let err = code + message;
                if (!(err in errors)) {
                    errors[err] = new SendError(message, code);
                }
                return errors[err];
            };

            const messages = pushes.map(p => p.t).map((token) => ({
                token,
                ...content,
            }));

            return this.firebaseMessaging
            // EXAMPLE RESPONSE of sendEach
            // {
            //   "responses": [
            //     {
            //       "success": false,
            //       "error": {
            //         "code": "messaging/invalid-argument",
            //         "message": "The registration token is not a valid FCM registration token"
            //       }
            //     }
            //   ],
            //   "successCount": 0,
            //   "failureCount": 1
            // }
                .sendEach(messages)
                .then(async result => {
                    const allPushIds = pushes.map(p => p._id);

                    if (!result.failureCount) {
                        this.send_results(allPushIds, bytes);
                        return;
                    }

                    // array of successfully sent push._id:
                    const sentSuccessfully = [];

                    // check for each message
                    for (let i = 0; i < result.responses.length; i++) {
                        const { success, error } = result.responses[i];
                        if (success) {
                            sentSuccessfully.push(allPushIds[i]);
                        }
                        else {
                            const sdkError = FCM_SDK_ERRORS[error.code];
                            // check if the sdk error is mapped to an internal error.
                            // set to default if its not.
                            let internalErrorCode = sdkError?.mapTo ?? ERROR.DATA_PROVIDER;
                            let internalErrorMessage = sdkError?.message ?? "Invalid error message";
                            errorObject(internalErrorCode, internalErrorMessage)
                                .addAffected(pushes[i]._id, one);
                        }
                    }
                    // send results back:
                    for (let errorKey in errors) {
                        this.send_push_error(errors[errorKey]);
                    }
                    if (sentSuccessfully.length) {
                        this.send_results(sentSuccessfully, one * sentSuccessfully.length);
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
    return {data: {'c.i': msg.id}};
}

/**
 * Finish data object after setting all the properties
 * 
 * @param {object} data platform-specific data to finalize
 * @return {object} resulting object
 */
function finish(data) {
    if (!data.data.message && !data.data.sound) {
        data.data['c.s'] = 'true';
    }
    return data;
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
            t.result.data['c.b'] = buttons.map(b => ({t: b.title, l: b.url}));
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
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS = {
    '0': 'p', // prod
};

/**
 * Token types for FCM
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS_TITLES = {
    '0': 'Android Firebase Token',
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
                serviceAccountFile: { required: false, type: "String" },
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
            if (this._data.serviceAccountFile) {
                let {serviceAccountFile} = this._data;
                let mime = serviceAccountFile.indexOf(';base64,') === -1 ? null : serviceAccountFile.substring(0, serviceAccountFile.indexOf(';base64,'));
                if (mime !== "data:application/json") {
                    return ["Service account file needs to be valid json file with .json file extension"];
                }
                const serviceAccountJSON = FORGE.util.decode64(serviceAccountFile.substring(serviceAccountFile.indexOf(',') + 1));
                let serviceAccountObject;
                try {
                    serviceAccountObject = JSON.parse(serviceAccountJSON);
                }
                catch (error) {
                    return ["Service account file includes an invalid JSON data"];
                }
                if (typeof serviceAccountObject !== "object"
                    || Array.isArray(serviceAccountObject)
                    || serviceAccountObject === null
                    || !serviceAccountObject.project_id
                    || !serviceAccountObject.private_key
                    || !serviceAccountObject.client_email) {
                    return ["Service account json doesn't contain project_id, private_key and client_email"];
                }
                this._data.hash = FORGE.md.sha256.create().update(serviceAccountJSON).digest().toHex();
            }
            else {
                return ["Updating FCM credentials requires a service-account.json file"];
            }
        }

        /**
         * "View" json, that is some truncated/simplified version of credentials that is "ok" to display
         * 
         * @returns {object} json without sensitive information
         */
        get view() {
            const serviceAccountFile = this._data?.serviceAccountFile
                ? "service-account.json"
                : "";
            return {
                _id: this._id,
                type: this._data?.type,
                serviceAccountFile,
                hash: this._data?.hash,
            };
        }
    },

};

module.exports = {
    key: 'a',
    virtuals,
    title: 'Android',
    extractor,
    guess,
    FIELDS,
    FIELDS_TITLES,
    CREDS,

    empty,
    finish,
    fields,
    map,
    connection: FCM,

};
