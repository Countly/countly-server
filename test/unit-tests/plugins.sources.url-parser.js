require("should");
var sources = require("../../plugins/sources/api/api.js");

// Web referrers are stored by urlParser, which keeps only the search query parameter of a
// search engine referrer. Engine-specific parameters (wd, p, text, u) are kept only when
// the referrer belongs to that engine, and /o/keywords later reads the keyword back from
// the stored source. Once "www." is stripped, the engine name is often at the start of the
// path, so the engine check must match there too.
describe("sources urlParser keeps search keywords", function() {
    it("keeps the baidu keyword when the domain starts the path", function() {
        sources.urlParser("https://www.baidu.com/s?ie=utf-8&wd=countly").should.equal("baidu.com/s?wd=countly");
    });

    it("keeps the yandex keyword when the domain starts the path", function() {
        sources.urlParser("https://yandex.ru/search/?lr=213&text=countly").should.equal("yandex.ru/search/?text=countly");
    });

    it("keeps the yahoo keyword when the domain starts the path", function() {
        sources.urlParser("https://yahoo.com/search?fr=yfp&p=countly").should.equal("yahoo.com/search?p=countly");
    });

    it("keeps the facebook link target when the domain starts the path", function() {
        sources.urlParser("https://www.facebook.com/l.php?u=https%3A%2F%2Fcount.ly&h=abc").should.equal("facebook.com/l.php?u=https%3A%2F%2Fcount.ly");
    });

    it("still keeps the keyword when the engine is a subdomain", function() {
        sources.urlParser("https://search.yahoo.com/search?fr=yfp&p=countly").should.equal("search.yahoo.com/search?p=countly");
    });

    it("still drops an engine-specific parameter on another engine", function() {
        sources.urlParser("https://www.google.com/search?wd=countly").should.equal("google.com/search");
    });
});
