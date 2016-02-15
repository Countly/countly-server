'use strict';

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	Err = require('./error.js'),
	constants = require('./constants'),
	EVENTS = constants.SP,
	log,
	Dequeue = require('dequeue'),
	_ = require('underscore');

var HTTP = function(options, logger, loopSmoother){
	log = logger;

	this.options = options;

	// Buffer for ready to send notifications [uint32 notification id, device, data]
	this.notifications = new Dequeue();

	this.currentId = 0;

	this.initialized = true;

	this.notesInFlight = 0;

	this.loopSmoother = loopSmoother;

	this.currentTransmitAtOnce = this.options.transmitAtOnce;

	EventEmitter.call(this);
};
util.inherits(HTTP, EventEmitter);

// Helper methods to remind notification object indexes
var noteDevice = HTTP.prototype.noteDevice = function(note){ return note ? note[0] : undefined; };
var noteData = HTTP.prototype.noteData = function(note){ return note ? note[1] : undefined; };
var noteMessageId = HTTP.prototype.noteMessageId = function(note){ return note ? note[2] : undefined; };
HTTP.prototype.noteExpiry = function(note){ return note ? note[3] : undefined; };

/**
 * @private
 */
HTTP.prototype.serviceImmediate = function() {
	if (!this.servicingImmediate) {
		this.servicingImmediate = true;
		setImmediate(function(){
			this.servicingImmediate = false;
			this.service();
		}.bind(this));
	}
};

/**
 * @private
 */
HTTP.prototype.service = function() {
	// Socket is ready to go, send notification
	if (this.closed ) {
		return log.d('Already closed, doing nothing');
	} else if (!this.initialized) {
		return log.d('Not initialized, won\'t service');
	} else if (this.loopSmoother.value > this.options.eventLoopDelayToThrottleDown) {
		this.throttledDown = true;
		return log.d('Freeing event loop, %dms is more than %d', this.loopSmoother.value, this.options.eventLoopDelayToThrottleDown);
	}
	this.throttledDown = false;
	if (this.notifications.length && this.notesInFlight < this.options.maxRequestsInFlight) {
		var notification = this.notifications.shift(), merged = 1;
		while (this.notifications.length > 0 && merged < this.currentTransmitAtOnce && (merged + this.notesInFlight) < this.options.maxRequestsInFlight) {
			var next = this.notifications.shift();
			// log.d('next is %j, %j, %j', next[0], next[1], next[2]);
			if (noteMessageId(notification) === noteMessageId(next) && _.isEqual(noteData(notification), noteData(next))) {
				// log.d('merging');
				for (var i = 0; i < noteDevice(next).length; i++) {
					merged++;
					noteDevice(notification).push(noteDevice(next)[i]);
				}
			} else {
				this.notifications.unshift(next);
				break;
			}
		}
		// if (merged > 1) {
			// log.d('merged %d, %d left to send', merged, this.notifications.length);
		// }
		this.request(notification);
	}
};

/**
 * Handle a particular error type: either just emit it, or remove a message from queue completely
 * @private
 */
HTTP.prototype.handlerr = function (note, code, name, messageId, deviceTokens, credentialsId) {
	var err = new Err(code, name, messageId, deviceTokens), que = new Dequeue(), notification, id = noteMessageId(note);
	err.credentialsId = credentialsId;

	if (code === Err.TOKEN) {
		this.emit(EVENTS.ERROR, err);
		this.serviceImmediate();
	} else if (code & Err.IS_RECOVERABLE) {
		log.d('Handling error code %d (recoverable), name %j for note %j, message ID %j, device token %j, credentialsId %j', code, name, note, messageId, deviceTokens, credentialsId);
		this.notifications.unshift(note);
		this.emit(EVENTS.ERROR, err);
		this.serviceImmediate();
	} else if (code & Err.IS_NON_RECOVERABLE) {
		log.d('Handling error code %d (non-recoverable), name %j for note %j, message ID %j, device token %j, credentialsId %j', code, name, note, messageId, deviceTokens, credentialsId);
		this.emit(EVENTS.ERROR, err);
		while (this.notifications.length) {
			notification = this.notifications.shift();
			if (noteMessageId(notification) !== id) {
				que.push(notification);
			}
		}
		this.notifications = que;
		this.emit(EVENTS.ERROR, err);
		this.serviceImmediate();
	}
};

/**
 * @private
 */
