var should = require("should");
var testUtils = require("../testUtils");
var common = require("../../api/utils/common");

describe("Common API utility functions", function() {
    describe("versionCompare", function() {
        function testCompare(v1, v2, expected) {
            common.versionCompare(v1, v2).should.equal(expected);
            common.versionCompare(v2, v1).should.equal(expected * -1);
        }

        it("should compare versions correctly", function(done) {
            testCompare("1:0", "1:1", -1);
            testCompare("2:0", "1:1", 1);

            testCompare("1:0+builtonmars", "1:0+builtonearth", 0);

            testCompare("1:0:1", "1:0", 1);

            testCompare("5:3-beta", "5:3", -1);
            testCompare("5:3-251e6992f5", "5:3-303535874", 0);

            testCompare("9:74AGT", "9:80AGT", -1);
            testCompare("10:14AGT", "9:80AGT", 1);

            done();
        });
    });
});
