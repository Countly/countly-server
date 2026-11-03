var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
var pluginManager = require("../../plugins/pluginManager.js");
var Promise = require("bluebird");
request = request(testUtils.url);


const newAlert = {"alertName": "test", "alertDataType": "metric", "alertDataSubType": "Total users", "compareType": "increased by at least", "compareValue": "1", "selectedApps": [], "period": "every 1 hour on the 59th min", "alertBy": "email", "enabled": true, "compareDescribe": "Total users increased by at least 1%", "alertValues": ["a@a.com"]};
const alerts = [];

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    const APP_ID = testUtils.get("APP_ID");
    return path + `?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

describe('Testing Alert', function() {
    describe('Testing Alert CRUD', function() {
        describe('Create Alert', function() {
            it('should create alert with valid params', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const alertConfig = Object.assign({}, newAlert, {selectedApps: [APP_ID]});

                request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });

        describe('Read alert', function() {
            it('should read alerts with valid params', function(done) {
                request.get(getRequestURL('/o/alert/list'))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property("alertsList");
                        res.body.alertsList.forEach((r) => {
                            alerts.push(r);
                        });
                        alerts.length.should.be.above(0);
                        done();
                    });
            });
        });

        describe('Update alert', function() {
            it('should update alert with valid params', function(done) {
                const alertID = alerts[0]._id;
                const alertConfig = Object.assign({}, alerts[0]);
                alertConfig.alertName = "test2";
                request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.should.have.property("alertsList");
                                res.body.alertsList.forEach((r) =>{
                                    if (r._id === alertID) {
                                        r.should.have.property('alertName', 'test2');
                                        done();
                                    }
                                });

                            });
                    });
            });

            it('should able to change alert status', function(done) {
                const alertID = alerts[0]._id;
                const payload = {[alertID]: false};
                request.get(getRequestURL('/i/alert/status') + "&status=" + encodeURIComponent(JSON.stringify(payload)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.should.have.property("alertsList");
                                res.body.alertsList.forEach((r) =>{
                                    if (r._id === alertID) {
                                        r.should.have.property('enabled', false);
                                        done();
                                    }
                                });

                            });
                    });
            });
        });

        describe('Delete Alert', function() {
            it('should able to delete alert', function(done) {
                const alertID = alerts[0]._id;
                request.get(getRequestURL('/i/reports/delete') + "&alertID=" + alertID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });
    });


});



describe('Testing Alert stored fields', function() {
    var alertId = "";
    var otherAppId = "aaaaaaaaaaaaaaaaaaaaaaaa";

    /**
     * Read the alert from the database
     * @returns {Promise<object>} stored alert
     */
    function storedAlert() {
        return testUtils.db.collection("alerts").findOne({_id: testUtils.db.ObjectID(alertId)});
    }

    /**
     * Save an alert
     * @param {object} alertConfig - alert config
     * @returns {Promise<object>} supertest response
     */
    function saveAlert(alertConfig) {
        return request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)));
    }

    after(async function() {
        if (alertId) {
            await request.get(getRequestURL('/i/alert/delete') + "&alertID=" + alertId);
        }
    });

    it('should store only the alert fields on create', async function() {
        var alertConfig = Object.assign({}, newAlert, {selectedApps: [testUtils.get("APP_ID")], createdBy: "000000000000000000000000", bogus: 1, "selectedApps.1": otherAppId});
        var res = await saveAlert(alertConfig);
        res.status.should.equal(200, res.text);
        alertId = res.body + "";

        var admin = await testUtils.db.collection("members").findOne({api_key: testUtils.get("API_KEY_ADMIN")});
        var stored = await storedAlert();
        (stored.createdBy + "").should.equal(admin._id + "");
        stored.selectedApps.should.eql([testUtils.get("APP_ID")]);
        should.not.exist(stored.bogus);
        should.not.exist(stored["selectedApps.1"]);
    });

    it('should not change selectedApps through a dotted key on update', async function() {
        var res = await saveAlert({_id: alertId, alertName: "dotted", "selectedApps.0": otherAppId});
        res.status.should.equal(200, res.text);
        var stored = await storedAlert();
        stored.alertName.should.equal("dotted");
        stored.selectedApps.should.eql([testUtils.get("APP_ID")]);
    });

    it('should save a normal update of the listed alert', async function() {
        var list = await request.get(getRequestURL('/o/alert/list'));
        list.status.should.equal(200, list.text);
        var row = list.body.alertsList.find(function(r) {
            return r._id === alertId;
        });
        should.exist(row);
        var alertConfig = Object.assign({}, row, {alertName: "edited", compareValue: "5", alertValues: ["b@b.com"]});
        var res = await saveAlert(alertConfig);
        res.status.should.equal(200, res.text);
        var stored = await storedAlert();
        stored.alertName.should.equal("edited");
        stored.compareValue.should.equal("5");
        stored.alertValues.should.eql(["b@b.com"]);
    });
});
