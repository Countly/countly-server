const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
// change these in local testing directly or set env vars (also COUNTLY_CONFIG_HOSTNAME should be set with port)
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");
const config_ver = 2;
var validOptions = {
    "tracking": false,
    "networking": false,
    "crt": false,
    "vt": false,
    "st": false,
    "cet": false,
    "ecz": false,
    "cr": false,
    "sui": false,
    "eqs": false,
    "rqs": false,
    "czi": false,
    "dort": false,
    "scui": false,
    "lkl": false,
    "lvs": false,
    "lsv": false,
    "lbc": false,
    "ltlpt": false,
    "ltl": false,
    "lt": false,
    "rcz": false,
    "bom": false,
    "bom_at": false,
    "bom_rqp": false,
    "bom_ra": false,
    "bom_d": false
};

describe('SDK Plugin', function() {
    beforeEach(function(done) {
        request
            .post('/i/sdk-config/update-enforcement')
            .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: JSON.stringify(validOptions)})
            .expect(200)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Success');
                done();
            });
    });

    //==================================================================================================================
    // method=sc tests
    //==================================================================================================================
    describe('GET /o/sdk?method=sc', function() {
        it('1. should get SDK config', function(done) {
            request
                .get('/o/sdk')
                .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    checkCommonConfigParam(res);
                    done();
                });
        });

        checkBadCredentials('/o/sdk', 'sc', true);
    });

    //==================================================================================================================
    // method=sdk-config tests
    //==================================================================================================================
    describe('GET /o?method=sdk-config', function() {
        it('1. should get SDK config for admin', function(done) {
            request
                .get('/o')
                .query({ method: 'sdk-config', api_key: API_KEY_ADMIN, app_id: APP_ID })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.be.an.Object();
                    done();
                });
        });

        checkBadCredentials('/o', 'sdk-config');
    });

    //==================================================================================================================
    // /i/sdk-config/update-parameter tests
    //==================================================================================================================
    describe('POST /i/sdk-config/update-parameter', function() {
        it('1. should update SDK parameter', function(done) {
            const parameter = {
                tracking: true,
                networking: true,
                crt: true
            };

            request
                .post('/i/sdk-config/update-parameter')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    parameter: JSON.stringify(parameter)
                })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Success');
                    done();
                });
        });

        // TODO: This seems to only need app_id and not api_key (so tests 5 and 6 fails), check if that is fine (disabling them for now)
        checkBadCredentials('/i/sdk-config/update-parameter', 'sdk-config', false, true);

        it('7. should validate parameter format', function(done) {
            request
                .post('/i/sdk-config/update-parameter')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    parameter: 'invalid json'
                })
                .expect(400)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Error parsing parameter');
                    done();
                });
        });
    });

    //==================================================================================================================
    // method=sdks tests
    //==================================================================================================================
    describe('GET /o?method=sdks', function() {
        it('1. should get SDK stats', function(done) {
            request
                .get('/o')
                .query({ method: 'sdks', api_key: API_KEY_ADMIN, app_id: APP_ID })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.be.an.Object();
                    done();
                });
        });

        checkBadCredentials('/o', 'sdks');
    });

    //==================================================================================================================
    // method=config-upload tests
    //==================================================================================================================
    describe('GET /o?method=config-upload', function() {
        it('1. uploads config', function(done) {
            request
                .get('/o')
                .query({ method: 'config-upload', api_key: API_KEY_ADMIN, app_id: APP_ID, config: JSON.stringify({}) })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.be.an.Object();
                    res.body.should.have.property('result', 'Success');
                    done();
                });
        });

        checkBadCredentials('/o', 'config-upload');

        it('7. should reject invalid config format', function(done) {
            request
                .get('/o')
                .query({ method: 'config-upload', api_key: API_KEY_ADMIN, app_id: APP_ID, config: 'invalid json' })
                .expect(400)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Invalid config format');
                    done();
                });
        });

        // modified after introducing enforcement
        it('8. should not return unenforced config parameter', function(done) {
            request
                .get('/o')
                .query({ method: 'config-upload', api_key: API_KEY_ADMIN, app_id: APP_ID, config: JSON.stringify({ lt: 500}) })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Success');
                    request
                        .get('/o/sdk')
                        .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                        .expect(200)
                        .end(function(err, res) {
                            should.not.exist(err);
                            checkCommonConfigParam(res);
                            res.body.c.should.not.have.property('lt'); // by default it is not enforced
                            done();
                        });
                });
        });

        it('9. should omit invalid config parameter', function(done) {
            request
                .get('/o')
                .query({ method: 'config-upload', api_key: API_KEY_ADMIN, app_id: APP_ID, config: JSON.stringify({ garbage: 500 }) })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Success');
                    request
                        .get('/o/sdk')
                        .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                        .expect(200)
                        .end(function(err, res) {
                            should.not.exist(err);
                            checkCommonConfigParam(res);
                            res.body.c.should.not.have.property('garbage');
                            done();
                        });
                });
        });

    });
    describe('POST /i/sdk-config/update-enforcement', function() {
        it('1. should return enforced config parameter', function(done) {
            request
                .get('/o')
                .query({ method: 'config-upload', api_key: API_KEY_ADMIN, app_id: APP_ID, config: JSON.stringify({ lt: 500 }) })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Success');
                    request
                        .post('/i/sdk-config/update-enforcement')
                        .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: JSON.stringify({ lt: true }) })
                        .expect(200)
                        .end(function(err, res) {
                            should.not.exist(err);
                            res.body.should.have.property('result', 'Success');
                            request
                                .get('/o/sdk')
                                .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                                .expect(200)
                                .end(function(err, res) {
                                    should.not.exist(err);
                                    checkCommonConfigParam(res);
                                    res.body.c.lt.should.be.exactly(500); // lt is enforced
                                    done();
                                });
                        });
                });
        });
        checkBadCredentials('/i/sdk-config/update-enforcement', 'sdk-config', false, true);
        it('7. should reject invalid enforcement format, string', function(done) {
            request
                .post('/i/sdk-config/update-enforcement')
                .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: 'invalid json' })
                .expect(400)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Error parsing enforcement');
                    done();
                });
        });
        it('8. should reject invalid enforcement format, array', function(done) {
            request
                .post('/i/sdk-config/update-enforcement')
                .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: [] })
                .expect(400)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Wrong enforcement format');
                    done();
                });
        });
        it('9. should remove unwanted keys', function(done) {
            request
                .post('/i/sdk-config/update-enforcement')
                .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: JSON.stringify({ ...validOptions, garbage: true }) })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    res.body.should.have.property('result', 'Success');
                    request
                        .get('/o')
                        .query({ method: 'sdk-enforcement', api_key: API_KEY_ADMIN, app_id: APP_ID })
                        .expect(200)
                        .end(function(err, res) {
                            should.not.exist(err);
                            for (var key in validOptions) {
                                res.body.should.have.property(key);
                                res.body[key].should.be.a.Boolean();
                                res.body[key].should.be.exactly(validOptions[key]);
                            }
                            res.body.should.not.have.property('garbage'); // garbage should be removed
                            done();
                        });
                });
        });
    });
    describe('GET /o?method=sdk-enforcement', function() {
        it('1. should return enforcement info for the app', function(done) {
            request
                .get('/o')
                .query({ method: 'sdk-enforcement', api_key: API_KEY_ADMIN, app_id: APP_ID })
                .expect(200)
                .end(function(err, res) {
                    should.not.exist(err);
                    for (var key in validOptions) {
                        res.body.should.have.property(key);
                        res.body[key].should.be.a.Boolean();
                        res.body[key].should.be.exactly(validOptions[key]);
                    }
                    done();
                });
        });
        checkBadCredentials('/o', 'sdk-enforcement');
    });
});

