require("should");
var common = require("../../api/utils/common.js");
var utils = require("../../plugins/hooks/api/utils.js");

// Trigger stats and error logs are written through the write batcher; a flush that lands
// after the hook was deleted must not recreate it as a document with no name.
describe("hooks stats writes", function() {
    var original;
    var calls;
    beforeEach(function() {
        calls = [];
        original = common.writeBatcher;
        common.writeBatcher = {
            add: function() {
                calls.push(Array.prototype.slice.call(arguments));
            }
        };
    });
    afterEach(function() {
        common.writeBatcher = original;
    });

    it("updates trigger time without upsert", function() {
        utils.updateRuleTriggerTime("hook1");
        calls.length.should.equal(1);
        calls[0][0].should.equal("hooks");
        calls[0][1].should.equal("hook1");
        calls[0][3].should.equal("countly");
        calls[0][4].should.eql({upsert: false});
    });

    it("records errors without upsert", function() {
        utils.addErrorRecord("hook1", new Error("boom"), {}, 0, {});
        calls.length.should.equal(1);
        calls[0][2].should.have.property("$push");
        calls[0][4].should.eql({upsert: false});
    });
});
