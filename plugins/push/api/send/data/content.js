'use strict';

const { PushError } = require('./error'),
    { S, Validatable, PERS_TYPES } = require('./const');

/**
 * Message `contents` array consists of Content objects, it's to be defined the following way (each line below is an element of `contents` array):
 * 0. {p: undefined, la: undefined, ...} - a required default Content (no p or la in it)
 * 1. {p: 'i', badge: 2} - an override for all iOS devices
 * 2. {p: 'a', la: 'de'} - another override for Android devices with german locale, other locales would still use 0.
 * 3. {p: 'i', la: 'fr'} - applies on top of 'i' override for iOS devices with french locale, other locales would use 1.
 */
class Content extends Validatable {
    /**
     * Constructor
     * 
     * @param {object}      data                    contents data
     * @param {string}      data.p                  this content overrides default content for this platform
     * @param {string}      data.la                 this content overrides default content for this language
     * @param {string}      data.title              title
     * @param {object}      data.titlePers          title personalization ({'2': {f, c, k}})
     * @param {string}      data.message            message
     * @param {object}      data.messagePers        message personalization ({'2': {f, c, k}})
     * @param {string}      data.sound              sound
     * @param {number}      data.badge              badge
     * @param {string}      data.data               JSON of additional data to send
     * @param {string[]}    data.extras             array of user props to send
     * @param {string}      data.url                on-tap URL
     * @param {string}      data.media              media URL
     * @param {string}      data.mediaMime          media MIME type
     * @param {object[]}    data.buttons            buttons array
     * @param {string}      data.buttons[].url      button action URL
     * @param {string}      data.buttons[].title    button title
     * @param {string}      data.buttons[].pers     button title personalization
     * @param {object[]}    data.specific[]         ... any other platform-specific field in a form of Object[], i.e. [{subtitle: 'Subtitle'}, {large_icon: 'icon'}]. 
     *                                              Currently supported for iOS:
     *                                                  {subtitle: 'Subtitle'}
     *                                              Currently supported for Android:
     *                                                  {large_icon: 'icon'}
     */
    constructor(data) {
        super(data);
    }

    /**
     * Validation scheme for common.validateArgs
     */
    static get scheme() {
        return {
            p: {
                type: 'String',
                required: false,
                in: () => require('../platforms').platforms
            },
            la: {type: 'String', required: false},
            title: {type: 'String', required: false, trim: true},
            titlePers: {type: 'Object', required: false, nonempty: true, custom: Content.validatePers},
            message: {type: 'String', required: false, trim: true},
            messagePers: {type: 'Object', required: false, nonempty: true, custom: Content.validatePers},
            sound: {type: 'String', required: false, trim: true},
            badge: {type: 'Number', required: false},
            data: {type: 'JSON', required: false, nonempty: true},
            extras: {type: 'String[]', required: false, 'min-length': 1},
            expiration: {type: 'Number', required: false, min: 60000, max: 365 * 24 * 3600000},
            url: {type: 'URL', required: false, trim: true},
            media: {type: 'URL', required: false, trim: true},
            mediaMime: {type: 'String', required: false},
            buttons: {
                type: {
                    url: {type: 'URL', required: true, trim: true},
                    title: {type: 'String', required: true, trim: true},
                    pers: {type: 'Object', required: false, nonempty: true, custom: Content.validatePers},
                },
                array: true,
                'min-length': 1,
                'max-length': 2,
                required: false
            },
            specific: { type: 'Object[]', required: false, 'min-length': 1 },
        };
    }

    /**
     * Validate personalisation object {'0': {c: true, f: 'Fallback', k: 'custom.x'}}
     * 
     * @param {object} obj personalisation object to validate
     * @returns {string|undefined} string error if validation failed
     */
    static validatePers(obj) {
        if (obj === undefined) {
            return;
        }
        for (let k in obj) {
            if (isNaN(parseInt(k, 10))) {
                return 'Personalisation key must be a number';
            }
            let opt = obj[k];
            if (Object.keys(opt).length === 0) {
                return 'Personalisation object cannot be empty';
            }
            let anykey = false;
            for (let kk in opt) {
                anykey = true;
                if (kk === 'k') {
                    if (typeof opt[kk] !== 'string' || !opt[kk]) {
                        return 'Personalisation key must be a non empty string';
                    }
                }
                else if (kk === 'c') {
                    if (typeof opt[kk] !== 'boolean') {
                        return 'Personalisation capitalise option must be boolean';
                    }
                }
                else if (kk === 'f') {
                    if (typeof opt[kk] !== 'string' || !opt[kk]) {
                        return 'Personalisation fallback must be a non empty string';
                    }
                }
                else if (kk === 't') {
                    if (typeof opt[kk] !== 'string' || PERS_TYPES.indexOf(opt[kk]) === -1) {
                        return 'Personalisation type must be a non empty string equal to one of "e, u, c, a"';
                    }
                }
                else {
                    return 'Invalid key in personalisation object';
                }
            }
            if (!anykey) {
                return 'Empty object in personalisation object';
            }
        }
    }

