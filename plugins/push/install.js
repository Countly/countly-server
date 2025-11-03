const pluginManager = require("../pluginManager.js");

console.log("Installing push plugin");
console.log("Creating indexes");

pluginManager.dbConnection().then(async(db) => {
    const indexName = await db.collection("push")
        .createIndex({ a: 1, u: 1 }, { background: true });
    console.log("index:", indexName, "created on push collection");
    console.log("Push plugin installed");
    db.close();
});

