var should = require("should");
var imageUtils = require("../../plugins/star-rating/api/image-utils.js");

// Build a buffer of length `size` whose first bytes are `prefix`.
function bufWith(prefix, size) {
    var b = Buffer.alloc(size || Math.max(prefix.length, 12));
    for (var i = 0; i < prefix.length; i++) {
        b[i] = prefix[i];
    }
    return b;
}

describe("star-rating image-utils", function() {

    describe("sniffImageType", function() {
        it("recognizes PNG signature", function(done) {
            var buf = bufWith([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            should(imageUtils.sniffImageType(buf)).equal("image/png");
            done();
        });

        it("recognizes JPEG signature (FF D8 FF)", function(done) {
            var buf = bufWith([0xFF, 0xD8, 0xFF, 0xE0]);
            should(imageUtils.sniffImageType(buf)).equal("image/jpeg");
            done();
        });

        it("recognizes GIF87a", function(done) {
            // 'GIF87a' = 47 49 46 38 37 61
            var buf = bufWith([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
            should(imageUtils.sniffImageType(buf)).equal("image/gif");
            done();
        });

        it("recognizes GIF89a", function(done) {
            var buf = bufWith([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
            should(imageUtils.sniffImageType(buf)).equal("image/gif");
            done();
        });

        it("recognizes WebP (RIFF....WEBP)", function(done) {
            var buf = bufWith([
                0x52, 0x49, 0x46, 0x46, // RIFF
                0x00, 0x00, 0x00, 0x00, // size placeholder
                0x57, 0x45, 0x42, 0x50 // WEBP
            ]);
            should(imageUtils.sniffImageType(buf)).equal("image/webp");
            done();
        });

        it("rejects HTML payloads", function(done) {
            var html = Buffer.from("<!DOCTYPE html><html><body><script>alert(1)</script></body></html>", "utf8");
            should(imageUtils.sniffImageType(html)).be.null();
            done();
        });

        it("rejects SVG payloads (XML-based, not in allowlist)", function(done) {
            var svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "utf8");
            should(imageUtils.sniffImageType(svg)).be.null();
            done();
        });

        it("rejects plain text", function(done) {
            var txt = Buffer.from("just some text content here padding padding", "utf8");
            should(imageUtils.sniffImageType(txt)).be.null();
            done();
        });

        it("rejects empty buffer", function(done) {
            should(imageUtils.sniffImageType(Buffer.alloc(0))).be.null();
            done();
        });

        it("rejects buffer shorter than 12 bytes", function(done) {
            should(imageUtils.sniffImageType(Buffer.from([0x89, 0x50, 0x4E, 0x47]))).be.null();
            done();
        });

        it("rejects null / undefined input", function(done) {
            should(imageUtils.sniffImageType(null)).be.null();
            should(imageUtils.sniffImageType(undefined)).be.null();
            done();
        });

        it("rejects PNG signature with corrupted byte", function(done) {
            // Same as PNG but byte[7] flipped
            var buf = bufWith([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x00]);
            should(imageUtils.sniffImageType(buf)).be.null();
            done();
        });

        it("rejects RIFF without WEBP marker (e.g. WAV file)", function(done) {
            var buf = bufWith([
                0x52, 0x49, 0x46, 0x46, // RIFF
                0x00, 0x00, 0x00, 0x00,
                0x57, 0x41, 0x56, 0x45 // WAVE - audio, not image
            ]);
            should(imageUtils.sniffImageType(buf)).be.null();
            done();
        });

        it("rejects GIF8 followed by wrong version byte", function(done) {
            // 47 49 46 38 38 61 — '8' is not 7 or 9, so not a real GIF
            var buf = bufWith([0x47, 0x49, 0x46, 0x38, 0x38, 0x61]);
            should(imageUtils.sniffImageType(buf)).be.null();
            done();
        });

        it("does not sniff payload past the header", function(done) {
            // Real GIF89a header followed by HTML — must still classify as gif
            // and rely on Content-Type + nosniff + CSP to neutralize the trailing bytes.
            var head = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
            var trailer = Buffer.from("<html><script>alert(1)</script></html>", "utf8");
            var buf = Buffer.concat([Buffer.from(head), Buffer.alloc(20), trailer]);
            should(imageUtils.sniffImageType(buf)).equal("image/gif");
            done();
        });
    });

    describe("parseFeedbackLogoName", function() {
        it("accepts the literal global feedback_logo", function(done) {
            var p = imageUtils.parseFeedbackLogoName("feedback_logo");
            p.valid.should.be.true();
            p.isGlobal.should.be.true();
            should(p.appId).be.null();
            done();
        });

        it("accepts feedback_logo<24-hex-app-id> as per-app", function(done) {
            var appId = "0123456789abcdef01234567";
            var p = imageUtils.parseFeedbackLogoName("feedback_logo" + appId);
            p.valid.should.be.true();
            p.isGlobal.should.be.false();
            p.appId.should.equal(appId);
            done();
        });

        it("rejects names with non-hex characters in the app id slot", function(done) {
            var p = imageUtils.parseFeedbackLogoName("feedback_logoZZZZZZZZZZZZZZZZZZZZZZZZ");
            p.valid.should.be.false();
            done();
        });

        it("rejects uppercase hex in the app id slot", function(done) {
            // App ids are always lowercase hex; uppercase hints at attacker fuzzing
            var p = imageUtils.parseFeedbackLogoName("feedback_logoABCDEF0123456789ABCDEF01");
            p.valid.should.be.false();
            done();
        });

        it("rejects shorter or longer hex tails", function(done) {
            imageUtils.parseFeedbackLogoName("feedback_logo0123").valid.should.be.false();
            imageUtils.parseFeedbackLogoName("feedback_logo0123456789abcdef0123456789").valid.should.be.false();
            done();
        });

        it("rejects path-traversal style names", function(done) {
            imageUtils.parseFeedbackLogoName("../../etc/passwd").valid.should.be.false();
            imageUtils.parseFeedbackLogoName("feedback_logo/../foo").valid.should.be.false();
            done();
        });

        it("rejects HTML-bearing names", function(done) {
            imageUtils.parseFeedbackLogoName("evil.html").valid.should.be.false();
            imageUtils.parseFeedbackLogoName("<script>").valid.should.be.false();
            done();
        });

        it("rejects empty / non-string input", function(done) {
            imageUtils.parseFeedbackLogoName("").valid.should.be.false();
            imageUtils.parseFeedbackLogoName(null).valid.should.be.false();
            imageUtils.parseFeedbackLogoName(undefined).valid.should.be.false();
            imageUtils.parseFeedbackLogoName(123).valid.should.be.false();
            imageUtils.parseFeedbackLogoName({}).valid.should.be.false();
            done();
        });

        it("rejects names with extra prefix or suffix", function(done) {
            imageUtils.parseFeedbackLogoName("Xfeedback_logo").valid.should.be.false();
            imageUtils.parseFeedbackLogoName("feedback_logo ").valid.should.be.false();
            imageUtils.parseFeedbackLogoName(" feedback_logo").valid.should.be.false();
            imageUtils.parseFeedbackLogoName("feedback_logo\n").valid.should.be.false();
            done();
        });
    });
});

// The logo upload identifier becomes the name of the stored file, and it used to be
// concatenated into the upload path unchecked. These cases cover the shapes that would
// have chosen a write location instead of a file name.
describe("safeLogoIdentifier", function() {
    it("keeps the identifier the dashboard actually sends", function() {
        // the dropzone sends Date.now()
        imageUtils.safeLogoIdentifier(1755100000000).should.equal("1755100000000");
        imageUtils.safeLogoIdentifier("1755100000000").should.equal("1755100000000");
    });
    it("keeps plain names with underscores and dashes", function() {
        imageUtils.safeLogoIdentifier("feedback_logo").should.equal("feedback_logo");
        imageUtils.safeLogoIdentifier("my-logo_2").should.equal("my-logo_2");
    });
    it("refuses traversal out of the images directory", function() {
        should.not.exist(imageUtils.safeLogoIdentifier("../../../../../../../../tmp/final_poc"));
        should.not.exist(imageUtils.safeLogoIdentifier("../../frontend/express/public/appimages/6a41837e902bfd5369ddc610"));
        should.not.exist(imageUtils.safeLogoIdentifier(".."));
        should.not.exist(imageUtils.safeLogoIdentifier("..%2f..%2ftmp%2fx"));
    });
    it("refuses separators and absolute paths in any form", function() {
        should.not.exist(imageUtils.safeLogoIdentifier("/tmp/x"));
        should.not.exist(imageUtils.safeLogoIdentifier("sub/dir"));
        should.not.exist(imageUtils.safeLogoIdentifier("sub\\dir"));
        should.not.exist(imageUtils.safeLogoIdentifier("C:x"));
    });
    it("refuses names that are not plain identifiers", function() {
        should.not.exist(imageUtils.safeLogoIdentifier(""));
        should.not.exist(imageUtils.safeLogoIdentifier("."));
        should.not.exist(imageUtils.safeLogoIdentifier("a.b")); // the extension is server chosen
        should.not.exist(imageUtils.safeLogoIdentifier("a b"));
        // a NUL is the classic path truncation trick, so pin it explicitly
        should.not.exist(imageUtils.safeLogoIdentifier("a\u0000b"));
        should.not.exist(imageUtils.safeLogoIdentifier("a\u0009b"));
        should.not.exist(imageUtils.safeLogoIdentifier(undefined));
        should.not.exist(imageUtils.safeLogoIdentifier(null));
        should.not.exist(imageUtils.safeLogoIdentifier({}));
        should.not.exist(imageUtils.safeLogoIdentifier(NaN));
    });
});

describe("logoStorageName", function() {
    var APP = "6a41837e902bfd5369ddc610";
    var OTHER = "6a41837e902bfd5369ddc611";

    it("puts the app id in front of the identifier", function() {
        imageUtils.logoStorageName(APP, "1755000000000", "png")
            .should.equal(APP + "_1755000000000.png");
    });

    it("gives two apps different names for the same identifier", function() {
        // this is the whole point: the images directory is shared, so an un-namespaced
        // name lets one app overwrite another's logo, and no amount of checking before
        // writing closes that - the two can interleave, and an upload happens before the
        // widget that will point at it exists, so there is nothing to check against yet
        var mine = imageUtils.logoStorageName(APP, "shared", "png");
        var theirs = imageUtils.logoStorageName(OTHER, "shared", "png");
        mine.should.not.equal(theirs);
    });

    it("refuses an app id that is not an ObjectID", function() {
        // the id is concatenated into the stored name, and a name is a path
        should.not.exist(imageUtils.logoStorageName("../../etc", "x", "png"));
        should.not.exist(imageUtils.logoStorageName("6a41837e902bfd5369ddc61", "x", "png"));
        should.not.exist(imageUtils.logoStorageName(APP + "0", "x", "png"));
        should.not.exist(imageUtils.logoStorageName("", "x", "png"));
        should.not.exist(imageUtils.logoStorageName(undefined, "x", "png"));
        should.not.exist(imageUtils.logoStorageName(null, "x", "png"));
        should.not.exist(imageUtils.logoStorageName({}, "x", "png"));
    });

    it("refuses an identifier safeLogoIdentifier would refuse", function() {
        should.not.exist(imageUtils.logoStorageName(APP, "../x", "png"));
        should.not.exist(imageUtils.logoStorageName(APP, "a.b", "png"));
        should.not.exist(imageUtils.logoStorageName(APP, "", "png"));
        should.not.exist(imageUtils.logoStorageName(APP, "a b", "png"));
    });

    it("refuses an extension that did not come from sniffing", function() {
        should.not.exist(imageUtils.logoStorageName(APP, "x", "phtml"));
        should.not.exist(imageUtils.logoStorageName(APP, "x", "../png"));
        should.not.exist(imageUtils.logoStorageName(APP, "x", ""));
        should.not.exist(imageUtils.logoStorageName(APP, "x", undefined));
    });

    it("accepts the three extensions sniffing can produce", function() {
        ["png", "jpeg", "gif"].forEach(function(ext) {
            imageUtils.logoStorageName(APP, "x", ext).should.equal(APP + "_x." + ext);
        });
    });
});
