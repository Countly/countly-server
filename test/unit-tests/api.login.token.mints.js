require("should");
var fs = require("fs");
var path = require("path");

// Login capability is a property of the token now, not of its purpose string, and it
// defaults to false in authorizer.save. That closes the escalation, but it also means a
// site that mints a session token and forgets to ask for it produces a credential that
// /login/token refuses - the OIDC login token was exactly that until it was fixed.
//
// The set of places that legitimately mint a redeemable token is small and closed, so it
// is asserted here by reading the source: any authorize.save whose purpose is one of the
// login purposes has to carry can_login, and nothing else may.

var ROOT = path.join(__dirname, "../..");

var MINTERS = [
    {file: "frontend/express/libs/members.js", what: "the password login session"},
    {file: "plugins/oidc/frontend/app.js", what: "the OIDC login session"},
    {file: "api/parts/mgmt/mail.js", what: "the ban warning mail link"},
    {file: "api/utils/requestProcessor.js", what: "the /o/render headless session"},
    {file: "plugins/dashboards/api/api.js", what: "the dashboard screenshot session"}
];

var LOGIN_PURPOSES = ["LoggedInAuth", "LoginAuthToken"];

/**
 * Every authorize.save({...}) options literal in a file, as source text.
 * @param {string} src - file contents
 * @returns {string[]} the source of each options object
 */
function saveCalls(src) {
    var calls = [];
    var marker = /authorize\.save\(\{/g;
    var match;
    while ((match = marker.exec(src)) !== null) {
        var start = match.index + match[0].length - 1;
        var depth = 0;
        for (var i = start; i < src.length; i++) {
            if (src[i] === "{") {
                depth++;
            }
            else if (src[i] === "}") {
                depth--;
                if (depth === 0) {
                    calls.push(src.slice(start, i + 1));
                    break;
                }
            }
        }
    }
    return calls;
}

/**
 * Whether an options literal names one of the purposes /login/token honours.
 * @param {string} options - the source of the options object
 * @returns {boolean} true when it is a login token
 */
function isLoginPurpose(options) {
    return LOGIN_PURPOSES.some(function(purpose) {
        return new RegExp("purpose\\s*:\\s*[\"']" + purpose + "[\"']").test(options);
    });
}

describe("tokens that open a dashboard session", function() {
    MINTERS.forEach(function(minter) {
        it("asks for login permission when minting " + minter.what, function() {
            var full = path.join(ROOT, minter.file);
            if (!fs.existsSync(full)) {
                //a plugin this branch does not carry
                return;
            }
            var login = saveCalls(fs.readFileSync(full, "utf8")).filter(isLoginPurpose);
            login.length.should.be.above(0, minter.file + " no longer mints a login token");
            login.forEach(function(options) {
                options.should.match(/can_login\s*:\s*true/, minter.file + " mints a login token without can_login");
            });
        });
    });

    it("grants it nowhere else", function() {
        var allowed = MINTERS.map(function(minter) {
            return minter.file;
        });
        var offenders = [];
        /**
         * Walk a directory, checking every js/ts file that mints a token.
         * @param {string} dir - directory to walk
         * @returns {void}
         */
        function walk(dir) {
            fs.readdirSync(dir, {withFileTypes: true}).forEach(function(entry) {
                var full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "tests" || entry.name === "test") {
                        return;
                    }
                    walk(full);
                    return;
                }
                if (!/\.(js|ts)$/.test(entry.name)) {
                    return;
                }
                var relative = path.relative(ROOT, full);
                if (allowed.indexOf(relative) !== -1) {
                    return;
                }
                var src = fs.readFileSync(full, "utf8");
                if (/can_login\s*:\s*true/.test(src) && saveCalls(src).some(function(options) {
                    return /can_login\s*:\s*true/.test(options);
                })) {
                    offenders.push(relative);
                }
            });
        }
        ["api", "frontend", "plugins"].forEach(function(top) {
            walk(path.join(ROOT, top));
        });
        offenders.should.eql([]);
    });
});
