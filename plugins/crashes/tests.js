var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var COMMENT_ID = "";
var CRASHES = [];
var CRASH_URL = "";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;

function verifyMetrics(ob, correct) {
    ob.should.not.be.empty;
    if (ob["meta"]) {
        for (var i in ob["meta"]) {
            ob["meta"][i].sort();
        }
    }
    if (correct["meta"]) {
        for (var i in correct["meta"]) {
            correct["meta"][i].sort();
        }
    }
    if (correct.meta) {
        ob.should.have.property("meta").eql(correct.meta);
    }
    for (var i in ob) {
        if (i != "meta") {
            ob.should.have.property(i).and.not.eql({});
            if (RE.test(i)) {
                for (var c in correct) {
                    if (c != "meta") {
                        ob[i].should.have.property(c, correct[c]);
                    }
                }
                for (var j in ob[i]) {
                    if (RE.test(j)) {
                        for (var c in correct) {
                            if (c != "meta") {
                                ob[i][j].should.have.property(c, correct[c]);
                            }
                        }
                        for (var k in ob[i][j]) {
                            if (RE.test(k)) {
                                for (var c in correct) {
                                    if (c != "meta") {
                                        ob[i][j][k].should.have.property(c, correct[c]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

var testNumber = 0;
function verifyCrashMetrics(users, crashes, loss, metrics) {
    testNumber++;
    describe('Check crash metrics #' + testNumber, function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[0]);
                    done();
                });
        });
    });

    describe('Check crash metrics #' + testNumber + ' Android', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1&os=Android")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[1]);
                    done();
                });
        });
    });

    describe('Check crash metrics #' + testNumber + ' iOS', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1&os=iOS")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[2]);
                    done();
                });
        });
    });

    describe('Check crash metrics #' + testNumber + ' version 1.1', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1&app_version=1:1")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[3]);
                    done();
                });
        });
    });

    describe('Check crash metrics #' + testNumber + ' version 1.2', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1&app_version=1:2")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[4]);
                    done();
                });
        });
    });

    describe('Check crash metrics #' + testNumber + ' Android version 1.2', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1&os=Android&app_version=1:2")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", users);
                    ob.should.have.property("crashes", crashes);
                    ob.should.have.property("loss", loss);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, metrics[5]);
                    done();
                });
        });
    });
}

