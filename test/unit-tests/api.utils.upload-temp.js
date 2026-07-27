var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var uploadTemp = require("../../api/utils/upload-temp");

// These tests exercise pure path logic and a temp directory created under the
// OS temp directory, so they touch no request handling and no database.
describe("upload temp file handling", function() {
    // stands in for plugins.uploadPaths — what core and the plugins declare
    var REGISTERED = [
        {path: "/i"}, // users: SDK user_details picture
        {path: "/i/apps/create"},
        {path: "/i/apps/update"},
        {path: "/i/feedback/upload"},
        {path: "/i/feedback/logo"},
        {path: "/i/surveys/create"},
        {path: "/i/surveys/edit"},
        {path: "/i/whitelabeling/upload"},
        {path: "/i/content/asset-upload"},
        {path: "/i/cohorts/add_users"},
        {path: "/i/license/upload"},
        {path: "/i/import"},
        {path: "/i/data-manager/import-schema"},
        {path: "/i/crash_symbols/add_symbol", raw: true},
        {path: "/i/crash_symbols/upload_symbol", raw: true},
        {path: "/i/crash_symbols/edit_symbol", raw: true}
    ];

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

    describe("parseOptions - multipart", function() {
        it("allows uploads on the endpoints that consume them", function() {
            [
                "/i",
                "/i/apps/create",
                "/i/apps/update",
                "/i/feedback/upload",
                "/i/feedback/logo",
                "/i/surveys/create",
                "/i/surveys/edit",
                "/i/whitelabeling/upload",
                "/i/content/asset-upload",
                "/i/crash_symbols/add_symbol",
                "/i/crash_symbols/upload_symbol",
                "/i/crash_symbols/edit_symbol",
                "/i/license/upload",
                "/i/import",
                "/i/data-manager/import-schema"
            ].forEach(function(url) {
                allowsMultipart(uploadTemp.parseOptions(url, undefined, REGISTERED)).should.equal(true, url + " must allow uploads");
            });
        });

        it("refuses uploads on read endpoints, which never consume a file", function() {
            allowsMultipart(uploadTemp.parseOptions("/o", undefined, REGISTERED)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/o/apps", undefined, REGISTERED)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/o/export", undefined, REGISTERED)).should.equal(false);
        });

        it("refuses uploads on paths no handler serves", function() {
            [
                "/crowd/admin/uploadplugin.action",
                "/crowd/plugins/servlet/pdkinstall/installPlugin",
                "/",
                "/admin",
                "/.env",
                "/wp-login.php"
            ].forEach(function(url) {
                allowsMultipart(uploadTemp.parseOptions(url, undefined, REGISTERED)).should.equal(false, url + " must refuse uploads");
            });
        });

        it("refuses unregistered paths under /i (deny by default)", function() {
            [
                "/i/apps",
                "/i/apps/delete",
                "/i/apps/reset",
                "/i/bulk",
                "/i/users/create",
                "/i/cohorts/add",
                "/i/crash_symbols",
                "/i/whatever",
                "/i/import/nested"
            ].forEach(function(url) {
                allowsMultipart(uploadTemp.parseOptions(url, undefined, REGISTERED))
                    .should.equal(false, url + " is not declared and must refuse uploads");
            });
        });

        it("matches declared paths exactly, so /i does not open the /i tree", function() {
            allowsMultipart(uploadTemp.parseOptions("/i", undefined, REGISTERED)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/", undefined, REGISTERED)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/i/anything", undefined, REGISTERED)).should.equal(false);
        });

        it("refuses everything when no plugin declared anything", function() {
            allowsMultipart(uploadTemp.parseOptions("/i/apps/update", undefined, [])).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/i/apps/update", undefined, undefined)).should.equal(false);
        });

        it("accepts a bare string declaration as well as an object", function() {
            allowsMultipart(uploadTemp.parseOptions("/i/thing", undefined, ["/i/thing"])).should.equal(true);
        });

        it("does not match paths that merely start with i", function() {
            allowsMultipart(uploadTemp.parseOptions("/iffy", undefined, REGISTERED)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/index.php", undefined, REGISTERED)).should.equal(false);
        });

        it("ignores the query string", function() {
            allowsMultipart(uploadTemp.parseOptions("/i?app_key=x&device_id=y", undefined, REGISTERED)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/crowd/x?a=/i", undefined, REGISTERED)).should.equal(false);
        });

        it("honours a subdirectory installation path", function() {
            allowsMultipart(uploadTemp.parseOptions("/countly/i/apps/update", "/countly", REGISTERED)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/i", "/countly", REGISTERED)).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/crowd/admin", "/countly", REGISTERED)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/countly", "/countly", REGISTERED)).should.equal(false);
            // a prefix that only looks similar must not be stripped
            allowsMultipart(uploadTemp.parseOptions("/countlyx/i/apps/update", "/countly", REGISTERED)).should.equal(false);
        });

        it("handles a missing or empty url", function() {
            allowsMultipart(uploadTemp.parseOptions(undefined, undefined, REGISTERED)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("", undefined, REGISTERED)).should.equal(false);
        });

        it("rejects every part when refusing uploads", function() {
            var opts = uploadTemp.parseOptions("/crowd/admin/uploadplugin.action");
            opts.filter({name: "file_evil", originalFilename: "evil.jar"}).should.equal(false);
        });
    });

    describe("parseOptions - raw octet-stream", function() {
        it("allows raw bodies only where they are read as files", function() {
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/add_symbol", undefined, REGISTERED)).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/upload_symbol", undefined, REGISTERED)).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/edit_symbol", undefined, REGISTERED)).should.equal(true);
        });

        it("refuses raw bodies everywhere else, including other upload endpoints", function() {
            [
                "/i",
                "/i/apps/update",
                "/i/license/upload",
                "/i/import",
                "/i/crash_symbols",
                "/i/crash_symbols/other",
                "/i/cohorts/add_users",
                "/o",
                "/crowd/admin/uploadplugin.action"
            ].forEach(function(url) {
                allowsRaw(uploadTemp.parseOptions(url, undefined, REGISTERED)).should.equal(false, url + " must refuse raw bodies");
            });
        });

        it("drops only the octetstream parser, so fields still parse", function() {
            var opts = uploadTemp.parseOptions("/i/apps/update");
            opts.enabledPlugins.should.not.containEql("octetstream");
            opts.enabledPlugins.should.containEql("querystring");
            opts.enabledPlugins.should.containEql("json");
            opts.enabledPlugins.should.containEql("multipart");
        });

        it("honours a subdirectory installation path", function() {
            allowsRaw(uploadTemp.parseOptions("/countly/i/crash_symbols/add_symbol", "/countly", REGISTERED)).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/countly/i/apps/update", "/countly", REGISTERED)).should.equal(false);
        });
    });

    describe("resolveUploadDir", function() {
        it("defaults to a dedicated directory in the OS temp directory", function() {
            var dir = uploadTemp.resolveUploadDir({});
            dir.should.equal(path.join(os.tmpdir(), "countly-uploads"));
            fs.existsSync(dir).should.equal(true);
        });

        it("honours a configured directory and creates it", function() {
            var configured = path.join(os.tmpdir(), "countly-upload-test-" + process.pid);
            fs.rmSync(configured, {recursive: true, force: true});
            uploadTemp.resolveUploadDir({uploadDir: configured}).should.equal(configured);
            fs.existsSync(configured).should.equal(true);
            fs.rmSync(configured, {recursive: true, force: true});
        });

        it("falls back to the formidable default when the directory is unusable", function() {
            // a path under a regular file can never be created
            var blocker = path.join(os.tmpdir(), "countly-upload-blocker-" + process.pid);
            fs.writeFileSync(blocker, "x");
            should(uploadTemp.resolveUploadDir({uploadDir: path.join(blocker, "nested")})).equal(undefined);
            fs.unlinkSync(blocker);
        });
    });

    describe("discardUploads", function() {
        var dir;

        beforeEach(function() {
            dir = path.join(os.tmpdir(), "countly-discard-test-" + process.pid);
            fs.rmSync(dir, {recursive: true, force: true});
            uploadTemp.resolveUploadDir({uploadDir: dir});
        });

        afterEach(function() {
            fs.rmSync(dir, {recursive: true, force: true});
        });

        it("removes the files parsed out of the request", function(done) {
            var a = path.join(dir, "aaa");
            var b = path.join(dir, "bbb");
            fs.writeFileSync(a, "one");
            fs.writeFileSync(b, "two");

            uploadTemp.discardUploads({files: {one: {path: a}, two: {path: b}}});

            setTimeout(function() {
                fs.existsSync(a).should.equal(false);
                fs.existsSync(b).should.equal(false);
                done();
            }, 50);
        });

        it("accepts the formidable v2 filepath property", function(done) {
            var target = path.join(dir, "ccc");
            fs.writeFileSync(target, "x");

            uploadTemp.discardUploads({files: {one: {filepath: target}}});

            setTimeout(function() {
                fs.existsSync(target).should.equal(false);
                done();
            }, 50);
        });

        it("never removes a path outside the upload directory", function(done) {
            // crash_symbolication repoints params.files[x].path at files shipped
            // with the plugin, which must survive
            var shipped = path.join(os.tmpdir(), "countly-shipped-sample-" + process.pid);
            fs.writeFileSync(shipped, "shipped asset");

            uploadTemp.discardUploads({files: {symbols: {path: shipped}}});

            setTimeout(function() {
                fs.existsSync(shipped).should.equal(true);
                fs.unlinkSync(shipped);
                done();
            }, 50);
        });

        it("tolerates requests with no files", function() {
            should.doesNotThrow(function() {
                uploadTemp.discardUploads({});
                uploadTemp.discardUploads({files: {}});
                uploadTemp.discardUploads(undefined);
                uploadTemp.discardUploads({files: {broken: {}}});
            });
        });
    });
});
