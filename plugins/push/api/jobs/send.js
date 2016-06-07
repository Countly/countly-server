'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:send'),
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
	}

	resourceName () {
		return this.data.pushly.credentials.platform + '::' + this.data.pushly.credentials.key;
	}

	createResource (_id, name) {
		log.d('[%d]: topic %j', process.pid, this.data.pushly.credentials.topic);
		return new ConnectionResource(_id, name, this.data.pushly.credentials);
		// log.e('Wrong plarform for message %s: %j', this._id, this.data.pushly.credentials.platform);
		// throw new Error('Wrong plarform for message ' + this._id + ': ' + this.data.pushly.credentials.platform);
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
		log.d('In _subSaved', typeof this.data.mid);
		return super._subSaved().then((set) => {
			log.d('super._subSaved', set);
			if (set && set.done) {
				try {

					let quer = {_id: this.data.mid},
						upda = {$set: {'result.processed': this._json.size, 'result.sent': this._json.done, 'result.status': this._json.status === STATUS.DONE ? PushlyStatus.Done : PushlyStatus.InProcessing}};

				log.w('done changed, updating %j with %j', quer, upda);

						// this.db().collection('messages').findOne(q, (err, res) => {
						// 		log.w('findOne ', err, res);
						// 	let result = res.result;
						// 	result.status = this.status === job.STATUS.DONE ? MessageStatus.Done : MessageStatus.InProcessing;
						// 	result.processed = this._json.done;
						// 	u = {$set: result};
						// 	log.w('sending update %j', u);
						// 	this.db().collection('messages').updateOne(q, u, (err, res) => {
						// 		log.w('updateOne ', err, res);
						// 	});
						// });
				this.db().collection('messages').updateOne(quer, upda, (err, res) => {
					if (err) {
						log.e('[%d]: Couldn\'t update message %j', process.pid, err);
					} else if (res.result.nModified === 0) {
						log.e('[%d]: Couldn\'t find message %j: %j', process.pid, this.data.mid, quer);
					} else {
						log.w('updated message');
					}
				});
				} catch (e) {
					log.e(e, e.stack);
				}
			}
		});
	}

	run (db, done, progress) {
		log.d('[%d] going to run job %j: %j', process.pid, this._idIpc, this.data, typeof this.data.mid, this.data.mid);
		let query = {_id: db.ObjectID.createFromHexString(this.data.mid), 'deleted': {$exists: false}},
			update = {$set: {'result.status': PushlyStatus.InProcessing, 'result.delivered': 0}};


		// if (this.isSub) {
		// 	// query['pushly.id'] = this._json.id;
		// 	// update.$set['pushly.$.status'] = MessageStatus.InProcessing;
		// } else {
		// 	update.$set['result.status'] = MessageStatus.InProcessing;
		// }

		// if (!this.done) {
		// 	query['result.status'] = MessageStatus.Initial;
		// }

		db.collection('messages').findAndModify(query, [['date', 1]], update, {'new': true}, (err, message) => {
			if (err) {
				done(err);
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
					size: 0,
					done: 0,
					sent: 0
				};

				db.collection('apps').findOne({_id: db.ObjectID.createFromHexString(this.data.appId)}, (err, app) => {
					if (err) { done(err); }
					else { 
						log.d('Found app %j', app);
						this.app = app;
						this.streamer = new Streamer(this.message, app);

						log.d('[%d]: Bookmark %s, first %s', process.pid, this.data.bookmark, this.data.first);
						if (this.data.bookmark) {
							this._json.data.first = this.data.bookmark;
						}

						log.d('[%d]: Ready to stream', process.pid);
						this.resource.send(this.datas, (count) => {
							this.streamer.load(db, this.data.first, this.data.last, Math.max(count, 10)).then((users) => {
								let fed, lst;
								if (users.length === 1) {
									log.d('Feeding last user');
									fed = this.resource.feed(users.map(this.mapUser.bind(this)));

									status.size += fed;

									if (fed === 1) {
										log.d('Fed last user');
										this._json.data.first += ' final ';
									} else {
										log.w('Cannot feed last user');
									}
								} else {
									lst = users.pop();
									log.d('Going to feed %d users while %d is requested', users.length, count);
									fed = this.resource.feed(users.map(this.mapUser.bind(this)));
								
									status.size += fed;

									log.d('Fed %j users out of %d', fed, users.length);
									if (fed === users.length) {
										log.d('Fed all %d users, next batch will start with %s', fed, lst._id);
										this._json.data.first = lst._id;
									} else if (fed < users.length && fed > 0) {
										log.d('Fed only %d users, next batch will start with %s', fed, users[fed]._id);
										this._json.data.first = users[fed]._id;
									}
								}
							}, (err) => {
								done(err || 'Error while loading users');
							});
						}, (statuses) => {
							var ids = statuses.filter(s => s[1] === 1).map(s => s._id);
							var error = statuses.filter(s => s[1] < 0).length;
							var unset = statuses.filter(s => s[1] === 0).map(s => s[0]);
							var sent = statuses.length - error - unset.length;

							log.d('Got %d statuses: %d sent, %d unset, %d error', statuses.length, sent, unset.length, error);

							try {
							if (unset.length) {
								let q = unset.length === 1 ? {_id: unset[0]} : {_id: {$in: unset}},
									$unset = {
										[this.fieldToken]: 1,
										[this.fieldIndex]: 1,
									};

								log.d('[%d]: Unsetting %d tokens in %j: %j / %j, pulling %j', process.pid, unset.length, 'app_users' + this.app._id, q, $unset, message._id);
								db.collection('app_users' + this.app._id).update(q, {$unset: $unset}, {multi: true}, (err, res) => {
									if (err) {
										log.e('[%d]: Couldn\'t unset %d tokens in %j: %j / %j, pulling %j', process.pid, unset.length, 'app_users' + this.app._id, q, $unset, message._id);
									// } else {
										// log.d('Unset query result: %j', res);
									}
								});
							}

							db.collection('app_users' + this.app._id).update({_id: {$in: ids}}, {$push: {msgs: message._id}}, {multi: true}, (err, res) => {
								if (err) {
									log.e('[%d]: Couldn\'t push message id to %d users in %j for %j', process.pid, ids.length, 'app_users' + this.app._id, message._id);
								// } else {
									// log.d('[%d]: Push message _id query result: %j', process.pid, res);
								}
							});

							db.collection('messages').update({_id: this.message._id}, {
								$inc: {'result.sent': sent, 'result.processed': statuses.length}}, (err) => {
								if (err) {
									log.e('[%d]: Couldn\'t update message', process.pid, err);
								}
							});

							statuses.filter(s => s[1] === 2).forEach(status => {
								db.collection('app_users' + this.app._id).updateOne({_id: status[0]}, {$set: {[this.fieldToken]: status[2]}}, (err, res) => {
									if (err) {
										log.e('[%d]: Couldn\'t replace token in message id in %j for %j: %j', process.pid, ids.length, 'app_users' + this.app._id, {_id: status[0]}, message._id, err);
									// } else if (res.result.nModified !== 1) {
										// log.d('[%d]: Push token replace query didn\'t find a user: %j', 'app_users' + this.app._id, {_id: status[0]}, message._id, res);
									}
								});
							});

							status.done += statuses.length;
							status.sent += sent;

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

							progress(status.done, status.sent, statuses.pop()[0]);
						} catch(e) { log.e(e, e.stacl); }

						}).then(() => {
							log.d('[%d]: Send promise returned success in %s', process.pid, this._idIpc);
							if (!this.completed) {
								done();
								this.stream.clean(db);
							}
						}, (err) => {
							log.d('[%d]: Send promise returned error %j in %s', process.pid, err, this._idIpc);
							if (!this.completed) {
								this._json.data.bookmark = this.json.data.first;
								done(err || 'Unknown APN error');
								this.stream.clean(db);
							}
						});
					}
				});
			}
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