describe('Testing Crashes', function() {
//{"users":{"total":0,"affected":0,"fatal":0,"nonfatal":0},"crashes":{"total":0,"unique":0,"resolved":0,"unresolved":0,"fatal":0,"nonfatal":0,"news":0,"renewed":0,"os":{},"highest_app":""},"loss":0,"groups":[],"data":{}}

    describe('Empty crashes', function() {
        it('should have no crashes', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
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

    describe('Create user', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + '&begin_session=1&metrics={"_app_version":"1.1","_os":"Android"}')
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

    describe('Add crash', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.0";
            crash._device = "Galaxy S3";
            crash._manufacture = "Samsung";
            crash._resolution = "480x800";
            crash._app_version = "1.1";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = true;
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 1, "affected": 1, "fatal": 0, "nonfatal": 1},
        {"total": 1, "unique": 1, "resolved": 0, "unresolved": 1, "fatal": 0, "nonfatal": 1, "news": 1, "renewed": 0, "os": {"Android": 1}, "highest_app": "1.1", "app_version": {"1:1": 1}},
        0,
        [
            {meta: {}, crnf: 1, crunf: 1, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crunf: 1, cr_s: 1, cr_u: 1},
            {},
            {meta: {}, crnf: 1, crunf: 1, cr_s: 1, cr_u: 1},
            {},
            {},
        ]);

    describe('Check crash data', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 1);
                    ob.should.have.property("iTotalDisplayRecords", 1);
                    var crash = ob.aaData[0];
                    crash.should.have.property("_id");
                    crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    crash.should.have.property("is_new", true);
                    crash.should.have.property("is_resolved", false);
                    crash.should.have.property("lastTs");
                    crash.should.have.property("latest_version", "1.1");
                    crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    crash.should.have.property("nonfatal", true);
                    crash.should.have.property("os", 'Android');
                    crash.should.have.property("reports", 1);
                    crash.should.have.property("users", 1);
                    CRASHES[0] = crash._id;
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have provided details', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", true);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.1");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 1});
                    ob.should.have.property("manufacture", {"Samsung": 1});
                    ob.should.have.property("device", {"Galaxy S3": 1});
                    ob.should.have.property("resolution", {"480x800": 1});
                    ob.should.have.property("app_version", {"1:1": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"landscape": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 1}, "googleplay": {"1:0": 1}});
                    ob.should.have.property("root", {"yes": 1});
                    ob.should.have.property("online", {"no": 1});
                    ob.should.have.property("muted", {"no": 1});
                    ob.should.have.property("signal", {"yes": 1});
                    ob.should.have.property("background", {"yes": 1});
                    ob.should.have.property("ram", {"total": 50, "count": 1, "min": 50, "max": 50});
                    ob.should.have.property("bat", {"total": 40, "count": 1, "min": 40, "max": 40});
                    ob.should.have.property("disk", {"total": 20, "count": 1, "min": 20, "max": 20});
                    ob.should.have.property("run", {"total": 60, "count": 1, "min": 60, "max": 60});
                    ob.should.have.property("total", 1);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);
                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Android");
                    report.should.have.property("os_version", "4.0");
                    report.should.have.property("manufacture", "Samsung");
                    report.should.have.property("device", "Galaxy S3");
                    report.should.have.property("resolution", "480x800");
                    report.should.have.property("app_version", "1.1");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 1024);
                    report.should.have.property("ram_total", 2048);
                    report.should.have.property("disk_current", 2048);
                    report.should.have.property("disk_total", 10240);
                    report.should.have.property("bat_current", 40);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "landscape");
                    report.should.have.property("root", 1);
                    report.should.have.property("signal", 1);
                    report.should.have.property("background", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", true);
                    report.should.have.property("run", 60);
                    report.should.have.property("custom", {"facebook": "3.0", "googleplay": "1.0"});
                    report.should.have.property("group", CRASHES[0]);
                    report.should.have.property("uid", "1");
                    report.should.have.property("ts");
                    done();
                });
        });
    });

    describe('Create user', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + '&begin_session=1&metrics={"_app_version":"1.1","_os":"Android"}')
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

    describe('Add same crash for new user', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.0";
            crash._device = "Galaxy S3";
            crash._manufacture = "Samsung";
            crash._resolution = "480x800";
            crash._app_version = "1.1";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = true;
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 2, "affected": 2, "fatal": 0, "nonfatal": 2},
        {"total": 2, "unique": 1, "resolved": 0, "unresolved": 1, "fatal": 0, "nonfatal": 2, "news": 0, "renewed": 0, "os": {"Android": 2}, "highest_app": "1.1", "app_version": {"1:1": 2}},
        0,
        [
            {meta: {}, crnf: 2, crunf: 1, cr_s: 2, cr_u: 2},
            {meta: {}, crnf: 2, crunf: 1, cr_s: 2, cr_u: 2},
            {},
            {meta: {}, crnf: 2, crunf: 1, cr_s: 2, cr_u: 2},
            {},
            {},
        ]);

    describe('Check crash data', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 1);
                    ob.should.have.property("iTotalDisplayRecords", 1);
                    ob.should.have.property("aaData").with.lengthOf(1);
                    var crash = ob.aaData[0];
                    crash.should.have.property("_id", CRASHES[0]);
                    crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    crash.should.have.property("is_new", false);
                    crash.should.have.property("is_resolved", false);
                    crash.should.have.property("lastTs");
                    crash.should.have.property("latest_version", "1.1");
                    crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    crash.should.have.property("nonfatal", true);
                    crash.should.have.property("os", 'Android');
                    crash.should.have.property("reports", 2);
                    crash.should.have.property("users", 2);
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have provided details', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.1");
                    ob.should.have.property("reports", 2);
                    ob.should.have.property("users", 2);
                    ob.should.have.property("os_version", {"4:0": 2});
                    ob.should.have.property("manufacture", {"Samsung": 2});
                    ob.should.have.property("device", {"Galaxy S3": 2});
                    ob.should.have.property("resolution", {"480x800": 2});
                    ob.should.have.property("app_version", {"1:1": 2});
                    ob.should.have.property("cpu", {"armv7": 2});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 2});
                    ob.should.have.property("orientation", {"landscape": 2});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2}, "googleplay": {"1:0": 2}});
                    ob.should.have.property("root", {"yes": 2});
                    ob.should.have.property("online", {"no": 2});
                    ob.should.have.property("muted", {"no": 2});
                    ob.should.have.property("signal", {"yes": 2});
                    ob.should.have.property("background", {"yes": 2});
                    ob.should.have.property("ram", {"total": 100, "count": 2, "min": 50, "max": 50});
                    ob.should.have.property("bat", {"total": 80, "count": 2, "min": 40, "max": 40});
                    ob.should.have.property("disk", {"total": 40, "count": 2, "min": 20, "max": 20});
                    ob.should.have.property("run", {"total": 120, "count": 2, "min": 60, "max": 60});
                    ob.should.have.property("total", 2);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(2);
                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Android");
                    report.should.have.property("os_version", "4.0");
                    report.should.have.property("manufacture", "Samsung");
                    report.should.have.property("device", "Galaxy S3");
                    report.should.have.property("resolution", "480x800");
                    report.should.have.property("app_version", "1.1");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 1024);
                    report.should.have.property("ram_total", 2048);
                    report.should.have.property("disk_current", 2048);
                    report.should.have.property("disk_total", 10240);
                    report.should.have.property("bat_current", 40);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "landscape");
                    report.should.have.property("root", 1);
                    report.should.have.property("signal", 1);
                    report.should.have.property("background", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", true);
                    report.should.have.property("run", 60);
                    report.should.have.property("custom", {"facebook": "3.0", "googleplay": "1.0"});
                    report.should.have.property("group", CRASHES[0]);
                    report.should.have.property("uid", "2");
                    report.should.have.property("ts");

                    var report2 = ob.data[1];
                    report2.should.have.property("_id");
                    report2.should.have.property("os", "Android");
                    report2.should.have.property("os_version", "4.0");
                    report2.should.have.property("manufacture", "Samsung");
                    report2.should.have.property("device", "Galaxy S3");
                    report2.should.have.property("resolution", "480x800");
                    report2.should.have.property("app_version", "1.1");
                    report2.should.have.property("cpu", "armv7");
                    report2.should.have.property("opengl", "openGL ES 2.0");
                    report2.should.have.property("ram_current", 1024);
                    report2.should.have.property("ram_total", 2048);
                    report2.should.have.property("disk_current", 2048);
                    report2.should.have.property("disk_total", 10240);
                    report2.should.have.property("bat_current", 40);
                    report2.should.have.property("bat_total", 100);
                    report2.should.have.property("orientation", "landscape");
                    report2.should.have.property("root", 1);
                    report2.should.have.property("signal", 1);
                    report2.should.have.property("background", 1);
                    report2.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report2.should.have.property("nonfatal", true);
                    report2.should.have.property("run", 60);
                    report2.should.have.property("custom", {"facebook": "3.0", "googleplay": "1.0"});
                    report2.should.have.property("group", CRASHES[0]);
                    report2.should.have.property("uid", "1");
                    report2.should.have.property("ts");
                    done();
                });
        });
    });

    describe('Create another session for user', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + '&begin_session=1&metrics={"_app_version":"1.2"}')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Add same crash with different parameters for same user', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.1";
            crash._device = "Galaxy S4";
            crash._manufacture = "Samsung";
            crash._resolution = "800x1900";
            crash._app_version = "1.2";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 4 * 1024;
            crash._ram_current = 3 * 1024;
            crash._disk_total = 20 * 1024;
            crash._disk_current = 5 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 90;
            crash._orientation = "portrait";

            crash._root = false;
            crash._online = true;
            crash._signal = false;
            crash._muted = true;
            crash._background = false;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = true;
            crash._run = 120;

            crash._custom = {
                "facebook": "3.5",
                "googleplay": "2.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 2, "affected": 2, "fatal": 0, "nonfatal": 2},
        {"total": 3, "unique": 1, "resolved": 0, "unresolved": 1, "fatal": 0, "nonfatal": 3, "news": 0, "renewed": 0, "os": {"Android": 3}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 1}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 2},
            {meta: {}, crnf: 3, crunf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 2},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 1, crauf: 1, cr_s: 2, cr_u: 2},
            {meta: {}, crnf: 1, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should have 1 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 1);
                    ob.should.have.property("iTotalDisplayRecords", 1);
                    ob.should.have.property("aaData").with.lengthOf(1);
                    var crash = ob.aaData[0];
                    crash.should.have.property("_id", CRASHES[0]);
                    crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    crash.should.have.property("is_new", false);
                    crash.should.have.property("is_resolved", false);
                    crash.should.have.property("lastTs");
                    crash.should.have.property("latest_version", "1.2");
                    crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    crash.should.have.property("nonfatal", true);
                    crash.should.have.property("os", 'Android');
                    crash.should.have.property("reports", 3);
                    crash.should.have.property("users", 2);
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have provided details', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 3);
                    ob.should.have.property("users", 2);
                    ob.should.have.property("os_version", {"4:0": 2, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 3});
                    ob.should.have.property("device", {"Galaxy S3": 2, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 2, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 3});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 3});
                    ob.should.have.property("orientation", {"landscape": 2, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2, "3:5": 1}, "googleplay": {"1:0": 2, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 2, "no": 1});
                    ob.should.have.property("online", {"no": 2, "yes": 1});
                    ob.should.have.property("muted", {"no": 2, "yes": 1});
                    ob.should.have.property("signal", {"yes": 2, "no": 1});
                    ob.should.have.property("background", {"yes": 2, "no": 1});
                    ob.should.have.property("ram", {"total": 175, "count": 3, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 170, "count": 3, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 65, "count": 3, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 240, "count": 3, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 1, "count": 1, "min": 1, "max": 1});
                    ob.should.have.property("total", 2);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(3);

                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Android");
                    report.should.have.property("os_version", "4.1");
                    report.should.have.property("manufacture", "Samsung");
                    report.should.have.property("device", "Galaxy S4");
                    report.should.have.property("resolution", "800x1900");
                    report.should.have.property("app_version", "1.2");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 3 * 1024);
                    report.should.have.property("ram_total", 4 * 1024);
                    report.should.have.property("disk_current", 5 * 1024);
                    report.should.have.property("disk_total", 20 * 1024);
                    report.should.have.property("bat_current", 90);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("session", 1);
                    report.should.have.property("orientation", "portrait");
                    report.should.have.property("online", 1);
                    report.should.have.property("muted", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", true);
                    report.should.have.property("run", 120);
                    report.should.have.property("custom", {"facebook": "3.5", "googleplay": "2.0"});
                    report.should.have.property("group", CRASHES[0]);
                    report.should.have.property("uid", "2");
                    report.should.have.property("ts");

                    done();
                });
        });
    });

    describe('Add same crash with different fatality', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.1";
            crash._device = "Galaxy S4";
            crash._manufacture = "Samsung";
            crash._resolution = "800x1900";
            crash._app_version = "1.2";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 4 * 1024;
            crash._ram_current = 3 * 1024;
            crash._disk_total = 20 * 1024;
            crash._disk_current = 5 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 90;
            crash._orientation = "portrait";

            crash._root = false;
            crash._online = true;
            crash._signal = false;
            crash._muted = true;
            crash._background = false;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = false;
            crash._run = 120;

            crash._custom = {
                "facebook": "3.5",
                "googleplay": "2.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 2, "affected": 2, "fatal": 1, "nonfatal": 1},
        {"total": 4, "unique": 2, "resolved": 0, "unresolved": 2, "fatal": 1, "nonfatal": 3, "news": 1, "renewed": 0, "os": {"Android": 4}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 2}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 2},
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 2},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 1, crauf: 1, cr_s: 2, cr_u: 2},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should have 2 crashes', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 2);
                    ob.should.have.property("iTotalDisplayRecords", 2);
                    ob.should.have.property("aaData").with.lengthOf(2);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id == CRASHES[0]) {
                            crash.should.have.property("_id", CRASHES[0]);
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.2");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", true);
                            crash.should.have.property("os", 'Android');
                            crash.should.have.property("reports", 3);
                            crash.should.have.property("users", 2);
                        }
                        else {
                            crash.should.have.property("_id");
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", true);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.2");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'Android');
                            crash.should.have.property("reports", 1);
                            crash.should.have.property("users", 1);
                            CRASHES[1] = crash._id;
                        }
                    }
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have provided details', function(done) {
            request
                .get('/o?group=' + CRASHES[1] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[1]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", true);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 1});
                    ob.should.have.property("device", {"Galaxy S4": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}, "googleplay": {"2:0": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 2);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);

                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Android");
                    report.should.have.property("os_version", "4.1");
                    report.should.have.property("manufacture", "Samsung");
                    report.should.have.property("device", "Galaxy S4");
                    report.should.have.property("resolution", "800x1900");
                    report.should.have.property("app_version", "1.2");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 3 * 1024);
                    report.should.have.property("ram_total", 4 * 1024);
                    report.should.have.property("disk_current", 5 * 1024);
                    report.should.have.property("disk_total", 20 * 1024);
                    report.should.have.property("bat_current", 90);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "portrait");
                    report.should.have.property("online", 1);
                    report.should.have.property("muted", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", false);
                    report.should.have.property("run", 120);
                    report.should.have.property("custom", {"facebook": "3.5", "googleplay": "2.0"});
                    report.should.have.property("group", CRASHES[1]);
                    report.should.have.property("uid", "2");
                    report.should.have.property("ts");

                    done();
                });
        });
    });

    describe('Add same crash with different os with new user', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Windows Phone";
            crash._os_version = "8.1";
            crash._device = "Lumia 560";
            crash._manufacture = "Nokia";
            crash._resolution = "800x1900";
            crash._app_version = "1.2";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 4 * 1024;
            crash._ram_current = 3 * 1024;
            crash._disk_total = 20 * 1024;
            crash._disk_current = 5 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 90;
            crash._orientation = "portrait";

            crash._root = false;
            crash._online = true;
            crash._signal = false;
            crash._muted = true;
            crash._background = false;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = false;
            crash._run = 120;

            crash._custom = {
                "facebook": "3.5"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '3&app_key=' + APP_KEY + '&begin_session=1&metrics={"_app_version":"1.1","_os":"Android"}&crash=' + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 5, "unique": 3, "resolved": 0, "unresolved": 3, "fatal": 2, "nonfatal": 3, "news": 1, "renewed": 0, "os": {"Android": 4, "Windows Phone": 1}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 3}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crfses: 1, crf: 2, cruf: 2, crauf: 1, cr_s: 4, cr_u: 3},
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, cr_s: 4, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should have 3 crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 3);
                    ob.should.have.property("iTotalDisplayRecords", 3);
                    ob.should.have.property("aaData").with.lengthOf(3);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id != CRASHES[0] && crash._id != CRASHES[1]) {
                            crash.should.have.property("_id");
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", true);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.2");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'Windows Phone');
                            crash.should.have.property("reports", 1);
                            crash.should.have.property("users", 1);
                            CRASHES[2] = crash._id;
                        }
                    }
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have provided details', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", true);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);

                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Windows Phone");
                    report.should.have.property("os_version", "8.1");
                    report.should.have.property("manufacture", "Nokia");
                    report.should.have.property("device", "Lumia 560");
                    report.should.have.property("resolution", "800x1900");
                    report.should.have.property("app_version", "1.2");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 3 * 1024);
                    report.should.have.property("ram_total", 4 * 1024);
                    report.should.have.property("disk_current", 5 * 1024);
                    report.should.have.property("disk_total", 20 * 1024);
                    report.should.have.property("bat_current", 90);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "portrait");
                    report.should.have.property("online", 1);
                    report.should.have.property("muted", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", false);
                    report.should.have.property("run", 120);
                    report.should.have.property("custom", {"facebook": "3.5"});
                    report.should.have.property("group", CRASHES[2]);
                    report.should.have.property("uid", "3");
                    report.should.have.property("ts");

                    done();
                });
        });
    });

    describe('Hide crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2]
            };
            request
                .get('/i/crashes/hide?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check crash details', function() {
        it('should be hidden', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_hidden", true);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);

                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Windows Phone");
                    report.should.have.property("os_version", "8.1");
                    report.should.have.property("manufacture", "Nokia");
                    report.should.have.property("device", "Lumia 560");
                    report.should.have.property("resolution", "800x1900");
                    report.should.have.property("app_version", "1.2");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 3 * 1024);
                    report.should.have.property("ram_total", 4 * 1024);
                    report.should.have.property("disk_current", 5 * 1024);
                    report.should.have.property("disk_total", 20 * 1024);
                    report.should.have.property("bat_current", 90);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "portrait");
                    report.should.have.property("online", 1);
                    report.should.have.property("muted", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", false);
                    report.should.have.property("run", 120);
                    report.should.have.property("custom", {"facebook": "3.5"});
                    report.should.have.property("group", CRASHES[2]);
                    report.should.have.property("uid", "3");
                    report.should.have.property("ts");

                    done();
                });
        });
    });

    describe('Show crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2]
            };
            request
                .get('/i/crashes/show?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check crash details', function() {
        it('should be visible', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_hidden", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);
                    CRASH_URL = ob.url;

                    var report = ob.data[0];
                    report.should.have.property("_id");
                    report.should.have.property("os", "Windows Phone");
                    report.should.have.property("os_version", "8.1");
                    report.should.have.property("manufacture", "Nokia");
                    report.should.have.property("device", "Lumia 560");
                    report.should.have.property("resolution", "800x1900");
                    report.should.have.property("app_version", "1.2");
                    report.should.have.property("cpu", "armv7");
                    report.should.have.property("opengl", "openGL ES 2.0");
                    report.should.have.property("ram_current", 3 * 1024);
                    report.should.have.property("ram_total", 4 * 1024);
                    report.should.have.property("disk_current", 5 * 1024);
                    report.should.have.property("disk_total", 20 * 1024);
                    report.should.have.property("bat_current", 90);
                    report.should.have.property("bat_total", 100);
                    report.should.have.property("orientation", "portrait");
                    report.should.have.property("online", 1);
                    report.should.have.property("muted", 1);
                    report.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    report.should.have.property("nonfatal", false);
                    report.should.have.property("run", 120);
                    report.should.have.property("custom", {"facebook": "3.5"});
                    report.should.have.property("group", CRASHES[2]);
                    report.should.have.property("uid", "3");
                    report.should.have.property("ts");

                    done();
                });
        });
    });

    describe('Check public crash', function() {
        it('should not found', function(done) {
            request
                .get('/crash/' + CRASH_URL)
                .expect(404, done);
        });
    });

    describe('Make crash public', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2]
            };
            request
                .get('/i/crashes/share?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    /*
    describe('Check public crash', function() {
        it('should be found', function(done) {
            request
                .get('/crash/' + CRASH_URL)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var parts = res.text.split("var crash_data = ");
                    parts.should.have.lengthOf(2);
                    var data = parts[1].split(";\nwindow.CrashgroupView")[0];
                    var ob = JSON.parse(data);
                    ob.should.not.have.property('loss');
                    ob.should.not.have.property('users');
                    ob.should.not.have.property('data');
                    done();
                });
        });
    });

    describe('Publish specfic properties', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2],
                data: {
                    reports: 1,
                    loss: 1,
                    users: 1
                }
            };
            request
                .get('/i/crashes/modify_share?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check published properties', function() {
        it('should be found', function(done) {
            request
                .get('/crash/' + CRASH_URL)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var parts = res.text.split("var crash_data = ");
                    parts.should.have.lengthOf(2);
                    var data = parts[1].split(";\nwindow.CrashgroupView")[0];
                    var ob = JSON.parse(data);
                    ob.should.have.property('share', {"reports": 1, "loss": 1, "users": 1});
                    ob.should.have.property('users');
                    ob.should.have.property('data');
                    done();
                });
        });
    });

    describe('Unmake crash public', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2]
            };
            request
                .get('/i/crashes/unshare?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check public crash', function() {
        it('should not found', function(done) {
            request
                .get('/crash/' + CRASH_URL)
                .expect(404, done);
        });
    });
    */

    describe('Add comment', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2],
                text: "Test comment",
                app_id: APP_ID,
            };
            request
                .get('/i/crashes/add_comment?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check crash details', function() {
        it('should have comment', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_hidden", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("comments").with.lengthOf(1);
                    var comment = ob.comments[0];
                    comment.should.have.property("text", "Test comment");
                    comment.should.have.property("time");
                    comment.should.have.property("author");
                    comment.should.have.property("author_id");
                    comment.should.have.property("_id");
                    COMMENT_ID = comment._id;
                    ob.should.have.property("data").with.lengthOf(1);

                    done();
                });
        });
    });

    describe('Edit comment', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2],
                text: "Test comment edited",
                app_id: APP_ID,
                comment_id: COMMENT_ID
            };
            request
                .get('/i/crashes/edit_comment?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check crash details', function() {
        it('should have edited comment', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_hidden", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("comments").with.lengthOf(1);
                    var comment = ob.comments[0];
                    comment.should.have.property("text", "Test comment edited");
                    comment.should.have.property("time");
                    comment.should.have.property("edit_time");
                    comment.should.have.property("author");
                    comment.should.have.property("author_id");
                    comment.should.have.property("_id");

                    done();
                });
        });
    });

    describe('Delete comment', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2],
                app_id: APP_ID,
                comment_id: COMMENT_ID
            };
            request
                .get('/i/crashes/delete_comment?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Check crash details', function() {
        it('should have no comments', function(done) {
            request
                .get('/o?group=' + CRASHES[2] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[2]);
                    ob.should.have.property("os", "Windows Phone");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_hidden", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.have.property("manufacture", {"Nokia": 1});
                    ob.should.have.property("device", {"Lumia 560": 1});
                    ob.should.have.property("resolution", {"800x1900": 1});
                    ob.should.have.property("app_version", {"1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:5": 1}});
                    ob.should.have.property("root", {"no": 1});
                    ob.should.have.property("online", {"yes": 1});
                    ob.should.have.property("muted", {"yes": 1});
                    ob.should.have.property("signal", {"no": 1});
                    ob.should.have.property("background", {"no": 1});
                    ob.should.have.property("ram", {"total": 75, "count": 1, "min": 75, "max": 75});
                    ob.should.have.property("bat", {"total": 90, "count": 1, "min": 90, "max": 90});
                    ob.should.have.property("disk", {"total": 25, "count": 1, "min": 25, "max": 25});
                    ob.should.have.property("run", {"total": 120, "count": 1, "min": 120, "max": 120});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("comments").with.lengthOf(0);

                    done();
                });
        });
    });

    describe('Resolve crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[0]
            };
            request
                .get('/i/crashes/resolve?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property(CRASHES[0], '1.2');
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
    });

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 5, "unique": 3, "resolved": 1, "unresolved": 2, "fatal": 2, "nonfatal": 3, "news": 0, "renewed": 0, "os": {"Android": 4, "Windows Phone": 1}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 3}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crfses: 1, crf: 2, cruf: 2, crauf: 1, cr_s: 4, cr_u: 3},
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, cr_s: 4, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should be resolved', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", true);
                    ob.should.have.property("resolved_version", "1.2");
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 3);
                    ob.should.have.property("users", 2);
                    ob.should.have.property("os_version", {"4:0": 2, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 3});
                    ob.should.have.property("device", {"Galaxy S3": 2, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 2, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 3});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 3});
                    ob.should.have.property("orientation", {"landscape": 2, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2, "3:5": 1}, "googleplay": {"1:0": 2, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 2, "no": 1});
                    ob.should.have.property("online", {"no": 2, "yes": 1});
                    ob.should.have.property("muted", {"no": 2, "yes": 1});
                    ob.should.have.property("signal", {"yes": 2, "no": 1});
                    ob.should.have.property("background", {"yes": 2, "no": 1});
                    ob.should.have.property("ram", {"total": 175, "count": 3, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 170, "count": 3, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 65, "count": 3, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 240, "count": 3, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 1, "count": 1, "min": 1, "max": 1});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(3);

                    done();
                });
        });
    });

    describe('Upgrade user with multiple crashes to resolved version', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify({"_app_version": "1.3"}))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 5, "unique": 3, "resolved": 1, "unresolved": 2, "fatal": 2, "nonfatal": 3, "news": 0, "renewed": 0, "os": {"Android": 4, "Windows Phone": 1}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 3}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crfses: 1, crf: 2, cruf: 2, crauf: 1, cr_s: 5, cr_u: 3},
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, cr_s: 5, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 1, crauf: 1, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should have 1 user less', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", true);
                    ob.should.have.property("resolved_version", "1.2");
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 3);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 2, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 3});
                    ob.should.have.property("device", {"Galaxy S3": 2, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 2, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 3});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 3});
                    ob.should.have.property("orientation", {"landscape": 2, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2, "3:5": 1}, "googleplay": {"1:0": 2, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 2, "no": 1});
                    ob.should.have.property("online", {"no": 2, "yes": 1});
                    ob.should.have.property("muted", {"no": 2, "yes": 1});
                    ob.should.have.property("signal", {"yes": 2, "no": 1});
                    ob.should.have.property("background", {"yes": 2, "no": 1});
                    ob.should.have.property("ram", {"total": 175, "count": 3, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 170, "count": 3, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 65, "count": 3, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 240, "count": 3, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 1, "count": 1, "min": 1, "max": 1});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(3);

                    done();
                });
        });
    });

    describe('Upgrade user with single crash to resolved version', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify({"_app_version": "1.3"}))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 2, "fatal": 2, "nonfatal": 0},
        {"total": 5, "unique": 3, "resolved": 1, "unresolved": 2, "fatal": 2, "nonfatal": 3, "news": 0, "renewed": 0, "os": {"Android": 4, "Windows Phone": 1}, "highest_app": "1.2", "app_version": {"1:1": 2, "1:2": 3}},
        0,
        [
            {meta: {}, crnf: 3, crunf: 1, crfses: 2, crf: 2, cruf: 2, crauf: 2, cr_s: 6, cr_u: 3},
            {meta: {}, crnf: 3, crunf: 1, crf: 1, cruf: 1, crfses: 2, crauf: 2, cr_s: 6, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should have no users affected', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", true);
                    ob.should.have.property("resolved_version", "1.2");
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.2");
                    ob.should.have.property("reports", 3);
                    ob.should.have.property("users", 0);
                    ob.should.have.property("os_version", {"4:0": 2, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 3});
                    ob.should.have.property("device", {"Galaxy S3": 2, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 2, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1});
                    ob.should.have.property("cpu", {"armv7": 3});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 3});
                    ob.should.have.property("orientation", {"landscape": 2, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2, "3:5": 1}, "googleplay": {"1:0": 2, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 2, "no": 1});
                    ob.should.have.property("online", {"no": 2, "yes": 1});
                    ob.should.have.property("muted", {"no": 2, "yes": 1});
                    ob.should.have.property("signal", {"yes": 2, "no": 1});
                    ob.should.have.property("background", {"yes": 2, "no": 1});
                    ob.should.have.property("ram", {"total": 175, "count": 3, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 170, "count": 3, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 65, "count": 3, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 240, "count": 3, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 1, "count": 1, "min": 1, "max": 1});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(3);

                    done();
                });
        });
    });

    describe('Create another user session', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&begin_session=1")
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

    describe('Resolved user has crash again', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.0";
            crash._device = "Galaxy S3";
            crash._manufacture = "Samsung";
            crash._resolution = "480x800";
            crash._app_version = "1.3";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = true;
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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


    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 6, "unique": 3, "resolved": 0, "unresolved": 3, "fatal": 2, "nonfatal": 4, "news": 0, "renewed": 1, "os": {"Android": 5, "Windows Phone": 1}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 1}},
        0,
        [
            {meta: {}, crnf: 4, crunf: 1, crfses: 3, crf: 2, cruf: 2, crauf: 2, crnfses: 1, cr_s: 7, cr_u: 3},
            {meta: {}, crnf: 4, crunf: 1, crf: 1, cruf: 1, crfses: 3, crauf: 2, crnfses: 1, cr_s: 7, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should be resolved', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_renewed", true);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 4);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 3, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 4});
                    ob.should.have.property("device", {"Galaxy S3": 3, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 3, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1, "1:3": 1});
                    ob.should.have.property("cpu", {"armv7": 4});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 4});
                    ob.should.have.property("orientation", {"landscape": 3, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 3, "3:5": 1}, "googleplay": {"1:0": 3, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 3, "no": 1});
                    ob.should.have.property("online", {"no": 3, "yes": 1});
                    ob.should.have.property("muted", {"no": 3, "yes": 1});
                    ob.should.have.property("signal", {"yes": 3, "no": 1});
                    ob.should.have.property("background", {"yes": 3, "no": 1});
                    ob.should.have.property("ram", {"total": 225, "count": 4, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 210, "count": 4, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 85, "count": 4, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 300, "count": 4, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 1, "count": 1, "min": 1, "max": 1});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(4);

                    done();
                });
        });
    });

    describe('Create session in between crashes', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&begin_session=1")
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

    describe('Create another session in between crashes', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&begin_session=1")
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

    describe('User has crash again', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "Android";
            crash._os_version = "4.0";
            crash._device = "Galaxy S3";
            crash._manufacture = "Samsung";
            crash._resolution = "480x800";
            crash._app_version = "1.3";
            crash._cpu = "armv7";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._error = "java.lang.NullPointerException: com.domain.app.Exception<init>\nat com.domain.app.<init>(Activity.java:32)\nat com.domain.app.<init>(Activity.java:24)\nat com.domain.app.<init>(Activity.java:12)";
            crash._nonfatal = true;
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&crash=" + JSON.stringify(crash))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 7, "unique": 3, "resolved": 0, "unresolved": 3, "fatal": 2, "nonfatal": 5, "news": 0, "renewed": 1, "os": {"Android": 6, "Windows Phone": 1}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 2}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 2, cruf: 2, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should be resolved', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[0]);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_renewed", true);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 5);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 4, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 5});
                    ob.should.have.property("device", {"Galaxy S3": 4, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 4, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1, "1:3": 2});
                    ob.should.have.property("cpu", {"armv7": 5});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 5});
                    ob.should.have.property("orientation", {"landscape": 4, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 4, "3:5": 1}, "googleplay": {"1:0": 4, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 4, "no": 1});
                    ob.should.have.property("online", {"no": 4, "yes": 1});
                    ob.should.have.property("muted", {"no": 4, "yes": 1});
                    ob.should.have.property("signal", {"yes": 4, "no": 1});
                    ob.should.have.property("background", {"yes": 4, "no": 1});
                    ob.should.have.property("ram", {"total": 275, "count": 5, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 250, "count": 5, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 105, "count": 5, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 360, "count": 5, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 3, "count": 2, "min": 1, "max": 2});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(5);

                    done();
                });
        });
    });

    describe('Resolve crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[0]
            };
            request
                .get('/i/crashes/resolve?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property(CRASHES[0], '1.3');
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });
    });

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 7, "unique": 3, "resolved": 1, "unresolved": 2, "fatal": 2, "nonfatal": 5, "news": 0, "renewed": 0, "os": {"Android": 6, "Windows Phone": 1}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 2}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 2, cruf: 2, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should be resolved', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", true);
                    ob.should.have.property("is_renewed", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 5);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 4, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 5});
                    ob.should.have.property("device", {"Galaxy S3": 4, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 4, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1, "1:3": 2});
                    ob.should.have.property("cpu", {"armv7": 5});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 5});
                    ob.should.have.property("orientation", {"landscape": 4, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 4, "3:5": 1}, "googleplay": {"1:0": 4, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 4, "no": 1});
                    ob.should.have.property("online", {"no": 4, "yes": 1});
                    ob.should.have.property("muted", {"no": 4, "yes": 1});
                    ob.should.have.property("signal", {"yes": 4, "no": 1});
                    ob.should.have.property("background", {"yes": 4, "no": 1});
                    ob.should.have.property("ram", {"total": 275, "count": 5, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 250, "count": 5, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 105, "count": 5, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 360, "count": 5, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 3, "count": 2, "min": 1, "max": 2});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(5);

                    done();
                });
        });
    });

    describe('Unresolve crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[0]
            };
            request
                .get('/i/crashes/unresolve?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 7, "unique": 3, "resolved": 0, "unresolved": 3, "fatal": 2, "nonfatal": 5, "news": 0, "renewed": 0, "os": {"Android": 6, "Windows Phone": 1}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 2}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 2, cruf: 2, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash details', function() {
        it('should be resolved', function(done) {
            request
                .get('/o?group=' + CRASHES[0] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("os", "Android");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                    ob.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                    ob.should.have.property("nonfatal", true);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("is_renewed", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 5);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"4:0": 4, "4:1": 1});
                    ob.should.have.property("manufacture", {"Samsung": 5});
                    ob.should.have.property("device", {"Galaxy S3": 4, "Galaxy S4": 1});
                    ob.should.have.property("resolution", {"480x800": 4, "800x1900": 1});
                    ob.should.have.property("app_version", {"1:1": 2, "1:2": 1, "1:3": 2});
                    ob.should.have.property("cpu", {"armv7": 5});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 5});
                    ob.should.have.property("orientation", {"landscape": 4, "portrait": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 4, "3:5": 1}, "googleplay": {"1:0": 4, "2:0": 1}});
                    ob.should.have.property("root", {"yes": 4, "no": 1});
                    ob.should.have.property("online", {"no": 4, "yes": 1});
                    ob.should.have.property("muted", {"no": 4, "yes": 1});
                    ob.should.have.property("signal", {"yes": 4, "no": 1});
                    ob.should.have.property("background", {"yes": 4, "no": 1});
                    ob.should.have.property("ram", {"total": 275, "count": 5, "min": 50, "max": 75});
                    ob.should.have.property("bat", {"total": 250, "count": 5, "min": 40, "max": 90});
                    ob.should.have.property("disk", {"total": 105, "count": 5, "min": 20, "max": 25});
                    ob.should.have.property("run", {"total": 360, "count": 5, "min": 60, "max": 120});
                    ob.should.have.property("session", {"total": 3, "count": 2, "min": 1, "max": 2});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(5);

                    done();
                });
        });
    });

    describe('Add iOS crash with memory addresses', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "iOS";
            crash._os_version = "8.1";
            crash._device = "iPad3,5";
            crash._architecture = "armv7";
            crash._resolution = "1576x2048";
            crash._app_version = "1.3";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._name = "-[UIPopoverController dealloc] reached while popover is still visible.";

            crash._error = "0 CoreFoundation 0x30629f9b + 154\n" +
            "1 libobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\n" +
            "2 CoreFoundation 0x30629ec5 + 0\n" +
            "3 UIKit 0x33090e75 + 88\n" +
            "4 libobjc.A.dylib 0x3b11fb6b + 174\n" +
            "5 kounter 0x0010427d kounter + 94845\n" +
            "6 UIKit 0x32e7c037 + 90\n" +
            "7 UIKit 0x32e7bfd7 + 30\n" +
            "8 UIKit 0x32e7bfb1 + 44\n" +
            "9 UIKit 0x32e67717 + 374\n" +
            "10 UIKit 0x32e7ba2f + 590\n" +
            "11 UIKit 0x32e7b701 + 528\n" +
            "12 UIKit 0x32e766cb + 758\n" +
            "13 UIKit 0x32e4b8cd + 196\n" +
            "14 UIKit 0x32e49f77 + 7102\n" +
            "15 CoreFoundation 0x305f520b + 14\n" +
            "16 CoreFoundation 0x305f46db + 206\n" +
            "17 CoreFoundation 0x305f2ecf + 622\n" +
            "18 CoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\n" +
            "19 CoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\n" +
            "20 GraphicsServices 0x35458663 GSEventRunModal + 138\n" +
            "21 UIKit 0x32eaa14d UIApplicationMain + 1136\n" +
            "22 kounter 0x0010735f kounter + 107359\n" +
            "23 libdyld.dylib 0x3b61dab7 + 2";
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '3&app_key=' + APP_KEY + "&crash=" + encodeURIComponent(JSON.stringify(crash)))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 8, "unique": 4, "resolved": 0, "unresolved": 4, "fatal": 3, "nonfatal": 5, "news": 1, "renewed": 0, "os": {"Android": 6, "Windows Phone": 1, "iOS": 1}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 3}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 3, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 1, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should have new crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 4);
                    ob.should.have.property("iTotalDisplayRecords", 4);
                    ob.should.have.property("aaData").with.lengthOf(4);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id != CRASHES[0] && crash._id != CRASHES[1] && crash._id != CRASHES[2]) {
                            crash.should.have.property("_id");
                            crash.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                            crash.should.have.property("is_new", true);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'iOS');
                            crash.should.have.property("reports", 1);
                            crash.should.have.property("users", 1);
                            CRASHES[3] = crash._id;
                        }
                    }
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should have new crash details', function(done) {
            request
                .get('/o?group=' + CRASHES[3] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[3]);
                    ob.should.have.property("os", "iOS");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                    ob.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", true);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 1);
                    ob.should.have.property("users", 1);
                    ob.should.have.property("os_version", {"8:1": 1});
                    ob.should.not.have.property("manufacture");
                    ob.should.have.property("device", {"iPad3,5": 1});
                    ob.should.have.property("resolution", {"1576x2048": 1});
                    ob.should.have.property("app_version", {"1:3": 1});
                    ob.should.have.property("cpu", {"armv7": 1});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 1});
                    ob.should.have.property("orientation", {"landscape": 1});
                    ob.should.have.property("custom", {"facebook": {"3:0": 1}, "googleplay": {"1:0": 1}});
                    ob.should.have.property("root", {"yes": 1});
                    ob.should.have.property("online", {"no": 1});
                    ob.should.have.property("muted", {"no": 1});
                    ob.should.have.property("signal", {"yes": 1});
                    ob.should.have.property("background", {"yes": 1});
                    ob.should.have.property("ram", {"total": 50, "count": 1, "min": 50, "max": 50});
                    ob.should.have.property("bat", {"total": 40, "count": 1, "min": 40, "max": 40});
                    ob.should.have.property("disk", {"total": 20, "count": 1, "min": 20, "max": 20});
                    ob.should.have.property("run", {"total": 60, "count": 1, "min": 60, "max": 60});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(1);

                    done();
                });
        });
    });

    describe('Add another iOS crash with different memory addresses', function() {
        it('should success', function(done) {
            var crash = {};
            crash._os = "iOS";
            crash._os_version = "8.1";
            crash._architecture = "armv7";
            crash._device = "iPad3,5";
            crash._resolution = "1576x2048";
            crash._app_version = "1.3";
            crash._opengl = "openGL ES 2.0";

            crash._ram_total = 2 * 1024;
            crash._ram_current = 1024;
            crash._disk_total = 10 * 1024;
            crash._disk_current = 2 * 1024;
            crash._bat_total = 100;
            crash._bat_current = 40;
            crash._orientation = "landscape";

            crash._root = true;
            crash._online = false;
            crash._signal = true;
            crash._muted = false;
            crash._background = true;

            crash._name = "-[UIPopoverController dealloc] reached while popover is still visible.";

            crash._error = "0 CoreFoundation 0x2d4b2ee3 + 154\n" +
            "1 libobjc.A.dylib 0x37f93ce7 objc_exception_throw + 38\n" +
            "2 CoreFoundation 0x2d4b2e0d + 0\n" +
            "3 UIKit 0x2ff2e571 + 88\n" +
            "4 libobjc.A.dylib 0x37fa2b6b + 174\n" +
            "5 kounter 0x0009827d kounter + 94845\n" +
            "6 UIKit 0x2fd196a7 + 90\n" +
            "7 UIKit 0x2fd19643 + 38\n" +
            "8 UIKit 0x2fd19613 + 46\n" +
            "9 UIKit 0x2fd04d5b + 374\n" +
            "10 UIKit 0x2fd1905b + 594\n" +
            "11 UIKit 0x2fd18d2d + 528\n" +
            "12 UIKit 0x2fd13c87 + 758\n" +
            "13 UIKit 0x2fce8e55 + 196\n" +
            "14 UIKit 0x2fce7521 + 7120\n" +
            "15 CoreFoundation 0x2d47dfaf + 14\n" +
            "16 CoreFoundation 0x2d47d477 + 206\n" +
            "17 CoreFoundation 0x2d47bc67 + 630\n" +
            "18 CoreFoundation 0x2d3e6729 CFRunLoopRunSpecific + 524\n" +
            "19 CoreFoundation 0x2d3e650b CFRunLoopRunInMode + 106\n" +
            "20 GraphicsServices 0x323226d3 GSEventRunModal + 138\n" +
            "21 UIKit 0x2fd47871 UIApplicationMain + 1136\n" +
            "22 kounter 0x0009b35f kounter + 107359\n" +
            "23 libdyld.dylib 0x38491ab7 + 2";
            crash._run = 60;

            crash._custom = {
                "facebook": "3.0",
                "googleplay": "1.0"
            };
            request
                .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&crash=" + encodeURIComponent(JSON.stringify(crash)))
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 9, "unique": 4, "resolved": 0, "unresolved": 4, "fatal": 4, "nonfatal": 5, "news": 0, "renewed": 0, "os": {"Android": 6, "Windows Phone": 1, "iOS": 2}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 3, "1:3": 4}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 4, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should be the same crash as previous', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 4);
                    ob.should.have.property("iTotalDisplayRecords", 4);
                    ob.should.have.property("aaData").with.lengthOf(4);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id == CRASHES[3]) {
                            crash.should.have.property("_id", CRASHES[3]);
                            crash.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'iOS');
                            crash.should.have.property("reports", 2);
                            crash.should.have.property("users", 2);
                        }
                    }
                    done();
                });
        });
    });

    describe('Check crash details', function() {
        it('should be the same crash as previous', function(done) {
            request
                .get('/o?group=' + CRASHES[3] + '&method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("_id", CRASHES[3]);
                    ob.should.have.property("os", "iOS");
                    ob.should.have.property("lastTs");
                    ob.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                    ob.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                    ob.should.have.property("nonfatal", false);
                    ob.should.have.property("is_new", false);
                    ob.should.have.property("is_resolved", false);
                    ob.should.have.property("startTs");
                    ob.should.have.property("latest_version", "1.3");
                    ob.should.have.property("reports", 2);
                    ob.should.have.property("users", 2);
                    ob.should.have.property("os_version", {"8:1": 2});
                    ob.should.not.have.property("manufacture");
                    ob.should.have.property("device", {"iPad3,5": 2});
                    ob.should.have.property("resolution", {"1576x2048": 2});
                    ob.should.have.property("app_version", {"1:3": 2});
                    ob.should.have.property("cpu", {"armv7": 2});
                    ob.should.have.property("opengl", {"openGL ES 2:0": 2});
                    ob.should.have.property("orientation", {"landscape": 2});
                    ob.should.have.property("custom", {"facebook": {"3:0": 2}, "googleplay": {"1:0": 2}});
                    ob.should.have.property("root", {"yes": 2});
                    ob.should.have.property("online", {"no": 2});
                    ob.should.have.property("muted", {"no": 2});
                    ob.should.have.property("signal", {"yes": 2});
                    ob.should.have.property("background", {"yes": 2});
                    ob.should.have.property("ram", {"total": 100, "count": 2, "min": 50, "max": 50});
                    ob.should.have.property("bat", {"total": 80, "count": 2, "min": 40, "max": 40});
                    ob.should.have.property("disk", {"total": 40, "count": 2, "min": 20, "max": 20});
                    ob.should.have.property("run", {"total": 120, "count": 2, "min": 60, "max": 60});
                    ob.should.have.property("total", 3);
                    ob.should.have.property("url");
                    ob.should.have.property("data").with.lengthOf(2);

                    done();
                });
        });
    });

    describe('Delete first crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[1]
            };
            request
                .get('/i/crashes/delete?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 8, "unique": 3, "resolved": 0, "unresolved": 3, "fatal": 3, "nonfatal": 5, "news": 0, "renewed": 0, "os": {"Android": 5, "Windows Phone": 1, "iOS": 2}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 2, "1:3": 4}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 4, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should not have first crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 3);
                    ob.should.have.property("iTotalDisplayRecords", 3);
                    ob.should.have.property("aaData").with.lengthOf(3);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id == CRASHES[2]) {
                            crash.should.have.property("_id", CRASHES[2]);
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.2");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'Windows Phone');
                            crash.should.have.property("reports", 1);
                            crash.should.have.property("users", 1);
                        }
                        else if (crash._id == CRASHES[0]) {
                            crash.should.have.property("_id", CRASHES[0]);
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", true);
                            crash.should.have.property("os", 'Android');
                            crash.should.have.property("reports", 5);
                            crash.should.have.property("users", 1);
                        }
                        else {
                            crash.should.have.property("_id", CRASHES[3]);
                            crash.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'iOS');
                            crash.should.have.property("reports", 2);
                            crash.should.have.property("users", 2);
                        }
                    }
                    done();
                });
        });
    });

    describe('Delete second crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[2]
            };
            request
                .get('/i/crashes/delete?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
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

    verifyCrashMetrics(
        {"total": 3, "affected": 3, "fatal": 2, "nonfatal": 1},
        {"total": 7, "unique": 2, "resolved": 0, "unresolved": 2, "fatal": 2, "nonfatal": 5, "news": 0, "renewed": 0, "os": {"Android": 5, "Windows Phone": 0, "iOS": 2}, "highest_app": "1.3", "app_version": {"1:1": 2, "1:2": 1, "1:3": 4}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 4, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should not have second crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 2);
                    ob.should.have.property("iTotalDisplayRecords", 2);
                    ob.should.have.property("aaData").with.lengthOf(2);

                    for (var i = 0; i < ob.aaData.length; i++) {
                        var crash = ob.aaData[i];
                        if (crash._id == CRASHES[0]) {
                            crash.should.have.property("_id", CRASHES[0]);
                            crash.should.have.property("error", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;\nat com.domain.app.&lt;init&gt;(Activity.java:32)\nat com.domain.app.&lt;init&gt;(Activity.java:24)\nat com.domain.app.&lt;init&gt;(Activity.java:12)");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "java.lang.NullPointerException: com.domain.app.Exception&lt;init&gt;");
                            crash.should.have.property("nonfatal", true);
                            crash.should.have.property("os", 'Android');
                            crash.should.have.property("reports", 5);
                            crash.should.have.property("users", 1);
                        }
                        else if (crash._id == CRASHES[3]) {
                            crash.should.have.property("_id", CRASHES[3]);
                            crash.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                            crash.should.have.property("is_new", false);
                            crash.should.have.property("is_resolved", false);
                            crash.should.have.property("lastTs");
                            crash.should.have.property("latest_version", "1.3");
                            crash.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                            crash.should.have.property("nonfatal", false);
                            crash.should.have.property("os", 'iOS');
                            crash.should.have.property("reports", 2);
                            crash.should.have.property("users", 2);
                        }
                    }
                    done();
                });
        });
    });

    describe('Delete third crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[0]
            };
            request
                .get('/i/crashes/delete?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
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

    verifyCrashMetrics(
        {"total": 3, "affected": 2, "fatal": 2, "nonfatal": 0},
        {"total": 2, "unique": 1, "resolved": 0, "unresolved": 1, "fatal": 2, "nonfatal": 0, "news": 0, "renewed": 0, "os": {"Android": 0, "Windows Phone": 0, "iOS": 2}, "highest_app": "1.3", "app_version": {"1:1": 0, "1:2": 0, "1:3": 2}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 4, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should not have third crash', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("iTotalRecords", 1);
                    ob.should.have.property("iTotalDisplayRecords", 1);
                    ob.should.have.property("aaData").with.lengthOf(1);

                    var crash3 = ob.aaData[0];
                    crash3.should.have.property("_id", CRASHES[3]);
                    crash3.should.have.property("error", "CoreFoundation 0x30629f9b + 154\nlibobjc.A.dylib 0x3b110ccf objc_exception_throw + 38\nCoreFoundation 0x30629ec5 + 0\nUIKit 0x33090e75 + 88\nlibobjc.A.dylib 0x3b11fb6b + 174\nkounter 0x0010427d kounter + 94845\nUIKit 0x32e7c037 + 90\nUIKit 0x32e7bfd7 + 30\nUIKit 0x32e7bfb1 + 44\nUIKit 0x32e67717 + 374\nUIKit 0x32e7ba2f + 590\nUIKit 0x32e7b701 + 528\nUIKit 0x32e766cb + 758\nUIKit 0x32e4b8cd + 196\nUIKit 0x32e49f77 + 7102\nCoreFoundation 0x305f520b + 14\nCoreFoundation 0x305f46db + 206\nCoreFoundation 0x305f2ecf + 622\nCoreFoundation 0x3055debf CFRunLoopRunSpecific + 522\nCoreFoundation 0x3055dca3 CFRunLoopRunInMode + 106\nGraphicsServices 0x35458663 GSEventRunModal + 138\nUIKit 0x32eaa14d UIApplicationMain + 1136\nkounter 0x0010735f kounter + 107359\nlibdyld.dylib 0x3b61dab7 + 2");
                    crash3.should.have.property("is_new", false);
                    crash3.should.have.property("is_resolved", false);
                    crash3.should.have.property("lastTs");
                    crash3.should.have.property("latest_version", "1.3");
                    crash3.should.have.property("name", "-[UIPopoverController dealloc] reached while popover is still visible.");
                    crash3.should.have.property("nonfatal", false);
                    crash3.should.have.property("os", 'iOS');
                    crash3.should.have.property("reports", 2);
                    crash3.should.have.property("users", 2);
                    done();
                });
        });
    });

    describe('Delete fourth crash', function() {
        it('should success', function(done) {
            var args = {
                crash_id: CRASHES[3]
            };
            request
                .get('/i/crashes/delete?args=' + JSON.stringify(args) + '&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
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

    verifyCrashMetrics(
        {"total": 3, "affected": 0, "fatal": 0, "nonfatal": 0},
        {"total": 0, "unique": 0, "resolved": 0, "unresolved": 0, "fatal": 0, "nonfatal": 0, "news": 0, "renewed": 0, "os": {"Android": 0, "Windows Phone": 0, "iOS": 0}, "highest_app": "", "app_version": {"1:1": 0, "1:2": 0, "1:3": 0}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 5, crf: 4, cruf: 3, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 5, crauf: 2, crnfses: 2, cr_s: 9, cr_u: 3},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, cr_s: 1, cr_u: 1},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, cr_s: 1, cr_u: 1},
        ]);

    describe('Check crash data', function() {
        it('should not have fourth crash', function(done) {
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

    describe('Create user new user', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '4&app_key=' + APP_KEY + '&begin_session=1&metrics={"_os":"Android","_app_version":"1.2"}')
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

    describe('Make crash free session and user', function() {
        it('should success', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '4&app_key=' + APP_KEY + "&begin_session=1")
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

    verifyCrashMetrics(
        {"total": 4, "affected": 0, "fatal": 0, "nonfatal": 0},
        {"total": 0, "unique": 0, "resolved": 0, "unresolved": 0, "fatal": 0, "nonfatal": 0, "news": 0, "renewed": 0, "os": {"Android": 0, "Windows Phone": 0, "iOS": 0}, "highest_app": "", "app_version": {"1:1": 0, "1:2": 0, "1:3": 0}},
        0,
        [
            {meta: {}, crnf: 5, crunf: 1, crfses: 6, crf: 4, cruf: 3, crauf: 3, crnfses: 3, craunf: 1, cr_s: 11, cr_u: 4},
            {meta: {}, crnf: 5, crunf: 1, crf: 1, cruf: 1, crfses: 6, crauf: 3, crnfses: 3, craunf: 1, cr_s: 11, cr_u: 4},
            {meta: {}, crf: 2, cruf: 1},
            {meta: {}, crnf: 2, crunf: 1, crfses: 2, crauf: 2, cr_s: 3, cr_u: 3},
            {meta: {}, crnf: 1, crf: 2, cruf: 2, crfses: 1, crauf: 1, crnfses: 1, craunf: 1, cr_s: 3, cr_u: 2},
            {meta: {}, crnf: 1, crf: 1, cruf: 1, crfses: 1, crauf: 1, crnfses: 1, craunf: 1, cr_s: 3, cr_u: 2},
        ]);

    describe('Check crash metrics #19', function() {
        it('should have crash free user', function(done) {
            request
                .get('/o?method=crashes&api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&graph=1")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("users", {"total": 4, "affected": 0, "fatal": 0, "nonfatal": 0});
                    ob.should.have.property("crashes", {"total": 0, "unique": 0, "resolved": 0, "unresolved": 0, "fatal": 0, "nonfatal": 0, "news": 0, "renewed": 0, "os": {"Android": 0, "Windows Phone": 0, "iOS": 0}, "highest_app": "", "app_version": {"1:1": 0, "1:2": 0, "1:3": 0}});
                    ob.should.have.property("loss", 0);
                    ob.should.have.property("data");
                    verifyMetrics(ob.data, {meta: {}, crnf: 5, crunf: 1, crfses: 6, crf: 4, cruf: 3, crauf: 3, crnfses: 3, craunf: 1, cr_s: 11, cr_u: 4});
                    done();
                });
        });
    });

    describe('Crash binary images', async() => {
        it('should save crash binary images correctly', async() => {
            const crashData = {
                "_architecture": "arm64",
                "_binary_images": {
                    "CountlyTestApp-iOS": {
                        "bn": "countlyTestApp-iOS",
                        "la": "0x104C80000",
                        "id": "757F024F-EA35-3322-9E77-3AE793023AC3"
                    }
                },
                "_error": "CoreFoundation                      0x00000001e5669ebc <redacted> + 252\nlibobjc.A.dylib                     0x00000001e4839a50 objc_exception_throw + 56\nCoreFoundation                      0x00000001e55e1384 _CFArgv + 0\nCoreFoundation                      0x00000001e557157c <redacted> + 0\nCountlyTestApp-iOS                  0x0000000104c8910c CountlyTestApp-iOS + 37132\nCountlyTestApp-iOS                  0x0000000104c9a8c0 CountlyTestApp-iOS + 108736\nUIKitCore                           0x0000000212b62458 <redacted> + 1348\nUIKitCore                           0x0000000212b626bc <redacted> + 268\nUIKitCore                           0x000000021296087c <redacted> + 296\nUIKitCore                           0x000000021294e878 <redacted> + 384\nUIKitCore                           0x000000021297d880 <redacted> + 132\nCoreFoundation                      0x00000001e55f96bc <redacted> + 32\nCoreFoundation                      0x00000001e55f4350 <redacted> + 412\nCoreFoundation                      0x00000001e55f48f0 <redacted> + 1264\nCoreFoundation                      0x00000001e55f40e0 CFRunLoopRunSpecific + 436\nGraphicsServices                    0x00000001e786d584 GSEventRunModal + 100\nUIKitCore                           0x0000000212954c00 UIApplicationMain + 212\nCountlyTestApp-iOS                  0x0000000104ca2c3c CountlyTestApp-iOS + 142396\nlibdyld.dylib                       0x00000001e50b2bb4 <redacted> + 4",
                "_executable_name": "CountlyTestApp-iOS",
                "_os_version": "12.0.0",
                "_app_version": "77.0.0",
                "_os": "iOS",
                "_build_uuid": "757F024F-EA35-3322-9E77-3AE793023AC3"
            };

            await request.get(`/i?app_key=${APP_KEY}&device_id=${DEVICE_ID}&crash=${JSON.stringify(crashData)}`);
            const crashGroupQuery = JSON.stringify({
                os: crashData._os,
                latest_version: crashData._app_version,
            });
            let crashGroupResponse = await request
                .get(`/o?method=crashes&api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&query=${crashGroupQuery}`);
            const crashGroup = crashGroupResponse.body.aaData[0];
            crashGroupResponse = await request
                .get(`/o?method=crashes&api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&group=${crashGroup._id}`);

            const crash = crashGroupResponse.body.data[0];

            crash.binary_images.should.equal(JSON.stringify(crashData._binary_images));
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