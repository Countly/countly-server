'use strict';

var util = require('util'),
	HTTP = require('./http.js'),
	merge = require('merge'),
	Err = require('./error.js'),
	constants = require('./constants'),
	DEFAULTS = constants.OPTIONS,
	EVENTS = constants.SP,
	log = require('../../../../../api/utils/log.js')('push:gcm'),
	https = require('https');

var GCM = function(options, loopSmoother, idx){
	if (false === (this instanceof GCM)) {
        return new GCM(options, loopSmoother, idx);
    }

	HTTP.call(this, merge({}, DEFAULTS.gcm, options), log, loopSmoother);

    this.idx = idx;
    this.requesting = false;
};
util.inherits(GCM, HTTP);

/**
 * @private
 */
GCM.prototype.onRequestDone = function(response, note, devices, data) {
	var code = response.statusCode;

    this.notesInFlight -= this.noteDevice(note).length;

    this.emit(EVENTS.MESSAGE, this.noteMessageId(note), devices.length);

	if (code >= 500) {
        log.w('GCM Unavailable', code, data);
		this.handlerr(note, Err.CONNECTION, 'GCM Unavailable');
    } else if (code === 401) {
		this.handlerr(note, Err.CREDENTIALS, 'GCM Unauthorized', this.noteMessageId(note));
    } else if (code === 400) {
        log.w('GCM Bad message', code, data);
		this.handlerr(note, Err.MESSAGE, 'GCM Bad message', this.noteMessageId(note));
    } else if (code !== 200) {
        log.w('GCM Bad response code', code, data);
		this.handlerr(note, Err.CONNECTION, 'GCM Bad response code ' + code);
    } else {
    	try {
            if (data && data[0] === '"' && data[data.length - 1] === '"') {
                data = data.substr(1, data.length - 2);
                log.d('GCM replaced quotes: %j', data);
            }
            var obj = JSON.parse(data);
            if (obj.failure === 0 && obj.canonical_ids === 0) {
                // this.emit(EVENTS.MESSAGE, noteMessageId(note), noteDevice(note).length);
            } else if (obj.results) {
            	var resend = [], devicesWithInvalidTokens = [], devicesWithBadCredentials = [], validDevices = [], i, device, oldDevices = devices;

                for (i in obj.results) {
                    var result = obj.results[i];
                    device = oldDevices[i];

                    if (result.message_id) {
                    	if (result.registration_id) {
	                    	devicesWithInvalidTokens.push({bad: device, good: result.registration_id});
                    	}
                    	validDevices.push(device);
                    } else if (result.error === 'MessageTooBig') {
	                	this.handlerr(note, Err.MESSAGE, 'GCM Message Too Big', this.noteMessageId(note), devicesWithBadCredentials);
	                	return;
                    } else if (result.error === 'InvalidDataKey') {
	                	this.handlerr(note, Err.MESSAGE, 'Invalid Data Key: ' + data, this.noteMessageId(note));
	                	return;
                    } else if (result.error === 'InvalidTtl') {
	                	this.handlerr(note, Err.MESSAGE, 'Invalid Time To Live: ' + data, this.noteMessageId(note));
	                	return;
                    } else if (result.error === 'InvalidTtl') {
	                	this.handlerr(note, Err.MESSAGE, 'Invalid Time To Live: ' + data, this.noteMessageId(note));
	                	return;
                    } else if (result.error === 'InvalidPackageName') {
	                	this.handlerr(note, Err.MESSAGE, 'Invalid Package Name: ' + data, this.noteMessageId(note));
	                	return;
                    } else if (result.error === 'Unavailable' || result.error === 'InternalServerError') {
                    	resend.push(device);
                    } else if (result.error === 'MismatchSenderId') {
                        devicesWithInvalidTokens.push({bad: device});
                    	// devicesWithBadCredentials.push(device);
                    } else if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
                    	devicesWithInvalidTokens.push({bad: device});
                    } else if (result.error) {
                    	devicesWithInvalidTokens.push({bad: device});
                    }
                }


                if (devicesWithInvalidTokens.length) {
					this.handlerr(note, Err.TOKEN, 'GCM Invalid tokens', this.noteMessageId(note), devicesWithInvalidTokens);
                }

                if (validDevices.length) {
	                // this.emit(EVENTS.MESSAGE, noteMessageId(note), validDevices.length);
                }

                if (devicesWithBadCredentials.length) {
                	this.handlerr(note, Err.CREDENTIALS, 'GCM Mismatched Sender', this.noteMessageId(note), devicesWithBadCredentials);
                } else if (resend.length) {
                	note[0] = resend;
					this.handlerr(note, Err.CONNECTION, 'GCM Unavailable');
                }
            }
			this.serviceImmediate();
    	} catch (e) {
            log.w('Bad response from GCM: %j / %j / %j', code, data, e);
			this.handlerr(note, Err.CONNECTION, e, this.noteMessageId(note));
    	}
	}
};

/**
 * @private
 */
GCM.prototype.request = function(note) {
	var devices = this.noteDevice(note), content = this.noteData(note);

    this.notesInFlight += devices.length;

    content.registration_ids = devices.map(d => d[1]);
	content = JSON.stringify(content);

    log.d('%j: Requesting %d (%j), total notesInFlight is %d out of %d', this.idx, devices.length, devices, this.notesInFlight, this.currentTransmitAtOnce);

	var options = {
		hostname: 'android.googleapis.com',
		port: 443,
		path: '/gcm/send',
		method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Content-length': Buffer.byteLength(content, 'utf8'),
            'Authorization': 'key=' + this.options.key,
        },
	};

	if (!this.agent) {
		this.agent = new https.Agent(options);
		this.agent.maxSockets = 1;
	}

	options.agent = this.agent;

    this.requesting = true;
	var req = https.request(options, (res) => {
        var data = '';
        res.on('data', d => {
            data += d;
        });
        res.on('end', () => {
            // log.d('response ended');
            if (!res.done) {
                res.done = true;
                this.onRequestDone(res, note, devices, data);
                this.requesting = false;
            }
        });
        res.on('close', () => {
            // log.d('response closed');
            if (!res.done) {
                res.done = true;
                this.onRequestDone(res, note, devices, data);
                this.requesting = false;
            }
        });
    });
    req.on('socket', this.onRequestSocket.bind(this, note));
    req.on('error', this.onRequestError.bind(this, note));
    req.end(content);

	return req;
};

GCM.prototype.canMakeRequest = function () {
    return !this.requesting;
};

GCM.prototype.add = function (device, content, messageId) {
	this.notifications.push([device, content, messageId]);
};

module.exports = GCM;
