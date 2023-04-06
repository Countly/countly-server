const { ConnectionError, PushError, SendError, ERROR, Creds, Template } = require('../data'),
    { Base, util } = require('../std'),
    FORGE = require('node-forge'),
    logger = require('../../../../../api/utils/log'),
    jwt = require('jsonwebtoken'),
    { threadId } = require('worker_threads'),
    { proxyAgent } = require('../../proxy'),
    HTTP2 = require('http2');


/**
 * Platform key
 */
const key = 'i';

/**
 * Extract token & field from token_session request
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} array of [platform, field, token] if qstring has platform-specific token data, undefined otherwise
 */
function extractor(qstring) {
    if (qstring.ios_token !== undefined && qstring.test_mode in FIELDS) {
        return [key, FIELDS[qstring.test_mode], qstring.ios_token, util.hashInt(qstring.ios_token)];
    }
}

/**
 * Make an estimated guess about request platform
 * 
 * @param {string} userAgent user-agent header
 * @returns {string} platform key if it looks like request made by this platform
 */
function guess(userAgent) {
    return userAgent.includes('iOS') && key;
}

/**
 * Token types for APN
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS = {
    '0': 'p', // prod
    '1': 'd', // debug
    '2': 'a', // ad hoc
};

/**
 * Token types for APN
 * A number comes from SDK, we need to map it into smth like tkip/tkid/tkia
 */
const FIELDS_TITLES = {
    '0': 'APN Production Token', // prod
    '1': 'APN Development Token', // debug
    '2': 'APN AdHoc / TestFlight Token', // ad hoc
};

/**
 * APN development token reuqires different host
 */
const FIELD_DEV = 'd';

/**
 * Credential types for APN
 */
