const { Db, Collection, FindCursor, ObjectId, AggregationCursor } = require("mongodb");
const sinon = require("sinon");

/**
 * @param {sinon.SinonSandbox} sandbox
 */
function createMockedCollection(sandbox) {
    const findCursor = sandbox.createStubInstance(FindCursor);
    findCursor.limit.returnsThis();
    findCursor.sort.returnsThis();
    const aggregationCursor = sandbox.createStubInstance(AggregationCursor);
    const collection = sandbox.createStubInstance(Collection);
    collection.find.returns(findCursor);
    collection.aggregate.returns(aggregationCursor);
    collection.insertOne.callsFake(doc => {
        if (!doc._id) {
            doc._id = new ObjectId;
        }
        return Promise.resolve(doc);
    });
    return {
        collection,
        findCursor,
        aggregationCursor
    };
}

function createMockedMongoDb() {
    /**
     * @type {{[collectionName: string]: sinon.SinonStubbedInstance<Collection>}}
     */
    const namedCollections = {};

    const sandbox = sinon.createSandbox();
    // generic collection
    const {collection, findCursor, aggregationCursor} = createMockedCollection(sandbox);
    const db = sandbox.createStubInstance(Db);
    // db.collection.returns(collection);

    db.collection.callsFake((collectionName) => {
        if (namedCollections[collectionName]) {
            return namedCollections[collectionName];
        }
        return collection;
    });

    return {
        findCursor,
        aggregationCursor,
        collection,
        db,
        sandbox,
        /**
         * @param {string} name
         */
        createMockedCollection(name) {
            const ret = createMockedCollection(sandbox);
            namedCollections[name] = ret.collection;
            return ret;
        }
    };
}

module.exports = {
    createMockedMongoDb
};