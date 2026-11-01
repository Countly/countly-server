var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var { createStaticFileMatcher } = require("../../frontend/express/libs/static-files.js");

// The dashboard rate limiter skips requests this matcher accepts, so it must
// accept the files express.static serves and nothing that reaches a route.
// The tests build a small public tree under the OS temp directory.

describe("Dashboard rate limiter static file matcher", function() {
    var root;
    var coreRoot;
    var pluginsRoot;

    before(function() {
        root = fs.mkdtempSync(path.join(os.tmpdir(), "cly-static-"));
        coreRoot = path.join(root, "public");
        pluginsRoot = path.join(root, "plugins");
        fs.mkdirSync(path.join(coreRoot, "stylesheets", "font-awesome", "css"), {recursive: true});
        fs.writeFileSync(path.join(coreRoot, "stylesheets", "font-awesome", "css", "font-awesome.min.css"), "");
        fs.writeFileSync(path.join(coreRoot, "stylesheets", "space name.css"), "");
        fs.writeFileSync(path.join(coreRoot, ".hidden"), "");
        fs.mkdirSync(path.join(pluginsRoot, "star-rating", "frontend", "public", "stylesheets"), {recursive: true});
        fs.writeFileSync(path.join(pluginsRoot, "star-rating", "frontend", "public", "stylesheets", "ratings-iframe.css"), "");
        fs.mkdirSync(path.join(pluginsRoot, "star-rating", "api"), {recursive: true});
        fs.writeFileSync(path.join(pluginsRoot, "star-rating", "api", "api.js"), "");
        fs.writeFileSync(path.join(root, "secret.txt"), "");
    });

    after(function() {
        fs.rmSync(root, {recursive: true, force: true});
    });

    /**
     * Run the matcher for a request
     * @param {string} basePath - dashboard path prefix
     * @param {string} method - HTTP method
     * @param {string} urlPath - request path
     * @returns {Promise<boolean>} matcher result
     */
    function match(basePath, method, urlPath) {
        var isStaticFile = createStaticFileMatcher({basePath: basePath, coreRoot: coreRoot, pluginsRoot: pluginsRoot});
        return isStaticFile({method: method, path: urlPath});
    }

    it("accepts core and plugin static files", async function() {
        should(await match("", "GET", "/stylesheets/font-awesome/css/font-awesome.min.css")).be.true();
        should(await match("", "HEAD", "/star-rating/stylesheets/ratings-iframe.css")).be.true();
        should(await match("", "GET", "/stylesheets/space%20name.css")).be.true();
    });

    it("accepts files under a dashboard base path only", async function() {
        should(await match("/countly", "GET", "/countly/star-rating/stylesheets/ratings-iframe.css")).be.true();
        should(await match("/countly", "GET", "/star-rating/stylesheets/ratings-iframe.css")).be.false();
        should(await match("/countly", "GET", "/countlyx/stylesheets/space%20name.css")).be.false();
    });

    it("rejects routes, directories and missing files", async function() {
        should(await match("", "GET", "/login")).be.false();
        should(await match("", "GET", "/feedback/rating")).be.false();
        should(await match("", "GET", "/stylesheets")).be.false();
        should(await match("", "GET", "/star-rating/stylesheets/missing.css")).be.false();
        should(await match("", "GET", "/")).be.false();
    });

    it("rejects methods other than GET and HEAD", async function() {
        should(await match("", "POST", "/stylesheets/font-awesome/css/font-awesome.min.css")).be.false();
    });

    it("rejects plugin files outside frontend/public", async function() {
        should(await match("", "GET", "/star-rating/api/api.js")).be.false();
    });

    it("rejects dot files, traversal and malformed encoding", async function() {
        should(await match("", "GET", "/.hidden")).be.false();
        should(await match("", "GET", "/../secret.txt")).be.false();
        should(await match("", "GET", "/%2e%2e/secret.txt")).be.false();
        should(await match("", "GET", "/star-rating/..%2f..%2f..%2fsecret.txt")).be.false();
        should(await match("", "GET", "/stylesheets/%E0%A4%A.css")).be.false();
        should(await match("", "GET", "/stylesheets/space%00name.css")).be.false();
    });
});