    /**
     * Getter for p (platform)
     * 
     * @returns {string|undefined} Content p (platform)
     */
    get p() {
        return this._data.p;
    }

    /**
     * Setter for p (platform)
     * 
     * @param {string|undefined} p Content p (platform)
     */
    set p(p) {
        if (p !== null && p !== undefined) {
            this._data.p = p;
        }
        else {
            delete this._data.p;
        }
    }

    /**
     * Getter for la (language)
     * 
     * @returns {string|undefined} Content la (language)
     */
    get la() {
        return this._data.la;
    }

    /**
     * Setter for la (language)
     * 
     * @param {string|undefined} la Content la (language)
     */
    set la(la) {
        if (la !== null && la !== undefined) {
            this._data.la = la;
        }
        else {
            delete this._data.la;
        }
    }

    /**
     * Getter for title
     * 
     * @returns {string|undefined} message title text
     */
    get title() {
        return this._data.title;
    }

    /**
     * Setter for title
     * 
     * @param {string|undefined} title message title text
     */
    set title(title) {
        if (title !== null && title !== undefined) {
            this._data.title = title;
        }
        else {
            delete this._data.title;
        }
    }

    /**
     * Getter for titlePers
     * 
     * @returns {object|undefined} title personalization
     */
    get titlePers() {
        return this._data.titlePers;
    }

    /**
     * Setter for titlePers
     * 
     * @param {object|undefined} titlePers title personalization
     */
    set titlePers(titlePers) {
        if (titlePers !== null && titlePers !== undefined) {
            this._data.titlePers = titlePers;
        }
        else {
            delete this._data.titlePers;
        }
    }

    /**
     * Getter for titlePers with leading "up." removed from field names
     * 
     * @returns {object|undefined} title personalization
     */
    get titlePersDeup() {
        if (!this._titlePersDeup && this._data.titlePers) {
            this._titlePersDeup = Content.deupPers(this._data.titlePers);
        }
        return this._titlePersDeup;
    }

    /**
     * Getter for message
     * 
     * @returns {string|undefined} message text
     */
    get message() {
        return this._data.message;
    }

    /**
     * Setter for message
     * 
     * @param {string|undefined} message message text
     */
    set message(message) {
        if (message !== null && message !== undefined) {
            this._data.message = message;
        }
        else {
            delete this._data.message;
        }
    }

    /**
     * Getter for messagePers
     * 
     * @returns {object|undefined} message personalization
     */
    get messagePers() {
        return this._data.messagePers;
    }

    /**
     * Setter for messagePers
     * 
     * @param {object|undefined} messagePers message personalization
     */
    set messagePers(messagePers) {
        if (messagePers !== null && messagePers !== undefined) {
            this._data.messagePers = messagePers;
        }
        else {
            delete this._data.messagePers;
        }
    }

    /**
     * Getter for titlePers with leading "up." removed from field names
     * 
     * @returns {object|undefined} title personalization
     */
    get messagePersDeup() {
        if (!this._messagePersDeup && this._data.messagePers) {
            this._messagePersDeup = Content.deupPers(this._data.messagePers);
        }
        return this._messagePersDeup;
    }

    /**
     * Deup (remove leading "up.") from personalisation object and return new one
     * 
     * @param {object} obj object to deup
     * @returns {object} object with keys deupped
     */
    static deupPers(obj) {
        let ret = {};
        Object.keys(obj).forEach(idx => {
            let {f, c, k, t} = obj[idx];
            ret[idx] = {
                f,
                c,
                t,
                k: k.indexOf('up.') === 0 ? k.substring(3) : k,
            };
        });
        return ret;
    }

    /**
     * Getter for sound
     * 
     * @returns {string|undefined} notification sound
     */
    get sound() {
        return this._data.sound;
    }

    /**
     * Setter for sound
     * 
     * @param {string|undefined} sound notification sound
     */
    set sound(sound) {
        if (sound !== null && sound !== undefined) {
            this._data.sound = sound;
        }
        else {
            delete this._data.sound;
        }
    }

    /**
     * Getter for badge
     * 
     * @returns {number|undefined} notification badge
     */
    get badge() {
        return this._data.badge;
    }

    /**
     * Setter for badge
     * 
     * @param {number|undefined} badge notification badge
     */
    set badge(badge) {
        if (badge !== null && badge !== undefined) {
            this._data.badge = badge;
        }
        else {
            delete this._data.badge;
        }
    }

