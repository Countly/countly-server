/**
 * preventBruteforce.middleware checks every request path the router sends to a
 * guarded handler, not only the exact registered spelling.
 */
const should = require('should');
const path = require('path');

const preventBruteforce = require(path.resolve(__dirname, '../../frontend/express/libs/preventBruteforce.js'));

describe('preventBruteforce middleware path matching', function() {
    let lookups;
    let saved;

    before(function() {
        saved = {db: preventBruteforce.db, pathIdentifiers: preventBruteforce.pathIdentifiers, userIdentifiers: preventBruteforce.userIdentifiers};
        preventBruteforce.pathIdentifiers = {"/login": "login", "/forgot": "forgot"};
        preventBruteforce.userIdentifiers = {"/login": (req) => req.body.username};
        // every account is blocked: 3 fails just now
        preventBruteforce.db = {
            collection: function() {
                return {
                    findOne: function(query, callback) {
                        lookups.push(query._id);
                        callback(null, {fails: 3, lastFail: Math.floor(Date.now() / 1000)});
                    }
                };
            }
        };
    });

    after(function() {
        Object.assign(preventBruteforce, saved);
    });

    beforeEach(function() {
        lookups = [];
    });

    /**
     * Runs the middleware for a request
     * @param {string} method - HTTP method
     * @param {string} reqPath - request path
     * @returns {object} what the middleware did
     */
    function run(method, reqPath) {
        const outcome = {next: false, redirect: null};
        const req = {method: method, path: reqPath, body: {username: "admin"}, ip: "10.0.0.1", session: {}};
        const res = {
            redirect: function(to) {
                outcome.redirect = to;
            },
            status: function() {
                return {send: function() {}};
            }
        };
        preventBruteforce.middleware(req, res, function() {
            outcome.next = true;
        });
        return outcome;
    }

    ["/login", "/login/", "/LOGIN", "/Login//"].forEach(function(reqPath) {
        it('blocks POST ' + reqPath, function() {
            const outcome = run("POST", reqPath);
            outcome.next.should.equal(false);
            outcome.redirect.should.equal("/login?message=login.blocked");
            lookups.should.eql([JSON.stringify(["login", "admin"])]);
        });
    });

    it('blocks POST /forgot/ by ip', function() {
        const outcome = run("POST", "/forgot/");
        outcome.redirect.should.equal("/forgot?message=login.blocked");
        lookups.should.eql([JSON.stringify(["forgot", "10.0.0.1"])]);
    });

    it('lets other paths and methods through without a lookup', function() {
        run("POST", "/login/token").next.should.equal(true);
        run("POST", "/loginx").next.should.equal(true);
        run("GET", "/login/").next.should.equal(true);
        lookups.should.eql([]);
    });

    it('resolves the registered spelling of a path', function() {
        preventBruteforce.registeredPath("/LOGIN/").should.equal("/login");
        should(preventBruteforce.registeredPath("/dashboard")).equal(null);
    });
});

describe('preventBruteforce login counter key', function() {
    it('gives every whitespace and case variant of a username one key', function() {
        [" admin", "admin ", "Admin", " ADMIN "].forEach(function(typed) {
            preventBruteforce.loginKey(typed).should.equal("admin");
        });
    });

    it('lists the normalized counter first and the verbatim one second', function() {
        preventBruteforce.loginCounterIds("Admin").should.eql([JSON.stringify(["login", "admin"]), JSON.stringify(["login", "Admin"])]);
    });

    it('clears both counters of a member by username and by email', function(done) {
        const saved = preventBruteforce.db;
        let removed = null;
        preventBruteforce.db = {
            collection: function() {
                return {
                    remove: function(query, callback) {
                        removed = query;
                        callback();
                    }
                };
            }
        };
        preventBruteforce.resetForMember({username: "Admin", email: "admin@example.com"}, function() {
            preventBruteforce.db = saved;
            removed._id.$in.should.eql([
                JSON.stringify(["login", "admin"]),
                JSON.stringify(["login", "Admin"]),
                JSON.stringify(["login", "admin@example.com"]),
                JSON.stringify(["login", "admin@example.com"])
            ]);
            done();
        });
    });
});
