var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var APP_KEY = "";
describe('Testing  data api', function() {

  before(function(done) {
    APP_KEY = testUtils.get("APP_KEY") || APP_KEY ;
    request.get('/i?events=[{"key":"[CLY]_star_rating","count":1,' +
        '"sum":1,"segmentation":{"rating":1,"app_version":"1.23","platform":"iOS"}}]&app_key='
        + APP_KEY + '&device_id=321')
      .end(function(err, res) {
        res.statusCode.should.equal(200);
        console.log(res.text);
        done();
      });
  });

  it('should return 200 for request platform info', function(done) {
    APP_ID = testUtils.get("APP_ID") || APP_ID ;
    var data;
    request.get('/o?method=star&period=60days&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
      .end(function(err, res) {
        res.statusCode.should.equal(200);
        data = JSON.parse(res.text);
        console.log(data);
        should(data.iOS && data.iOS.indexOf('1:23') >= 0).equal(true);
        done();
      });
  });

});