    /**
     * Get additional data to send with the message
     * 
     * @returns {object|undefined} data to send
     */
    get data() {
        if (!('_data_obj' in this)) {
            this._data_obj = typeof this._data.data === 'string' ? JSON.parse(this._data.data) : this._data.data;
        }
        return this._data_obj;
    }

    /**
     * Set additional data to send with the message
     * 
     * @param {object|undefined} data data to send
     */
    set data(data) {
        if (data) {
            this._data.data = typeof data === 'object' ? JSON.stringify(data) : data;
        }
        else {
            delete this._data.data;
        }
    }

    /**
     * Getter for extras
     * 
     * @returns {string[]} array of user prop keys to send
     */
    get extras() {
        return this._data.extras;
    }

    /**
     * Setter for extras
     * 
     * @param {string[]|undefined} extras array of user prop keys to send
     */
    set extras(extras) {
        if (Array.isArray(extras)) {
            this._data.extras = Array.from(new Set(extras));
        }
        else {
            delete this._data.extras;
        }
    }

    /**
     * Getter for extras with leading "up." removed
     * 
     * @returns {string[]} array of user prop keys to send
     */
    get extrasDeup() {
        if (!this._extrasDeup && this._data.extras) {
            this._extrasDeup = Content.deupExtras(this._data.extras);
        }
        return this._extrasDeup;
    }

    /**
     * Deup (remove leading "up.") property key array
     * 
     * @param {string[]} arr array of property keys
     * @returns {string[]} array with keys deupped
     */
    static deupExtras(arr) {
        return arr.map(x => x.indexOf('up.') === 0 ? x.substring(3) : x);
    }

    /**
     * Getter for expiration
     * 
     * @returns {number} ms for a push to expire in push provider queue
     */
    get expiration() {
        return this._data.expiration;
    }

    /**
     * Setter for expiration
     * 
     * @param {number} expiration ms for a push to expire in push provider queue
     */
    set expiration(expiration) {
        if (typeof expiration === 'number') {
            this._data.expiration = expiration;
        }
        else {
            delete this._data.expiration;
        }
    }

    /**
     * Add user prop key to the set
     * 
     * @param {string} key user prop key to push
     */
    push(key) {
        if (!this._data.extras) {
            this._data.extras = [];
        }
        if (this._data.extras.indexOf(key) === -1) {
            this._data.extras.push(key);
        }
    }

    /**
     * Remove user prop key from the set
     * 
     * @param {string} key user prop key to push
     */
    pop(key) {
        if (!this._data.extras) {
            this._data.extras = [];
        }
        if (this._data.extras && this._data.extras.indexOf(key) !== -1) {
            this._data.extras.splice(this._data.extras.indexOf(key), 1);
        }
    }

    /**
     * Getter for url
     * 
     * @returns {string|undefined} on-tap URL
     */
    get url() {
        return this._data.url;
    }

    /**
     * Setter for url
     * 
     * @param {string|undefined} url on-tap URL
     */
    set url(url) {
        if (url !== null && url !== undefined) {
            this._data.url = url;
        }
        else {
            delete this._data.url;
        }
    }

    /**
     * Getter for media
     * 
     * @returns {string|undefined} media URL
     */
    get media() {
        return this._data.media;
    }

    /**
     * Setter for media
     * 
     * @param {string|undefined} media media URL
     */
    set media(media) {
        if (media !== null && media !== undefined) {
            this._data.media = media;
        }
        else {
            delete this._data.media;
        }
    }

    /**
     * Getter for mediaMime
     * 
     * @returns {string|undefined} media MIME type
     */
    get mediaMime() {
        return this._data.mediaMime;
    }

    /**
     * Setter for mediaMime
     * 
     * @param {string|undefined} mediaMime media MIME type
     */
    set mediaMime(mediaMime) {
        if (mediaMime !== null && mediaMime !== undefined) {
            this._data.mediaMime = mediaMime;
        }
        else {
            delete this._data.mediaMime;
        }
    }

    /**
     * Button getter/setter
     * - call button(i) to get full button object
     * - call button(i, "http://google.com", "Google", {0: ...}) to set the button
     * - call platform(i, null, null, null) to remove the button at index i
     * 
     * @param {string} i button index
     * @param {string|null|undefined} url button url or null to remove button
     * @param {string|null|undefined} title button title
     * @param {object|null|undefined} pers personalization object
     * @returns {object} button object
     */
    button(i, url, title, pers) {
        if (typeof i !== 'number' || i < 0 || i > 2) {
            throw new PushError(`${i} is not a valid button index`);
        }

        if (url === undefined && title === undefined && pers === undefined) {
            return this._data.buttons && this._data.buttons[i] || undefined;
        }

        if (url === null && title === null && pers === null) {
            if (this._data.buttons && this._data.buttons[i]) {
                return this._data.buttons.splice(i, 1)[0];
            }
            return;
        }

        if (!this._data.buttons) {
            this._data.buttons = [];
        }

        if (!this._data.buttons[i]) {
            this._data.buttons[i] = {};
        }
        this._data.buttons[i].url = url;
        this._data.buttons[i].title = title;
        if (pers !== null && pers !== undefined) {
            this._data.buttons[i].pers = pers;
        }
        else {
            delete this._data.buttons[i].pers;
        }
        return this._data.buttons[i];
    }

