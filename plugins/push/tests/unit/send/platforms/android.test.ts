import type { FCMCredentials } from '../../../../api/models/credentials.ts';
import type { PushEvent } from '../../../../api/models/queue.ts';
import type { ProxyConfiguration } from '../../../../api/lib/utils.ts';
import assert from 'assert';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import esmock from 'esmock';
import * as mockData from '../../../mock/data.ts';

const mockHttpsProxyAgentInstance = {};
const MockHttpsProxyAgent = sinon.stub().callsFake(() => mockHttpsProxyAgentInstance);
const sendStub = sinon.stub();
const messagingStub = sinon.stub().returns({ send: sendStub });
const mockFirebaseAdmin = {
    initializeApp: sinon.stub().returns({ messaging: messagingStub }),
    credential: { cert: sinon.stub() },
    apps: [] as {messaging: sinon.SinonStub, name: string}[],
};
const { send, validateCredentials, mapMessageToPayload, isProxyConfigurationUpdated } = await esmock.strict("../../../../api/send/platforms/android.ts", {
    "firebase-admin": { default: mockFirebaseAdmin },
    "https-proxy-agent": { HttpsProxyAgent: MockHttpsProxyAgent }
});

describe("Android platform", () => {

    describe("Push notification sender", () => {
        const serviceAccount = {
            type: 'service_account',
            project_id: 'countlydemo',
            private_key_id: '0000000000',
            private_key: '-----BEGIN PRIVATE KEY-----\n' +
            'loremipsumdolorsitametprivatekey' +
            '-----END PRIVATE KEY-----\n',
            client_email: 'client_email',
            client_id: '102258429722735018634',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/client_email',
            universe_domain: 'googleapis.com'
        };
        const jsonDataURIPrefix = "data:application/json;base64,";
        const credentials: FCMCredentials = {
            _id: new ObjectId,
            hash: '0f07c581fd44f570b7b4133c49656c714364f859a36d1f58d13a32338a1e1e11',
            type: 'fcm',
            serviceAccountFile: jsonDataURIPrefix
                + Buffer.from(JSON.stringify(serviceAccount)).toString("base64"),
        };
        const push: PushEvent = {
            ...mockData.pushEvent(),
            credentials: credentials,
        };

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
        });

        it("correctly parse push credentials", async() => {
            await send(push);
            assert(mockFirebaseAdmin.credential.cert.calledWith(serviceAccount));
        });

        it("use the application that configured previously", async() => {
            mockFirebaseAdmin.apps = [{ name: credentials.hash, messaging: messagingStub }];
            await send(push);
            assert(mockFirebaseAdmin.initializeApp.notCalled);
        });

        it("configure a new firebase application instance", async() => {
            const firebaseCredentialObject = { internal: "credentials object" };
            mockFirebaseAdmin.credential.cert.returns(firebaseCredentialObject);
            await send(push);
            assert(mockFirebaseAdmin.initializeApp.calledWith({
                httpAgent: undefined,
                credential: firebaseCredentialObject
            }));
        });

        it("configure the firebase application instance with proxy", async() => {
            const proxy: ProxyConfiguration = {
                auth: false,
                host: "proxyhost.com",
                user: "proxyUser",
                pass: "proxyPassword",
                port: "666"
            };
            const href = "http://" + proxy.user + ":" + proxy.pass + "@" + proxy.host + ":" + proxy.port + "/";
            const pushWithProxy: PushEvent = { ...push, proxy };
            await send(pushWithProxy);
            assert(MockHttpsProxyAgent.firstCall.firstArg.href === href);
            assert(MockHttpsProxyAgent.firstCall.lastArg.rejectUnauthorized === proxy.auth);
            assert(MockHttpsProxyAgent.firstCall.lastArg.keepAlive === true);
            assert(mockFirebaseAdmin.initializeApp.firstCall.firstArg.httpAgent === mockHttpsProxyAgentInstance);
            assert(mockFirebaseAdmin.credential.cert.firstCall.lastArg === mockHttpsProxyAgentInstance);
        });

        it("send the token and the message", async() => {
            await send(push);
            assert(sendStub.calledWith({
                token: push.token,
                ...push.payload
            }));
        });
    });

    describe("Message mapper", () => {
        const messageId = new ObjectId();
        const baseMessageDoc = {
            _id: messageId,
            app: new ObjectId(),
            platforms: ["a"],
            status: "active",
            saveResults: true,
            triggers: [{ kind: "plain", start: new Date() }],
            filter: {},
            contents: [],
            result: { total: 0, sent: 0, actioned: 0, failed: 0, errors: {}, subs: {} },
            info: {}
        };

        const baseContent = {
            title: "Test Title",
            message: "Test Message"
        };

        const baseUserProps = {
            uid: "test_user",
            did: "test_device",
            custom_prop: "custom_value",
            nested: { prop: "nested_value" }
        };

        it("should map basic message content to payload", () => {
            const content = { ...baseContent };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.deepStrictEqual(result, {
                data: {
                    "c.i": messageId.toString(),
                    title: "Test Title",
                    message: "Test Message"
                }
            });
        });

        it("should include sound when provided", () => {
            const content = { ...baseContent, sound: "custom_sound" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data.sound, "custom_sound");
        });

        it("should include badge as string when provided", () => {
            const content = { ...baseContent, badge: 42 };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data.badge, "42");
        });

        it("should include URL when provided", () => {
            const content = { ...baseContent, url: "https://example.com" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data["c.l"], "https://example.com");
        });

        it("should include media when provided", () => {
            const content = { ...baseContent, media: "https://example.com/image.png" };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data["c.m"], "https://example.com/image.png");
        });

        it("should stringify and include buttons when provided", () => {
            const content = {
                ...baseContent,
                buttons: [
                    { title: "Button 1", url: "https://example1.com" },
                    { title: "Button 2", url: "https://example2.com" }
                ]
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            const expectedButtons = JSON.stringify([
                { t: "Button 1", l: "https://example1.com" },
                { t: "Button 2", l: "https://example2.com" }
            ]);
            assert.strictEqual(result.data["c.b"], expectedButtons);
        });

        it("should include custom JSON data when provided", () => {
            const customData = { custom: "value", number: 123, nested: { prop: "test" } };
            const content = { ...baseContent, data: JSON.stringify(customData) };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data.custom, "value");
            assert.strictEqual(result.data.number, 123);
            assert.strictEqual(result.data["nested.prop"], "test");
        });

        it("should include extra user properties when provided", () => {
            const content = { ...baseContent, extras: ["custom_prop", "up.did"] };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data["c.e.custom_prop"], "custom_value");
            assert.strictEqual(result.data["c.e.did"], "test_device");
        });

        it("should stringify object user properties", () => {
            const content = { ...baseContent, extras: ["nested"] };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data["c.e.nested"], '{"prop":"nested_value"}');
        });

        it("should convert non-string user properties to strings", () => {
            const userProps = { ...baseUserProps, number_prop: 123, boolean_prop: true };
            const content = { ...baseContent, extras: ["number_prop", "boolean_prop"] };
            const result = mapMessageToPayload(baseMessageDoc, content, userProps);

            assert.strictEqual(result.data["c.e.number_prop"], "123");
            assert.strictEqual(result.data["c.e.boolean_prop"], "true");
        });

        it("should skip undefined or null user properties", () => {
            const userProps = { ...baseUserProps, undefined_prop: undefined, null_prop: null };
            const content = { ...baseContent, extras: ["undefined_prop", "null_prop", "missing_prop"] };
            const result = mapMessageToPayload(baseMessageDoc, content, userProps);

            assert.strictEqual(result.data["c.e.undefined_prop"], undefined);
            assert.strictEqual(result.data["c.e.null_prop"], undefined);
            assert.strictEqual(result.data["c.e.missing_prop"], undefined);
        });

        it("should include large icon from specific content", () => {
            const content = {
                ...baseContent,
                specific: [
                    { some_other_prop: "value" },
                    { large_icon: "https://example.com/icon.png" },
                    { another_prop: "another_value" }
                ]
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.strictEqual(result.data["c.li"], "https://example.com/icon.png");
        });

        it("should set TTL in android section when expiration is provided", () => {
            const content = { ...baseContent, expiration: 3600000 }; // 1 hour in ms
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.deepStrictEqual(result.android, { ttl: 3600000 });
        });

        it("should handle empty or missing content gracefully", () => {
            const content = {};
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.deepStrictEqual(result, {
                data: {
                    "c.i": messageId.toString()
                }
            });
        });

        it("should handle all features combined", () => {
            const content = {
                title: "Full Test",
                message: "Complete message",
                sound: "notification",
                badge: 5,
                url: "https://example.com",
                media: "https://example.com/media.jpg",
                buttons: [{ title: "Action", url: "https://action.com" }],
                data: '{"custom":"data","count":42}',
                extras: ["custom_prop"],
                expiration: 7200000,
                specific: [{ large_icon: "https://example.com/large.png" }]
            };
            const result = mapMessageToPayload(baseMessageDoc, content, baseUserProps);

            assert.deepStrictEqual(result, {
                data: {
                    "c.i": messageId.toString(),
                    title: "Full Test",
                    message: "Complete message",
                    sound: "notification",
                    badge: "5",
                    "c.l": "https://example.com",
                    "c.m": "https://example.com/media.jpg",
                    "c.b": '[{"t":"Action","l":"https://action.com"}]',
                    custom: "data",
                    count: 42,
                    "c.e.custom_prop": "custom_value",
                    "c.li": "https://example.com/large.png"
                },
                android: {
                    ttl: 7200000
                }
            });
        });

        it("should handle user props as plain object instead of User type", () => {
            const userProps = { "prop1": "value1", "prop2": 123 };
            const content = { ...baseContent, extras: ["prop1", "prop2"] };
            const result = mapMessageToPayload(baseMessageDoc, content, userProps);

            assert.strictEqual(result.data["c.e.prop1"], "value1");
            assert.strictEqual(result.data["c.e.prop2"], "123");
        });
    });

    describe("Credential validator", () => {
        const validServiceAccount = {
            type: 'service_account',
            project_id: 'test-project',
            private_key_id: '0000000000',
            private_key: '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----\n',
            client_email: 'test@test.iam.gserviceaccount.com',
            client_id: '123456789',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
        };
        const jsonDataURIPrefix = "data:application/json;base64,";
        const validFile = jsonDataURIPrefix + Buffer.from(JSON.stringify(validServiceAccount)).toString("base64");

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.initializeApp.returns({ messaging: messagingStub });
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
        });

        it("should throw when there's a missing property", async() => {
            let invalidCredentials: any = {type: "apn_universal"};
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = {type: "fcm"} as any;
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = {type: "fcm", serviceAccountFile: "test"} as any;
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should throw when serviceAccountFile is not a json", async() => {
            const invalidCredentials: FCMCredentials = {
                type: "fcm",
                serviceAccountFile: "invalid",
                hash: "invalid"
            } as FCMCredentials;
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should throw when base64 content is not valid JSON", async() => {
            const raw = {
                type: "fcm" as const,
                serviceAccountFile: jsonDataURIPrefix + Buffer.from("not-json{{{").toString("base64"),
            };
            await assert.rejects(
                validateCredentials(raw),
                (err: any) => err.message.includes("not a valid JSON")
            );
        });

        it("should throw when service account is missing required fields", async() => {
            const incomplete = { project_id: "test" }; // missing private_key, client_email
            const raw = {
                type: "fcm" as const,
                serviceAccountFile: jsonDataURIPrefix + Buffer.from(JSON.stringify(incomplete)).toString("base64"),
            };
            await assert.rejects(
                validateCredentials(raw),
                (err: any) => err.message.includes("not a valid Firebase service account JSON")
            );
        });

        it("should throw when service account is an array", async() => {
            const raw = {
                type: "fcm" as const,
                serviceAccountFile: jsonDataURIPrefix + Buffer.from(JSON.stringify([1, 2, 3])).toString("base64"),
            };
            await assert.rejects(
                validateCredentials(raw),
                (err: any) => err.message.includes("not a valid Firebase service account JSON")
            );
        });

        it("should throw when service account is null", async() => {
            const raw = {
                type: "fcm" as const,
                serviceAccountFile: jsonDataURIPrefix + Buffer.from("null").toString("base64"),
            };
            await assert.rejects(
                validateCredentials(raw),
                (err: any) => err.message.includes("not a valid Firebase service account JSON")
            );
        });

        it("should return credentials when send throws the expected INVALID_ARGUMENT error", async() => {
            // Firebase rejects with the specific invalid-argument error for random tokens,
            // which validateCredentials treats as proof that the credentials work
            const firebaseErr: any = new Error("The registration token is not a valid FCM registration token");
            firebaseErr.code = "messaging/invalid-argument";
            sendStub.callsFake(() => Promise.reject(firebaseErr));

            const result = await validateCredentials({
                type: "fcm",
                serviceAccountFile: validFile,
            });

            assert(result.creds);
            assert(result.view);
            assert(result.creds._id instanceof ObjectId);
            assert.strictEqual(result.creds.type, "fcm");
            assert.strictEqual(result.creds.serviceAccountFile, validFile);
            assert(typeof result.creds.hash === "string" && result.creds.hash.length === 64);
        });

        it("should mask serviceAccountFile in the returned view", async() => {
            const firebaseErr: any = new Error("The registration token is not a valid FCM registration token");
            firebaseErr.code = "messaging/invalid-argument";
            sendStub.callsFake(() => Promise.reject(firebaseErr));

            const result = await validateCredentials({
                type: "fcm",
                serviceAccountFile: validFile,
            });

            assert.strictEqual(result.view.serviceAccountFile, "service-account.json");
            // creds should keep the real file
            assert.strictEqual(result.creds.serviceAccountFile, validFile);
        });

        it("should compute a deterministic hash from the service account content", async() => {
            const firebaseErr: any = new Error("The registration token is not a valid FCM registration token");
            firebaseErr.code = "messaging/invalid-argument";
            sendStub.callsFake(() => Promise.reject(firebaseErr));

            const result1 = await validateCredentials({ type: "fcm", serviceAccountFile: validFile });
            const result2 = await validateCredentials({ type: "fcm", serviceAccountFile: validFile });

            assert.strictEqual(result1.creds.hash, result2.creds.hash);
        });

        it("should re-throw non-INVALID_ARGUMENT errors", async() => {
            const firebaseErr: any = new Error("Authentication error");
            firebaseErr.code = "messaging/authentication-error";
            sendStub.callsFake(() => Promise.reject(firebaseErr));

            await assert.rejects(
                validateCredentials({ type: "fcm", serviceAccountFile: validFile }),
                (err: any) => err.message.includes("AUTHENTICATION_ERROR")
            );
        });
    });

    describe("FCM error handling", () => {
        const serviceAccount = {
            type: 'service_account',
            project_id: 'countlydemo',
            private_key_id: '0000000000',
            private_key: '-----BEGIN PRIVATE KEY-----\nloremipsumdolorsitametprivatekey-----END PRIVATE KEY-----\n',
            client_email: 'client_email',
            client_id: '102258429722735018634',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
        };
        const jsonDataURIPrefix = "data:application/json;base64,";
        const credentials: FCMCredentials = {
            _id: new ObjectId,
            hash: 'testhash',
            type: 'fcm',
            serviceAccountFile: jsonDataURIPrefix + Buffer.from(JSON.stringify(serviceAccount)).toString("base64"),
        };
        const push: PushEvent = { ...mockData.pushEvent(), credentials };

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.initializeApp.returns({ messaging: messagingStub });
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
            MockHttpsProxyAgent.resetHistory();
        });

        it("should throw SendError for known FCM error codes", async() => {
            const err: any = new Error("Server unavailable");
            err.code = "messaging/server-unavailable";
            sendStub.callsFake(() => Promise.reject(err));

            await assert.rejects(
                send(push),
                (error: any) => {
                    assert.strictEqual(error.name, "SendError");
                    assert(error.message.includes("SERVER_UNAVAILABLE"));
                    return true;
                }
            );
        });

        it("should throw InvalidDeviceToken for token-related FCM errors", async() => {
            const err: any = new Error("Token not registered");
            err.code = "messaging/registration-token-not-registered";
            sendStub.callsFake(() => Promise.reject(err));

            await assert.rejects(
                send(push),
                (error: any) => {
                    assert.strictEqual(error.name, "InvalidDeviceToken");
                    assert(error.message.includes("REGISTRATION_TOKEN_NOT_REGISTERED"));
                    return true;
                }
            );
        });

        it("should re-throw unknown Firebase error codes", async() => {
            const err: any = new Error("Something weird");
            err.code = "messaging/unknown-new-error-code";
            sendStub.callsFake(() => Promise.reject(err));

            await assert.rejects(
                send(push),
                (error: any) => {
                    assert.strictEqual(error.code, "messaging/unknown-new-error-code");
                    return true;
                }
            );
        });

        it("should re-throw non-Firebase errors directly", async() => {
            const err = new TypeError("Cannot read properties of undefined");
            sendStub.callsFake(() => Promise.reject(err));

            await assert.rejects(
                send(push),
                (error: any) => {
                    assert.strictEqual(error.name, "TypeError");
                    return true;
                }
            );
        });

        it("should include original error message in SendError when available", async() => {
            const err: any = new Error("Custom firebase error message");
            err.code = "messaging/internal-error";
            sendStub.callsFake(() => Promise.reject(err));

            await assert.rejects(
                send(push),
                (error: any) => {
                    assert(error.message.includes("INTERNAL_ERROR"));
                    assert(error.message.includes("Custom firebase error message"));
                    return true;
                }
            );
        });
    });

    describe("Proxy reconfiguration", () => {
        const serviceAccount = {
            type: 'service_account',
            project_id: 'countlydemo',
            private_key_id: '0000000000',
            private_key: '-----BEGIN PRIVATE KEY-----\nloremipsumdolorsitametprivatekey-----END PRIVATE KEY-----\n',
            client_email: 'client_email',
            client_id: '102258429722735018634',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
        };
        const jsonDataURIPrefix = "data:application/json;base64,";
        const credentials: FCMCredentials = {
            _id: new ObjectId,
            hash: 'proxytesthash',
            type: 'fcm',
            serviceAccountFile: jsonDataURIPrefix + Buffer.from(JSON.stringify(serviceAccount)).toString("base64"),
        };

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
            MockHttpsProxyAgent.resetHistory();
        });

        it("should delete and recreate the app when proxy configuration changes", async() => {
            const proxyA: ProxyConfiguration = {
                host: "proxyA.com", port: "8080", auth: false
            };
            const deleteStub = sinon.stub().resolves();
            const existingApp = {
                name: credentials.hash,
                messaging: messagingStub,
                delete: deleteStub,
            };

            // First call: create app with proxy A
            const pushA: PushEvent = { ...mockData.pushEvent(), credentials, proxy: proxyA };
            mockFirebaseAdmin.initializeApp.returns(existingApp);
            await send(pushA);

            // Now the app exists in the apps array
            mockFirebaseAdmin.apps = [existingApp] as any;
            mockFirebaseAdmin.initializeApp.resetHistory();

            // Second call: different proxy → should delete old and create new
            const proxyB: ProxyConfiguration = {
                host: "proxyB.com", port: "9090", auth: true
            };
            const pushB: PushEvent = { ...mockData.pushEvent(), credentials, proxy: proxyB };
            const newApp = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(newApp);
            await send(pushB);

            assert(deleteStub.calledOnce, "Old app should be deleted");
            assert(mockFirebaseAdmin.initializeApp.calledOnce, "New app should be created");
        });

        it("should not recreate the app when proxy configuration is the same", async() => {
            const proxy: ProxyConfiguration = {
                host: "proxy.com", port: "8080", auth: false
            };
            const existingApp = {
                name: credentials.hash,
                messaging: messagingStub,
                delete: sinon.stub().resolves(),
            };

            // First call: create app with proxy
            const push1: PushEvent = { ...mockData.pushEvent(), credentials, proxy };
            mockFirebaseAdmin.initializeApp.returns(existingApp);
            await send(push1);

            // Now the app exists
            mockFirebaseAdmin.apps = [existingApp] as any;
            mockFirebaseAdmin.initializeApp.resetHistory();

            // Second call: same proxy → should reuse
            const push2: PushEvent = { ...mockData.pushEvent(), credentials, proxy };
            await send(push2);

            assert(existingApp.delete.notCalled, "App should not be deleted");
            assert(mockFirebaseAdmin.initializeApp.notCalled, "App should not be recreated");
        });
    });

    describe("isProxyConfigurationUpdated", () => {
        const serviceAccount = {
            type: 'service_account',
            project_id: 'countlydemo',
            private_key_id: '0000000000',
            private_key: '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----\n',
            client_email: 'client_email',
            client_id: '102258429722735018634',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
        };
        const jsonDataURIPrefix = "data:application/json;base64,";
        const credentials: FCMCredentials = {
            _id: new ObjectId,
            hash: 'isproxytesthash',
            type: 'fcm',
            serviceAccountFile: jsonDataURIPrefix + Buffer.from(JSON.stringify(serviceAccount)).toString("base64"),
        };

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.initializeApp.returns({ messaging: messagingStub });
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
            MockHttpsProxyAgent.resetHistory();
        });

        it("should return false when both old and new proxies are undefined", () => {
            const app = {} as any;
            assert.strictEqual(isProxyConfigurationUpdated(app, undefined), false);
        });

        it("should return true when adding a proxy to an app that had none", () => {
            const proxy: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const app = {} as any;
            assert.strictEqual(isProxyConfigurationUpdated(app, proxy), true);
        });

        it("should return false when the same proxy is passed again after send", async() => {
            const proxy: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const app = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(app);
            await send({ ...mockData.pushEvent(), credentials, proxy });
            assert.strictEqual(isProxyConfigurationUpdated(app as any, proxy), false);
        });

        it("should return true when the proxy changes after send", async() => {
            const oldProxy: ProxyConfiguration = { host: "a", port: "1", auth: false };
            const newProxy: ProxyConfiguration = { host: "b", port: "2", auth: true };
            const app = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(app);
            await send({ ...mockData.pushEvent(), credentials, proxy: oldProxy });
            assert.strictEqual(isProxyConfigurationUpdated(app as any, newProxy), true);
        });

        it("should return true when removing a proxy from an app that had one", async() => {
            const proxy: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const app = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(app);
            await send({ ...mockData.pushEvent(), credentials, proxy });
            assert.strictEqual(isProxyConfigurationUpdated(app as any, undefined), true);
        });

        it("should return false when proxies are equivalent but different object instances", async() => {
            const proxyA: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const proxyB: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const app = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(app);
            await send({ ...mockData.pushEvent(), credentials, proxy: proxyA });
            assert.strictEqual(isProxyConfigurationUpdated(app as any, proxyB), false);
        });

        it("should return true when proxy auth flag changes", async() => {
            const proxy1: ProxyConfiguration = { host: "p", port: "8080", auth: false };
            const proxy2: ProxyConfiguration = { host: "p", port: "8080", auth: true };
            const app = { name: credentials.hash, messaging: messagingStub };
            mockFirebaseAdmin.initializeApp.returns(app);
            await send({ ...mockData.pushEvent(), credentials, proxy: proxy1 });
            assert.strictEqual(isProxyConfigurationUpdated(app as any, proxy2), true);
        });
    });
});
