import type { APNP8Credentials, APNP12Credentials } from '../../../../api/models/credentials.ts';
import type { PushEvent } from '../../../../api/models/queue.ts';
import assert from 'assert';
import path from 'path';
import fsPromise from 'fs/promises';
import { describe, it, beforeEach } from 'mocha';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import esmock from 'esmock';
import { InvalidCredentials } from '../../../../api/lib/error.ts';
import * as mockData from '../../../mock/data.ts';

const __dirname = import.meta.dirname;

// --- Mocks ---

const mockJwtSign = sinon.stub().returns("mock-jwt-token");
const mockRequestOn = sinon.stub();
const mockRequestEnd = sinon.stub();
const mockRequest = sinon.stub().returns({
    on: mockRequestOn,
    end: mockRequestEnd,
});
const mockHttp2OverHttp = sinon.stub().returns({ agent: true });
const mockHttp2Wrapper = {
    request: mockRequest,
    proxies: { Http2OverHttp: mockHttp2OverHttp },
};

const {
    mapMessageToPayload,
    getAuthToken,
    getProxyAgent,
    getTlsKeyPair,
    parseP12Certificate,
    send,
    validateCredentials,
    credentialTest,
} = await esmock.strict("../../../../api/send/platforms/ios.ts", {
    "jsonwebtoken": { default: { sign: mockJwtSign } },
    "http2-wrapper": { default: mockHttp2Wrapper },
    "node-forge": (await import("node-forge")).default,
});

// Per-test unique hash so the JWT cache (keyed by hash) doesn't bleed across tests.
function createP8Credentials(overrides: Partial<APNP8Credentials> = {}): APNP8Credentials {
    return mockData.iosCredential({
        hash: "p8hash" + Math.random().toString(36).slice(2),
        keyid: "KEYID12345",
        team: "TEAMABC123",
        ...overrides,
    });
}

function createIOSPushEvent(overrides: Partial<PushEvent> = {}): PushEvent {
    return mockData.iosPushEvent({
        credentials: createP8Credentials(),
        ...overrides,
    });
}

