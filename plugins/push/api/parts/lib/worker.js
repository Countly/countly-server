'use strict';

var util = require('util'),
	merge = require('merge'),
	EventEmitter = require('events').EventEmitter,
	Err = require('./error.js'),
	M = require('./message.js'),
	constants = require('./constants'),
	Connection = require('./connection.js'),
	prof = require('./profiler.js'),
	EVENTS = constants.EVENTS,
	SP = constants.SP,
	DEFAULTS = constants.OPTIONS,
	log = require('../../../../../api/utils/log.js')('push:worker'),
	_ = require('lodash');

/**
 * Callbacks:
 * {
 * 		count()
 * }
 */
var PushlyWorker = function(opts, callbacks) {
	this.profiler  = new prof.ProcessProfiler(DEFAULTS.profilerCheckPeriod * 1000);
	this.profiler.close();
	
	this.options   = merge({}, DEFAULTS, opts);
	this.callbacks = callbacks;

	// Connections cache (message.credentialsId() string -> connection)
	this.connections = new Messages();

	// Messages in processing hash {message.id: message}
 	this.messages = new Messages();

	// Last status update time for each message {message.id: timestamp}
 	this.messagesStatusTimes = {};

 	// Queue of messages still not in processing
	this.queue = new Queue();

	// Message results for limiting number of status updates {message.id: last sent message.result}
 	this.results = {};

	// Map of tasks clean up refs: {message.id: setTimeout ref}
	this.cleanUps = {};

	process.on('message', function(m){
		this.profiler.mid = m.mid;
		if (typeof this[m.cmd] === 'function') {
			log.d('IPC message from master: %j', m);
			this[m.cmd](m);
		}
	}.bind(this));

    log.i('Worker started %d', process.pid);
};
util.inherits(PushlyWorker, EventEmitter);

PushlyWorker.prototype.connect = function(message, closeBeforeOpening) {
	log.d('Connect');

	if (closeBeforeOpening && this.connections[message.credentialsId()]) {
		this.connections[message.credentialsId()].close();
		delete this.connections[message.credentialsId()];
	}

	var connection = this.connections[message.credentialsId()];

	if (!connection) {
		if (this.profiler.closed) {
			this.profiler.open();
		}

		connection = new Connection(message.credentials, this.profiler);
		// connection.monitor(1);

		// Notification is sent (one or more tokens)
		connection.on(SP.MESSAGE, function(conn, messageId, size){
            size = size || 1;
			// log.d('Batch sent for message %j: %d notifications', messageId, size);
			if (messageId in this.messages) {
				var msg = this.messages[messageId];

				// If there is a rollback due to token error for APN, cancel message clean up and revert status
				if ((msg.result.status & M.Status.Done) > 0 && size < 0)  {
					msg.result.status &= ~M.Status.Done;
					msg.result.status |= M.Status.InProcessing;
					this.cancelCleanupFromMessageId(messageId);
				}

				msg.result.sent += size;
				msg.result.processed += size;
				this.updateMessage(msg);
			} else {
				log.w('!!!!!!!!!!No message %j in process %d', messageId, process.pid);
			}
		}.bind(this));

		connection.on(SP.ERROR, function(conn, err){
			log.d('Error for message: %j', err);

			if (err.messageId && err.messageId in this.messages) {
				this.updateMessage(this.messages[err.messageId], true, err);
			} else if (err.messageId) {
				log.w('!!!!!!!!!!No message %j in process %d', err.messageId, process.pid);
			}
		}.bind(this));

		connection.on(SP.CLOSED, function(conn){
			log.d('Cluster is closed, aborting all messages');
			var credentialsId;

			for (var k in this.messages) {
				log.d('Aborting message id %j: %j', k, this.messages[k]);

				var m = this.messages[k],
					c = this.connections[m.credentialsId()];

				if (c === conn) {
					if (!(m.result.status & M.Status.Done)) {
						log.d('Aborting message %j because cluster is closed', m.id);
						m.result.status &= ~M.Status.InProcessing;
						m.result.status |= M.Status.Aborted;
						this.updateMessage(m, true);
					}
					credentialsId = m.credentialsId();
				}
			}

			log.d('Cluster is closed, removing cluster %j from connections: %d', conn.credentials.id, this.connections.length);
			this.connections.remove(conn.credentials.id);
			log.d('Cluster is closed, removed cluster %j from connections: %d', conn.credentials.id, this.connections.length);

			if (this.connections.length === 0) {
				this.profiler.close();
			}
		}.bind(this));

		this.connections.add(message.credentialsId(), connection);
	}
	return connection;
};

