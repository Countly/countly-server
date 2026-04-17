import type { User } from '../../../api/lib/template.ts';
import type { PushEvent } from '../../../api/models/queue.ts';
import type { PlatformCredential } from '../../../api/models/credentials.ts';
import { createRequire } from 'module';
import { ObjectId } from 'mongodb';
import { describe, it, afterEach } from 'mocha';
import assert from 'assert';
import * as mockData from '../../mock/data.ts';
import sinon from 'sinon';
import { createMockedMongoDb } from '../../mock/mongo.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import esmock from 'esmock';

// Silence push logs: composer.ts loads common.js via createRequire, which esmock
// cannot intercept — so we monkey-patch common.log directly before esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

let {
    collection,
    db,
    sandbox: mongoMockSandbox,
    createMockedCollection
} = createMockedMongoDb();

const mockSendPushEvents: sinon.SinonStub<[pushes: PushEvent[]], Promise<void>> = sinon.stub();

const {
    composeScheduledPushes,
    createPushStream,
    userPropsProjection,
    loadCredentials,
    buildUserAggregationPipeline,
    convertAudienceFiltersToMatchStage
} = await esmock("../../../api/send/composer.ts", {
    "../../../api/kafka/producer.ts": {
        sendPushEvents: mockSendPushEvents
    }
});

