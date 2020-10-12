var plugins = require("../../plugins/pluginManager");
var should = require('should');
var testUtils = require("../testUtils");

describe('Create DB connection for tests', function() {
    before('Open db connection', async function() {
        testUtils.db = await plugins.dbConnection("countly");
        testUtils.client = testUtils.db.client;
    });
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
});