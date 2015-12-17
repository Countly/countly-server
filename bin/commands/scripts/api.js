var manager = require('../../../plugins/pluginManager.js'),
    request = require('request');
    
var myArgs = process.argv.slice(2);

function output(err, body, pretty){
    if(err){
        console.log("Error", err);
    }
    else{
        if(pretty)
            console.log(JSON.stringify(JSON.parse(body), null, 2));
        else
            console.log(body);
    }
    
};

if(myArgs[0] == "pretty"){
    request('http://localhost'+myArgs[1], function (error, response, body) {output(error, body, true);});
}
else{
    request('http://localhost'+myArgs[0], function (error, response, body) {output(error, body);});
}