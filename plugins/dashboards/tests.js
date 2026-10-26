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

/**
 * Dashboards through a scoped token.
 *
 * Custom dashboards are opened by ownership and sharing, not per app, and
 * whoever opens one reads every widget on it. So a scoped token reaches its
 * owner's dashboards only through the dashboards grant of its permission
 * (token_permission.dashboards), per operation. With the grant it has the
 * owner's dashboard access, whatever apps it reads; without it, none. The
 * owner's own api_key is not affected.
 */
describe('Dashboards and a scoped token', () => {
    const tokens = {};
    const createdDashboards = [];
    let dashboardId;
    let widgetId;

    /**
     * Read access to the given features on the test app, plus a dashboards grant.
     * @param {string[]} features - feature names
     * @param {object} [dashboards] - dashboards grant, e.g. {r: true}
     * @returns {object} permission object
     */
    function permission(features, dashboards) {
        const app = testUtils.get('APP_ID');
        const allowed = {};
        features.forEach((feature) => {
            allowed[feature] = true;
        });
        const perm = {
            _: { a: [], u: [[app]] },
            c: {},
            r: { [app]: { all: false, allowed } },
            u: {},
            d: {},
        };
        if (dashboards) {
            perm.dashboards = dashboards;
        }
        return perm;
    }

    /**
     * Create a token with the given permission.
     * @param {object} perm - permission object
     * @param {object} [creator] - credential creating it, the admin api_key by default
     * @returns {Promise<object>} the response
     */
    function requestToken(perm, creator) {
        return request.get('/i/token/create').query(Object.assign({
            multi: true,
            ttl: 600,
            permission: JSON.stringify(perm),
        }, creator || { api_key: testUtils.get('API_KEY_ADMIN') }));
    }

    /**
     * Create a token for the admin and remember it for cleanup.
     * @param {object} perm - permission object
     * @returns {Promise<string>} token
     */
    async function createToken(perm) {
        const res = await requestToken(perm);
        res.status.should.equal(200, res.text);
        return res.body.result;
    }

    before(async function() {
        this.timeout(90000);
        const apiKey = testUtils.get('API_KEY_ADMIN');

        let res = await request.get('/i/dashboards/create').query({ api_key: apiKey, name: 'scoped token dashboard', share_with: 'none' });
        res.status.should.equal(200, res.text);
        dashboardId = res.body + '';

        const widget = { widget_type: 'analytics', apps: [testUtils.get('APP_ID')], data_type: 'session', metrics: ['t'], visualization: 'number' };
        res = await request.get('/i/dashboards/add-widget').query({ api_key: apiKey, dashboard_id: dashboardId, widget: JSON.stringify(widget) });
        res.status.should.equal(200, res.text);
        widgetId = res.body + '';

        const widgetRes = await request.get('/o/dashboards/widget').query({ api_key: apiKey, dashboard_id: dashboardId, widget_id: widgetId });
        widgetRes.status.should.equal(200, widgetRes.text);
        widgetRes.body.length.should.equal(1);

        // the widget reads core on the app, which this token cannot read: the grant is not per app
        tokens.read = await createToken(permission(['crashes'], { r: true }));
        tokens.none = await createToken(permission(['core']));
        tokens.write = await createToken(permission(['core'], { c: true, r: true, u: true, d: true }));
    });

    after(async function() {
        this.timeout(90000);
        const apiKey = testUtils.get('API_KEY_ADMIN');
        for (const id of [dashboardId].concat(createdDashboards).filter(Boolean)) {
            const res = await request.get('/i/dashboards/delete').query({ api_key: apiKey, dashboard_id: id });
            should(res.status).equal(200);
            should.not.exist(await testUtils.db.collection('dashboards').findOne({ _id: testUtils.db.ObjectID(id) }));
        }
        for (const token of Object.values(tokens)) {
            const res = await request.get('/i/token/delete').query({ api_key: apiKey, tokenid: token });
            should(res.status).equal(200);
        }
    });

    describe('a token without the dashboards grant', () => {
        const refused = (res) => {
            res.status.should.equal(403, res.text);
            res.body.result.should.equal('Token has no access to dashboards');
        };

        it('is refused the dashboard', async() => {
            refused(await request.get('/o/dashboards').query({ auth_token: tokens.none, dashboard_id: dashboardId }));
        });

        it('is refused the dashboard list', async() => {
            refused(await request.get('/o/dashboards/all').query({ auth_token: tokens.none }));
        });

        it('is refused the widget and its data', async() => {
            refused(await request.get('/o/dashboards/widget').query({ auth_token: tokens.none, dashboard_id: dashboardId, widget_id: widgetId }));
            refused(await request.get('/o/dashboard/data').query({ auth_token: tokens.none, dashboard_id: dashboardId, widget_id: widgetId }));
        });

        it('is refused creating a dashboard', async() => {
            refused(await request.get('/i/dashboards/create').query({ auth_token: tokens.none, name: 'refused', share_with: 'none' }));
        });

        it('cannot create a token with the grant', async() => {
            const res = await requestToken(permission(['core'], { r: true }), { auth_token: tokens.none });
            res.status.should.equal(403, res.text);
        });
    });

    describe('a token with the dashboards read grant', () => {
        it('gets the dashboard with the widget and its app', async() => {
            const res = await request.get('/o/dashboards').query({ auth_token: tokens.read, dashboard_id: dashboardId });
            res.status.should.equal(200, res.text);
            res.body.widgets.map((w) => w._id + '').should.eql([widgetId]);
            res.body.apps.map((a) => a._id + '').should.eql([testUtils.get('APP_ID')]);
        });

        it('gets the widget data of an app it cannot read', async() => {
            const res = await request.get('/o/dashboard/data').query({ auth_token: tokens.read, dashboard_id: dashboardId, widget_id: widgetId });
            res.status.should.equal(200, res.text);
            should.not.exist(res.body.dashboard_access_denied);
            (res.body._id + '').should.equal(widgetId);
        });

        it('is refused writes', async() => {
            const created = await request.get('/i/dashboards/create').query({ auth_token: tokens.read, name: 'refused', share_with: 'none' });
            created.status.should.equal(403, created.text);
            const renamed = await request.get('/i/dashboards/update').query({ auth_token: tokens.read, dashboard_id: dashboardId, name: 'renamed', share_with: 'none' });
            renamed.status.should.equal(403, renamed.text);
        });

        it('cannot create a token with a write grant', async() => {
            const res = await requestToken(permission(['crashes'], { r: true, u: true }), { auth_token: tokens.read });
            res.status.should.equal(403, res.text);
        });
    });

    describe('a token with the dashboards write grant', () => {
        it('creates and deletes a dashboard', async() => {
            const created = await request.get('/i/dashboards/create').query({ auth_token: tokens.write, name: 'token dashboard', share_with: 'none' });
            created.status.should.equal(200, created.text);
            const id = created.body + '';
            createdDashboards.push(id);
            const deleted = await request.get('/i/dashboards/delete').query({ auth_token: tokens.write, dashboard_id: id });
            deleted.status.should.equal(200, deleted.text);
            createdDashboards.pop();
            should.not.exist(await testUtils.db.collection('dashboards').findOne({ _id: testUtils.db.ObjectID(id) }));
        });
    });

    describe('the owner api_key', () => {
        it('still gets the widget data', async() => {
            const res = await request.get('/o/dashboard/data').query({ api_key: testUtils.get('API_KEY_ADMIN'), dashboard_id: dashboardId, widget_id: widgetId });
            res.status.should.equal(200, res.text);
            should.not.exist(res.body.dashboard_access_denied);
            (res.body._id + '').should.equal(widgetId);
        });
    });
});