PushlyWorker.prototype.checkQueue = function(immediate) {
	log.d('Checking queue');
	if (this.messages.length < this.options.connectionsPerCredentials) {
		var next = this.queue.next();
		if (next) {
			this.start(next);
		}
	} else {
		log.d('Queue is full');
	}
	if (!immediate){
		setTimeout(1000, this.checkQueue.bind(this));
	}
};

// var i = 0;
PushlyWorker.prototype.sendToConnection = function(connection, message, content, encoding, expires, device, locale) {
	message.result.total += util.isArray(device) ? device.length : 1;
	return connection.send(message.id, content, encoding, expires, device, locale);
};

PushlyWorker.prototype.startMessageStatusUpdater = function(message) {
	var self = this,
		f = function() {
			if (message.id in self.messages && (message.result.status & (M.Status.Done | M.Status.Aborted)) === 0) {
				self.updateMessage(message);
				setTimeout(f, self.options.statusUpdatePeriod);
			}
		};
	f();
};

PushlyWorker.prototype.start = function(message) {
	log.d('Going to send message %j', message);
	this.messages.add(message);

	var closeBeforeOpening = message.content.message === '[CLY]_test_message';
	if (closeBeforeOpening) {
		log.d('Going to clear from credentials %j', message.credentials.key);
		Connection.clearFromCredentials(message.credentials.key);
	}

	var connection = this.connect(message, closeBeforeOpening);
	if (connection) {
		var content = message.compile(message.credentials.platform),
			expires = message.expiryDate,
			encoding = message.content.encoding;

		log.d('Starting message %j with content %j (expires %j)', message.id, content, expires);

		var f = this.sendToConnection.bind(this, connection, message, content, encoding, expires),
			t = function(){
				if (message && (message.result.status & M.Status.Done) > 0) {
					log.d('Unfininshing message %j', message.id);
					message.result.status &= ~M.Status.Done;
					message.result.status |= M.Status.InProcessing;
					this.cancelCleanupFromMessageId(message.id);
				
					process.send({
						pid: process.pid,
						cmd: EVENTS.MASTER_STATUS,
						messageId: message.id,
						result: message.result
					});
				}
				return f.apply(this, arguments);
			}.bind(this);

		if (message.devices) {
			message.devices.forEach(t);
		} else {
			this.callbacks.stream(message, message.devicesQuery, t, connection.wow.bind(connection));
		}

		message.result.status |= M.Status.InProcessing;
		this.updateMessage(message, true);
		this.startMessageStatusUpdater(message);
	}
};

PushlyWorker.prototype.push = function(message) {
	log.d('Pushing new message %j', message.id);
	this.messages.add(message);
	process.send({
		pid: process.pid,
		cmd: EVENTS.MASTER_SEND,
		message: message.serialize()
	});
};

PushlyWorker.prototype.abort = function(message) {
	log.d('Aborting message %j from worker', message.id);
	process.send({
		pid: process.pid,
		cmd: EVENTS.MASTER_ABORT,
		messageId: message.id
	});
};

