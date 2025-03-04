const { createTemplate, getUserPropertiesUsedInsideMessage } = require("../../../api/new/lib/template");
const assert = require("assert");
const { describe, it } = require("mocha");
const mockData = require("../mock/data");

describe("Message template", () => {
    it("should return the user parameters used inside the message content", () => {
        const result = getUserPropertiesUsedInsideMessage(mockData.parametricMessage());
        assert.deepStrictEqual(result, [ 'dt', 'nonExisting.parameter', 'd', 'did', 'fs' ]);
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
                "badge": 423,
                "c.l": "https://example.com",
                "message": "en message content var1: Sdk_gphone64_arm64 some text",
                "c.b": [
                    {
                        "t": "<En> Button",
                        "l": "https://example.com"
                    }
                ],
                "custom": "json",
                "c.e.did": "0b5efc45fa4885ed",
                "c.e.fs": 1700549799,
                "c.li": "https://example.com/logo.png"
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
          "data": {
            "c.i": message._id.toString(),
            "c.m": "https://example.com/example-media.png",
            "title": "Default message title",
            "sound": "sound",
            "badge": 423,
            "c.l": "https://example.com",
            "message": "Default message contentMobilefallbackValue",
            "c.b": [
                {
                    "t": "<Default> Button",
                    "l": "https://example.com"
                }
            ],
            "custom": "json",
            "c.e.did": "0b5efc45fa4885ed",
            "c.e.fs": 1700549799,
            "c.li": "https://example.com/logo.png"
          }
        });
    });

    it("should compile the \"en\" message content template for the user as ios payload", () => {
        const message = mockData.parametricMessage();
        message.platforms = ["i"];
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("i", mockData.appUser());
        console.log("THIS IS A PLACEHOLDER TEST!");
        // TODO: IMPLEMENT THE REAL TEST
        assert.deepStrictEqual(result, {
            "aps": {
                "mutable-content": 1,
                "alert": {
                    "title": "en message title",
                    "body": "en message content var1: Sdk_gphone64_arm64 some text"
                }
            },
            "c": {
                "i": message._id.toString(),
                "a": "https://example.com/image.png",
                "b": [
                    {
                        "t": "<En> Button",
                        "l": "https://example.com"
                    }
                ]
            }
        });
    });

    it("should compile the \"en\" message content template for the user as huawei payload", () => {
        const message = mockData.parametricMessage();
        message.platforms = ["a"];
        const compileTemplate = createTemplate(message);
        const result = compileTemplate("h", mockData.appUser());
        console.log("THIS IS A PLACEHOLDER TEST!");
        // TODO: IMPLEMENT THE REAL TEST
        assert.deepStrictEqual(result, {
            "message": {
                "data": "{"
                    +"\"c.i\":\"" + message._id.toString() + "\","
                    +"\"c.m\":\"https://example.com/image.png\","
                    +"\"title\":\"en message title\","
                    +"\"message\":\"en message content var1: Sdk_gphone64_arm64 some text\","
                    +"\"c.b\":[{\"t\":\"<En> Button\"}]"
                +"}",
                "android": {}
            }
        });
    });
});
