'use strict';

const log = require('../../../../../api/utils/log.js')('push:gcm'),
	  https = require('https'),
	  EventEmitter = require('events');


const MAX_QUEUE = 300,
	  MAX_BATCH = 100;

class ConnectionResource extends EventEmitter {
	constructor(key) {
		super();
		log.w('New GCM connection %j', arguments);
		this._key = key;
		this.devices = [];
		this.ids = [];
		this.inFlight = 0;

		this.onSocket = (s) => {
			this.socket = s;
		};

		this.onError = (e) => {
			log.e('socket error %j', e);
		};
	}

	init() {
		this.options = {
			hostname: 'android.googleapis.com',
			port: 443,
			path: '/gcm/send',
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': 'key=' + this._key,
			},
		};

		this.agent = new https.Agent(this.options);
		this.agent.maxSockets = 1;

		this.options.agent = this.agent;

		return Promise.resolve();
	}

	resolve() {
		return Promise.resolve();
	}

	init_connection() {
		return Promise.resolve();
	}

	feed (array) {
		try {
		this.queue += array.length;
		array.forEach(u => {
			this.ids[u[2]].push([u[0], 1]);
			this.devices[u[2]].push(u[1]);
		});
		this.serviceImmediate();
		log.d('[%d]: Fed %d, now %d', process.pid, array.length, this.queue);
		}catch(e) { log.e(e, e.stack); }
		return (this.lastFeed = array.length);
	}

	send(msgs, feeder, status) {
		log.d('[%d]: send', process.pid);
		this.messages = msgs;
		this.devices = msgs.map(_ => []);
		this.ids = msgs.map(_ => []);
		this.queue = 0;
		this.lastFeed = -1;
		this.feeder = feeder;
		this.statuser = status;
		
		this.serviceImmediate();

		return new Promise((resolve, reject) => {
			this.promiseResolve = resolve;
			this.promiseReject = reject;
		});
	}

	serviceImmediate () {
		if (!this._servicing) {
			this._servicing = true;
			setImmediate(this.service.bind(this));
		}
	}

	serviceWithTimeout () {
		if (!this._servicing) {
			this._servicing = true;
			setTimeout(this.service.bind(this), 1000);
		}
	}

	service() {
		log.d('[%d]: Servicing', process.pid);

		this._servicing = false;
	
		if (this.agent === null || this._closed) {
			return;
		}

		if (this.lastFeed !== 0 && this.queue < MAX_QUEUE / 2) {
			this.feeder(MAX_QUEUE - this.queue);
			return;
		} else if (this.lastFeed === 0 && this.queue === 0) {
			return this.promiseResolve();
		}

		log.d('dbg %j', Math.max.apply(null, this.ids.map(ids => ids.length)));

		let lengths = this.ids.map(ids => ids.length),
			dataIndex = lengths.indexOf(Math.max.apply(Math, lengths)),
			devices = this.devices[dataIndex].splice(0, MAX_BATCH),
			ids = this.ids[dataIndex].splice(0, MAX_BATCH),
			message = this.messages[dataIndex];
			
		log.d('dataIndex %j', dataIndex);

		if (devices.length) {
			message.registration_ids = devices;

			log.d('sending %j', message);
			log.d('with %j', ids);
			
			let content = JSON.stringify(message);

			this.options.headers['Content-length'] = Buffer.byteLength(content, 'utf8');

			let req = https.request(this.options, (res) => {
				res.reply = '';
				res.on('data', d => { res.reply += d; });
				res.on('end', this.handle.bind(this, req, res, ids, devices));
				res.on('close', this.handle.bind(this, req, res, ids, devices));
			});
			req.on('socket', this.onSocket.bind(this));
			req.on('error', this.onError.bind(this));
			req.end(content);

			this.queue -= devices.length;
		} else {
			this.serviceWithTimeout();
		}

	}

	rejectAndClose(error) {
		this.promiseReject(error);
		this.close_connection();
	}

	handle(req, res, ids, devices) {
		if (req.handled || this._closed) { return; }
		req.handled = true;
		
		let code = res.statusCode,
			data = res.reply;

		log.d('[%d]: GCM handling %d', process.pid, code);
		log.d('[%d]: GCM data %j', process.pid, data);

		if (code >= 500) {
			this.rejectAndClose(code + ': GCM Unavailable');
		} else if (code === 401) {
			this.rejectAndClose(code + ': GCM Unauthorized');
		} else if (code === 400) {
			this.rejectAndClose(code + ': GCM Bad message');
		} else if (code !== 200) {
			this.rejectAndClose(code + ': Bad response code');
		} else {
			try {
				if (data && data[0] === '"' && data[data.length - 1] === '"') {
					data = data.substr(1, data.length - 2);
					log.d('GCM replaced quotes: %j', data);
				}
				var obj = JSON.parse(data);
				if (obj.failure === 0 && obj.canonical_ids === 0) {
					ids.forEach(id => id[1] = 200);
					this.statuser(ids);
				} else if (obj.results) {

					var messageErrorCode, messageError;

					obj.results.forEach((result, i) => {
						if (result.message_id) {
							if (result.registration_id) {
								ids[i][1] = -200;
								ids[i][3] = result.registration_id;
							} else {
								ids[i][1] = 200;
							}
						} else if (result.error === 'InvalidRegistration') {
							ids[i][1] = -200;
							ids[i][2] = result.error;
						} else if (result.error === 'NotRegistered') {
							ids[i][1] = -200;
						} else if (result.error === 'MessageTooBig' || result.error === 'InvalidDataKey' || result.error === 'InvalidTtl' ||
								result.error === 'InvalidTtl' || result.error === 'InvalidPackageName') {
							messageErrorCode = code;
							messageError = result.error;
						} else if (result.error === 'Unavailable' || result.error === 'InternalServerError') {
							if (!ids[i][3]) {
								ids[i][3] = 0;
							}
							ids[i][3]++;
							// allow up to 5 InternalServerError's for a single token, then stop sending
							if (ids[i][3] > 5) {
								messageErrorCode = code;
								messageError = result.error;
							} else {
								ids.splice(i, 1);
								devices.splice(i, 1);
							}
						} else if (result.error) {
							ids[i][1] = code;
							ids[i][2] = result.error;
						}
					});

					this.statuser(ids);

					if (messageError) {
						this.rejectAndClose(messageError);
					}
				}

				this.serviceImmediate();
			} catch (e) {
				ids.forEach(i => i[1] = -1);
				this.statuser(ids);
				log.w('[%d]: Bad response from GCM: %j / %j / %j', process.pid, code, data, e, e.stack);
			}
		}

		this._servicing = false;
	}

	close_connection() {
		log.i('[%d]: Closing GCM connection', process.pid);
		this._closed = true;
		if (this.socket) {
			this.socket.emit('agentRemove');
			this.socket = null;
		}
		if (this.agent) {
			this.agent.destroy();
			this.agent = null;
		}

		this.emit('closed');
		return Promise.resolve();
	}
}

module.exports = {
	ConnectionResource: ConnectionResource
};
