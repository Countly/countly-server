const {MongoClient} = require('mongodb');

const dns = require('dns');

dns.lookup('localhost', function(err, result) {
    console.log("DNS lookup", err, result);
});

async function main() {
    // we'll add code here soon
    console.log("creating client");
    const client = new MongoClient("mongodb://127.0.0.1:27017/countly");
    try {
        console.log("connecting");
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