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

    describe('app_users consents query fields', function() {
        // count and search run the query against whole app_users documents, so
        // a query or sort may only reference the columns the endpoint returns.
        // Uses its own app and a member holding only compliance_hub read on it.
        var adminKey = "";
        var appId = "";
        var memberKey = "";
        var memberId = "";
        var uidA = "";
        var uniq = Date.now();

        /**
         * Call /o/app_users/consents as the compliance_hub-only member
         * @param {object} qs - extra query string parameters
         * @returns {Promise} supertest response
         */
        function consents(qs) {
            return request.get('/o/app_users/consents')
                .query(Object.assign({api_key: memberKey, app_id: appId}, qs));
        }

        /**
         * Create an app user on the test app
         * @param {object} data - app user document
         * @returns {Promise<object>} the created document
         */
        async function createAppUser(data) {
            var res = await request.get('/i/app_users/create')
                .query({api_key: adminKey, app_id: appId, data: JSON.stringify(data)})
                .expect(200);
            return JSON.parse(res.body.result.replace(/^User Created: /, ""));
        }

        before(async function() {
            adminKey = testUtils.get("API_KEY_ADMIN");
            var appRes = await request.get('/i/apps/create')
                .query({api_key: adminKey, args: JSON.stringify({name: "ConsentQueryApp" + uniq, type: "mobile"})})
                .expect(200);
            appId = appRes.body._id;

            var perm = {_: {a: [], u: [[appId]]}, c: {}, r: {}, u: {}, d: {}};
            ["c", "u", "d"].forEach(function(t) {
                perm[t][appId] = {all: false, allowed: {}};
            });
            perm.r[appId] = {all: false, allowed: {compliance_hub: true}};
            var userRes = await request.get('/i/users/create')
                .query({api_key: adminKey, args: JSON.stringify({full_name: "consentquery" + uniq, username: "consentquery" + uniq, password: testUtils.password, email: "consentquery" + uniq + "@test.test", permission: perm})})
                .expect(200);
            memberKey = userRes.body.api_key;
            memberId = userRes.body._id;
            should.exist(memberKey);

            var userA = await createAppUser({did: "consent-a", consent: {sessions: true, crashes: true}, loc: {gps: true, geo: {type: "Point", coordinates: [24.1, 56.9]}}, custom: {plan: "gold"}});
            uidA = userA.uid;
            should.exist(uidA);
            await createAppUser({did: "consent-b", consent: {sessions: true, crashes: false}, custom: {plan: "free"}});
            await createAppUser({did: "consent-c", consent: {sessions: false}});
        });

        after(async function() {
            if (memberId) {
                await request.get('/i/users/delete').query({api_key: adminKey, args: JSON.stringify({user_ids: [memberId]})});
            }
            if (appId) {
                await request.get('/i/apps/delete').query({api_key: adminKey, args: JSON.stringify({app_id: appId})});
            }
        });

        it('should list all users without a query', async function() {
            var res = await consents({}).expect(200);
            res.body.iTotalRecords.should.equal(3);
            res.body.aaData.length.should.equal(3);
        });

        it('should filter on did', async function() {
            var res = await consents({query: JSON.stringify({did: "consent-a"})}).expect(200);
            res.body.iTotalRecords.should.equal(1);
            res.body.aaData[0].did.should.equal("consent-a");
        });

        it('should filter on uid', async function() {
            var res = await consents({query: JSON.stringify({uid: uidA})}).expect(200);
            res.body.iTotalRecords.should.equal(1);
            res.body.aaData[0].uid.should.equal(uidA);
        });

        it('should filter on consent fields', async function() {
            var res = await consents({query: JSON.stringify({"consent.sessions": true})}).expect(200);
            res.body.iTotalRecords.should.equal(2);
            res = await consents({query: JSON.stringify({"consent.crashes": false})}).expect(200);
            res.body.iTotalRecords.should.equal(1);
            res.body.aaData[0].did.should.equal("consent-b");
        });

        it('should accept table columns inside $and/$or/$nor', async function() {
            var res = await consents({query: JSON.stringify({$or: [{did: "consent-a"}, {$and: [{"consent.sessions": false}]}]})}).expect(200);
            res.body.iTotalRecords.should.equal(2);
            res = await consents({query: JSON.stringify({$nor: [{did: "consent-a"}]})}).expect(200);
            res.body.iTotalRecords.should.equal(2);
        });

        it('should reject a query on first_req_post', async function() {
            var res = await consents({query: JSON.stringify({first_req_post: ""})}).expect(400);
            res.body.result.should.match(/first_req_post/);
        });

        it('should reject a query on loc.geo.coordinates', async function() {
            var res = await consents({query: JSON.stringify({"loc.geo.coordinates.1": {$gt: 50}})}).expect(400);
            res.body.result.should.match(/loc\.geo\.coordinates\.1/);
        });

        it('should reject a hidden field nested inside $and/$or', async function() {
            var res = await consents({query: JSON.stringify({$and: [{did: "consent-a"}, {$or: [{"custom.plan": "gold"}]}]})}).expect(400);
            res.body.result.should.match(/custom\.plan/);
        });

        it('should reject the filter alias with a hidden field', async function() {
            await consents({filter: JSON.stringify({"custom.plan": "gold"})}).expect(400);
        });

        it('should reject top-level operators other than $and/$or/$nor', async function() {
            await consents({query: JSON.stringify({$expr: {$gt: ["$loc.geo.coordinates", 0]}})}).expect(400);
        });

        it('should reject sorting on a hidden field', async function() {
            await consents({sort: JSON.stringify({"custom.plan": 1})}).expect(400);
        });

        it('should accept sorting on a table column', async function() {
            var res = await consents({sort: JSON.stringify({did: -1})}).expect(200);
            res.body.aaData.map(function(row) {
                return row.did;
            }).should.eql(["consent-c", "consent-b", "consent-a"]);
        });

        it('should serve the dashboard table request (search, sort, paging)', async function() {
            var res = await request.post('/o/app_users/consents')
                .type('form')
                .send({api_key: memberKey, app_id: appId, sEcho: 1, iDisplayStart: 0, iDisplayLength: 10, iSortCol_0: 0, sSortDir_0: "asc", sSearch: "consent-"})
                .expect(200);
            res.body.iTotalRecords.should.equal(3);
            res.body.aaData.map(function(row) {
                return row.did;
            }).should.eql(["consent-a", "consent-b", "consent-c"]);
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