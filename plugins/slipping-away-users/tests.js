var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";

describe('Testing slipping-away data api', function() {
    it('should return 401 error with invaild api_key', function(done) {
        APP_ID = APP_ID || testUtils.get("APP_ID");
        var wrong_api_key_admin = "123adf";
        request.get('/o/slipping?api_key=' + wrong_api_key_admin + '&app_id=' + APP_ID + "&query=%7B%7D")
            .end(function(err, res) {
                res.statusCode.should.equal(401);
                done();
            });
    });

    it('should return 400 error with invaild app_id', function(done) {
        var wrong_api_id = "123";
        API_KEY_ADMIN = API_KEY_ADMIN || testUtils.get("API_KEY_ADMIN");
        request.get('/o/slipping?api_key=' + API_KEY_ADMIN + '&app_id=' + wrong_api_id + "&query=%7B%7D")
            .end(function(err, res) {
                res.statusCode.should.equal(400);
                done();
            });
    });

    it('should return 200 with correct API_KEY && app_id', function(done) {
        APP_ID = APP_ID || testUtils.get("APP_ID");
        API_KEY_ADMIN = API_KEY_ADMIN || testUtils.get("API_KEY_ADMIN");
        request.get('/o/slipping?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + "&query=%7B%7D")
            .end(function(err, res) {
                res.statusCode.should.equal(200);
                var data = JSON.parse(res.text);
                (data.length).should.equal(5);
                done();
            });
    });

    describe('Fetch slipping-away records', function() {
        before(function(done) {
            const APP_KEY = testUtils.get("APP_KEY");
            const lastTime = new Date().getTime() - 1000 * 60 * 60 * 24 * 10;
            const urlPrefix = "/i?app_key=" + APP_KEY
                + "&begin_session=1&device_id=99999999991&timestamp=" + parseInt(lastTime / 1000);

            request.get(urlPrefix)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(function() {
                        done();
                    }, 2000);
                    return;
                });
        });
        it('should fetch slipping-away records with valid params', function(done) {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");

            request.get('/o/slipping?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=slipping&query=%7B%7D")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.length.should.equal(5);
                    res.body[0].should.have.property('period', 7);
                    res.body[0].should.have.property('count', 1);

                    done();
                });
        });

        it('should able to filter records base on condition', function(done) {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");

            request.get('/o/slipping?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID
                + "&method=slipping&query=" + encodeURIComponent(JSON.stringify({"did": {"$nin": ["99999999991"]}})))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.length.should.equal(5);
                    res.body[0].should.have.property('period', 7);
                    res.body[0].should.have.property('count', 0);

                    done();
                });


        });
    });
});
