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
     * @param {string}      data.lang               this content overrides default content for this language
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
     * @param {any}         data.specific[]         ... any other platform-specific field like contentAvailable, delayWhileIdle, collapseKey, etc. (use with specific method)
     */
    constructor(data) {
        super(data);
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
     * Getter for l (language)
     * 
     * @returns {string|undefined} Content l (language)
     */
    get l() {
        return this._data.l;
    }

    /**
     * Setter for l (language)
     * 
     * @param {string|undefined} l Content l (language)
     */
    set l(l) {
        if (l !== null && l !== undefined) {
            this._data.l = l;
        }
        else {
            delete this._data.l;
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
        return this._data.data ? JSON.parse(this._data.data) : undefined;
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
     * @param {string} l language to extract from note (optional)
     * @returns {Content[]} Content instance
     */
    static fromNote(note, l) {
        if (l) {
            let buttons = undefined,
                mpl = note.messagePerLocale || {},
                titlePers,
                messagePers;
            if (note.buttons > 0) {
                buttons = [];
                for (let i = 0; i < note.buttons; i++) {
                    let url = mpl[l + S + i + S + 'l'],
                        title = mpl[l + S + i + S + 't'];
                    buttons.push({url, title});
                }
            }
            // eslint-disable-next-line no-unused-vars
            for (let _k in mpl[l + S + 'tp']) {
                titlePers = mpl[l + S + 'tp'];
                break;
            }
            // eslint-disable-next-line no-unused-vars
            for (let _k in mpl[l + S + 'p']) {
                messagePers = mpl[l + S + 'p'];
                break;
            }
            return new Content({
                l: l === 'default' ? undefined : l,
                title: mpl[l + S + 't'],
                titlePers,
                message: mpl[l],
                messagePers,
                sound: l === 'default' ? note.sound : undefined,
                badge: l === 'default' ? note.badge : undefined,
                data: l === 'default' ? (note.data ? JSON.stringify(note.data) : undefined) : undefined,
                url: l === 'default' ? note.url : undefined,
                media: l === 'default' ? note.media : undefined,
                mediaMime: l === 'default' ? note.mediaMime : undefined,
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