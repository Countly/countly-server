/**
 * @typedef {import("../../api/new/types/user").User} User
 * @typedef {import("../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../api/new/types/credentials").SomeCredential} SomeCredential
 * @typedef {import("mongodb").AggregationCursor} AggregationCursor
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("stream").Readable} Readable
 */
const {
    composeScheduledPushes,
    userPropsProjection,
    loadCredentials,
    loadProxyConfiguration,
    getUserStream
} = require("../../api/new/composer");
const { ObjectId } = require("mongodb");
const { describe, it } = require("mocha");
const assert = require("assert");
const mockData = require("./mock/data");
const sinon = require("sinon");
const { mockMongoDb } = require("./mock/mongo");
const queue = require("../../api/new/lib/kafka.js");

describe("Push composer", async () => {
    describe("Projection builder for user properties", () => {
        it("should add the user properties used in the message content", () => {
            assert.deepStrictEqual(
                userPropsProjection(mockData.parametricMessage()),
                { dt: 1, nonExisting: 1, d: 1, did: 1, fs: 1 }
            );
        });
        it("should return an empty object when message is not parametric", () => {
            assert.deepStrictEqual(userPropsProjection(mockData.message()), {});
        });
    });

    describe("Loading credentials", () => {
        /** @type {sinon.SinonStubbedInstance<Collection>} */
        let collection;
        /** @type {sinon.SinonStubbedInstance<Db>} */
        let db;
        /** @type {sinon.SinonSandbox} */
        let mongoSandbox;

        beforeEach(() => ({ collection, db, mongoSandbox } = mockMongoDb()));
        afterEach(() => mongoSandbox.restore());

        it("should return an empty object if push is not enabled", async () => {
            const appId = new ObjectId;
            collection.findOne.resolves({_id: appId, plugins: {}});
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });
        it("should return an empty object if push is not configured", async () => {
            const appId = new ObjectId;
            collection.findOne.resolves({_id: appId, plugins: {push: {}}});
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });
        it("should return platform key indexed credentials", async () => {
            const appId = new ObjectId;
            const credId = new ObjectId;
            const cred = {
                _id: credId,
                hash: "somethingsomething",
                serviceAccountFile: "data:application/json;base64,...",
                type: "fcm"
            };
            collection.findOne.callsFake(({ _id }) => {
                let obj;
                if (_id === appId) {
                    obj = {
                        _id: appId,
                        plugins: {
                            push: {
                                a: {
                                    ...cred,
                                    serviceAccountFile: "service-account.json",
                                }
                            }
                        }
                    }
                } else if (_id === credId) {
                    obj = cred;
                }
                return Promise.resolve(obj);
            })
            const creds = await loadCredentials(db, appId);
            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert(db.collection.calledWith("creds"));
            assert(collection.findOne.calledWith({ _id: credId }));
            assert.deepStrictEqual(creds, { a: cred });
        });
    });

    describe("Loading proxy configuration", () => {
        /** @type {sinon.SinonStubbedInstance<Collection>} */
        let collection;
        /** @type {sinon.SinonStubbedInstance<Db>} */
        let db;
        /** @type {sinon.SinonSandbox} */
        let mongoSandbox;

        beforeEach(() => ({ collection, db, mongoSandbox } = mockMongoDb()));
        afterEach(() => mongoSandbox.restore());

        it("shouldn't return anything when proxy is not configured", async () => {
            collection.findOne.resolves({push: {}});
            const config = await loadProxyConfiguration(db);
            assert(db.collection.calledWith("plugins"));
            assert(collection.findOne.calledWith({ _id: "plugins" }));
            assert(config === undefined);
        });
        it("should return the proxy config", async () => {
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
        /** @type {sinon.SinonStubbedInstance<Collection>} */
        let collection;
        /** @type {sinon.SinonStubbedInstance<Db>} */
        let db;
        /** @type {sinon.SinonSandbox} */
        let mongoSandbox;

        beforeEach(() => ({ collection, db, mongoSandbox } = mockMongoDb()));
        afterEach(() => mongoSandbox.restore());

        it("should correctly set projection step", () => {
            const user = mockData.appUser();
            const parametricMessage = mockData.parametricMessage();
            getUserStream(db, parametricMessage, user.tz);
            assert(db.collection.calledWith("app_users" + parametricMessage.app.toString()));
            let arg = collection.aggregate.args[0][0];
            let project = arg?.find((aggregationStep) => "$project" in aggregationStep)?.$project;
            assert.deepStrictEqual(project, { dt: 1, nonExisting: 1, d: 1, did: 1, fs: 1, uid: 1, tk: 1, la: 1 });
            mongoSandbox.resetHistory();
            const normalMessage = mockData.message();
            getUserStream(db, normalMessage, user.tz);
            assert(db.collection.calledWith("app_users" + normalMessage.app.toString()));
            arg = collection.aggregate.args[0][0];
            project = arg?.find((aggregationStep) => "$project" in aggregationStep)?.$project;
            assert.deepStrictEqual(project, { uid: 1, tk: 1, la: 1 });
        });
        it("should correctly set timezone and platform filters", () => {
            const user = mockData.appUser();
            const message = mockData.parametricMessage();
            getUserStream(db, message, user.tz);
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
            mongoSandbox.resetHistory();
            message.platforms = ["a", "i"];
            getUserStream(db, message, user.tz);
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
            it("should correctly set lookup step", () => {
                const user = mockData.appUser();
                const parametricMessage = mockData.parametricMessage();
                getUserStream(db, parametricMessage, user.tz);
                assert(db.collection.calledWith("app_users" + parametricMessage.app.toString()));
                const arg = collection.aggregate.args[0][0];
                const lookup = arg?.find((aggregationStep) => "$project" in aggregationStep)?.$lookup;
                assert.deepStrictEqual(lookup, {
                    from: "push_" + parametricMessage.app.toString(),
                    localField: 'uid',
                    foreignField: '_id',
                    as: "tk"
                });
            });
        });
    });

    describe("Push event creation", () => {
        /** @type {sinon.SinonStub} */
        let mockSendPushEvent;
        /** @type {(collectionName: string) => {collection: sinon.SinonStubbedInstance<Collection>, aggregationCursor:sinon.SinonStubbedInstance<AggregationCursor>}} */
        let createMockedCollection;
        /** @type {sinon.SinonStubbedInstance<Db>} */
        let db;
        /** @type {sinon.SinonSandbox} */
        let mongoSandbox;

        beforeEach(() => {
            mockSendPushEvent = sinon.stub(queue, "sendPushEvent");
            ({ db, mongoSandbox, createMockedCollection } = mockMongoDb());
        });
        afterEach(() => {
            mockSendPushEvent.restore()
            mongoSandbox.restore();
        });

        it("should delete all schedules if the message is deleted", async () => {
            const {collection: messageCollection} = createMockedCollection("messages");
            const {collection: schedulesCollection} = createMockedCollection("message_schedules");
            messageCollection.findOne.resolves(null);
            const scheduleEvent = mockData.scheduleEvent();
            await composeScheduledPushes(db, scheduleEvent);
            assert(db.collection.calledWith("messages"));
            assert(messageCollection.findOne.calledWith({ _id: scheduleEvent.messageId }));
            assert(db.collection.calledWith("message_schedules"));
            assert(schedulesCollection.deleteMany.calledWith({ messageId: scheduleEvent.messageId }));
        });
        it("should return early if schedule was deleted or status is not \"scheduled\"", async () => {
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
            assert(messageCollection.findOne.calledWith({ _id: scheduleEvent.messageId }));
            assert(db.collection.calledWith("message_schedules"));
            assert(scheduleCollection.findOne.calledWith({
                _id: scheduleEvent.scheduleId,
                status: "scheduled"
            }));
            assert(numberOfPushes === undefined);
        });
        it("should throw if app is not configured for the targeted platform", async () => {
            const scheduleEvent = mockData.scheduleEvent();
            const schedule = mockData.schedule();
            const message = mockData.message();
            const {collection:messageCollection} = createMockedCollection("messages");
            const {collection:scheduleCollection} = createMockedCollection("message_schedules");
            const {collection:appsCollection} = createMockedCollection("apps");
            appsCollection.findOne.resolves({});
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            await assert.rejects(composeScheduledPushes(db, scheduleEvent), {
                message:"Missing platform configuration"
            });
        });
        it("should create push events for each user token", async () => {
            const scheduleEvent = mockData.scheduleEvent();
            const {appId, messageId, scheduleId} = scheduleEvent;
            const schedule = mockData.schedule();
            const message = mockData.message();
            const appUsersCollectionName = "app_users" + scheduleEvent.appId.toString();
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
            /** @type {SomeCredential} */
            const creds = {
                _id: credId,
                hash: "somethingsomething",
                serviceAccountFile: "data:application/json;base64,...",
                type: "fcm"
            };
            appsCollection.findOne.resolves({
                _id: scheduleEvent.appId,
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
                uid: "",
                platform: "a",
                credentials: creds,
                proxy: undefined
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
            assert(result === events.length);
            assert(mockSendPushEvent.called);
            for (let i = 0; i < events.length; i++) {
                const call = mockSendPushEvent.getCall(i);
                assert(call);
                const arg = call.firstArg;
                assert(arg);
                delete arg.message;
                assert.deepStrictEqual(arg, events[i]);
            }
        });
    });
});