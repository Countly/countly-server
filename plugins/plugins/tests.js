/*global describe,it,before,after */
var request = require('supertest');
var should = require('should');
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

// Configuration read by someone who is not a global admin is reduced twice over.
//
// The allow-list is the control: setReadableConfigs declares what some part of the
// dashboard needs, and nothing else is returned. A setting added tomorrow is private
// until somebody declares it, so forgetting costs a missing input rather than a leak.
//
// Masking is the backstop: a value marked with setSecretConfigs is withheld even if it
// is declared readable by mistake.
//
// /o/configs is validateAppAdmin, so an app admin reaches it; /i/configs is
// validateGlobalAdmin, so only a global admin can write. That is why masking needs no
// write guard: the only callers who can write are the only callers who see real values.
describe('Testing configs read reduction', function() {
    var MASK = "********";
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var memberApiKey = "";
    var memberUserId = "";
    var uniq = Date.now();

    it('should give a global admin the full configuration', function(done) {
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
                // the signing key self-generates, so it is always set
                ob.should.have.property("reports");
                ob.reports.secretKey.should.not.equal(MASK);
                ob.reports.secretKey.length.should.be.above(0);
                // and the namespaces a non-global admin will not get
                ob.should.have.property("security");
                ob.security.should.have.property("proxy_password");
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

    it('should withhold undeclared namespaces from an app admin entirely', function(done) {
        request
            .get('/o/configs?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                // nothing in these is needed by the dashboard, so the whole namespace
                // goes, credential or not
                ob.should.not.have.property("reports");
                ob.should.not.have.property("push");
                ob.should.not.have.property("recaptcha");
                // no value anywhere in the response looks like the signing key
                JSON.stringify(ob).should.not.match(/secretKey/);
                done();
            });
    });

    it('should withhold the proxy credentials while keeping the password policy', function(done) {
        request
            .get('/o/configs?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property("security");
                ob.security.should.not.have.property("proxy_password");
                ob.security.should.not.have.property("proxy_username");
                // the dashboard validates a new password against these before sending it
                ob.security.should.have.property("password_min");
                ob.security.password_min.should.not.equal(MASK);
                done();
            });
    });

    it('should still return every setting App Management renders', function(done) {
        // App Management infers each input's widget from the type of the value here, so
        // a key missing from the allow-list makes that setting disappear from the screen
        // with no error. The list is read from the frontend rather than duplicated, so
        // adding a key there without declaring it readable fails this test.
        var fs = require('fs');
        var path = require('path');
        var viewsFile = path.resolve(__dirname, 'frontend/public/javascripts/countly.views.js');
        var src = fs.readFileSync(viewsFile, 'utf8');
        var block = /var showInAppManagment\s*=\s*\{\s*"api"\s*:\s*\{([\s\S]*?)\}/.exec(src);
        should.exist(block);
        var wanted = (block[1].match(/"([a-z_]+)"\s*:\s*true/g) || []).map(function(m) {
            return /"([a-z_]+)"/.exec(m)[1];
        });
        wanted.length.should.be.above(0);

        request
            .get('/o/configs?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property("api");
                wanted.forEach(function(key) {
                    ob.api.should.have.property(key);
                });
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
