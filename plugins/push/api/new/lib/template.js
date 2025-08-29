/**
 * @typedef {import("../types/message").PersonalizationObject} PersonalizationObject
 * @typedef {PersonalizationObject & { i: number; }} PersonalizationObjectWithIndex
 * @typedef {{ content: Content; pers: Map<PersonalizableField, PersonalizationObjectWithIndex[]>; }} ContentWithPersonalization
 * @typedef {import("../types/message").Content} Content
 * @typedef {import("../types/queue").PlatformMessagePayload} PlatformMessagePayload
 * @typedef {import("../types/message").Message} Message
 * @typedef {import("../types/message").PlatformKey} PlatformKey
 * @typedef {import("../types/user").User} User
 * @typedef {"title"|"message"} PersonalizableField
 */

const { dot } = require('../../../../../api/utils/common');
const { mapMessageToPayload: mapMessageToAndroidPayload } = require("../platforms/android");
const { mapMessageToPayload: mapMessageToIOSPayload } = require("../platforms/ios");
const { mapMessageToPayload: mapMessageToHuaweiPayload } = require("../platforms/huawei");
const { removeUPFromUserPropertyKey } = require("./utils");
/** @type {PersonalizableField[]} */
const PERSONALIZABLE_CONTENT_FIELDS = ["title", "message"];

/**
 * Creates a message template function that compiles message content based on user's platform and properties.
 * The template function takes a platform key and user properties, and returns the compiled message payload.
 * @param {Message} messageDoc - Message document containing contents.
 * @returns {(platform: PlatformKey, userProps: User|{[key: string]: string;}) => PlatformMessagePayload} Template function to compile message content.
 */
function createTemplate(messageDoc) {
    const {
        contentsByLanguage,
        contentsByPlatform
    } = createContentMap(messageDoc);
    if (!contentsByLanguage.has("default")) {
        throw new Error("Message must have a default content (language: 'default')");
    }
    /**
     * Compiles the template for the given user's platform and properties.
     * @param {PlatformKey} platform - key for the platform: "a", "i" or "h"
     * @param {User|{[key: string]: string;}} userProps - app user properties with push token populated and custom variables
     * @returns {PlatformMessagePayload} compiled message content
     */
    return function(platform, userProps) {
        const platformSpecificContent = contentsByPlatform.get(platform);
        const contentPersPair = /** @type {ContentWithPersonalization} */(
            userProps.la && contentsByLanguage.has(userProps.la)
                ? contentsByLanguage.get(userProps.la)
                : contentsByLanguage.get("default")
        );
        const languageSpecificContent = compilePersonalizableContent(
            contentPersPair,
            userProps
        );
        if (!languageSpecificContent) {
            throw new Error(`No content found for language: ${userProps.la}`);
        }
        const mergedContent = { ...languageSpecificContent, ...platformSpecificContent };
        if (platform === "a") {
            return mapMessageToAndroidPayload(messageDoc, mergedContent, userProps);
        }
        else if (platform === "i") {
            return mapMessageToIOSPayload(messageDoc, mergedContent, userProps);
        }
        else if (platform === "h") {
            return mapMessageToHuaweiPayload(messageDoc, mergedContent, userProps);
        }
        else {
            throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}

/**
 * Creates a map of message contents indexed by language and platform.
 * The language content objects also contain personalization objects for each personalizable field (title, message).
 * @param {Message} messageDoc - Message document containing contents.
 * @returns {{ contentsByLanguage: Map<string, ContentWithPersonalization>, contentsByPlatform: Map<PlatformKey, Content> }} Content map indexed by language and platform.
 */
function createContentMap(messageDoc) {
    /** @type {Map<string, { content: Content; pers: Map<PersonalizableField, PersonalizationObjectWithIndex[]>; }>} */
    const contentsByLanguage = new Map;
    /** @type {Map<PlatformKey, Content>} */
    const contentsByPlatform = new Map;
    for (let i = 0; i < messageDoc.contents.length; i++) {
        const contentItem = messageDoc.contents[i];
        if (contentItem.p) {
            contentsByPlatform.set(contentItem.p, contentItem);
        }
        else {
            // collect personalization objects for each personalizable field (title, message)
            /** @type {Map<PersonalizableField, PersonalizationObjectWithIndex[]>} */
            const personalizationObjects = new Map;
            for (const field of PERSONALIZABLE_CONTENT_FIELDS) {
                /** @type {PersonalizationObjectWithIndex[]} */
                const persObjects = [];
                const personalizations = /** @type {{[index: string]: PersonalizationObject}} */(
                    contentItem[`${field}Pers`] ?? {}
                );
                for (let index in personalizations) {
                    persObjects.push({
                        i: parseInt(index, 10),
                        ...personalizations[index],
                    });
                }
                // sort personalization objects descending by index (otherwise it will break the template compiler)
                persObjects.sort((a, b) => b.i - a.i);
                personalizationObjects.set(field, persObjects);
            }
            contentsByLanguage.set(
                contentItem.la ?? "default",
                { content: contentItem, pers: personalizationObjects }
            );
        }
    }
    return { contentsByLanguage, contentsByPlatform };
}

/**
 * Compiles the content with personalizations applied based on user properties.
 * It replaces placeholders in the content fields with user property values.
 * If a user property is not found, it uses the fallback value from the personalization object.
 * If the personalization object has a 'c' flag, it capitalizes the first letter of the value.
 * @param {ContentWithPersonalization} contentPers - Content with personalization objects.
 * @param {{[key: string]: any;}} data - Data object containing user properties and other variables to be used in the template.
 * @returns {Content} Compiled content with personalizations applied.
 */
function compilePersonalizableContent(contentPers, data) {
    const { content, pers } = contentPers;
    const result = { ...content };
    for (const field of PERSONALIZABLE_CONTENT_FIELDS) {
        if (!pers.has(field)) {
            continue;
        }
        let template = content[field];
        if (typeof template === "string") {
            const sliced = template.split("");
            const personalizations = pers.get(field) ?? [];
            for (let i = 0; i < personalizations.length; i++) {
                const persConfig = personalizations[i];
                if (!persConfig.k) {
                    continue;
                }
                let value = dot(data, removeUPFromUserPropertyKey(persConfig.k));
                if (value === null || value === undefined) {
                    value = persConfig.f ?? "";
                }
                else {
                    value = String(value);
                    if (persConfig.c && typeof value === "string") {
                        value = value.charAt(0).toUpperCase() + value.slice(1);
                    }
                }
                sliced.splice(persConfig.i, 0, ...value.split(""));
            }
            result[field] = sliced.join("");
        }
    }
    return result;
}

/**
 * Returns the user properties used in parameterized message content.
 * @param {Message} message - Message document containing contents.
 * @returns {string[]} Array of user property keys used in the message contents.
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
        .map(removeUPFromUserPropertyKey);
    return Array.from(new Set(keys));
}

module.exports = {
    createTemplate,
    createContentMap,
    compilePersonalizableContent,
    removeUPFromUserPropertyKey,
    getUserPropertiesUsedInsideMessage,
}