describe("Push composer", async() => {
    afterEach(() => {
        // Reset the sandbox to clear all stubs and spies
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

            collection.findOne.callsFake(({ _id }: any) => {
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
                cohorts: [] as string[]
            };

            const pipeline = await convertAudienceFiltersToMatchStage(db, filters, appId.toString());

            assert.strictEqual(pipeline.length, 0);
        });

        it("should handle empty geos array", async() => {
            const appId = new ObjectId();
            const filters = {
                geos: [] as any[]
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

            // Check $project stage — includes standard drill user-profile fields
            const projectStage = pipeline[2];
            assert(projectStage.$project.uid === 1);
            assert(projectStage.$project.tk === 1);
            assert(projectStage.$project.la === 1);
            assert(projectStage.$project.did === 1);
            assert(projectStage.$project.custom === 1);
            assert(projectStage.$project.cmp === 1);
            assert(projectStage.$project.d === 1);
            assert(projectStage.$project.p === 1);
        });

        it("should include user properties in projection for parametric messages", async() => {
            const parametricMessage = mockData.parametricMessage();
            const pipeline = await buildUserAggregationPipeline(db, parametricMessage);

            const projectStage = pipeline.find((stage: any) => stage.$project);
            assert(projectStage);
            // Drill fields always present
            assert(projectStage.$project.did === 1);
            assert(projectStage.$project.custom === 1);
            // Parametric message adds its own projection fields on top
            assert(projectStage.$project.dt === 1);
            assert(projectStage.$project.nonExisting === 1);
            assert(projectStage.$project.fs === 1);
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

        it("should create push events for each user token", async() => {
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
            const creds: PlatformCredential = {
                _id: credId,
                hash: "somethingsomething",
                serviceAccountFile: "data:application/json;base64,...",
                type: "fcm"
            };
            const user = mockData.appUser();
            const event: Omit<PushEvent, "payload"> = {
                appId,
                messageId,
                scheduleId,
                token: "",
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
            const users: User[] = [
                { ...user, uid: "1", },
                { ...user, uid: "2", },
                { ...user, uid: "3", }
            ];
            const events: Array<Omit<PushEvent, "payload">> = [
                { ...event, uid: users[0].uid, token: users[0].tk?.[0].tk.ap as string },
                { ...event, uid: users[1].uid, token: users[1].tk?.[0].tk.ap as string },
                { ...event, uid: users[2].uid, token: users[2].tk?.[0].tk.ap as string },
            ];
            const iterator: unknown = (async function*() {
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
            aggregationCursor.stream.returns(iterator as any);

            const result = await composeScheduledPushes(db, scheduleEvent);
            const arg = mockSendPushEvents.getCall(0).firstArg?.map(
                (a: PushEvent) => {
                    const { payload, userProfile, ...ret } = a as any;
                    return ret;
                }
            );

            assert(arg);
            assert(result === events.length);
            assert(mockSendPushEvents.called);
            for (let i = 0; i < events.length; i++) {
                assert.deepStrictEqual(arg[i], events[i]);
            }
        });

        it("should mark event composed BEFORE running applyResultObject status checks", async() => {
            // Reproduces a real bug with timezone-aware recurring schedules:
            // A schedule has 38 timezone events. Only 1 has users (1 push sent).
            // The result arrives before all zero-user slots are composed. The
            // resultor's status check sees "scheduled" events → stays "sending".
            // Then the remaining zero-user events get composed one by one. If the
            // composer marks "composed" AFTER applyResultObject, the LAST event's
            // status check still sees itself as "scheduled" → never transitions
            // to "sent". Fix: mark "composed" BEFORE applyResultObject so the
            // last event's check sees all events as "composed".
            const scheduleEvent = mockData.scheduleEvent();
            const {appId, messageId, scheduleId} = scheduleEvent;
            const schedule = mockData.schedule();
            const message = mockData.message();
            schedule.appId = appId;
            schedule._id = scheduleId;
            schedule.messageId = messageId;
            message._id = messageId;
            message.app = appId;
            const appUsersCollectionName = "app_users" + appId.toString();
            const { aggregationCursor } = createMockedCollection(appUsersCollectionName);
            const { collection: messageCollection } = createMockedCollection("messages");
            const { collection: scheduleCollection } = createMockedCollection("message_schedules");
            const { collection: appsCollection } = createMockedCollection("apps");
            const { collection: credsCollection } = createMockedCollection("creds");
            const creds = mockData.androidCredential();

            // Empty stream — simulates a zero-user timezone slot
            aggregationCursor.stream.returns((async function*() {})() as any);
            appsCollection.findOne.resolves({
                _id: appId, timezone: "NA",
                plugins: { push: { a: { ...creds, serviceAccountFile: "sa.json" } } }
            });
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            credsCollection.findOne.resolves(creds);

            await composeScheduledPushes(db, scheduleEvent);

            const calls = scheduleCollection.updateOne.getCalls().map(
                (c: any) => JSON.stringify(c.args)
            );
            const markComposedIdx = calls.findIndex(
                (c: string) => c.includes('"events.$.status"') && c.includes('"composed"')
            );
            const incIdx = calls.findIndex(
                (c: string) => c.includes('"$inc"') || c.includes('"result.total"')
            );

            assert(markComposedIdx !== -1, "mark-composed call should exist");
            assert(incIdx !== -1, "$inc call should exist");
            assert(
                markComposedIdx < incIdx,
                `mark-composed (call ${markComposedIdx}) must run BEFORE applyResultObject $inc (call ${incIdx})`
            );
        });

        it("should merge messageOverrides.contents into message contents", async() => {
            const scheduleEvent = mockData.scheduleEvent();
            const {appId, messageId, scheduleId} = scheduleEvent;
            const schedule = mockData.schedule();
            const message = mockData.message();
            const appUsersCollectionName = "app_users" + appId.toString();
            schedule.appId = appId;
            schedule._id = scheduleId;
            schedule.messageId = messageId;
            // Add message overrides with a new content
            schedule.messageOverrides = {
                contents: [{ title: 'overridden title', message: 'overridden message' }]
            };
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
            const creds: PlatformCredential = mockData.androidCredential();

            appsCollection.findOne.resolves({
                _id: appId,
                timezone: "UTC",
                plugins: {
                    push: {
                        a: { ...creds, serviceAccountFile: "sa.json" }
                    }
                }
            });
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            credsCollection.findOne.resolves(creds);

            const user = mockData.appUser();
            aggregationCursor.stream.returns((async function*() {
                yield user;
            })() as any);

            const result = await composeScheduledPushes(db, scheduleEvent);

            assert.strictEqual(result, 1);
            assert(mockSendPushEvents.called);
            // The overridden content should be in the payload since it's
            // appended to the contents array before template creation
            const sentPush = mockSendPushEvents.firstCall.firstArg[0];
            assert(sentPush);
            assert.strictEqual(sentPush.uid, user.uid);
        });

        it("should mark schedule event as composed after processing", async() => {
            const scheduleEvent = mockData.scheduleEvent();
            const {appId, messageId, scheduleId, scheduledTo} = scheduleEvent;
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
            const creds: PlatformCredential = mockData.androidCredential();

            appsCollection.findOne.resolves({
                _id: appId,
                timezone: "UTC",
                plugins: {
                    push: {
                        a: { ...creds, serviceAccountFile: "sa.json" }
                    }
                }
            });
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            credsCollection.findOne.resolves(creds);
            aggregationCursor.stream.returns((async function*() {
                // empty stream — no users
            })() as any);

            await composeScheduledPushes(db, scheduleEvent);

            // Verify schedule event was marked as composed
            assert(scheduleCollection.updateOne.calledWith(
                { _id: scheduleId, "events.scheduledTo": scheduledTo },
                { $set: { "events.$.status": "composed" } }
            ));
        });

        it("should batch push events in groups of 100", async() => {
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
            const creds: PlatformCredential = mockData.androidCredential();

            appsCollection.findOne.resolves({
                _id: appId,
                timezone: "UTC",
                plugins: {
                    push: {
                        a: { ...creds, serviceAccountFile: "sa.json" }
                    }
                }
            });
            messageCollection.findOne.resolves(message);
            scheduleCollection.findOne.resolves(schedule);
            credsCollection.findOne.resolves(creds);

            const baseUser = mockData.appUser();
            aggregationCursor.stream.returns((async function*() {
                for (let i = 0; i < 150; i++) {
                    yield { ...baseUser, uid: String(i) };
                }
            })() as any);

            const result = await composeScheduledPushes(db, scheduleEvent);

            assert.strictEqual(result, 150);
            // Should be called twice: batch of 100, then remaining 50
            assert.strictEqual(mockSendPushEvents.callCount, 2);
            assert.strictEqual(mockSendPushEvents.firstCall.firstArg.length, 100);
            assert.strictEqual(mockSendPushEvents.secondCall.firstArg.length, 50);
        });
    });

    describe("createPushStream", () => {
        function streamSetup() {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const scheduleId = new ObjectId();
            const scheduledTo = new Date();
            const appDoc = { _id: appId, timezone: "UTC" };
            const msg = mockData.message();
            msg._id = messageId;
            msg.app = appId;
            const sched = mockData.schedule();
            sched._id = scheduleId;
            sched.appId = appId;
            sched.messageId = messageId;
            const collectionName = "app_users" + appId.toString();
            const { aggregationCursor } = createMockedCollection(collectionName);
            const mockTemplate = (_platform: string, _context: any) => ({
                data: { "c.i": messageId.toString(), title: "test", message: "test" }
            });
            return {
                appId, messageId, scheduleId, scheduledTo,
                appDoc, msg, sched, aggregationCursor, mockTemplate
            };
        }

        async function collectStream(stream: AsyncGenerator<PushEvent>): Promise<PushEvent[]> {
            const results: PushEvent[] = [];
            for await (const push of stream) {
                results.push(push);
            }
            return results;
        }

        it("should skip users with empty token lookup", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };

            const userNoToken = mockData.appUserNoToken();
            const userWithToken = mockData.appUser();

            aggregationCursor.stream.returns((async function*() {
                yield userNoToken;
                yield userWithToken;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].uid, userWithToken.uid);
        });

        it("should skip users with null token object", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };

            const userNullTk = { ...mockData.appUser(), uid: "nulltk", tk: [{ _id: "nulltk", tk: null }] };
            const userWithToken = mockData.appUser();

            aggregationCursor.stream.returns((async function*() {
                yield userNullTk;
                yield userWithToken;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].uid, userWithToken.uid);
        });

        it("should skip tokens for platforms without credentials", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            // Only android creds, no iOS
            const creds = { a: mockData.androidCredential() };
            msg.platforms = ["a", "i"];

            // User has both android and iOS tokens
            const multiUser = mockData.appUserMultiToken();

            aggregationCursor.stream.returns((async function*() {
                yield multiUser;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            // Only android token should produce a push event
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].platform, "a");
            assert.strictEqual(results[0].token, "android-token-123");
        });

        it("should yield push events for multiple tokens per user", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            // Credentials for both platforms
            const creds = {
                a: mockData.androidCredential(),
                i: mockData.iosCredential()
            };
            msg.platforms = ["a", "i"];

            const multiUser = mockData.appUserMultiToken();

            aggregationCursor.stream.returns((async function*() {
                yield multiUser;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 2);
            const platforms = results.map(r => r.platform).sort();
            assert.deepStrictEqual(platforms, ["a", "i"]);
            const androidPush = results.find(r => r.platform === "a")!;
            const iosPush = results.find(r => r.platform === "i")!;
            assert.strictEqual(androidPush.token, "android-token-123");
            assert.strictEqual(iosPush.token, "ios-token-456");
            assert.strictEqual(androidPush.env, "p");
            assert.strictEqual(iosPush.env, "p");
        });

        it("should default language to 'default' when user has no la field", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };

            const userNoLang = mockData.appUserNoLanguage();

            aggregationCursor.stream.returns((async function*() {
                yield userNoLang;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].language, "default");
        });

        it("should set sendBefore from pluginConfig.messageTimeout", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };
            const timeout = 60000; // 1 minute
            const pluginConfig = { messageTimeout: timeout };

            const user = mockData.appUser();
            aggregationCursor.stream.returns((async function*() {
                yield user;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, pluginConfig as any, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert(results[0].sendBefore instanceof Date);
            assert.strictEqual(
                results[0].sendBefore!.getTime(),
                scheduledTo.getTime() + timeout
            );
        });

        it("should not set sendBefore when pluginConfig is undefined", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };

            const user = mockData.appUser();
            aggregationCursor.stream.returns((async function*() {
                yield user;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].sendBefore, undefined);
        });

        it("should merge messageOverrides.variables with user data", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor } = streamSetup();
            const creds = { a: mockData.androidCredential() };
            sched.messageOverrides = {
                variables: { customVar: "override-value" }
            };

            const user = mockData.appUser();
            let receivedContext: any;
            const capturingTemplate = (_platform: string, context: any) => {
                receivedContext = context;
                return { data: { "c.i": msg._id.toString() } };
            };

            aggregationCursor.stream.returns((async function*() {
                yield user;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, undefined, capturingTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.strictEqual(receivedContext.customVar, "override-value");
            // Original user properties should still be present
            assert.strictEqual(receivedContext.uid, user.uid);
        });

        it("should pass proxy configuration from pluginConfig", async() => {
            const { appDoc, msg, sched, scheduledTo, aggregationCursor, mockTemplate } = streamSetup();
            const creds = { a: mockData.androidCredential() };
            const proxy = { host: "proxy.example.com", port: "8080", auth: false };
            const pluginConfig = { proxy };

            const user = mockData.appUser();
            aggregationCursor.stream.returns((async function*() {
                yield user;
            })() as any);

            const results = await collectStream(
                createPushStream(db, appDoc, msg, sched, scheduledTo, creds, pluginConfig as any, mockTemplate as any, [])
            );

            assert.strictEqual(results.length, 1);
            assert.deepStrictEqual(results[0].proxy, proxy);
        });
    });

    describe("Credential loading - edge cases", () => {
        it("should skip demo credentials", async() => {
            const appId = new ObjectId();
            collection.findOne.resolves({
                _id: appId,
                plugins: {
                    push: {
                        a: { _id: "demo", serviceAccountFile: "demo.json" }
                    }
                }
            });

            const creds = await loadCredentials(db, appId);

            assert.deepStrictEqual(creds, {});
        });

        it("should load multiple platform credentials", async() => {
            const appId = new ObjectId();
            const androidCred = mockData.androidCredential();
            const iosCred = mockData.iosCredential();

            collection.findOne.callsFake(({ _id }: any) => {
                if (_id === appId) {
                    return Promise.resolve({
                        _id: appId,
                        plugins: {
                            push: {
                                a: { ...androidCred, serviceAccountFile: "sa.json" },
                                i: { ...iosCred, key: "key.p8" },
                            }
                        }
                    });
                }
                if (_id === androidCred._id) {
                    return Promise.resolve(androidCred);
                }
                if (_id === iosCred._id) {
                    return Promise.resolve(iosCred);
                }
                return Promise.resolve(null);
            });

            const creds = await loadCredentials(db, appId);

            assert.deepStrictEqual(creds.a, androidCred);
            assert.deepStrictEqual(creds.i, iosCred);
        });

        it("should skip platforms with missing credential documents", async() => {
            const appId = new ObjectId();
            const credId = new ObjectId();

            collection.findOne.callsFake(({ _id }: any) => {
                if (_id === appId) {
                    return Promise.resolve({
                        _id: appId,
                        plugins: {
                            push: {
                                a: { _id: credId, serviceAccountFile: "sa.json" }
                            }
                        }
                    });
                }
                // Credential document doesn't exist
                return Promise.resolve(null);
            });

            const creds = await loadCredentials(db, appId);

            assert.deepStrictEqual(creds, {});
        });
    });
});
