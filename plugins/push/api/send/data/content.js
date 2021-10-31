'use strict';

const { PushError } = require('./error'),
    { S, Jsonable } = require('./const');

/**
 * Message contents, possibly defined following way:
 * 1. {p: undefined, l: undefined, ...} - a required default Content (no p or l in it)
 * 2. {p: 'i', badge: 2} - an override for all iOS devices
 * 3. {p: 'a', l: 'de'} - another override for Android devices with german locale, other locales would still use 1.
 * 4. {p: 'i', l: 'fr'} - applies on top of 'i' override for iOS devices with french locale, other locales would use 2.
 */
class Content extends Jsonable {
    /**
     * Constructor
     * 
     * @param {object}      data                    contents data
     * @param {string}      data.p                  this content overrides default content for this platform
     * @param {string}      data.la                 this content overrides default content for this language
     * @param {string}      data.title              title
     * @param {object}      data.titlePers          title personalization
     * @param {string}      data.message            message
     * @param {object}      data.messagePers        message personalization
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
     * @param {object[]}    data.specific[]         ... any other platform-specific field like {contentAvailable: true}, {delayWhileIdle}, {collapseKey: 'key'}, etc. (use with specific method)
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
            title: {type: 'String', required: false},
            titlePers: {type: 'Object', required: false, custom: Content.validatePers},
            message: {type: 'String', required: false},
            messagePers: {type: 'Object', required: false, custom: Content.validatePers},
            sound: {type: 'String', required: false},
            badge: {type: 'Number', required: false},
            data: {type: 'JSON', required: false},
            extras: {type: 'String[]', required: false},
            url: {type: 'URL', required: false},
            media: {type: 'URL', required: false},
            mediaMime: {type: 'String', required: false},
            buttons: {
                type: {
                    url: {type: 'URL', required: true},
                    title: {type: 'String', required: true},
                    pers: {type: 'Object', required: false, custom: Content.validatePers},
                },
                array: true,
                'min-length': 1,
                'max-length': 2,
                required: false
            },
            specific: { type: 'Object[]', required: false },
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
            if (isNaN(parseInt(k))) {
                return 'Personalisation key must be a number';
            }
            let opt = obj[k];
            if (Object.keys(opt).length === 0) {
                return 'Personalisation object cannot be empty';
            }
            for (let kk in opt) {
                if (kk === 'k' && (typeof opt[kk] !== 'string' || !opt[kk])) {
                    return 'Personalisation key must be a non empty string';
                }
                else if (kk === 'c' && typeof opt[kk] !== 'boolean') {
                    return 'Personalisation capitalise option must be boolean';
                }
                else if (kk === 'f' && (typeof opt[kk] !== 'string' || !opt[kk])) {
                    return 'Personalisation fallback must be a non empty string';
                }
                else {
                    return 'Invalid key in personalisation object';
                }
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
    specific(key, value) {
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
     * @param {string} la language to extract from note (null for all Content for given note)
     * @returns {Content|Content[]} Content instance
     */
    static fromNote(note, la) {
        if (la) {
            let buttons = undefined,
                mpl = note.messagePerLocale || {},
                titlePers,
                messagePers;
            if (note.buttons > 0) {
                buttons = [];
                for (let i = 0; i < note.buttons; i++) {
                    let url = mpl[la + S + i + S + 'l'],
                        title = mpl[la + S + i + S + 't'];
                    buttons.push({url, title});
                }
            }
            // eslint-disable-next-line no-unused-vars
            for (let _k in mpl[la + S + 'tp']) {
                titlePers = mpl[la + S + 'tp'];
                break;
            }
            // eslint-disable-next-line no-unused-vars
            for (let _k in mpl[la + S + 'p']) {
                messagePers = mpl[la + S + 'p'];
                break;
            }
            return new Content({
                la: la === 'default' ? undefined : la,
                title: mpl[la + S + 't'],
                titlePers,
                message: mpl[la],
                messagePers,
                sound: la === 'default' ? note.sound : undefined,
                badge: la === 'default' ? note.badge : undefined,
                data: la === 'default' ? (note.data ? JSON.stringify(note.data) : undefined) : undefined,
                url: la === 'default' ? note.url : undefined,
                media: la === 'default' ? note.media : undefined,
                mediaMime: la === 'default' ? note.mediaMime : undefined,
                buttons
            });
        }
        else {
            let keys = Object.keys(note.messagePerLocale || {}).filter(k => {
                let v = note.messagePerLocale[k];
                if (typeof v !== 'string' || !v) {
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
            });
            if (keys.length) {
                keys = keys.filter((k, i) => keys.indexOf(k) === i);
                return keys.map(k => Content.fromNote(note, k));
            }
            else {
                return [Content.fromNote(note, 'default')];
            }
        }
    }
}

module.exports = { Content };