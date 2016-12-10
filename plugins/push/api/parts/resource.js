'use strict';

const res = require('../../../../api/parts/jobs/resource.js'),
	  log = require('../../../../api/utils/log.js')('job:push:resource'),
	  APN = require('../parts/apn'),
	  GCM = require('../parts/gcm');

class Connection extends res.Resource {
	constructor(_id, name, credentials) {
		super(_id, name);
		log.d('[%d]: Initializing push resource with %j / %j / %j', process.pid, _id, name, credentials);
		if (credentials.platform === 'i') {
			this.connection = new APN.ConnectionResource(credentials.key, credentials.secret || '', credentials.topic || '', credentials.expiration || '', credentials.host);
		} else if (credentials.platform === 'a') {
			this.connection = new GCM.ConnectionResource(credentials.key);
		} else {
			log.e(`Platform ${credentials.platform} is not supported`);
			throw new Error(`Platform ${credentials.platform} is not supported`);
		}
		log.d('[%d]: Initialized push resource', process.pid);
	}

	open () {
		log.d('[%d]: opening resource %j', process.pid, this._id);
		return new Promise((resolve, reject) => {
			this.startInterval();
			this.connection.init((error) => {
				log.e('in');
				log.e('^^^^^^____!____^^^^^^ Error in connection: %j', error);
				reject(error);
			}).then((res) => {
				log.d('init promise done with %j', res);
				this.connection.resolve().then((res) => {
					log.d('resolve promise done with %j', res);
					this.connection.init_connection().then((res) => {
						log.d('connect promise done with %j', res);
						this.opened();
						resolve();
					}, (err) => {
						log.d('connect promise err: ', err);
						this.stopInterval();
						reject(err);
					});
				}, (err) => {
					log.d('resolve promise err: ', err);
					this.stopInterval();
					reject(err);
				});
			}, (err) => {
				log.d('init promise err: ', err);
				this.stopInterval();
				reject(err);
			});
		});
	}

	close () {
		return new Promise((resolve, reject) => {
			if (this.connection) {
				this.connection.close_connection().then(() => {
					this.closed();
					this.stopInterval();
				}).then(resolve, reject);
			} else {
				resolve();
				this.stopInterval();
			}
		});
	}

	send (datas, feeder, stats) {
		this.startInterval();
		return this.connection.send(datas, feeder, stats).then((res) => {
			log.d('!!!!!!!!!!!!!!!!!!!!!!!send promise done with: ', res);
			this.stopInterval();
		}, (err) => {
			log.d('send promise err: ', err);
			this.stopInterval();
			throw err;
		});
	}

	feed (array) {
		return this.connection.feed(array);
	}

	checkActive () {
		return new Promise((resolve) => {
			log.d('checkActive');
			setTimeout(() => {
				resolve(true);
			}, 2000);
		});
	}

	// this is required to keep event loop alive
	startInterval() {
		if (!this.interval) {
			console.log('============ setting interval ' + this.interval);
			var s = 0;
			this.interval = setInterval(function() {
				s = s + 1 - 1;
				console.log(s++);
			}, 1000);
		}
	}

	stopInterval () {
		if (this.interval) {
			console.log('============ clearing interval ' + this.interval);
			clearInterval(this.interval);
			this.interval = 0;
		}
	}
}

module.exports = Connection;
