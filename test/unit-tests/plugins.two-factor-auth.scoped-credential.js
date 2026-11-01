require("should");
var fs = require("fs");
var path = require("path");

// The second factor is account level and belongs to no application, so validateUser
// cannot bound a scoped token here the way it does on a per-app route - it applies the
// permission intersection but does not reject the request, and disable asks for no
// current code. A token narrowed to one feature on one app would otherwise be able to
// weaken the factor protecting everything its owner can reach.
//
// The integration cases for this live in test/2.api/16.token.manager.js, but they can
// only run where the two-factor-auth plugin is enabled - elsewhere the route answers
// 400 "Invalid path" and they skip. This suite is the coverage that does not depend on
// that: it reads the plugin's source and requires the guard to be present at each
// method that mutates the factor, whether or not the plugin is installed here.

var API = path.join(__dirname, "../../plugins/two-factor-auth/api/api.js");
var src = fs.readFileSync(API, "utf8");

/**
 * The body of one `case "<name>":` arm, up to the `break;` that ends it
 * @param {string} name - the method name
 * @returns {string} the source of that arm
 */
function arm(name) {
    var start = src.indexOf('case "' + name + '":');
    if (start < 0) {
        return null;
    }
    var end = src.indexOf("\n        break;", start);
    if (end < 0) {
        throw new Error('case "' + name + '" has no break');
    }
    return src.slice(start, end);
}

describe("two-factor-auth: account level routes refuse a scoped credential", function() {
    // generate-qr-code does not exist on every branch this suite runs on, so it is
    // required only where the method is
    var MUTATING = ["enable", "disable", "generate-qr-code"];

    it("imports the predicate rather than re-implementing it", function() {
        src.should.match(/isScopedCredential/);
        src.should.match(/require\(['"]\.\.\/\.\.\/\.\.\/api\/utils\/rights\.js['"]\)/);
    });

    it("answers 403 rather than silently narrowing what the request may touch", function() {
        // validateUser already bounds a scoped token per app; on an account level route
        // there is no app to bound, so bounding is not refusing and only refusing helps
        src.should.match(/returnMessage\(params, 403,/);
        src.should.match(/A restricted token cannot/);
    });

    MUTATING.forEach(function(method) {
        it("guards " + method + ", if this branch has it", function() {
            var body = arm(method);
            if (body === null) {
                return this.skip();
            }
            body.should.match(/validateUser\(/,
                method + " should still authenticate the caller");
            body.should.match(/refuseScopedCredential\(/,
                method + " changes the second factor but does not refuse a scoped token");
            // the guard has to come before the work, not after it
            body.indexOf("refuseScopedCredential(")
                .should.be.below(body.indexOf("findAndModify") === -1
                    ? body.length : body.indexOf("findAndModify"),
                method + " acts before it checks");
        });
    });

    it("leaves the global-admin methods alone", function() {
        // admin_check and admin_disable act on another member and are already behind
        // validateUserForGlobalAdmin, which a scoped token cannot satisfy
        ["admin_check", "admin_disable"].forEach(function(method) {
            var body = arm(method);
            if (body === null) {
                return;
            }
            body.should.match(/validateUserForGlobalAdmin/);
        });
    });
});
