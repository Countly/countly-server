var assert = require("assert");
var csrf = require("../../frontend/express/libs/csrf.js");

// The dashboard's CSRF middleware replaced the csurf package and keeps its session mode:
// the secret lives in req.session.csrfSecret, req.csrfToken() gives a salted token, the token
// is read from _csrf or the csrf headers, and a bad token fails with code EBADCSRFTOKEN.
describe("csrf middleware", function() {
    // Secret and token created by csurf 1.11.0, so sessions from before the switch keep working
    var CSURF_SECRET = "XmPu-nvSobHsIqPdAPhtAv5B";
    var CSURF_TOKEN = "tBTq5Y7n-s4aJAtQ8tPoxprMLCzF_EiNH4Oc";

    /**
     * Run the middleware on a request
     * @param {object} req - request
     * @returns {Error|undefined} error passed to next
     */
    function run(req) {
        req.headers = req.headers || {};
        var result;
        var called = 0;
        csrf(req, {}, function(err) {
            called++;
            result = err;
        });
        assert.strictEqual(called, 1);
        return result;
    }

    /**
     * Get a token for a session through a GET request
     * @param {object} session - session object
     * @returns {string} token
     */
    function tokenFor(session) {
        var req = {method: "GET", session: session};
        assert.strictEqual(run(req), undefined);
        return req.csrfToken();
    }

    it("lets GET, HEAD and OPTIONS through without a token and stores a secret", function() {
        ["GET", "HEAD", "OPTIONS"].forEach(function(method) {
            var session = {};
            assert.strictEqual(run({method: method, session: session}), undefined);
            assert.strictEqual(typeof session.csrfSecret, "string");
        });
    });

    it("keeps an existing secret", function() {
        var session = {csrfSecret: CSURF_SECRET};
        tokenFor(session);
        assert.strictEqual(session.csrfSecret, CSURF_SECRET);
    });

    it("returns the same token within a request and a new salted one per request", function() {
        var session = {};
        var req = {method: "GET", session: session};
        run(req);
        assert.strictEqual(req.csrfToken(), req.csrfToken());
        assert.notStrictEqual(tokenFor(session), tokenFor(session));
    });

    it("accepts the token from _csrf in the body or query and from each csrf header", function() {
        var session = {};
        var token = tokenFor(session);
        assert.strictEqual(run({method: "POST", session: session, body: {_csrf: token}}), undefined);
        assert.strictEqual(run({method: "POST", session: session, query: {_csrf: token}}), undefined);
        ["csrf-token", "xsrf-token", "x-csrf-token", "x-xsrf-token"].forEach(function(header) {
            var headers = {};
            headers[header] = token;
            assert.strictEqual(run({method: "POST", session: session, headers: headers}), undefined, header);
        });
    });

    it("accepts a token created by csurf for its secret", function() {
        assert.strictEqual(run({method: "POST", session: {csrfSecret: CSURF_SECRET}, body: {_csrf: CSURF_TOKEN}}), undefined);
    });

    it("rejects a missing, wrong, other-session or non-string token with EBADCSRFTOKEN", function() {
        var session = {};
        tokenFor(session);
        var otherToken = tokenFor({});
        [
            {},
            {body: {_csrf: "wrong"}},
            {body: {_csrf: otherToken}},
            {body: {_csrf: CSURF_TOKEN}},
            {body: {_csrf: ["a", "b"]}},
            {query: {_csrf: {$ne: ""}}}
        ].forEach(function(extra) {
            var err = run(Object.assign({method: "POST", session: session}, extra));
            assert.ok(err, JSON.stringify(extra));
            assert.strictEqual(err.code, "EBADCSRFTOKEN");
            assert.strictEqual(err.status, 403);
        });
    });

    it("rejects a state-changing request on a new session with no token", function() {
        ["POST", "PUT", "PATCH", "DELETE"].forEach(function(method) {
            assert.strictEqual(run({method: method, session: {}}).code, "EBADCSRFTOKEN");
        });
    });

    it("fails without a session, as csurf did", function() {
        var err = run({method: "GET"});
        assert.ok(err);
        assert.strictEqual(err.message, "misconfigured csrf");
        assert.notStrictEqual(err.code, "EBADCSRFTOKEN");
    });
});
