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
            full_name: "dashoutsider",
            username: "dashoutsider",
            password: "p4ssw0rD!",
            email: "dashoutsider@mail.test",
            permission: { _: { a: [], u: [] }, c: {}, r: {}, u: {}, d: {} }
        };
        request
            .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(userParams))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                otherApiKey = res.body.api_key;
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
                done();
            });
    });
});
