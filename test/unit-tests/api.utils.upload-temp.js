var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var uploadTemp = require("../../api/utils/upload-temp");

// These tests exercise pure path logic, a scan of this repo's own source, and a
// temp directory created under the OS temp directory. They touch no request
// handling and no database.
//
// The declarations are read out of the source rather than restated here. Loading
// the plugins instead would be more faithful, but a plugin api.js cannot be
// required in isolation - it pulls in common.js, the config and the database
// drivers, and would need a stub covering some 28 pluginManager members. What a
// scan cannot check is that every endpoint reading params.files has a
// declaration; only the integration suite, which boots real plugins, can.

/**
 * Every upload path this repo declares, read out of the source.
 * @returns {Array} objects with the declared path and the file declaring it
 */
function declaredInSource() {
    var repoRoot = path.resolve(__dirname, "..", "..");
    var files = [path.join(repoRoot, "api", "api.js")];
    var pluginsDir = path.join(repoRoot, "plugins");

    fs.readdirSync(pluginsDir).forEach(function(name) {
        var candidate = path.join(pluginsDir, name, "api", "api.js");
        if (fs.existsSync(candidate)) {
            files.push(candidate);
        }
    });

    var found = [];
    files.forEach(function(file) {
        var src = fs.readFileSync(file, "utf8");
        // matches both push("/i/x") and push({path: "/i/x", raw: true})
        var re = /uploadPaths\.push\(\s*(?:\{[^}]*?path:\s*)?["']([^"']+)["']/g;
        var match = re.exec(src);
        while (match !== null) {
            found.push({path: match[1], file: path.relative(repoRoot, file)});
            match = re.exec(src);
        }
    });

    return found;
}

/**
 * Every URL a plugin test actually attaches a file to.
 *
 * The window for each request stops at the next .post(, because a spec often
 * uploads in one test and posts without a file in the next; a fixed size window
 * attributes the upload to the wrong URL.
 * @returns {object} url -> array of spec files posting to it with a file
 */
function urlsWithRealUploads() {
    var repoRoot = path.resolve(__dirname, "..", "..");
    var pluginsDir = path.join(repoRoot, "plugins");
    var specs = [];

    fs.readdirSync(pluginsDir).forEach(function(name) {
        var single = path.join(pluginsDir, name, "tests.js");
        if (fs.existsSync(single)) {
            specs.push(single);
        }
        var dir = path.join(pluginsDir, name, "tests");
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(function(entry) {
                if (entry.endsWith(".js")) {
                    specs.push(path.join(dir, entry));
                }
            });
        }
    });

    var out = {};
    specs.forEach(function(file) {
        // commented out lines must not count: plugins/push/tests.js has a
        // whole disabled upload suite that would otherwise look real
        var src = fs.readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, "");
        if (src.indexOf(".attach(") === -1) {
            return;
        }
        var posts = [];
        var re = /\.post\(\s*[`'"]([^`'"?]+)/g;
        var match = re.exec(src);
        while (match !== null) {
            posts.push({at: match.index, after: re.lastIndex, url: match[1].replace(/\/$/, "")});
            match = re.exec(src);
        }
        posts.forEach(function(post, i) {
            var end = (i + 1 < posts.length) ? posts[i + 1].at : src.length;
            if (src.slice(post.after, end).indexOf(".attach(") !== -1) {
                out[post.url] = out[post.url] || [];
                out[post.url].push(path.relative(repoRoot, file));
            }
        });
    });

    return out;
}

// A synthetic registry. These entries are deliberately not real endpoints: the
// matcher's behaviour does not depend on which paths happen to exist, and
// realistic looking data here previously read as if it were the real registry.
var FIXTURE = [
    {path: "/i"},
    {path: "/i/declared"},
    {path: "/i/nested/declared"},
    {path: "/i/raw/endpoint", raw: true},
    "/i/string/form"
];

describe("upload temp file handling", function() {
    /**
     * Whether these options allow a multipart part to be written to disk
     * @param {object} opts - options returned by parseOptions
     * @returns {boolean} true when multipart files are allowed
     */
    function allowsMultipart(opts) {
        return typeof opts.filter === "undefined";
    }

    /**
     * Whether these options allow a raw octet-stream body to be written to disk
     * @param {object} opts - options returned by parseOptions
     * @returns {boolean} true when raw bodies are allowed
     */
    function allowsRaw(opts) {
        return typeof opts.enabledPlugins === "undefined";
    }

    var declared = declaredInSource();
    var registry = declared.map(function(entry) {
        return entry.path;
    });

    describe("declarations in this repo", function() {

        // Update this list when an upload endpoint is added or removed. It is
        // here so that a removal is a visible diff rather than an endpoint
        // quietly starting to refuse the uploads it used to accept.
        var EXPECTED = [
            "/i/apps/create",
            "/i/apps/update",
            "/i/feedback/logo",
            "/i/feedback/upload"
        ];

        it("declares exactly the expected set", function() {
            registry.slice().sort().should.eql(EXPECTED.slice().sort());
        });

        it("declares only well formed API paths", function() {
            declared.forEach(function(entry) {
                var where = entry.path + " declared in " + entry.file;
                // requestProcessor only routes /i and /o
                entry.path.should.match(/^\/[io](\/|$)/, where + " must be under /i or /o");
                entry.path.should.not.match(/[?*\s]/, where + " must be a bare path");
                entry.path.should.not.match(/.\/$/, where + " must not end in a slash");
            });
        });

        it("matches every declaration, so none of them is unreachable", function() {
            // a declaration the matcher cannot match, a trailing slash say,
            // would silently refuse the upload it was meant to permit
            declared.forEach(function(entry) {
                allowsMultipart(uploadTemp.parseOptions(entry.path, undefined, registry))
                    .should.equal(true, entry.path + " in " + entry.file + " must be matched");
            });
        });

        it("does not let a declaration open a deeper path", function() {
            declared.forEach(function(entry) {
                allowsMultipart(uploadTemp.parseOptions(entry.path + "/extra", undefined, registry))
                    .should.equal(false, entry.path + " must not permit a deeper path");
            });
        });
    });

    describe("upload tests and declarations agree", function() {
        // Catches a declaration whose path shape is wrong - /i/surveys/create
        // instead of /i/surveys/nps/create, say. Such a declaration matches
        // nothing, so it refuses the upload it was meant to permit, and only a
        // real request reveals it.
        //
        // This repo currently has no active upload test: the only .attach calls
        // are commented out in plugins/push/tests.js, so /i/apps/* and
        // /i/feedback/* have nothing exercising a real multipart POST. The check
        // is here so that it starts guarding the moment one is added.
        var uploaded = urlsWithRealUploads();

        it("declares every endpoint a test uploads to", function() {
            Object.keys(uploaded).sort().forEach(function(url) {
                registry.indexOf(url).should.not.equal(-1,
                    url + " is uploaded to by " + uploaded[url].join(", ")
                    + " but is not declared, so the upload would be refused");
            });
        });
    });

    describe("parseOptions - multipart", function() {
        it("allows a declared path", function() {
            allowsMultipart(uploadTemp.parseOptions("/i", undefined, FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/declared", undefined, FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/nested/declared", undefined, FIXTURE)).should.equal(true);
        });

        it("refuses an undeclared path under /i (deny by default)", function() {
            [
                "/i/undeclared",
                "/i/declared/deeper",
                "/i/nested",
                "/i/bulk",
                "/i/apps/delete"
            ].forEach(function(url) {
                allowsMultipart(uploadTemp.parseOptions(url, undefined, FIXTURE))
                    .should.equal(false, url + " is not declared and must be refused");
            });
        });

        it("refuses read endpoints and paths no handler serves", function() {
            [
                "/o",
                "/o/export",
                "/crowd/admin/uploadplugin.action",
                "/",
                "/admin",
                "/.env",
                "/wp-login.php"
            ].forEach(function(url) {
                allowsMultipart(uploadTemp.parseOptions(url, undefined, FIXTURE))
                    .should.equal(false, url + " must be refused");
            });
        });

        it("matches exactly, so declaring /i does not open the /i tree", function() {
            allowsMultipart(uploadTemp.parseOptions("/i", undefined, FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/", undefined, FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/anything", undefined, FIXTURE)).should.equal(false);
        });

        it("does not match paths that merely start with i or o", function() {
            allowsMultipart(uploadTemp.parseOptions("/iffy", undefined, FIXTURE)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/index.php", undefined, FIXTURE)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/output", undefined, FIXTURE)).should.equal(false);
        });

        it("ignores the query string", function() {
            allowsMultipart(uploadTemp.parseOptions("/i?app_key=x&device_id=y", undefined, FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/crowd/x?a=/i", undefined, FIXTURE)).should.equal(false);
        });

        it("honours a subdirectory installation path", function() {
            allowsMultipart(uploadTemp.parseOptions("/countly/i/declared", "/countly", FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/i", "/countly", FIXTURE)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/crowd/admin", "/countly", FIXTURE)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/countly", "/countly", FIXTURE)).should.equal(false);
            // a prefix that only looks similar must not be stripped
            allowsMultipart(uploadTemp.parseOptions("/countlyx/i/declared", "/countly", FIXTURE)).should.equal(false);
        });

        it("refuses everything when nothing is declared", function() {
            allowsMultipart(uploadTemp.parseOptions("/i/declared", undefined, [])).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/i/declared", undefined, undefined)).should.equal(false);
        });

        it("accepts a bare string declaration as well as an object", function() {
            allowsMultipart(uploadTemp.parseOptions("/i/string/form", undefined, FIXTURE)).should.equal(true);
        });

        it("handles a missing or empty url", function() {
            allowsMultipart(uploadTemp.parseOptions(undefined, undefined, FIXTURE)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("", undefined, FIXTURE)).should.equal(false);
        });

        it("rejects every part when refusing uploads", function() {
            var opts = uploadTemp.parseOptions("/crowd/admin/uploadplugin.action", undefined, FIXTURE);
            opts.filter({name: "file_evil", originalFilename: "evil.jar"}).should.equal(false);
        });
    });

    describe("parseOptions - raw octet-stream", function() {
        it("allows a raw body only where the declaration says raw", function() {
            allowsRaw(uploadTemp.parseOptions("/i/raw/endpoint", undefined, FIXTURE)).should.equal(true);
        });

        it("refuses a raw body everywhere else, including other declared paths", function() {
            [
                "/i",
                "/i/declared",
                "/i/nested/declared",
                "/i/string/form",
                "/i/undeclared",
                "/o",
                "/crowd/admin/uploadplugin.action"
            ].forEach(function(url) {
                allowsRaw(uploadTemp.parseOptions(url, undefined, FIXTURE))
                    .should.equal(false, url + " must refuse a raw body");
            });
        });

        it("drops only the octetstream parser, so fields still parse", function() {
            var opts = uploadTemp.parseOptions("/i/declared", undefined, FIXTURE);
            opts.enabledPlugins.should.not.containEql("octetstream");
            opts.enabledPlugins.should.containEql("querystring");
            opts.enabledPlugins.should.containEql("json");
            opts.enabledPlugins.should.containEql("multipart");
        });

        it("honours a subdirectory installation path", function() {
            allowsRaw(uploadTemp.parseOptions("/countly/i/raw/endpoint", "/countly", FIXTURE)).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/countly/i/declared", "/countly", FIXTURE)).should.equal(false);
        });
    });

    describe("discardUploads", function() {
        var dir;

        beforeEach(function() {
            dir = path.join(os.tmpdir(), "countly-discard-test-" + process.pid);
            fs.rmSync(dir, {recursive: true, force: true});
            fs.mkdirSync(dir, {recursive: true});
        });

        afterEach(function() {
            fs.rmSync(dir, {recursive: true, force: true});
        });

        it("removes the files formidable produced", function(done) {
            var a = path.join(dir, "aaa");
            var b = path.join(dir, "bbb");
            fs.writeFileSync(a, "one");
            fs.writeFileSync(b, "two");

            var params = {};
            uploadTemp.trackUploads(params, {one: {filepath: a}, two: {filepath: b}});
            uploadTemp.discardUploads(params);

            setTimeout(function() {
                fs.existsSync(a).should.equal(false);
                fs.existsSync(b).should.equal(false);
                done();
            }, 50);
        });

        it("accepts the formidable v1 path property", function(done) {
            var target = path.join(dir, "ccc");
            fs.writeFileSync(target, "x");

            var params = {};
            uploadTemp.trackUploads(params, {one: {path: target}});
            uploadTemp.discardUploads(params);

            setTimeout(function() {
                fs.existsSync(target).should.equal(false);
                done();
            }, 50);
        });

        it("ignores a path a handler substituted after parsing", function(done) {
            // crash_symbolication repoints params.files.symbols.path at files
            // shipped with the plugin when serving populator data
            var tmp = path.join(dir, "ddd");
            var shipped = path.join(dir, "shipped-sample");
            fs.writeFileSync(tmp, "upload");
            fs.writeFileSync(shipped, "shipped asset");

            var params = {};
            uploadTemp.trackUploads(params, {symbols: {filepath: tmp}});
            params.files = {symbols: {path: shipped}};
            uploadTemp.discardUploads(params);

            setTimeout(function() {
                fs.existsSync(tmp).should.equal(false, "the upload must be removed");
                fs.existsSync(shipped).should.equal(true, "the shipped file must survive");
                done();
            }, 50);
        });

        it("only removes each file once", function(done) {
            var target = path.join(dir, "eee");
            fs.writeFileSync(target, "x");

            var params = {};
            uploadTemp.trackUploads(params, {one: {filepath: target}});
            uploadTemp.discardUploads(params);
            params.uploadTempPaths.should.have.length(0);
            uploadTemp.discardUploads(params);

            setTimeout(function() {
                fs.existsSync(target).should.equal(false);
                done();
            }, 50);
        });

        it("tolerates requests with no uploads", function() {
            should.doesNotThrow(function() {
                uploadTemp.discardUploads({});
                uploadTemp.discardUploads(undefined);
                var params = {};
                uploadTemp.trackUploads(params, undefined);
                uploadTemp.discardUploads(params);
                uploadTemp.trackUploads(params, {broken: {}});
                uploadTemp.discardUploads(params);
            });
        });
    });
});
