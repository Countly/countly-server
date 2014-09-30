var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;

describe('Writing app sessions', function(){
	describe('without session start', function(){
		describe('GET request', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100);
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 1 event', function(done){
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
							ob[i].should.have.property("e", 1);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("e", 1);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("e", 1);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("e", 1);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should be empty', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=users')
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should be empty', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=locations')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					for(key in ob)
						ob.should.have.property(key).and.eql({});
					setTimeout(done, 100);
				});
			});
		});
		/*
		{"30days":
			{"dashboard":
				{"total_sessions": {"total":1,"change":"NA", "trend":"u"},
				"total_users": {"total":1,"change":"NA","trend":"u","is_estimate":true},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}
				},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17 Sep","percent":100}]
				},
			"period":"19 Aug - 17 Sep"},
		"7days":
			{"dashboard":
				{"total_sessions":{"total":1,"change":"NA",	"trend":"u"},
				"total_users":{"total":1,"change":"NA","trend":"u","is_estimate":true},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}
				},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17 Sep","percent":100}]
				},
			"period":"11 Sep - 17 Sep"},
		"today":
			{"dashboard":
				{"total_sessions":{"total":1,"change":"NA","trend":"u"},
				"total_users":{"total":1,"change":"NA","trend":"u","is_estimate":false},
				"new_users":{"total":1,"change":"NA","trend":"u"},
				"total_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_time":{"total":"0.0 min","change":"NA","trend":"u"},
				"avg_requests":{"total":"2.0","change":"NA","trend":"u"}},
			"top":
				{"platforms":[{"name":"Android","percent":100}],
				"resolutions":[],
				"carriers":[{"name":"Vodafone","percent":100}],
				"users":[{"name":"17:00","percent":100}]
				},
			"period":"00:00 - 17:03"}
		}
		*/
		describe('verify dashboard', function(){
			it('should have 1 session and 1 user ', function(done){
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
					dashboard.should.have.property("total_sessions", {"total":0,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":0,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":0,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"0.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":0,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":0,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":0,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"0.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":0,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":0,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":0,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"0.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
				request
				.get('/o/analytics/countries?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days', []);
					ob.should.have.property('7days', []);
					ob.should.have.property('today', []);
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('start session', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+'&begin_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 1 session with 1 user', function(done){
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
							ob[i].should.have.property("e", 2);
							ob[i].should.have.property("n", 1);
							ob[i].should.have.property("t", 1);
							ob[i].should.have.property("u", 1);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("e", 2);
									ob[i][j].should.have.property("n", 1);
									ob[i][j].should.have.property("t", 1);
									ob[i][j].should.have.property("u", 1);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("e", 2);
											ob[i][j][k].should.have.property("n", 1);
											ob[i][j][k].should.have.property("t", 1);
											ob[i][j][k].should.have.property("u", 1);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("e", 2);
													ob[i][j][k][n].should.have.property("n", 1);
													ob[i][j][k][n].should.have.property("t", 1);
													ob[i][j][k][n].should.have.property("u", 1);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 1 user', function(done){
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
							ob[i].should.have.property("f", {"0":1});
							ob[i].should.have.property("l", {"0":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":1});
									ob[i][j].should.have.property("l", {"0":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":1});
											ob[i][j][k].should.have.property("l", {"0":1});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have Unknown location', function(done){
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
							ob[i].should.have.property("Unknown", {"n":1,"t":1,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":1,"t":1,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":1,"t":1,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 1 session and 1 user ', function(done){
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
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":1,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":1,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
							ob[key][i].should.have.property("t", 1);
							if(key == "today")
								ob[key][i].should.have.property("u", 1);
							else
								ob[key][i].should.have.property("u", 2);
							ob[key][i].should.have.property("n", 1);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('new session without closing previous', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+'&begin_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 2 sessions with 1 user', function(done){
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
							ob[i].should.have.property("e", 3);
							ob[i].should.have.property("n", 1);
							ob[i].should.have.property("t", 2);
							ob[i].should.have.property("u", 1);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("e", 3);
									ob[i][j].should.have.property("n", 1);
									ob[i][j].should.have.property("t", 2);
									ob[i][j].should.have.property("u", 1);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("e", 3);
											ob[i][j][k].should.have.property("n", 1);
											ob[i][j][k].should.have.property("t", 2);
											ob[i][j][k].should.have.property("u", 1);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("e", 3);
													ob[i][j][k][n].should.have.property("n", 1);
													ob[i][j][k][n].should.have.property("t", 2);
													ob[i][j][k][n].should.have.property("u", 1);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 1 user', function(done){
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
							ob[i].should.have.property("f", {"0":1});
							ob[i].should.have.property("l", {"0":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":1});
									ob[i][j].should.have.property("l", {"0":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":1});
											ob[i][j][k].should.have.property("l", {"0":1});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 2 unkown locations', function(done){
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
							ob[i].should.have.property("Unknown", {"n":1,"t":2,"u":1});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":1,"t":2,"u":1});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":1,"t":2,"u":1});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 2 sessions and 1 user ', function(done){
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
					dashboard.should.have.property("total_sessions", {"total":2,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":2,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_sessions", {"total":2,"change":"NA", "trend":"u"});
					dashboard.should.have.property("total_users", {"total":1,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":1,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
							ob[key][i].should.have.property("t", 2);
							if(key == "today")
								ob[key][i].should.have.property("u", 1);
							else
								ob[key][i].should.have.property("u", 2);
							ob[key][i].should.have.property("n", 1);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('new user', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+DEVICE_ID+'&app_key='+APP_KEY+'&begin_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 3 sessions with 2 users', function(done){
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
							ob[i].should.have.property("e", 4);
							ob[i].should.have.property("n", 2);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 2);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("e", 4);
									ob[i][j].should.have.property("n", 2);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 2);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("e", 4);
											ob[i][j][k].should.have.property("n", 2);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 2);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("e", 4);
													ob[i][j][k][n].should.have.property("n", 2);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 2);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 2 users', function(done){
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
							ob[i].should.have.property("f", {"0":2});
							ob[i].should.have.property("l", {"0":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":2});
									ob[i][j].should.have.property("l", {"0":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":2});
											ob[i][j][k].should.have.property("l", {"0":2});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 3 unkown locations for 2 users', function(done){
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
							ob[i].should.have.property("Unknown", {"n":2,"t":3,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":2,"t":3,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":2,"t":3,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 2 sessions and 1 user ', function(done){
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
								ob[key][i].should.have.property("u", 2);
							else
								ob[key][i].should.have.property("u", 4);
							ob[key][i].should.have.property("n", 2);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('session duration', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+'&session_duration=30')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 3 sessions with 4 events, 2 users and 30 duration', function(done){
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
							ob[i].should.have.property("d", 30);
							ob[i].should.have.property("e", 5);
							ob[i].should.have.property("n", 2);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 2);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("d", 30);
									ob[i][j].should.have.property("e", 5);
									ob[i][j].should.have.property("n", 2);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 2);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("d", 30);
											ob[i][j][k].should.have.property("e", 5);
											ob[i][j][k].should.have.property("n", 2);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 2);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("d", 30);
													ob[i][j][k][n].should.have.property("e", 5);
													ob[i][j][k][n].should.have.property("n", 2);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 2);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 2 users', function(done){
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
							ob[i].should.have.property("f", {"0":2});
							ob[i].should.have.property("l", {"0":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":2});
									ob[i][j].should.have.property("l", {"0":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":2});
											ob[i][j][k].should.have.property("l", {"0":2});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 3 unkown locations for 2 users', function(done){
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
							ob[i].should.have.property("Unknown", {"n":2,"t":3,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":2,"t":3,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":2,"t":3,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 2 sessions and 1 user and 30 seconds duration ', function(done){
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.5","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.5","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"2.5","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
								ob[key][i].should.have.property("u", 2);
							else
								ob[key][i].should.have.property("u", 4);
							ob[key][i].should.have.property("n", 2);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('session end', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+'&end_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 3 sessions with 6 events, 2 users and 30 duration', function(done){
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
							ob[i].should.have.property("d", 30);
							ob[i].should.have.property("e", 6);
							ob[i].should.have.property("n", 2);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 2);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("d", 30);
									ob[i][j].should.have.property("e", 6);
									ob[i][j].should.have.property("n", 2);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 2);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("d", 30);
											ob[i][j][k].should.have.property("e", 6);
											ob[i][j][k].should.have.property("n", 2);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 2);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("d", 30);
													ob[i][j][k][n].should.have.property("e", 6);
													ob[i][j][k][n].should.have.property("n", 2);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 2);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 2 users', function(done){
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
							ob[i].should.have.property("f", {"0":2});
							ob[i].should.have.property("l", {"0":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":2});
									ob[i][j].should.have.property("l", {"0":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":2});
											ob[i][j][k].should.have.property("l", {"0":2});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 3 unkown locations for 2 users', function(done){
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
							ob[i].should.have.property("Unknown", {"n":2,"t":3,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":2,"t":3,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":2,"t":3,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 3 sessions and 2 user and 30 seconds duration ', function(done){
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"0.5 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.2 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
								ob[key][i].should.have.property("u", 2);
							else
								ob[key][i].should.have.property("u", 4);
							ob[key][i].should.have.property("n", 2);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('session duration without start', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+'&session_duration=30')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 3 sessions with 7 events, 2 users and 60 duration', function(done){
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
							ob[i].should.have.property("e", 7);
							ob[i].should.have.property("n", 2);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 2);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("d", 60);
									ob[i][j].should.have.property("e", 7);
									ob[i][j].should.have.property("n", 2);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 2);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("d", 60);
											ob[i][j][k].should.have.property("e", 7);
											ob[i][j][k].should.have.property("n", 2);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 2);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("d", 60);
													ob[i][j][k][n].should.have.property("e", 7);
													ob[i][j][k][n].should.have.property("n", 2);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 2);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 2 users', function(done){
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
							ob[i].should.have.property("f", {"0":2});
							ob[i].should.have.property("l", {"0":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":2});
									ob[i][j].should.have.property("l", {"0":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":2});
											ob[i][j][k].should.have.property("l", {"0":2});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 3 unkown locations for 2 users', function(done){
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
							ob[i].should.have.property("Unknown", {"n":2,"t":3,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":2,"t":3,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":2,"t":3,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 3 sessions and 2 user and 60 seconds duration ', function(done){
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.5","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.5","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"3.5","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
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
								ob[key][i].should.have.property("u", 2);
							else
								ob[key][i].should.have.property("u", 4);
							ob[key][i].should.have.property("n", 2);
						}
					}
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('ending session without start', function(){
		describe('GET request', function(){
			it('should success', function(done){
				request
				.get('/i?device_id='+DEVICE_ID+'A&app_key='+APP_KEY+'&end_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"2014":{"9":{"17":{"16":{"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1},"e":2,"n":1,"t":1,"u":1,"w38":{"u":1}},"_id":"54198f4301f67bb240000075"}
		describe('Verify sessions', function(){
			it('should have 3 sessions with 8 events, 2 users and 60 duration', function(done){
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
							ob[i].should.have.property("n", 2);
							ob[i].should.have.property("t", 3);
							ob[i].should.have.property("u", 2);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("d", 60);
									ob[i][j].should.have.property("e", 8);
									ob[i][j].should.have.property("n", 2);
									ob[i][j].should.have.property("t", 3);
									ob[i][j].should.have.property("u", 2);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("d", 60);
											ob[i][j][k].should.have.property("e", 8);
											ob[i][j][k].should.have.property("n", 2);
											ob[i][j][k].should.have.property("t", 3);
											ob[i][j][k].should.have.property("u", 2);
											for(n in ob[i][j][k])
											{
												if(RE.test(n))
												{
													ob[i][j][k][n].should.have.property("d", 60);
													ob[i][j][k][n].should.have.property("e", 8);
													ob[i][j][k][n].should.have.property("n", 2);
													ob[i][j][k][n].should.have.property("t", 3);
													ob[i][j][k][n].should.have.property("u", 2);
												}
											}
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
		//{"2014":{"9":{"17":{"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1}},"f":{"0":1},"l":{"0":1},"w38":{"f":{"0":1},"l":{"0":1}}},"_id":"5419900801f67bb240000079","meta":{"f-ranges":["0"],"l-ranges":["0"]}}
		describe('verify users', function(){
			it('should have 2 users', function(done){
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
							ob[i].should.have.property("f", {"0":2});
							ob[i].should.have.property("l", {"0":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("f", {"0":2});
									ob[i][j].should.have.property("l", {"0":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("f", {"0":2});
											ob[i][j][k].should.have.property("l", {"0":2});
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
		//{"2014":{"9":{"17":{"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1}},"Unknown":{"n":1,"t":1,"u":1},"w38":{"Unknown":{"u":1}}},"_id":"5419892b01f67bb240000071","meta":{"countries":["Unknown"]}}
		describe('verify locations', function(){
			it('should have 3 unkown locations for 2 users', function(done){
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
							ob[i].should.have.property("Unknown", {"n":2,"t":3,"u":2});
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("Unknown", {"n":2,"t":3,"u":2});
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("Unknown", {"n":2,"t":3,"u":2});
										}
									}
								}
							}
						}
					}
					setTimeout(done, 100);
				});
			});
		});
		describe('verify dashboard', function(){
			it('should have 3 sessions and 2 user and 60 seconds duration ', function(done){
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"4.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":true});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"4.0","change":"NA","trend":"u"});
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
					dashboard.should.have.property("total_users", {"total":2,"change":"NA","trend":"u","is_estimate":false});
					dashboard.should.have.property("new_users", {"total":2,"change":"NA","trend":"u"});
					dashboard.should.have.property("total_time",{"total":"1.0 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_time", {"total":"0.3 min","change":"NA","trend":"u"});
					dashboard.should.have.property("avg_requests", {"total":"4.0","change":"NA","trend":"u"});
					period.should.have.property("top");
					var top = period["top"];
					top.should.have.property("platforms", []);
					top.should.have.property("resolutions", []);
					top.should.have.property("carriers", []);
					top.should.have.property("users");
					period.should.have.property("period");
					
					setTimeout(done, 100);
				});
			});
		});
	});
	//GeoIP Lite does not seem to work on travis, so IP does not show any country
	
	/*describe('start session with ip', function(){
		describe('GET request', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				agent
				.get('/i?device_id='+DEVICE_ID+'NewIP&app_key='+APP_KEY+'&ip_address=207.97.227.239&begin_session=1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		//{"30days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"7days":[{"country":"Unknown","code":"unknown","t":1,"u":2,"n":1}],"today":[{"country":"Unknown","code":"unknown","t":1,"u":1,"n":1}]}
		describe('verify countries', function(){
			it('should not be empty', function(done){
				agent
				.get('/o/analytics/countries?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('30days', [{"country":"Unknown","code":"unknown","t":3,"u":4,"n":2},{"country":"United States","code":"us","t":1,"u":2,"n":1}]);
					ob.should.have.property('7days', [{"country":"Unknown","code":"unknown","t":3,"u":4,"n":2},{"country":"United States","code":"us","t":1,"u":2,"n":1}]);
					ob.should.have.property('today', [{"country":"Unknown","code":"unknown","t":3,"u":2,"n":2},{"country":"United States","code":"us","t":1,"u":1,"n":1}]);
					setTimeout(done, 100);
				});
			});
		});
	});*/
});