var should = require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// countlyTokenManager.readPermission builds the permission for a token handed outside the
// dashboard (the heatmap link). It is loaded here in a sandbox and its output checked exactly.

var MODEL = path.join(__dirname, "../../frontend/express/public/javascripts/countly/countly.token.manager.js");

/**
 * Load the token manager model with stubbed dashboard globals.
 * @returns {object} countlyTokenManager
 */
function loadModel() {
    var sandbox = {window: {}, jQuery: {ajax: function() {}}, countlyCommon: {API_URL: ""}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(MODEL, "utf8"), sandbox);
    return sandbox.window.countlyTokenManager;
}

describe("countlyTokenManager.readPermission", function() {
    it("grants read of one feature on one app and no app membership", function() {
        var permission = loadModel().readPermission("appone", "views");
        JSON.parse(JSON.stringify(permission)).should.eql({
            _: {a: [], u: [[]]},
            c: {},
            r: {appone: {all: false, allowed: {views: true}}},
            u: {},
            d: {}
        });
        should(permission._.a.length).equal(0);
    });
});
