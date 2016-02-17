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
	
	console.log('Adding token indexes... It can take up to several minutes in case you have millions of users.');
	db.collection('apps').find({}).toArray(function(err, apps){
		if (err || !apps) {
			return db.close();
		}

		function upgrade(app, done){
			var cnt = 0;
			console.log('Adding push token indexes to ' + app.name);
			function cb(){
				cnt++;
				if (cnt == 10) {
					done();
				}
			}        
			db.collection('app_users' + app._id).update({'tk.ip': {$exists: true}}, {$set: {tkip: true}}, {multi: true}, cb);
			db.collection('app_users' + app._id).update({'tk.ia': {$exists: true}}, {$set: {tkia: true}}, {multi: true}, cb);
			db.collection('app_users' + app._id).update({'tk.id': {$exists: true}}, {$set: {tkid: true}}, {multi: true}, cb);
			db.collection('app_users' + app._id).update({'tk.ap': {$exists: true}}, {$set: {tkap: true}}, {multi: true}, cb);
			db.collection('app_users' + app._id).update({'tk.at': {$exists: true}}, {$set: {tkat: true}}, {multi: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tkip': 1}, {sparse: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tkia': 1}, {sparse: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tkid': 1}, {sparse: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tkap': 1}, {sparse: true}, cb);
			db.collection('app_users' + app._id).ensureIndex({'tkat': 1}, {sparse: true}, cb);
		}

		async.forEach(apps, upgrade, function(){
			console.log('Push plugin installation finished');
			db.close();
		});

	});

});

