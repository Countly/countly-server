var plugins = require("../../../plugins/pluginManager");
var myArgs = process.argv.slice(2);
var db = myArgs[0] || "countly";
var params = plugins.getDbConnectionParams(db);
if (!myArgs[0]) {
    delete params.db;
}
var out = "";
for (var i in params) {
    out += " --" + i + " " + params[i];
}
console.log(out);