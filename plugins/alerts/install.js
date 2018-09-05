var pluginManager = require('../pluginManager.js'),
    db = pluginManager.dbConnection("countly");

console.log("Installing alerts plugin");
console.log("Adding alerts patch");

db.collection('alerts').update({"period": "every 10 seconds"},
    {$set: {"period": "every 59 mins starting on the 59 min"} },
    {upsert: false, multi: true},
    function() {
        console.log("Alerts plugin installation finished");
        db.close();
    });