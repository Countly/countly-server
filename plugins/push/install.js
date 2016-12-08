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
				if (cnt == 12) {
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

			if (app.gcm && app.gcm.key) {
				console.log('Moving GCM credentials for ' + app._id + '...');
				db.collection('credentials').insertOne({platform: 'a', type: 'gcm', key: app.gcm.key}, function(err, credentials){
					if (err) {
						console.log('ERROR while moving GCM credentials for ' + app._id + '...', err);
						process.exit(1);
					}
	                credentials = credentials.ops[0];
					db.collection('apps').updateOne({_id: app._id}, {$set: {gcm: [{_id: credentials._id, type: credentials.type}]}}, function(err, updated){
						if (err || !updated || !updated.result || !updated.result.ok) {
							console.log('ERROR 2 while moving GCM credentials for ' + app._id + '...', err);
							process.exit(1);
						}
						console.log('Moved GCM credentials for ' + app._id + ' into ' + credentials._id);
						cb();
					});
				});
			} else if (typeof app.gcm !== 'object' || !app.gcm.length) {
				db.collection('apps').updateOne({_id: app._id}, {$unset: {gcm: 1}}, cb);
			} else {
				cb();
			}

			if (app.apn && app.apn.universal && app.apn.universal.key) {
				console.log('Moving APN universal credentials for ' + app._id + '...');
				var path = __dirname + '/../../frontend/express/certificates/' + app.apn.universal.key;
				fs.readFile(path, function(err, data){
					if (err) { 
						console.log('ERROR: couldn\'t read certificate file from %j: %j', path, err);
						db.collection('apps').updateOne({_id: app._id}, {$unset: {apn: 1}}, cb);
					} else {
						db.collection('credentials').insertOne({platform: 'i', type: 'apn_universal', key: data.toString('base64'), secret: app.apn.universal.passphrase || ''}, function(err, credentials){
							if (err) {
								console.log('ERROR while moving APN credentials for ' + app._id + '...', err);
								process.exit(1);
							}
			                credentials = credentials.ops[0];
							db.collection('apps').updateOne({_id: app._id}, {$set: {apn: [{_id: credentials._id, type: credentials.type}]}}, function(err, updated){
								if (err || !updated || !updated.result || !updated.result.ok) {
									console.log('ERROR 2 while moving APN credentials for ' + app._id + '...', err);
									process.exit(1);
								}
								console.log('Moved APN credentials for ' + app._id + ' into ' + credentials._id);
								cb();
							});
						});
					}
				});
			} else if (typeof app.apn !== 'object' || !app.apn.length) {
				db.collection('apps').updateOne({_id: app._id}, {$unset: {apn: 1}}, cb);
			} else {
				cb();
			}
		}

		async.forEach(apps, upgrade, function(){
			console.log('Push plugin installation finished');
			db.close();
		});

	});

});

