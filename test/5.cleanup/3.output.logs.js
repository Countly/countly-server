fs = require('fs');
console.log("Output Logs:");
fs.readFile('../../log/countly-dashboard.log', 'utf8', function (err,data) {
	console.log("countly-dashboard.log");
	if (err) {
		return console.log(err);
	}
	console.log(data);
});

fs.readFile('../../log/countly-dashboard.log', 'utf8', function (err,data) {
	console.log("countly-api.log");
	if (err) {
		return console.log(err);
	}
	console.log(data);
});