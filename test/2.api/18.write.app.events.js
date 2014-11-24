var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var RE = /^-{0,1}\d*\.{0,1}\d+$/;

describe('Writing app events', function(){
	describe('Empty events', function(){
		describe('no events', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				var params = [];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('event without key', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				var params = [{
					"count": 1
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('event without count', function(){
			it('should success', function(done){
				API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
				APP_ID = testUtils.get("APP_ID");
				APP_KEY = testUtils.get("APP_KEY");
				var params = [{
					"key": "test"
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('Empty events', function(){
			it('should be empty', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.eql({});
					setTimeout(done, 100)
				});
			});
		});
		describe('Empty get_events', function(){
			it('should be empty', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.eql({});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Event with key and 1 count', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test",
					"count": 1
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		/*
		[{"2014":{"9":{"17":{"20":{"c":3,"s":2.97},"c":3,"s":2.97},"c":3,"s":2.97},"c":3,"s":2.97},"_id":"no-segment","meta":{"app_version":["1:0"],"country":["Turkey"],"segments":["app_version","country"]}},
		{"2014":{"9":{"17":{"1:0":{"c":3,"s":2.97}},"1:0":{"c":3,"s":2.97}},"1:0":{"c":3,"s":2.97}},"_id":"app_version"},
		{"2014":{"9":{"17":{"Turkey":{"c":3,"s":2.97}},"Turkey":{"c":3,"s":2.97}},"Turkey":{"c":3,"s":2.97}},"_id":"country"}]
		*/
		describe('verify events without params', function(){
			it('should have 1 event', function(done){
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
									ob[i][j].should.have.property("c", 1);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 1);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 1);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 1);
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have 1 event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 1);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 1);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 1);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 1);
													}
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
		describe('verify daily refresh event', function(){
			it('should have 1 event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 1);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 1);
													}
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
		describe('verify merged event', function(){
			it('should have 1 event', function(done){
				var events = ["test"];
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
							ob[i].should.have.property("c", 1);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 1);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 1);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 1);
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
		//{"_id":"5419c3ff01f67bb2400000a7","list":["in_app_purchase"],"segments":{"in_app_purchase":["app_version","country"]}}
		describe('verify get_events', function(){
			it('should have test event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Same event with key and 2 count', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test",
					"count": 2
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify events without params', function(){
			it('should have 3 test events', function(done){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have 3 test events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify daily refresh event', function(){
			it('should have 3 test events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify merged event', function(){
			it('should have 3 test events', function(done){
				var events = ["test"];
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
							ob[i].should.have.property("c", 3);
							for(j in ob[i])
							{
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
		describe('verify get_events', function(){
			it('should have test event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Another event with key and 1 count', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 1
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify events without params', function(){
			it('should 1 test and 2 test1 events', function(done){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should 1 test event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 1);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 1);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 1);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 1);
													}
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
		describe('verify daily refresh event', function(){
			it('should 1 test event', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 1);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 1);
													}
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
		describe('verify merged event', function(){
			it('should 4 total events', function(done){
				var events = ["test", "test1"];
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
							ob[i].should.have.property("c", 4);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 4);
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
		describe('verify get_events', function(){
			it('should test and test1', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Passing two events', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{"key": "test1", "count": 3},{"key": "test2", "count": 2}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify first event', function(){
			it('should have 4 events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 4);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 4);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 4);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 4);
													}
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
		describe('verify first daily refresh event', function(){
			it('should have 4 events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 4);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 4);
													}
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
		describe('verify second event', function(){
			it('should have 2 events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test2')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 2);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 2);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 2);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 2);
													}
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
		describe('verify second daily refresh event', function(){
			it('should have 2 events', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test2&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 2);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 2);
													}
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
		describe('verify merged two events', function(){
			it('should have 6 events', function(done){
				var events = ["test1", "test2"];
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
							ob[i].should.have.property("c", 6);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 6);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 6);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 6);
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
		describe('verify merged all events', function(){
			it('should have 9 events', function(done){
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
							ob[i].should.have.property("c", 9);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 9);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 9);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 9);
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
		describe('verify get_events', function(){
			it('should test, test1 and test2', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Event with sum', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 1,
					"sum": 2.97,
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have 5 events and 2.97 sum', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 5);
								ob[i][j].should.have.property("s", 2.97);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 5);
										ob[i][j][k].should.have.property("s", 2.97);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 5);
												ob[i][j][k][m].should.have.property("s", 2.97);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 5);
														ob[i][j][k][m][n].should.have.property("s", 2.97);
													}
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
		describe('verify daily refresh event', function(){
			it('should have 5 events and 2.97 sum', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 5);
												ob[i][j][k][m].should.have.property("s", 2.97);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 5);
														ob[i][j][k][m][n].should.have.property("s", 2.97);
													}
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
		describe('verify merged event', function(){
			it('should have 10 events and 2.97 sum', function(done){
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
							ob[i].should.have.property("c", 10);
							ob[i].should.have.property("s", 2.97);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 10);
									ob[i][j].should.have.property("s", 2.97);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 10);
											ob[i][j][k].should.have.property("s", 2.97);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 10);
													ob[i][j][k][m].should.have.property("s", 2.97);
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
		describe('verify get_events', function(){
			it('should test, test1 and test2', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Event with more sum', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 1,
					"sum": 1.03,
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have 6 events and 4 sum', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.have.property("c", 6);
								ob[i][j].should.have.property("s", 4);
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.have.property("c", 6);
										ob[i][j][k].should.have.property("s", 4);
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 6);
												ob[i][j][k][m].should.have.property("s", 4);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 6);
														ob[i][j][k][m][n].should.have.property("s", 4);
													}
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
		describe('verify daily refresh event', function(){
			it('should have 6 events and 4 sum', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=events&event=test1&action=refresh')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql([]);
					for(var i = ob.length-1; i >=0; i--){
						for(j in ob[i])
						{
							ob[i].should.have.property(j).and.not.eql({});
							if(RE.test(j))
							{
								ob[i][j].should.not.have.property("c");
								for(k in ob[i][j])
								{
									if(RE.test(k))
									{
										ob[i][j][k].should.not.have.property("c");
										for(m in ob[i][j][k])
										{
											if(RE.test(m))
											{
												ob[i][j][k][m].should.have.property("c", 6);
												ob[i][j][k][m].should.have.property("s", 4);
												for(n in ob[i][j][k][m])
												{
													if(RE.test(n))
													{
														ob[i][j][k][m][n].should.have.property("c", 6);
														ob[i][j][k][m][n].should.have.property("s", 4);
													}
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
		describe('verify merged event', function(){
			it('should have 11 events and 4 sum', function(done){
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
							ob[i].should.have.property("c", 11);
							ob[i].should.have.property("s", 4);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 11);
									ob[i][j].should.have.property("s", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 11);
											ob[i][j][k].should.have.property("s", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 11);
													ob[i][j][k][m].should.have.property("s", 4);
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
		describe('verify get_events', function(){
			it('should test, test1, test2', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.not.have.property("segments");
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Event with segmentation', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 1,
					"segmentation": {
						"version": "1.0",
						"country": "Turkey"
					}
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have country and version segments', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0"],"country":["Turkey"],"segments":["version","country"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 7);
									ob[i][j].should.have.property("s", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 7);
											ob[i][j][k].should.have.property("s", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 7);
													ob[i][j][k][m].should.have.property("s", 4);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 7);
															ob[i][j][k][m][n].should.have.property("s", 4);
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
											ob[i][j][k].should.have.property("1:0", {"c":1});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("1:0", {"c":1});
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
											ob[i][j][k].should.have.property("Turkey", {"c":1});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Turkey", {"c":1});
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
		describe('verify daily refresh event', function(){
			it('should have country and version segments', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0"],"country":["Turkey"],"segments":["version","country"]});
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
													ob[i][j][k][m].should.have.property("c", 7);
													ob[i][j][k][m].should.have.property("s", 4);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 7);
															ob[i][j][k][m][n].should.have.property("s", 4);
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
													ob[i][j][k][m].should.have.property("1:0", {"c":1});
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
													ob[i][j][k][m].should.have.property("Turkey", {"c":1});
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
		describe('verify merged event', function(){
			it('should 12 events and 4 sum', function(done){
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
							ob[i].should.have.property("c", 12);
							ob[i].should.have.property("s", 4);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 12);
									ob[i][j].should.have.property("s", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 12);
											ob[i][j][k].should.have.property("s", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 12);
													ob[i][j][k][m].should.have.property("s", 4);
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
		describe('verify get_events', function(){
			it('should have test, test1, test2 and test1 have version, country segments', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country"]});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Adding segmentation count and new segment', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 2,
					"segmentation": {
						"version": "1.0",
						"country": "Turkey",
						"market": "amazon"
					}
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have count 3 for previous segments and one new', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0"],"country":["Turkey"],"market":["amazon"],"segments":["version","country","market"]});
							for(j in ob[i])
							{
								ob[i].should.have.property(j).and.not.eql({});
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 9);
									ob[i][j].should.have.property("s", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 9);
											ob[i][j][k].should.have.property("s", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 9);
													ob[i][j][k][m].should.have.property("s", 4);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 9);
															ob[i][j][k][m][n].should.have.property("s", 4);
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
											ob[i][j][k].should.have.property("1:0", {"c":3});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("1:0", {"c":3});
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
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("Turkey", {"c":3});
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
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("amazon", {"c":2});
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
		describe('verify daily refresh event', function(){
			it('should have count 3 for previous segments and one new', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0"],"country":["Turkey"],"market":["amazon"],"segments":["version","country","market"]});
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
													ob[i][j][k][m].should.have.property("c", 9);
													ob[i][j][k][m].should.have.property("s", 4);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 9);
															ob[i][j][k][m][n].should.have.property("s", 4);
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
		describe('verify merged event', function(){
			it('should have 14 events and 4 sum', function(done){
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
							ob[i].should.have.property("c", 14);
							ob[i].should.have.property("s", 4);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 14);
									ob[i][j].should.have.property("s", 4);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 14);
											ob[i][j][k].should.have.property("s", 4);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 14);
													ob[i][j][k][m].should.have.property("s", 4);
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
		describe('verify get_events', function(){
			it('should test, test1, test2 and version, country, market segments for test1', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country","market"]});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Adding new segmentation values and sum', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test1",
					"count": 2,
					"sum": 1.50,
					"segmentation": {
						"version": "1.2",
						"country": "Latvia",
						"market": "googleplay"
					}
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have new segment values and sum updated', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0","1:2"],"country":["Turkey","Latvia"],"market":["amazon","googleplay"],"segments":["version","country","market"]});
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
											ob[i][j][k].should.have.property("1:2", {"c":2,"s":1.5});
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
					}
					setTimeout(done, 100)
				});
			});
		});
		describe('verify daily refresh event', function(){
			it('should have new segment values and sum updated', function(done){
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
							ob[i].should.have.property("meta", {"version":["1:0","1:2"],"country":["Turkey","Latvia"],"market":["amazon","googleplay"],"segments":["version","country","market"]});
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify merged event', function(){
			it('should 16 events and 5.5 sum', function(done){
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
							ob[i].should.have.property("c", 16);
							ob[i].should.have.property("s", 5.5);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 16);
									ob[i][j].should.have.property("s", 5.5);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 16);
											ob[i][j][k].should.have.property("s", 5.5);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 16);
													ob[i][j][k][m].should.have.property("s", 5.5);
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
		describe('verify get_events', function(){
			it('should test, test1, test2 and version, country, market segments for test1', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country","market"]});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Adding segmentation for other event', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test2",
					"count": 2,
					"sum": 1.50,
					"segmentation": {
						"country": "Latvia",
						"market": "googleplay"
					}
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have segmentation and sum', function(done){
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
									ob[i][j].should.have.property("c", 4);
									ob[i][j].should.have.property("s", 1.5);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 4);
											ob[i][j][k].should.have.property("s", 1.5);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 4);
													ob[i][j][k][m].should.have.property("s", 1.5);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 4);
															ob[i][j][k][m][n].should.have.property("s", 1.5);
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
											ob[i][j][k].should.have.property("Latvia", {"c":2, "s":1.5});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
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
											ob[i][j][k].should.have.property("googleplay", {"c":2, "s":1.5});
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("googleplay", {"c":2, "s":1.5});
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
		describe('verify daily refresh event', function(){
			it('should have new segment values and sum updated', function(done){
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
													ob[i][j][k][m].should.have.property("c", 4);
													ob[i][j][k][m].should.have.property("s", 1.5);
													for(n in ob[i][j][k][m])
													{
														if(RE.test(n))
														{
															ob[i][j][k][m][n].should.have.property("c", 4);
															ob[i][j][k][m][n].should.have.property("s", 1.5);
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
													ob[i][j][k][m].should.have.property("googleplay", {"c":2,"s":1.5});
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
		describe('verify merged event', function(){
			it('should 16 events and 5.5 sum', function(done){
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
							ob[i].should.have.property("c", 18);
							ob[i].should.have.property("s", 7);
							for(j in ob[i])
							{
								if(RE.test(j))
								{
									ob[i][j].should.have.property("c", 18);
									ob[i][j].should.have.property("s", 7);
									for(k in ob[i][j])
									{
										if(RE.test(k))
										{
											ob[i][j][k].should.have.property("c", 18);
											ob[i][j][k].should.have.property("s", 7);
											for(m in ob[i][j][k])
											{
												if(RE.test(m))
												{
													ob[i][j][k][m].should.have.property("c", 18);
													ob[i][j][k][m].should.have.property("s", 7);
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
		describe('verify get_events', function(){
			it('should test, test1, test2 and version, country, market segments for test1', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country","market"], "test2":["country","market"]});
					setTimeout(done, 100)
				});
			});
		});
	});
	describe('Adding event for other user', function(){
		describe('creating event', function(){
			it('should success', function(done){
				var params = [{
					"key": "test2",
					"count": 2,
					"sum": 1.50,
					"segmentation": {
						"country": "Latvia",
						"market": "googleplay"
					}
				}];
				request
				.get('/i?device_id='+DEVICE_ID+'A&app_key='+APP_KEY+"&events="+JSON.stringify(params))
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.have.property('result','Success');
					setTimeout(done, 100)
				});
			});
		});
		describe('verify specific event', function(){
			it('should have add count and sum', function(done){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify daily refresh event', function(){
			it('should have add count and sum', function(done){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify merged event', function(){
			it('should have add count and sum', function(done){
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
					setTimeout(done, 100)
				});
			});
		});
		describe('verify get_events', function(){
			it('should test, test1, test2 and version, country, market segments for test1', function(done){
				request
				.get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=get_events')
				.expect(200)
				.end(function(err, res){
					if (err) return done(err);
					var ob = JSON.parse(res.text);
					ob.should.not.eql({});
					ob.should.have.property("list", ["test", "test1", "test2"]);
					ob.should.have.property("segments", {"test1":["version","country","market"], "test2":["country","market"]});
					setTimeout(done, 100)
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