require("should");
var path = require("path");
var logModule = require("../../api/utils/log.js");

// A scheduled report whose creator was removed, or lost access to the apps it
// covers, is not sent (reports.ownerMayStillSend). That skip is logged as a
// warning naming the report, so it does not stop without a trace.
describe("reports, a skipped send is logged as a warning", function() {
    var REPORTS = path.resolve(__dirname, "../../plugins/reports/api/reports.js");
    var APP = "aaaaaaaaaaaaaaaaaaaaaaaa";
    var originalWarn, originalModule, originalLevel, reports, warnings;

    before(function() {
        // the logger keeps the console.warn it was created with, so the module is
        // loaded fresh with a recording one and put back afterwards
        originalWarn = console.warn;
        originalModule = require.cache[REPORTS];
        originalLevel = logModule.getLevel("reports:reports");
        warnings = [];
        console.warn = function() {
            warnings.push(Array.prototype.join.call(arguments, " "));
        };
        delete require.cache[REPORTS];
        reports = require(REPORTS);
        logModule.setLevel("reports:reports", "warn");
    });

    after(function() {
        console.warn = originalWarn;
        logModule.setLevel("reports:reports", originalLevel);
        if (originalModule) {
            require.cache[REPORTS] = originalModule;
        }
        else {
            delete require.cache[REPORTS];
        }
    });

    beforeEach(function() {
        warnings = [];
    });

    /**
     * A db whose members collection holds the given member
     * @param {object|null} member - member findOne returns
     * @returns {object} db stub
     */
    function db(member) {
        return {
            ObjectID: function(id) {
                return id;
            },
            collection: function() {
                return {
                    findOne: function(query, cb) {
                        cb(null, member);
                    }
                };
            }
        };
    }

    /**
     * Run ownerMayStillSend
     * @param {object|null} member - the report's creator as stored
     * @returns {Promise<boolean>} whether the report may be sent
     */
    function maySend(member) {
        return new Promise(function(resolve) {
            reports.ownerMayStillSend(db(member), {_id: "r1", user: "m1", apps: [APP]}, resolve);
        });
    }

    it("warns when the creator no longer exists", async function() {
        (await maySend(null)).should.equal(false);
        warnings.length.should.equal(1);
        warnings[0].should.containEql("Report r1");
        warnings[0].should.containEql("no longer exists");
    });

    it("warns when the creator lost access to the report's apps", async function() {
        var member = {_id: "m1", permission: {_: {a: [], u: []}, c: {}, r: {}, u: {}, d: {}}};
        (await maySend(member)).should.equal(false);
        warnings.length.should.equal(1);
        warnings[0].should.containEql("Report r1");
        warnings[0].should.containEql(APP);
    });

    it("does not warn when the creator may still read the apps", async function() {
        var member = {_id: "m1", global_admin: true};
        (await maySend(member)).should.equal(true);
        warnings.length.should.equal(0);
    });
});
