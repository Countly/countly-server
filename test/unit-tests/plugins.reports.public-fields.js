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

// --disable-web-security stays on the launch line, deliberately: the html is opened
// as a data: url, whose origin is opaque, and Chromium refuses http subresources from
// an opaque origin, so without the flag the template's own images do not load. What
// made the flag dangerous was that the document could reach anything the server can -
// loopback, the private network, a metadata service. The control for that is the
// origin allow-list the renderer enforces per request, so that is what is asserted
// here. An earlier version of this file asserted the flag had been removed, which was
// the design before the allow-list replaced it.
describe("reports, the pdf renderer refuses requests off the countly origin", function() {
    var pdf = require("../../api/utils/pdf.js");

    // The allowed set is built explicitly here rather than through renderOrigins(),
    // because that function also adds whatever frontend/express/config.js names, and
    // on a developer machine or a CI runner that is usually a loopback origin - which
    // is exactly what several of these cases need to be outside the set.
    var ALLOWED = new Set(["https://countly.example.test", "http://localhost:6001"]);

    it("allows an origin on the list", function() {
        pdf.isAllowedRenderUrl("https://countly.example.test/images/logo.png", ALLOWED)
            .should.equal(true);
    });

    it("refuses the server's own network position", function() {
        [
            "http://169.254.169.254/latest/meta-data/",
            "http://127.0.0.1:27017/",
            "http://localhost:3001/i/apps/all",
            "http://10.0.0.5/internal",
            "https://attacker.example.test/collect"
        ].forEach(function(url) {
            pdf.isAllowedRenderUrl(url, ALLOWED).should.equal(false, url + " was allowed");
        });
    });

    it("separates origins by scheme and port, not host alone", function() {
        // countly is often on loopback itself, so every other service there would come
        // along with it if the host were compared on its own
        pdf.isAllowedRenderUrl("http://localhost:6001/x", ALLOWED).should.equal(true);
        pdf.isAllowedRenderUrl("http://localhost:27017/x", ALLOWED).should.equal(false);
        pdf.isAllowedRenderUrl("https://localhost:6001/x", ALLOWED).should.equal(false);
    });

    it("lets the document itself through", function() {
        // the html is opened as a data: url and inline resources carry no network
        // request, so refusing these would stop the render rather than protect it
        var empty = new Set();
        ["data:text/html,<p>x</p>", "blob:null/abc", "about:blank"].forEach(function(url) {
            pdf.isAllowedRenderUrl(url, empty).should.equal(true, url + " was refused");
        });
    });

    it("refuses a url it cannot parse", function() {
        pdf.isAllowedRenderUrl("http://[", ALLOWED).should.equal(false);
        pdf.isAllowedRenderUrl("://nonsense", ALLOWED).should.equal(false);
    });

    it("collects the origins a caller declares, and drops what will not parse", function() {
        // asserted as a superset: renderOrigins also adds the configured countly
        // origin, which differs between a developer machine and a runner
        var origins = pdf.renderOrigins([
            "https://countly.example.test/reports/x?y=1",
            "not a url",
            null,
            undefined,
            ""
        ]);
        origins.has("https://countly.example.test").should.equal(true);
        origins.has("not a url").should.equal(false);
        [...origins].forEach(function(origin) {
            origin.should.match(/^[a-z]+:\/\//, origin + " is not an origin");
        });
    });

    it("is what the report renderer actually passes", function() {
        // the predicate above only protects anything if the origins reach renderPDF,
        // and they are built from the send-time data rather than the stored document
        var fs = require("fs");
        var src = fs.readFileSync(__dirname + "/../../plugins/reports/api/reports.js", "utf8");
        src.should.match(/let renderOrigins = \[message\.data && message\.data\.host\]/);
        src.should.match(/renderPDF\([\s\S]*?,\s*true,\s*renderOrigins\)/);
    });
});
