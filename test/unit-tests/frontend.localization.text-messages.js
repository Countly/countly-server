require("should");
var fs = require("fs");
var path = require("path");

// cly-notification, cly-in-page-notification, cly-empty-home and cly-empty-view render
// their message as text unless the caller sets html. A localized string they show as text
// therefore has to be plain text in every language, or that language shows the raw tags.
// The keys are the ones the templates pass to these components without html, plus the
// messages the events and views pages build in script for the same banners.
describe("localized messages shown as text", function() {
    var ROOT = path.join(__dirname, "../..");
    var BUILT_IN_SCRIPT = [
        "events.max-event-key-limit",
        "events.max-segmentation-limit",
        "events.max-unique-value-limit",
        "views.max-views-limit"
    ];

    /**
     * List files under a directory matching a test.
     * @param {string} dir - directory
     * @param {Function} test - file path predicate
     * @returns {string[]} matching files
     */
    function walk(dir, test) {
        var out = [];
        if (!fs.existsSync(dir)) {
            return out;
        }
        fs.readdirSync(dir, {withFileTypes: true}).forEach(function(entry) {
            var full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== "min" && entry.name !== "node_modules") {
                    out = out.concat(walk(full, test));
                }
            }
            else if (test(full)) {
                out.push(full);
            }
        });
        return out;
    }

    var templates = walk(path.join(ROOT, "frontend/express/public"), function(f) {
        return /\.html$/.test(f);
    });
    fs.readdirSync(path.join(ROOT, "plugins")).forEach(function(plugin) {
        templates = templates.concat(walk(path.join(ROOT, "plugins", plugin, "frontend/public"), function(f) {
            return /\.html$/.test(f);
        }));
    });

    var keys = BUILT_IN_SCRIPT.slice();
    var tag = /<(cly-notification|cly-in-page-notification|cly-empty-home|cly-empty-view)\b[^>]*>/g;
    templates.forEach(function(file) {
        var source = fs.readFileSync(file, "utf8");
        var match;
        while ((match = tag.exec(source)) !== null) {
            if (/\shtml\b/.test(match[0])) {
                continue;
            }
            var key;
            var i18n = /i18n\('([^']+)'/g;
            while ((key = i18n.exec(match[0])) !== null) {
                if (keys.indexOf(key[1]) === -1) {
                    keys.push(key[1]);
                }
            }
        }
    });

    var localizations = walk(path.join(ROOT, "frontend/express/public/localization"), function(f) {
        return /\.properties$/.test(f);
    });
    fs.readdirSync(path.join(ROOT, "plugins")).forEach(function(plugin) {
        localizations = localizations.concat(walk(path.join(ROOT, "plugins", plugin, "frontend/public/localization"), function(f) {
            return /\.properties$/.test(f);
        }));
    });

    it("finds the keys the components render as text", function() {
        keys.should.containEql("events.max-segmentation-limit");
        keys.length.should.be.above(BUILT_IN_SCRIPT.length);
        localizations.length.should.be.above(1);
    });

    it("has no markup in those keys in any language", function() {
        var found = [];
        localizations.forEach(function(file) {
            fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function(line) {
                var m = /^\s*([^=#\s]+)\s*=\s*(.*)$/.exec(line);
                if (m && keys.indexOf(m[1]) !== -1 && /<[a-zA-Z/]/.test(m[2])) {
                    found.push(path.relative(ROOT, file) + ": " + m[1]);
                }
            });
        });
        found.should.eql([]);
    });
});
