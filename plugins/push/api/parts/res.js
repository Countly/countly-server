'use strict';

const res = require('../../../../api/parts/jobs/resource.js'),
    log = require('../../../../api/utils/log.js')('job:push:resource:' + process.pid),
    C = require('./credentials'),
    CT = C.CRED_TYPE,
    PL = require('./note.js').Platform,
    APN = require('../parts/apn'),
    GCM = require('../parts/gcm'),
    jwt = require('jsonwebtoken'),
    TOKEN_VALID = 60 * 45;

/** token class */
class Token {
    /** constructor
     * @param {string} key - key
     * @param {string} kid - kid
     * @param {string} tid -  tid
     */
    constructor(key, kid, tid) {
        this.key = key;
        this.kid = kid;
        this.tid = tid;
        this.next();
    }

    /** current
     * @returns {string} if token not valid anymore
     */
    current() {
        if (!this.isValid()) {
            this.next();
        }
        return this.token_bearer;
    }

    /** next */
    next() {
        this.token = this.sign();
        this.token_bearer = 'bearer ' + this.token;
        this.date = this.decode().iat;
    }

    /** is Valid
     * @returns {boolean} true if token not expired yet
     */
    isValid() {
        return (Date.now() / 1000 - this.date) < TOKEN_VALID;
    }

    /** sign
     * @returns {string} token
     */
    sign() {
        return jwt.sign({
            iss: this.tid,
            iat: Math.floor(Date.now() / 1000)
        }, this.key, {
            algorithm: 'ES256',
            header: {
                alg: 'ES256',
                kid: this.kid
            }
        });
    }

    /** decode
     * @returns {object} - {err,decodedvalue}
     */
    decode() {
        return jwt.decode(this.token || this.sign());
    }
}

/** class Connection */
class Connection extends res.Resource {
    /** constroctor
     * @param {string} _id - id
     * @param {string} name -name
     * @param {object} args - args
     * @param {object} db - db connection
     */
    constructor(_id, name, args, db) {
        super(_id, name);
        this.db = db;
        this.creds = new C.Credentials(args.cid);
        this.field = args.field;
        if (args.proxyhost && args.proxyport) {
            this.proxyhost = args.proxyhost;
            this.proxyport = args.proxyport;
            this.proxyuser = args.proxyuser;
            this.proxypass = args.proxypass;
        }
        else {
            this.proxyhost = "";
            this.proxyport = "0";
        }
        log.d('[%d]: Initializing push resource with %j / %j / %j', process.pid, _id, name, args);
    }

    /** open
     * @returns {Promise} promise
     */
    open() {
        log.d('[%s:%j]: Opening', this._id, this.field);
        return new Promise((resolve, reject) => {
            this.creds.load(this.db).then(() => {
                log.d('[%s:%j]: Loaded credentials', this._id, this.field);
                if (this.creds.platform === PL.IOS) {
                    var secret = this.creds.secret || '',
                        bundle = this.creds.bundle || '',
                        certificate = this.creds.key;

                    if (this.creds.type === CT[PL.IOS].TOKEN) {
                        var comps = this.creds.secret.split('[CLY]');
                        this.token = new Token(this.creds.key, comps[0], comps[1]);
                        log.d('current token %j', this.token.decode());
                        log.d('current secret %j', this.creds.key);
                        bundle = comps[2];
                        secret = this.token.current();
                        certificate = '';
                        log.d('Will use team %j, key id %j, bundle %j for token generation, current token is %j, valid from %j', comps[1], comps[0], comps[2], this.token.token, this.token.date);
                    }
                    else {
                        log.d('Connection bundle: %s', bundle);
                    }

                    let host = 'api.push.apple.com';
                    if (this.field === 'id') {
                        host = 'api.development.push.apple.com';
                    }

                    this.connection = new APN.ConnectionResource(certificate, secret, bundle, this.creds.expiration || '', host);
                }
                else if (this.creds.platform === PL.ANDROID) {
                    this.connection = new GCM.ConnectionResource(this.creds.key);

                    this.connection.on('closed', () => {
                        this.closed();
                        this.stopInterval();
                    });
                }
                else {
                    log.e(`Platform ${this.creds.platform} is not supported`);
                    reject(new Error(`Platform ${this.creds.platform} is not supported`));
                }

                log.d('Created connection');

                this.startInterval();
                this.connection.init((error) => {
                    log.e('^^^^^^____!____^^^^^^ Error in connection: %j', error);
                    reject(error);
                }, this.proxyhost, this.proxyport, this.proxyuser, this.proxypass).then((res3) => {
                // }, "192.168.3.77", "8888").then((res3) => {
                    log.d('init promise done with %j', res3);
                    this.connection.resolve().then((res2) => {
                        log.d('resolve promise done with %j', res2);
                        this.connection.init_connection().then((res1) => {
                            log.d('connect promise done with %j', res1);
                            this.opened();
                            resolve();
                        }, (err1) => {
                            log.d('connect promise err: ', err1);
                            this.stopInterval();
                            reject(err1);
                        });
                    }, (err2) => {
                        log.d('resolve promise err: ', err2);
                        this.stopInterval();
                        reject(err2);
                    });
                }, (err) => {
                    log.d('init promise err: ', err);
                    this.stopInterval();
                    reject(err);
                });
            }, reject);
        });
    }

    /** close
     * @returns {Promise} promise
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.connection) {
                this.connection.close_connection().then(() => {
                    this.closed();
                    this.stopInterval();
                }).then(resolve, reject);
            }
            else {
                resolve();
                this.stopInterval();
            }
        });
    }

    /** send
     * @param {object} msgs - message
     * @returns {object} res
     */
    send(msgs) {
        this.startInterval();
        // log.d('token: %s', this.token ? this.token.current() : undefined);
        return this.connection.send(msgs, this.token ? this.token.current() : undefined).then((res1) => {
            log.d('!!!!!!!!!!!!!!!!!!!!!!!send promise done with: ', res1);
            this.stopInterval();
            return res1;
        }, (err) => {
            log.d('send promise err: ', err);
            this.stopInterval();
            throw err;
        });
    }

    /** checkActiv
     * @returns {Promise}  - promise
     */
    checkActive() {
        return new Promise((resolve) => {
            log.d('checkActive');
            setTimeout(() => {
                resolve(true);
            }, 2000);
        });
    }

    /** this is required to keep event loop alive */
    startInterval() {
        if (!this.interval) {
            var s = 0;
            this.interval = setInterval(function() {
                s = s + 1 - 1;
                console.log(s++);
            }, 1000);
        }
    }

    /** stop interval */
    stopInterval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = 0;
        }
    }
}

Connection.Token = Token;

module.exports = Connection;