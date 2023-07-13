var pluginManager = require("../../../../plugins/pluginManager"),
    fs = require("fs"),
    path = require("path");

var dir = path.resolve(__dirname, "drill_backups");
fs.mkdir(dir, function() {
    var params = pluginManager.getDbConnectionParams("countly_drill");
    params.query = "'" + JSON.stringify({"_id": {"$regex": "meta.*"}}) + "'";

    pluginManager.dbConnection("countly_drill").then((db) => {
        var reg = /^drill_events\.*/;
    
        function outputParams(params) {
            var out = "mongoexport";
            for (var i in params) {
                out += " --" + i + " " + params[i];
            }
            console.log(out);
        }
    
        db.collections(function(err, results) {
            if (err) {
                throw err;
            }
            else {
                results.forEach(function(col) {
                    var c = col.collectionName;
                    if (reg.test(c)) {
                        params.collection = c;
                        params.out = path.join(dir, c + ".json");
                        outputParams(params);
                    }
                });
                db.close();
            }
        });
    });
});