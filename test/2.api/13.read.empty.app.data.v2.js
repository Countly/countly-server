var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";

describe('Empty app analytics data reading', function() {
    /*
	{ '30days':
 { dashboard:
  { total_sessions: { total: 0, change: 'NA', trend: 'u' },
   total_users: { total: 0, change: 'NA', trend: 'u', is_estimate: true },
   new_users: { total: 0, change: 'NA', trend: 'u' },
   total_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_requests: { total: '0.0', change: 'NA', trend: 'u' } },
  top: { platforms: [], resolutions: [], carriers: [], users: [] },
  period: '19 Aug - 17 Sep' },
 '7days':
 { dashboard:
  { total_sessions: { total: 0, change: 'NA', trend: 'u' },
   total_users: { total: 0, change: 'NA', trend: 'u', is_estimate: true },
   new_users: { total: 0, change: 'NA', trend: 'u' },
   total_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_requests: { total: '0.0', change: 'NA', trend: 'u' } },
  top: { platforms: [], resolutions: [], carriers: [], users: [] },
  period: '11 Sep - 17 Sep' },
 today:
 { dashboard:
  { total_sessions: { total: 0, change: 'NA', trend: 'u' },
   total_users: { total: 0, change: 'NA', trend: 'u', is_estimate: false },
   new_users: { total: 0, change: 'NA', trend: 'u' },
   total_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_time: { total: '0.0 min', change: 'NA', trend: 'u' },
   avg_requests: { total: '0.0', change: 'NA', trend: 'u' } },
  top: { platforms: [], resolutions: [], carriers: [], users: [] },
  period: '00:00 - 14:24' } }
	*/
    describe('Empty dashboard', function() {
        it('should display dashboard', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            APP_ID = testUtils.get("APP_ID");
            request
                .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);

                    ob.should.have.property('30days');
                    var period = ob["30days"];
                    period.should.have.property("dashboard");
                    var dashboard = period["dashboard"];
                    dashboard.should.have.property("total_sessions", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_users", { total: 0, change: 'NA', trend: 'u', is_estimate: true });
                    dashboard.should.have.property("new_users", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_requests", { total: '0.0', change: 'NA', trend: 'u' });
                    period.should.have.property("top");
                    var top = period["top"];
                    top.should.have.property("platforms", []);
                    top.should.have.property("resolutions", []);
                    top.should.have.property("carriers", []);
                    top.should.have.property("users", []);
                    period.should.have.property("period");

                    ob.should.have.property('7days');
                    var period = ob["7days"];
                    period.should.have.property("dashboard");
                    var dashboard = period["dashboard"];
                    dashboard.should.have.property("total_sessions", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_users", { total: 0, change: 'NA', trend: 'u', is_estimate: true });
                    dashboard.should.have.property("new_users", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_requests", { total: '0.0', change: 'NA', trend: 'u' });
                    period.should.have.property("top");
                    var top = period["top"];
                    top.should.have.property("platforms", []);
                    top.should.have.property("resolutions", []);
                    top.should.have.property("carriers", []);
                    top.should.have.property("users", []);
                    period.should.have.property("period");

                    ob.should.have.property('today');
                    var period = ob["today"];
                    period.should.have.property("dashboard");
                    var dashboard = period["dashboard"];
                    dashboard.should.have.property("total_sessions", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_users", { total: 0, change: 'NA', trend: 'u', is_estimate: false });
                    dashboard.should.have.property("new_users", { total: 0, change: 'NA', trend: 'u' });
                    dashboard.should.have.property("total_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_time", { total: '0.0 min', change: 'NA', trend: 'u' });
                    dashboard.should.have.property("avg_requests", { total: '0.0', change: 'NA', trend: 'u' });
                    period.should.have.property("top");
                    var top = period["top"];
                    top.should.have.property("platforms", []);
                    top.should.have.property("resolutions", []);
                    top.should.have.property("carriers", []);
                    top.should.have.property("users", []);
                    period.should.have.property("period");

                    done();
                });
        });
    });
    // { '30days': [], '7days': [], today: [] }
    describe('Empty countries', function() {
        it('should display countries', function(done) {
            request
                .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('30days').and.eql([]);
                    ob.should.have.property('7days').and.eql([]);
                    ob.should.have.property('today').and.eql([]);
                    done();
                });
        });
    });
});