/**
 * Check common server configuration parameters in the response.
 * @param {*} res - The response object to check.
 */
function checkCommonConfigParam(res) {
    res.body.should.have.property('v');
    res.body.v.should.be.exactly(config_ver);
    res.body.should.have.property('t');
    res.body.t.should.be.a.Number();
    res.body.t.toString().length.should.be.exactly(13);
    res.body.should.have.property('c');
    res.body.c.should.be.an.Object();
}

/**
 * Check bad credentials for a given endpoint and method (for api_key and app_id requiring endpoints)
 * @param {string} endpoint - endpoint to test like '/o'
 * @param {string} method - method to test like 'sdk-config'
 * @param {bool} userType - set to true if endpoint checks for app_key and device_id 
 * @param {bool} usePost - set to true if the method requires POST request
 * 
 * Basically goes through these steps depending on userType value:
 * 2. Provide invalid api_key          OR Provide invalid app_key
 * 3. Provide no api_key               OR Provide no app_key
 * 4. Provide invalid app_id           OR Provide no device_id
 * 5. Provide no app_id                OR Provide no app_key and device_id
 * 6. Provide no app_id and no api_key OR -
 */
function checkBadCredentials(endpoint, method, userType, usePost) {
    var titles = ['2. should require valid api_key', '3. should require api_key', '4. should require valid app_id', '5. should require app_id', '6. should require app_id or api_key'];
    var queries = [
        { method: method, api_key: 'invalid_key', app_id: APP_ID },
        { method: method, app_id: APP_ID },
        { method: method, api_key: API_KEY_ADMIN, app_id: 'invalid_app_id' },
        { method: method, api_key: API_KEY_ADMIN },
        { method: method }
    ];
    var responses = ['User does not exist', 'Missing parameter "api_key" or "auth_token"', 'Invalid parameter "app_id"', 'Missing parameter "app_id"', 'Missing parameter "app_id"'];
    if (usePost) {
        titles[4] = '6. should require api_key or auth_token';
        responses[4] = 'Missing parameter "api_key" or "auth_token"';
    }

    // for app_key and device_id requiring endpoints
    if (userType) {
        titles = ['2. should require valid app_key', '3. should require app_key', '4. should require device_id', '5. should require app_key and device_id'];
        queries = [
            { method: method, app_key: 'invalid_key', device_id: 'test' },
            { method: method, device_id: 'test' },
            { method: method, app_key: APP_KEY },
            { method: method }
        ];
        responses = ['App does not exist', 'Missing parameter "app_key" or "device_id"', 'Missing parameter "app_key" or "device_id"', 'Missing parameter "app_key" or "device_id"'];
    }

    // looping through all the test cases
    for (var i = 0; i < titles.length; i++) {
        (function(index) {
            it(titles[index], function(done) {
                let req = request
                    .get(endpoint)
                    .query(queries[index]);
                if (usePost) {
                    req = request
                        .post(endpoint)
                        .send(queries[index]);
                }
                req.expect(responses[index] === 'User does not exist' ? 401 : 400)
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.body.result.should.be.exactly(responses[index]);
                        done();
                    });
            });
        })(i);
    }
}