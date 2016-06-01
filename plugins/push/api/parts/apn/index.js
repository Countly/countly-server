'use strict';
const addon = require('./build/Release/apns');
// const addon = require('./build/Debug/apns');

class ConnectionResource {
	constructor(cert, pass, topic, expiration, host) {
		this.connection = new addon.Connection(cert, pass, topic, expiration, host);
	}

	init() {
		if (this._connected) {
			return Promise.resolve();
		} else {
			return this.connection.init();
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
		return this.connection.close_connection().then(() => {
			this._connected = false;
		});
	}
};

module.exports = {
	ConnectionResource: ConnectionResource
};
