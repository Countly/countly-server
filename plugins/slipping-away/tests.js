var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "28f5d22e4f33e749c75cdc8710b2da1d23218e44";
var API_KEY_ADMIN = "77dc7af497a6adf03beb3658e07b996d";
var APP_ID = "57aae32d8679389681865e20";
var API_KEY_USER= "waiter";

describe('Testing slipping-away data api', function() {
  it('should return 401 error with invaild api_key', function(done) {
    APP_ID = APP_ID || testUtils.get("APP_ID");
    var wrong_api_key_admin = "123adf";
    request.get('/o/slipping?api_key='+wrong_api_key_admin+'&app_id='+APP_ID)
      .end(function(err, res) {
        res.statusCode.should.equal(401);
        done();
      });
  });

  it('should return 400 error with invaild app_id', function(done) {
    //APP_ID = APP_ID || testUtils.get("APP_ID");
    var wrong_api_id = "123";
    API_KEY_ADMIN = API_KEY_ADMIN || testUtils.get("API_KEY_ADMIN");
    request.get('/o/slipping?api_key='+API_KEY_ADMIN+'&app_id='+wrong_api_id)
      .end(function(err, res) {
        res.statusCode.should.equal(400);
        done();
      });
  });

  it('should return 400 error with invaild app_id', function(done) {
    APP_ID = APP_ID || testUtils.get("APP_ID");
    API_KEY_ADMIN = API_KEY_ADMIN || testUtils.get("API_KEY_ADMIN");
    request.get('/o/slipping?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
      .end(function(err, res) {
        res.statusCode.should.equal(200);
        var data = JSON.parse(res.text);
        (data.length).should.equal(5);
        done();
      });
  });



});