var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;

describe('Bulk writing', function(){
	describe('without args', function(){
		it('should bad request', function(done){
			API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
			APP_ID = testUtils.get("APP_ID");
			APP_KEY = testUtils.get("APP_KEY");
			request
			.get('/i/bulk')
			.expect(400)
			.end(function(err, res){
				if (err) return done(err);
				var ob = JSON.parse(res.text);
				ob.should.have.property('result', 'Missing parameter "requests"');
				setTimeout(done, 500)
			});
		});
	});
	describe('using session tests', function(){
		it('should success', function(done){
			var params = [
				{"device_id":DEVICE_ID, "app_key":APP_KEY},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "begin_session":1},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "begin_session":1},
				{"device_id":DEVICE_ID+"new", "app_key":APP_KEY, "begin_session":1},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "session_duration":30},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "end_session":1},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "session_duration":30},
				{"device_id":DEVICE_ID+"A", "app_key":APP_KEY, "end_session":1}
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
	describe('Verify bulk session write', function(){
		describe('Verify sessions', function(){
			it('should match sessions tests end result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=sessions')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("d", 60);
							ob[i].should.have.property("e", 8);
							ob[i].should.have.property("n", 3);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 3);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("d", 60);
									ob[i][j].should.have.property("e", 8);
									ob[i][j].should.have.property("n", 3);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 3);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("d", 60);
											ob[i][j][k].should.have.property("e", 8);
											ob[i][j][k].should.have.property("n", 3);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 3);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("d", 60);
													ob[i][j][k][n].should.have.property("e", 8);
													ob[i][j][k][n].should.have.property("n", 3);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 3);
												}
											}
										}
									}
								}
							}
						}
					}
					
					setTimeout(done, 500)
				});
			});
		});
		describe('verify users', function(){
			it('should match sessions tests end result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=users')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"f-ranges":["0"],"l-ranges":["0"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("f", {"0":3});
							ob[i].should.have.property("l", {"0":3});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":3});
									ob[i][j].should.have.property("l", {"0":3});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":3});
											ob[i][j][k].should.have.property("l", {"0":3});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify locations', function(){
			it('should match sessions tests end result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=locations')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property("meta", {"countries":["Unknown"]});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("Unknown", {"n":3,"t":3,"u":3});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":3,"t":3,"u":3});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":3,"t":3,"u":3});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should match sessions tests end result', function(done){
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
					dashboard.should.have.property("total_sessions", {"total":3,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":3,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":3,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.7","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('7days');
					var period = ob["7days"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":3,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":3,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":3,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.7","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					ob.should.have.property('today');
					var period = ob["today"];
					period.should.have.property("dashboard");
					var dashboard = period["dashboard"];
					dashboard.should.have.property("total_sessions", {"total":3,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":3,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":3,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.7","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 500);
				});
			});
		});
		describe('verify countries', function(){
			it('should match sessions tests end result', function(done){
				request
				.get('/o/analytics/countries?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days').and.not.eql([]);
					ob.should.have.property('7days').and.not.eql([]);
					ob.should.have.property('today').and.not.eql([]);
					for(var key in ob)
					{
						for(var i = ob[key].length-1; i >= 0; i--){
							ob[key][i].should.have.property("country", "Unknown");
							ob[key][i].should.have.property("code", "unknown");
							ob[key][i].should.have.property("t", 3);
							if(key == "today")
								ob[key][i].should.have.property("u", 3);
							else
								ob[key][i].should.have.property("u", 6);
							ob[key][i].should.have.property("n", 3);
						}
					}
					setTimeout(done, 500)
				});
			});
		});
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
					setTimeout(done, 500)
				});
			});
		});
	});
	describe('using metric tests', function(){
		it('should success', function(done){
			var params = [
				{"device_id":DEVICE_ID+"1", "app_key":APP_KEY, "begin_session":1, "metrics":{"_os": "Android"}},
				{"device_id":DEVICE_ID+"2", "app_key":APP_KEY, "begin_session":1, "metrics":{"_os_version": "4.4"}},
				{"device_id":DEVICE_ID+"3", "app_key":APP_KEY, "begin_session":1, "metrics":{"_density": "400dpi"}},
				{"device_id":DEVICE_ID+"4", "app_key":APP_KEY, "begin_session":1, "metrics":{"_resolution": "1200x800"}},
				{"device_id":DEVICE_ID+"5", "app_key":APP_KEY, "begin_session":1, "metrics":{"_os": "Android","_os_version": "4.4"}},
				{"device_id":DEVICE_ID+"6", "app_key":APP_KEY, "begin_session":1, "metrics":{"_device": "Nexus 5"}},
				{"device_id":DEVICE_ID+"7", "app_key":APP_KEY, "begin_session":1, "metrics":{"_carrier": "Vodafone"}},
				{"device_id":DEVICE_ID+"8", "app_key":APP_KEY, "begin_session":1, "metrics":{"_app_version": "1.0"}},
				{"device_id":DEVICE_ID+"9", "app_key":APP_KEY, "begin_session":1, "metrics":{"_os": "IOS","_os_version": "7.1","_resolution": "2048x1536", "_density": "200dpi", "_device": "iPod","_carrier": "Telecom","_app_version": "1.2"}},
				{"device_id":DEVICE_ID+"10", "app_key":APP_KEY, "begin_session":1, "metrics":{"_os": "IOS","_os_version": "7.1","_resolution": "2048x1536", "_density": "200dpi", "_device": "iPod","_carrier": "Telecom","_app_version": "1.2"}}
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
	describe('verify bulk metrics write', function(){
		describe('Verify device_details', function(){
			it('should match metrics tests end result', function(done){
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
					setTimeout(done, 500)
				});
			});
		});
		describe('Verify devices', function(){
			it('should match metrics tests end result', function(done){
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
					setTimeout(done, 500)
				});
			});
		});
		describe('Verify carriers', function(){
			it('should match metrics tests end result', function(done){
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
					setTimeout(done, 500)
				});
			});
		});
		describe('Verify app_versions', function(){
			it('should match metrics tests end result', function(done){
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
					setTimeout(done, 500)
				});
			});
		});
		describe('verify dashboard', function(){
			it('should match metrics tests end result', function(done){
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
					
					setTimeout(done, 500);
				});
			});
		});
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
					setTimeout(done, 500)
				});
			});
		});
	});
	describe('using event tests', function(){
		it('should success', function(done){
			var params = [
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test", "count": 1 }]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test", "count": 2 }]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 1 }]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 3},{"key": "test2", "count": 2}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 1, "sum": 2.97}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 1, "sum": 1.03}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 1, "segmentation": {"version": "1.0","country": "Turkey"}}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 2, "segmentation": {"version": "1.0","country": "Turkey","market": "amazon"}}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test1", "count": 2, "sum":1.50, "segmentation": {"version": "1.2","country": "Latvia","market": "googleplay"}}]},
				{"device_id":DEVICE_ID, "app_key":APP_KEY, "events":[{"key": "test2", "count": 2, "sum":1.50, "segmentation": {"country": "Latvia","market": "googleplay"}}]},
				{"device_id":DEVICE_ID+"A", "app_key":APP_KEY, "events":[{"key": "test2", "count": 2, "sum":1.50, "segmentation": {"country": "Latvia","market": "googleplay"}}]},
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
	describe('verify bulk events write', function(){
		describe('verify events without param', function(){
			it('should display first event data', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 3);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 3);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 3);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 3);
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify test event', function(){
			it('should match event tests test result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 3);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 3);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 3);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 3);
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify daily refresh test event', function(){
			it('should match event tests test daily result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 3);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 3);
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify test1 event', function(){
			it('should match event tests test1 result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							ob[i].should.have.property("meta", {"country":["Turkey","Latvia"],"market":["amazon","googleplay"],"version":["1:0","1:2"],"segments":["version","country","market"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 11);
									ob[i][j].should.have.property("s", 5.5);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 11);
											ob[i][j][k].should.have.property("s", 5.5);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 11);
													ob[i][j][k][m].should.have.property("s", 5.5);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 11);
															ob[i][j][k][m][n].should.have.property("s", 5.5);
														}
													}
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "country"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Turkey", {"c":3});
											ob[i][j][k].should.have.property("Latvia", {"c":2, "s":1.5});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Turkey", {"c":3});
													ob[i][j][k][m].should.have.property("Latvia", {"c":2, "s":1.5});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "market"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("amazon", {"c":2});
											ob[i][j][k].should.have.property("googleplay", {"c":2, "s":1.5});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("amazon", {"c":2});
													ob[i][j][k][m].should.have.property("googleplay", {"c":2, "s":1.5});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "version"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("1:0", {"c":3});
											ob[i][j][k].should.have.property("1:2", {"c":2, "s":1.5});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("1:0", {"c":3});
													ob[i][j][k][m].should.have.property("1:2", {"c":2, "s":1.5});
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify daily refresh test1 event', function(){
			it('should match event tests test1 daily result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							ob[i].should.have.property("meta", {"country":["Turkey", "Latvia"],"market":["amazon","googleplay"],"version":["1:0","1:2"],"segments":["version","country","market"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 11);
													ob[i][j][k][m].should.have.property("s", 5.5);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 11);
															ob[i][j][k][m][n].should.have.property("s", 5.5);
														}
													}
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "version"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("1:0", {"c":3});
													ob[i][j][k][m].should.have.property("1:2", {"c":2,"s":1.5});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "country"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Turkey", {"c":3});
													ob[i][j][k][m].should.have.property("Latvia", {"c":2,"s":1.5});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "market"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("amazon", {"c":2});
													ob[i][j][k][m].should.have.property("googleplay", {"c":2,"s":1.5});
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify test2 event', function(){
			it('should match event tests test2 result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test2')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							ob[i].should.have.property("meta", {"country":["Latvia"],"market":["googleplay"],"segments":["country","market"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 6);
									ob[i][j].should.have.property("s", 3);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 6);
											ob[i][j][k].should.have.property("s", 3);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 6);
													ob[i][j][k][m].should.have.property("s", 3);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 6);
															ob[i][j][k][m][n].should.have.property("s", 3);
														}
													}
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "country"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Latvia", {"c":4, "s":3});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Latvia", {"c":4, "s":3});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "market"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("googleplay", {"c":4, "s":3});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("googleplay", {"c":4, "s":3});
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify daily refresh test2 event', function(){
			it('should match event tests test2 daily result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test2&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						if(ob[i]["_id"] == "no-segment")
						{
							ob[i].should.have.property("meta", {"country":["Latvia"],"market":["googleplay"],"segments":["country","market"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 6);
													ob[i][j][k][m].should.have.property("s", 3);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 6);
															ob[i][j][k][m][n].should.have.property("s", 3);
														}
													}
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "version"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("1:2", {"c":4,"s":3});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "country"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Latvia", {"c":4,"s":3});
												}
											}
										}
									}
								}
							}
						}
						else if(ob[i]["_id"] == "market"){
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("googleplay", {"c":4,"s":3});
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		describe('verify merged event', function(){
			it('should match event tests end result', function(done){
				var events = ["test", "test1", "test2"];
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&events='+JSON.stringify(events))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					for(i in ob)
					{
						ob.should.have.property(i).and.not.eql({});
						if(RE.test(i))
						{
							ob[i].should.have.property("c", 20);
							ob[i].should.have.property("s", 8.5);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 20);
									ob[i][j].should.have.property("s", 8.5);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 20);
											ob[i][j][k].should.have.property("s", 8.5);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 20);
													ob[i][j][k][m].should.have.property("s", 8.5);
												}
											}
										}
									}
								}
							}
						}
					}
					setTimeout(done, 500)
				});
			});
		});
		
		describe('verify get_events', function(){
			it('should match event tests end result', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country","market"], "test2":["country","market"]});
					setTimeout(done, 500)
				});
			});
		});
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
					setTimeout(done, 500)
				});
			});
		});
	});
});