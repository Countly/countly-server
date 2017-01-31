var common = require('../../../api/utils/common.js');
    
var myArgs = process.argv.slice(2);
//check if we have a command
if(myArgs[0]){
    console.log(common.decrypt(myArgs[0]));
}
else
    console.log("No text provided to decrypt");