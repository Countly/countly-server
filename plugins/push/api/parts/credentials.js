'use strict';

const log = require('../../../../api/utils/log.js')('push:credentials'),
	  Platform = require('./note.js').Platform,
	  forge = require('node-forge');

const DB_MAP = {
	'messaging-enabled': 'm'
};

const DB_USER_MAP = {
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

const CRED_TYPE = {
	[Platform.APNS]: {
		UNIVERSAL: 'apn_universal',
		TOKEN: 'apn_p8',
		DEV: 'apn_dev',
		PROD: 'apn_prod',
	},

	[Platform.GCM]: {
		GCM: 'gcm'
	}
};

class Credentials {
	constructor (cid) {
		if (!(this instanceof Credentials)) { return new Credentials(cid); }
		this._id = cid;
		// properties loaded from db object:
		// 		this.platform = Platform.APNS
		// 		this.type = one of CRED_TYPE[this.platform]

		// 		this.key = '' 		// base64 of APN P12 / P8 or GCM key
		// 		this.secret = '' 	// passphrase
	}

	toJSON () {
		return {
			_id: this._id,
			platform: this.platform,
			type: this.type
		};
	}

	divide (test) { 
		log.d('Dividing %j, test %j', this, test);
		var CT = CRED_TYPE[this.platform];
		if (this.platform === Platform.APNS) {
			if (test === false) {
				return [CT.UNIVERSAL, CT.TOKEN, CT.PROD].indexOf(this.type) === -1 ? 
					[] 
					: [new SubCredentials(this, DB_USER_MAP.apn_prod, false)];
			} else if (test === true) {
				if ([CT.UNIVERSAL, CT.TOKEN].indexOf(this.type) !== -1) {
					return [new SubCredentials(this, DB_USER_MAP.apn_dev, true), new SubCredentials(this, DB_USER_MAP.apn_adhoc, true)];
				} else if (this.type === CT.DEV) {
					return [new SubCredentials(this, DB_USER_MAP.apn_dev, true)];
				} else {
					return [];
				}
			}
		} else if (this.platform === Platform.GCM) {
			if (test === false) {
				return [new SubCredentials(this, DB_USER_MAP.gcm_prod, false)];
			} else if (test === true) {
				return [new SubCredentials(this, DB_USER_MAP.gcm_test, false)];
			}
		}
		return [];
	}

	sub (field, test) {
		return new SubCredentials(this, field, test);
	}

	load (db) {
		if (typeof this._id === 'string') { this._id = db.ObjectID(this._id); }
		log.d('loading credentials %j', this._id);
		return new Promise((resolve, reject) => {
			db.collection('credentials').findOne(this._id, (err, data) => {
				if (err || !data) { reject(err || 'Credentials ' + this._id + ' not found'); }
				else { 
					log.d('loaded credentials %j', this._id);
					for (let key in data) { 
						this[key] = data[key]; 
					}

					try {
						if (this.platform === Platform.APNS && this.type !== CRED_TYPE[Platform.APNS].TOKEN) {
								var buffer = forge.util.decode64(this.key),
									asn1 = forge.asn1.fromDer(buffer),
									p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, this.secret || null),
									dev = false, prod = false, topics = [];

								p12.safeContents.forEach(safeContents => {
									safeContents.safeBags.forEach(safeBag => {
										if (safeBag.cert) {
											var title = safeBag.cert.subject.getField({type: '2.5.4.3'});
											if (title) { 
												this.title = title.value;
											}

											if (safeBag.cert.getExtension({id: "1.2.840.113635.100.6.3.1"})) {
												dev = true;
											}

											if (safeBag.cert.getExtension({id: "1.2.840.113635.100.6.3.2"})) {
												prod = true;
											}

											var tpks = safeBag.cert.getExtension({id: '1.2.840.113635.100.6.3.6'});
											if (tpks) {
												tpks = tpks.value.replace(/0[\x00-\x1f\(\)!]/gi, '')
																	.replace('\f\f', '\f')
																	.split('\f')
																	.map(s => s.replace(/[\x00-\x1f\(\)!,"$]/gi, '').trim());
												tpks.shift();

												for (var i = 0; i < tpks.length; i++) {
													for (var j = 0; j < tpks.length; j++) {
														if (i !== j && tpks[j].indexOf(tpks[i]) === 0) {
															if (topics.indexOf(tpks[i]) === -1) {
																topics.push(tpks[i]);
															}
															if (topics.indexOf(tpks[j]) === -1) {
																topics.push(tpks[j]);
															}
														}
													}
												}
											}
										}
									});
								});

								topics.sort((a, b) => a.length - b.length);

								this.bundle = topics.length > 0 ? topics[0] : this.title.split(' ').pop();
								this.topics = topics;
								// this.certificate = buffer;

								log.d('final topics %j, bundle %j', this.topics, this.bundle);
						}
					} catch (e) {
						log.e('Error while parsing certificate: %j', e);
						reject(e);
					}
					resolve();
				}
			});
		});
	}
}

class SubCredentials extends Credentials {
	constructor (credentials, field, test) {
		super(credentials._id);
		log.d('constructing sub from %j / %j / %j', credentials, field, test);
		for (var k in credentials) { 
			this[k] = credentials[k];
		}

		this.field = field || credentials.field;
		this.test = test || credentials.test;

		if (this.platform === Platform.APNS) {
			if (this.field === DB_USER_MAP.apn_dev || 
				(this.test && this.field === DB_USER_MAP.apn_adhoc)) {
				this.host = 'api.development.push.apple.com';
				this.port = 443;
			} else if (this.field === DB_USER_MAP.apn_prod) {
				this.host = 'api.push.apple.com';
				this.port = 443;
			} else {
				throw new Error('Unsupported field ' + this.field);
			}
		} else if (this.platform === Platform.GCM) {
			this.host = 'android.googleapis.com';
			this.port = 443;
		} else {
			throw new Error('Unsupported field / platform combination: ' + this.field + ' / ' + this.platform);
		}
		log.d('created SubCredentials %j', this);
	}

	get id () { return this._id + ':' + this.field + ':' + this.host; }

	app (app_id, app_timezone) {
		return new AppSubCredentials(this, app_id, app_timezone);
	}

	toJSON () {
		var json = super.toJSON();
		json.field = this.field;
		json.test = this.test;
		json.host = this.host;
		json.port = this.port;
		return json;
	}
}

class AppSubCredentials extends SubCredentials {
	constructor (subcredentials, app_id, app_timezone) {
		super(subcredentials, subcredentials.field, subcredentials.test);
		// || for a case when constructor is called with single json parameter
		this.app_id = app_id || subcredentials.app_id;
		this.app_timezone = app_timezone || subcredentials.app_timezone;
	}

	get id () { return this.app_id + '::' + this._id + ':' + this.field + ':' + this.host; }

	toJSON () {
		var json = super.toJSON();
		json.app_id = this.app_id;
		json.app_timezone = this.app_timezone;
		return json;
	}
}


module.exports = {
	Credentials: Credentials,
	AppSubCredentials: AppSubCredentials,
	CRED_TYPE: CRED_TYPE,
	DB_MAP: DB_MAP,
	DB_USER_MAP: DB_USER_MAP
};
