var request = require('supertest');
var should = require('should');
var testUtils = require("../../../test/testUtils");
var common = require('../../../api/utils/common.js');
var piiAlertModule = require('../api/alertModules/pii.js');

request = request(testUtils.url);

// Shared state
var APP_ID = "";
var APP_KEY = "";
var API_KEY_ADMIN = "";
var createdPiiRuleId = "";
var createdAlertIds = [];

var DEVICE_ID = "pii-e2e-test-device";

// PII alert configs
var eventTriggeredAlert = {
    "alertName": "PII E2E Event Alert",
    "alertDataType": "pii",
    "alertDataSubType": "new sensitive data incident",
    "selectedApps": [],
    "alertBy": "email",
    "enabled": true,
    "compareDescribe": "new sensitive data incident",
    "alertValues": ["pii-e2e-test@example.com"]
};

var scheduledAlert = {
    "alertName": "PII E2E Scheduled Alert",
    "alertDataType": "pii",
    "alertDataSubType": "# of sensitive data incidents",
    "compareType": "more",
    "compareValue": "0",
    "period": "hourly",
    "selectedApps": [],
    "alertBy": "email",
    "enabled": true,
    "compareDescribe": "sensitive data incidents more than 0",
    "alertValues": ["pii-e2e-test@example.com"]
};

// PII rule config
var piiRule = {
    "name": "E2E Email Detector",
    "regex": "/[a-z]+@[a-z]+\\.com/",
    "action": "NOTIFY",
    "app_ids": null,
    "enabled": true,
    "checkTargets": {
        "eventSegmentValues": true,
        "customUserPropertyValues": true
    }
};

function getRequestURL(path) {
    return path + '?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID;
}

function handleApiResponse(err, res, done, successCallback) {
    if (err) {
        return done(err);
    }
    if (res.status >= 400) {
        return done(new Error('API returned HTTP ' + res.status + ': ' + JSON.stringify(res.body)));
    }
    successCallback();
}

/**
 * Poll until checkFn returns true or timeout.
 * checkFn(callback) should call callback(true/false)
 */
function waitForCondition(checkFn, maxWaitMs, intervalMs, callback) {
    var start = Date.now();
    (function poll() {
        checkFn(function(met) {
            if (met) {
                return callback();
            }
            if (Date.now() - start > maxWaitMs) {
                return callback(new Error('Timeout waiting for condition after ' + maxWaitMs + 'ms'));
            }
            setTimeout(poll, intervalMs);
        });
    })();
}

