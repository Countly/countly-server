var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "views_weekly_unique_user";
var VIEW_NAME = "viewsWeeklyUniqueTest";
var db;

// Anchor both views to Wednesday 12:00 UTC of the PREVIOUS ISO week: safely in the
// past, and far enough from the Monday week boundary that both events land in the
// same ISO week for any reasonable app timezone (avoids boundary/timezone flakiness).
var anchor = moment.utc().subtract(1, 'week').startOf('isoWeek').add(2, 'days').add(12, 'hours').valueOf();
var t1 = Math.floor(anchor / 1000);
var t2 = Math.floor((anchor + 3 * 60 * 60 * 1000) / 1000); // +3h, same Wednesday / same ISO week

var viewEvent = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": VIEW_NAME, "visit": 1, "start": 1, "platform": "Android"}}]);

describe('Testing views weekly-unique counting', function() {
    describe('Same user viewing the same view in two sessions within one ISO week', function() {
        it('init', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            db = testUtils.client.db("countly");
            done();
        });

        it('records the first session view', function(done) {
            request
                .get('/i?begin_session=1&app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&timestamp=' + t1 + '&events=' + viewEvent)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                });
        });

        it('ends the first session', function(done) {
            request
                .get('/i?end_session=1&app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&timestamp=' + (t1 + 3))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });

        it('records the second session view in the same week', function(done) {
            request
                .get('/i?begin_session=1&app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&timestamp=' + t2 + '&events=' + viewEvent)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                });
        });

        it('ends the second session', function(done) {
            request
                .get('/i?end_session=1&app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&timestamp=' + (t2 + 3))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                });
        });

        it('counts the view exactly once per week (one device viewed it)', function(done) {
            db.collection("app_viewsmeta" + APP_ID).findOne({"view": VIEW_NAME}, function(err, viewMeta) {
                if (err) {
                    return done(err);
                }
                should.exist(viewMeta);
                var viewIdStr = "" + viewMeta._id;
                // no-segment view-data collection holds the per-year ("<viewId>_<year>:0")
                // rollup docs where weekly unique lives under d.w<isoWeek>.u
                var colName = "app_viewdata" + crypto.createHash('sha1').update("" + APP_ID).digest('hex');
                db.collection(colName).find({"_id": {"$regex": "^" + viewIdStr + "_"}}).toArray(function(err2, docs) {
                    if (err2) {
                        return done(err2);
                    }
                    docs.should.not.be.empty();
                    // Only DEVICE_ID viewed VIEW_NAME, so every weekly-unique bucket must be 1.
                    var offending = [];
                    var weeklyBucketsChecked = 0;
                    docs.forEach(function(doc) {
                        if (doc.d) {
                            for (var key in doc.d) {
                                if (/^w[0-9]+$/.test(key) && doc.d[key] && typeof doc.d[key].u !== "undefined") {
                                    weeklyBucketsChecked++;
                                    if (doc.d[key].u !== 1) {
                                        offending.push(doc._id + "." + key + ".u=" + doc.d[key].u);
                                    }
                                }
                            }
                        }
                    });
                    // Guard against a vacuous pass: a weekly-unique bucket must actually
                    // have been written and inspected, otherwise an empty offending list
                    // would "pass" even if weekly data stopped being recorded entirely.
                    weeklyBucketsChecked.should.be.above(0);
                    offending.should.eql([]);
                    done();
                });
            });
        });
    });
});
