var plugins = require("../../pluginManager.js");
var moment = require("moment");
var localize = require('../../../api/utils/localization.js');
var myArgs = process.argv.slice(2);

if (!myArgs.length) {
    console.log("Usage: countly systemlogs export {days} {format}");
    console.log("Example: countly systemlogs export 30 json");
}
else {
    var days = parseInt(myArgs[0], 10);
    var date = moment().subtract(days, "days");
    var format = "jsonl";
    if (myArgs[1]) {
        format = myArgs[1];
    }

    if (format === "json") {
        console.log("[");
    }
    localize.getProperties("en", function(err, properties) {
        plugins.dbConnection().then((db) => {
            plugins.loadConfigs(db, function() {
                var stream = db.collection("systemlogs").find({ts: {$gte: date.unix()}}).stream();
                var returned = false;
                var first = true;
                stream.on('data', function(doc) {
                    if (format === "json" && first) {
                        first = false;
                    }
                    else if (format === "json") {
                        console.log(",");
                    }
                    if (format === "pretty") {
                        console.log(JSON.stringify(doc, null, 2));
                    }
                    else if (format === "log") {
                        var loginActions = ["login_success", "login_failed", "api-key_success", "api-key_failed", "mobile_login_success", "mobile_login_failed", "token_login_failed", "token_login_successfull"];
                        var newUserActions = ["user_created", "group_created", "group_users"];
                        var output = [];
                        output.push(moment.unix(doc.ts).format("YYYY/MM/DD HH:mm:ss"));
                        output.push(doc.user_id + (doc.u ? " (" + doc.u + ")" : ""));
                        output.push(doc.ip);
                        output.push(doc.app_id || plugins.getConfig("api").domain || process.env.COUNTLY_CONFIG_HOSTNAME || "localhost");
                        if (loginActions.indexOf(doc.a) !== -1) {
                            console.log("Time stamp | User ID | Login device IP or Hostname | Application/Service/Server Name | Result");
                            output.push(properties["systemlogs.action." + doc.a] || doc.a);
                        }
                        else if (newUserActions.indexOf(doc.a) !== -1) {
                            console.log("Time stamp | User ID | Login device IP or Hostname | Application/Service/Server Name | Created User ID or User Group | Result");
                            output.push((properties["systemlogs.action." + doc.a] || doc.a) + " " + ((doc.i && doc.i._id) || doc._id));
                            output.push(JSON.stringify(doc.i));
                        }
                        else {
                            console.log("Time stamp | User ID | Login device IP or Hostname | Application/Service/Server Name | Operation/event name | Result");
                            output.push(properties["systemlogs.action." + doc.a] || doc.a);
                            output.push(JSON.stringify(doc.i));
                        }
                        console.log(output.join(" | "));
                    }
                    else {
                        console.log(JSON.stringify(doc));
                    }
                });
                stream.on('error', function(err) {
                    if (!returned) {
                        if (format === "json") {
                            console.log("]");
                        }
                        db.close();
                        returned = true;
                    }
                    console.log(err);
                });
                stream.once('end', function() {
                    if (!returned) {
                        if (format === "json") {
                            console.log("]");
                        }
                        db.close();
                        returned = true;
                    }
                });
            });
        });
    });
}