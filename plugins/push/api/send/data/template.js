const { LRU } = require('./lru'),
    personalize = require('./pers'),
    { Content } = require('./content'),
    { Message } = require('./message');

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
     * Simplified version of {@link compile} for push/user query
     * 
     * @param {object} push push object to compile
     * @returns {object} simplified message sending result
     */
    guess_compile(push) {
        let la = push.pr.la,
            title, message;

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

        for (let i = this.contents.length - 1; i >= 0; i--) {
            let c = this.contents[i];
            if (c.la && c.la !== la) {
                continue;
            }

            if (title === undefined) {
                if (c.titlePers) {
                    title = this.title(c.title, c.titlePersDeup, push.pr);
                }
                else {
                    title = c.title;
                }
            }
            if (message === undefined) {
                if (c.messagePers) {
                    message = this.message(c.message, c.messagePersDeup, push.pr);
                }
                else {
                    message = c.message;
                }
            }
        }

        return {
            _id: this.msg.id,
            title,
            message
        };
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

        let title,
            message,
            buttons,
            data,
            extras,
            specific = {},
            fields = {},
            overrides = [];

        if (push.c && push.c.length) {
            overrides = Message.filterContents(push.c, this.platform.key, la).map(Content.from);
        }

        // now go backwards through all contents picking the latest title/message/etc 
        // this ensures that any overrides don't mess with less important values (i.e. we cannot apply data without picking, message/messagePers etc are inter dependent as well)
        // we also don't want to apply content items multiple times overriding each other
        for (let i = this.contents.length + overrides.length - 1; i >= 0; i--) {
            let c = i >= this.contents.length ? overrides[i - this.contents.length] : this.contents[i];
            if (c.la && c.la !== la) {
                continue;
            }

            if (title === undefined) {
                if (c.titlePers) {
                    title = this.title(c.title, c.titlePersDeup, push.pr);
                }
                else {
                    title = c.title;
                }
            }
            if (message === undefined) {
                if (c.messagePers) {
                    message = this.message(c.message, c.messagePersDeup, push.pr);
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
                extras = c.extrasDeup;
            }
            if (c.specific) {
                c.specific.forEach(obj => {
                    for (let k in obj) {
                        if (specific[k] === undefined) {
                            specific[k] = obj[k];
                        }
                    }
                });
            }

            // record last fields
            for (let f = 0; f < this.platform.fields.length; f++) {
                let field = this.platform.fields[f],
                    value = c[field];
                if (value !== null && value !== undefined && fields[field] === undefined) {
                    fields[field] = value;
                }
            }
        }

        // now apply all picked content items unless there's an override in push.ov
        if (title) {
            this.platform.map.title(this, title, push.pr);
        }

        if (message) {
            this.platform.map.message(this, message, push.pr);
        }

        if (buttons) {
            this.platform.map.buttons(this, buttons, push.pr);
        }

        if (data) {
            this.platform.map.data(this, data, push.pr);
        }

        if (extras) {
            this.platform.map.extras(this, extras, push.pr);
        }

        if (specific) {
            this.platform.map.specific(this, specific, push.pr);
        }

        for (let field in fields) {
            this.platform.map[field](this, fields[field], push.pr);
        }

        this.result = this.platform.finish ? this.platform.finish(this.result) : this.result;

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