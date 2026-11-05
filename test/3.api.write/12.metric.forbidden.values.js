/**
 * Metric values become field names in the aggregated documents, so a value naming an
 * Object.prototype member (__proto__, constructor, prototype) is not recorded at ingestion,
 * while ordinary values sent alongside it still are.
 *
 * A dedicated app is created and deleted at the end.
 */
var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_KEY = "";
var APP_ID = "";

describe('Metric values naming Object.prototype members', function() {
    before(function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({name: "Test App Metric Values"}))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                APP_ID = ob._id;
                APP_KEY = ob.key;
                done();
            });
    });

    after(function(done) {
        request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID}))
            .expect(200)
            .end(done);
    });

    ["__proto__", "constructor", "prototype"].forEach(function(value, index) {
        it('should not record ' + value + ' as a metric value', function(done) {
            var device = "metric_forbidden_" + index;
            var metrics = {"_os": value, "_device": "Device" + index};
            request
                .get('/i?device_id=' + device + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + encodeURIComponent(JSON.stringify(metrics)))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(function() {
                        testUtils.db.collection('app_users' + APP_ID).findOne({did: device}, function(e, user) {
                            if (e) {
                                return done(e);
                            }
                            should.exist(user);
                            should(user.p).be.undefined();
                            user.should.have.property('d', 'Device' + index);
                            testUtils.db.collection('device_details').find({_id: {$regex: '^' + APP_ID + '_'}}).toArray(function(e2, docs) {
                                if (e2) {
                                    return done(e2);
                                }
                                docs.forEach(function(doc) {
                                    var os = (doc.meta_v2 && doc.meta_v2.os) || {};
                                    Object.prototype.hasOwnProperty.call(os, value).should.be.false();
                                });
                                done();
                            });
                        });
                    }, 1000 * testUtils.testScalingFactor);
                });
        });
    });
});
