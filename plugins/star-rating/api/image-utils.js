/**
 * Detect image MIME type by inspecting magic bytes. Does NOT trust
 * any client-supplied or stored MIME string. Returns one of the
 * allowlisted image MIME types, or null if the buffer is not a
 * recognized safe image format.
 * @param {Buffer} buf - file content
 * @returns {string|null} MIME type or null if not a recognized image
 */
function sniffImageType(buf) {
    if (!buf || buf.length < 12) {
        return null;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
        && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) {
        return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
        return 'image/jpeg';
    }
    // GIF87a / GIF89a: 47 49 46 38 (37|39) 61
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
        && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) {
        return 'image/gif';
    }
    // WebP: "RIFF" .... "WEBP"
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
        && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
        return 'image/webp';
    }
    return null;
}

// Allowed feedback logo names: the literal global "feedback_logo" or
// "feedback_logo<24-char-hex-app-id>" for per-app logos.
var FEEDBACK_LOGO_NAME_RE = /^feedback_logo([a-f0-9]{24})?$/;

/**
 * Validate a feedback logo name and, if it's a per-app logo, return
 * the app id encoded in it.
 * @param {string} name - candidate name
 * @returns {object} parse result with `valid`, `isGlobal`, and `appId` fields
 */
function parseFeedbackLogoName(name) {
    if (typeof name !== 'string') {
        return {valid: false, isGlobal: false, appId: null};
    }
    var m = FEEDBACK_LOGO_NAME_RE.exec(name);
    if (!m) {
        return {valid: false, isGlobal: false, appId: null};
    }
    return {valid: true, isGlobal: !m[1], appId: m[1] || null};
}

module.exports = {
    sniffImageType: sniffImageType,
    parseFeedbackLogoName: parseFeedbackLogoName
};
