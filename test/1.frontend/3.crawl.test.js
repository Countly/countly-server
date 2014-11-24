var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
var agent = request.agent(testUtils.url);
var queue = {};
var crawled = {};

function accessPage(url, isLast, ind){
	it('should access '+url, function(done){
		agent
		.get(url)
		.expect('Content-Type', testUtils.getLinkType(url))
		.expect(200, done);
	});
	if(isLast && ind == 0)
		crawlAuthorized();
}

describe('Crawl Unauthorized Pages', function(){
	describe('Crawling login page', function(){
		it('should display login page', function(done){
			agent
			.get('/login')
			.expect('Content-Type', "text/html; charset=utf-8")
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var matches = testUtils.parseLinks(res.text);
				describe('Access login links', function(){
					for(var i = matches.length -1; i >= 0; i--){
						accessPage(matches[i]);
					}
				});
				done();
			});
		});
	});
	describe('Crawling forgot page', function(){
		it('should display forgot page', function(done){
			agent
			.get('/forgot')
			.expect('Content-Type', "text/html; charset=utf-8")
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				var matches = testUtils.parseLinks(res.text);
				describe('Access forgot links', function(){
					for(var i = matches.length -1; i >= 0; i--){
						accessPage(matches[i], true, i);
					}
				});
				done();
			});
		});
	});
});

function crawlAuthorized(){
	describe('Crawl Authorized', function(){
		describe('Crawling dashboard page', function(){
			before(function( done ){
				testUtils.login(agent);
				testUtils.waitLogin( done );
			});
			it('should display dashboard page', function(done){
				agent
				.get('/dashboard')
				.expect('Content-Type', "text/html; charset=utf-8")
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var matches = testUtils.parseLinks(res.text);
					describe('Access dashboard links', function(){
						for(var i = matches.length -1; i >= 0; i--){
							accessPage(matches[i]);
						}
					});
					done();
				});
			})
		})
	});
}