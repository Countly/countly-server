var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Writing app sessions', function() {
    describe('without session start', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                APP_ID = testUtils.get("APP_ID");
                APP_KEY = testUtils.get("APP_KEY");
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                    });
            });
        });
        //{}
        describe('Verify sessions', function() {
            it('should be empty', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.text.should.eql("{}");
                        done();
                    });
            });
        });
        //{}
        describe('verify users', function() {
            it('should be empty', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.text.should.eql("{}");
                        done();
                    });
            });
        });
        //{}
        describe('verify locations', function() {
            it('should be empty', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.text.should.eql("{}");
                        done();
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should be empty', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.text.should.eql("[]");
                        done();
                    });
            });
        });
        /*
		{"30days":
			{"dashboard":
				{"total_sessions": {"total":1,"change":"NA", "trend":"u"},
				"total_users": {"total":1,"change":"NA","trend":"u","is_estimate":true},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}
				},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17 Sep","percent":100}]
				},
			"period":"19 Aug - 17 Sep"},
		"7days":
			{"dashboard":
				{"total_sessions":{"total":1,"change":"NA",	"trend":"u"},
				"total_users":{"total":1,"change":"NA","trend":"u","is_estimate":true},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}
				},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17 Sep","percent":100}]
				},
			"period":"11 Sep - 17 Sep"},
		"today":
			{"dashboard":
				{"total_sessions":{"total":1,"change":"NA","trend":"u"},
				"total_users":{"total":1,"change":"NA","trend":"u","is_estimate":false},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17:00","percent":100}]
				},
			"period":"00:00 - 17:03"}
		}
		*/
        describe('verify dashboard', function() {
            it('should have 1 session and 1 user ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 0, total_users: 0, new_users: 0, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "0.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('30days', []);
                        ob.should.have.property('7days', []);
                        ob.should.have.property('today', []);
                        done();
                    });
            });
        });
    });
    describe('start session', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&begin_session=1')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2015":{"1":{"6":{"13":{"e":2,"t":1,"n":1,"u":1},"e":2,"t":1,"Unknown":{"t":1,"n":1,"u":1},"n":1,"u":1,"f":{"0":1},"l":{"0":1}},"u":1,"Unknown":{"u":1,"t":1,"n":1},"f":{"0":1},"l":{"0":1},"e":2,"t":1,"n":1},"u":1,"w1":{"u":1,"Unknown":{"u":1},"f":{"0":1},"l":{"0":1}},"Unknown":{"u":1,"t":1,"n":1},"f":{"0":1},"l":{"0":1},"e":2,"t":1,"n":1},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('Verify sessions', function() {
            it('should have 1 session with 1 user', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0"]}, f: {"0": 1}, u: 1, n: 1, t: 1, e: 2, Unknown: true});
                    });
            });
        });
        //{"2015":{"1":{"6":{"13":{"e":2,"t":1,"n":1,"u":1},"e":2,"t":1,"Unknown":{"t":1,"n":1,"u":1},"n":1,"u":1,"f":{"0":1},"l":{"0":1}},"u":1,"Unknown":{"u":1,"t":1,"n":1},"f":{"0":1},"l":{"0":1},"e":2,"t":1,"n":1},"u":1,"w1":{"u":1,"Unknown":{"u":1},"f":{"0":1},"l":{"0":1}},"Unknown":{"u":1,"t":1,"n":1},"f":{"0":1},"l":{"0":1},"e":2,"t":1,"n":1},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('verify users', function() {
            it('should have 1 user', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0"]}, f: {"0": 1}, u: 1, n: 1, t: 1, e: 2, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have Unknown location', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0"]}, f: {"0": 1}, u: 1, n: 1, t: 1, e: 2, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 1 user', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 1);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 1 session and 1 user ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 1, total_users: 1, new_users: 1, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "2.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 1, u: 1, u2: 2, n: 1});
                    });
            });
        });
    });
    describe('new session without closing previous', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&begin_session=1')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2015":{"1":{"6":{"13":{"e":3,"t":2,"n":1,"u":1},"e":3,"t":2,"Unknown":{"t":2,"n":1,"u":1},"n":1,"u":1,"f":{"0":1},"l":{"0":1}},"u":1,"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"u":1,"w1":{"u":1,"Unknown":{"u":1},"f":{"0":1},"l":{"0":1}},"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('Verify sessions', function() {
            it('should have 2 sessions with 1 user', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 1, '1': 1 }, ds: {'0': 1}, u: 1, n: 1, t: 2, e: 3, Unknown: true});
                    });
            });
        });
        //{"2015":{"1":{"6":{"13":{"e":3,"t":2,"n":1,"u":1},"e":3,"t":2,"Unknown":{"t":2,"n":1,"u":1},"n":1,"u":1,"f":{"0":1},"l":{"0":1}},"u":1,"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"u":1,"w1":{"u":1,"Unknown":{"u":1},"f":{"0":1},"l":{"0":1}},"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('verify users', function() {
            it('should have 1 user', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 1, '1': 1 }, ds: {'0': 1}, u: 1, n: 1, t: 2, e: 3, Unknown: true});
                    });
            });
        });
        //{"2015":{"1":{"6":{"13":{"e":3,"t":2,"n":1,"u":1},"e":3,"t":2,"Unknown":{"t":2,"n":1,"u":1},"n":1,"u":1,"f":{"0":1},"l":{"0":1}},"u":1,"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"u":1,"w1":{"u":1,"Unknown":{"u":1},"f":{"0":1},"l":{"0":1}},"Unknown":{"u":1,"t":2,"n":1},"f":{"0":1},"l":{"0":1},"e":3,"t":2,"n":1},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 2 Unknown locations', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 1, '1': 1 }, ds: {'0': 1}, u: 1, n: 1, t: 2, e: 3, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 1);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 2 sessions and 1 user ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 2, total_users: 1, new_users: 1, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "3.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 2, u: 1, u2: 2, n: 1});
                    });
            });
        });
    });
    describe('new user', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + DEVICE_ID + '&app_key=' + APP_KEY + '&begin_session=1')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2015":{"1":{"6":{"14":{"e":4,"t":3,"n":2,"u":2},"e":4,"t":3,"Unknown":{"t":3,"n":2,"u":2},"n":2,"u":2,"f":{"0":2},"l":{"0":2}},"u":2,"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"u":2,"w1":{"u":2,"Unknown":{"u":2},"f":{"0":2},"l":{"0":2}},"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('Verify sessions', function() {
            it('should have 3 sessions with 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 4, Unknown: true});
                    });
            });
        });
        //{"2015":{"1":{"6":{"14":{"e":4,"t":3,"n":2,"u":2},"e":4,"t":3,"Unknown":{"t":3,"n":2,"u":2},"n":2,"u":2,"f":{"0":2},"l":{"0":2}},"u":2,"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"u":2,"w1":{"u":2,"Unknown":{"u":2},"f":{"0":2},"l":{"0":2}},"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('verify users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 4, Unknown: true});
                    });
            });
        });
        //{"2015":{"1":{"6":{"14":{"e":4,"t":3,"n":2,"u":2},"e":4,"t":3,"Unknown":{"t":3,"n":2,"u":2},"n":2,"u":2,"f":{"0":2},"l":{"0":2}},"u":2,"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"u":2,"w1":{"u":2,"Unknown":{"u":2},"f":{"0":2},"l":{"0":2}},"Unknown":{"u":2,"t":3,"n":2},"f":{"0":2},"l":{"0":2},"e":4,"t":3,"n":2},"meta":{"f-ranges":["0"],"l-ranges":["0"],"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 3 Unknown locations for 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 4, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 2);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 2 sessions and 1 user ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "2.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 4, n: 2});
                    });
            });
        });
    });
    describe('session duration', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&session_duration=30')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
        describe('Verify sessions', function() {
            it('should have 3 sessions with 4 events, 2 users and 30 duration', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 5, d: 30, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
        describe('verify users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 5, d: 30, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 3 Unknown locations for 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": [ '0' ]}, f: { '0': 2, '1': 1 }, ds: {'0': 1}, u: 2, n: 2, t: 3, e: 5, d: 30, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 2);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 2 sessions and 1 user and 30 seconds duration ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "0.5 min", avg_time: "0.2 min", avg_requests: "2.5", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 4, n: 2});
                    });
            });
        });
    });
    describe('session end', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&end_session=1')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * 2 * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
        describe('Verify sessions', function() {
            it('should have 3 sessions with 5 events, 2 users and 30 duration', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"f-ranges": ["0", "1"], "countries": ["Unknown"], "d-ranges": ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 6, d: 30, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
        describe('verify users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 6, d: 30, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 3 Unknown locations for 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 6, d: 30, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 2);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 3 sessions and 2 user and 30 seconds duration ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "0.5 min", avg_time: "0.2 min", avg_requests: "3.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 4, n: 2});
                    });
            });
        });
    });
    describe('session duration without start', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&session_duration=30')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * 2 * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
        describe('Verify sessions', function() {
            it('should have 3 sessions with 7 events, 2 users and 60 duration', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
        describe('verify users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 3 Unknown locations for 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 2);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 3 sessions and 2 user and 60 seconds duration ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "1.0 min", avg_time: "0.3 min", avg_requests: "3.5", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        //{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 4, n: 2});
                    });
            });
        });
    });
    describe('ending session without start', function() {
        describe('GET request', function() {
            it('should success', function(done) {
                request
                    .get('/i?device_id=' + DEVICE_ID + 'A&app_key=' + APP_KEY + '&end_session=1')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, testUtils.testWaitTimeForDrillEvents * 2 * testUtils.testScalingFactor);
                    });
            });
        });
        //{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
        describe('Verify sessions', function() {
            it('should have 3 sessions with 7 events, 2 users and 60 duration', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
        describe('verify users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
        describe('verify locations', function() {
            it('should have 3 Unknown locations for 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], 'd-ranges': ["0", "1"]}, f: { '0': 2, '1': 1 }, ds: {"0": 1, "1": 1}, u: 2, n: 2, t: 3, e: 7, d: 60, Unknown: true});
                    });
            });
        });
        //[]
        describe('verify total_users', function() {
            it('should have 2 users', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=total_users&metric=users')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.length(1);
                        ob[0].should.have.property('_id', 'users');
                        ob[0].should.have.property('u', 2);
                        done();
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should have 3 sessions and 2 user and 60 seconds duration ', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "1.0 min", avg_time: "0.3 min", avg_requests: "3.5", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        describe('verify countries', function() {
            it('should not be empty', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 4, n: 2});
                    });
            });
        });
    });
    //GeoIP Lite does not seem to work on travis, so IP does not show any country

    /*describe('start session with ip', function(){
		describe('GET request', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				request
				.get('/i?device_id='+DEVICE_ID+'NewIP&app_key='+APP_KEY+'&ip_address=207.97.227.239&begin_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
				request
				.get('/o/analytics/countries?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days', [{"country":"Unknown","code":"unknown","t":3,"u":4,"n":2},{"country":"United States","code":"us","t":1,"u":2,"n":1}]);
					ob.should.have.property('7days', [{"country":"Unknown","code":"unknown","t":3,"u":4,"n":2},{"country":"United States","code":"us","t":1,"u":2,"n":1}]);
					ob.should.have.property('today', [{"country":"Unknown","code":"unknown","t":3,"u":2,"n":2},{"country":"United States","code":"us","t":1,"u":1,"n":1}]);
					setTimeout(done, 100);
				});
			});
		});
	});*/
});