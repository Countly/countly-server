var manager = require('../../../plugins/pluginManager.js');

var myArgs = process.argv.slice(2);
var flattenObject = function(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }

        if ((typeof ob[i]) == 'object' && ob[i] != null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }

                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};
manager.dbConnection().then((db) => {
    db.collection("plugins").findOne({_id: "plugins"}, function(err, list) {
        if (err) {
            console.log(err);
            db.close();
        }
        else {
            var configs = flattenObject(list);
            var keys = Object.keys(configs);
            keys.sort();
            if (myArgs[0] == "list") {
                console.log("Available configurations:");
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i].indexOf("_id") != 0 && keys[i].indexOf("services.") != 0 && keys[i].indexOf("plugins.") != 0) {
                        if (myArgs[1] == "values") {
                            console.log("", "", keys[i], "=", configs[keys[i]]);
                        }
                        else {
                            console.log("", "", keys[i]);
                        }
                    }
                }
                db.close();
            }
            else if (myArgs[0] && (typeof configs[myArgs[0]] != "undefined" || myArgs[2] === "--force")) {
                if (typeof myArgs[1] == "undefined") {
                    console.log(myArgs[0], "=", configs[myArgs[0]]);
                    db.close();
                }
                else {
                    var val = myArgs[1] + "";
                    if (val === "null") {
                        let update = {$unset: {}};
                        update["$unset"][myArgs[0]] = "";
                        db.collection("plugins").update({_id: "plugins"}, update, function(err) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                console.log("Configuration removed: ");
                            }
                            db.close();
                        });
                    }
                    else {
                        let update = {$set: {}};
                        if (val == "true") {
                            val = true;
                        }
                        else if (val == "false") {
                            val = false;
                        }
                        else if (!isNaN(val)) {
                            val = parseFloat(val);
                        }
                        update["$set"][myArgs[0]] = val;
                        db.collection("plugins").update({_id: "plugins"}, update, function(err) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                console.log("Configuration updated: ", myArgs[0], "=", myArgs[1]);
                            }
                            db.close();
                        });
                    }
                }
            }
            else {
                console.log("Can not find configuration with name: " + myArgs[0]);
                db.close();
            }
        }
    });
});