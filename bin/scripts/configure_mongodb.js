var yaml = require('yamljs');
var fs = require("fs");

var myArgs = process.argv.slice(2);
if (myArgs.length && fs.existsSync(myArgs[0])) {
    // Load yaml file using yaml.load 
    var ob = yaml.load(myArgs[0]);


    if (!ob.storage) {
        ob.storage = {};
    }

    if (!ob.operationProfiling) {
        ob.operationProfiling = {};
    }
    ob.operationProfiling.slowOpThresholdMs = 10000;

    if (!ob.net) {
        ob.net = {};
    }
    ob.net.bindIp = "bind-mongodb";

    fs.writeFileSync(myArgs[0], yaml.stringify(ob, 4));
}
