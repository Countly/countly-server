/**
 * @typedef {import("../../../api/new/types/credentials").FCMCredentials} FCMCredentials
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/proxy").ProxyConfiguration} ProxyConfiguration
 */
const assert = require("assert");
const { ObjectId } = require("mongodb");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const mockData = require("../../mock/data");

describe("Android", () => {
    const mockHttpsProxyAgentInstance = {};
    const MockHttpsProxyAgent = sinon.stub().callsFake(() => mockHttpsProxyAgentInstance);
    const sendStub = sinon.stub();
    const messagingStub = sinon.stub().returns({ send: sendStub });
    const mockFirebaseAdmin = {
        initializeApp: sinon.stub().returns({ messaging: messagingStub }),
        credential: { cert: sinon.stub() },
        apps: /** @type {{messaging: sinon.SinonStub, name: string}[]} */([]),
    };
    const { send } = proxyquire("../../../api/new/platforms/android", {
        "firebase-admin": mockFirebaseAdmin,
        "https-proxy-agent": { HttpsProxyAgent: MockHttpsProxyAgent }
    });
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
    // mockFirebaseAdmin.credential.cert = sinon.stub();
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
            ...push.message
        }));
    });
});