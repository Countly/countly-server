'use strict';

var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	apiConfig = require('../../../api/config'),
	apn = require('../api/parts/lib/apn'),
    common = require('../../../api/utils/common.js'),
    log = common.log('push:api'),
	fs = require('fs'),
	request = require('request');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.post(countlyConfig.path+'/apps/certificate', function (req, res) {
			if (!req.files.apns_cert) {
				res.end();
				return true;
			}

			var endpoints = require('../api/parts/endpoints.js'),
				tmp_path = req.files.apns_cert.path,
				file_name = endpoints.APNCertificateFile(req.body.app_id),
				target_path = endpoints.APNCertificatePath(req.body.app_id),
				type = req.files.apns_cert.type;

			if (type != 'application/x-pkcs12') {
				fs.unlink(tmp_path, function () {});
				res.send({error: 'Only .p12 files are supported'});
				return true;
			} else {
				try { fs.unlinkSync(target_path); } catch (e){}
			}

			try {
				var p12 = apn.readP12(tmp_path);
				if (!p12.dev || !p12.prod) {
					res.send({error: 'Countly now requires universal HTTP/2 certificates. Please see our guide at http://resources.count.ly/docs/countly-sdk-for-ios-and-os-x '});
					return true;
				}
			} catch (e) {
				res.send({error: 'Couldn\'t read certificate'});
				return true;
			}

			var unset = {
				$unset: {
					'apn.universal': 1,
					'apn.test': 1,
					'apn.prod': 1
				}
			};

			countlyDb.collection('apps').findAndModify({_id: countlyDb.ObjectID(req.body.app_id)}, [['_id', 1]], unset, function(err, resp){
				var oldApp = resp ? resp.value : undefined;
				fs.rename(tmp_path, target_path, function (err) {
					if (err) {
						log.e('Cannot rename certificate file', err);
						res.send({error: 'Server error: cannot save file'});
						countlyDb.collection('apps').update({_id: countlyDb.ObjectID(req.body.app_id)}, {$set: {apn: oldApp.apn}}, function(){});
					} else {
						var update = {
							$set: {
								'apn.universal': {key: file_name, passphrase: req.body.passphrase}
							}
						};

						countlyDb.collection('apps').findAndModify({_id: countlyDb.ObjectID(req.body.app_id)}, [['_id', 1]], update, {new:true}, function(err, resp){
                            var app = resp ? resp.value : undefined;
							if (err || !app) {
								res.send({error: 'Server error: cannot find app'});
								countlyDb.collection('apps').update({_id: countlyDb.ObjectID(req.body.app_id)}, {$set: {apn: oldApp.apn}}, function(){});
							} else {
								fs.unlink(tmp_path, function () {});

								var options = {
									uri: 'http://' + apiConfig.api.host + ':' + apiConfig.api.port + '/i/pushes/check',
									method: 'GET',
									timeout: 20000,
									qs: {
										'appId': req.body.app_id,
										'platform': 'i',
										'api_key': req.body.api_key
									}
								};

								request(options, function (error, response, body) {
									if (error || !body) {
										log.e('Error when checking app: %j, %j', error, body);
										try { fs.unlinkSync(target_path); } catch (e){}
										countlyDb.collection('apps').update({_id: countlyDb.ObjectID(req.body.app_id)}, {$set: {apn: oldApp.apn}}, function(){});
										res.send({error: 'Couldn\'t check certificate validity'});
									} else {
										try {
											body = JSON.parse(body);
											if (body.ok) {
												try {
													fs.unlink(endpoints.APNCertificatePath(req.body.app_id, true), function () {});
													fs.unlink(endpoints.APNCertificatePath(req.body.app_id, false), function () {});
												} catch (e) { }
												
												res.send({key: file_name, passphrase: req.body.passphrase});
											} else {
												try { fs.unlinkSync(target_path); } catch (e){}
												countlyDb.collection('apps').update({_id: countlyDb.ObjectID(req.body.app_id)}, unset, function(){});
												res.send({error: 'Invalid certificate and/or passphrase'});
											}
										} catch(e) {
											try { fs.unlinkSync(target_path); } catch (e){}
											countlyDb.collection('apps').update({_id: countlyDb.ObjectID(req.body.app_id)}, unset, function(){});
											res.send({error: 'Server error: bad response from API'});
										}
									}
								});
							}
						});
					}
				});
			});

		});
	};
}(plugin));

module.exports = plugin;