var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var plugins = require("../../plugins/pluginManager");
var db = plugins.dbConnection();

var crypto = require('crypto');
var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";
var token1="";
var token2="";

var validate_token = function(token_id,values,token_count,done){    
        request
        .get('/o/token?api_key='+API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
			ob.should.have.property('result');
            var found=false;
            if(ob.result.length==token_count){
                for(var p=0; p<ob.result.length; p++) {
                    if(ob.result[p] && ob.result[p]["_id"] && ob.result[p]._id.valueOf() == token_id.valueOf()) {
                        ob.result[p].should.have.property("ttl",values.ttl);
                        ob.result[p].should.have.property("multi",values.multi);
                        ob.result[p].should.have.property("endpoint",values.endpoint);
                        ob.result[p].should.have.property("purpose",values.purpose);
                        ob.result[p].should.have.property("app",values.app);
                        done();
                        return
                    }
                }
                done("token missing");
            }
            else
                done("invalid token count "+ob.result.length +"("+token_count+")");
		});
}
describe('Testing token manager', function(){     
    it('getting empty token list', function(done){
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");          
        request
        .get('/o/token?api_key='+API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
			ob.should.have.property('result',[]);
            done();
		});
	});
    
    it('creating token with def settings', function(done){         
        request
        .get('/i/token?api_key='+API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            if(ob && ob.result && ob.result!="")
                token1 = ob.result;
            else
                done("token value not returned");
            done();
		});
	});
    
    it('validate token'+token1, function(done){  
        validate_token(token1,{"app":"","multi":true,"ttl":1800,"endpoint":"","purpose":""},1,done);
    });
    
    it('deleting created token', function(done){         
        request
        .get('/i/token/delete?api_key='+API_KEY_ADMIN+'&tokenid='+token1)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
	});
    
    it('getting empty token list', function(done){         
        request
        .get('/o/token?api_key='+API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
			ob.should.have.property('result',[]);
            done();
		});
	});
    
    it('creating token with multi==false', function(done){         
        request
        .get('/i/token?api_key='+API_KEY_ADMIN+'&multi=false')
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            if(ob && ob.result && ob.result!="")
                token1 = ob.result;
            else
                done("token value not returned");
            done();
		});
	});
    
    it('validate token'+token1, function(done){  
        validate_token(token1,{"app":"","multi":false,"ttl":1800,"endpoint":"","purpose":""},1,done);
    });
    it('using token'+token1, function(done){    
        request
        .get('/o/token?auth_token='+token1)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
    });
    
    it('using again should not allow', function(done){    
        request
        .get('/o/token?auth_token='+token1)
        .expect(400)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
    });
    
    it('should get empty token list', function(done){       
        request
        .get('/o/token?api_key='+API_KEY_ADMIN)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
			ob.should.have.property('result',[]);
            done();
		});
	});
    
    it('creating token with purpose single endpoint and  ttl', function(done){         
        request
        .get('/i/token?api_key='+API_KEY_ADMIN+'&ttl=300&purpose=My test token&endpoint=/o/token&apps='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            if(ob && ob.result && ob.result!="")
                token1 = ob.result;
            else
                done("token value not returned");
            done();
		});
	});
    
    it('validate token'+token1, function(done){  
        validate_token(token1,{"app":[APP_ID],"multi":true,"ttl":300,"endpoint":["/o/token"],"purpose":"My test token"},1,done);
    });
    
    it('using token'+token1, function(done){    
        request
        .get('/o/token?auth_token='+token1)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
    });
    
    it('using on different endpoint should not allow', function(done){    
        request
        .get('/o/apps/mine?auth_token='+token1)
        .expect(400)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
    });
    
    it('deleting created token', function(done){         
        request
        .get('/i/token/delete?api_key='+API_KEY_ADMIN+'&tokenid='+token1)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
	});
    
    it('creating token for multiple apps and endpoints', function(done){     
        request
        .get('/i/token?api_key='+API_KEY_ADMIN+'&ttl=300&purpose=My test token&endpoint=/o/apps/mine,/o/token&apps='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            if(ob && ob.result && ob.result!="")
                token1 = ob.result;
            else
                done("token value not returned");
            done();
		});
	});
    
    it('validate token'+token1, function(done){  
        validate_token(token1,{"app":[APP_ID],"multi":true,"ttl":300,"endpoint":["/o/apps/mine","/o/token"],"purpose":"My test token"},1,done);
    });
    
    it('deleting created token', function(done){         
        request
        .get('/i/token/delete?api_key='+API_KEY_ADMIN+'&tokenid='+token1)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
		});
	}); 
});