PushlyWorker.prototype.send = function(connection, messageId, content, expires, encoding, device) {
	var message = this.messages[messageId];
	if (message && (message.result.status & M.Status.Done) > 0) {
		log.d('Sending %j notes for %j (status %j)', device.length, messageId, message.result.status);
		message.result.status &= ~M.Status.Done;
		message.result.status |= M.Status.InProcessing;
		this.cancelCleanupFromMessageId(messageId);
	
		process.send({
			pid: process.pid,
			cmd: EVENTS.MASTER_STATUS,
			messageId: message.id,
			result: message.result
		});
	} else {
		log.d('Sending %j notes for new %j', device.length, messageId);
	}

	connection.send(content, encoding, expires, device);
};

PushlyWorker.prototype.setCallbacks = function(callbacks) {
	this.callbacks = callbacks;
};

/**
 * Select a worker with connection open or least loaded worker and dispatch message to it.
 * @api private
 */
PushlyWorker.prototype[EVENTS.CHILD_PROCESS] = function(m) {
	var message = new M.Message(m.message);

	this.queue.add(message);
	this.checkQueue(true);
};

/**
 * Abort sending.
 * @api private
 */
PushlyWorker.prototype[EVENTS.CHILD_ABORT] = function(m) {
	var message = this.messages[m.messageId];
	if (message) {
		log.d('Aborting message %j with status %j by master\'s order', m.messageId, message.result.status);
		var connection = this.connections[message.credentialsId()];
		if (connection) {
			log.d('Going to abort message %j on connection %j', m.messageId, connection.idx);
			connection.abort(message);
		}
		message.result.status &= ~M.Status.InProcessing;
		message.result.status |= M.Status.Aborted;
		log.d('Updating status of message %j with status %j', m.messageId, message.result.status);
		setTimeout(this.updateMessage.bind(this, message, true), 1000);
		// this.updateMessage(message, true);
	}
};

/**
 * Handle status update.
 * @api private
 */
PushlyWorker.prototype[EVENTS.CHILD_STATUS] = function(m) {
	log.d('Emiting status: %j', m);
    if (m.messageId in this.messages) {
        this.messages[m.messageId].result = m.result;
        this.emit('status', this.messages[m.messageId]);
    } else {
    	log.d('!!!!!!!!!!!!!!No message %j in messages of worker %d', m.messageId, process.pid);
    }
};

/**
 * Change logging level
 * @api private
 */
PushlyWorker.prototype[EVENTS.CHILD_SET_LOGGING] = function(m) {
	constants.setDebugEnabled(null, m.enable);
};

/**
 * Update message internally and emit 'status' event
 * @api private
 */
PushlyWorker.prototype.updateMessage = function(message, immediate, error) {
	if (immediate instanceof Err) {
		error = immediate;
		immediate = error.code !== Err.TOKEN;
	}

	// log.d('Updating message %j in process %d: %j, %j, %j', message.id, process.pid, message.result, immediate, error);

	if (error) {
		if (error.code & Err.IS_NON_RECOVERABLE) {
			message.result.status |= M.Status.Error;
			message.result.error = error;

			message.result.status &= ~M.Status.InProcessing;
			message.result.status |= M.Status.Aborted | M.Status.Done;
            this.cleanupFromMessageId(message.id);
		} else if (error.code === Err.TOKEN) {
			message.result.sent -= error.deviceTokens.length;
			if (this.callbacks && this.callbacks.onInvalidToken) {
				error.deviceTokens = error.deviceTokens.map(function(t){
					var token = {};
					if (t.bad) token.bad = t.bad instanceof Buffer ? t.bad.toString('hex') : t.bad;
					if (t.good) token.good = t.good instanceof Buffer ? t.good.toString('hex') : t.good;
					return token;
				});
				this.callbacks.onInvalidToken(message, error.deviceTokens, error);
			}
			immediate = true;
		} else {
			message.result.status |= M.Status.Error;
			message.result.error = error;
		}
	}

	if (message.result.total > 0 && message.result.processed === message.result.total) {
		message.result.status &= ~M.Status.InProcessing;
		message.result.status |= M.Status.Done;
        this.cleanupFromMessageId(message.id);
	} else if (message.result.status & M.Status.Aborted) {
        this.cleanupFromMessageId(message.id);
	}

	if (immediate || !this.messagesStatusTimes || !this.messagesStatusTimes[message.id] || this.messagesStatusTimes[message.id] < (Date.now() - this.options.statusUpdatePeriod)) {
		if (message.id in this.messages) {
			this.messagesStatusTimes[message.id] = Date.now();
		}
		if (!(message.id in this.results) || !_.isEqual(message.result, this.results[message.id])) {
			this.results[message.id] = _.assign({}, message.result);
			process.send({
				pid: process.pid,
				cmd: EVENTS.MASTER_STATUS,
				messageId: message.id,
				result: message.result
			});
		}
		log.d('Updated message %j in process %d with master notification: %j, %j, %j', message.id, process.pid, message.result, immediate, error);
	} else {
		// log.d('Updated message %j in process %d: %j, %j, %j (immediate %d, statusTimes %d)', message.id, process.pid, message.result, immediate, error, immediate, this.messagesStatusTimes[message.id] - (Date.now() - this.options.statusUpdatePeriod));
	}

};


