const { Note } = require('../parts/note'),
    { PLATFORM } = require('./platforms'),
    personalize = require('./pers');

/**
 * Messages collection logic to be placed in front of sending code. 
 * It needs to be done early (in worker master thread or on data source part of a socket) to eliminate latency of querying messages from senders.
 */
class Streams {
    /**
     * Constructor
     */
    constructor(retrieve) {
        this.streams = {};
        this.misses = {};
    }

    add(message) {

    }
}

/**
 * Class which more or less corresponds to Note class in push plugin.
 * Main purpose of Stream is to do payload compilation as few times as possible as opposed to doing that for each token.
 * Goal is to keep memory usage low and not to waste CPU cycles.
 */
class Stream extends Note {
    /**
     * Constructor
     * @param {string} platform Platform to compile notifications for
     * @param {object} data Stream payload (Note's data)
     */
    constructor(platform, data) {
        super(data);
        this.platform = PLATFORM[platform];
        this.templates = {}; // {locale: compiled notification object}
    }

    /**
     * Get payload for a particular locale
     * 
     * @param {string} locale Locale of the notification
     * @returns {string} notification payload
     */
    template(locale) {
        return this.cache[locale] || this.cache[''];
    }

    /**
     * Get payload for a particular locale
     * 
     * @param {string} locale Locale of the notification
     * @param {object} message notification object (i.e. {n, d, o: { ... overrides ... }, p: { ... user props ... }})
     * @returns {string} notification payload to send
     */
    compile(locale, message) {
        return super.compile(this);
    }
}

/**
 * Stream which allows personalization & overrides
 */
class PersonalizedStream extends Stream {
    /**
     * Constructor
     * @param {string} platform Platform to compile notifications for
     * @param {object} data Stream payload {@see Stream#constructor} with the following exceptions:
     * @param {object} data.titlePers notification title personalization object ({0: 'name', 5: 'custom.surname'})
     * @param {object} data.messagePers notification message personalization object ({0: 'name', 5: 'custom.surname'})
     */
    constructor(platform, data) {
        super(platform, data);
        this.templates = {
            '': this.platform.template(data)
        };
        // 
        this.defaults = {
            '': JSON.stringify(this.templates.default)
        };
    }

    /**
     * Construct payload for a particular locale/override
     * 
     * @param {string} locale Locale of the notification
     * @param {object} override All the overrides if any
     * @returns {string} notification payload
     */
    compile(locale, override) {
    }

    /**
     * Get payload for a particular locale/override from cached templates or compile new data
     * 
     * @param {string} locale Locale of the notification
     * @param {object} override All the overrides if any
     * @returns {string} notification payload
     */
    template(locale, override) {
        if (override) {
            return this.compile(locale, override);
        }
        else {
            return this.templates[locale] || (this.templates[locale] = this.compile(locale));
        }
    }
}

/**
 * Create Stream or PersonalizedStream based on data
 * @param {string} id Stream ID
 * @param {object} data Stream payload
 * @returns {Stream} stream object
 */
module.exports = function(id, data) {
    if (data.isPersonalized) {
        return new PersonalizedStream(id, data);
    }
    else {
        return new Stream(id, data);
    }
};

module.exports = { Stream, PersonalizedStream, Streams };