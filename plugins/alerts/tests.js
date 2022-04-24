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


