var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var testUtils = require("../testUtils");
var pluginManager = require("../../plugins/pluginManager.js"); 
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var db;

describe('Testing user merge scenarios', function(){
    describe('Single user (anonymous and then logged in with merge) single device', function(){
        describe('Anonymous user session', function(){
			it('should success', function(done){
                API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
                db = pluginManager.dbConnection();
				var params = {"_os": "Android", "_os_version":"4.1", "_device":"Samsung S7"};
				request
				.get('/i?device_id='+DEVICE_ID+'1&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'1').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'1');
                    user.should.have.property("uid",'1');
                    user.should.have.property("d","Samsung S7");
                    user.should.have.property("pv","a4:1");
                    user.should.have.property("p","Android");
                    setTimeout(done, 5000)
                });
			});
		});
        describe('User Logs in', function(){
			it('should success', function(done){
				var params = {"_os": "Android", "_os_version":"4.1", "_device":"Samsung S7"};
				request
				.get('/i?device_id='+DEVICE_ID+'2&old_device_id='+DEVICE_ID+'1&app_key='+APP_KEY)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify anonymous user', function(){
			it('should not exist', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'1').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    should.not.exist(user);
                    setTimeout(done, 5000)
                });
			});
		});
        describe('Verify logged in user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'2').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'2');
                    user.should.have.property("uid",'1');
                    user.should.have.property("d","Samsung S7");
                    user.should.have.property("pv","a4:1");
                    user.should.have.property("p","Android");
                    setTimeout(done, 5000)
                });
			});
		});
    });
    
    describe('Single user (anonymous and then logged in with merge) multi device', function(){
        describe('Anonymous user session', function(){
			it('should success', function(done){
				var params = {"_os": "iOS", "_os_version":"9.1", "_device":"iPad"};
				request
				.get('/i?device_id='+DEVICE_ID+'3&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'3').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'3');
                    user.should.have.property("uid",'2');
                    user.should.have.property("d","iPad");
                    user.should.have.property("pv","i9:1");
                    user.should.have.property("p","iOS");
                    setTimeout(done, 5000)
                });
			});
		});
        describe('User Logs in', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'2&old_device_id='+DEVICE_ID+'3&app_key='+APP_KEY)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify anonymous user', function(){
			it('should not exist', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'3').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    should.not.exist(user);
                    setTimeout(done, 5000)
                });
			});
		});
        describe('Verify logged in user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'2').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'2');
                    user.should.have.property("uid",'1');
                    user.should.have.property("d","iPad");
                    user.should.have.property("pv","i9:1");
                    user.should.have.property("p","iOS");
                    setTimeout(done, 5000)
                });
			});
		});
    });
    
    describe('Single user (multi account merge)', function(){
        describe('First account', function(){
			it('should success', function(done){
				var params = {"_os": "Android", "_os_version":"5.1", "_device":"Sony Xperia"};
				request
				.get('/i?device_id='+DEVICE_ID+'4&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'4').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'4');
                    user.should.have.property("uid",'3');
                    user.should.have.property("d","Sony Xperia");
                    user.should.have.property("pv","a5:1");
                    user.should.have.property("p","Android");
                    setTimeout(done, 5000)
                });
			});
		});
        describe('Second account', function(){
			it('should success', function(done){
				var params = {"_os": "iOS", "_os_version":"8.1", "_device":"iPhone"};
				request
				.get('/i?device_id='+DEVICE_ID+'5&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'5').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'5');
                    user.should.have.property("uid",'4');
                    user.should.have.property("d","iPhone");
                    user.should.have.property("pv","i8:1");
                    user.should.have.property("p","iOS");
                    setTimeout(done, 5000)
                });
			});
		});
        describe('Merge accounts', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'5&old_device_id='+DEVICE_ID+'4&app_key='+APP_KEY)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 5000)
				});
			});
		});
        describe('Verify anonymous user', function(){
			it('should not exist', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'4').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    should.not.exist(user);
                    setTimeout(done, 5000)
                });
			});
		});
        describe('Verify logged in user', function(){
			it('should have user data', function(done){
                var id = crypto.createHash('sha1').update(APP_KEY + DEVICE_ID+'5').digest('hex');
				db.collection('app_users' + APP_ID).findOne({'_id': id }, function (err, user){
                    user.should.have.property("did",DEVICE_ID+'5');
                    user.should.have.property("uid",'4');
                    user.should.have.property("d","iPhone");
                    user.should.have.property("pv","i8:1");
                    user.should.have.property("p","iOS");
                    setTimeout(done, 5000)
                });
			});
		});
    });
    
    describe('reset app', function(){
		describe('reseting data', function(){
			it('should reset data', function(done){
				this.timeout(20000);
				var params = {app_id:APP_ID};
				request
				.get('/i/apps/reset?api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result', 'Success');
                    done();
                    db.close();
				});
			});
		});
	});
});