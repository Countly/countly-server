var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
var pluginManager = require("../../plugins/pluginManager.js");
var Promise = require("bluebird");
request = request(testUtils.url);


const newReport = {"title": "titleA", "report_type": "core", "apps": [], "emails": ["a@abc.com"], "metrics": {"analytics": true, "crash": true, "revenue": true, "star-rating": true, "performance": true}, "metricsArray": [], "frequency": "daily", "timezone": "Europe/Tirane", "hour": 4, "minute": 0, "sendPdf": true};

const reports = [];

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    const APP_ID = testUtils.get("APP_ID");
    return path + `?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

describe('Testing Reports', function() {
    describe('Testing Report CRUD', function() {
        before(function(done) {
            const app_key = testUtils.get("APP_KEY");
            const events = [{"key": "orderSubmit", "count": 1, "segmentation": {"a": "a", "b": "b"}}, {"key": "orderFinish", "count": 1}];
            request.get(getRequestURL('/i') + "&app_key=" + app_key + "&begin_session=1&device_id=1&events=" + encodeURIComponent(JSON.stringify(events)))
                .expect(200)
                .end(function(err, res) {
                    done();
                });

        });
        describe('Create Report', function() {
            it('should create report with valid params', function(done) {
                const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                const APP_ID = testUtils.get("APP_ID");
                const reportConfig = Object.assign({}, newReport, {apps: [APP_ID]});

                request.get(getRequestURL('/i/reports/create') + "&args=" + JSON.stringify(reportConfig))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property('result', 'Success');
                        done();
                    });
            });
        });

        describe('Read Report', function() {
            it('should read report with valid params', function(done) {
                request.get(getRequestURL('/o/reports/all'))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.forEach((r) =>{
                            reports.push(r);
                        });
                        reports.length.should.be.above(0);
                        done();
                    });
            });
        });
        describe('Update Report', function() {
            it('should able to update report with _id', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const reportID = reports[0]._id;
                const reportConfig = Object.assign({}, reports[0]);
                reportConfig.title = "test2";
                request.get(getRequestURL('/i/reports/update') + "&args=" + encodeURIComponent(JSON.stringify(reportConfig)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/reports/all'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.forEach((r) =>{
                                    if (r._id === reportID) {
                                        r.should.have.property('title', 'test2');
                                        done();
                                    }
                                });

                            });
                    });
            });

            it('should able to change report status', function(done) {
                const reportID = reports[0]._id;
                request.get(getRequestURL('/i/reports/status') + "&args=" + encodeURIComponent(JSON.stringify({[reportID]: false})))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/reports/all'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.forEach((r) =>{
                                    if (r._id === reportID) {
                                        r.should.have.property('enabled', false);
                                        done();
                                    }
                                });

                            });
                    });
            });
        });

        describe('Send Report Now', function() {
            it('should able to send report now', function(done) {
                const reportID = reports[0]._id;
                request.get(getRequestURL('/i/reports/send') + "&args=" + encodeURIComponent(JSON.stringify({_id: reportID})))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property("result", "No data to report");
                        done();
                    });
            });
        });

        describe('Preview Report', function() {
            it('should able to preview report', function(done) {
                const reportID = reports[0]._id;
                request.get(getRequestURL('/i/reports/send') + "&args=" + encodeURIComponent(JSON.stringify({_id: reportID})))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        console.log(res.body);
                        // res.body.should.have.property("result", "No data to report")
                        done();
                    });
            });
        });

        describe('Delete Report', function() {
            it('should able to delete report', function(done) {
                const reportID = reports[0]._id;
                request.get(getRequestURL('/i/reports/delete') + "&args=" + encodeURIComponent(JSON.stringify({_id: reportID})))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });

        describe('reset app', function() {
            it('should reset data', function(done) {
                var params = {app_id: testUtils.get("APP_ID"), "period": "reset"};
                request
                    .get(getRequestURL('/i/apps/reset') + "&args=" + JSON.stringify(params))
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

    });
});

