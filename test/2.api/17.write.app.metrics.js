var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;

//var params = {"_os": "Android","_os_version": "4.4","_resolution": "1200x800", "_density": "400dpi", "_device": "Nexus 5","_carrier": "Vodafone","_app_version": "1.0"};

describe('Writing app metrics', function(){
	describe('Checking if metrics empty', function(){
		describe('Empty devices', function(){
			it('should have no devices', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=devices')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(key in ob)
						ob.should.have.property(key).and.eql({});
					setTimeout(done, 100)
				});
			});
		});
		describe('Empty device_details', function(){
			it('should have no device_details', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(key in ob)
						ob.should.have.property(key).and.eql({});
					setTimeout(done, 100)
				});
			});
		});
		describe('Empty carriers', function(){
			it('should have no carriers', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=carriers')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(key in ob)
						ob.should.have.property(key).and.eql({});
					setTimeout(done, 100)
				});
			});
		});
		describe('Empty app_versions', function(){
			it('should have no app_versions', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=app_versions')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(key in ob)
						ob.should.have.property(key).and.eql({});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('testing OS metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_os": "Android"};
				request
				.get('/i?device_id='+DEVICE_ID+'1&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
		describe('Verify device_details', function(){
			it('should have Android OS', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should sessions, users, os', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":1,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":1,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":1,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('testing OS version metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_os_version": "4.4"};
				request
				.get('/i?device_id='+DEVICE_ID+'2&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
		describe('Verify device_details', function(){
			it('should have os and version', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android"],"os_versions":["4:4"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('testing density metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_density": "400dpi"};
				request
				.get('/i?device_id='+DEVICE_ID+'3&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
		describe('Verify device_details', function(){
			it('should have os, version and density', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android"],"os_versions":["4:4"],"densities":['400dpi']});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("400dpi", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("400dpi", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("400dpi", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('testing resolution metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_resolution": "1200x800"};
				request
				.get('/i?device_id='+DEVICE_ID+'4&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
		describe('Verify device_details', function(){
			it('should have os, version, density and resolution', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android"],"os_versions":["4:4"],"densities":["400dpi"],"resolutions":["1200x800"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("400dpi", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1200x800", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("400dpi", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1200x800", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("400dpi", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1200x800", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have sessions, users, or and resolutions', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":4,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":4,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":4,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":4,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":4,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":4,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":4,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":4,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":4,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('testing OS with OS version metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_os": "Android","_os_version": "4.4"};
				request
				.get('/i?device_id='+DEVICE_ID+'5&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1}},"Android":{"n":1,"t":1,"u":1},"a4:4":{"n":1,"t":1,"u":1},"w38":{"Android":{"u":1},"a4:4":{"u":1}}},"_id":"541992a901f67bb240000087","meta":{"os":["Android"],"os_versions":["a4:4"]}}
		describe('Verify device_details', function(){
			it('should have os version combo and all previous', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android"],"os_versions":["4:4", "a4:4"],"densities":["400dpi"],"resolutions":["1200x800"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("a4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("400dpi", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1200x800", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("a4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("400dpi", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1200x800", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("a4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("400dpi", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1200x800", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have sessions, users, os and resolutions', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":5,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":5,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":5,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":5,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":5,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":5,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":5,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":5,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":5,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('testing device metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_device": "Nexus 5"};
				request
				.get('/i?device_id='+DEVICE_ID+'6&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Nexus 5":{"n":1,"t":1,"u":1}},"Nexus 5":{"n":1,"t":1,"u":1}},"Nexus 5":{"n":1,"t":1,"u":1},"w38":{"Nexus 5":{"u":1}}},"_id":"541991c801f67bb240000083","meta":{"devices":["Nexus 5"]}}
		describe('Verify devices', function(){
			it('should have Nexus 5', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=devices')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"devices":["Nexus 5"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('testing carrier metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_carrier": "Vodafone"};
				request
				.get('/i?device_id='+DEVICE_ID+'7&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"Vodafone":{"n":1,"t":1,"u":1}},"Vodafone":{"n":1,"t":1,"u":1}},"Vodafone":{"n":1,"t":1,"u":1},"w38":{"Vodafone":{"u":1}}},"_id":"5419935501f67bb24000008b","meta":{"carriers":["Vodafone"]}}
		describe('Verify carriers', function(){
			it('should have Vodafone', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=carriers')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"carriers":["Vodafone"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have sessions, users, os, resolutions and carriers', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":7,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":7,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":7,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":100}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":7,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":7,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":7,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":100}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":7,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":7,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":7,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":100}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":100}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":100}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('testing app_version metric', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_app_version": "1.0"};
				request
				.get('/i?device_id='+DEVICE_ID+'8&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"1:0":{"n":1,"t":1,"u":1}},"1:0":{"n":1,"t":1,"u":1}},"1:0":{"n":1,"t":1,"u":1},"w38":{"1:0":{"u":1}}},"_id":"541993cb01f67bb24000008d","meta":{"app_versions":["1:0"]}}
		describe('Verify app_versions', function(){
			it('should have app version 1.0', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=app_versions')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"app_versions":["1:0"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("1:0", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("1:0", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("1:0", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('testing with all metrics', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_os": "IOS","_os_version": "7.1","_resolution": "2048x1536", "_density": "200dpi", "_device": "iPod","_carrier": "Telecom","_app_version": "1.2"};
				request
				.get('/i?device_id='+DEVICE_ID+'9&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify device_details', function(){
			it('should should have new metrics', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android", "IOS"],"os_versions":["4:4", "a4:4", "i7:1"],"densities":["400dpi", "200dpi"],"resolutions":["1200x800", "2048x1536"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("a4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("400dpi", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1200x800", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("IOS", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("i7:1", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("200dpi", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("2048x1536", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("a4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("400dpi", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1200x800", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("IOS", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("i7:1", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("200dpi", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("2048x1536", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("a4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("400dpi", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1200x800", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("IOS", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("i7:1", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("200dpi", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("2048x1536", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify devices', function(){
			it('should have iPod', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=devices')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"devices":["Nexus 5", "iPod"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("iPod", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("iPod", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("iPod", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify carriers', function(){
			it('should have Telecom', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=carriers')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"carriers":["Vodafone", "Telecom"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("Telecom", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("Telecom", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("Telecom", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify app_versions', function(){
			it('should have app version 1.2', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=app_versions')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"app_versions":["1:0", "1:2"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("1:0", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1:2", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("1:0", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1:2", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("1:0", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1:2", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have percentage split between os, resolutions and carriers', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":9,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":9,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":9,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":66},{"name":"IOS","percent":34}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":50}, {"name":"2048x1536","percent":50}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":50},{"name":"Telecom","percent":50}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":9,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":9,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":9,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":66},{"name":"IOS","percent":34}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":50}, {"name":"2048x1536","percent":50}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":50},{"name":"Telecom","percent":50}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":9,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":9,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":9,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":66},{"name":"IOS","percent":34}]);
					top.should.have.property("resolutions", [{"name":"1200x800","percent":50}, {"name":"2048x1536","percent":50}]);
					top.should.have.property("carriers", [{"name":"Vodafone","percent":50},{"name":"Telecom","percent":50}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('same metrics new user', function(){
		describe('GET request', function(){
			it('should success', function(done){
				var params = {"_os": "IOS","_os_version": "7.1","_resolution": "2048x1536", "_density": "200dpi", "_device": "iPod","_carrier": "Telecom","_app_version": "1.2"};
				request
				.get('/i?device_id='+DEVICE_ID+'10&app_key='+APP_KEY+"&begin_session=1&metrics="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify device_details', function(){
			it('should have additional user for new metrics', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=device_details')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"os":["Android", "IOS"],"os_versions":["4:4", "a4:4", "i7:1"],"densities":["400dpi", "200dpi"],"resolutions":["1200x800", "2048x1536"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Android", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("a4:4", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("400dpi", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1200x800", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("IOS", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("i7:1", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("200dpi", {"n":2,"t":2,"u":2});
							ob[i].should.have.property("2048x1536", {"n":2,"t":2,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Android", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("a4:4", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("400dpi", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1200x800", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("IOS", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("i7:1", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("200dpi", {"n":2,"t":2,"u":2});
									ob[i][j].should.have.property("2048x1536", {"n":2,"t":2,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Android", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("a4:4", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("400dpi", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1200x800", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("IOS", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("i7:1", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("200dpi", {"n":2,"t":2,"u":2});
											ob[i][j][k].should.have.property("2048x1536", {"n":2,"t":2,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify devices', function(){
			it('should have additional user for iPod', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=devices')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"devices":["Nexus 5", "iPod"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("iPod", {"n":2,"t":2,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("iPod", {"n":2,"t":2,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Nexus 5", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("iPod", {"n":2,"t":2,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify carriers', function(){
			it('should have new user for Telecom', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=carriers')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"carriers":["Vodafone", "Telecom"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("Telecom", {"n":2,"t":2,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("Telecom", {"n":2,"t":2,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Vodafone", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("Telecom", {"n":2,"t":2,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('Verify app_versions', function(){
			it('should should have new user for app version 1.2', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=app_versions')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"app_versions":["1:0", "1:2"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("1:0", {"n":1,"t":1,"u":1});
							ob[i].should.have.property("1:2", {"n":2,"t":2,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("1:0", {"n":1,"t":1,"u":1});
									ob[i][j].should.have.property("1:2", {"n":2,"t":2,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("1:0", {"n":1,"t":1,"u":1});
											ob[i][j][k].should.have.property("1:2", {"n":2,"t":2,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have percentage split for platforms, resolutions and carriers', function(done){
				request
				.get('/o/analytics/dashboard?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days');
					var period = ob["30days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":10,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":10,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":10,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":50},{"name":"IOS","percent":50}]);
					top.should.have.property("resolutions", [{"name":"2048x1536","percent":66},{"name":"1200x800","percent":34}]);
					top.should.have.property("carriers", [{"name":"Telecom","percent":66},{"name":"Vodafone","percent":34}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":10,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":10,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":10,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":50},{"name":"IOS","percent":50}]);
					top.should.have.property("resolutions", [{"name":"2048x1536","percent":66},{"name":"1200x800","percent":34}]);
					top.should.have.property("carriers", [{"name":"Telecom","percent":66},{"name":"Vodafone","percent":34}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":10,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":10,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":10,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"1.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", [{"name":"Android","percent":50},{"name":"IOS","percent":50}]);
					top.should.have.property("resolutions", [{"name":"2048x1536","percent":66},{"name":"1200x800","percent":34}]);
					top.should.have.property("carriers", [{"name":"Telecom","percent":66},{"name":"Vodafone","percent":34}]);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	describe('reset app', function(){
		describe('reseting data', function(){
			it('should reset data', function(done){
				var params = {app_id:APP_ID};
				request
				.get('/i/apps/reset?api_key='+API_KEY_ADMIN+"&args="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result', 'Success');
					setTimeout(done, 100)
				});
			});
		});
	});
});