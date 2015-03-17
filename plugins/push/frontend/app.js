'use strict';

var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	apiConfig = require('../../../api/config'),
	fs = require('fs'),
	request = require('request');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.post(countlyConfig.path+'/apps/certificate', function (req, res) {
			if (!req.files.apns_cert) {
				res.end();
				return true;
			}

			var endpoints = require('../api/parts/pushly/endpoints.js'),
				tmp_path = req.files.apns_cert.path,
				file_name = endpoints.APNCertificateFile(req.body.app_id, req.body.test),
				target_path = endpoints.APNCertificatePath(req.body.app_id, req.body.test),
				type = req.files.apns_cert.type;

			console.log(target_path);

			if (type != 'application/x-pkcs12') {
				fs.unlink(tmp_path, function () {});
				res.send({error: 'Only .p12 files are supported'});
				return true;
			}

			fs.rename(tmp_path, target_path, function (err) {
				if (err) {
					console.log(err);
					res.send({error: 'Server error: cannot save file'});
				} else {
					var update = {$set:{}};
					if (req.body.test) {
						update.$set['apn.test'] = {key: file_name, passphrase: req.body.passphrase};
					} else {
						update.$set['apn.prod'] = {key: file_name, passphrase: req.body.passphrase};
					}

					countlyDb.collection('apps').findAndModify({_id: countlyDb.ObjectID(req.body.app_id)}, [['_id', 1]], update, {new:true}, function(err, app){
						if (err || !app) res.send({error: 'Server error: cannot find app'});
						else {
							fs.unlink(tmp_path, function () {});

							var options = {
								uri: 'http://' + apiConfig.api.host + ':' + apiConfig.api.port + '/i/pushes/check',
								method: 'GET',
								timeout: 20000,
								qs: {
									'appId': req.body.app_id,
									'platform': 'i',
									'test': (req.body.test ? true : false),
									'api_key': req.body.api_key
								}
							};

							console.log('Executing request: %j', options);

							request(options, function (error, response, body) {
								if (error || !body) {
									console.log('Error when checking app: %j, %j', error, body);
									res.send({error: 'Couldn\'t check certificate validity'});
								} else {
									try {
										body = JSON.parse(body);
										if (body.ok) {
											res.send({key: file_name, passphrase: req.body.passphrase});
										} else {
											res.send({error: 'Invalid certificate and/or passphrase'});
										}
									} catch(e) {
										res.send({error: 'Server error: bad response from API'});
									}
								}
							});
						}
					});
				}
			});
		});
	};
}(plugin));

module.exports = plugin;