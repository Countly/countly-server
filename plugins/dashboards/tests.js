var request = require('supertest');
var should = require('should');
var testUtils = require('../../test/testUtils');
request = request.agent(testUtils.url);

// Regression test: /o/dashboards/widget-layout must enforce dashboard view
// access, so an authenticated user cannot read the layout of a private
// dashboard they have no access to.

describe('Testing dashboards widget-layout access control', function() {
    var API_KEY_ADMIN = "";
    var dashboardId = "";
    var otherApiKey = "";
    var otherUserId = "";
    var uniq = Date.now();

    it('should create a private dashboard as admin', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .get('/i/dashboards/create?api_key=' + API_KEY_ADMIN + '&name=PrivateDash&share_with=none')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                dashboardId = JSON.parse(res.text);
                should.exist(dashboardId);
                done();
            });
    });

    it('should create a separate non-admin user', function(done) {
        var userParams = {
            full_name: "dashoutsider" + uniq,
            username: "dashoutsider" + uniq,
            password: "p4ssw0rD!",
            email: "dashoutsider" + uniq + "@mail.test",
            permission: { _: { a: [], u: [] }, c: {}, r: {}, u: {}, d: {} }
        };
        request
            .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                otherApiKey = res.body.api_key;
                otherUserId = res.body._id;
                should.exist(otherApiKey);
                done();
            });
    });

    it('should deny widget-layout for a user without dashboard access', function(done) {
        request
            .get('/o/dashboards/widget-layout?api_key=' + otherApiKey + '&dashboard_id=' + dashboardId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('dashboard_access_denied', true);
                done();
            });
    });

    it('should allow widget-layout for the dashboard owner', function(done) {
        request
            .get('/o/dashboards/widget-layout?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + dashboardId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                Array.isArray(ob).should.eql(true);
                done();
            });
    });

    after(function(done) {
        request
            .get('/i/dashboards/delete?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + dashboardId)
            .end(function() {
                request
                    .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [otherUserId]})))
                    .end(function() {
                        done();
                    });
            });
    });
});

// Regression tests for cross-app widget scoping.
//
// Sharing a dashboard with someone who has no access to the apps its widgets
// point at is intentional - dashboard permissions are separate from app
// permissions. But copying such a dashboard makes the copier the OWNER of the
// copied widgets, and owners may edit them. A view-only recipient could
// therefore rewrite a borrowed widget's query (adding breakdowns, changing
// metrics) and read far more of an app than the dashboard owner chose to show.
// Widgets whose apps the copier cannot read must not be copied at all.

describe('Testing dashboards cross-app widget scoping', function() {
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var sourceDashId = "";
    var outsiderCopyId = "";
    var adminCopyId = "";
    var outsiderApiKey = "";
    var outsiderUserId = "";
    var uniq = Date.now();

    it('should create a dashboard shared with all users', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        request
            .get('/i/dashboards/create?api_key=' + API_KEY_ADMIN + '&name=SharedDash' + uniq + '&share_with=all-users')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                sourceDashId = JSON.parse(res.text);
                should.exist(sourceDashId);
                done();
            });
    });

    it('should add a widget for the test app as admin', function(done) {
        var widget = {
            widget_type: "number",
            data_type: "session",
            apps: [APP_ID],
            metrics: ["u"],
            title: "limited total users"
        };
        request
            .get('/i/dashboards/add-widget?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + sourceDashId + '&widget=' + encodeURIComponent(JSON.stringify(widget)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should show one widget on the source dashboard', function(done) {
        request
            .get('/o/dashboards/widget-layout?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + sourceDashId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.parse(res.text).length.should.eql(1);
                done();
            });
    });

    it('should create a non-admin user with no app access', function(done) {
        var userParams = {
            full_name: "dashcopier" + uniq,
            username: "dashcopier" + uniq,
            password: "p4ssw0rD!",
            email: "dashcopier" + uniq + "@mail.test",
            permission: { _: { a: [], u: [] }, c: {}, r: {}, u: {}, d: {} }
        };
        request
            .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                outsiderApiKey = res.body.api_key;
                outsiderUserId = res.body._id;
                should.exist(outsiderApiKey);
                done();
            });
    });

    it('should let the outsider copy the shared dashboard', function(done) {
        request
            .get('/i/dashboards/create?api_key=' + outsiderApiKey + '&name=CopiedDash' + uniq + '&share_with=none&copy_dash_id=' + sourceDashId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                outsiderCopyId = JSON.parse(res.text);
                should.exist(outsiderCopyId);
                done();
            });
    });

    it('should not copy widgets for apps the copier cannot read', function(done) {
        request
            .get('/o/dashboards/widget-layout?api_key=' + outsiderApiKey + '&dashboard_id=' + outsiderCopyId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                Array.isArray(ob).should.eql(true);
                ob.length.should.eql(0);
                done();
            });
    });

    it('should reject a widget for an app the user cannot read', function(done) {
        var widget = {
            widget_type: "number",
            data_type: "session",
            apps: [APP_ID],
            metrics: ["u"]
        };
        request
            .get('/i/dashboards/add-widget?api_key=' + outsiderApiKey + '&dashboard_id=' + outsiderCopyId + '&widget=' + encodeURIComponent(JSON.stringify(widget)))
            .expect(403)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should reject an array-like apps value', function(done) {
        // {length: 1, "0": id} passes an Array.isArray() guard's falsy branch
        // while still being read through .length/[i] downstream
        var widget = {
            widget_type: "number",
            data_type: "session",
            apps: {length: 1, "0": APP_ID},
            metrics: ["u"]
        };
        request
            .get('/i/dashboards/add-widget?api_key=' + outsiderApiKey + '&dashboard_id=' + outsiderCopyId + '&widget=' + encodeURIComponent(JSON.stringify(widget)))
            .expect(400)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should still copy widgets for a copier who can read the apps', function(done) {
        request
            .get('/i/dashboards/create?api_key=' + API_KEY_ADMIN + '&name=AdminCopy' + uniq + '&share_with=none&copy_dash_id=' + sourceDashId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                adminCopyId = JSON.parse(res.text);
                request
                    .get('/o/dashboards/widget-layout?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + adminCopyId)
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        JSON.parse(r.text).length.should.eql(1);
                        done();
                    });
            });
    });

    after(function(done) {
        request
            .get('/i/dashboards/delete?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + sourceDashId)
            .end(function() {
                request
                    .get('/i/dashboards/delete?api_key=' + API_KEY_ADMIN + '&dashboard_id=' + adminCopyId)
                    .end(function() {
                        request
                            .get('/i/dashboards/delete?api_key=' + outsiderApiKey + '&dashboard_id=' + outsiderCopyId)
                            .end(function() {
                                request
                                    .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [outsiderUserId]})))
                                    .end(function() {
                                        done();
                                    });
                            });
                    });
            });
    });
});
