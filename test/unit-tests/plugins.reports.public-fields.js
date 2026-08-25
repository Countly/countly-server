require("should");
var reports = require("../../plugins/reports/api/reports.js");

// A report document is both stored configuration and renderer input. reports.send
// prefers report.messages[i].html over rendering the trusted template, and with
// sendPdf that string is what Chromium opens. So messages is not a field a request
// may set, and it is not a field the database should be able to supply either.
//
// Two independent controls, and these cover the second one. The first, the
// create/update allow-list, is exercised through the endpoints in plugins/reports/tests.js.

var DERIVED = ["messages", "data", "subject", "mailTemplate", "properties",
    "period", "start", "end", "date", "total_new", "universe"];

describe("reports, derived fields are not taken from storage", function() {
    var stored;

    beforeEach(function() {
        // what a report looks like when it comes back from mongo, including the
        // fields an older document may still carry
        stored = {
            _id: "r1",
            title: "quarterly",
            report_type: "dashboards",
            dashboards: "d1",
            emails: ["someone@example.test"],
            frequency: "daily",
            sendPdf: true,
            user: "m1",
            messages: [{html: "<meta http-equiv=\"refresh\" content=\"0;url=http://169.254.169.254/\">"}],
            data: {host: "http://attacker.example.test"},
            subject: "spoofed",
            mailTemplate: "/templates/attacker.html",
            properties: {},
            period: "yesterday",
            total_new: 99,
            universe: "x"
        };
    });

    it("strips every derived field before the generator sees the report", function() {
        // getReport goes on to hit the database, which is not available here. The
        // stripping happens before that, synchronously, so the call is made and the
        // failure that follows is irrelevant to what is asserted.
        try {
            reports.getReport({
                collection: function() {
                    throw new Error("no database in this test");
                }
            }, stored, function() {});
        }
        catch (ignored) {
            // expected: there is no database
        }

        DERIVED.forEach(function(field) {
            stored.should.not.have.property(field);
        });
    });

    it("leaves the report's own configuration alone", function() {
        try {
            reports.getReport({
                collection: function() {
                    throw new Error("no database in this test");
                }
            }, stored, function() {});
        }
        catch (ignored) {
            // expected
        }

        stored.title.should.equal("quarterly");
        stored.report_type.should.equal("dashboards");
        stored.dashboards.should.equal("d1");
        stored.emails.should.eql(["someone@example.test"]);
        stored.frequency.should.equal("daily");
        stored.sendPdf.should.equal(true);
        stored.user.should.equal("m1");
    });

});

describe("reports, the pdf renderer keeps the same origin policy", function() {
    it("does not launch chromium with web security disabled", function() {
        var fs = require("fs");
        var src = fs.readFileSync(__dirname + "/../../plugins/reports/api/reports.js", "utf8");
        // the comment above the call records why the flag went, so match the array
        var args = src.match(/args: \[[^\]]*\]/g) || [];
        args.forEach(function(argList) {
            argList.should.not.match(/disable-web-security/);
        });
    });
});
