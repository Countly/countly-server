var pluginManager = require('../pluginManager.js');
var countlyDb = pluginManager.dbConnection();

console.log("Installing systemlogs plugin");


function done(){
	console.log("Systemlogs plugin installation finished");
	countlyDb.close();
}

console.log("Adding systemlogs indexes");
var cnt = 0;
function cb(){
	cnt++;
	if(cnt == 3)
		done();
}

countlyDb.collection('systemlogs').ensureIndex({"ts":1},cb);
countlyDb.collection('systemlogs').ensureIndex({"user_id":1},cb);
countlyDb.collection('systemlogs').ensureIndex({"app_id":1},cb);