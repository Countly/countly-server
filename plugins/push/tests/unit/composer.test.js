/**
 * @typedef {import("../../api/new/types/user").User} User
 * @typedef {import("../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../api/new/types/credentials").PlatformCredential} PlatformCredential
 * @typedef {import("mongodb").AggregationCursor} AggregationCursor
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("stream").Readable} Readable
 */
const { ObjectId } = require("mongodb");
const { describe, it } = require("mocha");
const assert = require("assert");
const mockData = require("../mock/data");
const sinon = require("sinon");
const { createMockedMongoDb } = require("../mock/mongo");
const { createSilentLogger } = require("../mock/logger");
const common = require("../../../../api/utils/common");
const proxyquire = require("proxyquire");
const { loadProxyConfiguration } = require("../../api/new/lib/utils");
let {
    collection,
    db,
    sandbox: mongoMockSandbox,
    createMockedCollection
} = createMockedMongoDb();
/** @type {sinon.SinonStub<[pushes: PushEvent[]], Promise<void>>} */
const mockSendPushEvents = sinon.stub();
common.log = () => createSilentLogger();
const {
    composeScheduledPushes,
    userPropsProjection,
    loadCredentials,
    getUserStream
} = proxyquire("../../api/new/composer", {
    "../../api/new/lib/kafka.js": {
        sendPushEvents: mockSendPushEvents
    },
    "../../../../api/utils/common": common
});

