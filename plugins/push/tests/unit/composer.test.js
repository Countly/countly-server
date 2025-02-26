/**
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("mongodb").FindCursor} FindCursor
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

        it("shouldn't return anything when proxy is not configured", () => {
        });
    });

    // const pluginManager = require("../../../pluginManager.js");
    // const db = await pluginManager.dbConnection();
    // describe("Testing", async () => {
    //     it("should test", async () => {
    //         const appId = "6600901a71159e99a3434253";
    //         const $lookup = {
    //             from: `push_${appId}`,
    //             localField: 'uid',
    //             foreignField: '_id',
    //             as: "tk"
    //         };
    //         const $match = {

    //         };
    //         const $project = { uid: 1, tk: 1, la: 1 };
    //         const result = await db.collection(`app_users${appId}`)
    //             .aggregate([{$match}, {$lookup}, {$project}], { allowDiskUse: true })
    //             .toArray();
    //         console.log(JSON.stringify(result, null, 2));
    //     });
    // });
});