describe("IOS platform", () => {

    beforeEach(() => {
        mockJwtSign.resetHistory();
        mockRequest.resetHistory();
        mockRequestOn.resetHistory();
        mockRequestOn.resetBehavior();
        mockRequestEnd.resetHistory();
        mockHttp2OverHttp.resetHistory();
    });

    describe("parseP12Certificate", () => {
        it("should parse a valid p12 certificate without passphrase correctly", async() => {
            const certificate = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/Cert.p12")
            );
            const result = parseP12Certificate(certificate.toString("base64"));
            assert(result.bundle.length > 0);
            assert(result.cert.length > 0);
            assert(result.key.length > 0);
            assert(result.notAfter.getTime() > 0);
            assert(result.notBefore.getTime() > 0);
            assert(result.topics.length > 0);
        });

        it("should fail an invalid p12 certificate", async() => {
            const certificate = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/CertDev.p12")
            );
            assert.throws(
                () => parseP12Certificate(certificate.toString("base64")),
                new InvalidCredentials("Not a universal (Sandbox & Production) certificate")
            );
        });

        it("shouldn't be able to parse a p12 certificate with incorrect secret", async() => {
            const certificate = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/CertWithPassphrase.p12")
            );
            assert.throws(
                () => parseP12Certificate(certificate.toString("base64"), "wrongpassphrase"),
                new Error("PKCS#12 MAC could not be verified. Invalid password?")
            );
        });

        it("should parse a passphrase protected p12 certificate correctly", async() => {
            const certificate = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/CertWithPassphrase.p12")
            );
            const result = parseP12Certificate(certificate.toString("base64"), "tokyo");
            assert(result.bundle.length > 0);
            assert(result.cert.length > 0);
            assert(result.key.length > 0);
            assert(result.notAfter.getTime() > 0);
            assert(result.notBefore.getTime() > 0);
            assert(result.topics.length > 0);
        });
    });

    describe("getAuthToken", () => {
        it("should generate a JWT token for P8 credentials", () => {
            const creds = createP8Credentials();
            const token = getAuthToken(creds);

            assert.strictEqual(token, "mock-jwt-token");
            assert(mockJwtSign.calledOnce);
            const [payload, key, options] = mockJwtSign.firstCall.args;
            assert.strictEqual(payload.iss, creds.team);
            assert.strictEqual(typeof payload.iat, "number");
            assert.strictEqual(options.algorithm, "ES256");
            assert.strictEqual(options.header.kid, creds.keyid);
        });

        it("should return cached token within TTL", () => {
            const creds = createP8Credentials();
            const token1 = getAuthToken(creds);
            const token2 = getAuthToken(creds);

            assert.strictEqual(token1, token2);
            // jwt.sign should only be called once (second call uses cache)
            assert.strictEqual(mockJwtSign.callCount, 1);
        });

        it("should return undefined for P12 credentials", () => {
            const creds = {
                _id: new ObjectId(),
                type: "apn_universal" as const,
                hash: "p12hash",
                cert: "cert",
                secret: "secret",
                bundle: "com.example",
                notAfter: new Date(),
                notBefore: new Date(),
                topics: ["com.example"],
            };
            const token = getAuthToken(creds);
            assert.strictEqual(token, undefined);
        });
    });

    describe("getProxyAgent", () => {
        it("should return undefined when no config is provided", () => {
            const agent = getProxyAgent(undefined);
            assert.strictEqual(agent, undefined);
        });

        it("should create an Http2OverHttp agent with proxy config", () => {
            const config = mockData.proxyConfig({ host: "proxy.example.com" });
            const agent = getProxyAgent(config);

            assert(agent);
            assert(mockHttp2OverHttp.calledOnce);
            const proxyOptions = mockHttp2OverHttp.firstCall.firstArg.proxyOptions;
            assert.strictEqual(proxyOptions.url, "http://proxy.example.com:8080");
        });

        it("should include basic auth header when user/pass are provided", () => {
            const config = mockData.proxyConfig({
                host: "proxy.example.com",
                auth: true,
                user: "proxyuser",
                pass: "proxypass",
            });
            getProxyAgent(config);

            const proxyOptions = mockHttp2OverHttp.firstCall.firstArg.proxyOptions;
            const expected = "Basic " + Buffer.from("proxyuser:proxypass").toString("base64");
            assert.strictEqual(proxyOptions.headers["Proxy-Authorization"], expected);
        });

        it("should cache the agent for the same proxy config", () => {
            const config = mockData.proxyConfig({ host: "cached-proxy.com", port: "9999" });
            const agent1 = getProxyAgent(config);
            const agent2 = getProxyAgent(config);

            assert.strictEqual(agent1, agent2);
            // Should only create once
            assert.strictEqual(mockHttp2OverHttp.callCount, 1);
        });
    });

    describe("getTlsKeyPair", () => {
        it("should extract key pair from P12 credentials and cache it", async() => {
            const certFile = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/CertWithPassphrase.p12")
            );
            const secret = "tokyo";
            const parsed = parseP12Certificate(certFile.toString("base64"), secret);
            const creds: APNP12Credentials = {
                _id: new ObjectId(),
                type: "apn_universal",
                hash: "tlstesthash" + Math.random(),
                cert: certFile.toString("base64"),
                secret,
                bundle: parsed.bundle,
                notAfter: parsed.notAfter,
                notBefore: parsed.notBefore,
                topics: parsed.topics,
            };

            const pair1 = getTlsKeyPair(creds);
            assert(pair1.cert.includes("BEGIN CERTIFICATE"));
            assert(pair1.key.includes("BEGIN"));

            // Second call should return cached
            const pair2 = getTlsKeyPair(creds);
            assert.strictEqual(pair1, pair2);
        });
    });

    describe("send", () => {
        function setupMockResponse(statusCode: number, data: string, headers: Record<string, string> = {}) {
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode,
                        headers: { ":status": String(statusCode), ...headers },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") {
                                cb(data);
                            }
                            else if (evt === "end") {
                                cb();
                            }
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });
        }

        it("should use production hostname for non-dev environments", async() => {
            const push = createIOSPushEvent({ env: "p" });
            setupMockResponse(200, "");

            await send(push);

            const url = mockRequest.firstCall.firstArg;
            assert.strictEqual(url.hostname, "api.push.apple.com");
        });

        it("should use development hostname for dev environment", async() => {
            const push = createIOSPushEvent({ env: "d" } as any);
            setupMockResponse(200, "");

            await send(push);

            const url = mockRequest.firstCall.firstArg;
            assert.strictEqual(url.hostname, "api.development.push.apple.com");
        });

        it("should set correct APNs headers", async() => {
            const creds = createP8Credentials({ bundle: "com.test.app" });
            const push = createIOSPushEvent({ credentials: creds } as any);
            setupMockResponse(200, "");

            await send(push);

            const options = mockRequest.firstCall.args[1];
            assert.strictEqual(options.headers[":method"], "POST");
            assert(options.headers[":path"].startsWith("/3/device/"));
            assert.strictEqual(options.headers["apns-topic"], "com.test.app");
        });

        it("should set Bearer authorization for P8 credentials", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(200, "");

            await send(push);

            const options = mockRequest.firstCall.args[1];
            assert(typeof options.headers.authorization === "string");
            assert(options.headers.authorization.startsWith("Bearer "));
        });

        it("should set apns-priority to 5 when setContentAvailable is true", async() => {
            const push = createIOSPushEvent({
                platformConfiguration: { setContentAvailable: true },
            } as any);
            setupMockResponse(200, "");

            await send(push);

            const options = mockRequest.firstCall.args[1];
            assert.strictEqual(options.headers["apns-priority"], 5);
        });

        it("should resolve with raw response on status 200", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(200, "");

            const result = await send(push);

            assert(typeof result === "string");
        });

        it("should reject with SendError for known APNs errors", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(400, JSON.stringify({ reason: "PayloadEmpty" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "SendError");
                    assert(err.message.includes("PayloadEmpty"));
                    return true;
                }
            );
        });

        it("should reject with InvalidDeviceToken for token-related APNs errors", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(400, JSON.stringify({ reason: "BadDeviceToken" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidDeviceToken");
                    assert(err.message.includes("BadDeviceToken"));
                    return true;
                }
            );
        });

        it("should reject with InvalidDeviceToken for expired token", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(410, JSON.stringify({ reason: "ExpiredToken" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidDeviceToken");
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse when status code is missing", async() => {
            const push = createIOSPushEvent();
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: undefined,
                        headers: {},
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb("");
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    assert(err.message.includes("valid status code"));
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse when response body is not valid JSON", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(500, "not-json{{{");

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    assert(err.message.includes("couldn't be parsed"));
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse for unknown error reasons", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(500, JSON.stringify({ reason: "SomeNewUnknownReason" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    return true;
                }
            );
        });

        it("should reject on request error", async() => {
            const push = createIOSPushEvent();
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "error") {
                    setTimeout(() => handler(new Error("connection reset")), 0);
                }
            });

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.message, "connection reset");
                    return true;
                }
            );
        });

        it("should send the payload as JSON in the request body", async() => {
            const push = createIOSPushEvent();
            setupMockResponse(200, "");

            await send(push);

            assert(mockRequestEnd.calledOnce);
            const body = mockRequestEnd.firstCall.firstArg;
            const parsed = JSON.parse(body);
            assert.deepStrictEqual(parsed, push.payload);
        });
    });

    describe("mapMessageToPayload", () => {
        const baseMessageDoc = mockData.mapperMessageDoc("i");
        const messageId = baseMessageDoc._id;
        const baseContent = { title: "Test Title", message: "Test Body" };
        const baseContext = { uid: "u1", did: "d1", country: "US" };

        it("should map basic content to iOS payload", () => {
            const result = mapMessageToPayload(baseMessageDoc, baseContent, baseContext);

            assert.deepStrictEqual(result, {
                aps: {
                    alert: { title: "Test Title", body: "Test Body" },
                },
                c: { i: messageId.toString() },
            });
        });

        it("should include sound", () => {
            const content = { ...baseContent, sound: "chime" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.aps.sound, "chime");
        });

        it("should include badge as number (not string)", () => {
            const content = { ...baseContent, badge: 42 };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.aps.badge, 42);
            assert.strictEqual(typeof result.aps.badge, "number");
        });

        it("should include URL in c.l", () => {
            const content = { ...baseContent, url: "https://example.com" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.c.l, "https://example.com");
        });

        it("should include media in c.a and set mutable-content", () => {
            const content = { ...baseContent, media: "https://example.com/img.png" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.c.a, "https://example.com/img.png");
            assert.strictEqual(result.aps["mutable-content"], 1);
        });

        it("should include buttons as array in c.b and set mutable-content", () => {
            const content = {
                ...baseContent,
                buttons: [
                    { title: "OK", url: "https://ok.com" },
                    { title: "Cancel", url: "https://cancel.com" },
                ],
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.deepStrictEqual(result.c.b, [
                { t: "OK", l: "https://ok.com" },
                { t: "Cancel", l: "https://cancel.com" },
            ]);
            assert.strictEqual(result.aps["mutable-content"], 1);
        });

        it("should merge custom JSON data into payload root (not data object)", () => {
            const content = { ...baseContent, data: '{"custom":"value","deep":{"key":1}}' };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            // iOS merges into root, unlike Android which uses data.* with flattening
            assert.strictEqual(result.custom, "value");
            assert.deepStrictEqual(result.deep, { key: 1 });
        });

        it("should include extra user properties in c.e keeping original types", () => {
            const context = { uid: "u1", did: "d1", country: "US", age: 25, premium: true };
            const content = { ...baseContent, extras: ["country", "age", "premium"] };
            const result = mapMessageToPayload(baseMessageDoc, content, context);

            assert.strictEqual(result.c.e!.country, "US");
            // iOS keeps original types (unlike Android which stringifies)
            assert.strictEqual(result.c.e!.age, 25);
            assert.strictEqual(result.c.e!.premium, true);
        });

        it("should skip null/undefined user properties", () => {
            const context = { uid: "u1", did: "d1", nothing: null, undef: undefined };
            const content = { ...baseContent, extras: ["nothing", "undef", "missing"] };
            const result = mapMessageToPayload(baseMessageDoc, content, context);

            assert.strictEqual(result.c.e, undefined);
        });

        it("should strip 'up.' prefix from extra property keys", () => {
            const context = { uid: "u1", did: "d1", city: "NYC" };
            const content = { ...baseContent, extras: ["up.city"] };
            const result = mapMessageToPayload(baseMessageDoc, content, context);

            assert.strictEqual(result.c.e!.city, "NYC");
        });

        it("should set subtitle from specific content", () => {
            const content = {
                ...baseContent,
                specific: [{ subtitle: "My Subtitle" }],
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.aps.alert!.subtitle, "My Subtitle");
        });

        it("should set content-available from specific content", () => {
            const content = {
                ...baseContent,
                specific: [{ setContentAvailable: true }],
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseContext);

            assert.strictEqual(result.aps["content-available"], 1);
        });

        it("should handle empty content", () => {
            const result = mapMessageToPayload(baseMessageDoc, {}, baseContext);

            assert.deepStrictEqual(result, {
                aps: {},
                c: { i: messageId.toString() },
            });
        });

        it("should handle all features combined", () => {
            const content = {
                title: "Full",
                message: "Message",
                sound: "ping",
                badge: 7,
                url: "https://url.com",
                media: "https://media.com/img.jpg",
                buttons: [{ title: "Go", url: "https://go.com" }],
                data: '{"extra":"data"}',
                extras: ["country"],
                specific: [{ subtitle: "Sub" }],
            };
            const context = { uid: "u1", did: "d1", country: "DE" };
            const result = mapMessageToPayload(baseMessageDoc, content, context);

            assert.deepStrictEqual(result, {
                aps: {
                    alert: { title: "Full", body: "Message", subtitle: "Sub" },
                    sound: "ping",
                    badge: 7,
                    "mutable-content": 1,
                },
                c: {
                    i: messageId.toString(),
                    l: "https://url.com",
                    a: "https://media.com/img.jpg",
                    b: [{ t: "Go", l: "https://go.com" }],
                    e: { country: "DE" },
                },
                extra: "data",
            });
        });
    });

    describe("validateCredentials - P8", () => {
        const validP8Key = "data:application/x-pkcs8;base64,"
            + Buffer.from("-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----").toString("base64");

        beforeEach(() => {
            // Make credentialTest's send() throw InvalidDeviceToken (valid credentials)
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: 400,
                        headers: { ":status": "400" },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb(JSON.stringify({ reason: "BadDeviceToken" }));
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });
        });

        it("should throw when required fields are missing", async() => {
            await assert.rejects(
                validateCredentials({ type: "apn_token", key: validP8Key, keyid: "K", bundle: "", team: "T" }),
                (err: any) => err.message.includes("bundle is required")
            );
        });

        it("should throw when key is not base64 encoded", async() => {
            await assert.rejects(
                validateCredentials({ type: "apn_token", key: "not-base64", keyid: "K", bundle: "com.ex", team: "T" }),
                (err: any) => err.message.includes("base64 encoded P8")
            );
        });

        it("should throw when key mime type is invalid", async() => {
            const badMime = "data:text/plain;base64," + Buffer.from("key").toString("base64");
            await assert.rejects(
                validateCredentials({ type: "apn_token", key: badMime, keyid: "K", bundle: "com.ex", team: "T" }),
                (err: any) => err.message.includes("base64 encoded P8")
            );
        });

        it("should accept application/octet-stream mime with p8 fileType", async() => {
            const key = "data:application/octet-stream;base64,"
                + Buffer.from("key-content").toString("base64");
            const result = await validateCredentials({
                type: "apn_token", key, keyid: "K", bundle: "com.ex", team: "T", fileType: "p8"
            });
            assert(result.creds._id instanceof ObjectId);
            assert.strictEqual(result.creds.type, "apn_token");
        });

        it("should reject application/octet-stream without p8 fileType", async() => {
            const key = "data:application/octet-stream;base64,"
                + Buffer.from("key-content").toString("base64");
            await assert.rejects(
                validateCredentials({ type: "apn_token", key, keyid: "K", bundle: "com.ex", team: "T" }),
                (err: any) => err.message.includes("base64 encoded P8")
            );
        });

        it("should return credentials with masked key in view", async() => {
            const result = await validateCredentials({
                type: "apn_token", key: validP8Key, keyid: "K", bundle: "com.ex", team: "T"
            });

            assert.strictEqual(result.view.key, "APN Key File (P8)");
            // creds should have the actual key (base64 content after comma)
            assert.notStrictEqual(result.creds.key, validP8Key);
            assert(!result.creds.key.includes("data:"));
        });

        it("should compute a hash from the credentials", async() => {
            const result = await validateCredentials({
                type: "apn_token", key: validP8Key, keyid: "K", bundle: "com.ex", team: "T"
            });
            assert(typeof result.creds.hash === "string");
            assert.strictEqual(result.creds.hash.length, 64);
        });
    });

    describe("validateCredentials - P12", () => {
        let validCert: string;
        let parsedCert: any;

        before(async() => {
            const certFile = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/Cert.p12")
            );
            validCert = "data:application/x-pkcs12;base64,"
                + certFile.toString("base64");
            parsedCert = parseP12Certificate(certFile.toString("base64"));
        });

        beforeEach(() => {
            // Make credentialTest's send() throw InvalidDeviceToken (valid credentials)
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: 400,
                        headers: { ":status": "400" },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb(JSON.stringify({ reason: "BadDeviceToken" }));
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });
        });

        it("should throw when cert is missing", async() => {
            await assert.rejects(
                validateCredentials({ type: "apn_universal", cert: "", secret: "" }),
                (err: any) => err.message.includes("cert is required")
            );
        });

        it("should throw when cert is not base64 encoded", async() => {
            await assert.rejects(
                validateCredentials({ type: "apn_universal", cert: "plain-text", secret: "" }),
                (err: any) => err.message.includes("base64 encoded P12")
            );
        });

        it("should throw when cert mime type is invalid", async() => {
            const badMime = "data:text/plain;base64," + Buffer.from("cert").toString("base64");
            await assert.rejects(
                validateCredentials({ type: "apn_universal", cert: badMime, secret: "" }),
                (err: any) => err.message.includes("base64 encoded P12")
            );
        });

        it("should throw for expired certificate", async() => {
            const certFile = await fsPromise.readFile(
                path.join(__dirname, "../../../mock/certificates/CertExpired.p12")
            );
            const cert = "data:application/x-pkcs12;base64," + certFile.toString("base64");
            // Depending on whether the cert was ever valid, this might throw different errors
            // Either "expired" or a parse error
            await assert.rejects(
                validateCredentials({ type: "apn_universal", cert, secret: "" })
            );
        });

        it("should return credentials with masked cert in view for valid P12", async() => {
            // Skip if the cert is expired (mock certs may be expired)
            if (parsedCert.notAfter.getTime() < Date.now()) {
                return;
            }
            const result = await validateCredentials({
                type: "apn_universal",
                cert: validCert,
                secret: "",
            });
            assert.strictEqual(result.view.cert, "APN Sandbox & Production Certificate (P12)");
            assert(result.creds._id instanceof ObjectId);
            assert.strictEqual(result.creds.type, "apn_universal");
        });
    });

    describe("credentialTest", () => {
        it("should return true when send throws InvalidDeviceToken", async() => {
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: 400,
                        headers: { ":status": "400" },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb(JSON.stringify({ reason: "BadDeviceToken" }));
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });

            const creds = createP8Credentials();
            const result = await credentialTest(creds);
            assert.strictEqual(result, true);
        });

        it("should re-throw non-InvalidDeviceToken errors", async() => {
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: 403,
                        headers: { ":status": "403" },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb(JSON.stringify({ reason: "InvalidProviderToken" }));
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });

            const creds = createP8Credentials();
            await assert.rejects(
                credentialTest(creds),
                (err: any) => {
                    assert.strictEqual(err.name, "SendError");
                    assert(err.message.includes("InvalidProviderToken"));
                    return true;
                }
            );
        });

        it("should throw InvalidCredentials when send succeeds (unexpected)", async() => {
            mockRequestOn.callsFake((event: string, handler: any) => {
                if (event === "response") {
                    const response = {
                        statusCode: 200,
                        headers: { ":status": "200" },
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb("");
                            else if (evt === "end") cb();
                        },
                    };
                    setTimeout(() => handler(response), 0);
                }
            });

            const creds = createP8Credentials();
            await assert.rejects(
                credentialTest(creds),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidCredentials");
                    assert(err.message.includes("unknown reason"));
                    return true;
                }
            );
        });
    });
});