HTTP.prototype.onRequestDone = function(/*note, code, data*/) {
	throw new Error('onRequestDone() must be overridden');
};

/**
 * @private
 */
HTTP.prototype.request = function(/*note, callback*/) {
	throw new Error('request() must be overridden');
};

HTTP.prototype.onRequestSocket = function(note, socket) {
	this.socket = socket;
};

HTTP.prototype.onRequestError = function(note, err) {
    this.notesInFlight -= noteDevice(note).length;
	log.d('socket error %j', err);
	this.handlerr(note, Err.CONNECTION, err);
};

/**
 * Stop accepting new messages and close socket whenever all are sent
 */
HTTP.prototype.close = function (clb) {
	if (this.closed) {
		return clb ? clb() : undefined;
	}
	this.closed = true;
	this.waitAndClose(clb);
};

HTTP.prototype.waitAndClose = function(clb) {
	if (this.notesInFlight <= 0 || this.closeAttempts > 30) {
		log.d('Finally closing this connection (%d notes in flight)', this.notesInFlight);
		if (this.socket) {
			this.socket.emit('agentRemove');
		}
		if (this.agent && this.agent.destroy) {
			this.agent.destroy();
		} else if (this.agent && this.agent.endpoints) {
			for (var k in this.agent.endpoints) {
				if (this.agent.endpoints[k]) {
					log.d('Closing endpoint %j', k);
					this.agent.endpoints[k].close();
					delete this.agent.endpoints[k];
				}
			}
		}

		if (clb) {
			var arr = [];
			while (this.notifications.length) {
				arr.push(this.notifications.shift());
			}
			setTimeout(clb.bind(null, arr.length ? arr : undefined), 10);
		}
		this.emit(EVENTS.CLOSED);
	} else {
		log.d('Not emiting closed event yet - %d notes are in flight', this.notesInFlight);
		this.closeAttempts = this.closeAttempts ? ++this.closeAttempts : 1;
		setTimeout(this.waitAndClose.bind(this), 1000);
	}
};

/**
 * Remove all notifications for a particular message
 */
HTTP.prototype.abort = function (message) {
	var que = new Dequeue(), notification;
	while (this.notifications.length) {
		notification = this.notifications.shift();
		if (noteMessageId(notification) !== message.id) {
			que.push(notification);
		}
	}
	log.d('Left %d out of %d notifications in queue due to message abort', this.notifications.length, this.notifications.length + que.length);
	this.notifications = que;
	this.serviceImmediate();
};

/**
 * Whether this connection is not full of unsent messages
 */
HTTP.prototype.free = function () {
	return this.notifications.length < this.options.queue;
};

/**
 * Queue a message for delivery to recipients
 * @param {String} content Compiled according to Apple guidelines message to send.
 * @param {String} encoding Encoding of message. Defaults to 'utf8', @see message.js.
 * @param {Date} expiry Expiry time of message. Defaults to 1 week from message creation, @see message.js.
 * @param {String} device String with device token.
 */
HTTP.prototype.send = function (messageId, content, encoding, expiry, device, locale) {
	if (!this.free() || this.closed) {
		log.d('Attempt to send a message on closed http connection');
		return -1;
	} else if (this.initializationError) {
		log.d('Attempt to send a message on not-initialized http connection');
		this.handlerr([device, content, messageId, expiry], this.initializationError.code, this.initializationError.message, messageId);
		return -1;
	}

	if (typeof content === 'string' || (content.time_to_live && content.data)) {
		// do nothing, because it's a final message content, no locale required
	} else if (locale) {
		if (content[locale]) {
			content = content[locale];
		} else if (content['default']) {
			content = content['default'];
		} else {
			this.handlerr([device, content, messageId], Err.MESSAGE, 'No default locale in localized message', messageId);
			return -1;
		}
	} else {
		if (content['default']) {
			content = content['default'];
		} else {
			this.handlerr([device, content, messageId], Err.MESSAGE, 'No locale provided for device when sending localized message', messageId);
			return -1;
		}
	}

  	if (!util.isArray(device)) {
		device = [device];
	}
	
	this.add(device, content, messageId, expiry);

	this.serviceImmediate();

	return 0;
};

HTTP.prototype.add = function (device, content, messageId, expiry) {
	// log.d('Adding into queue: %j', [device, content, messageId, expiry]);
	this.notifications.push([device, content, messageId, expiry]);
};

module.exports = HTTP;
