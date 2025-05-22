/**
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/message").PlatformKey} PlatformKey
 * @typedef {import("../types/user").User} User
 */
const { Message: OldMessage } = require("../../send/data/message.js");
const { PLATFORM: OLD_PLATFORM } = require("../../send/platforms");
const { Template } = require("../../send/data/template.js");
const PLATFORM_KEYMAP = require("../constants/platform-keymap.json");

/**
 *
 * @param {Message} message
 */
function createTemplate(message) {
    const messageObj = new OldMessage(message);
    const platforms = message.platforms
        .map(key => PLATFORM_KEYMAP[key].platforms)
        .flat()
        .map(key => OLD_PLATFORM[/** @type {PlatformKey} */(key)]);

    const templates = Object.fromEntries(
        platforms.map(
            platform => [
                platform.key,
                new Template(messageObj, platform)
            ]
        )
    );

    /**
     * Compiles the template for the given user
     * @param {PlatformKey} platform - key for the platform: "a", "i" or "h"
     * @param {User|{[key: string]: string;}} variables - app user object with push token populated and custom variables
     * @returns {string} compiled template
     */
    return function(platform, variables) {
        // a note (old push document):
        // the ones start with a * is required by the template builder
        // {
        //     "_id": "655ef9d845f3a64d09de2572",
        //     "a": "655b6dcd84ea28c204af50ca",    app id (apps._id)
        //     "m": "655dd2d6b29f24798f570056",    message id (messages._id)
        //     "p": "a",                           platform: android
        //     "f": "p",                           token type (p: production, d: debug, a: test(ad hoc))
        //     "u": "1",                           user id (app_users{APPID}.uid)
        //     "t": "cRTmhA...",                   device token
        //     *"h": "a535fbb5d4664c49",            hash created with "pr" key for templating
        //     *"pr": {                             user properties to interpolate message string
        //         "la": "en"                      language (default)
        //     }
        // }
        const note = {
            h: String(Math.random()),
            pr: variables
        };
        return templates[platform].compile(note);
    }
}

/**
 * Returns the user properties used in parameterized message content.
 * @param {Message} message
 * @returns {string[]}
 */
function getUserPropertiesUsedInsideMessage(message) {
    let keys = message.contents
        .map(content => ([
            ...Object.values(content.messagePers ?? {}).map(({ k }) => k),
            ...Object.values(content.titlePers ?? {}).map(({ k }) => k),
            ...(content.extras ?? [])
        ]))
        .flat()
        .filter(key => typeof key === "string")
        .map(key => key.replace(/^up\./, ""));

    return Array.from(new Set(keys));
}

module.exports = {
    createTemplate,
    getUserPropertiesUsedInsideMessage
}