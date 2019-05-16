var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);

var APP_KEY = "";
var APP_ID = "";
var API_KEY_ADMIN = "";
var DEVICE_ID = "1234567890";
var userAgent1 = "Mozilla/5.0 (Linux; Android 4.4; Nexus 5 Build/_BuildID_) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36";
var userAgent2 = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3";

describe('Testing Web', function() {
    //{"data":{},"meta":[],"lu":"2015-01-20T12:00:06.176Z"}
    describe('Set app type to web', function() {
        it('should success', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/i/apps/update?args={"app_id":"' + APP_ID + '","type":"web"}&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("type", 'web');
                    done();
                });
        });
    });
    describe('Empty data', function() {
        it('should success', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=latest_users")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.eql([]);
                    done();
                });
        });
    });
    describe('Create user', function() {
        it('should take data from user agent', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + "&device_id=" + DEVICE_ID + "&begin_session=1")
                .set('User-Agent', userAgent1)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });
    });
    describe('Check data', function() {
        it('should success', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=latest_users")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.lengthOf(1);
                    var user = ob[0];
                    user.should.have.property("_id");
                    user.should.have.property("uid", '1');
                    user.should.have.property("did", DEVICE_ID);
                    user.should.have.property("brw", 'Chrome Mobile');
                    user.should.have.property("brwv", '[chrome mobile]_30:0:0');
                    user.should.have.property("d", 'Nexus 5');
                    user.should.have.property("p", 'Android');
                    user.should.have.property("pv", 'a4:4:0');
                    done();
                });
        });
    });
    describe('Create user through pixel', function() {
        it('should take data from user agent', function(done) {
            request
                .get('/pixel.png?app_key=' + APP_KEY + "&device_id=" + DEVICE_ID + "2&begin_session=1")
                .set('User-Agent', userAgent2)
                .expect(200)
                .expect('Content-Type', "image/png")
                .expect('Content-Length', '95')
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });
    });
    describe('Check data', function() {
        it('should success', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=latest_users")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.lengthOf(2);
                    var user;
                    for (var i = 0; i < ob.length; i++) {
                        if (ob[i].uid === "2") {
                            user = ob[i];
                            break;
                        }
                    }
                    user.should.have.property("_id");
                    user.should.have.property("uid", '2');
                    user.should.have.property("did", DEVICE_ID + "2");
                    user.should.have.property("brw", 'Chrome Mobile iOS');
                    user.should.have.property("brwv", '[chrome mobile ios]_19:0:1084');
                    user.should.have.property("d", 'iPhone');
                    user.should.have.property("p", 'iOS');
                    user.should.have.property("pv", 'i5:1:1');
                    done();
                });
        });
    });
    describe('Reset app', function() {
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
    describe('Verify reset', function() {
        it('should success', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=latest_users")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.eql([]);
                    done();
                });
        });
    });
    describe('Set app type to mobile', function() {
        it('should success', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/i/apps/update?args={"app_id":"' + APP_ID + '","type":"mobile"}&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("type", 'mobile');
                    done();
                });
        });
    });
});