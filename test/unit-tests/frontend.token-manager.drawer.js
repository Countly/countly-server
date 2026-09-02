var should = require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// The token drawer decides what a token is asked for: which features it implies, what the
// column headers report, and the permission object that reaches /i/token/create. That logic
// is plain JavaScript inside the view file, so it is loaded here in a sandbox with the
// globals the dashboard provides, and exercised directly - no browser, no Vue.

var ROOT = path.join(__dirname, "../..");
var AUTH = path.join(ROOT, "frontend/express/public/javascripts/countly/countly.auth.js");
var VIEWS = path.join(ROOT, "frontend/express/public/core/token-manager/javascripts/countly.views.js");

/**
 * Load the view file with stubbed dashboard globals and hand back what it registered.
 * @returns {object} {drawer, created} - the drawer component options and the create calls made
 */
function loadDrawer() {
    var components = [];
    var created = [];
    var jq = function() {
        return {};
    };
    jq.i18n = {map: {}};
    jq.when = function() {
        return {then: function() {}};
    };
    jq.ajax = function() {
        return {};
    };
    var sandbox = {
        window: {},
        console: console,
        $: jq,
        countlyGlobal: {apps: {}, member: {}, defaultApp: {_id: "app"}},
        countlyCommon: {API_URL: "", ACTIVE_APP_ID: "app"},
        CV: {
            T: function(name) {
                return name;
            },
            i18n: function(key) {
                return key;
            }
        },
        CountlyHelpers: {alert: function() {}, confirm: function() {}},
        countlyTokenManager: {
            createTokenWithPermissions: function(options, callback) {
                created.push(options);
                callback(null, {});
            },
            deleteToken: function() {}
        },
        countlyUserManagement: {
            fetchFeatures: function() {
                return {};
            },
            getFeatures: function() {
                return [];
            }
        },
        countlyVue: {
            views: {
                create: function(options) {
                    components.push(options);
                    return options;
                },
                BackboneWrapper: function() {}
            },
            mixins: {auth: function() {}, i18n: {}, hasDrawers: function() {}},
            container: {registerData: function() {}}
        },
        app: {route: function() {}, addPageScript: function() {}}
    };
    sandbox.window.countlyAuth = {};
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(AUTH, "utf8"), sandbox, {filename: AUTH});
    sandbox.countlyAuth = sandbox.window.countlyAuth;
    vm.runInContext(fs.readFileSync(VIEWS, "utf8"), sandbox, {filename: VIEWS});
    return {drawer: components[0], created: created, sandbox: sandbox};
}

/**
 * A drawer instance: its own data, its methods, and the $set Vue would provide.
 * @param {object} drawer - component options
 * @param {string[]} features - the feature list the drawer loaded
 * @returns {object} something the methods can be called on
 */
function instance(drawer, features) {
    var self = drawer.data();
    Object.keys(drawer.methods).forEach(function(name) {
        self[name] = drawer.methods[name].bind(self);
    });
    self.$set = function(obj, key, value) {
        obj[key] = value;
    };
    self.$emit = function() {};
    self.features = features || [];
    self.filteredFeatures = self.features;
    return self;
}

/**
 * Feature names allowed for one access type.
 * @param {object} permissionSet - the drawer's permission set
 * @param {string} type - access type
 * @returns {string[]} allowed feature names, sorted
 */
function allowed(permissionSet, type) {
    return Object.keys(permissionSet[type].allowed).filter(function(feature) {
        return permissionSet[type].allowed[feature] === true;
    }).sort();
}

var FEATURES = ["core", "events", "crashes"];

