var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	langs = require('../api/utils/langs.js'),
	stringJS = require('../../../frontend/express/node_modules/string');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.get(countlyConfig.path+'/dashboard', function (req, res, next) {
			res.expose({
				languages: langs.languages
            }, 'countlyGlobalLang');
			next();
		});
		app.post(countlyConfig.path+'/apps/certificate', function (req, res, next) {
			if (!req.files.apns_cert) {
				res.end();
				return true;
			}
		
			var endpoints = require('../../api/parts/pushly/endpoints.js'),
				tmp_path = req.files.apns_cert.path,
				file_name = endpoints.APNCertificateFile(req.body.app_id, req.body.test),
				target_path = endpoints.APNCertificatePath(req.body.app_id, req.body.test),
				type = req.files.apns_cert.type;
		
			console.log(target_path);
		
			if (type != "application/x-pkcs12") {
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
									"appId": req.body.app_id,
									"platform": 'i',
									"test": (req.body.test ? true : false),
									"api_key": req.body.api_key
								}
							};
		
							console.log('Executing request: %j', options);
		
							request(options, function (error, response, body) {
								if (error || !body) {
									console.log('Error when checking app: %j, %j', error, body);
									res.send({error: 'Couldn\'t check certificate validity'});
								} else {
									console.log('Response when checking app: %j', body);
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
		
		
							// countlyPush.checkApp(req.body.app_id, 'i', req.body.test, function(err){
							//     if (err) {
							//         res.send(false);
							//     } else {
							//         res.send(file_name);
							//     }
							// });
		
						}
					});
				}
			});
		});
	};
}(plugin));

module.exports = plugin;