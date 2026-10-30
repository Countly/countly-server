const should = require('should'),
    data = require('./data'),
    { ValidationError } = require('../api/send'),
    { onAppPluginsUpdate } = require('../api/api-push'),
    { ObjectID, ObjectId } = require('../api/send/data/db'),
    FORGE = require('node-forge'),
    FS = require('fs');

/**
 * A FCM service-account.json as the dashboard uploads it (a data URI), with a freshly
 * generated key: well-formed, so validation accepts it, but not a real Google account.
 * @returns {string} data URI
 */
function serviceAccountFile() {
    const { privateKey } = require('crypto').generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        publicKeyEncoding: {type: 'spki', format: 'pem'}
    });
    const account = {type: 'service_account', project_id: 'countly-test', private_key: privateKey, client_email: 'push@countly-test.iam.gserviceaccount.com'};
    return 'data:application/json;base64,' + Buffer.from(JSON.stringify(account)).toString('base64');
}

/**
 * A data URI with the given mime type and content
 * @param {string} mime - mime type
 * @param {string} content - file content
 * @returns {string} data URI
 */
function dataUri(mime, content) {
    return 'data:' + mime + ';base64,' + Buffer.from(content).toString('base64');
}

function db_fixture(ret) {
    ret.appUpdates = [];
    ret.credsSaves = [];
    ret.credsDeletes = [];
    return {
        ObjectID,
        collection: name => {
            if (name === 'apps') {
                return {
                    async findOne() {
                        return data.app;
                    },
                    async updateOne(filter, update) {
                        ret.appUpdates.push({filter, update});
                    }
                };
            }
            else if (name === 'creds') {
                return {
                    async findOne(q) {
                        return ret.credsSaves.filter(c => c._id.toString() === q._id && q._id.toString() || q.toString())[0] || data.credentials;
                    },
                    async updateOne(filter, update, opts) {
                        if (opts.upsert) {
                            ret.credsSaves.push(update.$set);
                        }
                    },
                    async deleteOne(query) {
                        ret.credsDeletes.push(query);
                    }
                };
            }
            else if (name === 'plugins') {
                return {
                    async findOne() {
                        return {
                            plugins: {
                                push: {
                                    sendAhead: 60000,
                                    connection: {
                                        retries: 3,
                                        retryFactor: 1000,
                                    },
                                    pool: {
                                        pushes: 100000,
                                        bytes: 100000,
                                        concurrency: 5
                                    }
                                }
                            }
                        };
                    }
                };
            }
        },
        isoid: id => id && id instanceof ObjectId,
        oid: id => !id ? id : id instanceof ObjectId ? id : ObjectID(id)
    };
}

async function checkValidation(data, error) {
    let errored = false;
    await onAppPluginsUpdate(data).catch(e => {
        errored = true;
        if (e instanceof ValidationError) {
            should.ok(e.errors.indexOf(error) !== -1);
        }
        else {
            console.log(e);
            should.fail('Invalid error');
        }
    });
    should.ok(errored);
}

