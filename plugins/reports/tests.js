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

        describe('Cross-app authorization (missing report_type)', function() {
            var victimAppId = "";
            var scopedApiKey = "";
            var scopedUserId = "";
            var ownedReportId = "";
            var uniq = Date.now();

            it('should create a victim app and a user scoped to the base app only', function(done) {
                const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                const APP_ID = testUtils.get("APP_ID");
                request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({name: "ReportsVictimApp", type: "mobile"})))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        victimAppId = res.body._id;
                        var perm = { _: {a: [], u: [APP_ID]}, c: {}, r: {}, u: {}, d: {} };
                        ["c", "r", "u", "d"].forEach(function(t) {
                            perm[t][APP_ID] = {all: false, allowed: {reports: true}};
                        });
                        var userParams = {full_name: "reportsuser" + uniq, username: "reportsuser" + uniq, password: "p4ssw0rD!", email: "reportsuser" + uniq + "@mail.test", permission: perm};
                        request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
                            .expect(200)
                            .end(function(err2, res2) {
                                if (err2) {
                                    return done(err2);
                                }
                                scopedApiKey = res2.body.api_key;
                                scopedUserId = res2.body._id;
                                should.exist(scopedApiKey);
                                done();
                            });
                    });
            });

            it('should reject creating a report for another app when report_type is omitted', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                var cfg = {title: "sneaky", apps: [victimAppId], emails: ["a@abc.com"], metrics: {analytics: true}, frequency: "daily", timezone: "Etc/GMT", day: 1, hour: 0, minute: 0};
                request.get('/i/reports/create?api_key=' + scopedApiKey + '&app_id=' + APP_ID + '&args=' + JSON.stringify(cfg))
                    .expect(401)
                    .end(function(err) {
                        return done(err);
                    });
            });

            it('should allow creating a report for the owned app (report_type omitted)', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                var cfg = {title: "ownedNoType", apps: [APP_ID], emails: ["a@abc.com"], metrics: {analytics: true}, frequency: "daily", timezone: "Etc/GMT", day: 1, hour: 0, minute: 0};
                request.get('/i/reports/create?api_key=' + scopedApiKey + '&app_id=' + APP_ID + '&args=' + JSON.stringify(cfg))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property('result', 'Success');
                        done();
                    });
            });

            it('should fetch the owned report id', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                request.get('/o/reports/all?api_key=' + scopedApiKey + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var list = res.body;
                        var owned = Array.isArray(list) && list.filter(function(r) {
                            return r.title === "ownedNoType";
                        })[0];
                        should.exist(owned);
                        ownedReportId = owned._id;
                        done();
                    });
            });

            it('should reject updating an owned report to another app when report_type is omitted', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                var cfg = {_id: ownedReportId, apps: [victimAppId], frequency: "daily", timezone: "Etc/GMT", day: 1, hour: 0, minute: 0};
                request.get('/i/reports/update?api_key=' + scopedApiKey + '&app_id=' + APP_ID + '&args=' + JSON.stringify(cfg))
                    .expect(401)
                    .end(function(err) {
                        return done(err);
                    });
            });

            after(function(done) {
                const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                // best-effort cleanup of the created report, user and app
                request.get('/i/reports/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + testUtils.get("APP_ID") + '&args=' + encodeURIComponent(JSON.stringify({_id: ownedReportId})))
                    .end(function() {
                        request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [scopedUserId]})))
                            .end(function() {
                                request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({app_id: victimAppId})))
                                    .end(function() {
                                        done();
                                    });
                            });
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

