import type { PushEvent } from '../../../../api/models/queue.ts';
import assert from 'assert';
import { describe, it, beforeEach } from 'mocha';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import esmock from 'esmock';
import { createSilentLogModule } from '../../../mock/logger.ts';
import * as mockData from '../../../mock/data.ts';

// --- Mocks ---

const mockHttpsRequestOn = sinon.stub();
const mockHttpsRequestEnd = sinon.stub();
const mockHttpsRequest = sinon.stub().returns({
    on: mockHttpsRequestOn,
    end: mockHttpsRequestEnd,
});
const MockHttpsProxyAgent = sinon.stub().callsFake(() => ({ isProxy: true }));

const {
    send,
    getAuthToken,
    validateCredentials,
    mapMessageToPayload,
} = await esmock.strict("../../../../api/send/platforms/huawei.ts", {
    "https": { default: { request: mockHttpsRequest } },
    "https-proxy-agent": { HttpsProxyAgent: MockHttpsProxyAgent },
    "../../../../api/send/platforms/android.ts": {
        mapMessageToPayload: (msg: any, content: any, ctx: any) => ({
            data: { "c.i": msg._id.toString(), title: content.title, message: content.message },
        }),
    },
});

// Re-exported as locals for backwards-compat with the many existing call sites.
const createHMSCredentials = mockData.huaweiCredential;
const createHuaweiPushEvent = (overrides: Partial<PushEvent> = {}) =>
    mockData.huaweiPushEvent({ credentials: createHMSCredentials(), ...overrides });

/**
 * Simulates an HTTPS response by intercepting `https.request` and triggering
 * the callback with a mock response, then also handling request.on("error").
 */
function setupHttpsMock(
    statusCode: number,
    responseBody: string,
    responseHeaders: Record<string, string> = {}
) {
    mockHttpsRequest.callsFake((_options: any, callback: any) => {
        const response = {
            statusCode,
            headers: { "content-type": "application/json", ...responseHeaders },
            on: (evt: string, cb: any) => {
                if (evt === "data") cb(responseBody);
                else if (evt === "end") cb();
            },
        };
        if (callback) {
            setTimeout(() => callback(response), 0);
        }
        return {
            on: mockHttpsRequestOn,
            end: mockHttpsRequestEnd,
        };
    });
}

