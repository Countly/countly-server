var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var uploadTemp = require("../../api/utils/upload-temp");

// These tests exercise pure path logic and a temp directory created under the
// OS temp directory, so they touch no request handling and no database.
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
                allowsMultipart(uploadTemp.parseOptions(url)).should.equal(true, url + " must allow uploads");
            });
        });

        it("refuses uploads on read endpoints, which never consume a file", function() {
            allowsMultipart(uploadTemp.parseOptions("/o")).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/o/apps")).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/o/export")).should.equal(false);
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
                allowsMultipart(uploadTemp.parseOptions(url)).should.equal(false, url + " must refuse uploads");
            });
        });

        it("does not match paths that merely start with i", function() {
            allowsMultipart(uploadTemp.parseOptions("/iffy")).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/index.php")).should.equal(false);
        });

        it("ignores the query string", function() {
            allowsMultipart(uploadTemp.parseOptions("/i?app_key=x&device_id=y")).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/crowd/x?a=/i")).should.equal(false);
        });

        it("honours a subdirectory installation path", function() {
            allowsMultipart(uploadTemp.parseOptions("/countly/i/apps/update", "/countly")).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/i", "/countly")).should.equal(true);
            allowsMultipart(uploadTemp.parseOptions("/countly/crowd/admin", "/countly")).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("/countly", "/countly")).should.equal(false);
            // a prefix that only looks similar must not be stripped
            allowsMultipart(uploadTemp.parseOptions("/countlyx/i/apps/update", "/countly")).should.equal(false);
        });

        it("handles a missing or empty url", function() {
            allowsMultipart(uploadTemp.parseOptions(undefined)).should.equal(false);
            allowsMultipart(uploadTemp.parseOptions("")).should.equal(false);
        });

        it("rejects every part when refusing uploads", function() {
            var opts = uploadTemp.parseOptions("/crowd/admin/uploadplugin.action");
            opts.filter({name: "file_evil", originalFilename: "evil.jar"}).should.equal(false);
        });
    });

    describe("parseOptions - raw octet-stream", function() {
        it("allows raw bodies only where they are read as files", function() {
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/add_symbol")).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/upload_symbol")).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/i/crash_symbols/edit_symbol")).should.equal(true);
        });

        it("refuses raw bodies everywhere else, including other upload endpoints", function() {
            [
                "/i",
                "/i/apps/update",
                "/i/license/upload",
                "/i/import",
                "/i/crash_symbols",
                "/i/crash_symbols/other",
                "/o",
                "/crowd/admin/uploadplugin.action"
            ].forEach(function(url) {
                allowsRaw(uploadTemp.parseOptions(url)).should.equal(false, url + " must refuse raw bodies");
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
            allowsRaw(uploadTemp.parseOptions("/countly/i/crash_symbols/add_symbol", "/countly")).should.equal(true);
            allowsRaw(uploadTemp.parseOptions("/countly/i/apps/update", "/countly")).should.equal(false);
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
