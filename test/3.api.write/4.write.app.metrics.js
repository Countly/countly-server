var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

//var params = {"_os": "Android","_os_version": "4.4","_resolution": "1200x800", "_density": "400dpi", "_device": "Nexus 5","_carrier": "Vodafone","_app_version": "1.0"};

describe('Writing app metrics', function() {
    describe('Checking if metrics empty', function() {
        describe('Empty devices', function() {
            it('should have no devices', function(done) {
                API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                APP_ID = testUtils.get("APP_ID");
                APP_KEY = testUtils.get("APP_KEY");
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        for (var key in ob) {
                            ob.should.have.property(key).and.eql({});
                        }
                        done();
                    });
            });
        });
        describe('Empty device_details', function() {
            it('should have no device_details', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        for (var key in ob) {
                            ob.should.have.property(key).and.eql({});
                        }
                        done();
                    });
            });
        });
        describe('Empty carriers', function() {
            it('should have no carriers', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        for (var key in ob) {
                            ob.should.have.property(key).and.eql({});
                        }
                        done();
                    });
            });
        });
        describe('Empty app_versions', function() {
            it('should have no app_versions', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        for (var key in ob) {
                            ob.should.have.property(key).and.eql({});
                        }
                        done();
                    });
            });
        });
    });
    describe('testing OS metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_os": "Android"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '1&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
        describe('Verify device_details', function() {
            it('should have Android OS', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android"]}, Android: {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should sessions, users, os', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 1, total_users: 1, new_users: 1, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 1, "percent": 100}], resolutions: [], carriers: []});
                    });
            });
        });
    });
    describe('testing OS version metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_os_version": "4.4"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '2&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
        describe('Verify device_details', function() {
            it('should have os and version', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android"], "os_versions": ["4:4"]}, Android: {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
    });
    describe('testing resolution metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_resolution": "1200x800"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '4&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
        describe('Verify device_details', function() {
            it('should have os, version, density and resolution', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android"], "os_versions": ["4:4"], "resolutions": ["1200x800"]}, Android: {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have sessions, users, or and resolutions', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 3, new_users: 3, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 1, "percent": 100}], resolutions: [{"name": "1200x800", "value": 1, "percent": 100}], carriers: []});
                    });
            });
        });
    });
    describe('testing OS with OS version metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_os": "Android", "_os_version": "4.4"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '5&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
        describe('Verify device_details', function() {
            it('should have os version combo and all previous', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android"], "os_versions": ["4:4", "a4:4"], "resolutions": ["1200x800"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have sessions, users, os and resolutions', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 4, total_users: 4, new_users: 4, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 2, "percent": 100}], resolutions: [{"name": "1200x800", "value": 1, "percent": 100}], carriers: []});
                    });
            });
        });
    });
    describe('testing device metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_device": "Nexus 5"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '6&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Nexus 5":{"n":1,"t":1,"u":1}},"Nexus 5":{"n":1,"t":1,"u":1}},"Nexus 5":{"n":1,"t":1,"u":1},"w38":{"Nexus 5":{"u":1}}},"_id":"541991c801f67bb240000083","meta":{"devices":["Nexus 5"]}}
        describe('Verify devices', function() {
            it('should have Nexus 5', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"devices": ["Nexus 5"]}, "Nexus 5": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
    });
    describe('testing carrier metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_carrier": "Vodafone"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '7&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"Vodafone":{"n":1,"t":1,"u":1}},"Vodafone":{"n":1,"t":1,"u":1}},"Vodafone":{"n":1,"t":1,"u":1},"w38":{"Vodafone":{"u":1}}},"_id":"5419935501f67bb24000008b","meta":{"carriers":["Vodafone"]}}
        describe('Verify carriers', function() {
            it('should have Vodafone', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"carriers": ["Vodafone"]}, "Vodafone": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have sessions, users, os, resolutions and carriers', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 6, total_users: 6, new_users: 6, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 2, "percent": 100}], resolutions: [{"name": "1200x800", "value": 1, "percent": 100}], carriers: [{"name": "Vodafone", "value": 1, "percent": 100}]});
                    });
            });
        });
    });
    describe('testing app_version metric', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_app_version": "1.0"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '8&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        //{"2014":{"9":{"17":{"1:0":{"n":1,"t":1,"u":1}},"1:0":{"n":1,"t":1,"u":1}},"1:0":{"n":1,"t":1,"u":1},"w38":{"1:0":{"u":1}}},"_id":"541993cb01f67bb24000008d","meta":{"app_versions":["1:0"]}}
        describe('Verify app_versions', function() {
            it('should have app version 1.0', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android"], "os_versions": ["4:4", "a4:4"], "resolutions": ["1200x800"], "app_versions": ["1:0"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
    });
    describe('testing with all metrics', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_os": "IOS", "_os_version": "7.1", "_resolution": "2048x1536", "_device": "iPod", "_carrier": "Telecom", "_app_version": "1.2"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '9&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        describe('Verify device_details', function() {
            it('should should have new metrics', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 1, "t": 1, "u": 1}, "i7:1": {"n": 1, "t": 1, "u": 1}, "2048x1536": {"n": 1, "t": 1, "u": 1}, "1:2": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('Verify devices', function() {
            it('should have iPod', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"devices": ["Nexus 5", "iPod"]}, "Nexus 5": {"n": 1, "t": 1, "u": 1}, "iPod": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('Verify carriers', function() {
            it('should have Telecom', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"carriers": ["Vodafone", "Telecom"]}, "Vodafone": {"n": 1, "t": 1, "u": 1}, "Telecom": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('Verify app_versions', function() {
            it('should have app version 1.2', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 1, "t": 1, "u": 1}, "i7:1": {"n": 1, "t": 1, "u": 1}, "2048x1536": {"n": 1, "t": 1, "u": 1}, "1:2": {"n": 1, "t": 1, "u": 1}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have percentage split between os, resolutions and carriers', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 8, total_users: 8, new_users: 8, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 2, "percent": 66.7}, {"name": "IOS", "value": 1, "percent": 33.3}], resolutions: [{"name": "1200x800", "value": 1, "percent": 50}, {"name": "2048x1536", "value": 1, "percent": 50}], carriers: [{"name": "Telecom", "value": 1, "percent": 50}, {"name": "Vodafone", "value": 1, "percent": 50}]});
                    });
            });
        });
    });
    describe('same metrics new user', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                var params = {"_os": "IOS", "_os_version": "7.1", "_resolution": "2048x1536", "_device": "iPod", "_carrier": "Telecom", "_app_version": "1.2"};
                request
                    .get('/i?device_id=' + DEVICE_ID + '10&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
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
        describe('Verify device_details', function() {
            it('should have additional user for new metrics', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 2, "t": 2, "u": 2}, "i7:1": {"n": 2, "t": 2, "u": 2}, "2048x1536": {"n": 2, "t": 2, "u": 2}, "1:2": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify devices', function() {
            it('should have additional user for iPod', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"devices": ["Nexus 5", "iPod"]}, "Nexus 5": {"n": 1, "t": 1, "u": 1}, "iPod": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify carriers', function() {
            it('should have new user for Telecom', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"carriers": ["Vodafone", "Telecom"]}, "Vodafone": {"n": 1, "t": 1, "u": 1}, "Telecom": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify app_versions', function() {
            it('should should have new user for app version 1.2', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 2, "t": 2, "u": 2}, "i7:1": {"n": 2, "t": 2, "u": 2}, "2048x1536": {"n": 2, "t": 2, "u": 2}, "1:2": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have percentage split for platforms, resolutions and carriers', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 9, total_users: 9, new_users: 9, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 2, "percent": 50}, {"name": "IOS", "value": 2, "percent": 50}], resolutions: [{"name": "2048x1536", "value": 2, "percent": 66.7}, {"name": "1200x800", "value": 1, "percent": 33.3}], carriers: [{"name": "Telecom", "value": 2, "percent": 66.7}, {"name": "Vodafone", "value": 1, "percent": 33.3}]});
                    });
            });
        });
    });
    describe('reset app', function() {
        describe('reseting data', function() {
            it('should reset data', function(done) {
                var params = {app_id: APP_ID, "period": "reset"};
                request
                    .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
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
    });
});