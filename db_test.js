const {MongoClient} = require('mongodb');

async function main() {
    // we'll add code here soon
    const client = new MongoClient("mongodb://localhost:27017", { useUnifiedTopology: true });
    try {
        await client.connect();
        console.log("connected");
        await listDatabases(client);
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await client.close();
    }
}

async function listDatabases(client) {
    var databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
}

main().catch(console.error);