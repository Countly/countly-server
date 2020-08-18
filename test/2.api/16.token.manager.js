var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var crypto = require('crypto');
var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";
var APP_ID2 = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";
var token1 = "";
var token2 = "";

var validate_token = function(token_id, values, token_count, done) {
    request
        .get('/o/token/list?api_key=' + API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res) {
            if (err) {
                return done(err);
            }
            var ob = JSON.parse(res.text);
            ob.should.have.property('result');
            var found = false;
            if (ob.result.length == token_count) {
                for (var p = 0; p < ob.result.length; p++) {
                    if (ob.result[p] && ob.result[p]["_id"] && ob.result[p]._id.valueOf() == token_id.valueOf()) {
                        ob.result[p].should.have.property("ttl", values.ttl);
                        ob.result[p].should.have.property("multi", values.multi);
                        ob.result[p].should.have.property("endpoint", values.endpoint);
                        ob.result[p].should.have.property("purpose", values.purpose);
                        ob.result[p].should.have.property("app", values.app);
                        done();
                        return;
                    }
                }
                done("token missing");
            }
            else {
                done("invalid token count " + ob.result.length + "(" + token_count + ")");
            }
        });
};

describe('Testing token manager', function() {
    it('getting empty token list(if not - clear it)', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o/token/list?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob = ob.result;
                if (ob.length > 0) {
                    testUtils.db.collection("auth_tokens").remove({owner: ob[0]["owner"]}, function(err, res) {
                        done();
                    });
                }
                else {
                    done();
                }
            });
    });

    it('creating token with def settings', function(done) {
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                if (ob && ob.result && ob.result != "") {
                    token1 = ob.result;
                }
                else {
                    done("token value not returned");
                }
                done();
            });
    });

    it('validate token' + token1, function(done) {
        validate_token(token1, {"app": "", "multi": true, "ttl": 1800, "endpoint": "", "purpose": ""}, 1, done);
    });

    it('deleting created token', function(done) {
        request
            .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('getting empty token list', function(done) {
        request
            .get('/o/token/list?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('result', []);
                done();
            });
    });

    it('creating token with multi==false', function(done) {
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=false')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                if (ob && ob.result && ob.result != "") {
                    token1 = ob.result;
                }
                else {
                    done("token value not returned");
                }
                done();
            });
    });

    it('validate token' + token1, function(done) {
        validate_token(token1, {"app": "", "multi": false, "ttl": 1800, "endpoint": "", "purpose": ""}, 1, done);
    });
    it('using token' + token1, function(done) {
        request
            .get('/o/token/list?auth_token=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('using again should not allow', function(done) {
        request
            .get('/o/token/list?auth_token=' + token1)
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should get empty token list', function(done) {
        request
            .get('/o/token/list?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('result', []);
                done();
            });
    });

    it('creating token with purpose single endpoint and  ttl', function(done) {
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&ttl=300&purpose=My test token&endpoint=/o/token&apps=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                if (ob && ob.result && ob.result != "") {
                    token1 = ob.result;
                }
                else {
                    done("token value not returned");
                }
                done();
            });
    });

    it('validate token' + token1, function(done) {
        validate_token(token1, {"app": [APP_ID], "multi": true, "ttl": 300, "endpoint": ["/o/token"], "purpose": "My test token"}, 1, done);
    });

    it('using token' + token1, function(done) {
        request
            .get('/o/token/list?auth_token=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('using on different endpoint should not allow', function(done) {
        request
            .get('/o/apps/mine?auth_token=' + token1)
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('deleting created token', function(done) {
        request
            .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('creating token for multiple endpoints', function(done) {
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&ttl=300&purpose=My test token&endpoint=/o/apps/mine,/o/token,/o/apps/details&apps=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                if (ob && ob.result && ob.result != "") {
                    token1 = ob.result;
                }
                else {
                    done("token value not returned");
                }
                done();
            });
    });

    it('validate token' + token1, function(done) {
        validate_token(token1, {"app": [APP_ID], "multi": true, "ttl": 300, "endpoint": ["/o/apps/mine", "/o/token", "/o/apps/details"], "purpose": "My test token"}, 1, done);
    });


    it('creating another app', function(done) {
        var appName = "Test token app";
        var params = {name: appName};
        request
            .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('name', appName);
                APP_ID2 = ob._id;
                done();
            });
    });

    it('using token to reach allowed app', function(done) {
        request
            .get('/o/apps/details?app_id=' + APP_ID + '&auth_token=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('using token to reach not allowed app', function(done) {
        request
            .get('/o/apps/details?app_id=' + APP_ID2 + '&auth_token=' + token1)
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should delete app', function(done) {
        var params = {app_id: APP_ID2};
        request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('result', 'Success');
                done();
            });
    });
    it('deleting created token', function(done) {
        request
            .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + token1)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    describe('Testing token with querystring', function() {
        it('creating token for multiple endpoints', function(done) {
            var endpointquery = [{"endpoint": '/o', "params": {method: "get_events"}}];
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&ttl=300&purpose=My test token2&endpointquery=' + JSON.stringify(endpointquery) + '&apps=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob && ob.result && ob.result != "") {
                        token2 = ob.result;
                        console.log(token2);
                    }
                    else {
                        done("token value not returned");
                    }
                    done();
                });
        });

        it('validate token' + token1, function(done) {
            validate_token(token2, {"app": [APP_ID], "multi": true, "ttl": 300, "endpoint": [{"endpoint": '/o', "params": {method: "get_events"}}], "purpose": "My test token2"}, 1, done);
        });

        it('Using token ' + token2 + ' to reach valid endpoint with valid params', function(done) {
            console.log('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + token2);
            request
                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + token2)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('Using token ' + token2 + ' to reach valid endpoint with different method', function(done) {
            request
                .get('/o?app_id=' + APP_ID + '&method=all_apps&auth_token=' + token2)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });
});