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
	spdy = require('spdy'),
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

var certificates;

var APN = function(options, loopSmoother, idx){
	if (false === (this instanceof APN)) {
		return new APN(options, loopSmoother, idx);
	}

	HTTP.call(this, merge({}, DEFAULTS.apn, options), log, loopSmoother);

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

	this.idx = idx;
	this.agent = new spdy.createAgent({
		host: this.options.gateway,
		port: this.options.port,
		pfx: this.certificate.pfx,
		passphrase: this.certificate.passphrase,
		spdy: {
			protocols: ['h2']
		}
	});
	this.agent.once('error', function(err){
		log.w('!!!!!!!!!!!!!!!!!! APN connection error: %j', arguments);
		this.emit(EVENTS.ERROR, new Err(Err.CONNECTION, err));
		this.agent.destroy();
	}.bind(this));
	this.agent.setMaxListeners(0);
};
util.inherits(APN, HTTP);

/**
 * @private
 */
APN.prototype.onRequestDone = function(response, note, device, data) {
    this.notesInFlight -= 1;
	
	if (data && typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch(e) { 
			log.d('error while parsing data %j: ', data); 
		}
	}

	this.emit(EVENTS.MESSAGE, this.noteMessageId(note), 1);

	var code = response.statusCode,
		reason = (data && data.reason ? data.reason : undefined) || (response && response.headers && response.headers.reason ? response.headers.reason : undefined),
		combined = ((code || '') + ' ' + (reason || '')).trim();

	if (code >= 500) {
		log.w('APN unavailable', code, response.headers, data);
		this.handlerr(note, Err.CONNECTION, code + ': Service unavailable');
	} else if (APN_ERRORS[reason] === Err.CREDENTIALS || code === 401 || code === 403) {
		clearFromCredentials(this.options.key);
		this.handlerr(note, APN_ERRORS[reason] || Err.CREDENTIALS, combined + ': Unauthorized', this.noteMessageId(note));
	} else if (APN_ERRORS[reason]) {
		this.handlerr(note, APN_ERRORS[reason], combined, this.noteMessageId(note), APN_ERRORS[reason] === Err.TOKEN ? [{bad: device}] : undefined);
	} else if (code === 400 || code === 413) {
		log.w('APN Bad message', code, response.headers, data);
		this.handlerr(note, Err.MESSAGE, combined + ': Bad message', this.noteMessageId(note));
	} else if (code === 410) {
		this.handlerr(note, Err.TOKEN, combined + ': Invalid token', this.noteMessageId(note), [{bad: device}]);
	} else if (code === 429) {
		log.w('APN Too many requests', code, response.headers, data);
		this.handlerr(note,Err.CONNECTION, combined + ': Too many requests for single device', this.noteMessageId(note));
	} else if (code !== 200 || reason) {
		log.w('Received unexpected response from APN: %j / %j, %j / %j', code, reason, response.headers, data);
		this.handlerr(note, APN_ERRORS[reason] || Err.ILLEGAL_STATE, 'Bad response ' + combined);
	} else {
		this.serviceImmediate();
	}
};

APN.prototype.onRequestError = function(note, device, err) {
    this.notesInFlight -= 1;

    var idx = note[0].indexOf(device);
    if (idx !== -1) {
	    note[0].splice(idx, 1);
    }

    var failed = note.slice(0);
    failed[0] = [device];

	log.d('socket error %j', err);
	this.handlerr(failed, Err.CONNECTION, err);
};

/**
 * @private
 */
APN.prototype.request = function(note) {
	var devices = this.noteDevice(note), content = this.noteData(note), expiry = this.noteExpiry(note);

    this.notesInFlight += devices.length;

    log.d('%j: Requesting %d, total notesInFlight is %d out of %d', this.idx, devices.length, this.notesInFlight, this.currentTransmitAtOnce);

	var headers = {
		'apns-expiration': Math.floor(expiry.getTime() / 1000),
		'apns-priority': 10,
	};

	if (this.certificate.topics.length > 1 && this.certificate.bundle) {
		headers['apns-topic'] = this.certificate.bundle;
	}

	var options = {
		hostname: this.options.gateway,
		port: this.options.port,
		method: 'POST',
		headers: headers,
		agent: this.agent,
	};

	devices.forEach(device => {
		options.path = '/3/device/' + device[1];

		var request = require('https').request(options, (res) => {
			var data = '';
			res.on('data', d => {
	            data += d;
			});
	        res.on('end', () => {
	        	// log.d('response ended');
				if (!res.onRequestDone) {
					res.onRequestDone = true;
					this.onRequestDone(res, note, device, data);
				}
	        });
	        res.on('close', () => {
	        	// log.d('response closed');
				if (!res.onRequestDone) {
					res.onRequestDone = true;
					this.onRequestDone(res, note, device, data);
				}
	        });
		});
		request.on('error', this.onRequestError.bind(this, note, device));
		request.write(content);
		request.end();
	});
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

