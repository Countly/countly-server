var should = require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// The old dashboard's banner, empty-state and in-page notification components take their
// message as a string prop. Messages are often built from data (an event or segment name
// the SDK sent), so the prop renders as text, and a caller whose message is trusted markup,
// such as a link in a localized string, asks for HTML with the html prop.
//
// The components are loaded with the Vue 2 build the dashboard ships and rendered to a
// virtual DOM, which needs no browser: a text node carries the message as text, while
// HTML shows up as an innerHTML DOM property.
describe("old dashboard text props", function() {
    var ROOT = path.join(__dirname, "../..");
    var sandbox = { console: console, module: { exports: {} }, setTimeout: setTimeout, clearTimeout: clearTimeout };
    sandbox.exports = sandbox.module.exports;
    vm.createContext(sandbox);
    // Vue picks browser mode when it sees window, so window is added only after it loads
    vm.runInContext(fs.readFileSync(path.join(ROOT, "frontend/express/public/javascripts/utils/vue/vue.min.js"), "utf8"), sandbox);
    var Vue = sandbox.module.exports;
    Vue.config.productionTip = false;
    Vue.config.devtools = false;
    Vue.config.silent = true;

    var messages = {
        "events.max-segmentation-limit": "Maximum limit of segmentations ({0}) in current event \"{1}\" has been reached. Limit can be adjusted."
    };
    var i18n = function(key) {
        var args = arguments;
        return (messages[key] || key).replace(/\{(\d+)\}/g, function(m, n) {
            return args[+n + 1];
        });
    };

    sandbox.Vue = Vue;
    sandbox.window = {};
    // the template compiler decodes entities in static template text through a div
    sandbox.document = {
        createElement: function() {
            var html = "";
            return {
                set innerHTML(value) {
                    html = value;
                },
                get textContent() {
                    return html.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
                }
            };
        }
    };
    sandbox.VueJsonPretty = { default: { render: function() {} } };
    sandbox.ElementTiptapPlugin = { install: function() {} };
    sandbox.countlyGlobal = { plugins: [], apps: {} };
    sandbox.countlyCommon = {
        unescapeHtml: function(s) {
            return s;
        }
    };
    sandbox.CountlyHelpers = { goTo: function() {} };
    sandbox.localStorage = {
        getItem: function() {
            return null;
        },
        setItem: function() {}
    };
    sandbox.$ = function() {
        return {};
    };
    sandbox.window.countlyVue = {
        components: {
            BaseComponent: Vue.extend({}),
            create: function(options) {
                return Vue.extend(options);
            }
        },
        mixins: { i18n: { methods: { i18n: i18n } }, commonFormatters: {}, BaseContent: Vue.extend({}) },
        i18n: i18n,
        T: function() {
            return "<div></div>";
        }
    };
    sandbox.CV = sandbox.window.countlyVue;
    vm.runInContext(fs.readFileSync(path.join(ROOT, "frontend/express/public/javascripts/countly/vue/components/helpers.js"), "utf8"), sandbox);

    var MARKUP = "<b>bold</b> & <i>x</i>";

    /**
     * Render a registered component to its virtual DOM.
     * @param {string} name - component name
     * @param {object} props - props to pass
     * @returns {object} root vnode
     */
    function render(name, props) {
        var Ctor = Vue.options.components[name];
        should.exist(Ctor, name + " is registered");
        if (!Ctor.options.render) {
            var compiled = Vue.compile(Ctor.options.template);
            Ctor.options.render = compiled.render;
            Ctor.options.staticRenderFns = compiled.staticRenderFns;
        }
        return new Ctor({ propsData: props })._render();
    }

    /**
     * Collect what a vnode tree would put on the page.
     * @param {object} vnode - root vnode
     * @returns {{text: string[], html: string[]}} text node contents and innerHTML values
     */
    function contents(vnode) {
        var out = { text: [], html: [] };
        (function walk(node) {
            if (!node) {
                return;
            }
            if (!node.tag && typeof node.text === "string" && node.text.trim()) {
                out.text.push(node.text.trim());
            }
            if (node.data && node.data.domProps && "innerHTML" in node.data.domProps) {
                out.html.push(node.data.domProps.innerHTML);
            }
            (node.children || []).forEach(walk);
        }(vnode));
        return out;
    }

    var cases = [
        { name: "cly-notification", prop: "text" },
        { name: "cly-in-page-notification", prop: "text" },
        { name: "cly-empty-home", prop: "body", extra: { title: "t" } },
        { name: "cly-empty-view", prop: "subTitle" },
        { name: "cly-empty-view", prop: "subTitle", extra: { visual: "framed" } }
    ];

    cases.forEach(function(c) {
        var label = c.name + " " + c.prop + (c.extra && c.extra.visual ? " (" + c.extra.visual + ")" : "");

        it(label + " renders markup in the message as text", function() {
            var props = Object.assign({}, c.extra);
            props[c.prop] = MARKUP;
            var out = contents(render(c.name, props));
            out.html.should.eql([]);
            out.text.should.containEql(MARKUP);
        });

        it(label + " renders trusted markup when html is set", function() {
            var props = Object.assign({ html: true }, c.extra);
            props[c.prop] = "Read <a href=\"https://support.count.ly\">the guide</a>";
            var out = contents(render(c.name, props));
            out.html.should.eql(["Read <a href=\"https://support.count.ly\">the guide</a>"]);
        });
    });

    it("shows an event name with markup as text in the segmentation limit banner", function() {
        var eventName = "Buy <b>now</b> \"&\" </span>";
        var message = i18n("events.max-segmentation-limit", 100, eventName);
        var out = contents(render("cly-notification", { text: message, color: "light-warning" }));
        out.html.should.eql([]);
        out.text.should.containEql("Maximum limit of segmentations (100) in current event \"" + eventName + "\" has been reached. Limit can be adjusted.");
    });
});
