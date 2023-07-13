var plugins = require("../../plugins/pluginManager");
var should = require('should');
var testUtils = require("../testUtils");

describe('Close DB connection after tests', function() {
    it('Check db Connection', function(done) {
        testUtils.db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
            if (err) {
                done(err);
            }
            else {
                res.should.have.property("_id", "plugins");
                done();
            }
        });
    });
    after('Close db connection', async function() {
        testUtils.client.close();
    });
});