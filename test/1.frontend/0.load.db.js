var plugins = require("../../plugins/pluginManager");
var testUtils = require("../testUtils");

describe('Create DB connection for tests', function() {
    before('Open db connection', async function() {
        testUtils.db = await plugins.dbConnection("countly");
        testUtils.client = testUtils.db.client;
    });
});