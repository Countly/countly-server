require("should");
var plugins = require("../../plugins/pluginManager.js");

// Configuration values that hold credentials rather than settings are marked with
// setSecretConfigs(). Marking one masks it wherever configuration is returned to a
// caller who is not a global admin, and drops it from the values serialized into the
// dashboard page.
//
// The two invariants that matter:
//  - getConfig() is unaffected, or server code would start authenticating with the
//    placeholder instead of the password;
//  - the input object is never mutated, or masking one response would corrupt the
//    live configuration for everything else.
describe("pluginManager secret configs", function() {
    before(function() {
        plugins.setConfigs("unittest_secret", {
            limit: 10,
            enabled: true,
            proxy_password: "REAL_PASSWORD",
            api_key: "REAL_KEY",
            site_key: "public-site-key",
            unset_secret: ""
        });
        plugins.setSecretConfigs("unittest_secret", {
            proxy_password: true,
            api_key: true,
            unset_secret: true
        });
    });

    describe("isSecretConfig", function() {
        it("is true only for marked keys", function() {
            plugins.isSecretConfig("unittest_secret", "proxy_password").should.equal(true);
            plugins.isSecretConfig("unittest_secret", "api_key").should.equal(true);
        });
        it("is false for unmarked keys in the same namespace", function() {
            plugins.isSecretConfig("unittest_secret", "limit").should.equal(false);
            plugins.isSecretConfig("unittest_secret", "site_key").should.equal(false);
        });
        it("is false for an unknown namespace", function() {
            plugins.isSecretConfig("unittest_no_such_namespace", "proxy_password").should.equal(false);
        });
        it("is false for inherited Object.prototype keys", function() {
            plugins.isSecretConfig("unittest_secret", "constructor").should.equal(false);
            plugins.isSecretConfig("unittest_secret", "toString").should.equal(false);
            plugins.isSecretConfig("constructor", "constructor").should.equal(false);
        });
    });

    describe("getConfig", function() {
        it("still returns the real value, so server code keeps working", function() {
            var conf = plugins.getConfig("unittest_secret");
            conf.proxy_password.should.equal("REAL_PASSWORD");
            conf.api_key.should.equal("REAL_KEY");
        });
    });

    describe("maskSecretConfigs", function() {
        it("masks marked values and leaves the rest alone", function() {
            var masked = plugins.maskSecretConfigs({unittest_secret: plugins.getConfig("unittest_secret")});
            masked.unittest_secret.proxy_password.should.not.equal("REAL_PASSWORD");
            masked.unittest_secret.api_key.should.not.equal("REAL_KEY");
            masked.unittest_secret.limit.should.equal(10);
            masked.unittest_secret.enabled.should.equal(true);
            masked.unittest_secret.site_key.should.equal("public-site-key");
        });
        it("does not modify the object it was given", function() {
            var input = {unittest_secret: plugins.getConfig("unittest_secret")};
            plugins.maskSecretConfigs(input);
            input.unittest_secret.proxy_password.should.equal("REAL_PASSWORD");
        });
        it("leaves an unset secret empty, so 'not configured' stays visible", function() {
            var masked = plugins.maskSecretConfigs({unittest_secret: plugins.getConfig("unittest_secret")});
            masked.unittest_secret.unset_secret.should.equal("");
        });
        it("leaves namespaces it does not know untouched", function() {
            var masked = plugins.maskSecretConfigs({other: {password: "not marked"}});
            masked.other.password.should.equal("not marked");
        });
        it("tolerates a non-object namespace value", function() {
            var masked = plugins.maskSecretConfigs({a: null, b: "str", c: [1, 2]});
            (masked.a === null).should.equal(true);
            masked.b.should.equal("str");
            masked.c.should.eql([1, 2]);
        });
        it("masks every marked key, not just the first", function() {
            var masked = plugins.maskSecretConfigs({unittest_secret: plugins.getConfig("unittest_secret")});
            masked.unittest_secret.proxy_password.should.equal(masked.unittest_secret.api_key);
        });
    });

    describe("omitSecretConfigs", function() {
        it("removes marked keys entirely rather than masking them", function() {
            var exposed = plugins.omitSecretConfigs("unittest_secret", plugins.getConfig("unittest_secret"));
            exposed.should.not.have.property("proxy_password");
            exposed.should.not.have.property("api_key");
            exposed.should.have.property("limit", 10);
            exposed.should.have.property("site_key", "public-site-key");
        });
        it("does not modify the object it was given", function() {
            var conf = plugins.getConfig("unittest_secret");
            plugins.omitSecretConfigs("unittest_secret", conf);
            conf.proxy_password.should.equal("REAL_PASSWORD");
        });
        it("returns a namespace with no secrets unchanged in content", function() {
            var exposed = plugins.omitSecretConfigs("unittest_no_such_namespace", {a: 1, b: 2});
            exposed.should.eql({a: 1, b: 2});
        });
        it("tolerates a missing config object", function() {
            (plugins.omitSecretConfigs("unittest_secret", null) === null).should.equal(true);
            (typeof plugins.omitSecretConfigs("unittest_secret", undefined)).should.equal("undefined");
        });
    });

    describe("setReadableConfigs / filterReadableConfigs", function() {
        before(function() {
            plugins.setConfigs("unittest_readable", {
                needed: 1,
                also_needed: "yes",
                not_needed: "internal",
                brand_new_api_key: "NOBODY_MARKED_THIS"
            });
            plugins.setReadableConfigs("unittest_readable", {
                needed: true,
                also_needed: true
            });
        });

        it("returns declared values", function() {
            var out = plugins.filterReadableConfigs({unittest_readable: plugins.getConfig("unittest_readable")});
            out.unittest_readable.should.have.property("needed", 1);
            out.unittest_readable.should.have.property("also_needed", "yes");
        });
        it("withholds anything not declared", function() {
            var out = plugins.filterReadableConfigs({unittest_readable: plugins.getConfig("unittest_readable")});
            out.unittest_readable.should.not.have.property("not_needed");
        });
        it("withholds a newly added credential nobody marked secret", function() {
            // the point of the allow-list. Marking secrets is the other direction and
            // leaks until someone remembers; this leaks only if someone opts in.
            var out = plugins.filterReadableConfigs({unittest_readable: plugins.getConfig("unittest_readable")});
            out.unittest_readable.should.not.have.property("brand_new_api_key");
        });
        it("drops a namespace with nothing declared, rather than returning it empty", function() {
            var out = plugins.filterReadableConfigs({unittest_undeclared_ns: {a: 1, b: 2}});
            out.should.not.have.property("unittest_undeclared_ns");
        });
        it("does not modify the object it was given", function() {
            var input = {unittest_readable: plugins.getConfig("unittest_readable")};
            plugins.filterReadableConfigs(input);
            input.unittest_readable.should.have.property("not_needed", "internal");
        });
        it("is false for inherited Object.prototype keys", function() {
            plugins.isReadableConfig("unittest_readable", "constructor").should.equal(false);
            plugins.isReadableConfig("constructor", "needed").should.equal(false);
        });
        it("tolerates non-object namespace values", function() {
            var out = plugins.filterReadableConfigs({a: null, b: "str", c: [1]});
            Object.keys(out).length.should.equal(0);
        });
    });

    describe("the two mechanisms together", function() {
        before(function() {
            plugins.setConfigs("unittest_both", {shown: 1, credential: "REAL_VALUE"});
            plugins.setSecretConfigs("unittest_both", {credential: true});
        });

        it("masks a credential even when it is wrongly declared readable", function() {
            // the allow-list is the control and the mask is the backstop, so declaring a
            // credential readable by mistake still does not hand out its value
            plugins.setReadableConfigs("unittest_both", {shown: true, credential: true});
            var out = plugins.maskSecretConfigs(plugins.filterReadableConfigs({unittest_both: plugins.getConfig("unittest_both")}));
            out.unittest_both.should.have.property("shown", 1);
            out.unittest_both.credential.should.not.equal("REAL_VALUE");
        });
    });

    // The core declarations are in api/utils/configMetadata.js rather than in
    // api/api.js, precisely so a second process can make them too, and that also makes
    // them loadable from here. This is the regression it guards: the metadata is
    // process local, so registering only from api/api.js left the dashboard's
    // omitSecretConfigs() with nothing registered to omit, and the stored proxy
    // credentials went into the page source served to every logged in user.
    //
    // What the plugins declare is still not asserted here: a unit test requiring
    // pluginManager directly never loads the plugin modules, so those assertions would
    // pass or fail for the wrong reason. That belongs in plugins/plugins/tests.js,
    // which runs against a started server.
    describe("core configuration metadata", function() {
        before(function() {
            require("../../api/utils/configMetadata.js").register(plugins);
        });

        it("marks the outbound proxy credentials secret", function() {
            plugins.isSecretConfig("security", "proxy_username").should.equal(true);
            plugins.isSecretConfig("security", "proxy_password").should.equal(true);
        });

        it("drops them from what the dashboard puts in the page, keeping the password policy", function() {
            // the call frontend/express/app.js makes when it renders countlyGlobal.security
            var exposed = plugins.omitSecretConfigs("security", {
                password_min: 8,
                password_char: true,
                proxy_username: "operator",
                proxy_password: "REAL_PASSWORD"
            });
            exposed.should.have.property("password_min", 8);
            exposed.should.have.property("password_char", true);
            exposed.should.not.have.property("proxy_username");
            exposed.should.not.have.property("proxy_password");
        });

        it("is registered by every entry point, not just the API", function() {
            // the regression itself: the dashboard is a separate process with its own
            // pluginManager, so a declaration made only in api/api.js does not exist
            // there and its omitSecretConfigs() call has nothing to omit
            var fs = require("fs");
            var path = require("path");
            var root = path.resolve(__dirname, "../..");
            ["api/api.js", "frontend/express/app.js"].forEach(function(entry) {
                var src = fs.readFileSync(path.join(root, entry), "utf8");
                src.should.match(/configMetadata\.js'\)\.register\(plugins\)/);
            });
        });

        it("declares the password policy readable, and nothing else in the namespace", function() {
            var readable = plugins.filterReadableConfigs({
                security: {
                    password_min: 8,
                    proxy_username: "operator",
                    login_tries: 3
                }
            });
            readable.security.should.have.property("password_min", 8);
            readable.security.should.not.have.property("proxy_username");
            readable.security.should.not.have.property("login_tries");
        });
    });
});
