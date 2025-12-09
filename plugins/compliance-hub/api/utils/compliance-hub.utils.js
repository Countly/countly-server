var exported = {};

(function(u) {
    u.normalizeBool = function(v) {
        if (v === true || v === false) {
            return v;
        }
        if (v === "true") {
            return true;
        }
        if (v === "false") {
            return false;
        }
        return undefined;
    };

    u.computeChange = function(seg) {
        var change = {};
        var hasBf = false;
        var bfKeys = [];

        Object.keys(seg).forEach(function(k) {
            if (k.endsWith('_bf')) {
                hasBf = true;
                var base = k.slice(0, -3);
                bfKeys.push(base);
                var parsedPrev = u.normalizeBool(seg[k]);
                var parsedCurr = u.normalizeBool(seg[base]);
                if (typeof parsedPrev !== 'undefined' && typeof parsedCurr !== 'undefined' && parsedPrev !== parsedCurr) {
                    change[base] = parsedCurr;
                }
            }
        });

        if (hasBf) {
            Object.keys(seg).forEach(function(k) {
                if (k !== '_type' && !k.endsWith('_bf') && bfKeys.indexOf(k) === -1 && typeof change[k] === 'undefined') {
                    var parsedVal = u.normalizeBool(seg[k]);
                    if (typeof parsedVal !== 'undefined') {
                        change[k] = parsedVal;
                    }
                }
            });
        }
        else {
            Object.keys(seg).forEach(function(k) {
                if (k !== '_type' && !k.endsWith('_bf')) {
                    var parsedVal = u.normalizeBool(seg[k]);
                    if (typeof parsedVal !== 'undefined') {
                        change[k] = parsedVal;
                    }
                }
            });
        }

        return change;
    };
}(exported));

module.exports = exported;
