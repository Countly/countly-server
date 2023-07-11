var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var plugins = require("../../plugins/pluginManager");
var dbdrill;
var crypto = require('crypto');
var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";


function generate_data(z) {
    it('Adding sgmented data(to get big list if possible) ' + (z + 1), function(done) {
        var params = [];
        for (var p = 0; p <= 21; p++) {
            var newobj = {"key": "t1", "count": 5, "timeStamp": (p + z * 21) * 1000, "segmentation": {"s": "v_" + z + "_" + p}};
            params.push(newobj);
        }

        request
            .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('result', 'Success');
                done();
            });
    });
}

describe('Testing event settings', function() {
    describe('setting test data', function() {
        it('create test events', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            dbdrill = testUtils.client.db("countly_drill");
            var params = [
                {"key": "test1", "count": 1},
                {"key": "test2", "count": 1, "sum": 5, "dur": 10}];
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
    });

    describe('setting new order', function() {
        it('setting order', function(done) {
            var event_order = ["test2", "test1"];
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&event_order=" + JSON.stringify(event_order))
                .expect(200)
                .end(function(err, res) {
                    console.log(err, res && res.text, APP_ID, API_KEY_ADMIN, event_order);
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("order", ["test2", "test1"]);
                    done();
                });
        });
    });

    describe('setting map values', function() {
        it('setting map', function(done) {
            var event_map = {"test2": {"name": "My Test name", "desc": "My desc"}};
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&event_map=" + JSON.stringify(event_map))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.map.should.have.property("test2", {"name": "My Test name", "desc": "My desc"});
                    done();
                });
        });
    });

    describe('adding to overview', function() {
        it('setting order', function(done) {
            var overview = [{"eventKey": "test2", "eventProperty": "count"}];
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&event_overview=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview", [
                        {
                            "eventKey": "test2",
                            "eventProperty": "count",
                            "order": 0,
                            "is_event_group": false,
                            "eventName": "test2",
                            "propertyName": "Count"
                        }
                    ]);
                    done();
                });
        });
    });

    describe('editing overview(with duplicate)', function() {
        it('setting order', function(done) {
            var overview = [{"eventKey": "test2", "eventProperty": "count"}, {"eventKey": "test1", "eventProperty": "count"}, {"eventKey": "test1", "eventProperty": "count"}];
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&event_overview=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview", [
                        {
                            "eventKey": "test2",
                            "eventProperty": "count",
                            "order": 0,
                            "is_event_group": false,
                            "eventName": "test2",
                            "propertyName": "Count"
                        },
                        {
                            "eventKey": "test1",
                            "eventProperty": "count",
                            "order": 1,
                            "is_event_group": false,
                            "eventName": "test1",
                            "propertyName": "Count"
                        }
                    ]);
                    done();

                });
        });
    });

    describe('hiding event', function() {
        it('setting test1 hidden', function(done) {

            request
                .get('/i/events/change_visibility?set_visibility=hide&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&events=" + JSON.stringify(["test1"]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview", [
                        {
                            "eventKey": "test2",
                            "eventProperty": "count",
                            "order": 0,
                            "is_event_group": false,
                            "eventName": "test2",
                            "propertyName": "Count"
                        }
                    ]);
                    ob.map.should.have.property("test2", {"name": "My Test name", "desc": "My desc"});
                    ob.map.should.have.property("test1", {"is_visible": false});
                    done();

                });
        });
    });

    describe('deleting event', function() {
        it('deleting test2', function(done) {

            request
                .get('/i/events/delete_events?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&events=" + JSON.stringify(["test2"]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("overview", []);
                    ob.should.have.property("map", {"test1": {"is_visible": false}});
                    ob.should.have.property("list", ["test1"]);
                    ob.should.have.property("order", ["test1"]);
                    ob.should.have.property("overview", []);
                    done();

                });
        });
    });

    describe('creating events with segments', function() {
        it('create test events', function(done) {
            var params = [ {"key": "test3", "count": 1, "sum": 5, "dur": 10, "segmentation": {"my_segment": "value", "my_segment2": "value"}}];

            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    done();
                });
        });

        for (var z = 0; z < 6; z++) {
            generate_data(z);
        }

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);

                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment", "my_segment2"], "t1": ["s"]});
                        done();
                    });
            }, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
        });


        it('checking for segmentation in  collections(test3)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("test3" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["my_segment", "my_segment2"]}}).toArray(function(err, res) {
                if (res.length > 0) {
                    done();
                }
                else {
                    done("missing segmentation documents");
                }
            });
        });


        it('checking for segmentation in  collections(t1)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("t1" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["s"]}}).toArray(function(err, res) {
                if (res.length > 0) {
                    done();
                }
                else {
                    done("missing segmentation documents");
                }
            });
        });


        /*if(plugins.isPluginEnabled('drill'))
        {
            it('check if biglist is created ', function(done){
                var event = crypto.createHash('sha1').update("t1" + APP_ID).digest('hex');
                dbdrill.collection("drill_meta" + APP_ID).findOne({_id:{$in:["meta_"+event+"_sg.s"]}},function(err,res) {
                    if(res)
                        done();
                    else
                        done("Big list not created");
                });
            });
        }*/
    });

    describe('omitting segments', function() {
        it('omitting my_segment for test3', function(done) {
            var overview = {"test3": ["my_segment"]};
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&omitted_segments=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('validating result', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.list.sort();
                    ob.should.have.property("overview", []);
                    ob.should.have.property("map", {"test1": {"is_visible": false}});
                    ob.should.have.property("list", ["t1", "test1", "test3"]);
                    ob.should.have.property("order", ["test1"]);
                    ob.should.have.property("overview", []);
                    ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": ["s"]});
                    ob.should.have.property("omitted_segments", {"test3": ["my_segment"]});
                    done();
                });
        });

        it('checking for segmentation in  collections(test3)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("test3" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["my_segment"]}}).toArray(function(err, res) {
                if (res.length == 0) {
                    done();
                }
                else {
                    done("segmentation document not deleted");
                }
            });
        });

        if (plugins.isPluginEnabled('drill')) {
            it('checking if drill db ', function(done) {
                var event = crypto.createHash('sha1').update("test3" + APP_ID).digest('hex');
                dbdrill.collection("drill_meta" + APP_ID).findOne({_id: "meta_" + event}, function(err, res) {
                    res.should.have.property("sg", {"my_segment": {"type": "s"}, "my_segment2": {"type": "l", "values": {"value": true}}});
                    done();
                });
            });
        }
    });

    describe('validate if omitting works', function() {
        it('create test events', function(done) {
            var params = [ {"key": "test3", "count": 1, "sum": 5, "dur": 10, "segmentation": {"my_segment": "value"}}];

            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    done();
                });
        });

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": ["s"]});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"]});
                        done();
                    });
            }, 0);
        });

        it('checking for segmentation in  collections(test3)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("test3" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["my_segment"]}}).toArray(function(err, res) {
                if (res.length == 0) {
                    done();
                }
                else {
                    done("segmentation document is created, it shouldn't be");
                }
            });
        });

    });

    describe('omitting another segment', function() {
        it('omitting s for t1', function(done) {
            var overview = {"t1": ["s"]};
            request
                .get('/i/events/edit_map?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&omitted_segments=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": []});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        done();
                    });
            }, 0);
        });

        it('checking for segmentation in  collections(t1)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("t1" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["s"]}}).toArray(function(err, res) {
                if (res.length == 0) {
                    done();
                }
                else {
                    done("segmentation document not deleted");
                }
            });
        });
        if (plugins.isPluginEnabled('drill')) {
            it('checking if drill db ', function(done) {
                var event = crypto.createHash('sha1').update("t1" + APP_ID).digest('hex');
                dbdrill.collection("drill_meta" + APP_ID).findOne({_id: "meta_" + event}, function(err, res) {
                    res.should.have.property("sg", {"s": {"type": "s"}});
                    done();
                });
            });

            it('check if biglist removed ', function(done) {
                var event = crypto.createHash('sha1').update("t1" + APP_ID).digest('hex');
                dbdrill.collection("drill_meta" + APP_ID).findOne({_id: {$in: ["meta_" + event + "_sg.s"]}}, function(err, res) {
                    if (!res) {
                        done();
                    }
                    else {
                        done("Big list not removed");
                    }
                });
            });
        }
    });


    describe('whitelisting segment ', function() {
        it('whitelist_segments for t5', function(done) {
            var overview = {"t5": ["s", "s1", "s2"]};
            request
                .get('/i/events/whitelist_segments?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&whitelisted_segments=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": []});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        ob.should.have.property("whitelisted_segments", { "t5": ["s", "s1", "s2"]});
                        done();
                    });
            }, 0);
        });


    });

    describe('whitelisting segment ', function() {
        it('whitelist_segments for t5', function(done) {
            var overview = {"t5": ["s", "s1", "s2"]};

            console.log('/i/events/whitelist_segments?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&whitelisted_segments=" + JSON.stringify(overview));
            request
                .get('/i/events/whitelist_segments?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + '&whitelisted_segments=' + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": []});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        ob.should.have.property("whitelisted_segments", { "t5": ["s", "s1", "s2"]});
                        done();
                    });
            }, 0);
        });


    });


    describe('validate if whitelisting works', function() {
        it('create test events', function(done) {
            var params = [ {"key": "t5", "count": 1, "sum": 5, "dur": 10, "segmentation": {"bad_segment": "value", "s": "good_value"}}];

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

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": [], "t5": ["s"]});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        ob.should.have.property("whitelisted_segments", { "t5": ["s", "s1", "s2"]});
                        done();
                    });
            }, 0);
        });

        it('checking for segmentation in  collections(t5)', function(done) {
            var collectionNameWoPrefix = crypto.createHash('sha1').update("t5" + APP_ID).digest('hex');
            testUtils.db.collection("events" + collectionNameWoPrefix).find({"s": {$in: ["bad_segment"]}}).toArray(function(err, res) {
                if (res.length == 0) {
                    done();
                }
                else {
                    done("segmentation document is created, it shouldn't be");
                }
            });
        });

    });


    describe('remove whitelisting ', function() {
        it('whitelist_segments for t5', function(done) {
            var overview = {"t5": []};
            request
                .get('/i/events/whitelist_segments?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&whitelisted_segments=" + JSON.stringify(overview))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("list", ["t1", "t5", "test1", "test3"]);
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": [], "t5": ["s"]});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        ob.should.have.property("whitelisted_segments", {});
                        setTimeout(done, 10 * testUtils.testScalingFactor);
                    });
            }, 0);
        });
    });

    describe('validate if whitelisting not broken now', function() {
        it('create test events', function(done) {
            var params = [ {"key": "t5", "count": 1, "sum": 5, "dur": 10, "segmentation": {"bad_segment": "value", "s": "good_value"}}];

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

        it('validating result', function(done) {
            setTimeout(function() {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.list.sort();
                        ob.should.have.property("overview", []);
                        ob.should.have.property("map", {"test1": {"is_visible": false}});
                        ob.should.have.property("order", ["test1"]);
                        ob.should.have.property("overview", []);
                        ob.should.have.property("segments", {"test3": ["my_segment2"], "t1": [], "t5": ["s", "bad_segment"]});
                        ob.should.have.property("omitted_segments", {"test3": ["my_segment"], "t1": ["s"]});
                        ob.should.have.property("whitelisted_segments", {});
                        done();
                    });
            }, 0);
        });

    });

    describe('cleanup', function() {
        it('should reset app', function(done) {
            var params = {"app_id": APP_ID, "period": "reset"};
            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 2000 * testUtils.testScalingFactor);
                });
        });
        it('check if data reseted', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    res.text.should.be.exactly('{"limits":{"event_limit":500,"event_segmentation_limit":100,"event_segmentation_value_limit":1000}}');
                    done();
                });
        });
    });
});
