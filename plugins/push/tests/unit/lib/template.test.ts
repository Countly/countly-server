import type { ContentWithPersonalization } from '../../../api/lib/template.ts';
import { createTemplate, createContentMap, compilePersonalizableContent, getUserPropertiesUsedInsideMessage } from '../../../api/lib/template.ts';
import { removeUPFromUserPropertyKey } from '../../../api/lib/utils.ts';
import assert from 'assert';
import { describe, it } from 'mocha';
import * as mockData from '../../mock/data.ts';

describe("Message template", () => {
    it("should return the user parameters used inside the message content", () => {
        const result = getUserPropertiesUsedInsideMessage(mockData.parametricMessage());
        assert.deepStrictEqual(result, [ 'dt', 'nonExisting.parameter', 'd', 'did', 'fs' ]);
    });

    it("should remove the `up.` from a user property key", () => {
        assert.strictEqual(removeUPFromUserPropertyKey("up.lorem"), "lorem");
    });

    it("should correctly map message content into desired output when message is parametric", () => {
        const message = mockData.parametricMessage();
        const contentMap = createContentMap(message);
        const expectedPlatformMap = new Map;
        message.contents.forEach(({ p, ...rest }: any) => p && expectedPlatformMap.set(p, { p, ...rest }));
        assert.deepStrictEqual(contentMap.contentsByPlatform, expectedPlatformMap);
        const defaultContentMessagePersonalizations = contentMap.contentsByLanguage.get("default")?.pers.get("message");
        assert.strictEqual(defaultContentMessagePersonalizations?.[0]?.i, 24);
        assert.strictEqual(defaultContentMessagePersonalizations?.[1]?.i, 29);
    });

    it("should compile the parametric title and message with user personalization data", () => {
        const message = mockData.parametricMessage();
        // message property in en content is already parametric. also add title
        const enContent = message.contents.find((c: any) => c.la === "en");
        if (!enContent) {
            return;
        }
        enContent.title = "en message title var1: ";
        enContent.titlePers = {
            "23": {
                f: "fallbackValue",
                c: true,
                k: "nonExisting.parameter",
                t: "a"
            }
        };
        const contentMap = createContentMap(message);
        const contentPersPair = contentMap.contentsByLanguage.get("en");
        if (contentPersPair) {
            const content = compilePersonalizableContent(contentPersPair, mockData.appUser());
            assert.strictEqual(content.message, "en message content var1: Sdk_gphone64_arm64 some text");
            assert.strictEqual(content.title, "en message title var1: fallbackValue");
        }
    });

    it("should compile the \"en\" message content template for the user as ios payload", () => {
        const message = mockData.parametricMessage();
        message.contents[2] = {
            p: "i",
            sound: "sound",
            badge: 423,
            data: '{"custom":"json"}',
            extras: ["did", "up.fs"],
            url: "https://example.com",
            media: "https://example.com/example-media.png",
            mediaMime: "image/png",
            specific: [
                {
                    subtitle: "Test Subtitle"
                }
            ]
        };
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("i", mockData.appUser());
        assert.deepStrictEqual(result, {
            "aps": {
                "alert": {
                    "title": "en message title",
                    "body": "en message content var1: Sdk_gphone64_arm64 some text",
                    "subtitle": "Test Subtitle"
                },
                "sound": "sound",
                "badge": 423,
                "mutable-content": 1
            },
            "c": {
                "i": message._id.toString(),
                "l": "https://example.com",
                "a": "https://example.com/example-media.png",
                "b": [
                    { "t": "<En> Button", "l": "https://example.com" }
                ],
                "e": {
                    "did": "0b5efc45fa4885ed",
                    "fs": 1700549799
                }
            },
            "custom": "json"
        });
    });

    it("should compile the \"en\" message content template for the user as huawei payload", () => {
        const message = mockData.parametricMessage();
        message.contents[2] = {
            p: "h",
            sound: "sound",
            badge: 423,
            data: '{"custom":"json"}',
            extras: ["did", "up.fs"],
            url: "https://example.com",
            media: "https://example.com/example-media.png",
            mediaMime: "image/png",
            specific: [
                {
                    large_icon: "https://example.com/logo.png"
                }
            ]
        };
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("h", mockData.appUser());
        assert.deepStrictEqual(result, {
            "message": {
                "data": JSON.stringify({
                    "c.i": message._id.toString(),
                    "c.b": '[{"t":"<En> Button","l":"https://example.com"}]',
                    "sound": "sound",
                    "badge": "423",
                    "title": "en message title",
                    "message": "en message content var1: Sdk_gphone64_arm64 some text",
                    "c.l": "https://example.com",
                    "c.m": "https://example.com/example-media.png",
                    "custom": "json",
                    "c.e.did": "0b5efc45fa4885ed",
                    "c.e.fs": "1700549799",
                    "c.li": "https://example.com/logo.png"
                }),
                "android": {}
            }
        });
    });

    it("should compile the \"en\" message content template for the user as android payload", () => {
        const message = mockData.parametricMessage();
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("a", mockData.appUser());
        assert.deepStrictEqual(result, {
            "data": {
                "c.i": message._id.toString(),
                "c.m": "https://example.com/example-media.png",
                "title": "en message title",
                "sound": "sound",
                "badge": "423",
                "c.l": "https://example.com",
                "message": "en message content var1: Sdk_gphone64_arm64 some text",
                "c.b": '[{"t":"<En> Button","l":"https://example.com"}]',
                "custom": "json",
                "c.e.did": "0b5efc45fa4885ed",
                "c.e.fs": "1700549799",
                "c.li": "https://example.com/logo.png"
            }
        });
    });

    it("should compile the \"default\" message content template for the user with language \"tr\" as ios payload", () => {
        const message = mockData.parametricMessage();
        message.contents[2] = {
            p: "i",
            sound: "sound",
            badge: 423,
            data: '{"custom":"json"}',
            extras: ["did", "up.fs"],
            url: "https://example.com",
            media: "https://example.com/example-media.png",
            mediaMime: "image/png",
            specific: [
                {
                    subtitle: "Test Subtitle"
                }
            ]
        };
        const appUser = mockData.appUser();
        appUser.la = "tr";
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("i", appUser);
        assert.deepStrictEqual(result, {
            "aps": {
                "alert": {
                    "title": "Default message title",
                    "body": "Default message contentMobilefallbackValue",
                    "subtitle": "Test Subtitle"
                },
                "sound": "sound",
                "badge": 423,
                "mutable-content": 1
            },
            "c": {
                "i": message._id.toString(),
                "l": "https://example.com",
                "a": "https://example.com/example-media.png",
                "b": [
                    { "t": "<Default> Button", "l": "https://example.com" }
                ],
                "e": {
                    "did": "0b5efc45fa4885ed",
                    "fs": 1700549799
                }
            },
            "custom": "json"
        });
    });

    it("should compile the \"default\" message content template for the user with language \"tr\" as huawei payload", () => {
        const message = mockData.parametricMessage();
        message.contents[2] = {
            p: "h",
            sound: "sound",
            badge: 423,
            data: '{"custom":"json"}',
            extras: ["did", "up.fs"],
            url: "https://example.com",
            media: "https://example.com/example-media.png",
            mediaMime: "image/png",
            specific: [
                {
                    large_icon: "https://example.com/logo.png"
                }
            ]
        };
        const appUser = mockData.appUser();
        appUser.la = "tr";
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("h", appUser);
        assert.deepStrictEqual(result, {
            "message": {
                "data": JSON.stringify({
                    "c.i": message._id.toString(),
                    "c.b": '[{"t":"<Default> Button","l":"https://example.com"}]',
                    "sound": "sound",
                    "badge": "423",
                    "title": "Default message title",
                    "message": "Default message contentMobilefallbackValue",
                    "c.l": "https://example.com",
                    "c.m": "https://example.com/example-media.png",
                    "custom": "json",
                    "c.e.did": "0b5efc45fa4885ed",
                    "c.e.fs": "1700549799",
                    "c.li": "https://example.com/logo.png"
                }),
                "android": {}
            }
        });
    });

    it("should compile the \"default\" message content template for the user with language \"tr\" as android payload", () => {
        const message = mockData.parametricMessage();
        const appUser = mockData.appUser();
        appUser.la = "tr";
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("a", appUser);
        assert.deepStrictEqual(result, {
            "android": {
                "ttl": 604800000
            },
            "data": {
                "c.i": message._id.toString(),
                "c.m": "https://example.com/example-media.png",
                "title": "Default message title",
                "sound": "sound",
                "badge": "423",
                "c.l": "https://example.com",
                "message": "Default message contentMobilefallbackValue",
                "c.b": '[{"t":"<Default> Button","l":"https://example.com"}]',
                "custom": "json",
                "c.e.did": "0b5efc45fa4885ed",
                "c.e.fs": "1700549799",
                "c.li": "https://example.com/logo.png"
            }
        });
    });

    describe("createTemplate - edge cases", () => {
        it("should throw when message has no default content", () => {
            const msg = mockData.message();
            // Remove the default content (keep only platform-specific)
            msg.contents = [{ p: "a", sound: "default" }];
            assert.throws(
                () => createTemplate(msg),
                /must have a default content/
            );
        });

        it("should throw for unsupported platform", () => {
            const msg = mockData.message();
            const template = createTemplate(msg);
            assert.throws(
                () => template("x" as any, mockData.appUser()),
                /Unsupported platform/
            );
        });

        it("should fall back to default content when user language is not available", () => {
            const msg = mockData.message();
            const template = createTemplate(msg);
            const user = mockData.appUser();
            user.la = "zh"; // not in message contents

            const result = template("a", user);

            // Should use the default content's title/message
            assert.strictEqual((result as any).data.title, "title");
            assert.strictEqual((result as any).data.message, "message");
        });

        it("should fall back to default content when user has no language", () => {
            const msg = mockData.message();
            const template = createTemplate(msg);
            const user = mockData.appUserNoLanguage();

            const result = template("a", user);

            assert.strictEqual((result as any).data.title, "title");
            assert.strictEqual((result as any).data.message, "message");
        });

        it("should merge platform-specific content over language content", () => {
            const msg = mockData.message();
            // Default content has title/message, platform content has sound
            const template = createTemplate(msg);
            const result = template("a", mockData.appUser());

            assert.strictEqual((result as any).data.title, "title");
            assert.strictEqual((result as any).data.sound, "default");
        });
    });

    describe("createContentMap", () => {
        it("should separate platform-specific from language-specific content", () => {
            const msg = mockData.message();
            const { contentsByLanguage, contentsByPlatform } = createContentMap(msg);

            assert(contentsByLanguage.has("default"));
            assert(!contentsByLanguage.has("a"));
            assert(contentsByPlatform.has("a"));
            assert(!contentsByPlatform.has("default" as any));
        });

        it("should handle message with multiple language variants", () => {
            const msg = mockData.parametricMessage();
            const { contentsByLanguage } = createContentMap(msg);

            assert(contentsByLanguage.has("default"));
            assert(contentsByLanguage.has("en"));
            assert.strictEqual(contentsByLanguage.size, 2);
        });

        it("should handle message with no personalizations", () => {
            const msg = mockData.message();
            const { contentsByLanguage } = createContentMap(msg);
            const defaultContent = contentsByLanguage.get("default")!;

            // Pers maps should exist but have empty arrays
            const titlePers = defaultContent.pers.get("title") ?? [];
            const messagePers = defaultContent.pers.get("message") ?? [];
            assert.strictEqual(titlePers.length, 0);
            assert.strictEqual(messagePers.length, 0);
        });

        it("should sort personalization objects by index", () => {
            const msg = mockData.message();
            msg.contents = [{
                title: "Hello",
                message: "World",
                messagePers: {
                    "10": { k: "up.b", f: "fb" },
                    "3": { k: "up.a", f: "fa" },
                    "20": { k: "up.c", f: "fc" },
                },
            }];
            const { contentsByLanguage } = createContentMap(msg);
            const pers = contentsByLanguage.get("default")!.pers.get("message")!;

            assert.strictEqual(pers[0].i, 3);
            assert.strictEqual(pers[1].i, 10);
            assert.strictEqual(pers[2].i, 20);
        });
    });

    describe("compilePersonalizableContent", () => {
        function makeContentPers(
            content: Record<string, any>,
            persMap: Record<string, Array<{ i: number; k?: string; f?: string; c?: boolean }>>
        ): ContentWithPersonalization {
            const pers = new Map<"title" | "message", Array<{ i: number; k?: string; f?: string; c?: boolean }>>();
            for (const field in persMap) {
                pers.set(field as "title" | "message", persMap[field]);
            }
            return { content, pers } as ContentWithPersonalization;
        }

        it("should return content unchanged when no personalization is defined", () => {
            const cp = makeContentPers(
                { title: "Hello", message: "World" },
                {}
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d" });

            assert.strictEqual(result.title, "Hello");
            assert.strictEqual(result.message, "World");
        });

        it("should skip personalization when k is missing", () => {
            const cp = makeContentPers(
                { title: "Hello", message: "World" },
                { message: [{ i: 5 }] }  // no k property
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d" });

            assert.strictEqual(result.message, "World");
        });

        it("should use fallback value when user property is missing", () => {
            const cp = makeContentPers(
                { message: "Hello " },
                { message: [{ i: 6, k: "nonExistent", f: "friend" }] }
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d" });

            assert.strictEqual(result.message, "Hello friend");
        });

        it("should use empty string when both user property and fallback are missing", () => {
            const cp = makeContentPers(
                { message: "Hello " },
                { message: [{ i: 6, k: "nonExistent" }] }  // no fallback
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d" });

            assert.strictEqual(result.message, "Hello ");
        });

        it("should capitalize first character when c is true", () => {
            const cp = makeContentPers(
                { message: "Device: " },
                { message: [{ i: 8, k: "name", c: true }] }
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d", name: "john" });

            assert.strictEqual(result.message, "Device: John");
        });

        it("should not capitalize when c is false or missing", () => {
            const cp = makeContentPers(
                { message: "Device: " },
                { message: [{ i: 8, k: "name" }] }
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d", name: "john" });

            assert.strictEqual(result.message, "Device: john");
        });

        it("should handle multiple personalizations in the same field", () => {
            // Indices are sequential: each index is relative to the string
            // after all prior insertions have been spliced in.
            // "Hi , welcome to !" (17 chars)
            // After splice "Alice" at 3: "Hi Alice, welcome to !" (22 chars)
            // After splice "Paris" at 21: "Hi Alice, welcome to Paris!"
            const cp = makeContentPers(
                { message: "Hi , welcome to !" },
                {
                    message: [
                        { i: 3, k: "name" },
                        { i: 21, k: "city" },
                    ]
                }
            );
            const result = compilePersonalizableContent(
                cp,
                { uid: "1", _id: "1", did: "d", name: "Alice", city: "Paris" }
            );

            assert.strictEqual(result.message, "Hi Alice, welcome to Paris!");
        });

        it("should convert non-string user property values to strings", () => {
            const cp = makeContentPers(
                { message: "Score: " },
                { message: [{ i: 7, k: "score" }] }
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d", score: 42 });

            assert.strictEqual(result.message, "Score: 42");
        });

        it("should personalize both title and message independently", () => {
            const cp = makeContentPers(
                { title: "Hello ", message: "Your city is " },
                {
                    title: [{ i: 6, k: "name", c: true }],
                    message: [{ i: 14, k: "city" }],
                }
            );
            const result = compilePersonalizableContent(
                cp,
                { uid: "1", _id: "1", did: "d", name: "bob", city: "London" }
            );

            assert.strictEqual(result.title, "Hello Bob");
            assert.strictEqual(result.message, "Your city is London");
        });

        it("should handle null user property value by using fallback", () => {
            const cp = makeContentPers(
                { message: "Name: " },
                { message: [{ i: 6, k: "name", f: "Unknown" }] }
            );
            const result = compilePersonalizableContent(cp, { uid: "1", _id: "1", did: "d", name: null });

            assert.strictEqual(result.message, "Name: Unknown");
        });
    });

    describe("getUserPropertiesUsedInsideMessage", () => {
        it("should return empty array when no personalizations exist", () => {
            const msg = mockData.message();
            const result = getUserPropertiesUsedInsideMessage(msg);
            assert.deepStrictEqual(result, []);
        });

        it("should deduplicate keys", () => {
            const msg = mockData.message();
            msg.contents = [
                {
                    title: "a",
                    message: "b",
                    messagePers: { "0": { k: "up.name" } },
                    titlePers: { "0": { k: "up.name" } },
                },
            ];
            const result = getUserPropertiesUsedInsideMessage(msg);
            assert.deepStrictEqual(result, ["name"]);
        });

        it("should collect keys from extras, messagePers, and titlePers", () => {
            const msg = mockData.message();
            msg.contents = [
                {
                    title: "a",
                    message: "b",
                    messagePers: { "0": { k: "up.city" } },
                    titlePers: { "0": { k: "up.name" } },
                    extras: ["up.country"],
                },
            ];
            const result = getUserPropertiesUsedInsideMessage(msg);
            assert.deepStrictEqual(result, ["city", "name", "country"]);
        });

        it("should filter out undefined keys from personalization objects without k", () => {
            const msg = mockData.message();
            msg.contents = [
                {
                    title: "a",
                    message: "b",
                    messagePers: { "0": { f: "fallback" } },  // no k
                },
            ];
            const result = getUserPropertiesUsedInsideMessage(msg);
            assert.deepStrictEqual(result, []);
        });

        it("should collect keys across multiple content entries", () => {
            const msg = mockData.message();
            msg.contents = [
                { title: "a", message: "b", messagePers: { "0": { k: "up.x" } } },
                { la: "en", title: "c", message: "d", titlePers: { "0": { k: "up.y" } } },
                { p: "a", extras: ["up.z"] },
            ];
            const result = getUserPropertiesUsedInsideMessage(msg);
            assert.deepStrictEqual(result, ["x", "y", "z"]);
        });
    });
});
