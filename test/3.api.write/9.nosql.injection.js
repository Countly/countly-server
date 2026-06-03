var request = require('supertest');
require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

// Attempts MongoDB operator injection through SDK request parameters. A
// non-string app_key (an object such as {"$regex": ...} or an array) must never
// be interpreted as a query operator: it has to be coerced to a string before
// the apps lookup, so it can only ever resolve to "no app" - exactly like an
// unknown key. The injection is delivered via a JSON request body, since the
// query-string parser does not produce nested objects.
var APP_KEY = "";
var DEVICE_ID = "nosql-injection-probe";

describe('NoSQL injection through SDK API params', function() {
    before(function() {
        APP_KEY = testUtils.get("APP_KEY");
    });

    /**
     * A regex that would match the real app key by prefix if the value were
     * honored as a query operator rather than a plain string.
     * @returns {string} regex source matching the real key's first character
     */
    function realKeyPrefix() {
        return "^" + (APP_KEY ? APP_KEY.charAt(0) : "a");
    }

    var injectionCases = [
        {
            name: '$regex matching a real key prefix',
            key: function() {
                return {"$regex": realKeyPrefix()};
            }
        },
        {
            name: '$ne null',
            key: function() {
                return {"$ne": null};
            }
        },
        {
            name: '$gt empty string',
            key: function() {
                return {"$gt": ""};
            }
        },
        {
            name: 'array containing the real key',
            key: function() {
                return [APP_KEY, "x"];
            }
        },
    ];

    describe('app_key operator injection on /o/sdk', function() {
        injectionCases.forEach(function(c) {
            it('should reject ' + c.name + ' with "App does not exist"', function(done) {
                request
                    .post('/o/sdk')
                    .send({method: "fetch_remote_config", device_id: DEVICE_ID, app_key: c.key()})
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        JSON.parse(res.text).should.have.property('result', 'App does not exist');
                        done();
                    });
            });
        });
    });

    describe('app_key operator injection on /i', function() {
        injectionCases.forEach(function(c) {
            it('should reject ' + c.name + ' with "App does not exist"', function(done) {
                request
                    .post('/i')
                    .send({device_id: DEVICE_ID, begin_session: 1, app_key: c.key()})
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        JSON.parse(res.text).should.have.property('result', 'App does not exist');
                        done();
                    });
            });
        });
    });

    describe('control: a valid app_key is accepted', function() {
        it('should process a request with the real app_key', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '&begin_session=1&app_key=' + APP_KEY)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // a positive success signal (not just "not App does not exist")
                    // so the control cannot pass for unrelated reasons
                    JSON.parse(res.text).should.have.property('result', 'Success');
                    done();
                });
        });
    });

    // The bulk endpoint returns 200 and swallows per-item results, so the
    // injection is verified by its effect: an injected sub-request must not
    // write any data into the real app, while a valid one does.
    describe('app_key operator injection on /i/bulk', function() {
        var APP_ID = "";
        var injectDevice = "nosql-bulk-inject-" + Date.now();
        var controlDevice = "nosql-bulk-control-" + Date.now();

        before(function() {
            APP_ID = testUtils.get("APP_ID");
        });

        it('should not write data to the real app for an injected sub-request', function(done) {
            var requests = [{app_key: {"$regex": realKeyPrefix()}, device_id: injectDevice, begin_session: 1}];
            request
                .get('/i/bulk?requests=' + encodeURIComponent(JSON.stringify(requests)))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(function() {
                        testUtils.db.collection('app_users' + APP_ID).findOne({did: injectDevice}, function(e, user) {
                            if (e) {
                                return done(e);
                            }
                            (user === null || typeof user === "undefined").should.equal(true);
                            done();
                        });
                    }, 1000 * testUtils.testScalingFactor);
                });
        });

        it('control: a valid app_key sub-request does write to the real app', function(done) {
            var requests = [{app_key: APP_KEY, device_id: controlDevice, begin_session: 1}];
            request
                .get('/i/bulk?requests=' + encodeURIComponent(JSON.stringify(requests)))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(function() {
                        testUtils.db.collection('app_users' + APP_ID).findOne({did: controlDevice}, function(e, user) {
                            if (e) {
                                return done(e);
                            }
                            (!!user).should.equal(true);
                            done();
                        });
                    }, 1000 * testUtils.testScalingFactor);
                });
        });
    });
});
