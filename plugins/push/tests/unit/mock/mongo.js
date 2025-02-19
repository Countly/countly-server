const { Db, Collection, FindCursor, ObjectId } = require("mongodb");
const sinon = require("sinon");

function mockMongoDb() {
    const mongoSandbox = sinon.createSandbox();
    const findCursor = mongoSandbox.createStubInstance(FindCursor);
    findCursor.limit.returnsThis();
    findCursor.sort.returnsThis();
    const collection = mongoSandbox.createStubInstance(Collection);
    collection.find.returns(findCursor);
    collection.insertOne.callsFake(doc => {
        if (!doc._id) {
            doc._id = new ObjectId;
        }
        return Promise.resolve(doc);
    });
    const db = mongoSandbox.createStubInstance(Db);
    db.collection.returns(collection);
    return { findCursor, collection, db, mongoSandbox }
}

module.exports = {
    mockMongoDb
}