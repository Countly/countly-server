var should = require("should");
var common = require("../../api/utils/common");

/**
 * Minimal stand-in for the parts of an express response the widget routes
 * touch, recording what ends up on the wire.
 * @param {Object} initialHeaders - headers already set by earlier middleware
 * @returns {Object} fake response object
 */
function fakeRes(initialHeaders) {
    var headers = {};
    Object.keys(initialHeaders || {}).forEach(function(name) {
        headers[name.toLowerCase()] = initialHeaders[name];
    });
    return {
        headers: headers,
        setHeader: function(name, value) {
            headers[name.toLowerCase()] = value;
        },
        getHeader: function(name) {
            return headers[name.toLowerCase()];
        },
        removeHeader: function(name) {
            delete headers[name.toLowerCase()];
        },
        get: function(name) {
            return headers[name.toLowerCase()];
        }
    };
}

/**
 * Build an app document carrying the given allowed origin list.
 * @param {String} allowedOrigins - newline separated origin list
 * @returns {Object} app document
 */
function appWithOrigins(allowedOrigins) {
    return {plugins: {allow_access_control_origin: allowedOrigins}};
}

describe("Widget frame-ancestors headers", function() {
    describe("buildFrameAncestorsPolicy", function() {
        it("should return null when nothing is configured", function() {
            should.equal(common.buildFrameAncestorsPolicy(undefined), null);
            should.equal(common.buildFrameAncestorsPolicy(null), null);
            should.equal(common.buildFrameAncestorsPolicy(""), null);
            should.equal(common.buildFrameAncestorsPolicy("   "), null);
            should.equal(common.buildFrameAncestorsPolicy("\n\n"), null);
        });

        it("should not accept a non string list", function() {
            should.equal(common.buildFrameAncestorsPolicy(["https://example.com"]), null);
            should.equal(common.buildFrameAncestorsPolicy({}), null);
            should.equal(common.buildFrameAncestorsPolicy(42), null);
        });

        it("should build the directive for a single origin", function() {
            common.buildFrameAncestorsPolicy("https://example.com")
                .should.eql("frame-ancestors 'self' https://example.com");
        });

        it("should build the directive for several origins", function() {
            common.buildFrameAncestorsPolicy("https://example.com\nhttps://shop.example.com\nhttp://localhost:8080")
                .should.eql("frame-ancestors 'self' https://example.com https://shop.example.com http://localhost:8080");
        });

        it("should accept the CRLF and CR line endings the config field can contain", function() {
            common.buildFrameAncestorsPolicy("https://a.example.com\r\nhttps://b.example.com\rhttps://c.example.com")
                .should.eql("frame-ancestors 'self' https://a.example.com https://b.example.com https://c.example.com");
        });

        it("should tolerate surrounding whitespace, blank lines and a trailing slash", function() {
            common.buildFrameAncestorsPolicy("  https://example.com/  \n\n\thttps://other.example.com\n")
                .should.eql("frame-ancestors 'self' https://example.com https://other.example.com");
        });

        it("should keep non http schemes used by hybrid app webviews", function() {
            common.buildFrameAncestorsPolicy("capacitor://localhost\nionic://localhost")
                .should.eql("frame-ancestors 'self' capacitor://localhost ionic://localhost");
        });

        it("should keep a bracketed IPv6 host with a port", function() {
            common.buildFrameAncestorsPolicy("http://[::1]:6001")
                .should.eql("frame-ancestors 'self' http://[::1]:6001");
        });

        it("should skip malformed entries and keep the good ones", function() {
            common.buildFrameAncestorsPolicy([
                "https://good.example.com",
                "not-an-origin",
                "https://bad.example.com/some/path",
                "https://query.example.com?a=b",
                "https://fragment.example.com#x",
                "https://space.example.com other.example.com",
                "https://semicolon.example.com; script-src *",
                "example.com",
                "//example.com",
                "https://",
                "*",
                "https://*.example.com",
                "'self'",
                "javascript:alert(1)",
                "https://still-good.example.com:8443"
            ].join("\n")).should.eql("frame-ancestors 'self' https://good.example.com https://still-good.example.com:8443");
        });

        it("should omit the directive when every entry is malformed", function() {
            //a list of wildcards or typos must not collapse into a policy that
            //blocks everything, so it has to behave exactly like an empty list
            should.equal(common.buildFrameAncestorsPolicy("*"), null);
            should.equal(common.buildFrameAncestorsPolicy("https://*.example.com\n*\nexample.com"), null);
            should.equal(common.buildFrameAncestorsPolicy("'none'"), null);
        });

        it("should not repeat a duplicated origin", function() {
            common.buildFrameAncestorsPolicy("https://example.com\nhttps://example.com/\n https://example.com ")
                .should.eql("frame-ancestors 'self' https://example.com");
        });

        it("should always allow the dashboard's own origin to frame the widget", function() {
            //the dashboard previews these same routes in an iframe, and an
            //allowed-origins list describes customer sites, not the Countly host
            common.buildFrameAncestorsPolicy("https://example.com").should.containEql("'self'");
            common.buildFrameAncestorsPolicy("https://a.example.com\nhttps://b.example.com").should.containEql("'self'");
        });
    });

    describe("setWidgetFrameHeaders", function() {
        it("should omit the CSP header when the app has no list configured", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, appWithOrigins(""));
            should.not.exist(res.getHeader("Content-Security-Policy"));
        });

        it("should omit the CSP header when the app has no plugins object at all", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, {});
            should.not.exist(res.getHeader("Content-Security-Policy"));
        });

        it("should omit the CSP header when the app could not be resolved", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, null);
            should.not.exist(res.getHeader("Content-Security-Policy"));
        });

        it("should set the CSP header for a single configured origin", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, appWithOrigins("https://example.com"));
            res.getHeader("Content-Security-Policy").should.eql("frame-ancestors 'self' https://example.com");
        });

        it("should set the CSP header for several configured origins", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, appWithOrigins("https://example.com\nhttps://shop.example.com"));
            res.getHeader("Content-Security-Policy")
                .should.eql("frame-ancestors 'self' https://example.com https://shop.example.com");
        });

        it("should skip malformed entries when setting the header", function() {
            var res = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(res, appWithOrigins("https://example.com\nnot-an-origin\nhttps://ok.example.com"));
            res.getHeader("Content-Security-Policy")
                .should.eql("frame-ancestors 'self' https://example.com https://ok.example.com");
        });

        it("should remove X-Frame-Options whether or not a policy is emitted", function() {
            var withList = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(withList, appWithOrigins("https://example.com"));
            should.not.exist(withList.getHeader("X-Frame-Options"));

            var withoutList = fakeRes({"X-Frame-Options": "deny"});
            common.setWidgetFrameHeaders(withoutList, appWithOrigins(""));
            should.not.exist(withoutList.getHeader("X-Frame-Options"));

            var unresolved = fakeRes({"X-Frame-Options": "sameorigin"});
            common.setWidgetFrameHeaders(unresolved, null);
            should.not.exist(unresolved.getHeader("X-Frame-Options"));
        });

        it("should merge into a Content-Security-Policy an operator already configured", function() {
            var res = fakeRes({"Content-Security-Policy": "default-src 'self'"});
            common.setWidgetFrameHeaders(res, appWithOrigins("https://example.com"));
            res.getHeader("Content-Security-Policy")
                .should.eql("default-src 'self'; frame-ancestors 'self' https://example.com");
        });

        it("should not duplicate frame-ancestors when the existing policy already scopes framing", function() {
            var res = fakeRes({"Content-Security-Policy": "frame-ancestors https://operator.example.com"});
            common.setWidgetFrameHeaders(res, appWithOrigins("https://example.com"));
            res.getHeader("Content-Security-Policy")
                .should.eql("frame-ancestors https://operator.example.com");
        });

        it("should not throw on a response object that cannot carry headers", function() {
            should.doesNotThrow(function() {
                common.setWidgetFrameHeaders(null, appWithOrigins("https://example.com"));
                common.setWidgetFrameHeaders({}, appWithOrigins("https://example.com"));
            });
        });
    });

    describe("getAppForWidget", function() {
        /**
         * Stub of the countly db object exposing a single apps collection.
         * @param {Object} appDoc - document the apps collection returns
         * @param {Object} findErr - error the apps collection returns
         * @returns {Object} fake db object plus a record of the queries made
         */
        function fakeDb(appDoc, findErr) {
            var queries = [];
            return {
                queries: queries,
                ObjectID: function(id) {
                    return {oid: id};
                },
                collection: function(name) {
                    return {
                        findOne: function(query, options, callback) {
                            queries.push({name: name, query: query, options: options});
                            callback(findErr || null, appDoc);
                        }
                    };
                }
            };
        }

        it("should resolve the app and only read the origin list", function(done) {
            var db = fakeDb(appWithOrigins("https://example.com"));
            common.getAppForWidget(db, "5f8e1a2b3c4d5e6f7a8b9c0d", function(app) {
                app.plugins.allow_access_control_origin.should.eql("https://example.com");
                db.queries.length.should.eql(1);
                db.queries[0].name.should.eql("apps");
                db.queries[0].options.projection.should.eql({"plugins.allow_access_control_origin": 1});
                done();
            });
        });

        it("should not query the database for an app id that is not an object id", function(done) {
            var db = fakeDb(appWithOrigins("https://example.com"));
            common.getAppForWidget(db, "../../etc/passwd", function(app) {
                should.equal(app, null);
                db.queries.length.should.eql(0);
                done();
            });
        });

        it("should resolve to null for a missing app id or db", function(done) {
            common.getAppForWidget(fakeDb(null), undefined, function(app) {
                should.equal(app, null);
                common.getAppForWidget(null, "5f8e1a2b3c4d5e6f7a8b9c0d", function(app2) {
                    should.equal(app2, null);
                    done();
                });
            });
        });

        it("should resolve to null when the lookup errors or finds nothing", function(done) {
            common.getAppForWidget(fakeDb(null, new Error("boom")), "5f8e1a2b3c4d5e6f7a8b9c0d", function(app) {
                should.equal(app, null);
                common.getAppForWidget(fakeDb(null), "5f8e1a2b3c4d5e6f7a8b9c0d", function(app2) {
                    should.equal(app2, null);
                    done();
                });
            });
        });
    });
});
