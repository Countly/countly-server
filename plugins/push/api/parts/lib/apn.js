'use strict';

var util = require('util'),
	merge = require('merge'),
	fs = require('fs'),
	Err = require('./error.js'),
	constants = require('./constants'),
	DEFAULTS = constants.OPTIONS,
	EVENTS = constants.SP,
	log = require('../../../../../api/utils/log.js')('push:apn'),
	LRU = require('lru-cache'),
	http2 = require('http2'),
	HTTP = require('./http.js'),
	forge = require('node-forge');

var APN_ERRORS = {
	PayloadEmpty: Err.MESSAGE,
	PayloadTooLarge: Err.MESSAGE,
	BadTopic: Err.CREDENTIALS,
	TopicDisallowed: Err.CREDENTIALS,
	BadMessageId: Err.MESSAGE,
	BadExpirationDate: Err.MESSAGE,
	BadPriority: Err.MESSAGE,
	MissingDeviceToken: Err.TOKEN,
	BadDeviceToken: Err.TOKEN,
	DeviceTokenNotForTopic: Err.CREDENTIALS,
	Unregistered: Err.TOKEN,
	DuplicateHeaders: Err.ILLEGAL_STATE,
	BadCertificateEnvironment: Err.CREDENTIALS,
	BadCertificate: Err.CREDENTIALS,
	Forbidden: Err.CREDENTIALS,
	BadPath: Err.ILLEGAL_STATE,
	MethodNotAllowed: Err.ILLEGAL_STATE,
	TooManyRequests: Err.CONNECTION,
	IdleTimeout: Err.CONNECTION,
	Shutdown: Err.CONNECTION,
	InternalServerError: Err.CONNECTION,
	ServiceUnavailable: Err.CONNECTION,
	MissingTopic: Err.CREDENTIALS,
};

var readP12 = function(path, password) {
	if (log) { log.d('Reading certificate from %j', path); }

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
					topics = topics.value.replace(/0[\x00-\x1f]/gi, '')
										.replace('\f\f', '\f')
										.split('\f')
										.map(s => s.replace(/[\x00-\x1f]/gi, '').trim());
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

var certificates;

var APN = function(options, profiler, idx){
	if (false === (this instanceof APN)) {
		return new APN(options);
	}

	HTTP.call(this, merge({}, DEFAULTS.apn, options), log);

	if (!certificates) {
		certificates = LRU({
			max: this.options.certificatesCache,
		});
	}

	this.certificate = certificates.get(this.options.key);
	if (!this.certificate) {
		if (typeof this.options.key === 'string') {
			try {
				this.certificate = readP12(this.options.key, this.options.passphrase);
				certificates.set(this.options.key, this.certificate);
			} catch (e) {
				log.w('Error while reading P12: %j', e);
				this.initializationError = {
					code: Err.CREDENTIALS, 
					message: 'Cannot read certificate at ' + this.options.key
				};
				return;
			}
		} else if (this.options.key instanceof Buffer) {
			this.certificate = {
				pfx: this.options.key,
				passphrase: this.options.passphrase
			};
		}
	}

	if (!this.certificate) {
		log.w('No certificate for %j', this.certificate.key);
		this.initializationError = [null, Err.CREDENTIALS, 'Cannot process certificate at ' + this.options.key, null, null, this.options.id];
		return;
	}

	if (this.certificate.topics.length > 1 && !this.certificate.bundle) {
		log.w('No certificate topics for %j', this.certificate.key);
		this.initializationError = [null, Err.CREDENTIALS, 'Cannot process certificate at ' + this.options.key + ', didn\'t find bundle among topics ' + this.certificate.topics, null, null, this.options.id];
		return;
	}

	this.agent = new http2.Agent({
		host: this.options.gateway,
		port: this.options.port,
		pfx: this.certificate.pfx,
		passphrase: this.certificate.passphrase,
		rejectUnauthorized: true,
		endpointKey: this.options.gateway + ':' + this.certificate.id + ':' + idx
	});
};
util.inherits(APN, HTTP);

/**
 * @private
 */
APN.prototype.onRequestDone = function(note, response, data) {
	if (data && typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch(e) { 
			log.d('error while parsing data %j: ', data); 
		}
	}

	var code = response.statusCode,
		reason = (data && data.reason ? data.reason : undefined) || (response && response.headers && response.headers.reason ? response.headers.reason : undefined),
		combined = ((code || '') + ' ' + (reason || '')).trim();

	this.emit(EVENTS.MESSAGE, this.noteMessageId(note), 1);

	if (code >= 500) {
		log.w('APN unavailable', code, response.headers, data);
		this.handlerr(note, Err.CONNECTION, code + ': Service unavailable');
	} else if (APN_ERRORS[reason] === Err.CREDENTIALS || code === 401 || code === 403) {
		clearFromCredentials(this.options.key);
		this.handlerr(note, APN_ERRORS[reason] || Err.CREDENTIALS, combined + ': Unauthorized', this.noteMessageId(note));
	} else if (APN_ERRORS[reason]) {
		this.handlerr(note, APN_ERRORS[reason], combined, this.noteMessageId(note), APN_ERRORS[reason] === Err.TOKEN ? [{bad: this.noteDevice(note)}] : undefined);
	} else if (code === 400 || code === 413) {
		log.w('APN Bad message', code, response.headers, data);
		this.handlerr(note, Err.MESSAGE, combined + ': Bad message', this.noteMessageId(note));
	} else if (code === 410) {
		this.handlerr(note, Err.TOKEN, combined + ': Invalid token', this.noteMessageId(note), [{bad: this.noteDevice(note)}]);
	} else if (code === 429) {
		log.w('APN Too many requests', code, response.headers, data);
		this.handlerr(note,Err.CONNECTION, combined + ': Too many requests for single device', this.noteMessageId(note));
	} else if (code !== 200 || reason) {
		log.w('Received unexpected response from APN: %j / %j, %j / %j', code, reason, response.headers, data);
		this.handlerr(note, APN_ERRORS[reason] || Err.ILLEGAL_STATE, 'Bad response ' + combined);
	} else {
		this.requesting = false;
		this.serviceImmediate();
	}
};

/**
 * @private
 */
APN.prototype.request = function(note, callback) {
	var device = this.noteDevice(note), content = this.noteData(note), expiry = this.noteExpiry(note);

	var headers = {
		'apns-expiration': Math.floor(expiry.getTime() / 1000),
		'apns-priority': 10,
	};

	if (this.certificate.topics.length > 1 && this.certificate.bundle) {
		headers['apns-topic'] = this.certificate.bundle;
	}

	var options = {
		host: this.options.gateway,
		port: this.options.port,
		path: '/3/device/' + device,
		method: 'POST',
		headers: headers,
	};

	// log.d('Constructing request %j / %j', options, content);

	var request = this.agent.request(options, callback);

	request.end(content);

	return request;
};

var clearFromCredentials = function(key) {
	if (certificates) {
		if (log) { log.d('clearFromCredentials %j / %j', key, certificates.keys()); }
		certificates.del(key);
	}
};

module.exports = APN;
module.exports.readP12 = readP12;
module.exports.clearFromCredentials = clearFromCredentials;

