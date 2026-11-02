require("should");
var common = require("../../api/utils/common.js");
const mongodb = require('mongodb');

/**
* Build a params object with a fake response object collecting written chunks
* @returns {object} params with a chunks array attached
**/
function fakeParams() {
    var chunks = [];
    return {
        chunks: chunks,
        qstring: {},
        req: {headers: {}},
        res: {
            writeHead: function() {},
            write: function(chunk) {
                chunks.push(chunk);
            },
            end: function() {}
        }
    };
}

describe("Escaped API output", function() {
    describe("stringifyEscaped", function() {
        it("should escape tags in string values", function() {
            common.stringifyEscaped({a: "<script>alert(1)</script>"}, true)
                .should.equal('{"a":"&lt;script&gt;alert(1)&lt;/script&gt;"}');
        });

        it("should escape quotes and ampersands when more is true", function() {
            common.stringifyEscaped({a: "it's \"x\" & y"}, true)
                .should.equal('{"a":"it&#39;s &quot;x&quot; &amp; y"}');
        });

        it("should escape object keys", function() {
            common.stringifyEscaped({"<k>": 1, "a&b": 2}, true)
                .should.equal('{"&lt;k&gt;":1,"a&amp;b":2}');
        });

        it("should escape strings nested in arrays and sub documents", function() {
            common.stringifyEscaped({a: [{b: ["<x>"]}]}, true)
                .should.equal('{"a":[{"b":["&lt;x&gt;"]}]}');
        });

        it("should escape inside JSON encoded string values", function() {
            common.stringifyEscaped({a: '{"b":"<x>"}'}, true)
                .should.equal('{"a":"{\\"b\\":\\"&lt;x&gt;\\"}"}');
        });

        it("should not double escape existing entities", function() {
            common.stringifyEscaped({a: "&lt;x&gt; &amp; &quot;y&quot;"}, true)
                .should.equal('{"a":"&lt;x&gt; &amp; &quot;y&quot;"}');
        });

        it("should leave non string values untouched", function() {
            var id = new mongodb.ObjectId("5f8a2b1c9d4e3f00a1b2c3d4");
            common.stringifyEscaped({n: 1, b: true, z: null, d: new Date(1700000000000), id: id}, true)
                .should.equal('{"n":1,"b":true,"z":null,"d":"2023-11-14T22:13:20.000Z","id":"5f8a2b1c9d4e3f00a1b2c3d4"}');
        });

        it("should not escape the top level value itself", function() {
            common.stringifyEscaped("<x>", true).should.equal('"<x>"');
        });

        it("should drop an own __proto__ key", function() {
            //JSON.parse and BSON deserialization can both produce one
            common.stringifyEscaped(JSON.parse('{"__proto__":{"a":1},"b":2}'), true)
                .should.equal('{"b":2}');
            common.stringifyEscaped(JSON.parse('{"n":{"__proto__":"<x>","b":2}}'), true)
                .should.equal('{"n":{"b":2}}');
        });

        it("should escape a string returned by a toJSON hook on a plain object", function() {
            var hooked = {
                toJSON: function() {
                    return "<script>x</script>";
                }
            };
            common.stringifyEscaped({a: hooked}, true)
                .should.equal('{"a":"&lt;script&gt;x&lt;/script&gt;"}');
        });

        // constructor is an ordinary own key: JSON.parse and BSON will both set one from
        // input. While the plain-object test read value.constructor, a document carrying
        // that key answered "not a plain object" and skipped escaping altogether - so the
        // key that decides whether to escape was itself settable by whoever supplied the
        // document.
        it("should escape keys even when the object carries an own constructor key", function() {
            common.stringifyEscaped(JSON.parse('{"constructor":1,"<img src=x>":"v"}'), true)
                .should.equal('{"constructor":1,"&lt;img src=x&gt;":"v"}');
        });

        it("should still drop an own __proto__ key when a constructor key is present", function() {
            common.stringifyEscaped(JSON.parse('{"constructor":1,"__proto__":{"a":1},"b":2}'), true)
                .should.equal('{"constructor":1,"b":2}');
        });

        it("should escape a null prototype object, which is what BSON produces", function() {
            var bare = Object.create(null);
            bare["<img src=x>"] = "<b>v</b>";
            common.stringifyEscaped(bare, true)
                .should.equal('{"&lt;img src=x&gt;":"&lt;b&gt;v&lt;/b&gt;"}');
        });

        it("should leave an array an array", function() {
            // the object branch copies into a fresh {}, so an array must not enter it -
            // and does not need to, its keys being indices
            common.stringifyEscaped(JSON.parse('["<b>a</b>","b"]'), true)
                .should.equal('["&lt;b&gt;a&lt;/b&gt;","b"]');
            common.stringifyEscaped(JSON.parse('{"k":["<b>a</b>"]}'), true)
                .should.equal('{"k":["&lt;b&gt;a&lt;/b&gt;"]}');
        });
    });

    describe("returnOutput", function() {
        it("should write escaped output", function() {
            var params = fakeParams();
            common.returnOutput(params, {result: {"a<b": ["<script>x</script>", {n: "a & b"}]}});
            params.chunks.join("").should.equal('{"result":{"a&lt;b":["&lt;script&gt;x&lt;/script&gt;",{"n":"a &amp; b"}]}}');
        });

        it("should expose the same body on params.response", function() {
            var params = fakeParams();
            common.returnOutput(params, {result: "<x>"});
            params.response.code.should.equal(200);
            params.response.body.should.equal(params.chunks.join(""));
        });

        it("should allow params.response.body to be replaced", function() {
            var params = fakeParams();
            common.returnOutput(params, {result: "<x>"});
            params.response.body = {parsed: true};
            params.response.body.should.eql({parsed: true});
        });

        it("should skip escaping when noescape is set by the caller", function() {
            var params = fakeParams();
            var output = {result: "<x>"};
            common.returnOutput(params, output, true);
            params.chunks.join("").should.equal(JSON.stringify(output));
        });

        it("should not honour noescape coming from the query string", function() {
            var params = fakeParams();
            params.qstring.noescape = 1;
            common.returnOutput(params, {result: "<x>"});
            params.chunks.join("").should.equal('{"result":"&lt;x&gt;"}');
        });

        it("should throw before committing the success headers", function() {
            var params = fakeParams();
            var headersWritten = false;
            params.res.writeHead = function() {
                headersWritten = true;
            };
            var cyclic = {};
            cyclic.self = cyclic;
            var threw = false;
            try {
                common.returnOutput(params, cyclic);
            }
            catch (ex) {
                threw = true;
            }
            threw.should.equal(true);
            headersWritten.should.equal(false);
            params.chunks.length.should.equal(0);
        });
    });

    describe("returnMessage", function() {
        it("should write escaped message", function() {
            var params = fakeParams();
            common.returnMessage(params, 400, "bad <input>");
            params.chunks.join("").should.equal('{"result":"bad &lt;input&gt;"}');
        });

        it("should honour noResult", function() {
            var params = fakeParams();
            common.returnMessage(params, 200, {a: "<x>"}, null, true);
            params.chunks.join("").should.equal('{"a":"&lt;x&gt;"}');
        });
    });
});
