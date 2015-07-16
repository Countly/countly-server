var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Store metrics', function(){
	describe('Empty stores', function(){
		it('should have no stores', function(done){
			API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
			APP_ID = testUtils.get("APP_ID");
			APP_KEY = testUtils.get("APP_KEY");
			request
			.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=stores')
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.be.empty;
				setTimeout(done, 100)
			});
		});
	});
	describe('Writing Stores', function(){
		it('should success', function(done){
			var params = {"_store": "com.android.vending"};
			request
			.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result','Success');
				setTimeout(done, 100)
			});
		});
	});
	
	describe('Verify stores', function(){
		it('should have store', function(done){
			request
			.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=stores')
			.expect(200)
			.end(function(err, res){
				testUtils.validateMetrics(err, res, done, {meta:{"stores":['com:android:vending']},"com:android:vending":{"n":1,"t":1,"u":1}});
			});
		});
	});
	describe('write bulk stores', function(){
		it('should success', function(done){
			var params = [
				{"device_id":DEVICE_ID+"1", "app_key":APP_KEY, "begin_session":1, "metrics":{"_stores": "com.android.vending"}},
				{"device_id":DEVICE_ID+"2", "app_key":APP_KEY, "begin_session":1, "metrics":{"_stores": "com.google.android.feedback"}},
				{"device_id":DEVICE_ID+"3", "app_key":APP_KEY, "begin_session":1, "metrics":{"_stores": "com.slideme.sam.manager"}},
				{"device_id":DEVICE_ID+"4", "app_key":APP_KEY, "begin_session":1, "metrics":{"_stores": "com.amazon.venezia"}},
				{"device_id":DEVICE_ID+"5", "app_key":APP_KEY, "begin_session":1, "metrics":{"_stores": "iOS"}}
			];
			request
			.get('/i/bulk?requests='+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Success');
				setTimeout(done, 500)
			});
		});
	});
	describe('Verify bulk stores', function(){
		it('should match provided stores', function(done){
			request
			.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=stores')
			.expect(200)
			.end(function(err, res){
				testUtils.validateMetrics(err, res, done, {meta:{"stores":["com:android:vending", "com:google:android:feedback", "com:slideme:sam:manager", "com:amazon:venezia", "iOS"]}, "com:android:vending":{"n":2,"t":2,"u":2}, "com:google:android:feedback":{"n":1,"t":1,"u":1}, "com:slideme:sam:manager":{"n":1,"t":1,"u":1},"com:amazon:venezia":{"n":1,"t":1,"u":1}, "iOS":{"n":1,"t":1,"u":1}});
			});
		});
	});
	describe('reset app', function(){
		it('should reset data', function(done){
			var params = {app_id:APP_ID};
			request
			.get('/i/apps/reset?api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Success');
				setTimeout(done, 5000)
			});
		});
	});
	describe('verify empty stores', function(){
		it('should have no stores', function(done){
			request
			.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=stores')
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.be.empty;
				setTimeout(done, 100)
			});
		});
	});
});