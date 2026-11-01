require("should");
var loadPuppeteer = require("../../api/utils/loadPuppeteer.js");

// puppeteer 25 is an ES module, which require() cannot load on the Node.js 20.18 that 25.03.0
// installed; pdf.js and render.js load it through this import() wrapper instead.
describe("loadPuppeteer", function() {
    it("loads puppeteer once and returns the module with launch()", async function() {
        var first = loadPuppeteer();
        loadPuppeteer().should.equal(first);
        var puppeteer = await first;
        puppeteer.should.be.an.Object();
        puppeteer.launch.should.be.a.Function();
    });
});
