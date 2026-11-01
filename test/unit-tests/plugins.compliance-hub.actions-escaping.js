var should = require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// The export/purge history datatable builds an HTML string in onReady and the template renders it
// with v-html (plugins/compliance-hub/frontend/public/templates/exportHistory.html). Everything
// interpolated into that string therefore has to be HTML-safe already.
//
// Two opposite mistakes are possible and this file guards both directions:
//
//  1. NOT escaping the app name. It is read from countlyGlobal, which express-expose serializes
//     into the dashboard's inline script island. That serializer escapes for the JavaScript string
//     context only and is deliberately value-preserving, so the value arrives raw. An app admin can
//     set their own app's name, and a global admin's dashboard lists every app, so an unescaped name
//     is a stored cross-user XSS.
//  2. Escaping the values that came from the API. Those already went through
//     common.escape_html_entities in common.returnOutput, so escaping them again would render the
//     entities literally in the UI.
var SRC = path.resolve(__dirname, "../../plugins/compliance-hub/frontend/public/javascripts/countly.models.js");

/**
 * Load countly.models.js in a sandbox and hand back the onReady callbacks it registers,
 * keyed by data-table name.
 * @param {object} apps - the countlyGlobal.apps map the module should see
 * @returns {object} map of resource name to its onReady function
 */
function loadResources(apps) {
    var resources = {};
    var noop = function() {};
    // matches countlyCommon.encodeHtml, which is `div.innerText = x; return div.innerHTML`:
    // the text-node serializer escapes &, < and > and leaves quotes alone.
    var encodeHtml = function(html) {
        return (html + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    var sandbox = {
        window: {},
        countlyCommon: {
            encodeHtml: encodeHtml,
            formatTimeAgoText: function() {
                return { text: "just now" };
            },
            getDescendantProp: noop,
            API_PARTS: { data: { r: "/o" } },
            ACTIVE_APP_ID: "5f1a2b3c4d5e6f0011223344",
            periodObj: {},
            getPeriodForAjax: function() {
                return "30days";
            }
        },
        CountlyHelpers: { createMetricModel: noop },
        jQuery: { i18n: { map: { "systemlogs.for-app": "For app", "systemlogs.for-appuser": "For app user", "systemlogs.action.export": "Data exported" } } },
        CV: {
            i18n: function(k) {
                return k;
            }
        },
        countlyGlobal: { apps: apps },
        countlyTaskManager: {},
        countlyVue: {
            vuex: {
                ServerDataTable: function(name, cfg) {
                    resources[name] = cfg.onReady;
                    return { name: name };
                },
                Module: function() {
                    return {};
                },
                MutationsFor: noop,
                ActionsFor: noop
            }
        }
    };
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(SRC, "utf8"), sandbox, { filename: SRC });
    return resources;
}

describe("compliance-hub export history actions escaping", function() {
    var APP_ID = "5f1a2b3c4d5e6f0011223344";

    /**
     * Run the export-history onReady over a single row.
     * @param {string} appName - the app name countlyGlobal should carry
     * @param {object} i - the row's "i" payload
     * @returns {string} the built actions HTML
     */
    function actionsFor(appName, i) {
        var apps = {};
        apps[APP_ID] = { name: appName };
        var onReady = loadResources(apps).exportHistoryDataResource;
        should.exist(onReady);
        var rows = onReady({}, [{ a: "export", ts: 0, i: i || { app_id: APP_ID } }]);
        return rows[0].actions;
    }

    it("escapes an app name that carries a tag", function(done) {
        var actions = actionsFor('<img src=x onerror="alert(1)">');
        actions.indexOf("<img").should.equal(-1);
        actions.should.containEql("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;".replace(/&quot;/g, '"'));
        done();
    });

    it("escapes an app name that closes the surrounding tag", function(done) {
        var actions = actionsFor("</p><script>alert(1)</script>");
        actions.indexOf("<script").should.equal(-1);
        actions.indexOf("</script>").should.equal(-1);
        done();
    });

    it("leaves no raw angle bracket from the app name", function(done) {
        var actions = actionsFor("<svg onload=alert(1)>");
        // the only markup left must be the <p> wrappers this builder emits itself
        actions.replace(/<\/?p[^>]*>/g, "").indexOf("<").should.equal(-1);
        done();
    });

    it("keeps an ordinary app name readable", function(done) {
        var actions = actionsFor("My Application");
        actions.should.containEql("For app: My Application");
        done();
    });

    it("does not double-escape values the API already escaped", function(done) {
        // returnOutput turns ' into &#39;; escaping again would surface "&amp;#39;" in the UI
        var actions = actionsFor("My Application", { app_id: APP_ID, appuser_id: "user&#39;s-id" });
        actions.should.containEql("user&#39;s-id");
        actions.indexOf("&amp;#39;").should.equal(-1);
        done();
    });
});
