'use strict';

const merge = require('merge'),
	  fs = require('fs'),
	  log = require('../../../../api/utils/log.js')('push:p12'),
	  Platform = require('./pushly.js').Platform,
	  forge = require('node-forge');

let DB_MAP = {
	'messaging-enabled': 'm'
};

let DB_USER_MAP = {
	'tokens': 'tk',
	'apn_prod': 'ip',                   // production
	'apn_0': 'ip',                      // production
	'apn_dev': 'id',                    // development
	'apn_1': 'id',                      // development
	'apn_adhoc': 'ia',                  // ad hoc
	'apn_2': 'ia',                      // ad hoc
	'gcm_prod': 'ap',                   // production
	'gcm_0': 'ap',                      // production
	'gcm_test': 'at',                   // testing
	'gcm_2': 'at',                      // testing
	'messages': 'msgs'                  // messages sent
};

let credentials = function(message, app) {
	var array = [];
	for (var i = message.platforms.length - 1; i >= 0; i--) {
		var platform = message.platforms[i];

		if (platform == Platform.APNS) {
			if (message.test) {
				if (app.apn && app.apn.universal) {
					array.push({
						id: DB_USER_MAP.apn_dev + '.' + app._id,
						platform: Platform.APNS,
						platformId: app.apn.id,
						key: APNCertificatePath(app._id.toString()),
						passphrase: app.apn.universal.passphrase,
						gateway: 'api.development.push.apple.com',
						port: 443
					});
					array.push({
						id: DB_USER_MAP.apn_adhoc + '.' + app._id,
						platform: Platform.APNS,
						platformId: app.apn.id,
						key: APNCertificatePath(app._id.toString()),
						passphrase: app.apn.universal.passphrase,
						gateway: 'api.push.apple.com',
						port: 443
					});
				} else {
					if (app.apn && app.apn.test) {
						array.push({
							id: DB_USER_MAP.apn_dev + '.' + app._id,
							platform: Platform.APNS,
							platformId: app.apn.id,
							key: APNCertificatePath(app._id.toString(), true),
							passphrase: app.apn.test.passphrase,
							gateway: 'api.development.push.apple.com',
							port: 443
						});
					}
					if (app.apn && app.apn.prod) {
						array.push({
							id: DB_USER_MAP.apn_adhoc + '.' + app._id,
							platform: Platform.APNS,
							platformId: app.apn.id,
							key: APNCertificatePath(app._id.toString(), false),
							passphrase: app.apn.prod.passphrase,
							gateway: 'api.push.apple.com',
							port: 443
						});
					}
				}
			} else {
				if (app.apn && app.apn.universal) {
					array.push({
						id: DB_USER_MAP.apn_prod + '.' + app._id,
						platform: Platform.APNS,
						platformId: app.apn.id,
						key: APNCertificatePath(app._id.toString()),
						passphrase: app.apn.universal.passphrase,
						gateway: 'api.push.apple.com',
						port: 443
					});
				} else if (app.apn && app.apn.prod) {
					array.push({
						id: DB_USER_MAP.apn_prod + '.' + app._id,
						platform: Platform.APNS,
						platformId: app.apn.id,
						key: APNCertificatePath(app._id.toString(), false),
						passphrase: app.apn.prod.passphrase,
						gateway: 'api.push.apple.com',
						port: 443
					});
				}
			}
		} else {
			if (app.gcm) {
				array.push({
					id: (message.test ? DB_USER_MAP.gcm_test : DB_USER_MAP.gcm_prod) + '.' + app._id,
					platform: Platform.GCM,
					platformId: app.gcm.id,
					key: app.gcm.key,
				});
			}
		}
	}
	return array;
};

let APNCertificateFile = function(appId, test) {
    return appId + (typeof test === 'undefined' ? '' : test ? '.test' : '.prod') + '.p12';
};

let APNCertificatePath = function(appId, test) {
	return __dirname + '/../../../../frontend/express/certificates/' + APNCertificateFile(appId, test);
};

let p12 = function(path, password) {
	if (log) { log.d('Reading certificate from %j', path); }

	password = password || undefined;

	var buffer = fs.readFileSync(path),
		asn1 = forge.asn1.fromDer(buffer.toString("binary"), false),
		p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

	var ret = {
		id: path,
		title: undefined,
		key: undefined,
		cert: undefined,
		pfx: buffer,
		passphrase: password,
		topics: [],
		bundle: undefined,
		dev: undefined,
		prod: undefined
	};

	p12.safeContents.forEach(safeContents => {
		safeContents.safeBags.forEach(safeBag => {
			if (safeBag.cert) {
				var title = safeBag.cert.subject.getField({type: '2.5.4.3'});
				if (title) { 
					ret.title = title.value; 
				}
				if (safeBag.cert.getExtension({id: "1.2.840.113635.100.6.3.1"})) {
					ret.dev = true;
				}

				if (safeBag.cert.getExtension({id: "1.2.840.113635.100.6.3.2"})) {
					ret.prod = true;
				}

				var topics = safeBag.cert.getExtension({id: '1.2.840.113635.100.6.3.6'});
				if (topics) {
					topics = topics.value.replace(/0[\x00-\x1f\(\)!]/gi, '')
										.replace('\f\f', '\f')
										.split('\f')
										.map(s => s.replace(/[\x00-\x1f\(\)!,$]/gi, '').trim());
					topics.shift();

					for (var i = 0; i < topics.length; i++) {
						for (var j = 0; j < topics.length; j++) {
							if (i !== j && topics[j].indexOf(topics[i]) === 0) {
								if (ret.topics.indexOf(topics[i]) === -1) {
									ret.topics.push(topics[i]);
								}
								if (ret.topics.indexOf(topics[j]) === -1) {
									ret.topics.push(topics[j]);
								}
								if (!ret.bundle) {
									ret.bundle = topics[i];
								}
							}
						}
					}
				}
			}
		});
	});

	if (ret.title && !ret.bundle) {
		ret.bundle = ret.title.split(' ').pop();
	}

	if (log) { 
		var out = merge({}, ret);
		out.pfx = out.pfx instanceof Buffer ? 'Buffer' : out.pfx;
		log.d('Read certificate from %j: %j', path, out); 
	}

	return ret;
};


module.exports = {
	credentials: credentials,
	p12: p12,
	DB_MAP: DB_MAP,
	DB_USER_MAP: DB_USER_MAP,
	APNCertificatePath: APNCertificatePath,
}