const CREDS = {
    'apn_universal': class CertCreds extends Creds {
        /**
         * Validation scheme of this class
         * 
         * @returns {object} validateArgs scheme
         */
        static get scheme() {
            return Object.assign(super.scheme, {
                cert: { required: true, type: 'String' },
                fileType: { required: false, type: 'String' }, // multipart upload case only; when fileType is present, cert is supposed to be a file contents
                secret: { required: false, type: 'String', 'min-length': 1},
                title: { required: false, type: 'String' },
                notBefore: { required: false, type: 'Date' },
                notAfter: { required: false, type: 'Date' },
                topics: { required: false, type: 'String[]' },
                bundle: { required: false, type: 'String' },
                hash: { required: false, type: 'String' },
            });
        }

        /**
         * Get TLS options
         * 
         * @returns {object} with cert & key keys set to PEM-encoded certificate & private key
         */
        get tls() {
            let buffer = FORGE.util.decode64(this._data.cert),
                asn1 = FORGE.asn1.fromDer(buffer),
                p12 = FORGE.pkcs12.pkcs12FromAsn1(asn1, false, this._data.secret || null),
                cert = p12.getBags({bagType: FORGE.pki.oids.certBag})[FORGE.pki.oids.certBag][0],
                pk = p12.getBags({bagType: FORGE.pki.oids.pkcs8ShroudedKeyBag})[FORGE.pki.oids.pkcs8ShroudedKeyBag][0];

            if (!cert || !pk || !cert.cert || !pk.key) {
                throw new PushError('Failed to get tls opts from creds');
            }

            return {
                cert: FORGE.pki.certificateToPem(cert.cert),
                key: FORGE.pki.privateKeyToPem(pk.key)
            };
        }

        /**
         * Check credentials for correctness, throw PushError otherwise
         * 
         * @throws PushError in case the check fails
         * @returns {undefined}
         */
        validate() {
            if (this._data.fileType) {
                let mime = this._data.cert.indexOf(';base64,') === -1 ? null : this._data.cert.substring(0, this._data.cert.indexOf(';base64,'));
                if (mime === 'data:application/x-pkcs12' || mime === 'data:application/pkcs12' || (mime === 'data:application/octet-stream' && this._data.fileType === 'p12')) {
                    this._data.cert = this._data.cert.substring(this._data.cert.indexOf(',') + 1);
                    delete this._data.fileType;
                }
                else {
                    return ['APN certificate file must be in P12 format with private key inside'];
                }
            }

            let res = super.validate();
            if (res) {
                return res;
            }

            try {
                var buffer = FORGE.util.decode64(this._data.cert),
                    asn1 = FORGE.asn1.fromDer(buffer),
                    p12 = FORGE.pkcs12.pkcs12FromAsn1(asn1, false, this._data.secret || null),
                    topics = [];

                p12.safeContents.forEach(safeContents => {
                    safeContents.safeBags.forEach(safeBag => {
                        if (safeBag.cert) {
                            var title = safeBag.cert.subject.getField({type: '2.5.4.3'});
                            if (title) {
                                this._data.title = title.value;
                            }

                            if (safeBag.cert.validity) {
                                if (safeBag.cert.validity.notBefore) {
                                    this._data.notBefore = safeBag.cert.validity.notBefore;
                                }
                                if (safeBag.cert.validity.notAfter) {
                                    this._data.notAfter = safeBag.cert.validity.notAfter;
                                }
                            }

                            // if (safeBag.cert.getExtension({id: '1.2.840.113635.100.6.3.1'})) {
                            //     dev = true;
                            // }

                            // if (safeBag.cert.getExtension({id: '1.2.840.113635.100.6.3.2'})) {
                            //     prod = true;
                            // }

                            var tpks = safeBag.cert.getExtension({id: '1.2.840.113635.100.6.3.6'});
                            if (tpks) {
                                tpks = tpks.value.replace(/0[\x00-\x1f\(\)!]/gi, '') //eslint-disable-line no-useless-escape
                                    .replace('\f\f', '\f')
                                    .split('\f')
                                    .map(s => s.replace(/[^A-Za-z\-\.]/gi, '').trim()); //eslint-disable-line  no-useless-escape
                                tpks.shift();

                                for (var i = 0; i < tpks.length; i++) {
                                    for (var j = 0; j < tpks.length; j++) {
                                        if (i !== j && tpks[j].indexOf(tpks[i]) === 0) {
                                            if (topics.indexOf(tpks[i]) === -1 && tpks[i] && tpks[i].indexOf('.') !== -1) {
                                                topics.push(tpks[i]);
                                            }
                                            if (topics.indexOf(tpks[j]) === -1 && tpks[j] && tpks[j].indexOf('.') !== -1) {
                                                topics.push(tpks[j]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                });

                if (topics.length === 0) {
                    return ['Not a universal (Sandbox & Production) certificate'];
                }

                if (!this._data.notBefore || !this._data.notAfter) {
                    return ['No validity dates in the certificate'];
                }

                if (this._data.notBefore.getTime() > Date.now()) {
                    return ['Certificate is not valid yet'];
                }

                if (this._data.notAfter.getTime() < Date.now()) {
                    return ['Certificate is expired'];
                }

                topics.sort((a, b) => a.length - b.length);
                this._data.bundle = topics.length > 0 ? topics[0] : this._data.title.split(' ').pop();
                this._data.topics = topics;
                this._data.hash = FORGE.md.sha256.create().update(this._data.cert).digest().toHex();

                logger('push:credentials:i').d('checked credentials %s topics %j, bundle %j', this.id, this._data.topics, this._data.bundle);
            }
            catch (e) {
                if (e.message && e.message.indexOf('Invalid password') !== -1) {
                    return ['Invalid certificate passphrase'];
                }
                else {
                    logger('push:credentials:i').w('error while parsing certificate', e);
                    return ['Failed to parse certificate'];
                }
            }
        }

        /**
         * Hash string of the credentials used to compare them
         */
        get hash() {
            return this._data.hash;
        }

        /**
         * "View" json, that is some truncated/simplified version of credentials that is "ok" to display
         * 
         * @returns {object} json without sensitive information
         */
        get view() {
            let json = {
                _id: this._id,
                type: this._data.type,
                cert: 'APN Sandbox & Production Certificate (P12)',
                bundle: this._data.bundle,
                topics: this._data.topics,
                notBefore: this._data.notBefore,
                notAfter: this._data.notAfter,
                hash: this._data.hash,
            };
            if (this._data.secret) {
                json.secret = new Array(this._data.secret.length).fill('*').join('');
            }
            return json;
        }
    },
    'apn_token': class TokenCreds extends Creds {

        /**
         * Validation scheme of this class
         * 
         * @returns {object} validateArgs scheme
         */
        static get scheme() {
            return Object.assign(super.scheme, {
                key: { required: true, type: 'String' },
                keyid: { required: true, type: 'String' },
                bundle: { required: true, type: 'String' },
                team: { required: true, type: 'String' },
                fileType: { required: false, type: 'String' },
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
            if (this._data.fileType) {
                let mime = this._data.key.indexOf(';base64,') === -1 ? null : this._data.key.substring(0, this._data.key.indexOf(';base64,'));
                if (mime === 'data:application/x-pkcs8' || mime === 'data:application/pkcs8' || mime === 'data:' || (mime === 'data:application/octet-stream' && this._data.fileType === 'p8')) {
                    this._data.key = this._data.key.substring(this._data.key.indexOf(',') + 1);
                    delete this._data.fileType;
                }
                else {
                    return ['APN key file must be in P8 format'];
                }
            }

            let res = super.validate();
            if (res) {
                return res;
            }

            let k = FORGE.util.decode64(this._data.key);
            if (!k) {
                return ['Not a base64-encoded string'];
            }

            if (k.indexOf('-----BEGIN PRIVATE KEY-----') === -1 || k.indexOf('-----END PRIVATE KEY-----') === -1) {
                return ['Not a private key in P8 format in base64-encoded string'];
            }

            this._data.hash = FORGE.md.sha256.create().update(this._data.key).digest().toHex();
        }

        /**
         * "View" json, that is some truncated/simplified version of credentials that is "ok" to display
         * 
         * @returns {object} json without sensitive information
         */
        get view() {
            let json = {
                _id: this._id,
                type: this._data.type,
                key: 'APN Key File (P8)',
                bundle: this._data.bundle,
                keyid: this._data.keyid,
                team: this._data.team,
                hash: this._data.hash,
            };
            return json;
        }

        /**
         * Generate new JWT token
         */
        get bearer() {
            if (!this._bearer) {
                let token = jwt.sign({
                    iss: this._data.team,
                    iat: Math.floor(Date.now() / 1000)
                }, FORGE.util.decode64(this._data.key), {
                    algorithm: 'ES256',
                    header: {
                        alg: 'ES256',
                        kid: this._data.keyid
                    }
                });
                this._bearer = `bearer ${token}`;
            }
            return this._bearer;
        }
    }
};

/**
 * Create new empty payload for the note object given
 * 
 * @param {Note} note Note object
 * @returns {object} empty payload object
 */
function empty(note) {
    return {aps: {}, c: {i: note.id}};
}

/**
 * Non-personalizable fields of Note which can be sent for iOS
 * !NOTE! order matters!
 */
const fields = [
    'sound',
    'badge',
    'contentAvailable',
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
            t.result.aps.sound = sound;
        }
    },

    /**
     * Sends badge 
     * @param {Template} t template
     * @param {number} badge badge (0..N)
     */
    badge: function(t, badge) {
        t.result.aps.badge = badge;
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
            t.result.c.b = buttons.map(b => ({t: b.title, l: b.url}));
            t.result.aps['mutable-content'] = 1;
        }
    },

    /**
     * Set title string
     * 
     * @param {Template} t template
     * @param {String} title title string
     */
    title: function(t, title) {
        if (!t.result.aps.alert) {
            t.result.aps.alert = {};
        }
        t.result.aps.alert.title = title;
    },

    /**
     * Set message string
     * 
     * @param {Template} t template
     * @param {String} message message string
     */
    message: function(t, message) {
        if (!t.result.aps.alert) {
            t.result.aps.alert = {};
        }
        t.result.aps.alert.body = message;
    },

    /**
     * Send content-available. It's set automatically when there's no alert and no sound.
     * 
     * @param {Template} template template
     * @param {boolean} ca contentAvailable of the Note
     */
    contentAvailable: function(template, ca) {
        if (ca || (!template.result.aps.alert && !template.result.aps.sound)) {
            template.result.aps['content-available'] = 1;
        }
    },

    /**
     * Send notification-tap url
     * 
     * @param {Template} template template
     * @param {string} url on-tap url
     */
    url: function(template, url) {
        template.result.c.l = url;
    },

    /**
     * Send media (picture, video, gif, etc) along with the message.
     * Sets mutable-content in order for iOS extension to be run.
     * 
     * @param {Template} template template
     * @param {string} media attached media url
     */
    media: function(template, media) {
        template.result.c.a = media;
        template.result.aps['mutable-content'] = 1;
    },

    /**
     * Sends custom data along with the message
     * 
     * @param {Template} template template
     * @param {Object} data data to be sent
     */
    data: function(template, data) {
        Object.assign(template.result, data);
    },

    /**
     * Sends user props along with the message
     * 
     * @param {Template} template template
     * @param {[string]} extras extra user props to be sent
     * @param {Object} data personalization
     */
    extras: function(template, extras, data) {
        let e = {},
            any = false;
        for (let i = 0; i < extras.length; i++) {
            let k = extras[i];
            if (data[k] !== null && data[k] !== undefined) {
                e[k] = data[k];
                any = true;
            }
        }
        if (any) {
            template.result.c.e = e;
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
            if (specific.subtitle) {
                template.result.aps.alert = template.result.aps.alert || {};
                template.result.aps.alert.subtitle = specific.subtitle;
            }
        }
    },
};

/**
 * Connection implementation for APN
 */
class APN extends Base {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Creds} creds credentials instance
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.pool.pushes number of notifications which can be processed concurrently
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, options);
        this.log = logger(log).sub(`${threadId}-i`);

        if (this._options.proxy) {
            this._options.proxy.http2 = true;
        }

        this.templates = {};
        this.results = [];

        this.host = this.type === 'id' ? 'api.development.push.apple.com' : 'api.push.apple.com';
        this.port = 2197;
        let authority = `${this.host}:${this.port}`;
        this.authority = `https://${authority}`;

        this.headersFirst = {
            ':path': '/3/device/' + Math.random(),
            ':method': 'POST',
            ':scheme': 'https',
            ':authority': authority,
            [HTTP2.sensitiveHeaders]: ['authorization', ':path']
        },
        this.headersSecond = {
            ':method': 'POST',
            ':scheme': 'https',
            ':authority': authority,
            [HTTP2.sensitiveHeaders]: ['authorization', ':path', 'apns-id', 'apns-expiration', 'apns-collapse-id']
        };
        this.headersSecondWithToken = token => {
            this.headersSecond[':path'] = '/3/device/' + token;
            return this.headersSecond;
        };

        this.sessionOptions = {};
        if (this.creds instanceof CREDS.apn_universal) {
            Object.assign(this.sessionOptions, this.creds.tls);
        }
        if (this.creds instanceof CREDS.apn_token) {
            this.headersFirst.authorization = this.headersSecond.authorization = this.creds.bearer;
        }
        this.headersFirst['apns-topic'] = this.headersSecond['apns-topic'] = this.creds._data.bundle;
    }

    /**
     * Get template by message id, create if none exists
     * 
     * @param {string} id message id
     * @param {map} map platform mapping object
     * @returns {Template} template instance
     */
    template(id) {
        let { PLATFORM } = require('../index');
        return this.templates[id] || (this.templates[id] = new Template(this.messages[id], PLATFORM[this.type.substr(0, 1)], true));
    }

    /**
     * Send push notifications
     * 
     * @param {Object[]} pushesData pushes to send
     * @param {integer} length number of bytes in data
     * @returns {Promise} sending promise
     */
    send(pushesData, length) {
        if (!this.session) {
            return this.connect().then(ok => {
                if (ok) {
                    return this.send(pushesData, length);
                }
                else {
                    return ok;
                }
            });
        }
        return this.with_retries(pushesData, length, (pushes, bytes, attempt) => new Promise((resolve, reject) => {
            this.log.d('%d-th attempt for %d bytes', attempt, bytes);

            let self = this,
                nonRecoverableError,
                recoverableErrors = 0,
                oks = [],
                errors = {},
                one = Math.ceil(bytes / pushes.length),
                /**
                 * Get an error for given code & message, create it if it doesn't exist yet
                 * 
                 * @param {number} code error code
                 * @param {string} message error message
                 * @returns {SendError} error instance
                 */
                error = (code, message) => {
                    recoverableErrors++;

                    let err = code + message;
                    if (!(err in errors)) {
                        errors[err] = new SendError(message, code);
                    }
                    return errors[err];
                },
                /**
                 * Called on stream completion, returns results for this batch
                 */
                streamDone = () => {
                    this.log.d('streamDone %j %j %j %j', oks.length, recoverableErrors, nonRecoverableError && nonRecoverableError.left.length || 0, pushes.length);
                    if (oks.length + recoverableErrors + (nonRecoverableError && nonRecoverableError.left.length || 0) === pushes.length) {
                        let errored = nonRecoverableError && nonRecoverableError.bytes || 0;
                        if (oks.length) {
                            this.send_results(oks, bytes - errored);
                        }
                        for (let k in errors) {
                            errored += errors[k].affectedBytes;
                            this.send_push_error(errors[k]);
                        }
                        if (nonRecoverableError) {
                            reject(nonRecoverableError);
                        }
                        else {
                            resolve();
                        }
                    }
                };

            this.log.d('sending %d streams', pushes.length);
            pushes.forEach((p, i) => {
                self.log.d('[%s]: sending %s', p._id, p._id);
                if (i % 200 === 0) {
                    self.log.d('[%s] %j / %j', p._id, self.session.closed, self.session.destroyed);
                }
                if (nonRecoverableError) {
                    self.log.d('[%s]: nonRecoverableError', p._id);
                    nonRecoverableError.addLeft(p._id, one);
                    streamDone();
                    return;
                }

                if (!self.messages[p.m]) {
                    self.log.e('No message %s', p.m);
                }

                try {
                    let content = self.template(p.m).compile(p),
                        stream = self.session.request(self.headersSecondWithToken(p.t)),
                        status,
                        data = '';
                    stream.on('error', err => {
                        self.log.d('[%s]: stream error', p._id, err);
                        if (!nonRecoverableError) {
                            nonRecoverableError = new ConnectionError(`APN Stream Error: ${err.message}`, ERROR.CONNECTION_PROVIDER).addAffected(p._id, one);
                        }
                        else {
                            nonRecoverableError.addAffected(p._id, one);
                        }
                    });
                    stream.on('frameError', (type, code, id) => {
                        self.log.e('[%s] stream frameError %d, %d, %d', p._id, type, code, id);
                    });
                    stream.on('timeout', () => {
                        self.log.e('[%s] stream timeout %s', p._id);
                        if (!nonRecoverableError) {
                            nonRecoverableError = new ConnectionError(`APN Stream Error: timeout`, ERROR.CONNECTION_PROVIDER).addAffected(p._id, one);
                        }
                        else {
                            nonRecoverableError.addAffected(p._id, one);
                        }
                        streamDone();
                    });
                    stream.on('response', function(headers) {
                        status = headers[':status'];
                        if (status === 200) {
                            self.log.d('[%s] response done %d', p._id, status);
                            oks.push(p._id);
                            stream.destroy();
                            streamDone();
                            self.log.d('[%s] response done %d', p._id, status);
                        }
                        else if (status === 410) {
                            self.log.d('[%s]: status %d: %j / %j', p._id, status, self.session.closed, self.session.destroyed);
                            stream.destroy();
                            error(ERROR.DATA_TOKEN_EXPIRED, 'ExpiredToken').addAffected(p._id, one);
                            streamDone();
                            self.log.d('[%s] response done %d', p._id, status);
                        }
                        else if (status === 500 || status === 503 || status === 404 || status === 405 || status === 413) {
                            self.log.e('[%s]: APN returned error %d, destroying session', p._id, status);
                            stream.destroy();
                            self.session.destroy();
                            if (!nonRecoverableError) {
                                nonRecoverableError = new ConnectionError(`APN Server Error: ${status}`, ERROR.CONNECTION_PROVIDER).addAffected(p._id, one);
                            }
                            else {
                                nonRecoverableError.addAffected(p._id, one);
                            }
                        }
                        else if (status === 400 || status === 403 || status === 429) {
                            self.log.d('[%s]: status %d: %j / %j', p._id, status, self.session.closed, self.session.destroyed);
                            // handle in on('end') because we need response error code
                        }
                    });
                    stream.on('data', dt => {
                        data += dt;
                    });
                    stream.on('end', () => {
                        self.log.d('[%s] end %s', p._id, status);
                        if (status === 400 || status === 403 || status === 429) {
                            self.log.d('[%s]: end %d: %j / %j', p._id, status, self.session.closed, self.session.destroyed);
                            try {
                                let json = JSON.parse(data);
                                if (status === 400) {
                                    if (json.reason) {
                                        if (json.reason === 'DeviceTokenNotForTopic' || json.reason === 'BadDeviceToken') {
                                            error(ERROR.DATA_TOKEN_INVALID, json.reason).addAffected(p._id, one);
                                        }
                                        else {
                                            error(ERROR.DATA_COUNTLY, json.reason).addAffected(p._id, one);
                                        }
                                    }
                                    else {
                                        self.log.e('[%s] provider returned %d: %j', p._id, status, json);
                                        error(ERROR.DATA_PROVIDER, data).addAffected(p._id, one);
                                    }
                                }
                                else if (status === 403) {
                                    if (!nonRecoverableError) {
                                        nonRecoverableError = new ConnectionError(`APN Unauthorized: ${status} (${json.reason})`, ERROR.INVALID_CREDENTIALS).addAffected(p._id, one);
                                    }
                                    else {
                                        nonRecoverableError.addAffected(p._id, one);
                                    }
                                }
                                else if (status === 429) {
                                    self.log.e('[%s] provider returned %d: %j', p._id, status, json);
                                    error(ERROR.DATA_PROVIDER, data).addAffected(p._id, one);
                                }
                                else {
                                    throw new PushError('IMPOSSIBRU');
                                }
                            }
                            catch (e) {
                                self.log.e('provider returned %d: %s', status, data, e);
                                error(ERROR.DATA_PROVIDER, data).addAffected(p._id, one);
                            }
                            streamDone();
                        }
                    });
                    stream.setEncoding('utf-8');
                    stream.setTimeout(10000, () => {
                        self.log.w('[%s]: cancelling stream on timeout', p._id);
                        stream.close(HTTP2.constants.NGHTTP2_CANCEL);
                    });
                    stream.end(content);
                    self.log.d('[%s]: sent %s', p._id, content);
                }
                catch (err) {
                    self.log.e('[%s] http/2 exception when trying to send a request, recording as non recoverable (%j / %j): %j', p._id, self.session.closed, self.session.destroyed, err);
                    if (!nonRecoverableError) {
                        nonRecoverableError = new ConnectionError(`APN Stream Error: ${err.message}`, ERROR.CONNECTION_PROVIDER).addAffected(p._id, one);
                    }
                }
            });
        }));
    }

    /**
     * Connect
     * 
     * @param {Object[]|undefined} messages messages array
     */
    async connect(messages) {
        if (messages) {
            if (!this.session) {
                let ok = await this.connect();
                if (!ok) {
                    return ok;
                }
            }
            if (!this.session) {
                throw new Error('Failed to connect');
            }
            messages.forEach(m => this.message(m._id, m));
            return true;
        }
        else {
            return new Promise((resolve, reject) => {
                this.log.i('connecting to %s', this.authority);

                this.ensureProxy(this.host, this.port, error => {
                    if (error) {
                        this.log.e('Proxy connection error', error);
                        return reject(new ConnectionError('NoProxyConnection', ERROR.CONNECTION_PROXY));
                    }

                    let session = HTTP2.connect(this.authority, this.sessionOptions);

                    // session.setTimeout(10000);

                    session.on('error', err => {
                        this.log.e('session error', err);
                        reject(new ConnectionError(err.message, ERROR.CONNECTION_PROVIDER));
                        session.destroy();
                    });

                    session.on('timeout', err => {
                        this.log.e('session timeout', err);
                        reject(new ConnectionError(err && err.message || 'Session timeout', ERROR.CONNECTION_PROVIDER));
                        session.destroy();
                    });

                    session.on('connect', () => {
                        this.log.d('connected to %s [%s]', this.authority, session.socket.remoteAddress);

                        let stream = session.request(this.headersFirst);
                        stream.on('error', err => {
                            this.log.e('first request error', err);
                            reject(new ConnectionError(err.message, ERROR.CONNECTION_PROVIDER));
                            session.destroy();
                        });
                        stream.on('response', headers => {
                            let status = headers[':status'];
                            this.log.d('first request provider returned %d', status);
                            if (status === 403 || status === 400) {
                                if (status === 400) {
                                    this.session = session;
                                }
                                else {
                                    session.destroy();
                                }
                                resolve(status === 400);
                            }
                            else {
                                reject(new ConnectionError(`APN returned status ${status}`, ERROR.CONNECTION_PROVIDER));
                            }
                            stream.destroy();
                        });
                        stream.setEncoding('utf8');
                        stream.end(JSON.stringify({
                            aps: {
                                alert: 'xxTESTxx'
                            }
                        }));
                    });
                });

            });
        }
    }

    /**
     * Ensure connection to proxy server
     * 
     * @param {string} host APN hostname
     * @param {int} port APN port
     * @param {function} callback callback to call in the end, first param is error
     */
    ensureProxy(host, port, callback) {
        if (!this._options.proxy || !this._options.proxy.host || !this._options.proxy.port) {
            callback();
            return;
        }

        if (!this.agent) {
            let ProxyAgent = proxyAgent('https://example.com', this._options.proxy);
            this.agent = new ProxyAgent();
        }


        this.agent.createConnection({host, port, protocol: 'https:'}, (err, socket) => {
            if (err) {
                callback(err);
            }
            else {
                this.sessionOptions.createConnection = () => socket;
                callback();
            }
        });
    }

    /**
     * Gracefully shutdown the worker
     * 
     * @param {Error} error optional error
     * @param {function} callback callback to call once done destroying
     */
    _destroy(error, callback) {
        if (error) {
            this.log.e('destroy', error);
        }
        else {
            this.log.d('destroy');
        }
        if (this.session) {
            this.session.destroy();
            this.session = undefined;
        }
        if (this.agent) {
            this.agent.destroy();
            this.agent = undefined;
        }
        if (callback) {
            callback(error);
        }
    }
}

module.exports = {
    key,
    title: 'iOS',
    extractor,
    guess,
    FIELDS,
    FIELDS_TITLES,
    FIELD_DEV,
    CREDS,

    empty,
    fields,
    map,
    connection: APN
};
