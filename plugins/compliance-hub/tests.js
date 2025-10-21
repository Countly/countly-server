var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var USER_UID = "";

describe('Testing Compliance Hub', function() {
    describe('Setup Test Environment', function() {
        it('should initialize test variables', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            DEVICE_ID = testUtils.get("DEVICE_ID") || "1234567890";
            USER_UID = "test_user_" + Date.now();
            done();
        });
    });

    describe('Initial Empty Data Check', function() {
        it('should have empty consent history data', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    ob.aaData.length.should.equal(0);
                    setTimeout(done, 100);
                });
        });

        it('should have empty app users consent data', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });
    });

    describe('/o Endpoint - Consent Analytics Data', function() {
        it('should get consent analytics data with method=consents', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=consents')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.Object();
                    setTimeout(done, 100);
                });
        });

        it('should get consent analytics data with period parameter', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=consents&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.Object();
                    setTimeout(done, 100);
                });
        });

        it('should return error for missing method parameter', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // This should return 400 since method parameter is missing for /o endpoint
                    setTimeout(done, 100);
                });
        });
    });

    describe('User Consent Data Creation', function() {
        it('should create user with consent data', function(done) {
            var consentData = {
                "sessions": true,
                "events": true,
                "views": false,
                "crashes": true,
                "push": false,
                "users": true
            };
            var timestamp = Date.now().toString();

            request
                .post('/i?app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&consent=' + JSON.stringify(consentData) + '&timestamp=' + timestamp)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Success");
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });

        it('should update user consent data', function(done) {
            var updatedConsent = {
                "sessions": true,
                "events": false,
                "views": true,
                "crashes": true,
                "push": true,
                "users": true
            };
            var timestamp = Date.now().toString();

            request
                .post('/i?app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&consent=' + JSON.stringify(updatedConsent) + '&timestamp=' + timestamp)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Success");
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
    });

    describe('/o/consent/current Endpoint', function() {
        it('should get current consent without query parameter', function(done) {
            request
                .get('/o/consent/current?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    // Should return null or empty object when no specific user query
                    setTimeout(done, 100);
                });
        });

        it('should get current consent with device_id query', function(done) {
            var query = JSON.stringify({"did": DEVICE_ID});
            request
                .get('/o/consent/current?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(query))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob) {
                        ob.should.be.an.Object();
                        // Verify consent structure
                        if (ob.sessions !== undefined) {
                            ob.sessions.should.be.a.Boolean();
                        }
                        if (ob.events !== undefined) {
                            ob.events.should.be.a.Boolean();
                        }
                        if (ob.views !== undefined) {
                            ob.views.should.be.a.Boolean();
                        }
                        if (ob.crashes !== undefined) {
                            ob.crashes.should.be.a.Boolean();
                        }
                        if (ob.push !== undefined) {
                            ob.push.should.be.a.Boolean();
                        }
                        if (ob.users !== undefined) {
                            ob.users.should.be.a.Boolean();
                        }
                    }
                    setTimeout(done, 100);
                });
        });

        it('should return 400 for missing app_id', function(done) {
            request
                .get('/o/consent/current?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.containEql('Missing parameter "app_id"');
                    setTimeout(done, 100);
                });
        });
    });

    describe('/o/consent/search Endpoint', function() {
        it('should search consent history with basic parameters', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.should.have.property('iTotalRecords');
                    ob.should.have.property('iTotalDisplayRecords');
                    ob.aaData.should.be.an.Array();
                    if (ob.aaData.length > 0) {
                        var record = ob.aaData[0];
                        record.should.have.property('device_id');
                        record.should.have.property('ts');
                        record.should.have.property('type');
                        record.should.have.property('after');
                        record.should.have.property('change');
                    }
                    setTimeout(done, 100);
                });
        });

        it('should search consent history with query filter', function(done) {
            var query = JSON.stringify({"type": "i"});
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(query))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should search consent history with pagination', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&limit=5&skip=0')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    ob.aaData.length.should.be.belowOrEqual(5);
                    setTimeout(done, 100);
                });
        });

        it('should search consent history with DataTables parameters', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&sEcho=1&iDisplayLength=10&iDisplayStart=0&iSortCol_0=0&sSortDir_0=desc')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('sEcho', '1');
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should search consent history with device search', function(done) {
            var searchTerm = DEVICE_ID ? DEVICE_ID.substring(0, 5) : "12345";
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&sSearch=' + searchTerm)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should search consent history with period filter', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should return 400 for missing app_id', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.containEql('Missing parameter "app_id"');
                    setTimeout(done, 100);
                });
        });
    });

    describe('/o/app_users/consents Endpoint', function() {
        it('should get app users with consent data', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.should.have.property('iTotalRecords');
                    ob.should.have.property('iTotalDisplayRecords');
                    ob.aaData.should.be.an.Array();
                    if (ob.aaData.length > 0) {
                        var user = ob.aaData[0];
                        user.should.have.property('did');
                        if (user.consent) {
                            user.consent.should.be.an.Object();
                        }
                    }
                    setTimeout(done, 100);
                });
        });

        it('should get app users with consent query filter', function(done) {
            var query = JSON.stringify({"consent.sessions": true});
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(query))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should get app users with custom projection', function(done) {
            var project = JSON.stringify({"did": 1, "consent": 1});
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&project=' + encodeURIComponent(project))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should get app users with pagination', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&limit=5&skip=0')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    ob.aaData.length.should.be.belowOrEqual(5);
                    setTimeout(done, 100);
                });
        });

        it('should get app users with DataTables parameters', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&sEcho=2&iDisplayLength=10&iDisplayStart=0&iSortCol_0=0&sSortDir_0=asc')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('sEcho', '2');
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should search app users by device_id', function(done) {
            var searchTerm = DEVICE_ID ? DEVICE_ID.substring(0, 5) : "12345";
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&sSearch=' + searchTerm)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });

        it('should return 400 for missing app_id', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.containEql('Missing parameter "app_id"');
                    setTimeout(done, 100);
                });
        });
    });

    describe('Consent History Validation', function() {
        it('should verify consent history timestamps are in milliseconds', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.aaData && ob.aaData.length > 0) {
                        ob.aaData.forEach(function(item) {
                            item.should.have.property('ts');
                            var tsString = String(item.ts);
                            tsString.length.should.equal(13); // Milliseconds timestamp should be 13 digits
                        });
                    }
                    setTimeout(done, 100);
                });
        });

        it('should verify consent history contains required fields', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.aaData && ob.aaData.length > 0) {
                        ob.aaData.forEach(function(item) {
                            item.should.have.property('device_id');
                            item.should.have.property('app_id');
                            item.should.have.property('ts');
                            item.should.have.property('type');
                            item.should.have.property('after');
                            item.should.have.property('change');
                            item.should.have.property('cd');
                            if (item.uid) {
                                item.uid.should.be.a.String();
                            }
                        });
                    }
                    setTimeout(done, 100);
                });
        });
    });

    describe('Error Handling Tests', function() {
        it('should handle invalid JSON in query parameters', function(done) {
            var invalidQuery = "invalid{json}";
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(invalidQuery))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // Should handle gracefully and use empty query
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    setTimeout(done, 100);
                });
        });

        it('should handle invalid sort parameters', function(done) {
            var invalidSort = "invalid{json}";
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&sort=' + encodeURIComponent(invalidSort))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // Should handle gracefully and use default sort
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    setTimeout(done, 100);
                });
        });

        it('should handle invalid project parameters', function(done) {
            var invalidProject = "invalid{json}";
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&project=' + encodeURIComponent(invalidProject))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // Should handle gracefully and use default projection
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    setTimeout(done, 100);
                });
        });
    });

    describe('POST Method Support Tests', function() {
        it('should support POST method for consent search', function(done) {
            request
                .post('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    setTimeout(done, 100);
                });
        });

        it('should support POST method for app users consents', function(done) {
            request
                .post('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    setTimeout(done, 100);
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

    describe('Verify Empty Data After Reset', function() {
        it('should have empty consent history data after reset', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    ob.aaData.length.should.equal(0);
                    setTimeout(done, 100);
                });
        });

        it('should have empty app users consent data after reset', function(done) {
            request
                .get('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('aaData');
                    ob.aaData.should.be.an.Array();
                    setTimeout(done, 100);
                });
        });
    });
});