var pluginManager = require('../../../../plugins/pluginManager.js'),
    db = pluginManager.dbConnection();

console.log("Adding messages index for message table");

db.collection("messages").ensureIndex({'result.status': 1, apps: 1, created: 1, source: 1, auto: 1, tx: 1}, function(err) {
    if (err) {
        console.err('Error at ensureIndex', err);
    }
    else {
        console.log('Ensured messages index');
    }
    db.close();
});