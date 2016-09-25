'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:send'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  STATUS = job.STATUS,
	  ConnectionResource = require('../parts/resource.js'),
	  credentials = require('../parts/credentials.js'),
	  Streamer = require('../parts/streamer.js'),
	  Divider = require('../parts/divider.js'),
	  mess = require('../parts/message.js'),
	  pushly = require('../parts/pushly.js'),
	  Message = mess.Message,
	  Pushly = pushly.Message,
	  PushlyStatus = pushly.Status;


class PushJob extends job.IPCJob {
	constructor(name, data) {
		super(name, data);
		try {
			// sub
			if (this.data.pushly) {
				this.message = new Pushly(this.data.pushly);

				if (this.message.credentials.platform === 'i') {
					log.d('[%d]: Sending %s through new HTTP/2 interface in %s', process.pid, this.data.mid, this._id);

					var cert = credentials.p12(this.message.credentials.key, this.message.credentials.passphrase || '');

					this.data.pushly.credentials.topic = cert.topics[0];
					if (cert.topics.length > 1 && cert.bundle) {
						this.data.pushly.credentials.topic = cert.bundle;
					}
				}

				this.fieldToken = credentials.DB_USER_MAP.tokens + '.' + this.message.credentials.id.split('.')[0];
				this.fieldIndex = credentials.DB_USER_MAP.tokens + this.message.credentials.id.split('.')[0];
			}
		} catch (e) {
			log.e(e, e.stack);
			this.failed = e;
		}
	}

	resourceName () {
		return this.data.pushly.credentials.platform + '::' + this.data.pushly.credentials.key + (this.data.pushly.credentials.gateway ? '::' + this.data.pushly.credentials.gateway : '');
	}

	createResource (_id, name) {
		log.d('[%d]: topic %j', process.pid, this.data.pushly.credentials.topic);
		return new ConnectionResource(_id, name, this.data.pushly.credentials);
		// log.e('Wrong plarform for message %s: %j', this._id, this.data.pushly.credentials.platform);
		// throw new Error('Wrong plarform for message ' + this._id + ': ' + this.data.pushly.credentials.platform);
	}

	retryPolicy () {
		return new retry.IPCRetryPolicy(3);
	}

	// _divide (subs) {
	// 	return super._divide(subs).then(() => {
	// 		try {
	// 			require('../../../../api/parts/jobs/handle.js').db.collection('messages').updateOne({_id: this.data.mid}, {$set: {pushly: this._json.subs}}, (err, message) => {
	// 				log.d('inserted subs into message: %j / %j', err, message);
	// 			});
	// 		} catch (e) { log.e(e, e.stack); }
	// 	});
	// }
	divide (db) {
		if (this.failed) {
			return Promise.reject(this.failed);
		}
		
		log.d('[%d]: Dividing %s in %s', process.pid, this.data.mid, this._id);
		return new Promise((resolve, reject) => {
			db.collection('messages').findOne(this.data.mid, (err, message) => {
				if (err || !message) {
					log.e('[%d]: Couldn\'t find message %s in %s', process.pid, this.data.mid, this._id);
					reject(err || 'Message ' + this.data.mid + ' not found');
				} else {
					message = new Message(message);
					message.devicesQuery = message.dividerQuery();
					new Divider(message).divide(db, true).then(function(obj){
						log.d('[%d]: Finished didivding message %j for job %j: %d in %d', process.pid, message._id, job._id, obj.subs.length, obj.workers);
						resolve(obj);
					}, reject);
				}
			});
		});
	}

	_subSaved () {
		log.d('In _subSaved');
		return super._subSaved().then((set) => {
			log.d('super._subSaved', set);
			this.db().collection('messages').findOne(this.data.mid, (/*err, message*/) => {
				let quer = {_id: this.data.mid},
					upda = {$set: {'result.status': this._json.status === STATUS.DONE ? PushlyStatus.Done : PushlyStatus.InProcessing, sent: new Date()}};

				if (this.isCompleted && this._json.error) {
					upda.$set['result.error'] = this._json.error;
					upda.$set['result.status'] = PushlyStatus.Error;
				}

				this.db().collection('messages').updateOne(quer, upda, (err, res) => {
					if (err) {
						log.e('[%d]: Couldn\'t update message %j', process.pid, err);
					} else if (res.result.nModified === 0) {
						log.w('[%d]: Couldn\'t update message %j: %j', process.pid, this.data.mid, quer);
					}
				});
			});
		});
	}

