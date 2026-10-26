require("should");
var Readable = require("stream").Readable;
var cursorStream = require("../../api/utils/cursorStream.js");

// MongoDB driver 7 ignores the `transform` option of cursor.stream(). Exports and dbviewer
// relied on it: exports to turn documents into the JSON strings it writes, dbviewer to redact
// fields (auth token ids among them) before a document leaves the server. cursorStream applies
// the transform itself, the way driver 6 did.
describe("cursorStream", function() {
    /**
     * A stand-in for a MongoDB cursor over the given documents.
     * @param {Array} docs - documents the cursor yields
     * @returns {object} an object with a stream() method
     */
    function cursorOver(docs) {
        return {
            stream: function() {
                return Readable.from(docs);
            }
        };
    }

    /**
     * Collect everything a stream emits.
     * @param {stream.Readable} stream - the stream to drain
     * @returns {Promise<Array>} the emitted chunks
     */
    function drain(stream) {
        return new Promise(function(resolve, reject) {
            var out = [];
            stream.on("data", function(chunk) {
                out.push(chunk);
            });
            stream.on("end", function() {
                resolve(out);
            });
            stream.on("error", reject);
        });
    }

    it("applies the transform to every document", async function() {
        var out = await drain(cursorStream(cursorOver([{_id: "a", secret: 1}, {_id: "b", secret: 2}]), {
            transform: function(doc) {
                delete doc.secret;
                return JSON.stringify(doc);
            }
        }));
        out.should.eql(['{"_id":"a"}', '{"_id":"b"}']);
    });

    it("passes documents through untouched without a transform", async function() {
        var docs = [{_id: "a"}, {_id: "b"}];
        var out = await drain(cursorStream(cursorOver(docs), {}));
        out.should.eql(docs);
    });

    it("drops documents the transform maps to null or undefined, as driver 6 did", async function() {
        var out = await drain(cursorStream(cursorOver([1, 2, 3, 4]), {
            transform: function(n) {
                if (n === 2) {
                    return null;
                }
                if (n === 3) {
                    return undefined;
                }
                return n * 10;
            }
        }));
        out.should.eql([10, 40]);
    });

    it("reports a transform that throws as a stream error", async function() {
        var error = await drain(cursorStream(cursorOver([1]), {
            transform: function() {
                throw new Error("transform failed");
            }
        })).then(function() {
            return null;
        }, function(err) {
            return err;
        });
        error.message.should.equal("transform failed");
    });

    it("reports an error from the cursor side on the stream the caller holds", async function() {
        var failing = {
            stream: function() {
                return new Readable({
                    objectMode: true,
                    read: function() {
                        this.destroy(new Error("cursor failed"));
                    }
                });
            }
        };
        var error = await drain(cursorStream(failing, {
            transform: function(doc) {
                return doc;
            }
        })).then(function() {
            return null;
        }, function(err) {
            return err;
        });
        error.message.should.equal("cursor failed");
    });
});
