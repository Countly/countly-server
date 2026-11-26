var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Clearing the CMS cache', function() {
    var API_KEY_ADMIN = "";

    it('clears it for a member with write access', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .get('/i/cms/clear?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.parse(res.text).should.have.property('result', 'CMS cache cleared');
                done();
            });
    });

    it('treats the entry id as a literal prefix', function(done) {
        request
            .get('/i/cms/clear?api_key=' + API_KEY_ADMIN + '&_id=' + encodeURIComponent('server-guides(['))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.parse(res.text).should.have.property('result', 'CMS cache cleared');
                done();
            });
    });

    it('refuses a request without credentials', function(done) {
        request
            .get('/i/cms/clear')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.parse(res.text).should.have.property('result', 'Missing parameter "api_key" or "auth_token"');
                done();
            });
    });
});