	_timeoutCancelled () {
		return this.streaming;
	}

	run (db, done, progress) {
		log.d('[%d] going to run job %j: %j', process.pid, this._idIpc, this._json, typeof this.data.mid, this.data.mid);
		let query = {_id: db.ObjectID.createFromHexString(this.data.mid), 'deleted': {$exists: false}},
			update = {$set: {'result.status': PushlyStatus.InProcessing, 'result.delivered': 0}};

		if (this.failed) {
			update.$set['result.status'] = PushlyStatus.Error;
			update.$set['result.error'] = this.failed;
			log.d('Won\'t run %s because it has been failed in constructor: %j', this._idIpc, this.failed);
		}
		
		var statusCounter = 0;
		db.collection('messages').findAndModify(query, [['date', 1]], update, {'new': true}, (err, message) => {
			if (err || this.failed) {
				done(err || this.failed);
			} else if (!message || !message.ok) {
				done('already running');
			} else {
				message = message.value;
				log.d('Processing message %j', message);

				this.users = [];
				this.datas = [];
				this.locales = [];

				var content = this.message.compile(this.message.credentials.platform);

				if (content.default) {
					this.locales = Object.keys(content);
					this.locales.forEach((l, i) => {
						this.datas[i] = content[l];
					});
				} else {
					this.datas = [content];
				}

				log.d('[%d]: locales %j for datas %j', process.pid, this.locales, this.datas);

				let status = {
					size: this.size,
					done: this.done,
					bookmark: this.bookmark
				};

				db.collection('apps').findOne({_id: db.ObjectID.createFromHexString(this.data.appId)}, (err, app) => {
					if (err) { done(err); }
					else { 
						this.app = app;
						this.streamer = new Streamer(this.message, app);

						log.d('[%d]: %j Bookmark %s, first %s', process.pid, this._idIpc, status.bookmark, this.data.first);
						if (status.bookmark) {
							this._json.data.first = status.bookmark;
						}

						log.d('[%d]: %j Ready to stream', process.pid, this._idIpc);
						this.resource.send(this.datas, (count) => {
							this.streaming = true;
							this.streamer.load(db, this.data.first, this.data.last, Math.max(count, 10)).then((users) => {
								this.streaming = false;
								// bookmark is not first of next batch, but rather last status from previous
								// so it must be removed from array
								if (users.length && users[0]._id === status.bookmark) {
									users.shift();
								}
								let fed, lst;
								if (users.length === 0) {
									log.d('[%d]: %j No more users found', process.pid, this._idIpc);
									this.resource.feed([]);
								} if (users.length === 1) {
									log.d('[%d]: %j Feeding last user', process.pid, this._idIpc);
									fed = this.resource.feed(users.map(this.mapUser.bind(this)));

									status.size += fed;

									if (fed === 1) {
										log.d('[%d]: %j Fed last user', process.pid, this._idIpc);
										this._json.data.first = 'zzz-' + this._json.data.first;
									} else {
										log.w('[%d]: %j Cannot feed last user', process.pid, this._idIpc);
									}
								} else {
									lst = users.pop();
									log.d('[%d]: %j Going to feed %d users while %d is requested', process.pid, this._idIpc, users.length, count);
									fed = this.resource.feed(users.map(this.mapUser.bind(this)));
								
									status.size += fed;

									log.d('[%d]: %j Fed %j users out of %d', process.pid, this._idIpc, fed, users.length);
									if (fed === users.length) {
										log.d('[%d]: %j Fed all %d users, next batch will start with %s', process.pid, this._idIpc, fed, lst._id);
										this._json.data.first = lst._id;
									} else if (fed < users.length && fed > 0) {
										log.d('[%d]: %j Fed only %d users, next batch will start with %s', process.pid, this._idIpc, fed, users[fed]._id);
										this._json.data.first = users[fed]._id;
									}
								}
							}, (err) => {
								done(err || 'Error while loading users');
								this.streaming = false;
							});
						}, (statuses) => {
							var codes = statuses.map(s => s[1]);
							var ids = statuses.filter(s => s[1] === 1).map(s => s[0]);
							var errors = codes.filter(s => s < 0).length;
							var unset = statuses.filter(s => s[1] === 0).map(s => s[0]);
							var sent = statuses.length - errors - unset.length;

							statusCounter++;
							log.d('[%d]: %d %j Got %d statuses: %d sent, %d unset, %d errors', process.pid, statusCounter, this._idIpc, statuses.length, sent, unset.length, errors);

							if (unset.length) {
								let q = unset.length === 1 ? {_id: unset[0]} : {_id: {$in: unset}},
									$unset = {
										[this.fieldToken]: 1,
										[this.fieldIndex]: 1,
									};

								log.d('[%d]: %j Unsetting %d tokens in %j: %j / %j, pulling %j', process.pid, this._idIpc, unset.length, 'app_users' + this.app._id, q, $unset, message._id);
								db.collection('app_users' + this.app._id).update(q, {$unset: $unset}, {multi: true}, log.logdb('unsetting tokens'));
							}

							if (ids.length) {
								db.collection('app_users' + this.app._id).update({_id: {$in: ids}}, {$push: {msgs: message._id}}, {multi: true}, log.logdb('adding message to app_users ' + statusCounter + ' ' + this._idIpc));
							}

							if (statuses.length) {
								db.collection('messages').update({_id: message._id}, {$inc: {'result.sent': sent, 'result.processed': statuses.length, 'result.errors': errors}}, log.logdb('updating message with sent ' + statusCounter + ' ' + this._idIpc));
							}

							statuses.filter(s => s[1] === 2).forEach(status => {
								db.collection('app_users' + this.app._id).updateOne({_id: status[0]}, {$set: {[this.fieldToken]: status[2]}}, log.logdb('updating GCM token ' + statusCounter + ' ' + this._idIpc));
							});

							status.done += statuses.length;

							if (sent) {
								var params = {
									qstring: {
										events: [
											{ key: '[CLY]_push_sent', count: sent, segmentation: {i: message._id } }
										]
									},
									app_id: app._id,
									appTimezone: app.timezone,
									time: require('../../../../api/utils/common.js').initTimeObj(app.timezone)
								};

								require('../../../../api/parts/data/events.js').processEvents(params);
							}

							if (errors) {
								let errorsInc = {};
								codes.filter(s => s < 0).forEach(c => {
									let key = 'result.errorCodes.' + mess.MessagePlatform.APNS + ((-1) * c);
									if (errorsInc[key]) {
										errorsInc[key]++;
									} else {
										errorsInc[key] = 1;
									}
								});
								log.d('[%d]: setting error codes for %s: %j', process.pid, message._id, {$inc: errorsInc});
								db.collection('messages').update({_id: message._id}, {$inc: errorsInc}, log.logdb('updating message with error codes ' + statusCounter + ' ' + this._idIpc));
							}

							var max = statuses.shift()[0];
							statuses.forEach(s => {
								if (s[0] > max) { max = s[0]; }
							});

							progress(status.size, status.done, max);

						}).then(() => {
							log.d('[%d]: Send promise returned success in %s', process.pid, this._idIpc);
							if (!this.completed) {
								done();
								this.stream.clear(db);
							}
						}, (err) => {
							log.d('[%d]: Send promise returned error %j in %s', process.pid, err, this._idIpc);
							if (!this.completed) {
								this._json.data.bookmark = this.json.data.first;
								done(err || 'Unknown APN error');
								this.stream.clear(db);
							}
						});
					}
				});
			}
		});
	}

	cancel (db) {
		return new Promise((resolve, reject) => {
			super.cancel().then(() => {
				let query = {_id: db.ObjectID.createFromHexString(this.data.mid)},
					update = {$set: {'result.status': PushlyStatus.Aborted, 'result.error': 'Cancelled'}};

				db.collection('messages').update(query, update, log.logdb('cancelling message', resolve, reject));
			});
		});
	}

	mapUser(user) {
		var id = user._id,
			token = user[this.fieldIndex],
			locale = user.la,
			idx = locale ? this.locales.indexOf(locale) : -1;

		if (idx === -1) { idx = this.locales.indexOf('default'); }
		if (idx === -1) { idx = 0; }

		return [id, token, idx];
	}
}

module.exports = PushJob;
