/*global describe,it */
var request = require('supertest');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

// var APP_KEY = "";
var API_KEY_ADMIN = "";
// var APP_ID = "";
// var DEVICE_ID = "1234567890";

describe('Testing Plugins', function() {
    it('should have plugin', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        // APP_ID = testUtils.get("APP_ID");
        // APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o/plugins?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                //{"name":"countly-plugins","title":"Plugins manager","version":"1.0.0","description":"Plugin manager to view and enable/disable plugins","author":"Count.ly","homepage":"https://count.ly","support":"http://community.count.ly/","keywords":["countly","analytics","mobile","plugins"],"dependencies":{},"private":true,"enabled":true,"code":"plugins"}
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.not.be.empty;
                ob.should.be.an.instanceOf(Array);
                for (var i = 0; i < ob.length; i++) {
                    ob[i].should.have.property("name");
                    if (ob[i].name === "countly-plugins") {
                        ob[i].should.have.property("title", "Plugins manager");
                        ob[i].should.have.property("description", "Plugin manager to view and enable/disable plugins");
                        ob[i].should.have.property("author", "Count.ly");
                        ob[i].should.have.property("homepage", "https://count.ly/plugins");
                        ob[i].should.have.property("enabled", true);
                        ob[i].should.have.property("code", "plugins");
                    }
                }
                done();
            });
    });
});

// Configuration values that hold credentials are marked with setSecretConfigs() and
// masked for anyone who is not a global admin. /o/configs is validateAppAdmin, so an
// app admin can see which configuration exists and how their app differs from the
// server default, but not the credential values. Only a global admin can set those
// (/i/configs is validateGlobalAdmin), so only a global admin is shown them.
//
// reports.secretKey is the case that matters most: it self-generates, so it is set on
// every install, and it signs the tokens that /subscribe_report accepts without
// authentication.
describe('Testing configs secret masking', function() {
    var MASK = "********";
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var memberApiKey = "";
    var memberUserId = "";
    var uniq = Date.now();

    it('should read the real secret as a global admin', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        request
            .get('/o/configs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property("reports");
                ob.reports.should.have.property("secretKey");
                ob.reports.secretKey.should.not.equal(MASK);
                ob.reports.secretKey.length.should.be.above(0);
                done();
            });
    });

    it('should create an app admin who is not a global admin', function(done) {
        var permission = {
            _: {a: [APP_ID], u: [[APP_ID]]},
            c: {},
            r: {},
            u: {},
            d: {}
        };
        var userParams = {
            full_name: "cfgadmin" + uniq,
            username: "cfgadmin" + uniq,
            password: "p4ssw0rD!",
            email: "cfgadmin" + uniq + "@mail.test",
            permission: permission
        };
        request
            .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                memberApiKey = res.body.api_key;
                memberUserId = res.body._id;
                memberApiKey.should.not.equal(API_KEY_ADMIN);
                done();
            });
    });

    it('should mask secrets for an app admin', function(done) {
        request
            .get('/o/configs?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.reports.secretKey.should.equal(MASK);
                ob.security.should.have.property("proxy_password");
                ob.security.proxy_password.should.not.match(/[a-z0-9]{6,}/i);
                done();
            });
    });

    it('should still return non-secret configuration to the app admin', function(done) {
        request
            .get('/o/configs?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                // the app management screen needs these, so masking must not touch them
                ob.should.have.property("api");
                ob.api.should.have.property("session_duration_limit");
                ob.api.should.have.property("event_limit");
                ob.security.should.have.property("password_min");
                ob.security.password_min.should.not.equal(MASK);
                // public by design, must not be masked
                if (ob.recaptcha) {
                    ob.recaptcha.should.have.property("site_key");
                    ob.recaptcha.site_key.should.not.equal(MASK);
                }
                done();
            });
    });

    after(function(done) {
        if (!memberUserId) {
            return done();
        }
        request
            .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [memberUserId]})))
            .end(function() {
                done();
            });
    });
});
