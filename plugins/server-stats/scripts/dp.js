const moment = require("moment");
const stats = require('../api/parts/stats.js');
const pluginManager = require('../../pluginManager.js');
var appNames = {};

var myArgs = process.argv.slice(2);
if (myArgs[0] === "help") {
    return;
}
pluginManager.dbConnection().then((db) => {
    var periodsToFetch = [],
        utcMoment = moment.utc();

    var monthBack = 12;
    var period = myArgs[0] || utcMoment.format("YYYY") + "-" + utcMoment.format("M");

    for (let i = monthBack - 1; i > 0; i--) {
        utcMoment.subtract(i, "months");
        periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));
        utcMoment.add(i, "months");
    }

    periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));

    var filter = {
        _id: {$in: []}
    };

    for (let i = 0; i < periodsToFetch.length; i++) {
        filter._id.$in.push(new RegExp(".*_" + periodsToFetch[i]));
    }

    stats.fetchDatapoints(db, filter, periodsToFetch, function(toReturn) {
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
                if (toReturn[app][period]) {
                    toReturn[app][period].app = stats.getAppName(app, appNames);
                    res.push(toReturn[app][period]);
                }
            }
            res.sort(function(a, b) {
                return b["data-points"] - a["data-points"];
            });
            console.table(res, ["app", "sessions", "events", "data-points", "change"]);
        });
    });
});