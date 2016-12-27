'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  jobs = require('../../../../api/parts/jobs'),
	  log = require('../../../../api/utils/log.js')('job:push:send'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  plugins = require('../../../../plugins/pluginManager.js'),
	  STATUS = job.STATUS,
	  ConnectionResource = require('../parts/resource.js'),
	  creds = require('../parts/credentials.js'),
	  Streamer = require('../parts/streamer.js'),
	  Divider = require('../parts/divider.js'),
	  N = require('../parts/note.js');


class PushJob extends job.IPCJob {
	constructor(name, data) {
		super(name, data);
		this.promises = [];
		log.d('initializing PushJob with %j & %j', name, data);
	}

	prepare (manager, db) {
		if (this.data.appsub) {
			log.d('[%d]: Preparing subjob %j (data %j, content %j)', process.pid, this._idIpc, this.data);
			this.anote = new N.AppSubNote(this.data.appsub);
			this.aoid = db.ObjectID(this.anote._id);
			log.d('[%d]: Preparing subjob creds %j', process.pid, this._idIpc, this.anote.creds);
			this.anote.creds = new creds.AppSubCredentials(this.anote.creds);
			this.fieldToken = creds.DB_USER_MAP.tokens + '.' + this.anote.creds.field;
			this.fieldIndex = creds.DB_USER_MAP.tokens + this.anote.creds.field;
			log.d('[%d]: Loading subjob creds %j', process.pid, this._idIpc, this.anote.creds);

			return new Promise((resolve, reject) => {
				this.anote.creds.load(db).then(() => {
					new Streamer(this.anote).loadTzs(db).then(resolve, reject);
				}, reject);
			});
		} else {
			log.d('[%d]: Preparing parent job %j (data %j)', process.pid, this._idIpc, this.data);
			return N.Note.load(db, db.ObjectID(this.data.mid)).then((note) => {
				this.note = note;
				return note;
			});
		}
	}

	resourceName () {
		return 'send:' + this.anote.creds.id;
	}

	createResource (_id, name) {
		return new ConnectionResource(_id, name, this.anote.creds);
	}

	retryPolicy () {
		return new retry.IPCRetryPolicy(3);
	}

	divide (db) {
		if (this.failed) {
			return Promise.reject(this.failed);
		}
		
		log.d('[%d:%s]: Dividing in %s (%j)', process.pid, this.note.id, this._id, this.note);
		return new Divider(this.note).divide(db, true).then((obj) => {
			log.d('[%s: %d]: Finished didivding message for job %j: %d in %d', process.pid, this.note.id, this._id, obj.subs.length, obj.workers);
			return obj;
		});
	}

	_divide (subs) {
		return super._divide(subs.map(s => {
			log.d('cleaning sub %j', s);
			var sub = {};
			for (let k in s) {
				sub[k] = s[k];
				if (k === 'data') {
					sub[k] = {};
					for (let sk in s[k]) {
						if (typeof s[k][sk].toJSON === 'function') {
							sub[k][sk] = s[k][sk].toJSON();
						} else {
							sub[k][sk] = s[k][sk];
						}
					}
				}
			}
			delete sub.data.appsub.creds.key;
			delete sub.data.appsub.creds.secret;
			delete sub.data.appsub.creds.topics;
			delete sub.data.appsub.creds.bundle;
			return sub;
		}));
	}

	_subSaved () {
		log.d('[%d:%s]: In _subSaved', process.pid, this.note ? this.note.id : this.anote.id);
		return super._subSaved().then((set) => {
			log.d('[%d:%s]: super._subSaved %j for %s', process.pid, this.note ? this.note.id : this.anote.id, set, this.data.mid);
			this.db().collection('messages').findOne(this.data.mid, (/*err, message*/) => {
				let quer = {_id: this.data.mid},
					upda = {$set: {'result.status': this._json.status === STATUS.DONE ? N.Status.Done : N.Status.InProcessing, sent: new Date()}};

				if (this.isCompleted && this._json.error) {
					upda.$set['result.error'] = this._json.error;
					upda.$set['result.status'] = N.Status.Error;
				}

				this.db().collection('messages').updateOne(quer, upda, (err, res) => {
					if (err) {
						log.e('[%d:%s]: Couldn\'t update message %j with %j / %j', process.pid, this.note ? this.note.id : this.anote.id, err, quer, upda);
					} else if (res.result.nModified === 0) {
						log.w('[%d:%s]: Couldn\'t update message: %j / %j', process.pid, this.note ? this.note.id : this.anote.id, quer, upda);
					}
				});
			});
		});
	}

	watchPromise (promise) {
		var wrapper = new Promise((resolve, reject) => {
			promise.then((data) => {
				this.promises.splice(this.promises.indexOf(wrapper), 1);
				resolve(data);
			}, (err) => {
				log.e('Error in promise watcher: %j', err, err.stack);
				this.promises.splice(this.promises.indexOf(wrapper), 1);
				reject(err);
			});
		});
		this.promises.push(wrapper);
	}

	waitForAllPromises () {
		log.d('[%d:%s]: watching', process.pid, this.anote.id);
		return new Promise((resolve, reject) => {
			var times = 0,
				f = () => {
					log.d('[%d:%s]: watching f', process.pid, this.anote.id, times, this.promises.length);
					if (this.promises.length === 0) {
						resolve();
					} else if (times > 1800) {
						reject('30 min timeout');
					} else {
						log.d('[%d:%s] still waiting for some (%d) db process to complete (%d times so far)', process.pid, this.anote.id, this.promises.length, times);
						times++;
						setTimeout(f, 1000);
					}
				};
			f();
		});
	}

	rejectUsersWhoPassedTz (db, status) {
		if (this.anote.tz !== false) {
			var diff = (this.anote.date.getTime() - Date.now() + this.anote.tz * 60000) / 60000,
				del = Math.ceil(diff) + 90,
				send = Math.ceil(diff) - 30;
			log.d('[%d:%s] now %d (%s), date %d (%s)', process.pid, this.anote.id, Date.now(), new Date(), this.anote.date.getTime(), this.anote.date);
			// var batch = new Date(this.date.getTime() + this.ano.tzs[0] - this.tz);
			// var now = Date.now(),
			// 	date = this.anote.date.getTime(),
			// 	diff = (now - date) / 1000 / 60,
			// 	del = Math.ceil(diff - 90),
			// 	send = Math.ceil(diff + 30);
			log.d('[%d:%s] diff %j, going to unload users with tz > %d and send to users with %d > tz > %d', process.pid, this.anote.id, diff, del, del, send);

			return new Promise((resolve, reject) => {
				this.tz = {$lt: del, $gt: send};
				this.streamer.load(db, null, null, 1000000000, {$gte: del}).then((users) => {
					if (users && users.length) {
						log.d('[%d:%s] found %d users to skiptz: %j', process.pid, this.anote.id, users.length, users);
						this.streamer.unload(db, users.map(u => u._id)).then(() => {
							status += users.length;
							db.collection('messages').update({_id: this.aoid}, {$inc: {'result.processed': users.length, 'result.errors': users.length, 'result.errorCodes.skiptz': users.length}}, log.logdb('updating message with skiptz code'));
							resolve();
						}, reject);
					} else {
						log.d('[%d:%s] found 0 users to skiptz', process.pid, this.anote.id);
						resolve();
					}
				});
			});
		} else {
			return Promise.resolve();
		}
	}

	run (db, done, progress) {
		log.d('[%d:%s] going to run subjob %j: %j', process.pid, this.anote.id, this._idIpc, this._json);
		if (this.idx === 0) {
			log.d('[%d:%s] marking message as started from %j', process.pid, this.anote.id, this._idIpc);

			let query = {_id: this.anote._id, 'deleted': {$exists: false}},
				update = {$set: {'result.status': N.Status.InProcessing, 'result.delivered': 0}};

			if (this.failed) {
				update.$set['result.status'] = N.Status.Error;
				update.$set['result.error'] = this.failed;
				log.d('[%d:%s] Won\'t run %s because it has been failed in constructor: %j', process.pid, this.anote.id, this._idIpc, this.failed);
			}

			db.collection('messages').findAndModify(query, [['date', 1]], update, {'new': true}, (err, data) => {
				if (err || this.failed) {
					done(err || this.failed);
					this.abort();
				} else if (!data || !data.ok) {
					done('already running');
				} else {
					log.d('[%d:%s] message marked as started from %j', process.pid, this.anote.id, this._idIpc);
				}
			});
		}
		
		log.d('[%d:%s] Processing message %j', process.pid, this.anote.id, this.note);

		this.datas = [];
		this.locales = Object.keys(this.anote.content);
		this.locales.forEach((l, i) => {
			this.datas[i] = this.anote.content[l];
		});
		log.d('[%d:%s]: locales %j for datas %j', process.pid, this.anote.id, this.locales, this.datas);

		var status = {
			size: this.size,
			done: this.done,
			bookmark: this.bookmark
		};

		this.anote.nobuild = true;
		this.streamer = new Streamer(this.anote);

		log.d('[%d:%s]: Ready to stream with bookmark %s, first %s', process.pid, this.anote.id, status.bookmark, this.data.first);
		if (status.bookmark) {
			this._json.data.first = status.bookmark;
		}

		this.resource.send(this.datas, (count) => {
			log.d('[%d:%s]: Connection wants %d users', process.pid, this.anote.id, count);
			Promise.all([
				this.waitForAllPromises(),
				this.rejectUsersWhoPassedTz(db, status)
			]).then(() => {
				this.streamer.load(db, this.data.first, this.data.last, Math.max(count, 10), this.tz).then((users) => {
					// log.d('users %j', users);
					// bookmark is not first of next batch, but rather last status from previous
					// so it must be removed from array
					if (users.length && users[0]._id === status.bookmark) {
						users.shift();
					}
					var fed, lst;
					if (!users || users.length === 0) {
						log.d('[%d:%s]: Nothing to feed anymore', process.pid, this.anote.id);
						this.resource.feed([]);
					} else if (users.length === 1) {
						log.d('[%d:%s]: Feeding last user', process.pid, this.anote.id);
						fed = this.resource.feed(users.map(this.mapUser.bind(this)));

						status.size += fed;

						if (fed === 1) {
							log.d('[%d:%s]: Fed last user', process.pid, this.anote.id);
							this._json.data.first += ' final ';
						} else {
							log.w('[%d:%s]: Cannot feed last user', process.pid, this.anote.id);
						}
					} else {
						lst = users.pop();
						log.d('[%d:%s]: Going to feed %d users while %d is requested: %j / %j', process.pid, this.anote.id, users.length, count, users, lst);
						fed = this.resource.feed(users.map(this.mapUser.bind(this)));
					
						status.size += fed;

						log.d('[%d:%s]: Fed %j users out of %d', process.pid, this.anote.id, fed, users.length);
						if (fed === users.length) {
							log.d('[%d:%s]: Fed all %d users, next batch will start with %s', process.pid, this.anote.id, fed, lst._id);
							this._json.data.first = lst._id;
						} else if (fed < users.length && fed > 0) {
							log.d('[%d:%s]: Fed only %d users, next batch will start with %s', process.pid, this.anote.id, fed, users[fed]._id);
							this._json.data.first = users[fed]._id;
						}
					}
				}, (err) => {
					done(err || 'Error while loading users');
				});
			});
		}, (statuses) => {
			if (this.anote.creds.platform === N.Platform.APNS) {
				statuses.forEach(s => {
					if (s[2]) { 
						try {
							s[2] = s[1] === -200 ? undefined : JSON.parse(s[2]).reason;
						} catch (e) {
							log.e('[%s:%d]: Error parsing error from APNS: %j, %j', process.pid, this.anote.id, e, e.stack);
						}
					}
				});
			}
			// array: <user id>, <response code>[, <response error>][, <valid token>]
			// ['user id', -200,''] - Invalid token (unset)
			// ['user id', -200,'','something'] - Invalid token with valid token (replace old with new)
			// ['user id', -200,'something'] - Invalid token with error (unset + report error)
			// ['user id', 200,'something'] - Some error with status 200 (report error)
			// ['user id', 200] - Success
			var sent = statuses.filter(s => s[1] === 200  || (s[1] === -200 && s[3])).map(s => s[0]);
			var reset = statuses.filter(s => s[1] === -200 && s[3]);
			var unset = statuses.filter(s => s[1] === -200 && !s[3]).map(s => s[0]);
			var errors = statuses.filter(s => !!s[2]);

			log.d('[%d:%s]: Got %d statuses: %d sent, %d unset, %d reset, %d errors', process.pid, this.anote.id, statuses.length, sent.length, unset.length, reset.length, errors.length);
			// log.d('[%d:%s]: statuses %j', process.pid, this.anote.id, statuses);

			status.done += statuses.length;
			this.watchPromise(this.streamer.unload(db, statuses.map(s => s[0])));

			if (unset.length) {
				let q = {_id: {$in: unset}},
					$unset = {
						[this.fieldToken]: 1,
						[this.fieldIndex]: 1,
					};

				log.d('[%d:%s]: Unsetting %d tokens in %j: %j / %j', process.pid, this.anote.id, unset.length, 'app_users' + this.anote.creds.app_id, q, $unset);
				db.collection('app_users' + this.anote.creds.app_id).update(q, {$unset: $unset}, {multi: true}, log.logdb('unsetting tokens'));
			}

			if (reset.length) {
				reset.forEach(status => {
					db.collection('app_users' + this.anote.creds.app_id).updateOne({_id: status[0]}, {$set: {[this.fieldToken]: status[3]}}, log.logdb('updating push token'));
				});
			}

			if (statuses.length) {
				db.collection('messages').update({_id: this.aoid}, {$inc: {'result.sent': sent.length, 'result.processed': statuses.length, 'result.errors': errors.length}}, log.logdb('updating message with sent'));
			}

			if (sent.length) {
				db.collection('app_users' + this.anote.creds.app_id).update({_id: {$in: sent}}, {$push: {msgs: this.aoid}}, {multi: true}, log.logdb('adding message to app_users'));
				
				plugins.internalEvents.push('[CLY]_push_sent');
				plugins.internalEvents.push('[CLY]_push_action');
				plugins.internalDrillEvents.push('[CLY]_push_action');

				var params = {
					qstring: {
						events: [
							{ key: '[CLY]_push_sent', count: sent.length, segmentation: {i: '' + this.anote._id } }
						]
					},
					app_id: this.anote.creds.app_id,
					appTimezone: this.anote.creds.app_timezone.tz,
					time: require('../../../../api/utils/common.js').initTimeObj(this.anote.creds.app_timezone.tz)
				};

				log.d('Recording %d [CLY]_push_sent\'s: %j', sent.length, params);
				require('../../../../api/parts/data/events.js').processEvents(params);
			}

			if (errors.length) {
				let errorsInc = {};
				errors.forEach(status => {
					let key = 'result.errorCodes.' + this.anote.creds.platform + Math.abs(status[1]) + (status[2] ? '+' + status[2] : '');
					if (errorsInc[key]) {
						errorsInc[key]++;
					} else {
						errorsInc[key] = 1;
					}
				});
				log.d('[%d:%s]: setting error codes for %s: %j', process.pid, this.anote.id, this.anote._id, {$inc: errorsInc});
				db.collection('messages').update({_id: this.aoid}, {$inc: errorsInc}, log.logdb('updating message with error codes'));
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
				if (this.anote.tz !== false) {
					this.waitForAllPromises().then(() => {
						this.anote.tzs = [];
						this.streamer.loadTzs(db).then(() => {
							if (this.anote.tzs && this.anote.tzs.length) {
								log.d('[%d:%s]: %d tzs left: %j', process.pid, this.anote.id, this.anote.tzs.length, this.anote.tzs);
								
								var batch = new Date(this.anote.date.getTime() + (this.anote.tz - this.anote.tzs[0]) * 60000);
								log.d('[%d:%s]: Scheduling message with date %j to be sent in user timezones (tz %j, tzs %j): %j', process.pid, this.anote.id, this.anote.date, this.anote.tz, this.anote.tzs, batch);
							    jobs.job('push:send', {mid: this.aoid}).replace().once(batch);
							    db.collection('messages').updateOne({_id: this.aoid}, {$set: {'result.status': N.Status.InQueue, 'result.nextbatch': batch}}, log.logdb('when updating message status with inqueue'));
							} else {
								log.d('[%d:%s]: 0 tzs left, clearing streamer', process.pid, this.anote.id);
								this.streamer.clear(db);
							}
						});
					});
				}
			}
		}, (err) => {
			log.d('[%d]: Send promise returned error %j in %s', process.pid, err, this._idIpc);
			if (!this.completed) {
				this._json.data.bookmark = this.json.data.first;
				done(err || 'Unknown APN error');
				this.streamer.clear(db);
			}
		});
	}

	cancel (db) {
		return new Promise((resolve, reject) => {
			super.cancel().then(() => {
				let mid = this.note ? this.note._id : this.anote ? this.anote._id : this.data.mid;

				if (mid) {
					mid = typeof mid === 'string' ? db.ObjectID(mid) : mid;
	
					let query = {_id: mid},
						update = {$set: {'result.status': N.Status.Aborted, 'result.error': 'Cancelled'}};

					db.collection('messages').update(query, update, log.logdb('cancelling message', resolve, reject));
				}
			});
		});
	}

	_finish (err, save) {
		if (this.note) {
			log.d('[%d:%s]: Finishing send job with message %j', process.pid, this.note.id, this.data.mid);
			return new Promise((resolve, reject) => {
				this.db().collection('jobs').find({'data.mid': this.data.mid}).sort({next: 1}).toArray((error, jobs) => {
					if (error || !jobs || !jobs.length) {
						log.d('[%d:%s]: No further jobs found with message %j', process.pid, this.note.id, this.data.mid);
						super._finish(err, save).then(resolve, reject);
					} else {
						log.d('[%d:%s]: Found further jobs with message %j: %j', process.pid, this.note.id, this.data.mid, jobs);
						jobs.shift();
						if (jobs.length) {
							this.db().collection('jobs').update({_id: {$in: jobs.map(j => j._id)}}, {$set: {status: job.STATUS.CANCELLED}}, () => {
								log.d('[%d:%s]: Cancelled %d jobs %j for message %j', process.pid, this.note.id, jobs.length, jobs.map(j => j._id), this.data.mid);
								super._finish(err, save).then(resolve, reject);
							});
						} else {
							super._finish(err, save).then(resolve, reject);
						}
					}
				});
			});
		} else {
			return super._finish(err, save);
		}
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
