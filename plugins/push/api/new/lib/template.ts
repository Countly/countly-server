import type { PersonalizationObject, Content, Message, PlatformKey } from "../types/message";
import type { PlatformMessagePayload } from "../types/queue";
import type { User } from "../types/user";
import { mapMessageToPayload as mapMessageToAndroidPayload } from "../platforms/android";
import { mapMessageToPayload as mapMessageToIOSPayload } from "../platforms/ios";
import { mapMessageToPayload as mapMessageToHuaweiPayload } from "../platforms/huawei";
import { removeUPFromUserPropertyKey } from "./utils";

const { dot } = require('../../../../../api/utils/common');

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
