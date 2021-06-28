var pluginManager = require('../pluginManager.js');

console.log("Installing systemlogs plugin");

pluginManager.dbConnection().then((countlyDb) => {
    function done() {
        console.log("Systemlogs plugin installation finished");
        countlyDb.close();
    }

    console.log("Adding systemlogs indexes");
    var cnt = 0;
    function cb() {
        cnt++;
        if (cnt == 4) {
            done();
        }
    }
    countlyDb.collection('systemlogs').findOne({"_id": "meta_v2"}, function(err, res) {
        var update = {};
        update.$unset = {"a": 1};
        if (!err && res && res.a) {
            update.$set = {"action": res.a};
        }
        countlyDb.collection('systemlogs').updateOne({"_id": "meta_v2"}, update, function() {
            countlyDb.collection('systemlogs').ensureIndex({"ts": 1}, cb);
            countlyDb.collection('systemlogs').ensureIndex({"a": 1}, cb);
            countlyDb.collection('systemlogs').ensureIndex({"user_id": 1}, cb);
            countlyDb.collection('systemlogs').ensureIndex({"app_id": 1}, cb);
        });
    });
});