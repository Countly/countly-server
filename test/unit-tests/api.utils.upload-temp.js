var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var uploadTemp = require("../../api/utils/upload-temp");

// These tests exercise pure path logic and a temp directory created under the
// OS temp directory, so they touch no request handling and no database.
describe("upload temp file handling", function() {
    describe("acceptsFileUpload", function() {
        it("accepts the API write and read roots", function() {
            uploadTemp.acceptsFileUpload("/i").should.equal(true);
            uploadTemp.acceptsFileUpload("/o").should.equal(true);
            uploadTemp.acceptsFileUpload("/i/").should.equal(true);
        });

        it("accepts every endpoint that consumes an uploaded file", function() {
            [
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
                uploadTemp.acceptsFileUpload(url).should.equal(true, url + " must accept uploads");
            });
        });

        it("ignores the query string", function() {
            uploadTemp.acceptsFileUpload("/i?app_key=x&device_id=y").should.equal(true);
            uploadTemp.acceptsFileUpload("/i/feedback/upload?name=feedback_logo").should.equal(true);
            uploadTemp.acceptsFileUpload("/crowd/x?a=/i").should.equal(false);
        });

        it("refuses paths that cannot reach a handler", function() {
            [
                "/crowd/admin/uploadplugin.action",
                "/crowd/plugins/servlet/pdkinstall/installPlugin",
                "/",
                "/admin",
                "/.env",
                "/wp-login.php",
                "/api/v1/upload"
            ].forEach(function(url) {
                uploadTemp.acceptsFileUpload(url).should.equal(false, url + " must not accept uploads");
            });
        });

        it("does not match paths that merely start with i or o", function() {
            uploadTemp.acceptsFileUpload("/iffy").should.equal(false);
            uploadTemp.acceptsFileUpload("/output").should.equal(false);
            uploadTemp.acceptsFileUpload("/index.php").should.equal(false);
        });

        it("honours a subdirectory installation path", function() {
            uploadTemp.acceptsFileUpload("/countly/i/apps/update", "/countly").should.equal(true);
            uploadTemp.acceptsFileUpload("/countly/i", "/countly").should.equal(true);
            uploadTemp.acceptsFileUpload("/countly/crowd/admin", "/countly").should.equal(false);
            // the subpath alone is not an API path
            uploadTemp.acceptsFileUpload("/countly", "/countly").should.equal(false);
            // a prefix that only looks similar must not be stripped
            uploadTemp.acceptsFileUpload("/countlyx/i/apps/update", "/countly").should.equal(false);
        });

        it("handles a missing or empty url", function() {
            uploadTemp.acceptsFileUpload(undefined).should.equal(false);
            uploadTemp.acceptsFileUpload("").should.equal(false);
        });
    });

    describe("noFileWriteOptions", function() {
        it("rejects every multipart part", function() {
            var opts = uploadTemp.noFileWriteOptions();
            opts.filter({name: "file_evil", originalFilename: "evil.jar"}).should.equal(false);
        });

        it("disables the octetstream parser, which ignores filter", function() {
            var opts = uploadTemp.noFileWriteOptions();
            opts.enabledPlugins.should.not.containEql("octetstream");
            // the remaining parsers do not write to disk, and are needed so that
            // urlencoded and json bodies still populate params.qstring
            opts.enabledPlugins.should.containEql("querystring");
            opts.enabledPlugins.should.containEql("json");
            opts.enabledPlugins.should.containEql("multipart");
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

    describe("sweepStaleUploads", function() {
        var dir;

        beforeEach(function() {
            dir = path.join(os.tmpdir(), "countly-sweep-test-" + process.pid);
            fs.rmSync(dir, {recursive: true, force: true});
            fs.mkdirSync(dir, {recursive: true});
        });

        afterEach(function() {
            fs.rmSync(dir, {recursive: true, force: true});
        });

        it("removes files older than the cutoff", function(done) {
            var stale = path.join(dir, "stalefile");
            fs.writeFileSync(stale, "leftover");
            var old = Date.now() - (2 * 60 * 60 * 1000);
            fs.utimesSync(stale, new Date(old), new Date(old));

            uploadTemp.sweepStaleUploads(dir, 60 * 60 * 1000, function(err, removed) {
                should(err).equal(null);
                removed.should.equal(1);
                fs.existsSync(stale).should.equal(false);
                done();
            });
        });

        it("leaves files that a request may still be using", function(done) {
            var fresh = path.join(dir, "freshfile");
            fs.writeFileSync(fresh, "in flight");

            uploadTemp.sweepStaleUploads(dir, 60 * 60 * 1000, function(err, removed) {
                should(err).equal(null);
                removed.should.equal(0);
                fs.existsSync(fresh).should.equal(true);
                done();
            });
        });

        it("reports nothing to do for an empty directory", function(done) {
            uploadTemp.sweepStaleUploads(dir, 60 * 60 * 1000, function(err, removed) {
                should(err).equal(null);
                removed.should.equal(0);
                done();
            });
        });

        it("does not descend into subdirectories", function(done) {
            var nested = path.join(dir, "nested");
            fs.mkdirSync(nested);
            var old = Date.now() - (2 * 60 * 60 * 1000);
            fs.utimesSync(nested, new Date(old), new Date(old));

            uploadTemp.sweepStaleUploads(dir, 60 * 60 * 1000, function(err, removed) {
                should(err).equal(null);
                removed.should.equal(0);
                fs.existsSync(nested).should.equal(true);
                done();
            });
        });

        it("does nothing when no directory was resolved", function(done) {
            uploadTemp.sweepStaleUploads(undefined, 60 * 60 * 1000, function(err, removed) {
                should(err).equal(null);
                removed.should.equal(0);
                done();
            });
        });

        it("reports an error for a missing directory", function(done) {
            uploadTemp.sweepStaleUploads(path.join(dir, "absent"), 60 * 60 * 1000, function(err) {
                should.exist(err);
                done();
            });
        });
    });
});
