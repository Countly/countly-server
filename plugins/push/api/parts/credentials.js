'use strict';

const log = require('../../../../api/utils/log.js')('push:credentials'),
    Platform = require('./note.js').Platform,
    forge = require('node-forge');

const DB_MAP = {
    'messaging-enabled': 'm'
};

const DB_USER_MAP = {
    'tokens': 'tk',
    'apn_prod': `${Platform.IOS}p`, // production
    'apn_0': `${Platform.IOS}p`, // production
    'apn_dev': `${Platform.IOS}d`, // development
    'apn_1': `${Platform.IOS}d`, // development
    'apn_adhoc': `${Platform.IOS}a`, // ad hoc
    'apn_2': `${Platform.IOS}a`, // ad hoc
    'gcm_prod': `${Platform.ANDROID}p`, // production
    'gcm_0': `${Platform.ANDROID}p`, // production
    'gcm_test': `${Platform.ANDROID}t`, // testing
    'gcm_2': `${Platform.ANDROID}t`, // testing
    'messages': 'msgs' // messages sent
};

const CRED_TYPE = {
    [Platform.IOS]: {
        UNIVERSAL: 'apn_universal',
        TOKEN: 'apn_token'
    },

    [Platform.ANDROID]: {
        GCM: 'gcm',
        FCM: 'fcm',
    }
};

/** credentials class */
class Credentials {
    /** constructor
     * @param {string} cid - credentials id
     */
    constructor(cid) {
        if (!(this instanceof Credentials)) {
            return new Credentials(cid);
        }
        this._id = cid;
        // properties loaded from db object:
        //      this.platform = Platform.IOS
        //      this.type = one of CRED_TYPE[this.platform]

        //      this.key = ''       // base64 of APN P12 / P8 or GCM key
        //      this.secret = ''    // passphrase
    }

    /** toJson
     * @returns {object} - object with info: _id, platform, type, seq
     */
    toJSON() {
        return {
            _id: this._id,
            platform: this.platform,
            type: this.type,
            seq: this.seq || 1
        };
    }

    /** loads credentials
     * @param {object} db - db connection
     * @returns {Promise} - promise
     */
    load(db) {
        if (typeof this._id === 'string') {
            this._id = db.ObjectID(this._id);
        }
        log.d('loading credentials %j', this._id);
        return new Promise((resolve, reject) => {
            db.collection('credentials').findOne(this._id, (err, data) => {
                if (err || !data) {
                    reject(err || 'Credentials ' + this._id + ' not found');
                }
                else {
                    log.d('loaded credentials %j', this._id);
                    for (let key in data) {
                        this[key] = data[key];
                    }

                    try {
                        if (this.platform === Platform.IOS && this.type === CRED_TYPE[Platform.IOS].UNIVERSAL) {
                            var hasBundle = !!this.bundle,
                                buffer = forge.util.decode64(this.key),
                                asn1 = forge.asn1.fromDer(buffer),
                                p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, this.secret || null),
                                topics = [];

                            p12.safeContents.forEach(safeContents => {
                                safeContents.safeBags.forEach(safeBag => {
                                    if (safeBag.cert) {
                                        var title = safeBag.cert.subject.getField({type: '2.5.4.3'});
                                        if (title) {
                                            this.title = title.value;
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
                                                .map(s => s.replace(/[^A-Za-z0-9\-\.]/gi, '').trim()); //eslint-disable-line  no-useless-escape
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

                            topics.sort((a, b) => a.length - b.length);

                            this.bundle = topics.length > 0 ? topics[0] : this.title.split(' ').pop();
                            this.topics = topics;

                            if (topics.length === 0) {
                                return reject('Not a universal (Sandbox & Production) certificate');
                            }
                            if (this.bundle && !hasBundle) {
                                db.collection('credentials').updateOne({_id: this._id}, {$set: {bundle: this.bundle}}, () => {});
                                db.collection('apps').updateOne({'plugins.push.i._id': this._id.toString()}, {$set: {'plugins.push.i.bundle': this.bundle}}, () => {});
                            }
                            // this.certificate = buffer;

                            log.d('final topics %j, bundle %j', this.topics, this.bundle);
                        }
                        else if (this.platform === Platform.IOS && this.type === CRED_TYPE[Platform.IOS].TOKEN) {
                            var ret = check_token(this.key, this.secret);
                            if (ret) {
                                return reject(ret);
                            }
                            else {
                                this.key = forge.util.decode64(this.key);
                            }
                        }
                    }
                    catch (e) {
                        log.e('Error while parsing certificate: %j', e.stack || e.message || e);
                        reject(e.message || e.stack || e);
                    }
                    resolve();
                }
            });
        });
    }
}

var check_token = function(base64, secret) {
    var key = forge.util.decode64(base64);
    if (!key) {
        return 'Not a base64-encoded string';
    }

    if (key.indexOf('-----BEGIN PRIVATE KEY-----') === -1 || key.indexOf('-----END PRIVATE KEY-----') === -1) {
        return 'Not a private key in P8 format in base64-encoded string';
    }

    var comps = secret.split('[CLY]');

    if (comps.length !== 3) {
        return 'Secret is not encoded correctly';
    }

};


module.exports = {
    Credentials: Credentials,
    CRED_TYPE: CRED_TYPE,
    DB_MAP: DB_MAP,
    DB_USER_MAP: DB_USER_MAP,
    check_token: check_token
};