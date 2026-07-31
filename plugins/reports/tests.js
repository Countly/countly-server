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

            it('should not change the report owner on update', function(done) {
                const reportID = reports[0]._id;
                const originalUser = reports[0].user + "";
                const bogusUser = "000000000000000000000000";
                const reportConfig = Object.assign({}, reports[0], {user: bogusUser});
                request.get(getRequestURL('/i/reports/update') + "&args=" + encodeURIComponent(JSON.stringify(reportConfig)))
                    .expect(200)
                    .end(function(err) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/reports/all'))
                            .expect(200)
                            .end(function(err2, res) {
                                if (err2) {
                                    return done(err2);
                                }
                                var updated = res.body.filter(function(r) {
                                    return r._id === reportID;
                                })[0];
                                should.exist(updated);
                                (updated.user + "").should.not.equal(bogusUser);
                                (updated.user + "").should.equal(originalUser);
                                done();
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


// Regression tests for authorization of non-core report targets.
//
// A non-core report_type names the plugin that owns the report, and that plugin
// authorizes the target through /report/authorize: the dashboards plugin checks
// view access to the dashboard a "dashboards" report renders. That caller was
// commented out, so a member with reports rights could schedule a report against
// any dashboard id, including a private dashboard belonging to someone else.
//
// These go through the real HTTP endpoints with a real non-admin member, so the
// whole path is exercised: validateCreate, the report_type branch, the
// /report/authorize dispatch into the dashboards plugin, and the insert.

describe('Testing Reports non-core authorization', function() {
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var adminDashboardId = "";
    var memberDashboardId = "";
    var sharedDashIdForCleanup = "";
    var memberApiKey = "";
    var memberUserId = "";
    var VICTIM_APP_ID = "";
    var uniq = Date.now();

    /**
     * Build a dashboards-type report config
     * @param {string} dashboardId - dashboard the report renders
     * @returns {object} report config
     */
    function dashboardReport(dashboardId) {
        return {
            title: "noncore-authz-" + uniq,
            report_type: "dashboards",
            dashboards: dashboardId,
            emails: ["a@abc.com"],
            frequency: "daily",
            timezone: "Europe/Tirane",
            hour: 4,
            minute: 0,
            sendPdf: true
        };
    }

    it('should create a private dashboard as admin', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        request.get('/i/dashboards/create?api_key=' + API_KEY_ADMIN + '&name=ReportsPrivateDash' + uniq + '&share_with=none')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                adminDashboardId = JSON.parse(res.text);
                should.exist(adminDashboardId);
                done();
            });
    });

    it('should create a non-admin member with reports rights on the test app', function(done) {
        var permission = {
            _: {a: [], u: [[APP_ID]]},
            c: {},
            r: {},
            u: {},
            d: {}
        };
        permission.c[APP_ID] = {all: false, allowed: {reports: true}};
        permission.r[APP_ID] = {all: false, allowed: {reports: true}};
        permission.u[APP_ID] = {all: false, allowed: {reports: true}};
        var userParams = {
            full_name: "reportsmember" + uniq,
            username: "reportsmember" + uniq,
            password: "p4ssw0rD!",
            email: "reportsmember" + uniq + "@mail.test",
            permission: permission
        };
        request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                memberApiKey = res.body.api_key;
                memberUserId = res.body._id;
                should.exist(memberApiKey);
                done();
            });
    });

    it('should create a second app the member has no rights on', function(done) {
        request.get('/i/apps/create?api_key=' + API_KEY_ADMIN
            + '&args=' + encodeURIComponent(JSON.stringify({name: "reportsVictim" + uniq, country: "TR", type: "mobile", category: "6", timezone: "Europe/Istanbul"})))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                VICTIM_APP_ID = res.body._id;
                should.exist(VICTIM_APP_ID);
                done();
            });
    });

    it('should reject a dashboards report for a dashboard the member cannot view', function(done) {
        request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
            + '&args=' + encodeURIComponent(JSON.stringify(dashboardReport(adminDashboardId))))
            .expect(401)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should allow a dashboards report for the member own dashboard', function(done) {
        request.get('/i/dashboards/create?api_key=' + memberApiKey + '&name=MemberDash' + uniq + '&share_with=none')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                memberDashboardId = JSON.parse(res.text);
                request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
                    + '&args=' + encodeURIComponent(JSON.stringify(dashboardReport(memberDashboardId))))
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        r.body.should.have.property('result', 'Success');
                        done();
                    });
            });
    });

    it('should refuse a non-core report naming an app the member cannot read', function(done) {
        // apps used to be authorized only for core reports, so a non-core report could
        // carry any apps list at all
        var sneaky = Object.assign({}, dashboardReport(memberDashboardId), {apps: [VICTIM_APP_ID]});
        request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
            + '&args=' + encodeURIComponent(JSON.stringify(sneaky)))
            .expect(401)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should refuse to convert a stored report onto an app the member cannot read', function(done) {
        // the second half of the chain: store apps while the type is non-core, then flip
        // report_type to core with apps omitted so the stored list survives unchecked
        var report = Object.assign({}, dashboardReport(memberDashboardId), {title: "convert-" + uniq});
        request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
            + '&args=' + encodeURIComponent(JSON.stringify(report)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                request.get('/o/reports/all?api_key=' + memberApiKey + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        var created = (r.body || []).filter(function(x) {
                            return x.title === "convert-" + uniq;
                        })[0];
                        should.exist(created);
                        // an admin plants the unauthorized apps list directly, standing in
                        // for the first half of the chain now that create refuses it
                        request.get('/i/reports/update?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID
                            + '&args=' + encodeURIComponent(JSON.stringify({_id: created._id, apps: [VICTIM_APP_ID]})))
                            .end(function() {
                                request.get('/i/reports/update?api_key=' + memberApiKey + '&app_id=' + APP_ID
                                    + '&args=' + encodeURIComponent(JSON.stringify({_id: created._id, report_type: "core"})))
                                    .expect(401)
                                    .end(function(e2) {
                                        if (e2) {
                                            return done(e2);
                                        }
                                        done();
                                    });
                            });
                    });
            });
    });

    it('should allow a dashboards report for a dashboard shared with the member', function(done) {
        // Dashboard permissions are deliberately separate from app permissions: a
        // dashboard can be shared with a member who has no access to the apps its
        // widgets reference, and they are meant to be able to view it and schedule a
        // report for it. This is the same admin-owned dashboard the member was
        // refused above, so the only thing that changes here is the share, which is
        // what proves authorization follows the share and not app rights.
        var sharedDashboardId = "";
        request.get('/i/dashboards/create?api_key=' + API_KEY_ADMIN
            + '&name=ReportsSharedDash' + uniq
            + '&share_with=selected-users'
            + '&shared_email_view=' + encodeURIComponent(JSON.stringify(["reportsmember" + uniq + "@mail.test"])))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                sharedDashboardId = JSON.parse(res.text);
                should.exist(sharedDashboardId);
                request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
                    + '&args=' + encodeURIComponent(JSON.stringify(dashboardReport(sharedDashboardId))))
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        r.body.should.have.property('result', 'Success');
                        sharedDashIdForCleanup = sharedDashboardId;
                        done();
                    });
            });
    });

    it('should not persist the authorize flag on the stored report', function(done) {
        request.get('/o/reports/all?api_key=' + memberApiKey + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.forEach(function(r) {
                    r.should.not.have.property('authorized');
                });
                done();
            });
    });

    it('should still allow a core report for an app the member has rights on', function(done) {
        var coreReport = Object.assign({}, newReport, {apps: [APP_ID], title: "noncore-core-control-" + uniq});
        request.get('/i/reports/create?api_key=' + memberApiKey + '&app_id=' + APP_ID
            + '&args=' + encodeURIComponent(JSON.stringify(coreReport)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property('result', 'Success');
                done();
            });
    });

    after(function(done) {
        // remove everything this block created: the reports it scheduled, both
        // dashboards, and the member
        request.get('/o/reports/all?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
            .end(function(listErr, listRes) {
                var created = ((listRes && listRes.body) || []).filter(function(r) {
                    return typeof r.title === "string" && r.title.indexOf("" + uniq) > -1;
                });
                var pending = created.length;
                /**
                 * Delete the dashboards and the member once reports are gone
                 * @returns {void}
                 */
                function cleanupRest() {
                    var dashboards = [adminDashboardId, memberDashboardId, sharedDashIdForCleanup].filter(Boolean);
                    if (VICTIM_APP_ID) {
                        request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({app_id: VICTIM_APP_ID}))).end(function() {});
                    }
                    /**
                     * Delete the dashboards one at a time, then the member
                     * @param {number} i - index into dashboards
                     * @returns {void}
                     */
                    function deleteDashboard(i) {
                        if (i >= dashboards.length) {
                            return request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [memberUserId]})))
                                .end(function() {
                                    done();
                                });
                        }
                        request.get('/i/dashboards/delete?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + dashboards[i])
                            .end(function() {
                                deleteDashboard(i + 1);
                            });
                    }
                    deleteDashboard(0);
                }
                if (!pending) {
                    return cleanupRest();
                }
                created.forEach(function(r) {
                    request.get('/i/reports/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&args=' + encodeURIComponent(JSON.stringify({_id: r._id})))
                        .end(function() {
                            pending--;
                            if (!pending) {
                                cleanupRest();
                            }
                        });
                });
            });
    });
});
