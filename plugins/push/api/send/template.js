const LRU = require('lru-cache'),
    personalize = require('./pers');

/**
 * Simple class for abstracting template/compilation-related logic
 */
class Template {
    /**
     * Constructor
     * 
     * @param {Note} note Note object
     * @param {object} platform platform object ({map, fields, empty})
     * @param {boolean} stringifyPayload whether to return JSON string instead of object
     */
    constructor(note, platform, stringifyPayload = false) {
        this.note = note;
        this.platform = platform;
        this.stringifyPayload = stringifyPayload;

        this.titles = {}; // {lang: function(data)} personalization functions for titles 
        this.messages = {}; // {lang: function(data)} personalization functions for titles

        this.cache = new LRU({max: 100, maxAge: 60 * 1000, updateAgeOnGet: true});
        this.defaults = {}; // {lang: JSON.stringify(payload)} default payloads per locale as JSON strings for fast cloning
    }

    /**
     * Compile personalized string caching all the things
     * 
     * @param {Object} persCache personalization function cache
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object} p personalization object ({la, ...})
     * @returns {string} personalized string
     */
    str(persCache, str, pers, p) {
        if (!(p.la in persCache)) {
            persCache[p.la] = personalize(str, pers);
        }
        return persCache[p.la](p);
    }

    /**
     * Compile given message to a string which can be sent
     * 
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object} p personalization object ({la, ...})
     * @returns {string} personalized message
     */
    message(str, pers, p) {
        return this.str(this.messages, str, pers, p);
    }

    /**
     * Compile given title to a string which can be sent
     * 
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object} p personalization object ({la, ...})
     * @returns {string} personalized title
     */
    title(str, pers, p) {
        return this.str(this.titles, str, pers, p);
    }

    /**
     * Compile note to platform-specific payload
     * 
     * @param {object} push push object to compile
     * @returns {object} payload object; it must not be changed or mut be changed every time in the same way (it's cached and not cloned)
     */
    compile(push) {
        // check if we have payload for this hash code
        let la = push.p.la || 'default',
            result = this.cache.get(push.h || 0);
        if (result) {
            return result;
        }

        // get localized JSON string (without overrides or personalization) for this language
        result = this.defaults[la];
        if (result) {
            this.result = JSON.parse(result);
        }
        else {
            // or create new one
            this.result = this.platform.empty(this.note);
            this.appl(this.platform.fields, this.note, push.p);
            this.defaults[la] = JSON.stringify(this.result);
        }

        // buttons is a special case - it must be set prior to mpl which depends on it
        if (push.o && push.o.buttons !== null && push.o.buttons !== undefined) {
            this.platform.map.buttons(this, push.o.buttons);
        }
        else if (this.note.buttons && this.note.buttons !== null && this.note.buttons !== undefined) {
            this.platform.map.buttons(this, this.note.buttons);
        }

        // set titles, messages & buttons json
        if (push.o && push.o.messagePerLocale) {
            this.platform.map.messagePerLocale(this, push.o.messagePerLocale, push.p);
        }
        else if (this.note.messagePerLocale.default) {
            this.platform.map.messagePerLocale(this, this.note.messagePerLocale, push.p);
        }

        // set data (we don't want data fields mixed between note.data & push.o)
        if (push.o && push.o.data) {
            push.o.data = typeof push.o.data === 'string' ? JSON.parse(push.o.data) : push.o.data;
            this.platform.map.data(this, push.o.data, push.p);
        }
        else if (this.note.data) {
            this.platform.map.data(this, this.note.data, push.p);
        }

        // add extras if any (again, we cannot mix note.extras & push.o.extras)
        if (push.o && push.o.extras) {
            this.platform.map.extras(this, push.o.extras, push.p);
        }
        else if (this.note.extras) {
            this.platform.map.extras(this, this.note.extras, push.p);
        }

        // apply other overrides if any
        if (push.o) {
            // those 2 ifs above and skipBtnMpl here is to generate strings once if mpl exists in note & o - main case for tx
            this.appl(this.platform.fields, push.o, push.p);
        }

        // cache result
        if (this.stringifyPayload) {
            let ret = JSON.stringify(this.result);
            this.cache.set(push.h, ret);
            return ret;
        }
        else {
            this.cache.set(push.h, this.result);
            // returned result must not be changed at all or changed every time in the same way (it's not cloned)
            return this.result;
        }
    }

    /**
     * Apply data fields defined by `fields` to `this.result` taking data from `data`
     * 
     * @param {string[]} fields array of fields
     * @param {object} data data to apply
     * @param {object} pers personalization object (p)
     */
    appl(fields, data, pers) {
        for (let i = 0; i < fields.length; i++) {
            let field = fields[i],
                value = data[field];
            if (value !== null && value !== undefined) {
                this.platform.map[fields[i]](this, value, pers);
            }
        }
    }
}



module.exports = Template;