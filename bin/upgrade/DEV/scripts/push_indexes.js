const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Creating indexes");
pluginManager.dbConnection().then(async(db) => {
    const indexName = await db.collection("push")
        .createIndex({ a: 1, u: 1 }, { background: true });
    console.log("index:", indexName, "created on push collection");
    db.close();
});

