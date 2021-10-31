/**
 * Not really an LRU implementation, but rather a cache clearing once in a while on its own (based on number of operations)
 */
class LRU {
    /**
     * Constructor
     * 
     * @param {integer} size number of items to hold
     * @param {integer} age how often to clear the cache in `save()` calls
     */
    constructor(size = 1000, age = 10000) {
        // number of items currently stored
        this.length = 0;
        // max number of items to store
        this.size = size;
        // number of `save()` calls after which clearing is run
        this.age = age;
        // item keys queried between clears
        this.queried = {};
        // clearing counter
        this.clearing = 0;
        // where to hold items
        this.data = {};
        this.clear();
    }

    /**
     * Clear the data if neccessary and reset the clearing counter
     */
    clear() {
        let toRemove = this.length - this.size;
        if (toRemove > 0) {
            // try to remove non-queried in this run values first 
            let keys = Object.keys(this.data),
                removed = 0,
                i = 0;
            while (toRemove < removed && i < keys.length) {
                let key = keys[i++];
                if (!(key in this.queried)) {
                    delete this.data[key];
                    removed++;
                }
            }
            this.length -= removed;

            // remove other old values if that's not enough, defined by for in order
            toRemove = this.length - this.size;
            if (toRemove > 0) {
                removed = 0;
                for (let k in this.data) {
                    delete this.data[k];
                    if (toRemove > ++removed) {
                        break;
                    }
                }
                this.length -= removed;
            }
        }
        // clearTimeout(this._timeout);
        // this._timeout = setTimeout(this.clear.bind(this), this.age);
        // this.data = {};
        this.queried = {};
        this.clearing = 0;
    }

    /**
     * Getter
     * @param {string} key key to get
     * @returns {any|undefined} data if exists
     */
    find(key) {
        if (this.clearing++ > this.age) {
            this.clear();
        }
        this.queried[key] = null;
        return this.data[key];
    }

    /**
     * Getter
     * @param {string} key key to set
     * @param {any} value value to set
     * @returns {any} the data passed
     */
    save(key, value) {
        if (++this.clearing > this.age) {
            this.clear();
        }
        if (!(key in this.data)) {
            this.length++;
        }
        this.queried[key] = null;
        return this.data[key] = value;
    }

    /**
     * 
     */
}


module.exports = { LRU };