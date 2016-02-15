'use strict';

var fs = require('fs'),
	path = require('path'),
	async = require('async'),
	pluginManager = require('../pluginManager.js'),
	db = pluginManager.dbConnection();

console.log('Installing push plugin');

console.log('Creating certificates directory');
var dir = path.resolve(__dirname, '');
fs.mkdir(dir+'/../../frontend/express/certificates', function(){});

console.log('Adding messages indexes');
db.collection('messages').ensureIndex({'apps': 1, deleted: 1}, function(){
	
	console.log('Adding token indexes... It can take a few minutes.');
	db.collection('apps').find({}).toArray(function(err, apps){
		if (err || !apps) {
			return db.close();
		}

		function upgrade(app, done){
			var cnt = 0;
			console.log('Adding push token indexes to ' + app.name);
			function cb(){
				cnt++;
				if (cnt == 2) {
					done();
				}
			}        
			db.collection('app_users' + app._id).ensureIndex({'tk.ip': 1}, {sparse: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tk.ap': 1}, {sparse: true}, cb);
		}

		async.forEach(apps, upgrade, function(){
			console.log('Push plugin installation finished');
			db.close();
		});

	});

});

