var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";

describe('Creating user', function(){
	describe('without args', function(){
		it('should bad request', function(done){
			API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
			request
			.get('/i/users/create?api_key='+API_KEY_ADMIN)
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Not enough args');
				done()
			});
		});
	});
	describe('without name', function(){
		it('should bad request', function(done){
			var params = {username:testUtils.username, password:testUtils.password, email:testUtils.email};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Not enough args');
				done()
			});
		});
	});
	describe('without username', function(){
		it('should bad request', function(done){
			var params = {full_name: testUtils.name, password:testUtils.password, email:testUtils.email};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Not enough args');
				done()
			});
		});
	});
	describe('without password', function(){
		it('should bad request', function(done){
			var params = {full_name: testUtils.name, username:testUtils.username, email:testUtils.email};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Not enough args');
				done()
			});
		});
	});
	describe('without email', function(){
		it('should bad request', function(done){
			var params = {full_name: testUtils.name, username:testUtils.username, password:testUtils.password};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Not enough args');
				done()
			});
		});
	});
	describe('with same username', function(){
		it('should bad request', function(done){
			var params = {full_name: testUtils.name, username:testUtils.username, password:testUtils.password, email:testUtils.email+".test"};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Email or username already exists');
				done()
			});
		});
	});
	describe('with same username', function(){
		it('should bad request', function(done){
			var params = {full_name: testUtils.name, username:testUtils.username+"1", password:testUtils.password, email:testUtils.email};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Email or username already exists');
				done()
			});
		});
	});
	describe('successfully create', function(){
		it('should create user', function(done){
			var params = {full_name: testUtils.name, username:testUtils.username+"1", password:testUtils.password, email:testUtils.email+".test"};
			request
			.get('/i/users/create?&api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('full_name', testUtils.name);
				ob.should.have.property('username', testUtils.username+"1");
				ob.should.have.property('email', testUtils.email+".test");
				ob.should.have.property('api_key');
				testUtils.set("API_KEY_USER", ob["api_key"]);
				testUtils.set("USER_ID", ob["_id"]);
				done()
			});
		});
	});
});