describe("Push composer", async () => {
    afterEach(() => {
        // Reset the sandbox to clear all stubs and spies.
        // we cannot use resetHistory here because we need to reset the whole sandbox
        ({ collection,
            db,
            sandbox: mongoMockSandbox,
            createMockedCollection
        } = createMockedMongoDb());
        mockSendPushEvents.resetHistory();
    });

    describe("Projection builder for user properties should", () => {
        it("add the user properties used in the message content", () => {
            assert.deepStrictEqual(
                userPropsProjection(mockData.parametricMessage()),
                { dt: 1, nonExisting: 1, d: 1, did: 1, fs: 1 }
            );
        });
        it("return an empty object when message is not parametric", () => {
            assert.deepStrictEqual(userPropsProjection(mockData.message()), {});
        });
    });

    describe("Credential loading should", () => {
        it("return an empty object if push is not enabled", async () => {
            const appId = new ObjectId;
            collection.findOne.resolves({_id: appId, plugins: {}});
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });
        it("return an empty object if push is not configured", async () => {
            const appId = new ObjectId;
            collection.findOne.resolves({_id: appId, plugins: {push: {}}});
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });
        it("return platform key indexed credentials", async () => {
            const appId = new ObjectId;
            const mockedCreds = mockData.androidCredential();
            const credId = mockedCreds._id;
            collection.findOne.callsFake(({ _id }) => {
                let obj;
                if (_id === appId) {
                    obj = {
                        _id: appId,
                        plugins: {
                            push: {
                                a: {
                                    ...mockedCreds,
                                    serviceAccountFile: "service-account.json",
                                }
                            }
                        }
                    }
                } else if (_id === credId) {
                    obj = mockedCreds;
                }
                return Promise.resolve(obj);
            })
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert(db.collection.calledWith("creds"));
            assert(collection.findOne.calledWith({ _id: credId }));
            assert.deepStrictEqual(creds, { a: mockedCreds });
        });
    });

    describe("Loading proxy configuration", () => {
        it("shouldn't return anything when proxy is not configured", async () => {
            collection.findOne.resolves({push: {}});
            const config = await loadProxyConfiguration(db);
            assert(db.collection.calledWith("plugins"));
            assert(collection.findOne.calledWith({ _id: "plugins" }));
            assert(config === undefined);
        });
        it("return the proxy config", async () => {
            const push = {
                proxyhost: "host",
                proxyport: "port",
                proxyuser: "user",
                proxypass: "pass",
                proxyunauthorized: true
            };
            const result = {
                host: "host",
                port: "port",
                user: "user",
                pass: "pass",
                auth: false
            };
            collection.findOne.resolves({ push });
            const config = await loadProxyConfiguration(db);
            assert(db.collection.calledWith("plugins"));
            assert(collection.findOne.calledWith({ _id: "plugins" }));
            assert.deepStrictEqual(config, result);
        });
    });

    describe("User document aggregation pipeline", () => {
        it("correctly set projection step", () => {
            const user = mockData.appUser();
            const parametricMessage = mockData.parametricMessage();
            getUserStream(db, parametricMessage, user.tz);
            assert(db.collection.calledWith("app_users" + parametricMessage.app.toString()));
            let arg = collection.aggregate.args[0][0];
            let project = arg?.find((aggregationStep) => "$project" in aggregationStep)?.$project;
            assert.deepStrictEqual(project, { dt: 1, nonExisting: 1, d: 1, did: 1, fs: 1, uid: 1, tk: 1, la: 1 });
            mongoMockSandbox.resetHistory();
            const normalMessage = mockData.message();
            getUserStream(db, normalMessage, user.tz);
            assert(db.collection.calledWith("app_users" + normalMessage.app.toString()));
            arg = collection.aggregate.args[0][0];
            project = arg?.find((aggregationStep) => "$project" in aggregationStep)?.$project;
            assert.deepStrictEqual(project, { uid: 1, tk: 1, la: 1 });
        });
        it("correctly set timezone and platform filters", () => {
            const user = mockData.appUser();
            const message = mockData.parametricMessage();
            getUserStream(db, message, "NA", user.tz);
            assert(db.collection.calledWith("app_users" + message.app.toString()));
            let arg = collection.aggregate.args[0][0];
            let filters = arg?.find((aggregationStep) => "$match" in aggregationStep)?.$match;
            assert.deepStrictEqual(filters, {
                tz: user.tz,
                $or: [
                    {tkap: { $exists: true }},
                    {tkhp: { $exists: true }}
                ]
            });
            mongoMockSandbox.resetHistory();
            message.platforms = ["a", "i"];
            getUserStream(db, message, "NA", user.tz);
            arg = collection.aggregate.args[0][0];
            filters = arg?.find((aggregationStep) => "$match" in aggregationStep)?.$match;
            assert.deepStrictEqual(filters, {
                tz: user.tz,
                $or: [
                    {tkap: { $exists: true }},
                    {tkhp: { $exists: true }},
                    {tkip: { $exists: true }},
                    {tkid: { $exists: true }},
                    {tkia: { $exists: true }},
                ]
            });
        });
        it("correctly set lookup step", () => {
            const user = mockData.appUser();
            const parametricMessage = mockData.parametricMessage();
            getUserStream(db, parametricMessage, user.tz);
            assert(db.collection.calledWith("app_users" + parametricMessage.app.toString()));
            const arg = collection.aggregate.args[0][0];
            const lookup = arg?.find((aggregationStep) => "$lookup" in aggregationStep)?.$lookup;
            assert.deepStrictEqual(lookup, {
                from: "push_" + parametricMessage.app.toString(),
                localField: 'uid',
                foreignField: '_id',
                as: "tk"
            });
        });
    });

    describe("Push event creation", () => {
        it("delete all schedules if the message is deleted", async () => {
            const {collection: messageCollection} = createMockedCollection("messages");
            const {collection: schedulesCollection} = createMockedCollection("message_schedules");
            messageCollection.findOne.resolves(null);
            const scheduleEvent = mockData.scheduleEvent();
            await composeScheduledPushes(db, scheduleEvent);
            assert(db.collection.calledWith("messages"));
            assert(messageCollection.findOne.calledWith({ _id: scheduleEvent.messageId, status: "active" }));
            assert(db.collection.calledWith("message_schedules"));
            assert(schedulesCollection.deleteMany.calledWith({ messageId: scheduleEvent.messageId }));
        });
        it("return early if schedule was deleted or status is not \"scheduled\"", async () => {
            const {collection:messageCollection} = createMockedCollection("messages");
            const {collection:scheduleCollection} = createMockedCollection("message_schedules");
            const scheduleEvent = mockData.scheduleEvent();
            const message = mockData.message();
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(null);
            message._id = scheduleEvent.messageId;
            message.app = scheduleEvent.appId;
            const numberOfPushes = await composeScheduledPushes(db, scheduleEvent);
            assert(db.collection.calledWith("messages"));
            assert(messageCollection.findOne.calledWith({ _id: scheduleEvent.messageId, status: "active" }));
            assert(db.collection.calledWith("message_schedules"));
            assert(scheduleCollection.findOne.calledWith({
                _id: scheduleEvent.scheduleId,
                status: {
                    $in: ["scheduled", "sending"]
                }
            }));
            assert(numberOfPushes === 0);
        });
        it("stop composing if app is deleted", async () => {
            const scheduleEvent = mockData.scheduleEvent();
            const schedule = mockData.schedule();
            const message = mockData.message();
            const {collection:messageCollection} = createMockedCollection("messages");
            const {collection:scheduleCollection} = createMockedCollection("message_schedules");
            const {collection:appsCollection} = createMockedCollection("apps");
            appsCollection.findOne.resolves(null);
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            assert(await composeScheduledPushes(db, scheduleEvent) === 0);
        });
        it("create push events for each user token", async () => {
            const scheduleEvent = mockData.scheduleEvent();
            const {appId, messageId, scheduleId} = scheduleEvent;
            const schedule = mockData.schedule();
            const message = mockData.message();
            const appUsersCollectionName = "app_users" + appId.toString();
            schedule.appId = appId;
            schedule._id = scheduleId;
            schedule.messageId = messageId;
            message._id = messageId;
            message.app = appId;
            const {aggregationCursor} = createMockedCollection(appUsersCollectionName);
            const {collection:messageCollection} = createMockedCollection("messages");
            const {collection:scheduleCollection} = createMockedCollection("message_schedules");
            const {collection:appsCollection} = createMockedCollection("apps");
            const {collection:credsCollection} = createMockedCollection("creds");
            const credId = new ObjectId;
            /** @type {PlatformCredential} */
            const creds = {
                _id: credId,
                hash: "somethingsomething",
                serviceAccountFile: "data:application/json;base64,...",
                type: "fcm"
            };
            appsCollection.findOne.resolves({
                _id: appId,
                timezone: "NA",
                plugins: {
                    push: {
                        a: {
                            ...creds,
                            serviceAccountFile: "service-account.json",
                        }
                    }
                }
            });
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            credsCollection.findOne.resolves(creds);
            const user = mockData.appUser();
            /** @type {Omit<PushEvent, "message">} */
            const event = {
                appId,
                messageId,
                scheduleId,
                token: "",
                saveResult: true,
                uid: "",
                platform: "a",
                env: "p",
                credentials: creds,
                proxy: undefined,
                language: "en",
                appTimezone: "NA",
                trigger: message.triggers[0],
                platformConfiguration: {}
            };
            /** @type {User[]} */
            const users = [
                { ...user, uid: "1", },
                { ...user, uid: "2", },
                { ...user, uid: "3", }
            ];
            /** @type {Array<Omit<PushEvent, "message">>} */
            const events = [
                { ...event, uid: users[0].uid, token: /** @type {string} */(users[0].tk?.[0].tk.ap) },
                { ...event, uid: users[1].uid, token: /** @type {string} */(users[1].tk?.[0].tk.ap) },
                { ...event, uid: users[2].uid, token: /** @type {string} */(users[2].tk?.[0].tk.ap) },
            ];
            /** @type {unknown} */
            const iterator = (async function*() {
                yield users[0];
                yield users[1];
                yield users[2];
            })();
            aggregationCursor.stream.returns(/** @type {Readable & AsyncIterable<User>} */(iterator));
            const result = await composeScheduledPushes(db, scheduleEvent);
            const arg = mockSendPushEvents.getCall(0).firstArg?.map(
                /** @type {(a: PushEvent) => Omit<PushEvent, "messages">} */(a => {
                    delete a.message;
                    return a;
                })
            );
            assert(arg);
            assert(result === events.length);
            assert(mockSendPushEvents.called);
            for (let i = 0; i < events.length; i++) {
                assert.deepStrictEqual(arg[i], events[i]);
            }
        });
    });
});