describe("Huawei platform", () => {

    beforeEach(() => {
        mockHttpsRequest.reset();
        mockHttpsRequest.returns({ on: mockHttpsRequestOn, end: mockHttpsRequestEnd });
        mockHttpsRequestOn.reset();
        mockHttpsRequestEnd.reset();
        MockHttpsProxyAgent.resetHistory();
    });

    describe("getAuthToken", () => {
        it("should request an OAuth token from Huawei", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(200, JSON.stringify({
                access_token: "test-token-123",
                expires_in: 3600,
            }));

            const token = await getAuthToken(creds);

            assert.strictEqual(token, "test-token-123");
            const options = mockHttpsRequest.firstCall.firstArg;
            assert.strictEqual(options.hostname, "oauth-login.cloud.huawei.com");
            assert.strictEqual(options.path, "/oauth2/v3/token");
            assert.strictEqual(options.method, "POST");
        });

        it("should cache the token and reuse it", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(200, JSON.stringify({
                access_token: "cached-token",
                expires_in: 3600,
            }));

            const token1 = await getAuthToken(creds);
            const token2 = await getAuthToken(creds);

            assert.strictEqual(token1, "cached-token");
            assert.strictEqual(token2, "cached-token");
            // Only one HTTP request should be made
            assert.strictEqual(mockHttpsRequest.callCount, 1);
        });

        it("should reject with InvalidResponse when response is not valid JSON", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(200, "not-json{{{");

            await assert.rejects(
                getAuthToken(creds),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    assert(err.message.includes("not a valid json"));
                    return true;
                }
            );
        });

        it("should reject with SendError when response contains error_description", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(401, JSON.stringify({
                error: "invalid_client",
                error_description: "Client authentication failed",
            }));

            await assert.rejects(
                getAuthToken(creds),
                (err: any) => {
                    assert.strictEqual(err.name, "SendError");
                    assert(err.message.includes("Client authentication failed"));
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse for unknown error format", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(500, JSON.stringify({ something: "unexpected" }));

            await assert.rejects(
                getAuthToken(creds),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    return true;
                }
            );
        });

        it("should use proxy agent when proxy config is provided", async() => {
            const creds = createHMSCredentials();
            const proxy = mockData.proxyConfig();
            setupHttpsMock(200, JSON.stringify({
                access_token: "proxy-token",
                expires_in: 3600,
            }));

            await getAuthToken(creds, proxy);

            assert(MockHttpsProxyAgent.calledOnce);
            const options = mockHttpsRequest.firstCall.firstArg;
            assert.deepStrictEqual(options.agent, { isProxy: true });
        });

        it("should use default expiry when expires_in is not provided", async() => {
            const creds = createHMSCredentials();
            setupHttpsMock(200, JSON.stringify({
                access_token: "no-expiry-token",
            }));

            const token = await getAuthToken(creds);
            assert.strictEqual(token, "no-expiry-token");
        });

        it("should reject on request error", async() => {
            const creds = createHMSCredentials();
            mockHttpsRequest.callsFake(() => {
                const req = { on: sinon.stub(), end: sinon.stub() };
                setTimeout(() => {
                    const errorHandler = req.on.getCalls()
                        .find((c: any) => c.args[0] === "error");
                    if (errorHandler) errorHandler.args[1](new Error("ECONNREFUSED"));
                }, 0);
                return req;
            });

            await assert.rejects(
                getAuthToken(creds),
                (err: any) => {
                    assert.strictEqual(err.message, "ECONNREFUSED");
                    return true;
                }
            );
        });
    });

    describe("send", () => {
        // For send tests, we need getAuthToken to succeed first.
        // We set up two sequential HTTPS requests: first for auth, second for push.

        function setupAuthThenSend(sendStatusCode: number, sendBody: string) {
            let callCount = 0;
            mockHttpsRequest.callsFake((_options: any, callback: any) => {
                callCount++;
                let body: string;
                let statusCode: number;
                if (callCount === 1) {
                    // Auth request
                    statusCode = 200;
                    body = JSON.stringify({ access_token: "auth-token", expires_in: 3600 });
                }
                else {
                    // Send request
                    statusCode = sendStatusCode;
                    body = sendBody;
                }
                const response = {
                    statusCode,
                    headers: { "content-type": "application/json" },
                    on: (evt: string, cb: any) => {
                        if (evt === "data") cb(body);
                        else if (evt === "end") cb();
                    },
                };
                if (callback) setTimeout(() => callback(response), 0);
                return { on: sinon.stub(), end: sinon.stub() };
            });
        }

        it("should send to the correct HMS endpoint", async() => {
            const creds = createHMSCredentials({ app: "myAppId" });
            const push = createHuaweiPushEvent({ credentials: creds });
            setupAuthThenSend(200, JSON.stringify({ code: "80000000", msg: "Success" }));

            await send(push);

            // Second request should be the push
            const pushOptions = mockHttpsRequest.secondCall.firstArg;
            assert.strictEqual(pushOptions.hostname, "push-api.cloud.huawei.com");
            assert.strictEqual(pushOptions.path, "/v1/myAppId/messages:send");
            assert.strictEqual(pushOptions.method, "POST");
            assert(pushOptions.headers.Authorization.startsWith("Bearer "));
        });

        it("should resolve with raw response on success (code 80000000)", async() => {
            const push = createHuaweiPushEvent();
            setupAuthThenSend(200, JSON.stringify({ code: "80000000", msg: "Success" }));

            const result = await send(push);

            assert(typeof result === "string");
            assert(result.includes("80000000"));
        });

        it("should inject token into payload and remove it after", async() => {
            const push = createHuaweiPushEvent({ token: "hms-device-token" });
            setupAuthThenSend(200, JSON.stringify({ code: "80000000", msg: "Success" }));

            await send(push);

            // Token should have been injected into payload for the request
            const reqEnd = mockHttpsRequest.secondCall.returnValue.end;
            const sentBody = JSON.parse(reqEnd.firstCall.firstArg);
            assert.deepStrictEqual(sentBody.message.token, ["hms-device-token"]);

            // Token should be removed from the original payload after send
            const payload = push.payload as any;
            assert.strictEqual(payload.message.token, undefined);
        });

        it("should reject with InvalidDeviceToken for token-related HMS errors", async() => {
            const push = createHuaweiPushEvent();
            setupAuthThenSend(200, JSON.stringify({ code: "80300007", msg: "All tokens are invalid" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidDeviceToken");
                    assert(err.message.includes("80300007"));
                    return true;
                }
            );
        });

        it("should reject with SendError for known non-token HMS errors", async() => {
            const push = createHuaweiPushEvent();
            setupAuthThenSend(200, JSON.stringify({ code: "80100003", msg: "Incorrect message structure" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "SendError");
                    assert(err.message.includes("80100003"));
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse for unknown error codes", async() => {
            const push = createHuaweiPushEvent();
            setupAuthThenSend(200, JSON.stringify({ code: "99999999" }));

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    return true;
                }
            );
        });

        it("should reject with InvalidResponse when response body is not valid JSON", async() => {
            const push = createHuaweiPushEvent();
            setupAuthThenSend(500, "not-json{{{");

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.name, "InvalidResponse");
                    assert(err.message.includes("couldn't be parsed"));
                    return true;
                }
            );
        });

        it("should use proxy agent when proxy is configured", async() => {
            const proxy = mockData.proxyConfig({ port: "9090", auth: true });
            const push = createHuaweiPushEvent({ proxy });
            setupAuthThenSend(200, JSON.stringify({ code: "80000000", msg: "Success" }));

            await send(push);

            // MockHttpsProxyAgent called for both auth and send requests
            assert(MockHttpsProxyAgent.callCount >= 1);
        });

        it("should reject on request error", async() => {
            const push = createHuaweiPushEvent();
            // Auth succeeds, then send request errors
            let callCount = 0;
            mockHttpsRequest.callsFake((_options: any, callback: any) => {
                callCount++;
                const req = { on: sinon.stub(), end: sinon.stub() };
                if (callCount === 1) {
                    // auth
                    const response = {
                        statusCode: 200,
                        headers: {},
                        on: (evt: string, cb: any) => {
                            if (evt === "data") cb(JSON.stringify({ access_token: "t", expires_in: 3600 }));
                            else if (evt === "end") cb();
                        },
                    };
                    if (callback) setTimeout(() => callback(response), 0);
                }
                else {
                    // send - error
                    setTimeout(() => {
                        const errorHandler = req.on.getCalls()
                            .find((c: any) => c.args[0] === "error");
                        if (errorHandler) errorHandler.args[1](new Error("connection reset"));
                    }, 0);
                }
                return req;
            });

            await assert.rejects(
                send(push),
                (err: any) => {
                    assert.strictEqual(err.message, "connection reset");
                    return true;
                }
            );
        });
    });

    describe("mapMessageToPayload", () => {
        const baseMessageDoc = mockData.mapperMessageDoc("h");
        const messageId = baseMessageDoc._id;
        const baseContent = { title: "Test", message: "Body" };
        const baseContext = { uid: "u1", did: "d1" };

        it("should wrap Android payload data as JSON string in Huawei format", () => {
            const result = mapMessageToPayload(baseMessageDoc, baseContent, baseContext);

            assert(result.message);
            assert(typeof result.message.data === "string");
            const parsed = JSON.parse(result.message.data);
            assert.strictEqual(parsed["c.i"], messageId.toString());
            assert.strictEqual(parsed.title, "Test");
            assert.strictEqual(parsed.message, "Body");
        });

        it("should include empty android object", () => {
            const result = mapMessageToPayload(baseMessageDoc, baseContent, baseContext);
            assert.deepStrictEqual(result.message.android, {});
        });

        it("should not include token in the payload (token is added at send time)", () => {
            const result = mapMessageToPayload(baseMessageDoc, baseContent, baseContext);
            assert.strictEqual(result.message.token, undefined);
        });
    });

    describe("validateCredentials", () => {
        // For validate tests, we need send → getAuthToken → send to return
        // InvalidDeviceToken (code 80300007 or 80100000)

        function setupAuthThenInvalidToken() {
            let callCount = 0;
            mockHttpsRequest.callsFake((_options: any, callback: any) => {
                callCount++;
                let body: string;
                let statusCode: number;
                if (callCount === 1) {
                    statusCode = 200;
                    body = JSON.stringify({ access_token: "test-token", expires_in: 3600 });
                }
                else {
                    statusCode = 200;
                    body = JSON.stringify({ code: "80300007", msg: "All tokens are invalid" });
                }
                const response = {
                    statusCode,
                    headers: {},
                    on: (evt: string, cb: any) => {
                        if (evt === "data") cb(body);
                        else if (evt === "end") cb();
                    },
                };
                if (callback) setTimeout(() => callback(response), 0);
                return { on: sinon.stub(), end: sinon.stub() };
            });
        }

        it("should throw for invalid credentials type", async() => {
            await assert.rejects(
                validateCredentials({ type: "fcm" as any, app: "123456", secret: "a".repeat(64) }),
                (err: any) => err.message.includes("Invalid credentials type")
            );
        });

        it("should throw when app is missing", async() => {
            await assert.rejects(
                validateCredentials({ type: "hms", app: "", secret: "a".repeat(64) }),
                (err: any) => err.message.includes("app is required")
            );
        });

        it("should throw when secret is missing", async() => {
            await assert.rejects(
                validateCredentials({ type: "hms", app: "123456", secret: "" }),
                (err: any) => err.message.includes("secret is required")
            );
        });

        it("should throw when app length is out of range", async() => {
            await assert.rejects(
                validateCredentials({ type: "hms", app: "12345", secret: "a".repeat(64) }),
                (err: any) => err.message.includes("between 6 and 32")
            );
            await assert.rejects(
                validateCredentials({ type: "hms", app: "a".repeat(33), secret: "a".repeat(64) }),
                (err: any) => err.message.includes("between 6 and 32")
            );
        });

        it("should throw when secret length is not 64", async() => {
            await assert.rejects(
                validateCredentials({ type: "hms", app: "123456", secret: "tooshort" }),
                (err: any) => err.message.includes("64 characters")
            );
        });

        it("should return credentials when send throws InvalidDeviceToken", async() => {
            setupAuthThenInvalidToken();

            const result = await validateCredentials({
                type: "hms",
                app: "123456",
                secret: "a".repeat(64),
            });

            assert(result.creds._id instanceof ObjectId);
            assert.strictEqual(result.creds.type, "hms");
            assert.strictEqual(result.creds.app, "123456");
            assert(typeof result.creds.hash === "string");
            assert.strictEqual(result.creds.hash.length, 64);
        });

        it("should mask secret in the returned view", async() => {
            setupAuthThenInvalidToken();

            const secret = "b".repeat(64);
            const result = await validateCredentials({
                type: "hms",
                app: "123456",
                secret,
            });

            // View should have masked secret
            assert(result.view.secret.startsWith("HPK secret"));
            assert(result.view.secret.includes(secret.slice(0, 10)));
            assert(result.view.secret.includes(secret.slice(-10)));
            // Creds should keep the real secret
            assert.strictEqual(result.creds.secret, secret);
        });

        it("should re-throw non-InvalidDeviceToken errors", async() => {
            // Use a unique secret so token cache from previous tests is not hit
            const uniqueSecret = "z".repeat(64);
            // Auth fails
            let callCount = 0;
            mockHttpsRequest.callsFake((_options: any, callback: any) => {
                callCount++;
                let body: string;
                let statusCode: number;
                if (callCount === 1) {
                    statusCode = 401;
                    body = JSON.stringify({ error: "invalid_client", error_description: "Auth failed" });
                }
                else {
                    statusCode = 200;
                    body = JSON.stringify({ code: "80000000" });
                }
                const response = {
                    statusCode,
                    headers: {},
                    on: (evt: string, cb: any) => {
                        if (evt === "data") cb(body);
                        else if (evt === "end") cb();
                    },
                };
                if (callback) setTimeout(() => callback(response), 0);
                return { on: sinon.stub(), end: sinon.stub() };
            });

            await assert.rejects(
                validateCredentials({ type: "hms", app: "123456", secret: uniqueSecret }),
                (err: any) => {
                    assert(err.message.includes("Auth failed"));
                    return true;
                }
            );
        });
    });
});
