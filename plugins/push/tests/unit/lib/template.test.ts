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

});
