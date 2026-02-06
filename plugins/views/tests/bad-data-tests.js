var request = require('supertest');
var should = require('should');
var testUtils = require("../../../test/testUtils");
request = request.agent(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var waitTime = 3000;

var myTime = Date.now();
myTime = myTime - 2 * 3600 * 1000; //2 hours back

var db;

describe('Testing views plugin with dots in names and segments', function() {
    describe('Setup', function() {
        it('should initialize test variables', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            db = testUtils.client.db("countly");
            done();
        });
    });

    describe('Test dots in view name', function() {
        it('should record view with dots in name', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "test.view.with.dots",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_1&timestamp=' + myTime + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor + waitTime);
                });
        });

        it('should retrieve view with dots in name from 30days period', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    resDecoded.should.have.property('iTotalRecords', 1);
                    resDecoded.should.have.property('aaData');
                    resDecoded.aaData.length.should.eql(1);
                    resDecoded.aaData[0].should.have.property('view', 'test.view.with.dots');

                    resDecoded.aaData[0].should.have.property('t', 1);
                    resDecoded.aaData[0].should.have.property('s', 1);
                    done();
                });
        });
    });

    describe('Test dots in segment keys', function() {
        it('should record view with dots in segment key', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "test.view.with.dots",
                    "segment.with.dots": "value1",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_2&timestamp=' + myTime + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor + waitTime + 3000);
                });
        });

        it('should retrieve view and verify segment key was encoded', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_view_segments')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    console.log(res.text);
                    // Dots should be encoded/replaced in segment keys
                    resDecoded.should.have.property('segments');
                    resDecoded.segments.should.have.property('segmentwithdots');
                    resDecoded.segments.segmentwithdots.should.be.an.Array();
                    resDecoded.segments.segmentwithdots.should.containEql('value1');
                    done();
                });
        });

        it('should verify view data in 30days period', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days&no_cache=true')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    resDecoded.should.have.property('iTotalRecords', 1);
                    resDecoded.should.have.property('aaData');
                    resDecoded.aaData.length.should.eql(1);
                    resDecoded.aaData[0].should.have.property('view', 'test.view.with.dots');
                    resDecoded.aaData[0].should.have.property('u', 2);
                    resDecoded.aaData[0].should.have.property('t', 2);
                    resDecoded.aaData[0].should.have.property('s', 2);

                    done();
                });
        });
    });

    describe('Test dots in segment values', function() {
        it('should record view with dots in segment value', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "testview3",
                    "platform": "android.version.10.0",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_3&timestamp=' + myTime + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor + waitTime);
                });
        });

        it('should retrieve segments and verify value with dots', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_view_segments')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    resDecoded.should.have.property('segments');
                    resDecoded.segments.should.have.property('platform');
                    resDecoded.segments.platform.should.be.an.Array();
                    // Segment values might be encoded
                    resDecoded.segments.platform.should.containEql('android&#46;version&#46;10&#46;0');
                    done();
                });
        });

        it('should verify view data in 30days period', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    resDecoded.should.have.property('iTotalRecords', 2);
                    var foundView = false;
                    for (var i = 0; i < resDecoded.aaData.length; i++) {
                        if (resDecoded.aaData[i].view === 'testview3') {
                            foundView = true;
                            resDecoded.aaData[i].should.have.property('u', 1);
                            resDecoded.aaData[i].should.have.property('t', 1);
                            resDecoded.aaData[i].should.have.property('s', 1);
                            break;
                        }
                    }
                    foundView.should.be.true();
                    done();
                });
        });
    });

    describe('Test multiple dots in all fields', function() {
        it('should record view with dots in name, segment key, and segment value', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "complex.view.name",
                    "custom.segment.key": "custom.segment.value",
                    "another.key": "another.value.with.dots",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_4&timestamp=' + myTime + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor + waitTime);
                });
        });

        it('should verify all segments were recorded', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_view_segments')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    // Check that encoded segment keys exist
                    resDecoded.should.have.property('segments');
                    resDecoded.segments.should.have.property('customsegmentkey');
                    resDecoded.segments.should.have.property('anotherkey');
                    resDecoded.segments.customsegmentkey.should.be.an.Array();
                    resDecoded.segments.customsegmentkey.should.containEql('custom&#46;segment&#46;value');
                    resDecoded.segments.anotherkey.should.be.an.Array();
                    resDecoded.segments.anotherkey.should.containEql('another&#46;value&#46;with&#46;dots');
                    done();
                });
        });

        it('should verify view data in 30days period', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var resDecoded = JSON.parse(res.text);
                    resDecoded.should.have.property('iTotalRecords', 3);
                    var foundView = false;
                    for (var i = 0; i < resDecoded.aaData.length; i++) {
                        if (resDecoded.aaData[i].view === 'complex.view.name') {
                            foundView = true;
                            resDecoded.aaData[i].should.have.property('u', 1);
                            resDecoded.aaData[i].should.have.property('t', 1);
                            resDecoded.aaData[i].should.have.property('s', 1);
                            break;
                        }
                    }
                    foundView.should.be.true();
                    done();
                });
        });
    });

    describe('Test same user with multiple views containing dots', function() {
        it('should record first view with dots', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "page.one",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_5' + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });

        it('should record second view with dots for same user', function(done) {
            var data = JSON.stringify([{
                "key": "[CLY]_view",
                "count": 1,
                "segmentation": {
                    "name": "page.two",
                    "visit": 1,
                    "start": 1
                }
            }]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=user_dots_5' + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor + waitTime);
                });
        });
    });

    describe('Cleanup', function() {
        it('should reset app data', function(done) {
            var params = {app_id: APP_ID, "period": "reset"};
            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });

        it('should trigger deletion job', function(done) {
            testUtils.triggerJobToRun("api:mutationManagerJob", function() {
                setTimeout(done, 500 * testUtils.testScalingFactor);
            });
        });

        it('should verify empty views table after reset', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });
        });
    });
});