describe('API credentials', () => {
    const fcm = serviceAccountFile();
    it('FCM creds upload works', async() => {

        let dbdata = {},
            db = db_fixture(dbdata);

        require('../../../api/utils/common').db = db;

        // no changes
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {}
        });
        should.equal(dbdata.appUpdates.length, 0);
        should.equal(dbdata.credsDeletes.length, 0);

        // wrong type
        await checkValidation({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'xxx',
                    serviceAccountFile: fcm
                }
            }
        }, 'Wrong credentials type');

        // typed validation (no key)
        await checkValidation({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'fcm',
                }
            }
        }, 'Updating FCM credentials requires a service-account.json file');

        // a legacy server key is no longer accepted (Google shut the legacy FCM API down)
        await checkValidation({params: {}, app: data.app, config: {a: {type: 'fcm', key: 'AAAA-legacy-server-key'}}},
            'Updating FCM credentials requires a service-account.json file');

        // not a json file, broken json, json without the account fields
        await checkValidation({params: {}, app: data.app, config: {a: {type: 'fcm', serviceAccountFile: dataUri('text/plain', '{}')}}},
            'Service account file needs to be valid json file with .json file extension');
        await checkValidation({params: {}, app: data.app, config: {a: {type: 'fcm', serviceAccountFile: dataUri('application/json', '{x')}}},
            'Service account file includes an invalid JSON data');
        await checkValidation({params: {}, app: data.app, config: {a: {type: 'fcm', serviceAccountFile: dataUri('application/json', '{"project_id": "p"}')}}},
            "Service account json doesn't contain project_id, private_key and client_email");
        should.equal(dbdata.credsSaves.length, 0);
        should.equal(dbdata.appUpdates.length, 0);

        // ok FCM set
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'fcm',
                    serviceAccountFile: fcm
                }
            }
        });
        should.equal(dbdata.credsSaves.length, 1);
        should.equal(dbdata.appUpdates.length, 1);
        should.equal(dbdata.credsDeletes.length, 0);
        should.equal(dbdata.credsSaves[0].type, 'fcm');
        should.ok(dbdata.credsSaves[0]._id);
        should.equal(dbdata.credsSaves[0].serviceAccountFile, fcm);
        should.ok(dbdata.credsSaves[0].hash);
        should.deepEqual(dbdata.appUpdates[0].filter, {_id: data.app._id});
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update), ['$set']);
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set), ['plugins.push.a']);
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set['plugins.push.a']), ['_id', 'type', 'serviceAccountFile', 'hash']);
        should.ok(dbdata.appUpdates[0].update.$set['plugins.push.a'].hash);
        should.equal(dbdata.appUpdates[0].update.$set['plugins.push.a'].serviceAccountFile, 'service-account.json');
        should.ok(data.app.plugins.push.a);
        should.ok(data.app.plugins.push.a._id);
        should.equal(data.app.plugins.push.a.serviceAccountFile, 'service-account.json');
        should.equal(data.app.plugins.push.a.type, 'fcm');

        // ok FCM reset
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'fcm',
                    serviceAccountFile: fcm
                }
            }
        });
        should.equal(dbdata.credsSaves.length, 2);
        should.equal(dbdata.appUpdates.length, 2);
        should.equal(dbdata.credsDeletes.length, 1);
        should.equal(dbdata.credsDeletes[0]._id.toString(), dbdata.credsSaves[0]._id.toString());
        should.equal(dbdata.credsSaves[1].type, 'fcm');
        should.ok(dbdata.credsSaves[1]._id);
        should.equal(dbdata.credsSaves[1].serviceAccountFile, fcm);
        should.ok(dbdata.credsSaves[1].hash);
        should.deepEqual(dbdata.appUpdates[1].filter._id.toString(), data.app._id.toString());
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update), ['$set']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set), ['plugins.push.a']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set['plugins.push.a']), ['_id', 'type', 'serviceAccountFile', 'hash']);
        should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].hash);
        should.equal(dbdata.appUpdates[1].update.$set['plugins.push.a'].serviceAccountFile, 'service-account.json');
        should.ok(data.app.plugins.push.a);
        should.ok(data.app.plugins.push.a._id);
        should.equal(data.app.plugins.push.a.serviceAccountFile, 'service-account.json');
        should.equal(data.app.plugins.push.a.type, 'fcm');

        // ok FCM delete
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {
                a: null
            }
        });
        should.equal(dbdata.credsSaves.length, 2);
        should.equal(dbdata.appUpdates.length, 3);
        should.equal(dbdata.credsDeletes.length, 2);
        should.equal(dbdata.credsDeletes[0]._id.toString(), dbdata.credsSaves[0]._id.toString());
        should.equal(dbdata.credsDeletes[1]._id.toString(), dbdata.credsSaves[1]._id.toString());
        should.deepEqual(dbdata.appUpdates[2].filter._id.toString(), data.app._id.toString());
        should.deepEqual(Object.keys(dbdata.appUpdates[2].update), ['$set']);
        should.deepEqual(dbdata.appUpdates[2].update.$set, {'plugins.push.a': {}});
        should.ok(data.app.plugins.push.a);
        should.deepEqual(data.app.plugins.push.a, {});

    }).timeout(100000);

    describe('with the APN certificates still valid', () => {
        // Every committed APN certificate has expired (Cert.p12 and CertWithPassphrase.p12
        // in November 2021), and a real one committed now would expire within a year too.
        // Push compares their dates with Date.now(), so this test runs on a date when they
        // were valid; CertExpired.p12 (expired November 2018) is still expired then.
        // A valid upload then connects to Apple to check the certificate, which needs a live
        // certificate and the network; the provider's answer is stubbed instead.
        const FIXTURE_NOW = Date.UTC(2021, 5, 1),
            APN = require('../api/send/platforms/i').connection;
        let realNow, realConnect, providerAccepts;
        before(() => {
            realNow = Date.now;
            Date.now = () => FIXTURE_NOW;
            realConnect = APN.prototype.connect;
            APN.prototype.connect = async() => providerAccepts;
        });
        beforeEach(() => {
            providerAccepts = true;
        });
        after(() => {
            Date.now = realNow;
            APN.prototype.connect = realConnect;
        });

        it('refuses APN credentials the provider rejects, and stores nothing', async() => {
            let dbdata = {},
                db = db_fixture(dbdata);
            require('../../../api/utils/common').db = db;
            providerAccepts = false;
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: 'data:application/x-pkcs12;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/Cert.p12', {encoding: 'binary'})),
                    }
                }
            }, 'Credentials were rejected by push notification provider');
            should.equal(dbdata.credsSaves.length, 0);
            should.equal(dbdata.appUpdates.length, 0);
        });


        it('APN & FCM creds upload works', async() => {

            let dbdata = {},
                db = db_fixture(dbdata),
                cert = 'data:application/x-pkcs12;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/Cert.p12', {encoding: 'binary'})),
                certWithPassphrase = 'data:application/x-pkcs12;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/CertWithPassphrase.p12', {encoding: 'binary'})),
                certDev = 'data:application/x-pkcs12;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/CertDev.p12', {encoding: 'binary'})),
                certProd = 'data:application/octet-stream;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/CertProd.p12', {encoding: 'binary'})),
                certExpired = 'data:application/x-pkcs12;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/CertExpired.p12', {encoding: 'binary'})),
                certInvalid = 'data:application/x-pkcs12;base64,' + Buffer.from('hello world').toString('base64'),
                certP8 = 'data:application/x-pkcs8;base64,' + FORGE.util.encode64(FS.readFileSync(__dirname + '/Cert.p12', {encoding: 'binary'}));

            require('../../../api/utils/common').db = db;

            // no changes
            await onAppPluginsUpdate({
                params: {},
                app: data.app,
                config: {}
            });
            should.equal(dbdata.appUpdates.length, 0);
            should.equal(dbdata.credsDeletes.length, 0);

            // wrong type
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'xxx',
                        key: cert
                    }
                }
            }, 'Wrong credentials type');

            // typed validation (no cert)
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                    }
                }
            }, 'Missing cert argument');

            // p8 bundle/team/keyid
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_token',
                        fileType: 'p8',
                        key: certP8,
                        bundle: 1,
                        team: 'team',
                        keyid: 'keyid'
                    }
                }
            }, 'Invalid type for bundle');

            // p8 with wrong type
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_token',
                        fileType: 'p8',
                        key: certP8,
                        bundle: 'bundle',
                        team: 'team',
                        keyid: 'keyid'
                    }
                }
            }, 'Not a private key in P8 format in base64-encoded string');

            // dev cert, not universal one
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certDev,
                    }
                }
            }, 'Not a universal (Sandbox & Production) certificate');

            // dev cert, not universal one
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certProd,
                    }
                }
            }, 'Not a universal (Sandbox & Production) certificate');

            // dev cert, not universal one
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certInvalid,
                    }
                }
            }, 'Failed to parse certificate');

            // dev cert, not universal one
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certExpired,
                    }
                }
            }, 'Certificate is expired');

            // p12 with wrong password
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: cert,
                        secret: 'wrong'
                    }
                }
            }, 'Invalid certificate passphrase');

            // p12 with wrong password
            await checkValidation({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certWithPassphrase,
                        secret: 'wrong'
                    }
                }
            }, 'Invalid certificate passphrase');

            // first ok upload
            await onAppPluginsUpdate({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: cert,
                    }
                }
            });
            should.equal(dbdata.credsSaves.length, 1);
            should.equal(dbdata.appUpdates.length, 1);
            should.equal(dbdata.credsDeletes.length, 0);
            should.equal(dbdata.credsSaves[0].type, 'apn_universal');
            should.ok(dbdata.credsSaves[0]._id);
            should.ok(typeof data.app.plugins.push.i._id === 'object');
            should.ok(dbdata.credsSaves[0].cert);
            should.equal(dbdata.credsSaves[0].cert, cert.substr(cert.indexOf(',') + 1));
            should.equal(dbdata.credsSaves[0].secret, undefined);
            should.deepEqual(dbdata.appUpdates[0].filter, {_id: data.app._id});
            should.deepEqual(Object.keys(dbdata.appUpdates[0].update), ['$set']);
            should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set), ['plugins.push.i']);
            should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set['plugins.push.i']), ['_id', 'type', 'cert', 'bundle', 'topics', 'notBefore', 'notAfter', 'hash']);
            should.ok(dbdata.appUpdates[0].update.$set['plugins.push.i'].hash);
            should.equal(dbdata.appUpdates[0].update.$set['plugins.push.i'].cert, 'APN Sandbox & Production Certificate (P12)');
            should.ok(data.app.plugins.push.i);
            should.ok(data.app.plugins.push.i._id);
            should.equal(data.app.plugins.push.i._id.toString(), dbdata.credsSaves[0]._id.toString());
            should.ok(data.app.plugins.push.i.cert, cert.substr(cert.indexOf(',') + 1));
            should.equal(data.app.plugins.push.i.cert, 'APN Sandbox & Production Certificate (P12)');
            should.equal(data.app.plugins.push.i.type, 'apn_universal');

            // ok FCM set
            await onAppPluginsUpdate({
                params: {},
                app: data.app,
                config: {
                    a: {
                        type: 'fcm',
                        serviceAccountFile: fcm
                    }
                }
            });
            should.equal(dbdata.credsSaves.length, 2);
            should.equal(dbdata.appUpdates.length, 2);
            should.equal(dbdata.credsDeletes.length, 0);
            should.equal(dbdata.credsSaves[1].type, 'fcm');
            should.ok(dbdata.credsSaves[1]._id);
            should.equal(dbdata.credsSaves[1].serviceAccountFile, fcm);
            should.ok(dbdata.credsSaves[1].hash);
            should.deepEqual(dbdata.appUpdates[1].filter, {_id: data.app._id});
            should.deepEqual(Object.keys(dbdata.appUpdates[1].update), ['$set']);
            should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set), ['plugins.push.a']);
            should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set['plugins.push.a']), ['_id', 'type', 'serviceAccountFile', 'hash']);
            should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].hash);
            should.equal(dbdata.appUpdates[1].update.$set['plugins.push.a'].serviceAccountFile, 'service-account.json');
            should.ok(data.app.plugins.push.a);
            should.ok(data.app.plugins.push.a._id);
            should.equal(data.app.plugins.push.a.serviceAccountFile, 'service-account.json');
            should.equal(data.app.plugins.push.a.type, 'fcm');
            should.equal(data.app.plugins.push.a.type, 'fcm');

            // apn replace
            await onAppPluginsUpdate({
                params: {},
                app: data.app,
                config: {
                    i: {
                        type: 'apn_universal',
                        fileType: 'p12',
                        cert: certWithPassphrase,
                        secret: 'tokyo'
                    }
                }
            });
            should.equal(dbdata.credsSaves.length, 3);
            should.equal(dbdata.appUpdates.length, 3);
            should.equal(dbdata.credsDeletes.length, 1);
            should.equal(dbdata.credsSaves[2].type, 'apn_universal');
            should.ok(dbdata.credsSaves[2]._id);
            should.ok(dbdata.credsSaves[2].cert);
            should.equal(dbdata.credsSaves[2].cert, certWithPassphrase.substr(certWithPassphrase.indexOf(',') + 1));
            should.equal(dbdata.credsSaves[2].secret, 'tokyo');
            should.deepEqual(dbdata.appUpdates[2].filter, {_id: data.app._id});
            should.deepEqual(Object.keys(dbdata.appUpdates[2].update), ['$set']);
            should.deepEqual(Object.keys(dbdata.appUpdates[2].update.$set), ['plugins.push.i']);
            should.deepEqual(Object.keys(dbdata.appUpdates[2].update.$set['plugins.push.i']), ['_id', 'type', 'cert', 'bundle', 'topics', 'notBefore', 'notAfter', 'hash', 'secret']);
            should.ok(dbdata.appUpdates[2].update.$set['plugins.push.i'].hash);
            should.equal(dbdata.appUpdates[2].update.$set['plugins.push.i'].cert, 'APN Sandbox & Production Certificate (P12)');
            should.ok(data.app.plugins.push.i);
            should.ok(data.app.plugins.push.i._id);
            should.ok(data.app.plugins.push.i.cert, certWithPassphrase.substr(certWithPassphrase.indexOf(',') + 1));
            should.equal(data.app.plugins.push.i.secret, '*****');
            should.equal(data.app.plugins.push.i.cert, 'APN Sandbox & Production Certificate (P12)');
            should.equal(data.app.plugins.push.i.type, 'apn_universal');

            // ok APN delete
            await onAppPluginsUpdate({
                params: {},
                app: data.app,
                config: {
                    i: null
                }
            });
            should.equal(dbdata.credsSaves.length, 3);
            should.equal(dbdata.appUpdates.length, 4);
            should.equal(dbdata.credsDeletes.length, 2);
            should.equal(dbdata.credsDeletes[0]._id.toString(), dbdata.credsSaves[0]._id.toString());
            should.equal(dbdata.credsDeletes[1]._id.toString(), dbdata.credsSaves[2]._id.toString());
            should.deepEqual(dbdata.appUpdates[3].filter, {_id: data.app._id});
            should.deepEqual(Object.keys(dbdata.appUpdates[3].update), ['$set']);
            should.deepEqual(dbdata.appUpdates[3].update.$set, {'plugins.push.i': {}});
            should.ok(data.app.plugins.push.i);
            should.deepEqual(data.app.plugins.push.i, {});

        }).timeout(100000);
    });
});