var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var compareApps = [];
var DEVICE_ID = "1234567890";

describe('Testing Compare Plugin', function() {
    describe("Testing Compare Apps", function() {
        before(function() {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            compareApps.push(APP_ID);
        });
        describe('Get compare data', function() {
            it('should return 200 with relevant data', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps) + '&api_key=' + API_KEY_ADMIN)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        if (ob.length > 0 && ob[0].id.should.equal(APP_ID)) {
                            done();
                        }
                        else {
                            done("Invalid response");
                        }
                    });
            });
        });
        describe('Check by sending invalid params', function() {
            it('Try getting with invalid api key', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps) + '&api_key=kkkk')
                    .expect(401)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("User does not exist");
                        done();
                    });
            });
            it('Try getting without api key', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps))
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });
            it('Try getting without apps', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter: apps");
                        done();
                    });
            });
        });
    });

    describe("Testing Compare Events", function() {
        describe('Get compare data', function() {
            it('should return 200 with relevant data', function(done) {
                var compareEvents = ['CompareEvent1'];
                request.get('/o/compare/events?period=' + "30days" + '&events=' + JSON.stringify(compareEvents) + '&api_key=' + API_KEY_ADMIN)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        if (ob && ob['CompareEvent1']) {
                            done();
                        }
                        else {
                            done("Invalid response");
                        }
                    });
            });
        });

        describe('Try sending in some data and check if data is returned correctly', function() {
            it('sending event CompareEvent1', function(done) {
                var params = [{
                    "key": "CompareEvent1",
                    "count": 1
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });

            });

            it('sending event CompareEvent2', function(done) {
                var params = [{
                    "key": "CompareEvent2",
                    "count": 2
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });

            });

            it('should return 200 with relevant data', function(done) {
                var compareEvents = ['CompareEvent1', 'CompareEvent2'];
                request.get('/o/compare/events?period=' + "30days" + '&events=' + JSON.stringify(compareEvents) + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        console.log(res.text);

                        var currentYear = new Date().getFullYear();
                        var currentMonth = new Date().getMonth() + 1;
                        var currentDay = new Date().getDate();
                        ob.should.have.property('CompareEvent1');
                        ob.CompareEvent1.should.have.property(currentYear);
                        ob.CompareEvent1[currentYear].should.have.property(currentMonth);
                        ob.CompareEvent1[currentYear].should.have.property('c', 1);
                        ob.CompareEvent1[currentYear][currentMonth].should.have.property(currentDay);
                        ob.CompareEvent1[currentYear][currentMonth].should.have.property("c", 1);
                        ob.CompareEvent1[currentYear][currentMonth][currentDay].should.have.property("c", 1);

                        ob.should.have.property('CompareEvent2');
                        ob.CompareEvent2.should.have.property(currentYear);
                        ob.CompareEvent2[currentYear].should.have.property(currentMonth);
                        ob.CompareEvent2[currentYear].should.have.property("c", 2);
                        ob.CompareEvent2[currentYear][currentMonth].should.have.property(currentDay);
                        ob.CompareEvent2[currentYear][currentMonth].should.have.property("c", 2);
                        ob.CompareEvent2[currentYear][currentMonth][currentDay].should.have.property("c", 2);

                        done();
                    });
            });

            it('create event group', function(done) {
                var params = {
                    "source_events": ['CompareEvent1', 'CompareEvent2'],
                    "name": "CompareEventGroup",
                    "status": true,
                    "app_id": APP_ID,
                    "display_map": {}
                };
                request
                    .get('/i/event_groups/create?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&args=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        console.log(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });

            });

            it('Fetch event group and validate data for it', function(done) {

                request.get('/o?method=get_event_groups&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        console.log(res.text);
                        if (ob && ob[0]) {
                            var iid = ob[0]._id;
                            var compareEvents = [ob[0]._id];
                            request.get('/o/compare/events?period=' + "30days" + '&events=' + JSON.stringify(compareEvents) + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                                .expect(200)
                                .end(function(err, res) {
                                    if (err) {
                                        return done(err);
                                    }
                                    var ob = JSON.parse(res.text);
                                    console.log(res.text);

                                    var currentYear = new Date().getFullYear();
                                    var currentMonth = new Date().getMonth() + 1;
                                    var currentDay = new Date().getDate();
                                    ob.should.have.property(iid);
                                    ob[iid].should.have.property(currentYear);
                                    ob[iid][currentYear].should.have.property(currentMonth);
                                    ob[iid][currentYear].should.have.property('c', 3);
                                    ob[iid][currentYear][currentMonth].should.have.property(currentDay);
                                    ob[iid][currentYear][currentMonth].should.have.property("c", 3);
                                    ob[iid][currentYear][currentMonth][currentDay].should.have.property("c", 3);
                                    done();
                                });
                        }
                        else {
                            done("Group not created");
                        }
                    });
            });


        });

    });
});
