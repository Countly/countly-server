const Module = require('module'),
    { join } = require('path');

const defreq = Module.prototype.require,
    corepath = join(__dirname, '..'),
    rootpath = join(__dirname, '..', '..');
/**
 * Override default require to be able to require ee from core and vice versa 
 * 
 * @param {string} p module path
 * @returns {any} module
 * @throws {Error} if module not found
 */
Module.prototype.require = function(p) {
    try {
        return defreq.apply(this, [p]);
    }
    catch (e) {
        if (p.startsWith(rootpath)) { // absolute path
            if (p.startsWith(corepath)) { // absolute from core, check ee
                let suf = p.substring(corepath.length);
                return defreq(join(rootpath, suf));
            }
            else { // absolute from ee, check core
                let suf = p.substring(rootpath.length);
                return defreq(join(rootpath, 'core', suf));
            }
        }
        else if (this.path.startsWith(corepath)) { // from core
            let suf = this.path.substring(corepath.length);
            return defreq.apply(this, [join(rootpath, suf, p)]);
        }
        else if (!p.startsWith("./") && !p.startsWith("../")) { // dependency from core
            return defreq.apply(this, [join(corepath, 'node_modules', p)]);
        }
        else {
            let suf = this.path.substring(rootpath.length); // from ee
            return defreq(join(rootpath, 'core', suf, p));
        }
    }
};