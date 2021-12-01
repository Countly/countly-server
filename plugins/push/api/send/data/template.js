const { LRU } = require('./lru'),
    personalize = require('./pers');

/**
 * Simple class for abstracting template/compilation-related logic
 * Maintains 2 layers of caching:
 * - compilation function (used for title / message / button title compilation) cache;
 * - default content cache 
 */
class Template {
    /**
     * Constructor
     * 
     * @param {Message} msg Message object
     * @param {object} platform platform object ({key, map, fields, empty})
     * @param {boolean} stringifyPayload whether to return JSON string instead of an object
     */
    constructor(msg, platform, stringifyPayload = false) {
        this.msg = msg;
        this.contents = this.msg.filterContents(platform.key);
        this.platform = platform;
        this.stringifyPayload = stringifyPayload;

        this.titles = {}; // {lang: function(data)} personalization functions for titles 
        this.messages = {}; // {lang: function(data)} personalization functions for messages

        // this.cache = new LRU({max: 100, maxAge: 60 * 1000, updateAgeOnGet: true});
        this.cache = new LRU();
        this.defaults = {}; // {lang: JSON.stringify(payload)} default payloads per locale as JSON strings for fast cloning
    }

    /**
     * Compile personalized string caching all the things
     * 
     * @param {Object} persCache personalization function cache
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object|undefined} p personalization object ({la, ...})
     * @returns {string} personalized string
     */
    str(persCache, str, pers, p) {
        if (!((p.la || '') in persCache)) {
            persCache[p.la] = personalize(str, pers);
        }
        return persCache[p.la](p);
    }

    /**
     * Compile given message to a string which can be sent caching personalization functions along the way
     * 
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object|undefined} p personalization object ({la, ...})
     * @returns {string} personalized message
     */
    message(str, pers, p) {
        return this.str(this.messages, str, pers, p);
    }

    /**
     * Compile given title to a string which can be sent caching personalization functions along the way
     * 
     * @param {string} str string to personalize
     * @param {object} pers personalization object ({la, ...})
     * @param {object|undefined} p personalization object ({la, ...})
     * @returns {string} personalized title
     */
    title(str, pers, p) {
        return this.str(this.titles, str, pers, p);
    }

    /**
     * Compile msg to platform-specific payload
     * 
     * @param {object} push push object to compile
     * @returns {object} payload object; it must not be changed or mut be changed every time in the same way (it's cached and not cloned)
     */
    compile(push) {
        // check if we have payload for this hash code
        let la = push.pr.la,
            result = this.cache.find(push.h || 0);
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
            this.result = this.platform.empty(this.msg);
            for (let i = 0; i < this.contents.length; i++) {
                let content = this.contents[i];
                if ((!content.p || content.p === this.platform.key) && (!content.la || content.la === la)) {
                    this.appl(this.platform.fields, content, push.pr);
                    if (content.title && !content.titlePers) {
                        this.platform.map.title(this, content.title);
                    }
                    if (content.message && !content.messagePers) {
                        this.platform.map.message(this, content.message);
                    }
                }
            }
            // // we only apply last data of platform contents
            // for (let i = this.contents.length - 1; i >= 0; i--) {
            //     let content = this.contents[i];
            //     if ((!content.p || content.p === this.platform.key) && (!content.la || content.la === la) && content.data) {
            //         this.platform.map.data(this, content.data);
            //     }
            // }
            this.defaults[la] = JSON.stringify(this.result);
        }

        let title = push.ov && push.ov.title ? null : undefined, // null makes following for loop ignore title in this case
            message = push.ov && push.ov.message ? null : undefined,
            buttons = push.ov && push.ov.buttons ? null : undefined,
            data = push.ov && push.ov.data ? null : undefined,
            extras = push.ov && push.ov.extras ? null : undefined;

        // now go backwards through all contents picking the latest title/message/etc 
        // this ensures that any overrides don't mess with less important values (i.e. we cannot apply data without picking, message/messagePers etc are inter dependent as well)
        // we also don't want to apply content items multiple times overriding each other
        for (let i = this.contents.length - 1; i >= 0; i--) {
            let c = this.contents[i];
            if (c.la && c.la !== la) {
                continue;
            }

            if (title === undefined) {
                if (c.titlePers) {
                    title = this.title(c.title, c.titlePers, push.pr);
                }
                else {
                    title = c.title;
                }
            }
            if (message === undefined) {
                if (c.messagePers) {
                    message = this.message(c.message, c.messagePers, push.pr);
                }
                else {
                    message = c.message;
                }
            }
            if (buttons === undefined && c.buttons && c.buttons.length) {
                buttons = c.buttons;
            }
            if (data === undefined) {
                data = c.data;
            }
            if (extras === undefined) {
                extras = c.extras;
            }
        }

        // now apply all picked content items unless there's an override in push.ov
        if (push.ov && push.ov.title) {
            if (push.ov.titlePers) {
                this.platform.map.title(this, personalize(push.ov.title, push.ov.titlePers)(push.pr));
            }
            else {
                this.platform.map.title(this, push.ov.title, push.pr);
            }
        }
        else if (title) {
            this.platform.map.title(this, title, push.pr);
        }

        if (push.ov && push.ov.message) {
            if (push.ov.messagePers) {
                this.platform.map.message(this, personalize(push.ov.message, push.ov.messagePers)(push.pr));
            }
            else {
                this.platform.map.message(this, push.ov.message, push.pr);
            }
        }
        else if (message) {
            this.platform.map.message(this, message, push.pr);
        }

        if (push.ov && push.ov.buttons) {
            this.platform.map.buttons(this, push.ov.buttons, push.pr);
        }
        else if (buttons) {
            this.platform.map.buttons(this, buttons, push.pr);
        }

        if (push.ov && push.ov.data) {
            push.ov.data = typeof push.ov.data === 'string' ? JSON.parse(push.ov.data) : push.ov.data;
            this.platform.map.data(this, push.ov.data, push.pr);
        }
        else if (data) {
            this.platform.map.data(this, data, push.pr);
        }

        if (push.ov && push.ov.extras) {
            this.platform.map.extras(this, push.ov.extras, push.pr);
        }
        else if (extras) {
            this.platform.map.extras(this, extras, push.pr);
        }

        // apply other overrides if any
        if (push.ov) {
            this.appl(this.platform.fields, push.ov, push.pr);
        }

        // cache result
        if (this.stringifyPayload) {
            let ret = JSON.stringify(this.result);
            this.cache.save(push.h, ret);
            return ret;
        }
        else {
            this.cache.save(push.h, this.result);
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



module.exports = { Template };