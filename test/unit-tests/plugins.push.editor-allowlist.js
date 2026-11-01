require("should");
var fs = require("fs");
var path = require("path");

// The push message editor is a live contenteditable whose stored content is run through
// xss() every time it is populated. The only legitimate markup in it is the user-property
// token <span>, so the allowlist has to name exactly the attributes that token carries -
// no more, or the sanitizer stops being a boundary, and no fewer, or every sanitize pass
// silently rewrites a stored message into a lossier one and the next edit persists that.
//
// That second direction is the one worth a test, because nothing fails loudly when it
// happens. So rather than restating the list, this derives it from the component itself:
// every attribute the component sets on a token span must survive the sanitizer.

var COMPONENT = path.join(
    __dirname, "../../plugins/push/frontend/public/javascripts/countly.views.component.common.js");
var MODEL = path.join(
    __dirname, "../../plugins/push/frontend/public/javascripts/countly.models.js");

var componentSrc = fs.readFileSync(COMPONENT, "utf8");
var modelSrc = fs.readFileSync(MODEL, "utf8");

/**
 * The span allowlist as the component declares it
 * @returns {Array} allowed attribute names
 */
function allowedSpanAttributes() {
    var m = componentSrc.match(/span:\s*\[([^\]]*)\]/);
    if (!m) {
        throw new Error("span allowlist not found in countly.views.component.common.js");
    }
    return m[1].split(",").map(function(part) {
        return part.trim().replace(/^["']|["']$/g, "");
    }).filter(Boolean);
}

/**
 * Every attribute name the given source sets with setAttribute
 * @param {string} src - source to scan
 * @returns {Array} attribute names, lower cased as the DOM treats them
 */
function attributesSetIn(src) {
    var found = [];
    var re = /setAttribute\(\s*["']([^"']+)["']/g;
    var m = re.exec(src);
    while (m) {
        var name = m[1].toLowerCase();
        if (found.indexOf(name) === -1) {
            found.push(name);
        }
        m = re.exec(src);
    }
    return found;
}

describe("push message editor sanitizer allowlist", function() {
    var allowed = allowedSpanAttributes();

    it("allows nothing but the span, and no event handlers on it", function() {
        var m = componentSrc.match(/whiteList:\s*\{([\s\S]*?)\n\s*\}/);
        m[1].should.match(/span:/);
        m[1].should.not.match(/\ba\s*:/);
        m[1].should.not.match(/img\s*:/);
        allowed.forEach(function(name) {
            name.indexOf("on").should.not.equal(0, name + " is an event handler attribute");
            ["href", "src", "style", "srcdoc", "formaction"].indexOf(name)
                .should.equal(-1, name + " can carry a url or a script");
        });
    });

    it("keeps every attribute the editor puts on a token", function() {
        // data-user-property-type was missing, so each sanitize pass dropped the type off
        // stored token markup and the next editor change persisted it without one
        var set = attributesSetIn(componentSrc).filter(function(name) {
            return name.indexOf("data-user-property-") === 0;
        });
        set.length.should.be.above(0);
        set.forEach(function(name) {
            allowed.indexOf(name).should.not.equal(-1, name + " is set on a token but sanitized away");
        });
    });

    it("keeps every attribute the stored-message rebuild puts on a token", function() {
        // countly.models.js rebuilds tokens when a saved message is opened, so its
        // attributes go through the same sanitizer
        var set = attributesSetIn(modelSrc).filter(function(name) {
            return name.indexOf("data-user-property-") === 0;
        });
        set.length.should.be.above(0);
        set.forEach(function(name) {
            allowed.indexOf(name).should.not.equal(-1, name + " is set on a token but sanitized away");
        });
    });

    it("keeps the structural attributes a token needs to work", function() {
        ["id", "class", "contenteditable"].forEach(function(name) {
            allowed.indexOf(name).should.not.equal(-1, name + " is required by the token");
        });
    });
});
