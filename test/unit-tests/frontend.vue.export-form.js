require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var exportsApi = require("../../api/parts/data/exports.js");

// A table export downloads through a hidden form POST. The rows of a local export travel in
// one field as JSON, and table cells hold whatever the SDKs sent, so a field value can hold
// any character. The form is built through DOM properties so a value reaches the server
// exactly as given; these tests build it with a fake document that refuses markup, then
// feed what the browser would post to the server's export writer and compare the file.
describe("table export form", function() {
    var helpersPath = path.join(__dirname, "../../frontend/express/public/javascripts/countly/vue/helpers.js");
    var sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(helpersPath, "utf8"), sandbox);
    var helpers = sandbox.window.countlyVue.helpers;

    var AWKWARD = "a<b \"c\" 'd' &amp; </textarea><input name=x>";

    /**
     * A document whose elements only take DOM properties; any markup API throws.
     * @returns {object} fake document
     */
    function fakeDocument() {
        return {
            createElement: function(tag) {
                var el = { tagName: tag.toUpperCase(), style: {}, children: [] };
                el.appendChild = function(child) {
                    el.children.push(child);
                };
                ["innerHTML", "outerHTML"].forEach(function(prop) {
                    Object.defineProperty(el, prop, {
                        set: function() {
                            throw new Error("markup written to " + tag);
                        }
                    });
                });
                el.insertAdjacentHTML = function() {
                    throw new Error("markup written to " + tag);
                };
                return el;
            }
        };
    }

    /**
     * The name/value pairs a browser would post for the form.
     * @param {object} form - form built by the helper
     * @returns {object} posted fields by name
     */
    function posted(form) {
        var out = {};
        form.children.forEach(function(input) {
            out[input.name] = input.value;
        });
        return out;
    }

    /**
     * Run the server's in-memory export writer the way /o/export/data does.
     * @param {string} data - the posted data field
     * @param {string} type - json or csv
     * @returns {string} the file body
     */
    function exportFile(data, type) {
        var body = null;
        exportsApi.fromData(JSON.parse(data), {
            type: type,
            filename: "t",
            output: function(out) {
                body = out;
            }
        });
        return body;
    }

    it("posts every field as a hidden input with the exact value", function() {
        var form = helpers.buildExportForm(fakeDocument(), "/o/export/data", {
            type: "json",
            filename: AWKWARD,
            auth_token: "token"
        });
        form.tagName.should.equal("FORM");
        form.method.should.equal("POST");
        form.action.should.equal("/o/export/data");
        form.children.length.should.equal(3);
        form.children.forEach(function(input) {
            input.tagName.should.equal("INPUT");
            input.type.should.equal("hidden");
        });
        posted(form).should.eql({ type: "json", filename: AWKWARD, auth_token: "token" });
    });

    it("submits with the session token in place of the api_key and removes the form", function() {
        var doc = fakeDocument();
        var body = [];
        var submitted = null;
        var create = doc.createElement;
        doc.createElement = function(tag) {
            var el = create(tag);
            if (tag === "form") {
                el.submit = function() {
                    body.should.containEql(el);
                    submitted = posted(el);
                };
            }
            return el;
        };
        doc.body = {
            appendChild: function(el) {
                body.push(el);
            },
            removeChild: function(el) {
                body.splice(body.indexOf(el), 1);
            }
        };
        var fields = { type: "csv", api_key: "key", data: "[]" };
        var box = { window: { countlyGlobal: { auth_token: "session" } }, document: doc };
        vm.runInNewContext(fs.readFileSync(helpersPath, "utf8"), box);
        box.window.countlyVue.helpers.submitExportForm("/o/export/data", fields);
        submitted.should.eql({ type: "csv", data: "[]", auth_token: "session" });
        body.should.eql([]);
        // the caller's object is left as it was
        fields.should.have.property("api_key", "key");
    });

    it("keeps an awkward name as a name, not as markup", function() {
        var fields = {};
        fields[AWKWARD] = "v";
        posted(helpers.buildExportForm(fakeDocument(), "/o", fields)).should.have.property(AWKWARD, "v");
    });

    it("round-trips a cell with markup characters byte-exact into the JSON file", function() {
        var rows = [{ CARRIER: AWKWARD, USERS: 3 }];
        var form = helpers.buildExportForm(fakeDocument(), "/o/export/data", { type: "json", data: JSON.stringify(rows) });
        var file = exportFile(posted(form).data, "json");
        JSON.parse(file).should.eql(rows);
        file.should.containEql(JSON.stringify(AWKWARD));
    });

    it("round-trips a cell with markup characters byte-exact into the CSV file", function() {
        var rows = [{ CARRIER: AWKWARD, USERS: 3 }];
        var form = helpers.buildExportForm(fakeDocument(), "/o/export/data", { type: "csv", data: JSON.stringify(rows) });
        var file = exportFile(posted(form).data, "csv");
        var lines = file.split("\n");
        lines[0].should.equal("\"CARRIER\",\"USERS\"");
        // CSV doubles a quote inside a quoted cell; undoing that gives the cell back exactly
        lines[1].should.equal("\"" + AWKWARD.replace(/"/g, "\"\"") + "\",3");
    });
});
