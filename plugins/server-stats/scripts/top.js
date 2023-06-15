const stats = require('../api/parts/stats.js');
const pluginManager = require('../../pluginManager.js');
var appNames = {};

var myArgs = process.argv.slice(2);
if (myArgs[0] === "help") {
    return;
}
pluginManager.dbConnection().then((db) => {
    stats.getTop(db, {}, function(toReturn) {
        var apps = Object.keys(toReturn);
        db.collection("apps").find({_id: {$in: apps.map(id => db.ObjectID(id))}}, {projection: {name: 1}}).toArray(function(err, appResult) {
            if (appResult) {
                for (let i = 0; i < appResult.length; i++) {
                    appNames[appResult[i]._id] = appResult[i].name;
                }
            }
            db.close();
            var res = [];
            for (let app in toReturn) {
                if (toReturn[app]) {
                    toReturn[app].app = stats.getAppName(app, appNames);
                    res.push(toReturn[app]);
                }
            }
            res.sort(function(a, b) {
                return b["data-points"] - a["data-points"];
            });
            console.table(res, ["app", "data-points"]);
        });
    });
});