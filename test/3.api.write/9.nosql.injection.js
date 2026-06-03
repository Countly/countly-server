var request = require('supertest');
var should = require('should');
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

    describe('control: a valid app_key is still accepted', function() {
        it('should not return "App does not exist" for the real key', function(done) {
            request
                .post('/o/sdk')
                .send({method: "fetch_remote_config", device_id: DEVICE_ID, app_key: APP_KEY})
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = {};
                    try {
                        ob = JSON.parse(res.text);
                    }
                    catch (e) {
                        ob = {};
                    }
                    (ob.result === 'App does not exist').should.equal(false);
                    done();
                });
        });
    });
});
