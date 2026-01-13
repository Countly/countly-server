const { first } = require("underscore");
const common = require("../../../../api/utils/common");
var pluginManager = require("../../../pluginManager.js");
Promise.all(
    [
        pluginManager.dbConnection("countly"),
        pluginManager.dbConnection("countly_drill")
    ])
    .then(async function([countlyDB, drill_db]) {
        console.log("Fixing viws events");

        await common.drill_db.updateMany({"e": "[CLY]_view", "n": {"$exists": false}}, [{"$set": {"n": "$sg.name"}}]);
        await common.drill_db.updateMany({"e": "[CLY]_action", "n": {"$exists": false}}, {"$set": {"n": "$sg.view"}});

        //Fixing custom events
        //get list of custom events. Run update query for each
        var events = await countlyDB.collection("events").find({}, {_id: 1, list: 1}).toArray();
        for (var z = 0; z < events.list.length; z++) {
            var aa = await common.drill_db.updateMany({"a": events._id + "", "e": events.list[z], "n": {"$exists": false}}, {"$set": {"n": event.name, "e": "[CLY]_custom"}});
        }

    }).catch(function(err) {
        console.log(err);
    }
    );