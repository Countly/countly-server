var utils = require('../../../api/utils/utils.js');

var myArgs = process.argv.slice(2);
//check if we have a command
if (myArgs[0]) {
    console.log(utils.encrypt(myArgs[0]));
}
else {
    console.log("No text provided to encrypt");
}