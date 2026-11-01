require("should");
var fs = require("fs");
var path = require("path");
var common = require("../../api/utils/common.js");

// The screenshots route is public, because the links in emailed reports are opened
// without a session. It finds a screenshot by its own file name, the random name
// /o/render gives it, so each URL serves the file it names and nothing else.
//
// app.js builds an express app on require, so the route is lifted out of the real
// source and run here against a stubbed file store.

var APP = path.join(__dirname, "../../frontend/express/app.js");
var lines = fs.readFileSync(APP, "utf8").split("\n");

/**
 * Lift a block out of app.js: the line beginning with startPrefix, through the first
 * following line that is exactly endLine
 * @param {string} startPrefix - how the block's first line begins
 * @param {string} endLine - the line that terminates it, matched whole
 * @returns {string} the source of the block
 */
function lift(startPrefix, endLine) {
    var start = lines.findIndex(function(l) {
        return l.indexOf(startPrefix) === 0;
    });
    if (start < 0) {
        throw new Error("not found in app.js: " + startPrefix);
    }
    for (var j = start; j < lines.length; j++) {
        if (lines[j] === endLine) {
            return lines.slice(start, j + 1).join("\n");
        }
    }
    throw new Error("terminator not found for: " + startPrefix);
}

var ROUTE = lift('    app.get(countlyConfig.path + "*/screenshots/*", function(req, res) {', "    });");
var FRONTEND_DIR = path.join(__dirname, "../../frontend/express");
var STORED = "screenshot_" + "0123456789abcdef0123456789abcdef" + ".png";

/**
 * Request a path from the lifted route
 * @param {string} reqPath - request path
 * @returns {object} what the route looked up and what it answered
 */
function get(reqPath) {
    var outcome = {lookups: [], sent: undefined, status: null};
    // names the lifted source refers to
    /* eslint-disable no-unused-vars */
    var countlyConfig = {path: ""};
    var log = {e: function() {}};
    var __dirname = FRONTEND_DIR;
    var countlyFs = {
        getStats: function(category, dest, options, callback) {
            outcome.lookups.push({dest: dest, options: options});
            if (path.basename(dest) === STORED && !options.id) {
                return callback(null, {size: 4, mtime: new Date(0)});
            }
            if (options.id === "core") {
                // a file stored under the id every render once shared
                return callback(null, {size: 6, mtime: new Date(0)});
            }
            callback(new Error("not found"));
        },
        getStream: function(category, dest, options, callback) {
            callback(null, {
                on: function() {},
                pipe: function() {
                    outcome.status = 200;
                }
            });
        }
    };
    var app = {
        get: function(pattern, handler) {
            handler({path: reqPath}, {
                send: function(value) {
                    outcome.sent = value;
                },
                writeHead: function(status) {
                    outcome.status = status;
                },
                end: function() {}
            });
        }
    };
    /* eslint-enable no-unused-vars */
    /* eslint-disable no-eval, security/detect-eval-with-expression */
    eval(ROUTE);
    /* eslint-enable no-eval, security/detect-eval-with-expression */
    return outcome;
}

describe("public screenshots route", function() {
    it("serves a stored screenshot by its file name", function() {
        var outcome = get("/images/screenshots/" + STORED);
        outcome.status.should.equal(200);
        outcome.lookups.should.have.length(1);
        outcome.lookups[0].options.should.eql({});
        outcome.lookups[0].dest.should.equal(common.resolvePathInBase(path.join(FRONTEND_DIR, "public/images/screenshots"), STORED));
    });

    it("answers false for a well-formed name that was never stored", function() {
        var outcome = get("/images/screenshots/screenshot_ffffffffffffffffffffffffffffffff.png");
        outcome.sent.should.equal(false);
        (outcome.status === null).should.equal(true);
    });

    it("answers false without a lookup for anything that is not a screenshot name", function() {
        ["/images/screenshots/logo.png", "/images/screenshots/../../config.js", "/images/screenshots/screenshot_1.png"].forEach(function(reqPath) {
            var outcome = get(reqPath);
            outcome.sent.should.equal(false, reqPath);
            outcome.lookups.should.eql([], reqPath);
        });
    });
});