describe('Testing PII Alerts End-to-End', function() {
    describe('1. PII Alert CRUD', function() {
        it('should initialize test variables', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            should.exist(API_KEY_ADMIN);
            should.exist(APP_ID);
            should.exist(APP_KEY);
            done();
        });

        it('should create an event-triggered PII alert', function(done) {
            var config = Object.assign({}, eventTriggeredAlert, {
                selectedApps: [APP_ID]
            });

            request.get(getRequestURL('/i/alert/save') + '&alert_config=' + encodeURIComponent(JSON.stringify(config)))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        should.exist(res.body);
                        res.body.should.be.a.String();
                        createdAlertIds.push(res.body);
                        done();
                    });
                });
        });

        it('should create a scheduled PII alert', function(done) {
            var config = Object.assign({}, scheduledAlert, {
                selectedApps: [APP_ID]
            });

            request.get(getRequestURL('/i/alert/save') + '&alert_config=' + encodeURIComponent(JSON.stringify(config)))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        should.exist(res.body);
                        res.body.should.be.a.String();
                        createdAlertIds.push(res.body);
                        done();
                    });
                });
        });

        it('should list alerts and find both PII alerts', function(done) {
            request.get(getRequestURL('/o/alert/list'))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        res.body.should.have.property('alertsList').which.is.an.Array();

                        var eventAlert = res.body.alertsList.find(function(a) {
                            return a._id === createdAlertIds[0];
                        });
                        var schedAlert = res.body.alertsList.find(function(a) {
                            return a._id === createdAlertIds[1];
                        });

                        should.exist(eventAlert);
                        eventAlert.should.have.property('alertDataType', 'pii');
                        eventAlert.should.have.property('alertDataSubType', 'new sensitive data incident');
                        eventAlert.should.have.property('alertBy', 'email');
                        eventAlert.should.have.property('enabled', true);

                        should.exist(schedAlert);
                        schedAlert.should.have.property('alertDataType', 'pii');
                        schedAlert.should.have.property('compareType', 'more');
                        schedAlert.should.have.property('compareValue', '0');
                        schedAlert.should.have.property('period', 'hourly');

                        done();
                    });
                });
        });

        it('should update PII alert name and threshold', function(done) {
            var updatedConfig = Object.assign({}, scheduledAlert, {
                _id: createdAlertIds[1],
                selectedApps: [APP_ID],
                alertName: "Updated PII Scheduled Alert",
                compareValue: "5"
            });

            request.get(getRequestURL('/i/alert/save') + '&alert_config=' + encodeURIComponent(JSON.stringify(updatedConfig)))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        // Verify update
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                handleApiResponse(err, res, done, function() {
                                    var updated = res.body.alertsList.find(function(a) {
                                        return a._id === createdAlertIds[1];
                                    });
                                    should.exist(updated);
                                    updated.should.have.property('alertName', 'Updated PII Scheduled Alert');
                                    updated.should.have.property('compareValue', '5');
                                    done();
                                });
                            });
                    });
                });
        });

        it('should delete the scheduled PII alert', function(done) {
            var alertToDelete = createdAlertIds[1];

            request.get(getRequestURL('/i/alert/delete') + '&alertID=' + alertToDelete)
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        res.body.should.have.property('result', 'Deleted an alert');

                        // Verify deletion
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                handleApiResponse(err, res, done, function() {
                                    var deleted = res.body.alertsList.find(function(a) {
                                        return a._id === alertToDelete;
                                    });
                                    should.not.exist(deleted);
                                    createdAlertIds.splice(1, 1);
                                    done();
                                });
                            });
                    });
                });
        });
    });

    describe('2. PII Rule + Incident Creation', function() {
        this.timeout(15000);

        it('should create a PII rule', function(done) {
            request.get(getRequestURL('/i/pii/rules') + '&rule=' + encodeURIComponent(JSON.stringify(piiRule)))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        res.body.should.have.property('success', true);
                        res.body.should.have.property('_id');
                        createdPiiRuleId = res.body._id;
                        done();
                    });
                });
        });

        it('should verify PII rule exists', function(done) {
            request.get(getRequestURL('/o/pii/rules'))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        var rules = res.body;
                        rules.should.be.an.Array();
                        var found = rules.find(function(r) {
                            return r._id === createdPiiRuleId;
                        });
                        should.exist(found);
                        found.should.have.property('name', 'E2E Email Detector');
                        found.should.have.property('action', 'NOTIFY');
                        found.should.have.property('enabled', true);
                        done();
                    });
                });
        });

        it('should send SDK events containing PII to trigger incidents', function(done) {
            var events = [
                {
                    key: "pii_test_purchase",
                    count: 1,
                    segmentation: {
                        email: "john@acme.com",
                        product: "widget"
                    }
                },
                {
                    key: "pii_test_signup",
                    count: 1,
                    segmentation: {
                        contact_email: "jane@test.com"
                    }
                }
            ];

            request.get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&events=' + encodeURIComponent(JSON.stringify(events)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.have.property('result', 'Success');
                    done();
                });
        });

        it('should find PII incidents via API', function(done) {
            this.timeout(15000);
            var attempts = 0;
            var maxAttempts = 20;
            var interval = 500;

            function poll() {
                request.get(getRequestURL('/o/pii/incidents') + '&ruleId=' + createdPiiRuleId)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        if (res.body && res.body.incidents && res.body.incidents.length > 0) {
                            res.body.should.have.property('incidents').which.is.an.Array();
                            res.body.incidents.length.should.be.above(0);
                            res.body.should.have.property('total').which.is.a.Number();
                            res.body.total.should.be.above(0);

                            var incident = res.body.incidents[0];
                            incident.should.have.property('action', 'NOTIFY');
                            incident.should.have.property('ruleId', createdPiiRuleId);

                            return done();
                        }
                        attempts++;
                        if (attempts >= maxAttempts) {
                            return done(new Error('Timed out waiting for PII incidents to appear via API'));
                        }
                        setTimeout(poll, interval);
                    });
            }

            poll();
        });
    });

    describe('3. Event-Triggered Alert Verification', function() {
        this.timeout(15000);

        var initialCounter = 0;

        it('should initialize common.db and readBatcher for triggerByEvent', function(done) {
            if (!common.db) {
                common.db = testUtils.db;
            }
            if (!common.readBatcher) {
                common.readBatcher = {
                    getOne: function(collection, query) {
                        return testUtils.db.collection(collection).findOne(query);
                    },
                    getMany: function(collection, query) {
                        return testUtils.db.collection(collection).find(query).toArray();
                    }
                };
            }
            done();
        });

        it('should record initial alerts_data counter', function(done) {
            testUtils.db.collection('alerts_data').findOne({ _id: 'meta' }, function(err, doc) {
                if (err) {
                    return done(err);
                }
                initialCounter = (doc && doc.t) ? doc.t : 0;
                done();
            });
        });

        it('should ensure event-triggered PII alert is enabled', function(done) {
            request.get(getRequestURL('/o/alert/list'))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        var alert = res.body.alertsList.find(function(a) {
                            return a._id === createdAlertIds[0];
                        });
                        should.exist(alert, 'Event-triggered PII alert should exist');
                        alert.should.have.property('enabled', true);
                        alert.should.have.property('alertDataType', 'pii');
                        done();
                    });
                });
        });

        it('should trigger alert via direct triggerByEvent call', function(done) {
            // Directly call triggerByEvent with test incidents and app,
            // bypassing the slow SDK pipeline.
            testUtils.db.collection('apps').findOne({
                _id: testUtils.db.ObjectID(APP_ID)
            }, function(err, app) {
                if (err) {
                    return done(err);
                }
                should.exist(app, 'Test app should exist');

                var testIncidents = [{
                    ruleId: createdPiiRuleId,
                    ruleName: "E2E Email Detector",
                    action: "NOTIFY",
                    target: "segment",
                    path: "segmentation.user_email",
                    matchedValue: "alice@domain.com",
                    ts: Date.now()
                }];

                piiAlertModule.triggerByEvent({
                    incidents: testIncidents,
                    app: app
                }).then(function() {
                    // Verify counter increased
                    testUtils.db.collection('alerts_data').findOne({ _id: 'meta' }, function(err, doc) {
                        if (err) {
                            return done(err);
                        }
                        var newCounter = (doc && doc.t) ? doc.t : 0;
                        newCounter.should.be.above(initialCounter);
                        done();
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });
    });

    describe('4. Scheduled Check Verification', function() {
        this.timeout(15000);

        var scheduledAlertId = "";
        var counterBeforeCheck = 0;

        it('should initialize common.db and readBatcher for direct module calls', function(done) {
            // common.db and common.readBatcher are normally initialized by the
            // server process. For direct module testing, set them up using testUtils.db.
            if (!common.db) {
                common.db = testUtils.db;
            }
            if (!common.readBatcher) {
                common.readBatcher = {
                    getOne: function(collection, query) {
                        return testUtils.db.collection(collection).findOne(query);
                    },
                    getMany: function(collection, query) {
                        return testUtils.db.collection(collection).find(query).toArray();
                    }
                };
            }
            done();
        });

        it('should create a scheduled PII alert for check test', function(done) {
            var config = Object.assign({}, scheduledAlert, {
                selectedApps: [APP_ID],
                alertName: "PII Scheduled Check Test",
                compareValue: "0",
                alertBy: "hook",
                alertValues: []
            });

            request.get(getRequestURL('/i/alert/save') + '&alert_config=' + encodeURIComponent(JSON.stringify(config)))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        should.exist(res.body);
                        res.body.should.be.a.String();
                        scheduledAlertId = res.body;
                        createdAlertIds.push(scheduledAlertId);
                        done();
                    });
                });
        });

        it('should send SDK events to create PII incidents for scheduled check', function(done) {
            var events = [
                {
                    key: "pii_sched_event",
                    count: 1,
                    segmentation: { email: "sched1@test.com" }
                },
                {
                    key: "pii_sched_event",
                    count: 1,
                    segmentation: { contact: "sched2@test.com" }
                },
                {
                    key: "pii_sched_event",
                    count: 1,
                    segmentation: { email: "sched3@test.com" }
                }
            ];

            request.get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&events=' + encodeURIComponent(JSON.stringify(events)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.have.property('result', 'Success');
                    done();
                });
        });

        it('should wait for incidents to be available', function(done) {
            this.timeout(15000);
            var attempts = 0;
            var maxAttempts = 20;
            var interval = 500;

            function poll() {
                request.get(getRequestURL('/o/pii/incidents') + '&ruleId=' + createdPiiRuleId)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        if (res.body && res.body.incidents && res.body.incidents.length >= 3) {
                            return done();
                        }
                        attempts++;
                        if (attempts >= maxAttempts) {
                            return done(new Error('Timed out waiting for scheduled-check PII incidents'));
                        }
                        setTimeout(poll, interval);
                    });
            }

            poll();
        });

        it('should record counter before scheduled check', function(done) {
            testUtils.db.collection('alerts_data').findOne({ _id: 'meta' }, function(err, doc) {
                if (err) {
                    return done(err);
                }
                counterBeforeCheck = (doc && doc.t) ? doc.t : 0;
                done();
            });
        });

        it('should trigger scheduled check and verify alert fires', function(done) {
            // Fetch the alert config from DB to get the full object
            testUtils.db.collection('alerts').findOne({
                _id: testUtils.db.ObjectID(scheduledAlertId)
            }, function(err, alertConfig) {
                if (err) {
                    return done(err);
                }
                should.exist(alertConfig, 'Scheduled alert should exist in DB');

                piiAlertModule.check({
                    alertConfigs: alertConfig,
                    scheduledTo: new Date()
                }).then(function() {
                    // Verify counter increased
                    testUtils.db.collection('alerts_data').findOne({ _id: 'meta' }, function(err, doc) {
                        if (err) {
                            return done(err);
                        }
                        var newCounter = (doc && doc.t) ? doc.t : 0;
                        newCounter.should.be.above(counterBeforeCheck);
                        done();
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });
    });

    describe('5. Cleanup', function() {
        it('should delete all created PII alerts', function(done) {
            var deleteNext = function(index) {
                if (index >= createdAlertIds.length) {
                    return done();
                }

                request.get(getRequestURL('/i/alert/delete') + '&alertID=' + createdAlertIds[index])
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property('result', 'Deleted an alert');
                        deleteNext(index + 1);
                    });
            };

            deleteNext(0);
        });

        it('should delete the PII rule', function(done) {
            if (!createdPiiRuleId) {
                return done();
            }

            request.get(getRequestURL('/i/pii/rules/delete') + '&id=' + createdPiiRuleId)
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        res.body.should.have.property('success', true);
                        done();
                    });
                });
        });

        it('should clean up test incidents via API', function(done) {
            request.get(getRequestURL('/o/pii/incidents'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var incidents = res.body && res.body.incidents;
                    if (!incidents || incidents.length === 0) {
                        return done();
                    }
                    var ids = incidents.map(function(inc) {
                        return inc._id;
                    });
                    request.get(getRequestURL('/i/pii/incidents/delete') + '&ids=' + ids.join(','))
                        .expect(200)
                        .end(function(err2) {
                            if (err2) {
                                return done(err2);
                            }
                            done();
                        });
                });
        });

        it('should verify clean state', function(done) {
            // Verify no test alerts remain
            request.get(getRequestURL('/o/alert/list'))
                .expect(200)
                .end(function(err, res) {
                    handleApiResponse(err, res, done, function() {
                        for (var i = 0; i < createdAlertIds.length; i++) {
                            var found = res.body.alertsList.find(function(a) {
                                return a._id === createdAlertIds[i];
                            });
                            should.not.exist(found);
                        }
                        done();
                    });
                });
        });
    });
});
