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
const { loadPluginConfiguration } = require("../../api/new/lib/utils");
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
    createPushStream,
    buildUserAggregationPipeline,
    convertAudienceFiltersToMatchStage
} = proxyquire("../../api/new/composer", {
    "../../api/new/lib/kafka.js": {
        sendPushEvents: mockSendPushEvents
    },
    "../../../../api/utils/common": common
});

describe("Push composer", async() => {
    afterEach(() => {
        // Reset the sandbox to clear all stubs and spies.
        // we cannot use resetHistory here because we need to reset the whole sandbox
        ({
            collection,
            db,
            sandbox: mongoMockSandbox,
            createMockedCollection
        } = createMockedMongoDb());
        mockSendPushEvents.resetHistory();
    });

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

    describe("Credential loading", () => {
        it("should return an empty object if push is not enabled", async() => {
            const appId = new ObjectId;
            collection.findOne.resolves({_id: appId, plugins: {}});

            const creds = await loadCredentials(db, appId);

            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });

        it("should return an empty object if push is not configured", async() => {
            const appId = new ObjectId;
            collection.findOne.resolves({
                _id: appId,
                plugins: {push: {}}
            });

            const creds = await loadCredentials(db, appId);

            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert.deepStrictEqual(creds, {});
        });

        it("should return platform key indexed credentials", async() => {
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
                    };
                }
                else if (_id === credId) {
                    obj = mockedCreds;
                }
                return Promise.resolve(obj);
            });

            const creds = await loadCredentials(db, appId);

            assert(db.collection.calledWith("apps"));
            assert(collection.findOne.calledWith({ _id: appId }));
            assert(db.collection.calledWith("creds"));
            assert(collection.findOne.calledWith({ _id: credId }));
            assert.deepStrictEqual(creds, { a: mockedCreds });
        });
    });

    describe("Loading plugin configuration", () => {
        it("shouldn't return anything when plugin is not configured", async() => {
            collection.findOne.resolves({});

            const pluginConfig = await loadPluginConfiguration();

            assert(db.collection.calledWith("plugins"));
            assert(collection.findOne.calledWith({ _id: "plugins" }));
            assert(pluginConfig === undefined);
        });

        it("should return the plugin config", async() => {
            const pluginDocument = {
                _id: "plugins",
                push: {
                    proxyhost: "host",
                    proxyport: "port",
                    proxyuser: "user",
                    proxypass: "pass",
                    proxyunauthorized: true,
                    message_timeout: 15000,
                    message_results_ttl: 86400
                }
            };
            const result = {
                messageTimeout: 15000,
                messageResultsTTL: 86400,
                proxy: {
                    host: "host",
                    port: "port",
                    user: "user",
                    pass: "pass",
                    auth: false
                }
            };
            collection.findOne.resolves(pluginDocument);
            const config = await loadPluginConfiguration();
            assert(db.collection.calledWith("plugins"));
            assert(collection.findOne.calledWith({ _id: "plugins" }));
            assert.deepStrictEqual(config, result);
        });
    });

    describe("Audience $match stage builder", () => {
        it("should return empty pipeline when no filters provided", async() => {
            const appId = new ObjectId();
            const pipeline = await convertAudienceFiltersToMatchStage(db, {}, appId.toString());

            assert(Array.isArray(pipeline));
            assert.strictEqual(pipeline.length, 0);
        });

        it("should filter by user IDs", async() => {
            const appId = new ObjectId();
            const filters = {
                uids: ["user1", "user2", "user3"]
            };
            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert.deepStrictEqual(pipeline[0], {
                $match: {
                    uid: { $in: ["user1", "user2", "user3"] }
                }
            });
        });

        it("should filter by cohort statuses", async() => {
            const appId = new ObjectId();
            const filters = {
                userCohortStatuses: [
                    { uid: "user1", cohort: { id: "cohort1", status: true } },
                    { uid: "user2", cohort: { id: "cohort2", status: false } }
                ]
            };
            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert.deepStrictEqual(pipeline[0].$match.$or, [
                { uid: "user1", "chr.cohort1.in": "true" },
                { uid: "user2", "chr.cohort2.in": { $exists: false } }
            ]);
        });

        it("should filter by cohorts", async() => {
            const appId = new ObjectId();
            const filters = {
                cohorts: ["cohort1", "cohort2"]
            };
            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert.deepStrictEqual(pipeline[0], {
                $match: {
                    "chr.cohort1.in": "true",
                    "chr.cohort2.in": "true"
                }
            });
        });

        it("should filter by geos", async() => {
            const appId = new ObjectId();
            const geoId1 = new ObjectId();
            const geoId2 = new ObjectId();
            const filters = {
                geos: [geoId1, geoId2]
            };

            const geosCollection = createMockedCollection("geos");
            geosCollection.findCursor.toArray.resolves([
                {
                    _id: geoId1,
                    geo: { type: "Point", coordinates: [-122.4194, 37.7749] },
                    radius: 10,
                    unit: "km"
                },
                {
                    _id: geoId2,
                    geo: { type: "Point", coordinates: [-118.2437, 34.0522] },
                    radius: 5,
                    unit: "mi"
                }
            ]);

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert(pipeline[0].$match.$or);
            assert.strictEqual(pipeline[0].$match.$or.length, 2);
            assert(pipeline[0].$match.$or[0]["loc.geo"].$geoWithin.$centerSphere);
            assert(geosCollection.collection.find.calledWith({
                "geo.type": "Point",
                unit: { $in: ["mi", "km"] },
                _id: { $in: [geoId1, geoId2] }
            }));
        });

        it("should handle no matching geos", async() => {
            const appId = new ObjectId();
            const geoId = new ObjectId();
            const filters = {
                geos: [geoId]
            };

            const geosCollection = createMockedCollection("geos");
            geosCollection.findCursor.toArray.resolves([]);

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert.deepStrictEqual(pipeline[0], {
                $match: { "loc.geo": "no such geo" }
            });
        });

        it("should filter by user-defined filters", async() => {
            const appId = new ObjectId();
            const filters = {
                user: '{"city":"San Francisco","age":{"$gte":25}}'
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            assert.deepStrictEqual(pipeline[0].$match, {
                city: "San Francisco",
                age: { $gte: 25 }
            });
        });

        it("should apply cap filters for max messages", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const filters = {
                cap: {
                    messageId: messageId,
                    maxMessages: 3
                }
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            const field = "msgs." + messageId.toString();
            assert.deepStrictEqual(pipeline[0], {
                $match: {
                    [field + ".2"]: { $exists: false }
                }
            });
        });

        it("should apply cap filters for min time", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const minTime = 3600000; // 1 hour
            const filters = {
                cap: {
                    messageId: messageId,
                    minTime: minTime
                }
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 1);
            const field = "msgs." + messageId.toString();
            assert(pipeline[0].$match[field].$not.$gt);
            // Verify it's checking for time greater than (now - minTime)
            assert(pipeline[0].$match[field].$not.$gt > Date.now() - minTime - 1000);
        });

        it("should apply both cap filters together", async() => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const filters = {
                cap: {
                    messageId: messageId,
                    maxMessages: 5,
                    minTime: 7200000 // 2 hours
                }
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 2);
            const field = "msgs." + messageId.toString();

            // Max messages check
            assert.deepStrictEqual(pipeline[0].$match, {
                [field + ".4"]: { $exists: false }
            });

            // Min time check
            assert(pipeline[1].$match[field].$not.$gt);
        });

        it("should combine multiple filter types", async() => {
            const appId = new ObjectId();
            const filters = {
                uids: ["user1", "user2"],
                cohorts: ["cohort1"],
                user: '{"premium":true}'
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            // Should have 3 match stages
            assert.strictEqual(pipeline.length, 3);

            // UIDs filter
            assert.deepStrictEqual(pipeline[0].$match, {
                uid: { $in: ["user1", "user2"] }
            });

            // Cohorts filter
            assert.deepStrictEqual(pipeline[1].$match, {
                "chr.cohort1.in": "true"
            });

            // User filter
            assert.deepStrictEqual(pipeline[2].$match, {
                premium: true
            });
        });

        it("should handle empty cohorts array", async() => {
            const appId = new ObjectId();
            const filters = {
                cohorts: []
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 0);
        });

        it("should handle empty geos array", async() => {
            const appId = new ObjectId();
            const filters = {
                geos: []
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 0);
        });
    });

    describe("User document aggregation pipeline builder", () => {
        it("should build basic pipeline with projection and lookup", async() => {
            const message = mockData.message();
            const pipeline = await buildUserAggregationPipeline(db, message);

            assert(Array.isArray(pipeline));
            assert.strictEqual(pipeline.length, 3);

            // Check $match stage
            const matchStage = pipeline[0];
            assert(matchStage.$match);
            assert.deepStrictEqual(matchStage.$match.$or, [
                { tkap: { $exists: true } },
                { tkhp: { $exists: true } }
            ]);

            // Check $lookup stage
            const lookupStage = pipeline[1];
            assert.deepStrictEqual(lookupStage.$lookup, {
                from: "push_" + message.app.toString(),
                localField: 'uid',
                foreignField: '_id',
                as: "tk"
            });

            // Check $project stage
            const projectStage = pipeline[2];
            assert.deepStrictEqual(projectStage.$project, {
                uid: 1,
                tk: 1,
                la: 1
            });
        });

        it("should include user properties in projection for parametric messages", async() => {
            const parametricMessage = mockData.parametricMessage();
            const pipeline = await buildUserAggregationPipeline(db, parametricMessage);

            const projectStage = pipeline.find((/** @type {any} */ stage) => stage.$project);
            assert(projectStage);
            assert.deepStrictEqual(projectStage.$project, {
                uid: 1,
                tk: 1,
                la: 1,
                dt: 1,
                nonExisting: 1,
                d: 1,
                did: 1,
                fs: 1
            });
        });

        it("should add timezone filter when timezone is provided", async() => {
            const message = mockData.message();
            const timezone = "180";
            const pipeline = await buildUserAggregationPipeline(db, message, undefined, timezone);

            const matchStage = pipeline[0];
            assert.strictEqual(matchStage.$match.tz, timezone);
        });

        it("should handle multiple platforms correctly", async() => {
            const message = mockData.message();
            message.platforms = ["a", "i"];
            const pipeline = await buildUserAggregationPipeline(db, message);

            const matchStage = pipeline[0];
            assert(matchStage.$match.$or);
            // Android platforms: ap (FCM prod), ah (HMS prod)
            // iOS platforms: ip (prod), id (dev), ia (ad-hoc)
            assert.deepStrictEqual(matchStage.$match.$or, [
                { tkap: { $exists: true } },
                { tkhp: { $exists: true } },
                { tkip: { $exists: true } },
                { tkid: { $exists: true } },
                { tkia: { $exists: true } }
            ]);
        });

        it("should include filter pipeline when filters are provided", async() => {
            const message = mockData.message();
            const filters = {
                uids: ["user1", "user2", "user3"]
            };
            const pipeline = await buildUserAggregationPipeline(db, message, undefined, undefined, filters);

            // Should have match, filter match, lookup, project
            assert.strictEqual(pipeline.length, 4);

            // Check filter match stage
            const filterMatchStage = pipeline[1];
            assert.deepStrictEqual(filterMatchStage.$match, {
                uid: { $in: ["user1", "user2", "user3"] }
            });
        });
    });

    describe("Push event creation", () => {
        it("should cancel all schedules if the message is deleted", async() => {
            const {
                collection: messageCollection
            } = createMockedCollection("messages");
            const {
                collection: schedulesCollection
            } = createMockedCollection("message_schedules");
            const scheduleEvent = mockData.scheduleEvent();

            messageCollection.findOne.resolves(null);

            await composeScheduledPushes(db, scheduleEvent);

            assert(db.collection.calledWith("messages"));
            assert(messageCollection.findOne.calledWith({
                _id: scheduleEvent.messageId, status: "active"
            }));
            assert(db.collection.calledWith("message_schedules"));
            assert(schedulesCollection.updateMany.calledWith({
                messageId: scheduleEvent.messageId
            }, {
                $set: { status: "canceled" }
            }));
        });

        it("should return early if schedule was deleted or status is not \"scheduled\"", async() => {
            const {
                collection: messageCollection
            } = createMockedCollection("messages");
            const {
                collection: scheduleCollection
            } = createMockedCollection("message_schedules");
            const scheduleEvent = mockData.scheduleEvent();
            const message = mockData.message();

            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(null);
            message._id = scheduleEvent.messageId;
            message.app = scheduleEvent.appId;

            const numberOfPushes = await composeScheduledPushes(db, scheduleEvent);

            assert(db.collection.calledWith("messages"));
            assert(messageCollection.findOne.calledWith({
                _id: scheduleEvent.messageId,
                status: "active"
            }));
            assert(db.collection.calledWith("message_schedules"));
            assert(scheduleCollection.findOne.calledWith({
                _id: scheduleEvent.scheduleId,
                status: {
                    $in: ["scheduled", "sending"]
                },
                events: {
                    $elemMatch: {
                        scheduledTo: scheduleEvent.scheduledTo,
                        status: "scheduled"
                    }
                }
            }));
            assert(numberOfPushes === 0);
        });

        it("should stop composing if app is deleted", async() => {
            const scheduleEvent = mockData.scheduleEvent();
            const schedule = mockData.schedule();
            const message = mockData.message();
            const {
                collection: messageCollection
            } = createMockedCollection("messages");
            const {
                collection: scheduleCollection
            } = createMockedCollection("message_schedules");
            const {
                collection: appsCollection
            } = createMockedCollection("apps");

            appsCollection.findOne.resolves(null);
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);

            assert(await composeScheduledPushes(db, scheduleEvent) === 0);
        });

        it("create push events for each user token", async() => {
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
            const {
                aggregationCursor
            } = createMockedCollection(appUsersCollectionName);
            const {
                collection: messageCollection
            } = createMockedCollection("messages");
            const {
                collection: scheduleCollection
            } = createMockedCollection("message_schedules");
            const {
                collection: appsCollection
            } = createMockedCollection("apps");
            const {
                collection: credsCollection
            } = createMockedCollection("creds");
            const credId = new ObjectId;
            /** @type {PlatformCredential} */
            const creds = {
                _id: credId,
                hash: "somethingsomething",
                serviceAccountFile: "data:application/json;base64,...",
                type: "fcm"
            };
            const user = mockData.appUser();
            /** @type {Omit<PushEvent, "payload">} */
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
                platformConfiguration: {},
                sendBefore: undefined,
            };
            /** @type {User[]} */
            const users = [
                { ...user, uid: "1", },
                { ...user, uid: "2", },
                { ...user, uid: "3", }
            ];
            /** @type {Array<Omit<PushEvent, "payload">>} */
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
            aggregationCursor.stream.returns(/** @type {Readable & AsyncIterable<User>} */(iterator));

            const result = await composeScheduledPushes(db, scheduleEvent);
            const arg = mockSendPushEvents.getCall(0).firstArg?.map(
                /** @type {(a: PushEvent) => Omit<PushEvent, "paylaod">} */(a => {
                    const { payload, ...ret } = a;
                    return ret;
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