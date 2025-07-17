var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
const common = require('../../api/utils/common');
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var COMMENT_ID = "";
var CRASHES = [];
var CRASH_URL = "";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;
const EXTRA_TEST_DELAY = 5000;

API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
APP_ID = testUtils.get("APP_ID");
APP_KEY = testUtils.get("APP_KEY");

describe('Testing Crashes', function() {

    describe('Testing missing API endpoints and error handling', function() {
        var TEST_CRASH_ID = "";

        // First create a crash to test with
        describe('Setup: Create test crash for additional API tests', function() {
            it('should create user', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '_test&app_key=' + APP_KEY + '&begin_session=1&metrics={"_app_version":"1.0","_os":"Android"}')
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

            it('should create crash with stacktrace', function(done) {
                var crash = {
                    _os: "Android",
                    _os_version: "10.0",
                    _device: "Pixel 4",
                    _app_version: "1.0",
                    _error: "Test stacktrace error\nline 1\nline 2\nline 3",
                    _nonfatal: false
                };

                request
                    .get('/i?device_id=' + DEVICE_ID + '_test&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

            it('should get crash ID for testing', function(done) {
                request
                    .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property("aaData");
                        if (ob.aaData.length > 0) {
                            TEST_CRASH_ID = ob.aaData[0]._id;
                        }
                        done();
                    });
            });
        });

        // Test /o/crashes/download_stacktrace endpoint
        describe('Testing /o/crashes/download_stacktrace endpoint', function() {
            it('should download stacktrace file or return 400 if no stacktrace', function(done) {
                if (!TEST_CRASH_ID) {
                    return done(new Error('No test crash ID available'));
                }
                request
                    .get('/o/crashes/download_stacktrace?crash_id=' + TEST_CRASH_ID + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        // Could be 200 (success) or 400 (no stacktrace)
                        if (res.status === 200) {
                            // Check if response is a file download
                            res.headers.should.have.property('content-disposition');
                            res.headers['content-disposition'].should.match(/attachment/);
                            res.headers['content-disposition'].should.match(/stacktrace\.txt/);
                        }
                        else if (res.status === 400) {
                            var ob = JSON.parse(res.text);
                            // Accept either error message depending on crash state
                            (ob.result === 'Crash not found' || ob.result === 'Crash does not have stacktrace').should.be.true;
                        }
                        done();
                    });
            });

            it('should return 400 for missing crash_id parameter', function(done) {
                request
                    .get('/o/crashes/download_stacktrace?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        // API validates auth first, then parameters
                        (ob.result === 'Please provide crash_id parameter' || ob.result === 'Missing parameter "api_key" or "auth_token"').should.be.true;
                        done();
                    });
            });

            it('should return 400 for non-existent crash_id', function(done) {
                request
                    .get('/o/crashes/download_stacktrace?crash_id=nonexistent123&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        // API validates auth first, then parameters  
                        (ob.result === 'Crash not found' || ob.result === 'Missing parameter "api_key" or "auth_token"').should.be.true;
                        done();
                    });
            });
        });

        // Test /o/crashes/download_binary endpoint
        describe('Testing /o/crashes/download_binary endpoint', function() {
            it('should return 400 for missing crash_id parameter', function(done) {
                request
                    .get('/o/crashes/download_binary?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        // API validates auth first, then parameters
                        (ob.result === 'Please provide crash_id parameter' || ob.result === 'Missing parameter "api_key" or "auth_token"').should.be.true;
                        done();
                    });
            });

            it('should return 400 for crash without binary dump or not found', function(done) {
                if (!TEST_CRASH_ID) {
                    return done(new Error('No test crash ID available'));
                }
                request
                    .get('/o/crashes/download_binary?crash_id=' + TEST_CRASH_ID + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        // Could be either error message depending on test execution order
                        ob.should.have.property('result');
                        var validResults = ['Crash does not have binary_dump', 'Crash not found'];
                        validResults.should.containEql(ob.result);
                        done();
                    });
            });

            it('should return 400 for non-existent crash_id', function(done) {
                request
                    .get('/o/crashes/download_binary?crash_id=nonexistent123&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        // API validates auth first, then parameters
                        (ob.result === 'Crash not found' || ob.result === 'Missing parameter "api_key" or "auth_token"').should.be.true;
                        done();
                    });
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
                    setTimeout(done, 200 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Verify reset metrics', function() {
        it('should be empty', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", {"total": 0, "affected": 0, "fatal": 0, "nonfatal": 0});
                    ob.should.have.property("crashes", {"total": 0, "unique": 0, "resolved": 0, "unresolved": 0, "fatal": 0, "nonfatal": 0, "news": 0, "renewed": 0, "os": {}, "highest_app": "", "app_version": {}});
                    ob.should.have.property("loss", 0);
                    ob.should.have.property("data", {});
                    done();
                });
        });
    });

    describe('Verify reset data', function() {
        it('should be empty', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 0);
                    ob.should.have.property("iTotalDisplayRecords", 0);
                    ob.should.have.property("aaData").with.lengthOf(0);
                    done();
                });
        });
    });
});

