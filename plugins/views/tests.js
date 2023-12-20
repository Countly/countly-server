var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);
var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var crypto = require('crypto');
//var DEVICE_ID = "1234567890";

//add data
//test if added
//ask for getTable
//recalculate
var myTime = Date.now();
var start = new Date(new Date().getFullYear(), 0, 0);
var startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

var tableResponse = {};
var userObject = {};
var viewsListed = [];

var graphResponse = {};
var db;

tableResponse.hour = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse.yesterday = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse["30days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse["7days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse.month = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]}; //this year


graphResponse.hour = {};
graphResponse.yesterday = {};
graphResponse["30days"] = {};

var days_this_year;
var days_this_month;

function pushValues(period, index, map) {
    for (var key in map) {
        if (!tableResponse[period].aaData[index]) {
            tableResponse[period].aaData[index] = {"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0};
        }
        if (!tableResponse[period].aaData[index][key]) {
            tableResponse[period].aaData[index][key] = 0;
        }

        if (key === 'view') {
            tableResponse[period].aaData[index][key] = map[key];
        }
        else {
            tableResponse[period].aaData[index][key] += map[key];
        }
    }
    if (tableResponse[period].aaData[index]["t"] > 0) {
        tableResponse[period].aaData[index]['d-calc'] = tableResponse[period].aaData[index]["d"] / tableResponse[period].aaData[index]["t"];
        tableResponse[period].aaData[index]['scr-calc'] = tableResponse[period].aaData[index]["scr"] / tableResponse[period].aaData[index]["t"];
    }
}

function merge_into(oldKey, newKey) {
    for (var key in userObject[oldKey]) {
        if (key != '_id') {
            if (typeof userObject[newKey][key] === 'undefined') {
                userObject[newKey][key] = userObject[oldKey][key];
            }
            else {
                if (userObject[newKey][key]["ts"] && userObject[oldKey][key]["ts"] && parseInt(userObject[newKey][key]["ts"], 10) < parseInt(userObject[oldKey][key]["ts"], 10)) {
                    userObject[newKey][key] = userObject[oldKey][key];
                }
            }
        }
    }

    delete userObject[oldKey];
    return true;
}

function verifyMetrics(err, ob, done, correct) {
    if (!ob) {
        return false;
    }
    for (var c in correct) {
        if (ob[c] == null) {
            ob[c] = 0;
        }
        if (c == 'uvalue') { //because calculated value might be a bit different based on which side of month you are in.
            if (ob[c] != correct[c] && ob[c] - 1 != correct[c] && ob[c] + 1 != correct[c]) {
                return false;
            }
        }
        else if (ob[c] != correct[c]) {
            console.log("key:" + c);
            console.log(correct[c] + " " + ob[c]);
            return false;
        }
    }
    return true;
}

function compareObjects(ob, correct) {
    if (!ob || !correct) {
        console.log("not exists");
        return false;
    }

    for (var c in correct) {
        if (c != '_id') {
            if (typeof ob[c] == 'undefined') {
                console.log(c + " undefined" + "");
                return false;
            }
            if (typeof correct[c] === 'object') {
                var zz = compareObjects(ob[c], correct[c]);
                if (zz === false) {
                    return false;
                }
            }
            else if (ob[c] != correct[c]) {
                console.log(c + " " + ob[c] + " " + correct[c]);
                return false;
            }
        }
    }
    return true;
}


function verifySegments(values) {
    it('checking segments', function(done) {
        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_view_segments')
            .expect(200)
            .end(function(err, res) {
                var resDecoded = JSON.parse(res.text);
                for (var z in values) {
                    if (z != 'testSegment') {
                        if (resDecoded[z]) {
                            if (values[z].length != resDecoded[z].length) {
                                done("Invalid segment count for: " + z);
                                return;
                            }
                            else {
                                for (var p = 0; p < values[z].length; p++) {
                                    if (resDecoded[z].indexOf(values[z][p]) == -1) {
                                        done("Segment value missing " + z + ":" + values[z][p]);
                                        return;
                                    }
                                }
                            }
                        }
                        else {
                            done("Segment key missing: " + z);
                            return;
                        }
                    }
                }
                for (var z in resDecoded) {
                    if (!values[z]) {
                        done("Invalid segment key: " + z);
                        return;
                    }
                }

                done();
            });
    });

}

function verifyTotals(period, order, orderString) {
    it('checking result(' + period + ')', function(done) {
        orderString = orderString || "&iSortCol_0=0&sSortDir_0=asc";
        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable' + orderString + '&period=' + period)
            .expect(200)
            .end(function(err, res) {
                var resDecoded = JSON.parse(res.text);
                resDecoded.iTotalRecords.should.eql(tableResponse[period].iTotalRecords);
                resDecoded.iTotalDisplayRecords.should.eql(tableResponse[period].iTotalDisplayRecords);
                if (resDecoded.aaData.length > 0 && tableResponse[period].aaData.length > 0) {
                    /*if (!tableResponse[period].aaData[tableResponse[period].aaData.length - 1]._id && tableResponse[period].aaData[tableResponse[period].aaData.length - 1].view == resDecoded.aaData[tableResponse[period].aaData.length - 1].view) {
                        viewsListed.push({"view": resDecoded.aaData[tableResponse[period].aaData.length - 1]._id, "action": ""});
                        tableResponse[period].aaData[tableResponse[period].aaData.length - 1]._id = resDecoded.aaData[tableResponse[period].aaData.length - 1]._id;
                        tableResponse[period].aaData[tableResponse[period].aaData.length - 1].view = resDecoded.aaData[tableResponse[period].aaData.length - 1].view;
                    }*/
                    resDecoded.aaData = resDecoded.aaData.sort(function(a, b) {
                        if (a.view < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    });
                    for (var i = 0; i < resDecoded.aaData.length; i++) {
                        if (order) {
                            if (!tableResponse[period].aaData[order[i]]._id) {
                                tableResponse[period].aaData[order[i]]._id = resDecoded.aaData[i]._id;
                            }
                            if (verifyMetrics(err, resDecoded.aaData[order[i]], done, tableResponse[period].aaData[i]) == false) {
                                console.log(JSON.stringify(order));
                                console.log("GOT: " + JSON.stringify(resDecoded.aaData));
                                console.log("NEED:" + JSON.stringify(tableResponse[period].aaData));
                                return done("wrong values");
                            }
                        }
                        else {
                            if (!tableResponse[period].aaData[i]._id) {
                                tableResponse[period].aaData[i]._id = resDecoded.aaData[i]._id;
                            }
                            if (verifyMetrics(err, resDecoded.aaData[i], done, tableResponse[period].aaData[i]) == false) {
                                console.log("GOT: " + JSON.stringify(resDecoded.aaData));
                                console.log("NEED:" + JSON.stringify(tableResponse[period].aaData));
                                return done("wrong values");
                            }
                        }
                    }
                    done();

                }
                else {
                    done();
                }
            });
    });

    /*  it('checking graph('+period+')',function(done) {
        var viewsList = JSON.stringify(viewsListed);
        
        console.log('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=views&action=&period='+period+'&selectedViews='+viewsList);
        request
            .get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=views&action=&period='+period+'&selectedViews='+viewsList)
            .expect(200)
            .end(function(err, res){
                var resDecoded = JSON.parse(res.text);
                console.log(resDecoded);
                done();
            });
    });*/
}
//chose testDay(yesterday)
describe('Testing views plugin', function() {
    describe('verify empty views tables', function() {
        it('should have 0 views', function(done) {
            days_this_year = Math.floor((myTime - start) / (1000 * 24 * 60 * 60));
            days_this_month = Math.floor((myTime - startMonth) / (1000 * 24 * 60 * 60));
            console.log("days gone in this month:" + days_this_month);
            console.log("days gone in this year:" + days_this_year);
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            db = testUtils.client.db("countly");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });
        });
    });

    describe('Check adding views', function() {
        it('adding view in previous year', function(done) {
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user00" + '&timestamp=' + (myTime - (365 * 24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('adding view(25 days ago)', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1, "view": "testview0"});

            if (days_this_year > 25) {
                tableResponse.month.iTotalRecords += 1;
                tableResponse.month.iTotalDisplayRecords += 1;
                pushValues("month", 0, {"t": 1, "s": 1, "uvalue": 1, "u": 1, "n": 1, "view": "testview0"});
            }
            /* else {
                tableResponse.month.iTotalRecords = 0;
                tableResponse.month.iTotalDisplayRecords = 0; //add count anyway because we have also "0" in list
            }*/
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - (25 * 24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe('verifying totals after last update', function() {
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Check adding view(yesterday)', function() {
        it('adding view', function(done) {
            tableResponse.yesterday.iTotalRecords += 1;
            tableResponse.yesterday.iTotalDisplayRecords += 1;
            pushValues("yesterday", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "view": "testview0"});
            if (days_this_month < 2) {
                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1});
            }
            else {
                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});
            }

            tableResponse["7days"].iTotalRecords += 1;
            tableResponse["7days"].iTotalDisplayRecords += 1;
            pushValues("7days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "view": "testview0"});

            if (days_this_year > 1) {
                tableResponse.month.iTotalRecords = 1;
                tableResponse.month.iTotalDisplayRecords = 1;
                pushValues("month", 0, {"t": 1, "s": 1});
                //tableResponse["month"]['aaData'][0]['n']=1;
                tableResponse.month.aaData[0].uvalue = 1;
            }

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
        verifyTotals("7days");
    });

    describe('check adding view(right now)', function() {
        it('adding view', function(done) {
            tableResponse.hour.iTotalRecords += 1;
            tableResponse.hour.iTotalDisplayRecords += 1;
            pushValues("hour", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});

            if (days_this_month > 1) {
                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1});
            }
            else {
                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});
            }

            tableResponse.month.iTotalRecords = 1;
            tableResponse.month.iTotalDisplayRecords = 1;
            pushValues("month", 0, {"t": 1, "s": 1});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 10) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Same user different view', function() {
        it('adding view', function(done) {
            tableResponse.hour.iTotalRecords += 1;
            tableResponse.hour.iTotalDisplayRecords += 1;
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;

            pushValues("hour", 1, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1, "view": "testview1"});
            pushValues("30days", 1, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1, "view": "testview1"});

            tableResponse.month.iTotalRecords = 2;
            tableResponse.month.iTotalDisplayRecords = 2;
            pushValues("month", 1, {"t": 1, "s": 1, "uvalue": 1, "u": 1, "n": 1, "view": "testview1"});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview1", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Adding some scrolling', function() {
        it('adding 2 days ago(calling with visit, shouldnt record visit)', function(done) {

            pushValues("30days", 0, { "s": 1, "scr": 60, "scr-calc": 20});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600, "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 26 * 60 * 60 * 1000 * 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });
        it('adding 2 days ago(without visit)', function(done) {

            pushValues("30days", 0, {"scr": 60, "scr-calc": 10});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 24 * 60 * 60 * 1000 * 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        it('adding 1 day ago', function(done) {
            pushValues("30days", 0, { "scr": 60, "scr-calc": 6});
            pushValues("yesterday", 0, { "scr": 60, "scr-calc": 30});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 24 * 60 * 60 * 1000) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
    });
    describe('Adding some segments', function() {
        it('Adding platform(as segment)', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 2, {"uvalue": 1, "u": 1, "n": 1, "t": 1, "s": 1, "view": "testview2"});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview2", "segment": "Android", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime + 1) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });

        it('Adding platform(as platform)', function(done) {
            pushValues("30days", 2, {"t": 1, "s": 1});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview2", "platform": "IOS", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime + 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });
        verifyTotals("30days");
        verifySegments({"segments": { "platform": ["Android", "IOS"] }, "domains": []});
    });

    var dataSegments = [];
    var limit = 20;
    var myList = {"segments": { "platform": ["Android", "IOS"] }, "domains": [], "testSegment": []};

    describe('checking limit for segment values', function() {
        it('Adding a lot of segment values', function(done) {

            for (var i = 0; i < 20; i++) {
                dataSegments.push({"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue" + i + "", "visit": 1, "start": 1}});
                if (i < 10) {
                    myList.testSegment.push("testValue" + i + "");
                }
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify(dataSegments))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifySegments(myList);
    });

    describe('Adding segment key with dot in middle', function() {
        it('Adding segment', function(done) {
            dataSegments = [{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "test.My.Segment": "testValue", "visit": 1, "start": 1}}];
            myList.segments["testMySegment"] = ["testValue"];

            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify(dataSegments))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifySegments(myList);
    });

    describe('verifying segment key limit', function() {
        it('Adding 97 segments', function(done) {
            var ss = {"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue0", "visit": 1, "start": 1}};
            for (var i = 0; i < 97; i++) { //testview0 and platform already used. 98 spots left
                ss.segmentation["tS" + i] = "tV0";
                myList.segments["tS" + i] = ["tV0"];
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify([ss]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('trying to add More', function(done) {
            var ss = {"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue0", "visit": 1, "start": 1}};
            for (var i = 0; i < 20; i++) {
                ss.segmentation["tSa" + i] = "tV0";
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify([ss]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifySegments(myList);
    });
    describe('checking deleting view', function() {
        it('deleting testview0', function(done) {
            var iid = tableResponse['30days'].aaData[0]._id;
            tableResponse["30days"].iTotalRecords -= 1;
            tableResponse["30days"].iTotalDisplayRecords -= 1;
            tableResponse["30days"].aaData.splice(0, 1);
            request
                .get('/i/views?method=delete_view&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + '&view_id=' + iid)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifyTotals("30days");
    });

    describe('Validating user merging', function() {
        it('getting Info about users', function(done) {

            testUtils.db.collection("app_userviews" + APP_ID).aggregate([{$lookup: {from: "app_users" + APP_ID, localField: "_id", foreignField: "uid", as: "userinfo"}}], function(err, res) {
                for (var k = 0; k < res.length; k++) {
                    if (res[k].userinfo && res[k].userinfo[0]) {
                        userObject[res[k].userinfo[0].did] = res[k];
                        delete res[k].userinfo;
                    }
                }
                done();

            });
        });

        it('merging two users', function(done) {
            merge_into('user0', 'user00');
            request
                .get('/i?device_id=user00&old_device_id=user0&app_key=' + APP_KEY)
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
            testUtils.db.collection("app_userviews" + APP_ID).aggregate([{$lookup: {from: "app_users" + APP_ID, localField: "_id", foreignField: "uid", as: "userinfo"}}], function(err, res) {
                var userObject2 = {};
                for (var k = 0; k < res.length; k++) {
                    if (res[k].userinfo && res[k].userinfo[0]) {
                        userObject2[res[k].userinfo[0].did] = res[k];
                        delete res[k].userinfo;
                    }
                }
                if (compareObjects(userObject2, userObject)) {
                    done();

                }
                else {
                    done("Invalid merging users ");
                }
            });
        });

        it('merging two users', function(done) {
            merge_into('user1', 'user00');
            request
                .get('/i?device_id=user00&old_device_id=user1&app_key=' + APP_KEY)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 3000 * testUtils.testScalingFactor);
                });

        });

        it('validating result', function(done) {
            testUtils.db.collection("app_userviews" + APP_ID).aggregate([{$lookup: {from: "app_users" + APP_ID, localField: "_id", foreignField: "uid", as: "userinfo"}}], function(err, res) {
                var userObject2 = {};
                for (var k = 0; k < res.length; k++) {
                    if (res[k].userinfo && res[k].userinfo[0]) {
                        userObject2[res[k].userinfo[0].did] = res[k];
                        delete res[k].userinfo;
                    }
                }
                if (compareObjects(userObject2, userObject)) {
                    done();

                }
                else {
                    done("Invalid merging users ");
                }
            });
        });

        it('merging info new user', function(done) {
            userObject['userNew'] = userObject['user00'];
            delete userObject['user00'];
            request
                .get('/i?device_id=userNew&old_device_id=user00&app_key=' + APP_KEY)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 3000 * testUtils.testScalingFactor);
                });

        });

        it('validating result', function(done) {
            testUtils.db.collection("app_userviews" + APP_ID).aggregate([{$lookup: {from: "app_users" + APP_ID, localField: "_id", foreignField: "uid", as: "userinfo"}}], function(err, res) {
                var userObject2 = {};
                for (var k = 0; k < res.length; k++) {
                    if (res[k].userinfo && res[k].userinfo[0]) {
                        userObject2[res[k].userinfo[0].did] = res[k];
                        delete res[k].userinfo;
                    }
                }
                if (Object.keys(userObject2).length === 0) {
                    console.log('refetching');
                    //try refetching in few seconds
                    setTimeout(function() {
                        testUtils.db.collection("app_userviews" + APP_ID).aggregate([{$lookup: {from: "app_users" + APP_ID, localField: "_id", foreignField: "uid", as: "userinfo"}}], function(err, res) {
                            var userObject2 = {};
                            for (var k = 0; k < res.length; k++) {
                                if (res[k].userinfo && res[k].userinfo[0]) {
                                    userObject2[res[k].userinfo[0].did] = res[k];
                                    delete res[k].userinfo;
                                }
                            }
                            if (compareObjects(userObject2, userObject)) {
                                done();

                            }
                            else {
                                console.log(JSON.stringify(res));
                                console.log(JSON.stringify(userObject2));
                                console.log(JSON.stringify(userObject));
                                done("Invalid merging users ");
                            }
                        });
                    }, 20000);

                }
                else {
                    if (compareObjects(userObject2, userObject)) {
                        done();

                    }
                    else {
                        console.log(JSON.stringify(userObject2));
                        console.log(JSON.stringify(userObject));
                        done("Invalid merging users ");
                    }
                }
            });
        });
    });

    describe('test adding other meta information', function() {

        it('Adding view url', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 2, {"uvalue": 1, "u": 1, "t": 1, "s": 1, "n": 1});
            tableResponse['30days'].aaData[2]["url"] = "/mypage.html";
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview9Me", "visit": 1, "start": 1, "view": "/mypage.html"}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 10) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('checking if view url added', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&iSortCol_0=0&sSortDir_0=asc&period=30days')
                .expect(200)
                .end(function(err, res) {
                    var resDecoded = JSON.parse(res.text);
                    var isSet = false;
                    for (var k = 0; k < resDecoded.aaData.length; k++) {
                        if (resDecoded.aaData[k].view == 'testview9Me') {
                            if (resDecoded.aaData[k].url == '/mypage.html') {
                                done();
                                isSet = true;
                            }
                        }
                    }
                    if (isSet == false) {
                        done('URL not set');
                    }
                });
        });

        verifyTotals("30days");
        it('Adding view domain', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 3, {"uvalue": 1, "u": 1, "t": 1, "s": 1, "n": 1});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview9Ze", "visit": 1, "start": 1, "domain": "www.kakis.lv"}}]);

            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 10) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('checking if view domain was added', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&iSortCol_0=0&sSortDir_0=asc&period=30days')
                .expect(200)
                .end(function(err, res) {
                    var resDecoded = JSON.parse(res.text);
                    var isSet = false;
                    for (var k = 0; k < resDecoded.aaData.length; k++) {
                        if (resDecoded.aaData[k].view == 'testview9Ze') {
                            if (resDecoded.aaData[k].domain[testUtils.db.encode("www.kakis.lv")] && resDecoded.aaData[k].domain[testUtils.db.encode("www.kakis.lv")] == true) {
                                done();
                                isSet = true;
                            }
                        }
                    }
                    if (isSet == false) {
                        done('Domain not set');
                    }
                });
        });

        it('adding Scrolling to be matched via url', function(done) {
            pushValues("30days", 2, {"scr": 50, "scr-calc": 50});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"view": "/mypage.html", "type": "scroll", "height": 1000, "y": 500}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 5) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifyTotals("30days");
    });

    describe('Having multiple cly view events in same request', function() {
        it('Adding view and duration in seperate events', function(done) {
            pushValues("30days", 3, {"uvalue": 1, "u": 1, "t": 1, "s": 1, "n": 1, "d": 100});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview9Ze", "visit": 1, "start": 1, "domain": "www.kakis.lv"}}, {"key": "[CLY]_view", "count": 1, "dur": 100, "segmentation": {"name": "testview9Ze"}}]);

            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user100" + '&timestamp=' + (myTime - 30) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifyTotals("30days");
    });


    describe('Having multiple cly view events in same request with different duration', function() {
        it('Adding view and duration in seperate events', function(done) {
            pushValues("30days", 3, {"uvalue": 1, "u": 1, "t": 1, "s": 1, "n": 1, "d": 600});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "dur": 500, "segmentation": {"name": "testview9Ze", "visit": 1, "start": 1, "domain": "www.kakis.lv"}}, {"key": "[CLY]_view", "count": 1, "dur": 100, "segmentation": {"name": "testview9Ze"}}]);

            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user102" + '&timestamp=' + (myTime - 30) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifyTotals("30days");
    });



    describe('reset app', function() {
        it('should reset data', function(done) {
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
    });

    describe('verify empty views tables', function() {
        it('should have 0 views', function(done) {
            tableResponse.hour = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
            tableResponse.yesterday = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
            tableResponse["30days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
            tableResponse["7days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
            tableResponse.month = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]}; //this year

            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });


    describe('Testing metric - uve', function() {
        describe('Check adding view(yesterday)+starting session', function() {
            it('adding view', function(done) {
                pushValues("yesterday", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});

                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "n": 1});

                pushValues("7days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});
                tableResponse["30days"].iTotalRecords += 1;
                tableResponse["30days"].iTotalDisplayRecords += 1;
                tableResponse["7days"].iTotalRecords += 1;
                tableResponse["7days"].iTotalDisplayRecords += 1;
                tableResponse["yesterday"].iTotalRecords += 1;
                tableResponse["yesterday"].iTotalDisplayRecords += 1;

                if (days_this_year > 1) {
                    pushValues("month", 0, {"t": 1, "s": 1, "n": 1, "u": 1, "uvalue": 1});
                    //tableResponse["month"]['aaData'][0]['n']=1;
                    tableResponse.month.iTotalRecords = 1;
                    tableResponse.month.iTotalDisplayRecords = 1;
                }

                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview00", "visit": 1, "start": 1}}]);
                request
                    .get('/i?begin_session=1&app_key=' + APP_KEY + '&device_id=' + "user9" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000)) + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });
        });

        describe('verifying totals after last update', function() {
            verifyTotals("yesterday");
            verifyTotals("30days");
            verifyTotals("month");
            verifyTotals("7days");
        });

        describe('Ending sesssion', function() {
            it('request', function(done) {
                pushValues("yesterday", 0, {"uvc": 1, "b": 1, "e": 1});
                pushValues("30days", 0, {"uvc": 1, "b": 1, "e": 1});
                pushValues("7days", 0, { "uvc": 1, "b": 1, "e": 1});

                if (days_this_year > 1) {
                    tableResponse.month.iTotalRecords = 1;
                    tableResponse.month.iTotalDisplayRecords = 1;
                    pushValues("month", 0, {"uvc": 1, "b": 1, "e": 1});
                    //tableResponse["month"]['aaData'][0]['n']=1;
                }

                request
                    .get('/i?end_session=1&app_key=' + APP_KEY + '&device_id=' + "user9" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000) + 1000))
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });
        });

        describe('verifying totals after last update', function() {
            verifyTotals("yesterday");
            verifyTotals("30days");
            verifyTotals("month");
            verifyTotals("7days");
        });

        describe('Check adding more data', function() {
            it('adding view+session', function(done) {
                pushValues("yesterday", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});
                pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "n": 1, "uvalue": 1});
                pushValues("7days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});

                if (days_this_year > 1) {
                    pushValues("month", 0, {"t": 1, "s": 1, "n": 1, "u": 1, "uvalue": 1});
                }

                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview00", "visit": 1, "start": 1}}]);
                request
                    .get('/i?begin_session=1&app_key=' + APP_KEY + '&device_id=' + "user10" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000)) + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });


            it('adding different view', function(done) {
                pushValues("yesterday", 1, {"u": 1, "t": 1, "uvalue": 1, "n": 1});
                pushValues("30days", 1, {"u": 1, "t": 1, "n": 1});
                pushValues("7days", 1, {"u": 1, "t": 1, "uvalue": 1, "n": 1});


                tableResponse["30days"].iTotalRecords += 1;
                tableResponse["30days"].iTotalDisplayRecords += 1;
                tableResponse["7days"].iTotalRecords += 1;
                tableResponse["7days"].iTotalDisplayRecords += 1;
                tableResponse["yesterday"].iTotalRecords += 1;
                tableResponse["yesterday"].iTotalDisplayRecords += 1;

                if (days_this_year > 1) {
                    pushValues("month", 1, {"t": 1, "n": 1, "u": 1, "uvalue": 1});
                    tableResponse["month"].iTotalRecords += 1;
                    tableResponse["month"].iTotalDisplayRecords += 1;
                }

                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview1", "visit": 1}}]);
                request
                    .get('/i?app_key=' + APP_KEY + '&device_id=' + "user10" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000) + 100) + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });


            it('going back to first one', function(done) {
                pushValues("yesterday", 0, { "t": 1});
                pushValues("30days", 0, {"t": 1});
                pushValues("7days", 0, { "t": 1});

                if (days_this_year > 1) {
                    pushValues("month", 0, {"t": 1});
                }

                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview00", "visit": 1}}]);
                request
                    .get('/i?app_key=' + APP_KEY + '&device_id=' + "user10" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000) + 150) + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });


            it('Again to second', function(done) {
                pushValues("yesterday", 1, { "t": 1});
                pushValues("30days", 1, {"t": 1});
                pushValues("7days", 1, { "t": 1});

                if (days_this_year > 1) {
                    pushValues("month", 1, {"t": 1});
                }

                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview1", "visit": 1}}]);
                request
                    .get('/i?app_key=' + APP_KEY + '&device_id=' + "user10" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000) + 200) + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });


            it('Ending session', function(done) {
                pushValues("yesterday", 1, {"uvc": 1, "e": 1});
                pushValues("30days", 1, {"uvc": 1, "e": 1});
                pushValues("7days", 1, { "uvc": 1, "e": 1});


                pushValues("yesterday", 0, {"uvc": 1});
                pushValues("30days", 0, {"uvc": 1});
                pushValues("7days", 0, { "uvc": 1});

                if (days_this_year > 1) {
                    pushValues("month", 1, {"uvc": 1, "e": 1});
                    pushValues("month", 0, {"uvc": 1});
                    //tableResponse["month"]['aaData'][0]['n']=1;
                }

                request
                    .get('/i?end_session=1&app_key=' + APP_KEY + '&device_id=' + "user10" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000) + 1000))
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });

        });

        describe('verifying totals after last update', function() {
            verifyTotals("yesterday");
            verifyTotals("30days");
            verifyTotals("month");
            verifyTotals("7days");
        });
    });

    describe('Adding views with UTM segments', function() {
        it('adding new view', function(done) {
            tableResponse.hour.iTotalRecords = 1;
            tableResponse.hour.iTotalDisplayRecords = 1;
            pushValues("hour", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1, "view": "testview3"});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview3", "visit": 1, "start": 1, "only_saved_param": "saved", "utm_source": "test_source", "utm_medium": "test_medium", "utm_campaign": "test_campaign", "utm_term": "test_term", "utm_content": "test_content", "referrer": "test_referrer"}}]);

            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        verifyTotals("hour");

        describe('Verify UTM segments are not recorded in views', function() {
            verifySegments({ "segments": { "only_saved_param": "saved" }, "domains": []});
        });
    });

    describe('Test omiting segments', function() {
        describe('sending data', function() {
            it('adding view with some custom segment', function(done) {
                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testOmit", "visit": 1, "start": 1, "omitMe": "someValue"}}]);
                request
                    .get('/i?app_key=' + APP_KEY + '&device_id=' + "userOmit" + '&timestamp=' + myTime + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });

            });
        });
        describe("verifying data", function() {
            verifySegments({"segments": {"omitMe": ["someValue"]}, "domains": []});
            it('checking database structures', function(done) {
                db.collection("views").findOne({"_id": db.ObjectID(APP_ID)}, function(err, res) {
                    if (err) {
                        done(err);
                    }
                    else {
                        //res.should.have.property("omit", ["omitMe"]);
                        //check if there is collection with any doc for this segmentation
                        var colName2 = "app_viewdata" + crypto.createHash('sha1').update("omitMe" + APP_ID).digest('hex');
                        db.collection(colName2).findOne({}, function(err, res) {
                            if (res) {
                                done();
                            }
                            else {
                                done("mising data in collection");
                            }
                        });
                    }

                });
            });
        });
        describe('testing omiting endpoint', function() {
            it('Testing omit endpoint without APP_ID', function(done) {
                request
                    .get('/i/views?method=omit_segments&api_key=' + API_KEY_ADMIN + "&omit_list=" + JSON.stringify(["omitMe"]))
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        else {
                            done();
                        }
                    });
            });
        });
        describe('testing valid omit request', function() {
            it('omiting segment', function(done) {
                request
                    .get('/i/views?method=omit_segments&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + "&omit_list=" + JSON.stringify(["omitMe"]))
                    .expect(200)
                    .end(function(err, res) {
                        console.log(err);
                        console.log(res.text);
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 500 * testUtils.testScalingFactor);
                    });
            });
        });

        describe("checking if structures are correct", function() {
            verifySegments({"segments": {}, "domains": []});
            it('checking database structures', function(done) {
                db.collection("views").findOne({"_id": db.ObjectID(APP_ID)}, function(err, res) {
                    if (err) {
                        done(err);
                    }
                    else {
                        res.should.have.property("omit", ["omitMe"]);
                        //check if there is collection with any doc for this segmentation
                        var colName2 = "app_viewdata" + crypto.createHash('sha1').update("omitMe" + APP_ID).digest('hex');
                        db.collection(colName2).findOne({}, function(err, res) {
                            if (res) {
                                done("data is still in collection. Although it should be cleared out.");
                            }
                            else {
                                done();
                            }
                        });
                    }

                });
            });
        });

        describe('test if incoming data is omited', function() {
            it('adding view with some custom segment', function(done) {
                var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testOmit", "visit": 1, "start": 1, "omitMe": "someValue"}}]);
                request
                    .get('/i?app_key=' + APP_KEY + '&device_id=' + "userOmit2" + '&timestamp=' + myTime + '&events=' + data)
                    .expect(200)
                    .end(function(err, res) {
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });

            });
        });
        describe("checking if structures are correct", function() {
            verifySegments({"segments": {}, "domains": []});
            it('checking database structures', function(done) {
                db.collection("views").findOne({"_id": db.ObjectID(APP_ID)}, function(err, res) {
                    if (err) {
                        done(err);
                    }
                    else {
                        res.should.have.property("omit", ["omitMe"]);
                        //check if there is collection with any doc for this segmentation
                        var colName2 = "app_viewdata" + crypto.createHash('sha1').update("omitMe" + APP_ID).digest('hex');
                        db.collection(colName2).findOne({}, function(err, res) {
                            if (res) {
                                done("data is in collection. Although it should be cleared out.");
                            }
                            else {
                                done();
                            }
                        });
                    }

                });
            });
        });

    });

    describe('reset app', function() {
        it('should reset data', function(done) {
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
    });

    describe('verify empty views tables', function() {
        it('should have 0 views', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&period=30days')
                .expect(200)
                .end(function(err, res) {
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });
        });
    });
});