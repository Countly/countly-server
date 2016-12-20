'use strict';
const addon = require('./build/Release/apns');
// const addon = require('./build/Debug/apns');

class ConnectionResource {
	constructor(cert, pass, topic, expiration, host) {
		this.connection = new addon.Connection(cert, pass, topic, expiration, host);
	}

	init(logger) {
		if (this._connected) {
			return Promise.resolve();
		} else {
			return this.connection.init(logger);
		}
	}

	feed(array) {
		return this.connection.feed(array);
	}

	resolve() {
		if (this._connected) {
			return Promise.resolve();
		} else {
			return this.connection.resolve();
		}
	}

	init_connection() {
		if (this._connected) {
			return Promise.resolve();
		} else {
			return this.connection.init_connection().then(() => {
				this._connected = true;
			});
		}
	}

	send(msgs, feeder, status) {
		return this.connection.send(msgs, feeder, status);
	}

	close_connection() {
		// let e = new Error();
		// console.log(e.stack);
		// console.log('%j', e.stack);
		return this.connection.close_connection().then(() => {
			this._connected = false;
		}, (error) => {
			this._connected = false;
			throw error;
		});
	}
}

module.exports = {
	ConnectionResource: ConnectionResource
};
