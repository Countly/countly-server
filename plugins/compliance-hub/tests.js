var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Compliance Hub', function() {
    describe('Check Empty Data', function() {
        it('should have empty data', function(done) {

            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            DEVICE_ID = testUtils.get("DEVICE_ID");

            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });
    describe('Check consent_history', function() {
        it('should take timestamp in milliseconds', function(done) {
            var timestamp = "1234567890123";
            request
                .post('/i?app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&consent={"session":true}' + '&timestamp=' + timestamp)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Success");
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
        it('should update timestamp values as milliseconds on the db', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    const tsControl = ob.aaData.every(item => {
                        const tsString = String(item.ts);
                        if (tsString.length === 13) {
                            return done();
                        }
                        else {
                            return done(err);
                        }
                    });
                });
        });
    });

    describe('Check consent current', function() {
        it('should return current consent', function(done) {
            request
                .get('/o/consent/current?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.Object;
                    setTimeout(done, 100);
                });
        });
    });
    describe('Check app_users consents', function() {
        // The consent table is a fixed set of columns. The projection used to be
        // taken from the request when supplied, so project={} - which Mongo reads
        // as "all fields" - returned whole app_users documents (name, email,
        // phone, custom properties, payment totals, location) to any caller with
        // compliance_hub read. The projection is now fixed server side.
        // _id is included because Mongo returns it unless explicitly excluded.
        var ALLOWED_FIELDS = ["_id", "did", "d", "av", "consent", "lac", "uid", "appUserExport"];

        it('should list app users with consent data', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.Object;
                    setTimeout(done, 100);
                });
        });

        it('should ignore an empty projection supplied by the caller', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&project=' + encodeURIComponent('{}'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array;
                    ob.aaData.forEach(function(row) {
                        Object.keys(row).forEach(function(field) {
                            ALLOWED_FIELDS.should.containEql(field);
                        });
                    });
                    setTimeout(done, 100);
                });
        });

        it('should ignore an explicit projection asking for extra fields', function(done) {
            var project = JSON.stringify({uid: 1, did: 1, name: 1, email: 1, username: 1, custom: 1, consent: 1});
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&project=' + encodeURIComponent(project))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.forEach(function(row) {
                        row.should.not.have.property('name');
                        row.should.not.have.property('email');
                        row.should.not.have.property('username');
                        row.should.not.have.property('custom');
                        Object.keys(row).forEach(function(field) {
                            ALLOWED_FIELDS.should.containEql(field);
                        });
                    });
                    setTimeout(done, 100);
                });
        });

        it('should ignore the projection alias parameter as well', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&projection=' + encodeURIComponent('{}'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.forEach(function(row) {
                        Object.keys(row).forEach(function(field) {
                            ALLOWED_FIELDS.should.containEql(field);
                        });
                    });
                    setTimeout(done, 100);
                });
        });
    });

    describe('Check app_users consents query fields', function() {
        // The response is limited to the consent table columns, so the query that
        // drives the count and the rows is limited to the same columns. Anything
        // else is rejected with 400, not removed from the query.
        var uniq = Date.now();
        var QUERY_DEVICE_ID = "compliance_query_" + uniq;
        var memberApiKey = "";
        var memberId = "";
        var queryUid = "";

        /**
         * Call /o/app_users/consents as the compliance_hub-only member
         * @param {object} query - query object, sent as JSON
         * @param {number} status - expected HTTP status
         * @param {function} cb - callback(err, parsed body)
         */
        function consentsQuery(query, status, cb) {
            request
                .get('/o/app_users/consents?api_key=' + memberApiKey + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(JSON.stringify(query)))
                .expect(status)
                .end(function(err, res) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, JSON.parse(res.text));
                });
        }

        /**
         * Expect a query to be rejected with 400 naming the field
         * @param {object} query - query object
         * @param {string} field - field the error message must name
         * @param {function} done - mocha callback
         */
        function expectRejected(query, field, done) {
            consentsQuery(query, 400, function(err, ob) {
                if (err) {
                    return done(err);
                }
                ob.should.have.property('result', 'Query field not allowed: ' + field);
                done();
            });
        }

        /**
         * Expect a query to be accepted with the given count
         * @param {object} query - query object
         * @param {number} count - expected number of matching users
         * @param {function} done - mocha callback
         */
        function expectCount(query, count, done) {
            consentsQuery(query, 200, function(err, ob) {
                if (err) {
                    return done(err);
                }
                ob.should.have.property('iTotalDisplayRecords', count);
                ob.aaData.should.have.length(count);
                done();
            });
        }

        before(function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + QUERY_DEVICE_ID + '&begin_session=1&location=' + encodeURIComponent('42.1,12.5') + '&consent=' + encodeURIComponent(JSON.stringify({sessions: true, location: false})))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    var perm = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
                    perm.r[APP_ID] = {all: false, allowed: {compliance_hub: true}};
                    var userParams = {full_name: "chuser" + uniq, username: "chuser" + uniq, password: "p4ssw0rD!", email: "chuser" + uniq + "@mail.test", permission: perm};
                    request
                        .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
                        .expect(200)
                        .end(function(createErr, res) {
                            if (createErr) {
                                return done(createErr);
                            }
                            memberApiKey = res.body.api_key;
                            memberId = res.body._id;
                            should.exist(memberApiKey);
                            setTimeout(done, 500 * testUtils.testScalingFactor);
                        });
                });
        });

        after(function(done) {
            request
                .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [memberId]})))
                .end(function() {
                    done();
                });
        });

        it('should match a user by did', function(done) {
            consentsQuery({did: QUERY_DEVICE_ID}, 200, function(err, ob) {
                if (err) {
                    return done(err);
                }
                ob.should.have.property('iTotalDisplayRecords', 1);
                ob.aaData.should.have.length(1);
                ob.aaData[0].should.have.property('did', QUERY_DEVICE_ID);
                ob.aaData[0].should.have.property('uid');
                queryUid = ob.aaData[0].uid;
                done();
            });
        });

        it('should match a user by uid', function(done) {
            expectCount({uid: queryUid}, 1, done);
        });

        it('should match on consent.* fields', function(done) {
            expectCount({did: QUERY_DEVICE_ID, "consent.sessions": true}, 1, done);
        });

        it('should not match when a consent.* condition does not hold', function(done) {
            expectCount({did: QUERY_DEVICE_ID, "consent.location": true}, 0, done);
        });

        it('should accept consent table columns inside $and/$or/$nor', function(done) {
            expectCount({$and: [{did: QUERY_DEVICE_ID}, {$or: [{"consent.sessions": true}, {uid: "none"}]}, {$nor: [{"consent.location": true}]}]}, 1, done);
        });

        it('should reject a query on first_req_post', function(done) {
            expectRejected({did: QUERY_DEVICE_ID, first_req_post: {$exists: true}}, "first_req_post", done);
        });

        it('should reject a query on loc.geo.coordinates.1', function(done) {
            expectRejected({did: QUERY_DEVICE_ID, "loc.geo.coordinates.1": {$gt: 40}}, "loc.geo.coordinates.1", done);
        });

        it('should reject a hidden field nested inside $and/$or', function(done) {
            expectRejected({$and: [{did: QUERY_DEVICE_ID}, {$or: [{uid: queryUid}, {"custom.plan": "pro"}]}]}, "custom.plan", done);
        });

        it('should reject other top level operators', function(done) {
            expectRejected({$expr: {$gt: ["$loc.geo.coordinates.1", 40]}}, "$expr", done);
        });

        it('should reject a hidden field passed through the filter alias', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + memberApiKey + '&app_id=' + APP_ID + '&filter=' + encodeURIComponent(JSON.stringify({name: {$exists: true}})))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'Query field not allowed: name');
                    done();
                });
        });
    });

    describe('Reset App', function() {
        it('should reset data', function(done) {
            var params = {app_id: APP_ID, period: "reset"};
            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
    });
    describe('Verify Empty Data', function() {
        it('should have empty data', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });
});