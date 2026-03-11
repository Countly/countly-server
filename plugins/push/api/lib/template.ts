import type { PersonalizationObject, Content, Message, PlatformKey, PlatformCombinedKey } from "../types/message.ts";
import type { PlatformMessagePayload } from "../types/queue.ts";
import { mapMessageToPayload as mapMessageToAndroidPayload } from "../send/platforms/android.ts";
import { mapMessageToPayload as mapMessageToIOSPayload } from "../send/platforms/ios.ts";
import { mapMessageToPayload as mapMessageToHuaweiPayload } from "../send/platforms/huawei.ts";
import { removeUPFromUserPropertyKey } from "./utils.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const { dot }: import('../../../../types/common.js').Common = require('../../../../api/utils/common.js');

// contains only the required properties. other ones are denoted with "[key: string]: any". which are
// only populated from app_user to be used inside the template.
export interface User {
    [key: string]: any;
    _id: string;
    uid: string;
    did: string;
    la?: string;
    tz?: string;
    tk?: TokenRecord[]; // populated from push_{APPID}
}

// document from push_{APPID}
export interface TokenRecord {
    _id: string; // matches with User.uid
    tk: {
        [key in PlatformCombinedKey]?: string;
    }
}

type PersonalizableField = "title" | "message";

interface PersonalizationObjectWithIndex extends PersonalizationObject {
    i: number;
}

export interface ContentWithPersonalization {
    content: Content;
    pers: Map<PersonalizableField, PersonalizationObjectWithIndex[]>;
}

export type TemplateContext = User | { [key: string]: any };

export type MessageTemplateFunction = (platform: PlatformKey, context: TemplateContext) => PlatformMessagePayload;

const PERSONALIZABLE_CONTENT_FIELDS: PersonalizableField[] = ["title", "message"];

export function createTemplate(messageDoc: Message): MessageTemplateFunction {
    const {
        contentsByLanguage,
        contentsByPlatform
    } = createContentMap(messageDoc);
    if (!contentsByLanguage.has("default")) {
        throw new Error("Message must have a default content (language: 'default')");
    }
    return function(platform: PlatformKey, context: TemplateContext): PlatformMessagePayload {
        const platformSpecificContent = contentsByPlatform.get(platform);
        const contentPersPair = (
            context.la && contentsByLanguage.has(context.la)
                ? contentsByLanguage.get(context.la)
                : contentsByLanguage.get("default")
        ) as ContentWithPersonalization;
        const languageSpecificContent = compilePersonalizableContent(
            contentPersPair,
            context
        );
        if (!languageSpecificContent) {
            throw new Error(`No content found for language: ${context.la}`);
        }
        const mergedContent = { ...languageSpecificContent, ...platformSpecificContent };
        if (platform === "a") {
            return mapMessageToAndroidPayload(messageDoc, mergedContent, context);
        }
        else if (platform === "i") {
            return mapMessageToIOSPayload(messageDoc, mergedContent, context);
        }
        else if (platform === "h") {
            return mapMessageToHuaweiPayload(messageDoc, mergedContent, context);
        }
        else {
            throw new Error(`Unsupported platform: ${platform}`);
        }
    };
}

export function createContentMap(messageDoc: Message): {
    contentsByLanguage: Map<string, ContentWithPersonalization>;
    contentsByPlatform: Map<PlatformKey, Content>;
} {
    const contentsByLanguage = new Map<string, ContentWithPersonalization>;
    const contentsByPlatform = new Map<PlatformKey, Content>;
    for (let i = 0; i < messageDoc.contents.length; i++) {
        const contentItem = messageDoc.contents[i];
        if (contentItem.p) {
            contentsByPlatform.set(contentItem.p, contentItem);
        }
        else {
            const personalizationObjects = new Map<PersonalizableField, PersonalizationObjectWithIndex[]>;
            for (const field of PERSONALIZABLE_CONTENT_FIELDS) {
                const persObjects: PersonalizationObjectWithIndex[] = [];
                const personalizations = (
                    (contentItem as any)[`${field}Pers`] ?? {}
                ) as { [index: string]: PersonalizationObject };
                for (let index in personalizations) {
                    persObjects.push({
                        i: parseInt(index, 10),
                        ...personalizations[index],
                    });
                }
                persObjects.sort((a, b) => a.i - b.i);
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

export function compilePersonalizableContent(contentPers: ContentWithPersonalization, context: TemplateContext): Content {
    const { content, pers } = contentPers;
    const result: Content = { ...content };
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
                let value = dot(context, removeUPFromUserPropertyKey(persConfig.k));
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
            (result as any)[field] = sliced.join("");
        }
    }
    return result;
}

export function getUserPropertiesUsedInsideMessage(message: Message): string[] {
    let keys = message.contents
        .map(content => ([
            ...Object.values(content.messagePers ?? {}).map(({ k }) => k),
            ...Object.values(content.titlePers ?? {}).map(({ k }) => k),
            ...(content.extras ?? [])
        ]))
        .flat()
        .filter((key): key is string => typeof key === "string")
        .map(removeUPFromUserPropertyKey);
    return Array.from(new Set(keys));
}
