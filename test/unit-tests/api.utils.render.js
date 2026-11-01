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

// The navigation check above bounds where the renderer goes. This second control bounds
// what the rendered page may then fetch, and it has to leave room for the off-origin
// assets a dashboard legitimately uses: countlyConfig.cdn moves the core styles and
// scripts to a CDN, and the map widgets fetch OpenStreetMap tiles. Aborting those leaves
// screenshots unstyled or the map blank, and a CDN deployment cannot bootstrap at all.
describe("render asset origin allowlist", function() {
    var countlyConfig = require("../../api/config.js");

    afterEach(function() {
        delete countlyConfig.render;
    });

    it("allows the dashboard origin itself, once", function() {
        var origins = render.renderAssetOrigins("https://dash.example.com:8443/countly");
        origins.should.containEql("https://dash.example.com:8443");
        origins.filter(function(o) {
            return o === "https://dash.example.com:8443";
        }).length.should.equal(1);
    });

    it("allows the map tile provider the shipped dashboard requests", function() {
        // vis.js asks for https://{s}.tile.openstreetmap.org/... and passes no subdomains
        // option, so leaflet expands {s} to a, b and c
        var origins = render.renderAssetOrigins("http://localhost");
        ["a", "b", "c"].forEach(function(sub) {
            origins.should.containEql("https://" + sub + ".tile.openstreetmap.org");
        });
    });

    it("allows origins the operator configures, given as an origin or as any url on it", function() {
        countlyConfig.render = {
            allowedOrigins: [
                "https://tiles.example.com",
                "https://assets.example.com/countly/build/main.css"
            ]
        };
        var origins = render.renderAssetOrigins("http://localhost");
        origins.should.containEql("https://tiles.example.com");
        origins.should.containEql("https://assets.example.com");
    });

    it("ignores a configured value that names no origin, rather than allowing everything", function() {
        countlyConfig.render = {allowedOrigins: ["/relative/path", "", "not a url", null]};
        var origins = render.renderAssetOrigins("http://localhost");
        origins.should.containEql("http://localhost");
        origins.indexOf(null).should.equal(-1);
        origins.forEach(function(origin) {
            origin.should.be.a.String();
        });
    });

    it("survives a configured value that is not an array", function() {
        countlyConfig.render = {allowedOrigins: "https://tiles.example.com"};
        render.renderAssetOrigins("http://localhost").should.containEql("http://localhost");
    });

    it("returns nothing at all when the dashboard host cannot be parsed", function() {
        // the caller logs and every request is then refused, rather than the empty
        // allowlist quietly turning into "allow anything"
        render.renderAssetOrigins("not a host").should.eql([]);
    });

    it("allows the configured cdn, which a dashboard loads its core assets from", function() {
        // dashboard.html prefixes every core stylesheet and script with countlyConfig.cdn,
        // so a deployment that sets it cannot bootstrap the page at all if this is refused
        var frontendConfig = require("../../frontend/express/config.js");
        var was = frontendConfig.cdn;
        frontendConfig.cdn = "https://cdn.example.com/countly/";
        try {
            render.renderAssetOrigins("http://localhost").should.containEql("https://cdn.example.com");
        }
        finally {
            frontendConfig.cdn = was;
        }
    });

    it("adds nothing for a relative cdn, which is already the dashboard origin", function() {
        var frontendConfig = require("../../frontend/express/config.js");
        var was = frontendConfig.cdn;
        frontendConfig.cdn = "";
        try {
            render.renderAssetOrigins("http://localhost").should.eql(
                ["http://localhost"].concat([
                    "https://a.tile.openstreetmap.org",
                    "https://b.tile.openstreetmap.org",
                    "https://c.tile.openstreetmap.org",
                    "https://tile.openstreetmap.org"
                ]));
        }
        finally {
            frontendConfig.cdn = was;
        }
    });

    it("does not allow an unrelated origin", function() {
        var origins = render.renderAssetOrigins("http://localhost");
        origins.indexOf("http://169.254.169.254").should.equal(-1);
        origins.indexOf("http://localhost:8500").should.equal(-1);
        // a look alike of the tile provider is a different origin and stays out
        origins.indexOf("https://tile.openstreetmap.org.evil.example").should.equal(-1);
    });
});