/**
 * Remove message from private variables after 20 seconds delay (some device tokens might be not processed yet
 * @api private
 */
PushlyWorker.prototype.cleanupFromMessageId = function(messageId) {
	if (!(messageId in this.cleanUps)) {
    	log.d('Going to clean up message %j from worker %d in 20 seconds', messageId, process.pid);
		this.cleanUps[messageId] = setTimeout(function(){
			if (messageId in this.messages && !(this.messages[messageId].result.status & M.Status.Done)) {
				log.d('Won\'t clean up message because it\'s not done yet');
			} else {
		    	log.d('Cleaning up message %j from worker %d', messageId, process.pid);
		    	if (this.messages[messageId]) this.updateMessage(this.messages[messageId], true);
		    	this.messages.remove(messageId);
	        	delete this.messagesStatusTimes[messageId];
		    	log.d('%d messages and %d connections are in worker %d after cleanup: %j', this.messages.length, this.connections.length, process.pid, this.messages);
		    	if (this.connections.length === 0) {
		    		this.profiler.close();
		    	}
			}
    	}.bind(this), 20000);
	}
};

PushlyWorker.prototype.cancelCleanupFromMessageId = function(messageId) {
	if (messageId in this.cleanUps) {
    	log.d('Going to cancel message %j clean up from worker %d', messageId, process.pid);
		clearTimeout(this.cleanUps[messageId]);
		delete this.cleanUps[messageId];
	}
};

PushlyWorker.prototype.setLoggingEnabled = function(enabled) {
	constants.setDebugEnabled(null, enabled);
	process.send({
		pid: process.pid,
		cmd: EVENTS.MASTER_SET_LOGGING,
		enable: enabled
	});
};

var Queue = function(){};
util.inherits(Queue, Array);
Queue.prototype.add = Array.prototype.push;
Queue.prototype.next = Array.prototype.shift;

var Messages = function(){
	Object.defineProperty(this, 'length', {
		enumerable: false,
		configurable: false,
		writable: true,
		value: 0
	});
    Object.defineProperties(this, {
        add: {
            value: function(message, value){
            	log.d('adding %j message %j', message, value);
            	if (!this[message.id || message]) {
            		this.length++;
            		this[message.id || message] = value || message;
	            	log.d('added %j', this[message.id || message]);
            	}
			}
        },
        has: {
            value: function(message){
				return (message.id || message) in this;
			}
        },
        remove: {
            value: function(message){
            	if (this[message.id || message]) {
            		this.length--;
            		delete this[message.id || message];
            	}
			}
        }
    });
};

module.exports = PushlyWorker;


