var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";

describe('Testing event settings', function(){
    describe('setting test data', function(){      
        it('create test events', function(done){
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");  
            var params = [
                {"key": "test1","count": 1},
                {"key": "test2","count": 1,"sum":5,"dur":10}];
            request
            .get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
            .expect(200)
			.end(function(err, res){
                if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					done();
			});
		});
    });
    
    describe('setting new order',function(){
        it('setting order', function(done){
            var event_order = ["test2","test1"];
			request
			.get('/i/events/edit_map?app_id='+APP_ID+'&api_key='+API_KEY_ADMIN+"&event_order="+JSON.stringify(event_order))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				done();
			});
		});
        
        it('validating result', function(done){
			request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("order",["test2","test1"]);
					done();
				});
		});
    });
    
    describe('setting map values',function(){
        it('setting order', function(done){
            var event_map = {"test2":{"name":"My Test name","desc":"My desc"}};
			request
			.get('/i/events/edit_map?app_id='+APP_ID+'&api_key='+API_KEY_ADMIN+"&event_map="+JSON.stringify(event_map))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				done();
			});
		});
        
        it('validating result', function(done){
			request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.map.should.have.property("test2",{"name":"My Test name","desc":"My desc"});
                    done();
					
				});
		});
    });
    
    describe('adding to overview',function(){
        it('setting order', function(done){
            var overview = [{"eventKey":"test2","eventProperty":"count"}];
			request
			.get('/i/events/edit_map?app_id='+APP_ID+'&api_key='+API_KEY_ADMIN+"&event_overview="+JSON.stringify(overview))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				done();
			});
		});
        
        it('validating result', function(done){
			request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview",[{"eventKey":"test2","eventProperty":"count"}]);
                   done();
					
				});
		});
    });
    
    describe('editing overview(with duplicate)',function(){
        it('setting order', function(done){
            var overview = [{"eventKey":"test2","eventProperty":"count"},{"eventKey":"test1","eventProperty":"count"},{"eventKey":"test1","eventProperty":"count"}];
			request
			.get('/i/events/edit_map?app_id='+APP_ID+'&api_key='+API_KEY_ADMIN+"&event_overview="+JSON.stringify(overview))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				done();
			});
		});
        
        it('validating result', function(done){
			request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview",[{"eventKey":"test2","eventProperty":"count"},{"eventKey":"test1","eventProperty":"count"}]);
                   done();
					
				});
		});
    });
    
    describe('hiding event',function(){
        it('setting test1 hidden', function(done){
           
			request
			.get('/i/events/change_visibility?set_visibility=hide&app_id='+APP_ID+'&api_key='+API_KEY_ADMIN+"&events="+JSON.stringify(["test1"]))
			.expect(200)
			.end(function(err, res){
				if (err) return done(err);
				done();
			});
		});
        
        it('validating result', function(done){
			request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview",[{"eventKey":"test2","eventProperty":"count"}]);
                    ob.map.should.have.property("test2",{"name":"My Test name","desc":"My desc"});
                    ob.map.should.have.property("test1",{"is_visible":false});
                   done();
					
				});
		});
    });
    
    describe('cleanup',function(){
        it('should reset app', function(done){
                var params = {"app_id":APP_ID,"period":"reset"};
                request
                .get('/i/apps/reset?api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 5000);
                });
            });
    });
});
