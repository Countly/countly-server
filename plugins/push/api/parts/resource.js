'use strict';

const res = require('../../../../api/parts/jobs/resource.js'),
	  log = require('../../../../api/utils/log.js')('job:push:resource'),
	  CT  = require('./credentials').CRED_TYPE,
	  PL  = require('./note.js').Platform,
	  APN = require('../parts/apn'),
	  GCM = require('../parts/gcm'),
	  jwt = require('jsonwebtoken'),
	  TOKEN_VALID = 60 * 45;

class Token {
	constructor(key, kid, tid) {
		this.key = key;
		this.kid = kid;
		this.tid = tid;
		this.next();
	}

	current() {
		if (!this.isValid()) {
			this.next();
		}
		return this.token_bearer;
	} 

	next() {
		this.token = this.sign();
		this.token_bearer = 'bearer ' + this.token;
		this.date = this.decode().iat;
	}

	isValid() {
		return (Date.now() / 1000 - this.date) < TOKEN_VALID;
	}

	sign() {
		return jwt.sign({
			iss: this.tid,
			iat: Math.floor(Date.now() / 1000)
		}, this.key, {
			algorithm: 'ES256', 
			header: {
				alg: 'ES256',
				kid: this.kid
			}
		});
	}

	decode() {
		return jwt.decode(this.token || this.sign());
	}
}

class Connection extends res.Resource {
	constructor(_id, name, credentials) {
		super(_id, name);
		log.d('[%d]: Initializing push resource with %j / %j / %j', process.pid, _id, name, credentials);
		if (credentials.platform === PL.APNS) {
			var secret = credentials.secret || '',
				bundle = credentials.bundle || '',
				certificate = credentials.key;

			if (credentials.type === CT[PL.APNS].TOKEN) {
				var comps = credentials.secret.split('[CLY]');
				this.token = new Token(credentials.key, comps[0], comps[1]);
				log.d('current token %j', this.token.decode());
				log.d('current secret %j', credentials.key);
				bundle = comps[2];
				secret = this.token.current();
				certificate = '';
				log.d('Will use team %j, key id %j, bundle %j for token generation, current token is %j, valid from %j', comps[1], comps[0], comps[2], this.token.token, this.token.date);
			}

			this.connection = new APN.ConnectionResource(certificate, secret, bundle, credentials.expiration || '', credentials.host);
		} else if (credentials.platform === PL.GCM) {
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
		return this.connection.feed(array, this.token ? this.token.current() : undefined);
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
			var s = 0;
			this.interval = setInterval(function() {
				s = s + 1 - 1;
				console.log(s++);
			}, 1000);
		}
	}

	stopInterval () {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = 0;
		}
	}
}

Connection.Token = Token;

module.exports = Connection;
