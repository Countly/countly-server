var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "123456789";
describe('Testing Star rating plugin', function() {
    
    describe('Creating event', function(){
		it('should success', function(done){
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
			APP_ID = testUtils.get("APP_ID");
			APP_KEY = testUtils.get("APP_KEY");
            
            var events = [{"key":"[CLY]_star_rating","count":1,"sum":1,"segmentation":{"rating":1,"app_version":"1.23","platform":"iOS"}}];
			request
			.get('/i?app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + "&events=" + JSON.stringify(events))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result','Success');
				setTimeout(done, 100)
			});
		});
	});

    describe('Verify rating', function(){
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

});