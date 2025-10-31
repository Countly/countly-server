/**
 * @typedef {import("../../../api/new/types/credentials").FCMCredentials} FCMCredentials
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/utils").ProxyConfiguration} ProxyConfiguration
 */
const assert = require("assert");
const { ObjectId } = require("mongodb");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const mockData = require("../../mock/data");

describe("Android platform", () => {
    const mockHttpsProxyAgentInstance = {};
    const MockHttpsProxyAgent = sinon.stub().callsFake(() => mockHttpsProxyAgentInstance);
    const sendStub = sinon.stub();
    const messagingStub = sinon.stub().returns({ send: sendStub });
    const mockFirebaseAdmin = {
        initializeApp: sinon.stub().returns({ messaging: messagingStub }),
        credential: { cert: sinon.stub() },
        apps: /** @type {{messaging: sinon.SinonStub, name: string}[]} */([]),
    };
    const { send, validateCredentials, mapMessageToPayload } = proxyquire("../../../api/new/platforms/android", {
        "firebase-admin": mockFirebaseAdmin,
        "https-proxy-agent": { HttpsProxyAgent: MockHttpsProxyAgent }
    });

    describe("push notification sender", () => {
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
        /** @type {FCMCredentials} */
        const credentials = {
            _id: new ObjectId,
            hash: '0f07c581fd44f570b7b4133c49656c714364f859a36d1f58d13a32338a1e1e11',
            type: 'fcm',
            serviceAccountFile: jsonDataURIPrefix
                + Buffer.from(JSON.stringify(serviceAccount)).toString("base64"),
        };
        /**
        * @type {PushEvent}
        */
        const push = {
            ...mockData.pushEvent(),
            credentials: credentials,
        }

        beforeEach(() => {
            mockFirebaseAdmin.apps = [];
            mockFirebaseAdmin.initializeApp.resetHistory();
            mockFirebaseAdmin.credential.cert.resetHistory();
            mockFirebaseAdmin.credential.cert.resetBehavior();
            sendStub.resetHistory();
            sendStub.resetBehavior();
            messagingStub.resetHistory();
        });

        it("correctly parse push credentials", async () => {
            await send(push);
            assert(mockFirebaseAdmin.credential.cert.calledWith(serviceAccount));
        });

        it("use the application that configured previously", async () => {
            mockFirebaseAdmin.apps = [{ name: credentials.hash, messaging: messagingStub }];
            await send(push);
            assert(mockFirebaseAdmin.initializeApp.notCalled);
        });

        it("configure a new firebase application instance", async () => {
            const firebaseCredentialObject = { internal: "credentials object" };
            mockFirebaseAdmin.credential.cert.returns(firebaseCredentialObject);
            await send(push);
            assert(mockFirebaseAdmin.initializeApp.calledWith({
                httpAgent: undefined,
                credential: firebaseCredentialObject
            }));
        });

        it("configure the firebase application instance with proxy", async () => {
            /** @type {ProxyConfiguration} */
            const proxy = {
                auth: false,
                host: "proxyhost.com",
                user: "proxyUser",
                pass: "proxyPassword",
                port: "666"
            }
            const href = "http://" + proxy.user + ":" + proxy.pass + "@" + proxy.host + ":" + proxy.port + "/";
            /** @type {PushEvent} */
            const pushWithProxy = { ...push, proxy };
            await send(pushWithProxy);
            assert(MockHttpsProxyAgent.firstCall.firstArg.href === href);
            assert(MockHttpsProxyAgent.firstCall.lastArg.rejectUnauthorized === proxy.auth);
            assert(MockHttpsProxyAgent.firstCall.lastArg.keepAlive === true);
            assert(mockFirebaseAdmin.initializeApp.firstCall.firstArg.httpAgent === mockHttpsProxyAgentInstance);
            assert(mockFirebaseAdmin.credential.cert.firstCall.lastArg === mockHttpsProxyAgentInstance)
        });

        it("send the token and the message", async () => {
            await send(push);
            assert(sendStub.calledWith({
                token: push.token,
                ...push.payload
            }));
        });
    });

    describe("message mapper", () => {
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

    describe("credential validator", () => {
        it("should throw when there's a missing property", async () => {
            let invalidCredentials = /** @type {any} */({type: "apn_universal"});
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = /** @type {any} */({type: "fcm"});
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = /** @type {any} */({type: "fcm", serviceAccountFile: "test"});
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should throw when serviceAccountFile is not a json", async () => {
            const invalidCredentials = /** @type {FCMCredentials} */({
                type: "fcm",
                serviceAccountFile: "invalid",
                hash: "invalid"
            });
            await assert.rejects(validateCredentials(invalidCredentials));
        });
    });
});