    /**
     * Getter for buttons
     * 
     * @returns {object[]|undefined} buttons array
     */
    get buttons() {
        return this._data.buttons;
    }

    /**
     * Getter for specific
     * 
     * @returns {object[]|undefined} media MIME type
     */
    get specific() {
        return this._data.specific;
    }

    /**
     * Setter for specific
     * 
     * @param {object[]|undefined} specific platform specific objects
     */
    set specific(specific) {
        if (specific !== null && specific !== undefined) {
            this._data.specific = specific;
        }
        else {
            delete this._data.specific;
        }
    }

    /**
     * Platform fields getter/setter
     * - call specific() to get an object containing all fields
     * - call specific(key) to get data for a key
     * - call specific(key, "smth") to set the field
     * - call specific(key, null) to remove data
     * 
     * @param {string} key field key
     * @param {any|null|undefined} value field data (pass undefined to get, pass null to remove)
     * @returns {any} stored value
     */
    specifics(key, value) {
        if (key === undefined) {
            return this._data.specific ? JSON.parse(this._data.specific) : undefined;
        }

        if (!this.p && key) {
            throw new PushError(`Cannot get/set platform-specific field ${key} in non-platform specific Content`);
        }
        let data = this._data.specific ? JSON.parse(this._data.specific) : {};
        if (value === null) {
            delete data[key];
            this._data.specific = JSON.stringify(data);
        }
        else if (value !== undefined) {
            data[key] = value;
            this._data.specific = JSON.stringify(data);
        }
        return data[key];
    }

    /**
     * Backwards-compatibility conversion of Note to Content
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Content|Content[]} array of Content instances
     */
    static fromNote(note) {
        let mpl = note.messagePerLocale || {},
            locales = Object.keys(mpl).filter(k => {
                let v = mpl[k];
                if (typeof v !== 'string' || !v || k.indexOf('default') === 0) {
                    return false;
                }
                else if (k.indexOf(S) === -1) {
                    return true;
                }
                else if (k.endsWith('|t')) {
                    return true;
                }
                return false;
            }).map(k => {
                if (k.indexOf(S) !== -1) {
                    return k.substr(0, k.indexOf(S));
                }
                else {
                    return k;
                }
            }),
            /**
             * Returns the parameter if object has any keys
             * 
             * @param {object} obj object
             * @returns {object|undefined} obj if it has any keys
             */
            nonEmpty = obj => {
                for (let _ in obj) {
                    return obj;
                }
            };
        locales = locales.filter((k, i) => locales.indexOf(k) === i);

        return [new Content({ // default content
            title: mpl[`default${S}t`],
            titlePers: nonEmpty(mpl[`default${S}tp`]),
            message: mpl.default,
            messagePers: nonEmpty(mpl[`default${S}p`]),
            sound: note.sound,
            media: note.media,
            mediaMime: note.mediaMime,
            expiration: note.expiration,
            buttons: note.buttons ? new Array(note.buttons).fill(0).map((_, i) => ({
                title: mpl[`default${S}${i}${S}t`],
                url: mpl[`default${S}${i}${S}l`],
            })) : undefined
        })]
            .concat(locales.map(l => new Content({ // localised messages & titles
                la: l,
                title: mpl[`${l}${S}t`],
                titlePers: nonEmpty(mpl[`${l}${S}tp`]),
                message: mpl[l],
                messagePers: nonEmpty(mpl[`${l}${S}p`]),
                buttons: note.buttons && mpl[`${l}${S}0|t`] ? new Array(note.buttons).fill(0).map((_, i) => ({
                    title: mpl[`${l}${S}${i}${S}t`],
                    url: mpl[`${l}${S}${i}${S}l`],
                })) : undefined
            })))
            .concat(note.platforms.map(p => new Content({ // platform-specific stuff to comply with new UI
                p,
                sound: note.sound,
                badge: note.badge,
                data: note.data,
                url: note.url,
                extras: note.userProps,
            })));
    }

    /**
     * Construct Content if needed
     * 
     * @param {Content|object} data Content instance of content data
     * @returns {Content} Content instance
     */
    static from(data) {
        if (data instanceof Content) {
            return data;
        }
        else {
            return new Content(data);
        }
    }

}

module.exports = { Content };