var should = require("should");
var render = require("../../api/utils/render");

// The renderer builds the url it opens by concatenating the dashboard host with the
// requested view, and /o/render lets the caller choose that view. A view that does not
// begin with "/" therefore changes the host rather than the path, which would point the
// headless browser at whatever the server itself can reach. sameOriginView is the check
// that keeps the navigation on the dashboard.
//
// These tests use hostnames and IP literals only, so nothing here resolves DNS or opens
// a browser.
describe("render same origin view check", function() {
    var HOSTS = [
        "http://localhost", // the default, countlyConfig.path is "" out of the box
        "http://localhost/countly", // a configured countlyConfig.path
        "https://dash.example.com:8443" // https on a non default port
    ];

    describe("refuses views that move the navigation off the dashboard", function() {
        // each of these rewrites the host when concatenated onto a host with no path
        var offOrigin = [
            "@169.254.169.254/latest/meta-data/iam/security-credentials/",
            "@[::ffff:169.254.169.254]/latest/meta-data/",
            "@169.254.169.254:80/latest/",
            "@localhost:9200/_cluster/health",
            ":8500/v1/kv/?recurse",
            ":6379/",
            ".internal.example/x",
            // the url parser strips tabs, newlines and carriage returns before it
            // parses, so these reach the same host as the plain payload above
            "\u0009@169.254.169.254/latest/",
            "\u000a@169.254.169.254/latest/",
            "\u000d@169.254.169.254/latest/"
        ];
        offOrigin.forEach(function(view) {
            it("refuses " + JSON.stringify(view), function() {
                should.not.exist(render.sameOriginView("http://localhost", view));
                should.not.exist(render.sameOriginView("https://dash.example.com:8443", view));
            });
        });
    });

    describe("keeps every view the dashboard itself renders", function() {
        var allowed = [
            "/#/dashboard",
            "/dashboard?ssr=true#/custom/6a41837e902bfd5369ddc610", // the email report screenshot
            "/#/6a41837e902bfd5369ddc610/analytics/sessions",
            "/#/manage/users",
            "/",
            "",
            "?ssr=true",
            "//assets/x" // a path on our own host, not a protocol relative url
        ];
        HOSTS.forEach(function(host) {
            allowed.forEach(function(view) {
                it("allows " + JSON.stringify(view) + " on " + host, function() {
                    // and returns the concatenation unchanged, so a configured
                    // countlyConfig.path keeps working exactly as it did before
                    render.sameOriginView(host, view).should.equal(host + view);
                });
            });
        });
    });

    it("does not treat a configured path prefix as part of the host", function() {
        // with a path prefix the same payloads land in the path, where they are harmless,
        // and the url is still the one the renderer would have opened before
        render.sameOriginView("http://localhost/countly", "@169.254.169.254/latest/")
            .should.equal("http://localhost/countly@169.254.169.254/latest/");
    });

    it("refuses a view that is not a string", function() {
        should.not.exist(render.sameOriginView("http://localhost", undefined));
        should.not.exist(render.sameOriginView("http://localhost", null));
        should.not.exist(render.sameOriginView("http://localhost", {}));
        should.not.exist(render.sameOriginView("http://localhost", 5));
    });

    it("refuses everything when the configured host cannot be parsed", function() {
        should.not.exist(render.sameOriginView("not a url", "/#/dashboard"));
        should.not.exist(render.sameOriginView("", "/#/dashboard"));
    });

    it("refuses a host whose origin is opaque, so two opaque origins cannot match", function() {
        // a protocol other than http(s) serialises its origin as "null"
        should.not.exist(render.sameOriginView("file://localhost", "/#/dashboard"));
    });
});
