var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);
var APP_KEY = "97a960c558df5f4862fd7dab90c2d50fcd6591cd";
var API_KEY_ADMIN = "bbce41a84428710402650b10137bea20";
var APP_ID = "5c3c55e5cf50054aa7fd167b";
var DEVICE_ID = "1234567890";

var records = [];

function compareObjects(ob, correct) {
    if (!ob || !correct) {
        return false;
    }

    for (var c in correct) {
        if (typeof ob[c] == 'undefined') {
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
    return true;

}
function validateRecords() {

    it('check current log', function(done) {
        // systemlogs are written via a fire-and-forget async insert
        // (recordAction -> db.collection('systemlogs').insert(log, function(){}))
        // and the /i/systemlogs response returns before that insert lands, so
        // a single read after a fixed wait races the write and intermittently
        // sees fewer records than expected on loaded CI. Poll until the read is
        // consistent (throw to retry) instead of asserting once.
        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=systemlogs&query={"a":"change_fake_plugin"}')
            .expect(200)
            .end(function(err, res) {
                testUtils.validateEventually(err, res, done, function(currentRes) {
                    var resDecoded = JSON.parse(currentRes.text);
                    var data = resDecoded['aaData'];
                    for (var i = data.length - 1; i >= 0; i--) {
                        if (data[i] && data[i]["i"]["app_id"] != APP_ID) {
                            data.splice(i, 1);
                        }
                    }
                    if (data.length != records.length) {
                        throw new Error("Have " + data.length + " need " + records.length);
                    }
                    for (var k = 0; k < records.length; k++) {
                        var found = false;
                        for (var z = 0; z < data.length && found == false; z++) {
                            if (compareObjects(data[z]["i"], records[k]["i"])) {
                                found = true;
                                data.splice(z, 1);
                                break;
                            }
                        }
                        if (found == false) {
                            throw new Error(JSON.stringify(records[k]) + " not found, listed: " + JSON.stringify(data));
                        }
                    }
                });
            });
    });
}


describe('Testing systemlogs plugin', function() {
    describe('Simple update', function() {
        it('check current log', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=systemlogs')
                .expect(200)
                .end(function(err, res) {
                    done();
                });
        });

        it('add fake record', function(done) {
            records.push({"a": "change_fake_plugin", "i": {"app_id": APP_ID, before: {"key0": "value0"}, update: {"key0": "value1"}, after: {"key0": "value1"}}});
            var data = {"app_id": APP_ID, before: {"key0": "value0"}, update: {"key0": "value1"}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        validateRecords();


        it('add custom record', function(done) {
            records.push({"a": "change_fake_plugin", "i": {"app_id": APP_ID, before: {}, update: {"key0": "value1", "key1": {"valz": "valt"}}, after: {"key1": {"valz": "valt"}}}});
            var data = {"app_id": APP_ID, before: {"key0": "value1"}, update: {"key0": "value1", "key1": {"valz": "valt"}}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        validateRecords();

        it('add to empty record', function(done) {
            records.push({"a": "change_fake_plugin", "i": {"app_id": APP_ID, before: {}, update: {"key0": "value1", "key1": {"valz": "valt"}}, after: {"key0": "value1", "key1": {"valz": "valt"}}}});
            var data = {"app_id": APP_ID, before: {}, update: {"key0": "value1", "key1": {"valz": "valt"}}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });


        it('changes in subobject', function(done) {
            records.push({"a": "change_fake_plugin", "i": {"app_id": APP_ID, before: {"key1": {"valz": "valt"}}, update: {"key0": "value1", "key1": {"valz": "valt2"}}, after: {"key1": {"valz": "valt2"}}}});
            var data = {"app_id": APP_ID, before: {"key0": "value1", "key1": {"valz": "valt"}}, update: {"key0": "value1", "key1": {"valz": "valt2"}}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('changes with array', function(done) {
            records.push({"a": "change_fake_plugin", "i": {"app_id": APP_ID, before: {"key1": ["1", "2", "3"]}, update: {"key1": ["1", "2", "3", "4"]}, after: {"key1": ["1", "2", "3", "4"]}}});
            var data = {"app_id": APP_ID, before: {"key1": ["1", "2", "3"]}, update: {"key1": ["1", "2", "3", "4"]}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        validateRecords();

        it('calling empty changes', function(done) {
            var data = {"app_id": APP_ID, before: {"key1": ["1", "2", "3"]}, update: {"key1": ["1", "2", "3"]}};
            request
                .get('/i/systemlogs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&action=change_fake_plugin&data=' + JSON.stringify(data))
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        validateRecords();

    });
});