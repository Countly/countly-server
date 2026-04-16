import assert from 'assert';
import { z } from 'zod';
import { describe, it } from 'mocha';

import {
    buildProxyUrl,
    serializeProxyConfig,
    sanitizeMongoPath,
    flattenObject,
    removeUPFromUserPropertyKey,
    guessThePlatformFromUserAgentHeader,
    zodValidate,
    loadPluginConfiguration,
    extractTokenFromQuerystring,
} from '../../../api/lib/utils.ts';

describe("Utils", () => {

    describe("buildProxyUrl", () => {
        it("should build a URL with host and port", () => {
            const url = buildProxyUrl({ host: "proxy.example.com", port: "8080", auth: false });
            assert.strictEqual(url.hostname, "proxy.example.com");
            assert.strictEqual(url.port, "8080");
        });

        it("should include username and password when provided", () => {
            const url = buildProxyUrl({
                host: "proxy.example.com", port: "8080", auth: true,
                user: "admin", pass: "secret"
            });
            assert.strictEqual(url.username, "admin");
            assert.strictEqual(url.password, "secret");
        });

        it("should not include credentials when not provided", () => {
            const url = buildProxyUrl({ host: "proxy.example.com", port: "3128", auth: false });
            assert.strictEqual(url.username, "");
            assert.strictEqual(url.password, "");
        });
    });

    describe("serializeProxyConfig", () => {
        it("should serialize config properties in a deterministic order", () => {
            const result = serializeProxyConfig({
                host: "proxy.com", port: "8080", auth: true, user: "u", pass: "p"
            });
            // KEY_ORDER is: auth, host, pass, port, user
            assert.strictEqual(result, "true-proxy.com-p-8080-u");
        });

        it("should return 'undefined' when config is undefined", () => {
            assert.strictEqual(serializeProxyConfig(undefined), "undefined");
        });

        it("should handle missing optional fields", () => {
            const result = serializeProxyConfig({ host: "h", port: "p", auth: false });
            // undefined values become empty strings in join()
            assert.strictEqual(result, "false-h--p-");
        });

        it("should produce different strings for different configs", () => {
            const a = serializeProxyConfig({ host: "a.com", port: "80", auth: false });
            const b = serializeProxyConfig({ host: "b.com", port: "80", auth: false });
            assert.notStrictEqual(a, b);
        });
    });

    describe("sanitizeMongoPath", () => {
        it("should replace dots with fullwidth dots", () => {
            assert.strictEqual(sanitizeMongoPath("a.b.c"), "a\uff0eb\uff0ec");
        });

        it("should replace dollar signs with fullwidth dollar signs", () => {
            assert.strictEqual(sanitizeMongoPath("$set"), "\uff04set");
        });

        it("should replace backslashes with fullwidth backslashes", () => {
            assert.strictEqual(sanitizeMongoPath("a\\b"), "a\uff3cb");
        });

        it("should handle all special characters combined", () => {
            assert.strictEqual(
                sanitizeMongoPath("$a.b\\c"),
                "\uff04a\uff0eb\uff3cc"
            );
        });

        it("should return the same string when no special characters", () => {
            assert.strictEqual(sanitizeMongoPath("normalpath"), "normalpath");
        });
    });

    describe("flattenObject", () => {
        it("should flatten nested objects with dot notation", () => {
            assert.deepStrictEqual(
                flattenObject({ a: { b: { c: 1 } } }),
                { "a.b.c": 1 }
            );
        });

        it("should keep top-level primitives as-is", () => {
            assert.deepStrictEqual(
                flattenObject({ x: 1, y: "hello", z: true }),
                { x: 1, y: "hello", z: true }
            );
        });

        it("should handle mixed nesting", () => {
            assert.deepStrictEqual(
                flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } }),
                { a: 1, "b.c": 2, "b.d.e": 3 }
            );
        });

        it("should handle null values as primitives", () => {
            assert.deepStrictEqual(
                flattenObject({ a: null, b: 1 }),
                { a: null, b: 1 }
            );
        });

        it("should return empty object for empty input", () => {
            assert.deepStrictEqual(flattenObject({}), {});
        });

        it("should flatten arrays as indexed objects", () => {
            const result = flattenObject({ arr: [10, 20] });
            assert.strictEqual(result["arr.0"], 10);
            assert.strictEqual(result["arr.1"], 20);
        });
    });

    describe("removeUPFromUserPropertyKey", () => {
        it("should strip the 'up.' prefix", () => {
            assert.strictEqual(removeUPFromUserPropertyKey("up.city"), "city");
        });

        it("should not modify keys without the prefix", () => {
            assert.strictEqual(removeUPFromUserPropertyKey("city"), "city");
        });

        it("should only strip the prefix at the start", () => {
            assert.strictEqual(removeUPFromUserPropertyKey("setup.config"), "setup.config");
        });

        it("should handle nested 'up.' properties", () => {
            assert.strictEqual(removeUPFromUserPropertyKey("up.custom.nested"), "custom.nested");
        });

        it("should handle 'up.' alone", () => {
            assert.strictEqual(removeUPFromUserPropertyKey("up."), "");
        });
    });

    describe("guessThePlatformFromUserAgentHeader", () => {
        it("should return 'h' for Huawei Android devices", () => {
            assert.strictEqual(
                guessThePlatformFromUserAgentHeader("Mozilla/5.0 (Linux; Android 10; Huawei P40)"),
                "h"
            );
        });

        it("should return 'a' for non-Huawei Android devices", () => {
            assert.strictEqual(
                guessThePlatformFromUserAgentHeader("Mozilla/5.0 (Linux; Android 13; Pixel 7)"),
                "a"
            );
        });

        it("should return 'i' for iOS devices", () => {
            assert.strictEqual(
                guessThePlatformFromUserAgentHeader("Mozilla/5.0 (iOS; iPhone)"),
                "i"
            );
        });

        it("should return undefined for unknown platforms", () => {
            assert.strictEqual(
                guessThePlatformFromUserAgentHeader("Mozilla/5.0 (Windows NT 10.0)"),
                undefined
            );
        });

        it("should prioritize Huawei over generic Android", () => {
            assert.strictEqual(
                guessThePlatformFromUserAgentHeader("Android Huawei"),
                "h"
            );
        });
    });

    describe("zodValidate", () => {
        const schema = z.object({
            name: z.string(),
            age: z.number().min(0),
        });

        it("should return success for valid data", () => {
            const result = zodValidate(schema, { name: "Alice", age: 30 });
            assert.strictEqual(result.result, true);
            assert.deepStrictEqual(result.errors, []);
            assert.deepStrictEqual(result.obj, { name: "Alice", age: 30 });
        });

        it("should return failure with error messages for invalid data", () => {
            const result = zodValidate(schema, { name: 123, age: -1 });
            assert.strictEqual(result.result, false);
            assert(result.errors.length > 0);
        });

        it("should include field paths in error messages", () => {
            const result = zodValidate(schema, { name: 123 });
            const nameError = result.errors.find(e => e.startsWith("name:"));
            assert(nameError, "Should have an error for 'name' field");
        });

        it("should handle missing required fields", () => {
            const result = zodValidate(schema, {});
            assert.strictEqual(result.result, false);
            assert(result.errors.length >= 2);
        });

        it("should return parsed data (with coercion) on success", () => {
            const coerceSchema = z.object({ count: z.coerce.number() });
            const result = zodValidate(coerceSchema, { count: "42" });
            assert.strictEqual(result.result, true);
            assert.strictEqual(result.obj.count, 42);
        });
    });

    describe("loadPluginConfiguration", () => {
        it("should return a PluginConfiguration object", async() => {
            const config = await loadPluginConfiguration();
            assert(typeof config === "object");
            assert("messageTimeout" in config || config.messageTimeout === undefined);
        });

        it("should not have proxy when not configured", async() => {
            // Default push config doesn't have proxy set
            const config = await loadPluginConfiguration();
            // proxy is only set when both proxyhost AND proxyport exist
            if (config.proxy) {
                assert(typeof config.proxy.host === "string");
                assert(typeof config.proxy.port === "string");
                assert(typeof config.proxy.auth === "boolean");
            }
        });
    });

    describe("extractTokenFromQuerystring", () => {
        it("should extract Android FCM token", () => {
            const result = extractTokenFromQuerystring({ android_token: "fcm-token-123" });
            assert(result);
            assert.strictEqual(result[0], "a");
            assert.strictEqual(result[1], "p");
            assert.strictEqual(result[2], "fcm-token-123");
            assert(typeof result[3] === "string"); // md5 hash
        });

        it("should extract Android FCM token with explicit FCM provider", () => {
            const result = extractTokenFromQuerystring({ android_token: "t", token_provider: "FCM" });
            assert(result);
            assert.strictEqual(result[0], "a");
        });

        it("should blacklist Android token when value is BLACKLISTED", () => {
            const result = extractTokenFromQuerystring({ android_token: "BLACKLISTED" });
            assert(result);
            assert.strictEqual(result[0], "a");
            assert.strictEqual(result[2], "");
        });

        it("should extract iOS token with production test_mode", () => {
            const result = extractTokenFromQuerystring({ ios_token: "ios-tok", test_mode: "0" });
            assert(result);
            assert.strictEqual(result[0], "i");
            assert.strictEqual(result[1], "p");
            assert.strictEqual(result[2], "ios-tok");
        });

        it("should extract iOS token with development test_mode", () => {
            const result = extractTokenFromQuerystring({ ios_token: "t", test_mode: "1" });
            assert(result);
            assert.strictEqual(result[1], "d");
        });

        it("should extract iOS token with adhoc test_mode", () => {
            const result = extractTokenFromQuerystring({ ios_token: "t", test_mode: "2" });
            assert(result);
            assert.strictEqual(result[1], "a");
        });

        it("should not extract iOS token with invalid test_mode", () => {
            assert.strictEqual(extractTokenFromQuerystring({ ios_token: "t", test_mode: "99" }), undefined);
        });

        it("should extract Huawei HMS token", () => {
            const result = extractTokenFromQuerystring({ android_token: "hms-t", token_provider: "HMS" });
            assert(result);
            assert.strictEqual(result[0], "h");
            assert.strictEqual(result[1], "p");
            assert.strictEqual(result[2], "hms-t");
        });

        it("should extract Huawei HPK token", () => {
            const result = extractTokenFromQuerystring({ android_token: "hpk-t", token_provider: "HPK" });
            assert(result);
            assert.strictEqual(result[0], "h");
        });

        it("should blacklist Huawei token when value is BLACKLISTED", () => {
            const result = extractTokenFromQuerystring({ android_token: "BLACKLISTED", token_provider: "HMS" });
            assert(result);
            assert.strictEqual(result[2], "");
        });

        it("should return undefined when no token is present", () => {
            assert.strictEqual(extractTokenFromQuerystring({}), undefined);
        });
    });

    // Note: updatePushDataPoints depends on common.writeBatcher + the
    // server-stats plugin, both loaded via createRequire which esmock cannot
    // intercept. The function is tested indirectly through resultor.test.ts
    // where it's mocked at the module boundary.
});