describe("token manager drawer", function() {
    var loaded = loadDrawer();

    describe("feature permissions", function() {
        it("grants read alongside anything else, since nothing is usable without it", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.permissionSet.u.allowed.events = true;
            vue.setPermissionByFeature("u", "events");
            allowed(vue.permissionSet, "r").should.eql(["events"]);
            allowed(vue.permissionSet, "u").should.eql(["events"]);
        });

        it("takes everything away with read, since nothing survives without it", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.permissionSet.u.allowed.events = true;
            vue.setPermissionByFeature("u", "events");
            //the checkbox has already written false before the handler runs
            vue.permissionSet.r.allowed.events = false;
            vue.setPermissionByFeature("r", "events");
            allowed(vue.permissionSet, "r").should.eql([]);
            allowed(vue.permissionSet, "u").should.eql([]);
        });
    });

    describe("column headers", function() {
        it("apply to every feature when nothing is filtered out", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.allByType.r = true;
            vue.setPermissionByType("r");
            allowed(vue.permissionSet, "r").should.eql(FEATURES.slice().sort());
            //every feature is selected, so this may be sent as an "all" grant
            vue.permissionSet.r.all.should.equal(true);
            vue.allByType.r.should.equal(true);
        });

        it("apply only to the features on screen, and say so", function() {
            //the regression: reading the header off the full list left it ticked after a
            //filtered toggle, so the header claimed a whole column that was not granted
            var vue = instance(loaded.drawer, FEATURES);
            vue.filteredFeatures = ["events"];
            vue.allByType.u = true;
            vue.setPermissionByType("u");
            allowed(vue.permissionSet, "u").should.eql(["events"]);
            //the header describes what is on screen, and every row on screen is granted
            vue.allByType.u.should.equal(true);
            //but the grant is not "all", which would cover features that were never shown
            vue.permissionSet.u.all.should.equal(false);
        });

        it("stop claiming a column once the filter that made it true is cleared", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.searchQuery = "events";
            vue.search();
            vue.allByType.u = true;
            vue.setPermissionByType("u");
            vue.allByType.u.should.equal(true);
            vue.clearSearch();
            vue.allByType.u.should.equal(false);
            allowed(vue.permissionSet, "u").should.eql(["events"]);
        });
    });

    describe("what is sent to the server", function() {
        it("asks for a permission object for a limited token, and never login with it", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.tokenUsage = "1";
            vue.permissionSet.r.allowed.core = true;
            vue.setPermissionByFeature("r", "core");
            loaded.created.length = 0;
            vue.onSubmit({description: "d", checkboxMultipleTimes: true, checkboxCanLogin: true, selectApps: ["appone"]});
            //objects built inside the sandbox carry the sandbox's prototypes, so they are
            //asserted through should() and compared as plain data
            var sent = loaded.created[0];
            should(sent).have.property("permission");
            //login is a property of an unlimited token only, so it is not even offered here
            should(sent).not.have.property("canLogin");
            should(JSON.parse(JSON.stringify(sent.permission._.u))).eql([["appone"]]);
            sent.permission.r.appone.allowed.core.should.equal(true);
            Object.keys(sent.permission).sort().should.eql(["_", "c", "d", "r", "u"]);
        });

        it("sends no permission for a token with the creator's own access, and passes login on", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.tokenUsage = "0";
            loaded.created.length = 0;
            vue.onSubmit({description: "d", checkboxMultipleTimes: false, checkboxCanLogin: true, selectApps: []});
            var sent = loaded.created[0];
            should(sent).not.have.property("permission");
            sent.canLogin.should.equal(true);
        });

        it("does not ask for login unless it was ticked", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.tokenUsage = "0";
            loaded.created.length = 0;
            vue.onSubmit({description: "d", checkboxMultipleTimes: false, checkboxCanLogin: false, selectApps: []});
            loaded.created[0].canLogin.should.equal(false);
        });

        it("grants every selected app the same permissions", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.tokenUsage = "1";
            vue.permissionSet.d.allowed.crashes = true;
            vue.setPermissionByFeature("d", "crashes");
            loaded.created.length = 0;
            vue.onSubmit({description: "d", checkboxMultipleTimes: true, selectApps: ["appone", "apptwo"]});
            var permission = loaded.created[0].permission;
            permission.d.appone.allowed.crashes.should.equal(true);
            permission.d.apptwo.allowed.crashes.should.equal(true);
            //delete implied read, and the implication travelled to both apps
            permission.r.apptwo.allowed.crashes.should.equal(true);
        });
    });

    describe("closing the drawer", function() {
        it("leaves nothing of the previous token behind", function() {
            var vue = instance(loaded.drawer, FEATURES);
            vue.tokenUsage = "1";
            vue.searchQuery = "events";
            vue.search();
            vue.allByType.r = true;
            vue.setPermissionByType("r");
            vue.onClose();
            vue.tokenUsage.should.equal("0");
            vue.searchQuery.should.equal("");
            should(JSON.parse(JSON.stringify(vue.filteredFeatures))).eql(FEATURES);
            allowed(vue.permissionSet, "r").should.eql([]);
            should(JSON.parse(JSON.stringify(vue.allByType))).eql({c: false, r: false, u: false, d: false});
        });
    });
});
