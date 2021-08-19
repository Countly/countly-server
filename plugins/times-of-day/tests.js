var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";


describe('Testing Times Of Day', function() {

    var checkEmptyData = function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o?api_key=' + API_KEY_ADMIN + "&app_key=" + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=times-of-day&tod_type=[CLY]_session")
            .expect(200)
            .end(function(err, res) {

                if (err) {
                    return done(err);
                }

                var ob = JSON.parse(res.text);
                ob.length.should.eql(7);

                ob.forEach(element => {
                    element.length.should.eql(24);

                    var allItemZero = element.every(function(i) {
                        return i === 0;
                    });
                    allItemZero.should.eql(true);
                });

                done();
            });
    };

    it('Should get empty data', function(done) {
        checkEmptyData(done);
    });

    it('Should add data', function(done) {
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");

        var url = '/i?app_key=' + APP_KEY
                + '&app_id=' + APP_ID
                + '&device_id=' + DEVICE_ID
                + '&begin_session=true'
                + '&dow=0'
                + '&hour=0'
                + '&events=[{"key" : "Login", "count" : 1, "timestamp" : 1513389337}, {"key" : "Login", "count" : 1, "timestamp" : 1513389337, "hour" : 1, "dow" : 1}, {"key" : "Login", "count" : 1, "timestamp" : 1513389337, "hour" : 1, "dow" : 1}]';

        request
            .get(url)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }

                var ob = JSON.parse(res.text);
                ob.result.should.eql("Success");
                setTimeout(done, 500 * testUtils.testScalingFactor);
            });
    });

    it('Should validate session data', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");

        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=times-of-day&tod_type=[CLY]_session')
            .expect(200)
            .end(function(err, res) {

                if (err) {
                    return done(err);
                }

                var ob = JSON.parse(res.text);
                ob.length.should.eql(7);

                ob.forEach((element, index) => {
                    element.length.should.eql(24);

                    if (index === 0) {
                        element[0].should.eql(1);
                    }
                    else {
                        var allItemZero = element.every(function(i) {
                            return i === 0;
                        });
                        allItemZero.should.eql(true);
                    }
                });

                done();
            });
    });

    it('Should validate login data', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o?api_key=' + API_KEY_ADMIN + "&app_key=" + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=times-of-day&tod_type=Login")
            .expect(200)
            .end(function(err, res) {

                if (err) {
                    return done(err);
                }

                var ob = JSON.parse(res.text);
                ob.length.should.eql(7);

                ob.forEach((element, index) => {
                    element.length.should.eql(24);

                    if (index === 0) {
                        element[0].should.eql(1); //First event has no dow and hour so it should get it from session level
                    }
                    else if (index === 1) {
                        element[1].should.eql(2); //Second and third events had own dow and hour parameter. Checking for multiple update
                    }
                    else {
                        var allItemZero = element.every(function(i) {
                            return i === 0;
                        });
                        allItemZero.should.eql(true);
                    }
                });

                done();
            });
    });

    it('Should reset app', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");

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
                setTimeout(done, 500 * testUtils.testScalingFactor);
            });
    });
    it('Should get empty data', function(done) {
        checkEmptyData(done);
    });
});