const { S } = require('../../parts/note');

/**
 * Check if value is not null or undefined
 * @param {any} value value to check
 * @returns {boolean} true if not null and not undefined
 */
function isset(value) {
    return value !== null && value !== undefined;
}

/**
 * Create new empty payload for the note object given
 * 
 * @param {Note} note Note object
 * @returns {object} empty payload object
 */
function empty(note) {
    return {aps: {}, c: {i: note.id}};
}

/**
 * Non-personalizable fields of Note which can be sent for iOS
 * !NOTE! order matters!
 */
const fields = [
    'sound',
    'badge',
    'contentAvailable',
    'url',
    'media',
];

/**
 * Map of Note properties to APN payload props
 */
const map = {
    /**
     * Sends sound 
     * @param {Template} t template
     * @param {string} sound sound string
     */
    sound: function(t, sound) {
        if (sound) {
            t.result.aps.sound = sound;
        }
    },

    /**
     * Sends badge 
     * @param {Template} t template
     * @param {number} badge badge (0..N)
     */
    badge: function(t, badge) {
        t.result.aps.badge = badge;
    },

    /**
     * Sends buttons
     * !NOTE! buttons & messagePerLocale are inter-dependent as buttons urls/titles are locale-specific
     * 
     * @param {Template} t template
     * @param {number} buttons buttons (1..2)
     */
    buttons: function(t, buttons) {
        t.result.c.b = buttons;
    },

    /**
     * Send title/message/buttons for given language (data.la, falling back to default) if any
     * 
     * @param {Template} template template
     * @param {Object} mpl messagePerLocale for given Note
     * @param {Object} pers personalization object (p)
     */
    messagePerLocale: function(template, mpl, pers) {
        let tl = pers.la || 'default', // title lang
            ml = tl, // message lang
            t = mpl[tl + '|t'], // title string
            m = mpl[ml], // message string
            tp, mp; // pers

        // we have a title in user's lang
        if (isset(t)) {
            tp = mpl[tl + '|tp'];
        }
        else {
            // we have a default title
            if (isset(t = mpl['default|t'])) {
                tp = mpl['default|tp'];
                tl = 'default';
            }
        }

        // we have a message in user's lang
        if (isset(m)) {
            mp = mpl[ml + '|p'];
        }
        else {
            // we have a default message
            if (isset(m = mpl.default)) {
                mp = mpl['default|p'];
                ml = 'default';
            }
        }

        if (isset(m)) {
            if (!template.result.aps.alert) {
                template.result.aps.alert = {};
            }
            template.result.aps.alert.body = template.message(m, mp, pers);
        }

        if (isset(t)) {
            template.result.aps.alert.title = template.title(t, tp, pers);
        }

        if (template.result.c.b) {
            let b = [];
            for (let i = 0; i < template.result.c.b; i++) {
                b.push({
                    t: (mpl[`default${S}${i}${S}t`] || '').trim(),
                    l: (mpl[`default${S}${i}${S}l`] || '').trim()
                });
            }
            template.result.c.b = b;
            template.result.aps['mutable-content'] = 1;
        }
    },

    /**
     * Send content-available. It's set automatically when there's no alert and no sound.
     * 
     * @param {Template} template template
     * @param {boolean} ca contentAvailable of the Note
     */
    contentAvailable: function(template, ca) {
        if (ca || (!template.result.aps.alert && !template.result.aps.sound)) {
            template.result.aps['content-available'] = 1;
        }
    },

    /**
     * Send notification-tap url
     * 
     * @param {Template} template template
     * @param {string} url on-tap url
     */
    url: function(template, url) {
        template.result.c.l = url;
    },

    /**
     * Send media (picture, video, gif, etc) along with the message.
     * Sets mutable-content in order for iOS extension to be run.
     * 
     * @param {Template} template template
     * @param {string} media attached media url
     */
    media: function(template, media) {
        template.result.c.a = media;
        template.result.aps['mutable-content'] = 1;
    },

    /**
     * Sends custom data along with the message
     * 
     * @param {Template} template template
     * @param {Object} data data to be sent
     */
    data: function(template, data) {
        Object.assign(template.result, data);
    },

    /**
     * Sends user props along with the message
     * 
     * @param {Template} template template
     * @param {[string]} extras extra user props to be sent
     * @param {Object} data personalization
     */
    extras: function(template, extras, data) {
        let e = {},
            any = false;
        for (let i = 0; i < extras.length; i++) {
            let k = extras[i];
            if (data[k] !== null && data[k] !== undefined) {
                e[k] = data[k];
                any = true;
            }
        }
        if (any) {
            template.result.c.e = e;
        }
    },
};

module.exports = {
    empty,
    fields,
    map
};
