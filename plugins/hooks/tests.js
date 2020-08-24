
var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);



describe('Testing Cohorts', function() {
    describe('Empty get_cohorts', function() {
        it('should success', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + "&app_id=" + APP_ID + "&method=get_cohorts")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.eql([]);
                    done();
                });
        });
    });
})


