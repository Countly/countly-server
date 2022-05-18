const should = require('should'),
    data = require('./data'),
    { ValidationError } = require('../api/send'),
    { onAppPluginsUpdate } = require('../api/api-push'),
    { ObjectID } = require('mongodb'),
    FORGE = require('node-forge'),
    FS = require('fs');

function decode() {
    return Buffer.from('QUFBQTFFZE83dWs6QVBBOTFiRUVfWE5LU3U5aXdncTJuOGctYUdYaW9SeE9jN2swODBweHV2MklOcVVLZUV0alEtdDBxWWJ2cE01X2JYNmxKV0ZuUWNTSTIwU1g0c1drMXEyZThBT080Mk1FYjJGQm5faUc5cUV5M3dEZG5fZTl4WlZRWWNMX1FMQjJnVWIySkpVWTE2TTQ=', 'base64').toString('ascii');
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
        isoid: id => id && id instanceof ObjectID,
        oid: id => !id ? id : id instanceof ObjectID ? id : ObjectID(id)
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
    const fcm = decode();
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
                    key: fcm
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
        }, 'Missing key argument');

        // ok FCM set
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'fcm',
                    key: fcm
                }
            }
        });
        should.equal(dbdata.credsSaves.length, 1);
        should.equal(dbdata.appUpdates.length, 1);
        should.equal(dbdata.credsDeletes.length, 0);
        should.equal(dbdata.credsSaves[0].type, 'fcm');
        should.ok(dbdata.credsSaves[0]._id);
        should.ok(dbdata.credsSaves[0].key);
        should.ok(dbdata.credsSaves[0].key.indexOf(fcm.substr(0, 25)) !== -1);
        should.ok(dbdata.credsSaves[0].key.indexOf(' ... ') === -1);
        should.deepEqual(dbdata.appUpdates[0].filter, {_id: data.app._id});
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update), ['$set']);
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set), ['plugins.push.a']);
        should.deepEqual(Object.keys(dbdata.appUpdates[0].update.$set['plugins.push.a']), ['_id', 'type', 'key', 'hash']);
        should.ok(dbdata.appUpdates[0].update.$set['plugins.push.a'].hash);
        should.ok(dbdata.appUpdates[0].update.$set['plugins.push.a'].key.indexOf(' ... ') !== -1);
        should.ok(data.app.plugins.push.a);
        should.ok(data.app.plugins.push.a._id);
        should.ok(data.app.plugins.push.a.key);
        should.ok(data.app.plugins.push.a.key.indexOf(' ... ') !== -1);
        should.equal(data.app.plugins.push.a.type, 'fcm');

        // ok FCM reset
        await onAppPluginsUpdate({
            params: {},
            app: data.app,
            config: {
                a: {
                    type: 'fcm',
                    key: fcm
                }
            }
        });
        should.equal(dbdata.credsSaves.length, 2);
        should.equal(dbdata.appUpdates.length, 2);
        should.equal(dbdata.credsDeletes.length, 1);
        should.equal(dbdata.credsDeletes[0]._id.toString(), dbdata.credsSaves[0]._id.toString());
        should.equal(dbdata.credsSaves[1].type, 'fcm');
        should.ok(dbdata.credsSaves[1]._id);
        should.ok(dbdata.credsSaves[1].key);
        should.ok(dbdata.credsSaves[1].key.indexOf(fcm.substr(0, 25)) !== -1);
        should.ok(dbdata.credsSaves[1].key.indexOf(' ... ') === -1);
        should.deepEqual(dbdata.appUpdates[1].filter._id.toString(), data.app._id.toString());
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update), ['$set']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set), ['plugins.push.a']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set['plugins.push.a']), ['_id', 'type', 'key', 'hash']);
        should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].hash);
        should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].key.indexOf(' ... ') !== -1);
        should.ok(data.app.plugins.push.a);
        should.ok(data.app.plugins.push.a._id);
        should.ok(data.app.plugins.push.a.key);
        should.ok(data.app.plugins.push.a.key.indexOf(' ... ') !== -1);
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
        should.ok(typeof data.app.plugins.push.i._id === 'string');
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
                    key: fcm
                }
            }
        });
        should.equal(dbdata.credsSaves.length, 2);
        should.equal(dbdata.appUpdates.length, 2);
        should.equal(dbdata.credsDeletes.length, 0);
        should.equal(dbdata.credsSaves[1].type, 'fcm');
        should.ok(dbdata.credsSaves[1]._id);
        should.ok(dbdata.credsSaves[1].key);
        should.ok(dbdata.credsSaves[1].key.indexOf(fcm.substr(0, 25)) !== -1);
        should.ok(dbdata.credsSaves[1].key.indexOf(' ... ') === -1);
        should.deepEqual(dbdata.appUpdates[1].filter, {_id: data.app._id});
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update), ['$set']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set), ['plugins.push.a']);
        should.deepEqual(Object.keys(dbdata.appUpdates[1].update.$set['plugins.push.a']), ['_id', 'type', 'key', 'hash']);
        should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].hash);
        should.ok(dbdata.appUpdates[1].update.$set['plugins.push.a'].key.indexOf(' ... ') !== -1);
        should.ok(data.app.plugins.push.a);
        should.ok(data.app.plugins.push.a._id);
        should.ok(data.app.plugins.push.a.key);
        should.ok(data.app.plugins.push.a.key.indexOf(' ... ') !== -1);
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
        should.equal(dbdata.credsDeletes[0], dbdata.credsSaves[0]._id);
        should.equal(dbdata.credsDeletes[1], dbdata.credsSaves[2]._id);
        should.deepEqual(dbdata.appUpdates[3].filter, {_id: data.app._id});
        should.deepEqual(Object.keys(dbdata.appUpdates[3].update), ['$set']);
        should.deepEqual(dbdata.appUpdates[3].update.$set, {'plugins.push.i': {}});
        should.ok(data.app.plugins.push.i);
        should.deepEqual(data.app.plugins.push.i, {});

    }).timeout(100000);
});