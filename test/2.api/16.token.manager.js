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

    //Deliberate change of behaviour: /o/token/list returns whole token documents, and a
    //document's _id is the token itself, so listing hands the caller credentials that may be
    //wider than the one it used. Token listing is therefore restricted to a full-permission
    //credential, and this endpoint-scoped token is refused even though its endpoint matches.
    it('using token' + token1, function(done) {
        request
            .get('/o/token/list?auth_token=' + token1)
            .expect(403)
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

    describe('Token permissions bound every grant to the creating credential', function() {
        var limitedToken = "";
        var fullToken = "";
        var legacyRestrictedToken = "";

        //a token allowed only to read the "core" feature of APP_ID, and nothing else
        var readCorePermission = function(appId) {
            var permission = {_: {a: [], u: [[appId]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[appId] = {all: false, allowed: {core: true}};
            return encodeURIComponent(JSON.stringify(permission));
        };

        //a token that additionally claims delete on everything, which its creator must not pass on
        var deleteAllPermission = function(appId) {
            var permission = {_: {a: [], u: [[appId]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[appId] = {all: false, allowed: {core: true}};
            permission.d[appId] = {all: true, allowed: {}};
            return encodeURIComponent(JSON.stringify(permission));
        };

        var deleteToken = function(id, done) {
            if (!id) {
                return done();
            }
            request
                .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + id)
                .end(function() {
                    done();
                });
        };

        it('setup: api_key creates a token limited to reading core on one app', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&purpose=integration&multi=true&ttl=3600&permission=' + readCorePermission(APP_ID))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    limitedToken = ob.result;
                    (limitedToken !== "").should.equal(true);
                    done();
                });
        });

        it('the limited token can read the feature it was granted', function(done) {
            request
                .get('/o/users/permissions?app_id=' + APP_ID + '&auth_token=' + limitedToken)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('the limited token cannot act as a global admin, even though its owner is one', function(done) {
            request
                .get('/o/users/all?auth_token=' + limitedToken)
                .expect(401)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('the limited token cannot create an unrestricted child', function(done) {
            request
                .get('/i/token/create?auth_token=' + limitedToken + '&multi=true&ttl=300')
                .expect(403)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    //an unrestricted child would carry the owner's full permissions
                    JSON.parse(res.text).should.have.property('result');
                    done();
                });
        });

        it('the limited token cannot grant a permission it does not hold', function(done) {
            request
                .get('/i/token/create?auth_token=' + limitedToken + '&multi=true&ttl=300&permission=' + deleteAllPermission(APP_ID))
                .expect(403)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', "Token permissions must be a subset of the creating credential's permissions");
                    done();
                });
        });

        it('the limited token can create a child within its own permissions', function(done) {
            request
                .get('/i/token/create?auth_token=' + limitedToken + '&multi=true&ttl=300&permission=' + readCorePermission(APP_ID))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    deleteToken(JSON.parse(res.text).result, done);
                });
        });

        //the parent holds ttl 3600, so anything longer than that - "never expires" most of all -
        //would outlive the credential that granted it
        var createChildAndReadTtl = function(ttl, cb) {
            request
                .get('/i/token/create?auth_token=' + limitedToken + '&multi=true&ttl=' + ttl + '&permission=' + readCorePermission(APP_ID))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return cb(err);
                    }
                    var child = JSON.parse(res.text).result;
                    testUtils.db.collection("auth_tokens").findOne({_id: child}, function(dbErr, doc) {
                        if (dbErr || !doc) {
                            return cb(dbErr || "child token missing");
                        }
                        cb(null, doc.ttl, child);
                    });
                });
        };

        it('the child cannot be given a life its parent does not have', function(done) {
            //ttl 0 is "never expires", so this is the widest ask there is
            createChildAndReadTtl(0, function(err, ttl, child) {
                if (err) {
                    return done(err);
                }
                ttl.should.be.above(0);
                ttl.should.be.belowOrEqual(3600);
                deleteToken(child, done);
            });
        });

        it('nor a longer one than its parent has left', function(done) {
            createChildAndReadTtl(99999, function(err, ttl, child) {
                if (err) {
                    return done(err);
                }
                ttl.should.be.belowOrEqual(3600);
                deleteToken(child, done);
            });
        });

        it('but a shorter life than its parent is granted as asked', function(done) {
            createChildAndReadTtl(30, function(err, ttl, child) {
                if (err) {
                    return done(err);
                }
                ttl.should.equal(30);
                deleteToken(child, done);
            });
        });

        it('the limited token cannot be granted login permission', function(done) {
            //the permission the token already holds is supplied, so a narrowing child is the only
            //thing being asked for beyond login - what is refused here is the login grant itself
            request
                .get('/i/token/create?auth_token=' + limitedToken + '&multi=true&ttl=300&can_login=true&permission=' + readCorePermission(APP_ID))
                .expect(403)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'The creating credential cannot grant login permission');
                    done();
                });
        });

        it('the limited token cannot list the owner tokens, which would hand it their secrets', function(done) {
            request
                .get('/o/token/list?auth_token=' + limitedToken)
                .expect(403)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'A restricted token cannot list tokens');
                    done();
                });
        });

        it('the limited token cannot delete the owner tokens', function(done) {
            request
                .get('/i/token/delete?auth_token=' + limitedToken + '&tokenid=' + limitedToken)
                .expect(403)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('a purpose string alone never grants login permission', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&purpose=LoggedInAuth&multi=true&ttl=300')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var forged = JSON.parse(res.text).result;
                    //the token exists, but carries no login permission, so it cannot open a session
                    request
                        .get('/login/token/' + forged)
                        .expect(302)
                        .end(function(err2, res2) {
                            if (err2) {
                                return done(err2);
                            }
                            //rejected logins are redirected back to the login page
                            res2.headers.location.should.not.containEql('/dashboard');
                            deleteToken(forged, done);
                        });
                });
        });

        it('api_key can still create a token, and grant it login permission', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=300&can_login=true')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    fullToken = JSON.parse(res.text).result;
                    (fullToken !== "").should.equal(true);
                    done();
                });
        });

        it('a full-permission token can create a child, as the dashboard session does', function(done) {
            request
                .get('/i/token/create?auth_token=' + fullToken + '&purpose=child&multi=true&ttl=300')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    deleteToken(JSON.parse(res.text).result, done);
                });
        });

        it('and is not capped by its own lifetime, being the owner\'s full authority', function(done) {
            //the lifetime cap is for a credential narrower than its owner. The dashboard session
            //token is not one, and capping it would stop the token manager UI - which creates
            //through that session - from ever issuing a token that does not expire
            request
                .get('/i/token/create?auth_token=' + fullToken + '&purpose=child-never&multi=true&ttl=0')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var child = JSON.parse(res.text).result;
                    testUtils.db.collection("auth_tokens").findOne({_id: child}, function(dbErr, doc) {
                        if (dbErr || !doc) {
                            return done(dbErr || "child token missing");
                        }
                        doc.ttl.should.equal(0);
                        deleteToken(child, done);
                    });
                });
        });

        it('setup: a token restricted the legacy way, by app', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&purpose=legacy&multi=true&ttl=3600&apps=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    legacyRestrictedToken = JSON.parse(res.text).result;
                    done();
                });
        });

        it('a legacy app-restricted token cannot create tokens', function(done) {
            request
                .get('/i/token/create?auth_token=' + legacyRestrictedToken + '&multi=true&ttl=300')
                .expect(403)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'A restricted token cannot create tokens');
                    done();
                });
        });

        it('an endpoint restriction cannot be combined with permissions', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=300&endpoint=/o/users&permission=' + readCorePermission(APP_ID))
                .expect(400)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('cleanup: remove the tokens created here', function(done) {
            deleteToken(limitedToken, function() {
                deleteToken(fullToken, function() {
                    deleteToken(legacyRestrictedToken, done);
                });
            });
        });
    });

    // The checks above cover the token manager itself. These cover what the token can actually
    // reach: the same validators every data endpoint in the product goes through. A token is
    // scoped by app, by CRUD type and by feature, so each of those has to hold on a real
    // endpoint, not just in the permission algebra.
    describe('Scoped tokens are enforced on real data endpoints', function() {
        var readCoreToken = "";
        var updateEventsToken = "";
        var OTHER_APP_ID = "";

        //grant exactly one feature, for one app, under one CRUD type
        var permissionFor = function(appId, type, feature) {
            var permission = {_: {a: [], u: [[appId]]}, c: {}, r: {}, u: {}, d: {}};
            permission[type][appId] = {all: false, allowed: {}};
            permission[type][appId].allowed[feature] = true;
            return encodeURIComponent(JSON.stringify(permission));
        };

        var createToken = function(permission, cb) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=3600&permission=' + permission)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, JSON.parse(res.text).result);
                });
        };

        var removeToken = function(id, done) {
            if (!id) {
                return done();
            }
            request
                .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + id)
                .end(function() {
                    done();
                });
        };

        it('setup: a second app the tokens are not scoped to', function(done) {
            var params = {name: "Token scope other app"};
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    OTHER_APP_ID = JSON.parse(res.text)._id;
                    (OTHER_APP_ID !== "").should.equal(true);
                    done();
                });
        });

        it('setup: a token that may only read core on the first app', function(done) {
            createToken(permissionFor(APP_ID, 'r', 'core'), function(err, token) {
                if (err) {
                    return done(err);
                }
                readCoreToken = token;
                done();
            });
        });

        it('setup: a token that may only update events on the first app', function(done) {
            createToken(permissionFor(APP_ID, 'u', 'events'), function(err, token) {
                if (err) {
                    return done(err);
                }
                updateEventsToken = token;
                done();
            });
        });

        it('the read-core token reads core data on the app it was granted', function(done) {
            request
                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + readCoreToken)
                .expect(200)
                .end(function(err) {
                    done(err);
                });
        });

        //Two layers refuse another app, and this one is caught by the first. The token's app list
        //is derived from its permission, so verify_token rejects the token itself before a member
        //is ever loaded - hence "Token not valid" rather than "User does not have right".
        it('the read-core token cannot read that same data on another app of the same owner', function(done) {
            request
                .get('/o?app_id=' + OTHER_APP_ID + '&method=get_events&auth_token=' + readCoreToken)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'Token not valid');
                    done();
                });
        });

        //...and this one is caught by the second. Passing apps explicitly widens the token's app
        //list to both apps without widening its permission, so the app check lets the request
        //through and the permission intersection is what refuses it. Without that layer a token
        //could reach any app its app list happens to name.
        it('a token whose app list is wider than its permission is still refused by the permission', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=3600&apps=' + APP_ID + ',' + OTHER_APP_ID + '&permission=' + permissionFor(APP_ID, 'r', 'core'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var widerToken = JSON.parse(res.text).result;
                    request
                        .get('/o?app_id=' + OTHER_APP_ID + '&method=get_events&auth_token=' + widerToken)
                        .expect(401)
                        .end(function(err2, res2) {
                            if (err2) {
                                return removeToken(widerToken, function() {
                                    done(err2);
                                });
                            }
                            JSON.parse(res2.text).should.have.property('result', 'User does not have right');
                            //and the app it was actually granted still works
                            request
                                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + widerToken)
                                .expect(200)
                                .end(function(err3) {
                                    removeToken(widerToken, function() {
                                        done(err3);
                                    });
                                });
                        });
                });
        });

        it('the read-core token cannot update, only read', function(done) {
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&auth_token=' + readCoreToken + '&event_order=' + JSON.stringify([]))
                .expect(401)
                .end(function(err) {
                    done(err);
                });
        });

        it('the update-events token cannot read core data, only update events', function(done) {
            request
                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + updateEventsToken)
                .expect(401)
                .end(function(err) {
                    done(err);
                });
        });

        it('the update-events token cannot delete events, only update them', function(done) {
            request
                .get('/i/events/delete_events?app_id=' + APP_ID + '&auth_token=' + updateEventsToken + '&events=' + JSON.stringify(["nonexistent"]))
                .expect(401)
                .end(function(err) {
                    done(err);
                });
        });

        //the granted combination has to get past authorization. Whether the handler then finds an
        //events document for this app depends on fixtures, so what is asserted is that the
        //permission gate let it through rather than a particular success body.
        it('the update-events token passes authorization for the update it was granted', function(done) {
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&auth_token=' + updateEventsToken + '&event_order=' + JSON.stringify([]))
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.status.should.not.equal(401);
                    done();
                });
        });

        it('cleanup: remove the tokens and the second app', function(done) {
            removeToken(readCoreToken, function() {
                removeToken(updateEventsToken, function() {
                    request
                        .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: OTHER_APP_ID}))
                        .end(function() {
                            done();
                        });
                });
            });
        });
    });


    // A token is created in a number of shapes - one feature, several features, several apps, a
    // whole CRUD type - and whatever shape it was created in has to be the shape it is enforced in,
    // on the ordinary validators every plugin goes through. alerts is a plugin feature carrying
    // create/read/update, and events is a core feature carrying update/delete, so between them each
    // CRUD type is exercised on a real endpoint of a real feature.
    describe('Every shape a token is created in is the shape it is enforced in', function() {
        var endpoints = {
            alerts: {c: '/i/alert/save', r: '/o/alert/list', u: '/i/alert/status'},
            events: {u: '/i/events/edit_map', d: '/i/events/delete_events'}
        };
        var created = [];

        // Some handlers only answer once their own parameters are present - /i/alert/status parses
        // qstring.status and, on branches where that parse is not guarded, never replies without it.
        // Authorization is what these cases are about, so each endpoint is given whatever it needs
        // to reply, and the assertion is on the authorization outcome rather than the reply itself.
        var handlerQuery = {
            '/i/alert/status': '&status=' + encodeURIComponent('{}')
        };

        var grant = function(spec) {
            var permission = {_: {a: [], u: [spec.apps]}, c: {}, r: {}, u: {}, d: {}};
            spec.apps.forEach(function(appId) {
                spec.types.forEach(function(type) {
                    permission[type][appId] = {all: !!spec.all, allowed: {}};
                    (spec.features || []).forEach(function(feature) {
                        permission[type][appId].allowed[feature] = true;
                    });
                });
            });
            return encodeURIComponent(JSON.stringify(permission));
        };

        var mint = function(spec, cb) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=3600&permission=' + grant(spec))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return cb(err);
                    }
                    var token = JSON.parse(res.text).result;
                    created.push(token);
                    cb(null, token);
                });
        };

        // What is asserted is the authorization outcome, not the handler's own result: a granted
        // call has to get past the permission gate, a refused one has to be stopped by it. "Not 401"
        // alone is too weak - an endpoint whose plugin is not loaded answers 400 "Invalid path",
        // which would let a test pass without ever reaching a validator.
        var expectAllowed = function(path, appId, token, done, extraQuery) {
            request
                .get(path + '?app_id=' + appId + '&auth_token=' + token + (handlerQuery[path] || '') + (extraQuery || ''))
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var body = {};
                    try {
                        body = JSON.parse(res.text);
                    }
                    catch (ignored) {
                        body = {};
                    }
                    (body.result + "").should.not.equal('Invalid path');
                    res.status.should.not.equal(401);
                    done();
                });
        };

        var expectRefused = function(path, appId, token, done, extraQuery) {
            request
                .get(path + '?app_id=' + appId + '&auth_token=' + token + (handlerQuery[path] || '') + (extraQuery || ''))
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'User does not have right');
                    done();
                });
        };

        // The alerts cases need that plugin installed. Where it is not, its endpoints answer
        // "Invalid path" and those cases are skipped explicitly rather than passing against an
        // endpoint that was never there. The core cases below do not depend on any plugin.
        var alertsInstalled = false;

        before(function(done) {
            request
                .get(endpoints.alerts.r + '?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .end(function(err, res) {
                    var body = {};
                    try {
                        body = JSON.parse(res.text);
                    }
                    catch (ignored) {
                        body = {};
                    }
                    alertsInstalled = (body.result !== 'Invalid path');
                    done();
                });
        });

        //feature, the type it is granted, a type of the same feature it must not reach, and a
        //different feature it must not reach at all
        var cases = [
            {feature: 'alerts', type: 'c', deniedSame: endpoints.alerts.r, deniedOther: endpoints.events.u},
            {feature: 'alerts', type: 'r', deniedSame: endpoints.alerts.u, deniedOther: endpoints.events.u},
            {feature: 'alerts', type: 'u', deniedSame: endpoints.alerts.r, deniedOther: endpoints.events.d},
            {feature: 'events', type: 'u', deniedSame: endpoints.events.d, deniedOther: '/o', deniedOtherQuery: '&method=get_events'},
            {feature: 'events', type: 'd', deniedSame: endpoints.events.u, deniedOther: '/o', deniedOtherQuery: '&method=get_events'}
        ];

        cases.forEach(function(testCase) {
            var token = "";
            var label = testCase.type + ' on ' + testCase.feature;

            it('a token granted only ' + label + ' is created', function(done) {
                if (testCase.feature === 'alerts' && !alertsInstalled) {
                    return this.skip();
                }
                mint({apps: [APP_ID], types: [testCase.type], features: [testCase.feature]}, function(err, minted) {
                    token = minted;
                    done(err);
                });
            });

            it('...reaches the ' + label + ' endpoint', function(done) {
                if (testCase.feature === 'alerts' && !alertsInstalled) {
                    return this.skip();
                }
                expectAllowed(endpoints[testCase.feature][testCase.type], APP_ID, token, done);
            });

            it('...but not another access type of ' + testCase.feature, function(done) {
                if (testCase.feature === 'alerts' && !alertsInstalled) {
                    return this.skip();
                }
                expectRefused(testCase.deniedSame, APP_ID, token, done);
            });

            it('...and not another feature at all', function(done) {
                if (testCase.feature === 'alerts' && !alertsInstalled) {
                    return this.skip();
                }
                expectRefused(testCase.deniedOther, APP_ID, token, done, testCase.deniedOtherQuery);
            });
        });

        it('a token granted two features reaches both of them', function(done) {
            if (!alertsInstalled) {
                return this.skip();
            }
            mint({apps: [APP_ID], types: ['r'], features: ['alerts', 'core']}, function(err, token) {
                if (err) {
                    return done(err);
                }
                expectAllowed(endpoints.alerts.r, APP_ID, token, function(err2) {
                    if (err2) {
                        return done(err2);
                    }
                    expectAllowed('/o', APP_ID, token, done, '&method=get_events');
                });
            });
        });

        it('a token granted a whole CRUD type reaches features that were never named', function(done) {
            if (!alertsInstalled) {
                return this.skip();
            }
            //all:true is the "everything of this type" grant, so it covers features not listed
            mint({apps: [APP_ID], types: ['r'], all: true}, function(err, token) {
                if (err) {
                    return done(err);
                }
                expectAllowed(endpoints.alerts.r, APP_ID, token, function(err2) {
                    if (err2) {
                        return done(err2);
                    }
                    expectAllowed('/o', APP_ID, token, done, '&method=get_events');
                });
            });
        });

        it('a token granted two apps reaches both, and still only the feature it was given', function(done) {
            if (!alertsInstalled) {
                return this.skip();
            }
            var params = {name: "Token shapes second app"};
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var secondApp = JSON.parse(res.text)._id;
                    mint({apps: [APP_ID, secondApp], types: ['r'], features: ['alerts']}, function(err2, token) {
                        if (err2) {
                            return done(err2);
                        }
                        expectAllowed(endpoints.alerts.r, APP_ID, token, function(err3) {
                            if (err3) {
                                return done(err3);
                            }
                            expectAllowed(endpoints.alerts.r, secondApp, token, function(err4) {
                                if (err4) {
                                    return done(err4);
                                }
                                expectRefused('/i/events/edit_map', secondApp, token, function(err5) {
                                    request
                                        .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: secondApp}))
                                        .end(function() {
                                            done(err5);
                                        });
                                });
                            });
                        });
                    });
                });
        });

        it('cleanup: remove the tokens created here', function(done) {
            testUtils.db.collection("auth_tokens").remove({_id: {$in: created}}, function() {
                done();
            });
        });
    });

    // /login/token is the only path that turns a token into a dashboard session, and /session is
    // what that session is then checked with. Both are reached without the api_key, so both are
    // covered here rather than left to the login-permission checks on the create side alone.
    describe('Login permission decides what can open a session', function() {
        var agent = require('supertest').agent(testUtils.url);
        var loginToken = "";
        var scopedToken = "";

        it('setup: api_key mints a token that carries login permission', function(done) {
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=600&can_login=true')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    loginToken = JSON.parse(res.text).result;
                    done();
                });
        });

        it('setup: api_key mints a token scoped to one feature', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=600&permission=' + encodeURIComponent(JSON.stringify(permission)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    scopedToken = JSON.parse(res.text).result;
                    done();
                });
        });

        it('a scoped token cannot be redeemed for a session', function(done) {
            request
                .get('/login/token/' + scopedToken)
                .expect(302)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.headers.location.should.not.containEql('/dashboard');
                    done();
                });
        });

        it('a token with login permission opens a session', function(done) {
            agent
                .get('/login/token/' + loginToken)
                .expect(302)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.headers.location.should.containEql('/dashboard');
                    done();
                });
        });

        it('and the session it opened is a live one', function(done) {
            //the session, not the token, is what /session checks - it reads req.session.auth_token
            agent
                .get('/session?check_session=true')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.equal('success');
                    done();
                });
        });

        it('cleanup: remove the tokens', function(done) {
            testUtils.db.collection("auth_tokens").remove({_id: {$in: [loginToken, scopedToken]}}, function() {
                done();
            });
        });
    });

    // The intersection is recomputed on every request rather than frozen into the token, so a token
    // cannot keep reaching what its owner has since lost.
    describe('A token never outlives the permissions of its owner', function() {
        var memberId = "";
        var memberKey = "";
        var memberToken = "";
        var username = "tokenowner" + Math.round(Math.random() * 100000);

        it('setup: a member who may read core on the app', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            var params = {full_name: "Token Owner", username: username, password: testUtils.password, email: username + "@domain.com", permission: permission};
            request
                .get('/i/users/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('api_key');
                    memberId = ob._id;
                    memberKey = ob.api_key;
                    done();
                });
        });

        it('setup: that member mints a token with the permissions they hold', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            request
                .get('/i/token/create?api_key=' + memberKey + '&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify(permission)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    memberToken = JSON.parse(res.text).result;
                    done();
                });
        });

        it('the token reads what its owner may read', function(done) {
            request
                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + memberToken)
                .expect(200)
                .end(function(err) {
                    done(err);
                });
        });

        it('the owner loses access to the app', function(done) {
            var params = {user_id: memberId, permission: {_: {a: [], u: [[]]}, c: {}, r: {}, u: {}, d: {}}};
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err) {
                    done(err);
                });
        });

        it('and the token loses it with them, without being touched', function(done) {
            request
                .get('/o?app_id=' + APP_ID + '&method=get_events&auth_token=' + memberToken)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'User does not have right');
                    done();
                });
        });

        //removed directly rather than through /i/users/delete, whose result this block would have to
        //ignore: a member left behind here is counted by the later cleanup suite, which asserts that
        //exactly one user remains
        it('cleanup: remove the token and the member', function(done) {
            testUtils.db.collection("auth_tokens").remove({owner: memberId + ""}, function() {
                testUtils.db.collection("members").remove({username: username}, function() {
                    done();
                });
            });
        });
    });


    describe('A grant is bounded by what the owner reaches, not by what its permissions mention', function() {
        // The permission editor writes an entry for every app it could see, so a member
        // routinely carries empty c/r/u/d entries for apps it has no access to at all.
        // Those entries are not access. Naming such an app as a user app in a token is,
        // because validateUserForRead and validateUserForWrite authorize on membership
        // alone - so accepting it would hand the token an app its own owner is refused on.
        var memberId = "";
        var memberKey = "";
        var scopedToken = "";
        var OTHER_APP_ID = "";
        var username = "tokenreach" + Math.round(Math.random() * 100000);

        it('setup: an app the member will not be given access to', function(done) {
            var params = {name: "Token reach other app"};
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    OTHER_APP_ID = JSON.parse(res.text)._id;
                    (OTHER_APP_ID !== "").should.equal(true);
                    done();
                });
        });

        it('setup: a member carrying an empty entry for it, the way the editor stores one', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            permission.r[OTHER_APP_ID] = {all: false, allowed: {}};
            permission.c[OTHER_APP_ID] = {all: false, allowed: {}};
            permission.u[OTHER_APP_ID] = {all: false, allowed: {}};
            permission.d[OTHER_APP_ID] = {all: false, allowed: {}};
            var params = {full_name: "Token Reach", username: username, password: testUtils.password, email: username + "@domain.com", permission: permission};
            request
                .get('/i/users/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('api_key');
                    memberId = ob._id;
                    memberKey = ob.api_key;
                    done();
                });
        });

        it('the member itself is refused on that app', function(done) {
            request
                .get('/o/app_users/loyalty?app_id=' + OTHER_APP_ID + '&api_key=' + memberKey)
                .expect(401)
                .end(function(err) {
                    done(err);
                });
        });

        it('and cannot mint a token that is a member of it', function(done) {
            var permission = {_: {a: [], u: [[OTHER_APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            request
                .get('/i/token/create?api_key=' + memberKey + '&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify(permission)))
                .expect(403)
                .end(function(err) {
                    done(err);
                });
        });

        it('nor one that is a member of it alongside an app it does reach', function(done) {
            var permission = {_: {a: [], u: [[APP_ID, OTHER_APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            request
                .get('/i/token/create?api_key=' + memberKey + '&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify(permission)))
                .expect(403)
                .end(function(err) {
                    done(err);
                });
        });

        it('nor one that administers it, however many features the member holds there', function(done) {
            //give the member every feature on the other app - but no membership of it - and ask for
            //admin. hasAdminAccess is satisfied by the four all grants; membership is not
            var full = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            ["c", "r", "u", "d"].forEach(function(type) {
                full[type][APP_ID] = {all: false, allowed: {core: true}};
                full[type][OTHER_APP_ID] = {all: true, allowed: {}};
            });
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({user_id: memberId, permission: full}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    request
                        .get('/i/token/create?api_key=' + memberKey + '&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify({_: {a: [OTHER_APP_ID], u: [[]]}, c: {}, r: {}, u: {}, d: {}})))
                        .expect(403)
                        .end(function(err2) {
                            if (err2) {
                                return done(err2);
                            }
                            //restore the plain shape the remaining cases rely on
                            var plain = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
                            plain.r[APP_ID] = {all: false, allowed: {core: true}};
                            plain.r[OTHER_APP_ID] = {all: false, allowed: {}};
                            request
                                .get('/i/users/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({user_id: memberId, permission: plain}))
                                .expect(200)
                                .end(done);
                        });
                });
        });

        it('a token for the app the member does reach is still granted', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            request
                .get('/i/token/create?api_key=' + memberKey + '&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify(permission)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    scopedToken = JSON.parse(res.text).result;
                    (scopedToken !== "").should.equal(true);
                    done();
                });
        });

        it('and reads on the app it names, as its owner does', function(done) {
            request
                .get('/o/app_users/loyalty?app_id=' + APP_ID + '&auth_token=' + scopedToken)
                .expect(200)
                .end(function(err) {
                    done(err);
                });
        });

        it('cleanup: remove the token, the member and the app', function(done) {
            testUtils.db.collection("auth_tokens").remove({owner: memberId + ""}, function() {
                testUtils.db.collection("members").remove({username: username}, function() {
                    request
                        .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: OTHER_APP_ID}))
                        .end(function() {
                            done();
                        });
                });
            });
        });
    });


    describe('Account level credential management is closed to a scoped token', function() {
        // Deleting and listing tokens is already refused. The second factor is the same
        // kind of thing and was not: /i/two-factor-auth enable, disable and
        // generate-qr-code go through validateUser, which bounds what a scoped token may
        // touch per app but does not reject the request - and an account level route has
        // no app to bound. disable asks for no current code, so a token narrowed to one
        // feature on one app could switch off the factor protecting everything its owner
        // can reach.
        var scopedToken = "";

        // /i/two-factor-auth exists only where the plugin is enabled. Where it is not,
        // requestProcessor answers 400 "Invalid path", which says nothing about the guard,
        // so the cases below skip rather than pass on a status that proves nothing.
        var twoFactorAvailable = false;

        it('setup: whether the two-factor-auth plugin is present in this build', function(done) {
            request
                .get('/i/two-factor-auth?method=generate-qr-code&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    twoFactorAvailable = !(res.status === 400 && /Invalid path/i.test(res.text || ''));
                    done();
                });
        });

        it('setup: a token that may only read core on one app', function(done) {
            var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
            permission.r[APP_ID] = {all: false, allowed: {core: true}};
            request
                .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&multi=true&ttl=3600&permission='
                    + encodeURIComponent(JSON.stringify(permission)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    scopedToken = JSON.parse(res.text).result;
                    (scopedToken !== "").should.equal(true);
                    done();
                });
        });

        ['disable', 'enable', 'generate-qr-code'].forEach(function(method) {
            it('refuses /i/two-factor-auth?method=' + method, function(done) {
                if (!twoFactorAvailable) {
                    return this.skip();
                }
                request
                    .get('/i/two-factor-auth?method=' + method + '&auth_token=' + scopedToken
                        + '&app_id=' + APP_ID + '&auth_code=123456&secret_token=AAAAAAAAAAAAAAAA')
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.status.should.equal(403,
                            'expected the guard to refuse, got ' + res.status + ': ' + res.text);
                        res.text.indexOf('restricted token').should.not.equal(-1);
                        done();
                    });
            });
        });

        it('still allows the same call with an unrestricted credential', function(done) {
            // the api_key is unscoped, so the guard must not stand in its way. generate-qr-code
            // is the read only one of the three, so it is the safe one to prove this with.
            if (!twoFactorAvailable) {
                return this.skip();
            }
            request
                .get('/i/two-factor-auth?method=generate-qr-code&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.status.should.not.equal(403, 'an unrestricted credential was refused');
                    done();
                });
        });

        it('cleanup: remove the scoped token', function(done) {
            request
                .get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + scopedToken)
                .end(function() {
                    done();
                });
        });
    });

});