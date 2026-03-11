import { Db, Collection, FindCursor, ObjectId, AggregationCursor } from 'mongodb';
import sinon from 'sinon';

function createMockedCollection(sandbox: sinon.SinonSandbox) {
    const findCursor = sandbox.createStubInstance(FindCursor);
    findCursor.limit.returnsThis();
    findCursor.sort.returnsThis();
    const aggregationCursor = sandbox.createStubInstance(AggregationCursor);
    const collection = sandbox.createStubInstance(Collection);
    collection.find.returns(findCursor as any);
    collection.aggregate.returns(aggregationCursor as any);
    collection.insertOne.callsFake((doc: any) => {
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

export function createMockedMongoDb() {
    const namedCollections: {[collectionName: string]: sinon.SinonStubbedInstance<Collection>} = {};

    const sandbox = sinon.createSandbox();
    // generic collection
    const {collection, findCursor, aggregationCursor} = createMockedCollection(sandbox);
    const db = sandbox.createStubInstance(Db);

    db.collection.callsFake((collectionName: string) => {
        if (namedCollections[collectionName]) {
            return namedCollections[collectionName] as any;
        }
        return collection as any;
    });

    return {
        findCursor,
        aggregationCursor,
        collection,
        db,
        sandbox,
        createMockedCollection(name: string) {
            const ret = createMockedCollection(sandbox);
            namedCollections[name] = ret.collection;
            return ret;
        }
    };
}
