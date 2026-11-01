var request = require('supertest');
require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

// /o/countly_version lists the versions the file system and the database were upgraded to.
// When one of those can't be read, it says so with an error code only: the error objects
// carry server file paths and driver details, which must not reach the client.
describe('Countly version', function() {
    it('should list versions or an error code, nothing else', function(done) {
        request
            .get('/o/countly_version?api_key=' + testUtils.get("API_KEY_ADMIN"))
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                [200, 400].should.containEql(res.status);
                var ob = JSON.parse(res.text).result;
                ob.should.have.property('pkg');
                ['fs', 'db'].forEach(function(key) {
                    if (!Array.isArray(ob[key])) {
                        Object.keys(ob[key]).should.eql(['error']);
                        ob[key].error.should.be.a.String();
                    }
                });
                res.text.should.not.match(/"(path|syscall|errno|stack)"/);
                done();
            });
    });
});
