var fs = require('fs'),
	path = require("path");

console.log("Installing push plugin");
console.log("Creating certificates directory");
var dir = path.resolve(__dirname, '');
fs.mkdir(dir+'/../../frontend/express/certificates', function(){});
console.log("Push plugin installation finished");