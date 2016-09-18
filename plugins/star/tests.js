var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");

request = request(testUtils.url);
//request = request("http://localhost:3001");

var API_KEY_ADMIN = "77dc7af497a6adf03beb3658e07b996d";
var APP_ID = "573db3b31d3f6404ae609abd";
var APP_KEY = "d4a4e3e1a4d241c2ea9d0c350bb86584c87a91cb";
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