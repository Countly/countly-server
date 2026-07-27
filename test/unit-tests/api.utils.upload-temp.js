var should = require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var uploadTemp = require("../../api/utils/upload-temp");

// These tests exercise pure path logic and a temp directory created under the
// OS temp directory, so they touch no request handling and no database.
describe("upload temp file handling", function() {
    // What THIS repo declares, and the only upload endpoints it serves:
    // api/api.js and plugins/star-rating/api/api.js. There is no users plugin
    // here, so nothing in this repo reads an upload on /i.
    var CORE_DECLARED = [
        {path: "/i/apps/create"},
        {path: "/i/apps/update"},
        {path: "/i/feedback/upload"},
        {path: "/i/feedback/logo"}
    ];

    // Declared by the enterprise plugins, in countly-enterprise-plugins, not
    // here. Listed so the matching behaviour they rely on is covered, and so
    // the coupling is visible: without those declarations these are refused.
    var ENTERPRISE_DECLARED = [
        {path: "/i"}, // users: SDK user_details picture
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

    // the full stack, which is what a deployed install actually has
    var REGISTERED = CORE_DECLARED.concat(ENTERPRISE_DECLARED);

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

        it("allows exactly what this repo declares", function() {
            CORE_DECLARED.forEach(function(entry) {
                allowsMultipart(uploadTemp.parseOptions(entry.path, undefined, CORE_DECLARED))
                    .should.equal(true, entry.path + " is declared here and must be allowed");
            });
        });

        it("refuses the enterprise endpoints until the enterprise plugins declare them", function() {
            // /i is the SDK write endpoint carrying the app user picture, and it
            // is declared by the users plugin in countly-enterprise-plugins.
            // With only this repo installed nothing reads an upload on /i, so
            // refusing it is correct rather than a gap.
            ENTERPRISE_DECLARED.forEach(function(entry) {
                allowsMultipart(uploadTemp.parseOptions(entry.path, undefined, CORE_DECLARED))
                    .should.equal(false, entry.path + " is not declared here");
                allowsMultipart(uploadTemp.parseOptions(entry.path, undefined, REGISTERED))
                    .should.equal(true, entry.path + " must be allowed once declared");
            });
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
            //handler swaps the path afterwards
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
