var assert = require("assert");
var path = require("path");
var plugins = require("../../plugins/pluginManager.js");
var createMailLogger = require("../../api/utils/mailLogger.js");
var mail = require("../../api/parts/mgmt/mail.js");

// nodemailer logs through Countly's "mail" logger. Countly no longer ships bunyan: copies of
// extend/mail.debug.example.js that still require('bunyan') get a stand-in that returns the
// same logger, and an extend file that exists but fails to load is now logged, not skipped.
describe("mail logger", function() {
    it("has every level nodemailer calls, and child()", function() {
        var logger = createMailLogger();
        ["trace", "debug", "info", "warn", "error", "fatal"].forEach(function(level) {
            assert.strictEqual(typeof logger[level], "function", level);
            logger[level]({tnx: "test"}, "message %s", "arg");
        });
        assert.strictEqual(logger.child(), logger);
    });

    it("is exposed to extend/mail.js as mail.smtpLogger", function() {
        assert.strictEqual(typeof mail.smtpLogger.debug, "function");
    });

    it("still answers require('bunyan') with createLogger()", function() {
        var bunyan = require("bunyan");
        var log = bunyan.createLogger({name: "Countly Email"});
        ["trace", "debug", "info", "warn", "error", "fatal"].forEach(function(level) {
            assert.strictEqual(typeof log[level], "function", level);
        });
        assert.ok(require.resolve("bunyan").indexOf(path.join("api", "utils", "bunyan-compat")) !== -1);
    });
});

describe("extendModule", function() {
    var original;
    var logged;
    beforeEach(function() {
        logged = [];
        original = console.log;
        console.log = function(ex) {
            logged.push(ex);
        };
    });
    afterEach(function() {
        console.log = original;
    });

    it("stays quiet when there is no extend file", function() {
        plugins.extendModule("no-such-extension-" + Date.now(), {});
        assert.strictEqual(logged.length, 0);
    });

    it("logs an extend file that exists but requires a missing module", function() {
        var name = "unit-test-missing-dependency-" + Date.now();
        var file = path.join(__dirname, "..", "..", "extend", name + ".js");
        require("fs").writeFileSync(file, "require('no-such-module-" + Date.now() + "');\nmodule.exports = function() {};\n");
        try {
            plugins.extendModule(name, {});
        }
        finally {
            require("fs").unlinkSync(file);
        }
        assert.strictEqual(logged.length, 1);
        assert.strictEqual(logged[0].code, "MODULE_NOT_FOUND");
    });
});
