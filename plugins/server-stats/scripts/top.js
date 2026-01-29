const stats = require('../api/parts/stats.js');
const pluginManager = require('../../pluginManager.ts');
var appNames = {};

var myArgs = process.argv.slice(2);
if (myArgs[0] === "help") {
    return;
}
pluginManager.dbConnection().then((db) => {
    stats.getTop(db, {}, function(toReturn) {
        var apps = toReturn.map(o => o.a);
        db.collection("apps").find({_id: {$in: apps.map(id => db.ObjectID(id))}}, {projection: {name: 1}}).toArray(function(err, appResult) {
            if (appResult) {
                for (let i = 0; i < appResult.length; i++) {
                    appNames[appResult[i]._id] = appResult[i].name;
                }
            }
            db.close();
            for (let i = 0; i < toReturn.length; i++) {
                if (toReturn[i].a) {
                    toReturn[i].a = stats.getAppName(toReturn[i].a, appNames);
                }
            }
            toReturn.sort(function(a, b) {
                return b["v"] - a["v"];
            });
            console.table(toReturn, ["a", "v"]);
        });
    });
});
