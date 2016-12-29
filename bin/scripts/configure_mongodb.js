var yaml = require('yamljs');
var fs = require("fs");
 
var myArgs = process.argv.slice(2);
if(myArgs.length && fs.existsSync(myArgs[0])){
    // Load yaml file using yaml.load 
    var ob = yaml.load(myArgs[0]);
    
    
    if(!ob.storage)
        ob.storage = {};
    
    var path = (ob.storage.dbPath || "/var/lib/mongodb")+"/WiredTiger";
    if (!fs.existsSync(path)) {
        ob.storage.engine = "mmapv1";
    }
    
    if(!ob.operationProfiling)
        ob.operationProfiling = {};
    ob.operationProfiling.slowOpThresholdMs = 10000;
    
    if(!ob.net)
        ob.net = {};
    ob.net.bindIp = "127.0.0.1";
    
    fs.writeFileSync(myArgs[0], yaml.stringify(ob, 4));
}