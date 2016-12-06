'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:send'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  STATUS = job.STATUS,
	  ConnectionResource = require('../parts/resource.js'),
	  creds = require('../parts/credentials.js'),
	  Streamer = require('../parts/streamer.js'),
	  Divider = require('../parts/divider.js'),
	  N = require('../parts/note.js');


class PushJob extends job.IPCJob {
	constructor(name, data) {
		super(name, data);
	}

	prepare (manager, db) {
		if (this.data.appsub) {
			log.d('[%d]: Preparing subjob %j (data %j)', process.pid, this._idIpc, this.data);
			this.anote = new N.AppSubNote(this.data.appsub);
			this.fieldToken = creds.DB_USER_MAP.tokens + '.' + this.anote.creds.field;
			this.fieldIndex = creds.DB_USER_MAP.tokens + this.anote.creds.field;
			return Promise.resolve();
		} else {
			log.d('[%d]: Preparing parent job %j (data %j)', process.pid, this._idIpc, this.data);
			return N.Note.load(db, db.ObjectID(this.data.mid)).then((note) => {
				this.note = note;
			});
		}
	}

	resourceName () {
		return 'send:' + this.anote.id;
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
		
		log.d('[%s:%d]: Dividing in %s (%j)', this.note.id, process.pid, this._id, this.note);
		return new Divider(this.note).divide(db, true).then((obj) => {
			log.d('[%s: %d]: Finished didivding message for job %j: %d in %d', this.note.id, process.pid, this._id, obj.subs.length, obj.workers);
			return obj;
		});
	}

	_subSaved () {
		log.d('[%s:%d]: In _subSaved', this.note ? this.note.id : this.anote.id, process.pid);
		return super._subSaved().then((set) => {
			log.d('[%s:%d]: super._subSaved %j for %s', this.note ? this.note.id : this.anote.id, process.pid, set, this.data.mid);
			this.db().collection('messages').findOne(this.data.mid, (/*err, message*/) => {
				let quer = {_id: this.data.mid},
					upda = {$set: {'result.status': this._json.status === STATUS.DONE ? N.Status.Done : N.Status.InProcessing, sent: new Date()}};

				if (this.isCompleted && this._json.error) {
					upda.$set['result.error'] = this._json.error;
					upda.$set['result.status'] = N.Status.Error;
				}

				this.db().collection('messages').updateOne(quer, upda, (err, res) => {
					if (err) {
						log.e('[%s:%d]: Couldn\'t update message %j', this.note ? this.note.id : this.anote.id, process.pid, err);
					} else if (res.result.nModified === 0) {
						log.w('[%s:%d]: Couldn\'t update message %j: %j', this.note ? this.note.id : this.anote.id, process.pid, this.data.mid, quer);
					}
				});
			});
		});
	}

	run (db, done, progress) {
		log.d('[%s:%d] going to run subjob %j: %j', this.anote.id, process.pid, this._idIpc, this._json);
		if (this.idx === 0) {
			log.d('[%s:%d] marking message as started from %j', this.anote.id, process.pid, this._idIpc);

			let query = {_id: this.anote._id, 'deleted': {$exists: false}},
				update = {$set: {'result.status': N.Status.InProcessing, 'result.delivered': 0}};

			if (this.failed) {
				update.$set['result.status'] = N.Status.Error;
				update.$set['result.error'] = this.failed;
				log.d('[%s:%d] Won\'t run %s because it has been failed in constructor: %j', this.anote.id, process.pid, this._idIpc, this.failed);
			}

			db.collection('messages').findAndModify(query, [['date', 1]], update, {'new': true}, (err, data) => {
				if (err || this.failed) {
					done(err || this.failed);
					this.abort();
				} else if (!data || !data.ok) {
					done('already running');
				} else {
					log.d('[%s:%d] message marked as started from %j', this.anote.id, process.pid, this._idIpc);
				}
			});
		}
		
		log.d('[%s:%d] Processing message %j', this.anote.id, process.pid, this.note);

		this.datas = [];
		this.locales = Object.keys(this.anote.content);
		this.locales.forEach((l, i) => {
			this.datas[i] = this.anote.content[l];
		});
		log.d('[%s:%d]: locales %j for datas %j', this.anote.id, process.pid, this.locales, this.datas);

		var status = {
			size: this.size,
			done: this.done,
			bookmark: this.bookmark
		};

		this.streamer = new Streamer(this.anote);

		log.d('[%s:%d]: Ready to stream with bookmark %s, first %s', this.anote.id, process.pid, status.bookmark, this.data.first);
		if (status.bookmark) {
			this._json.data.first = status.bookmark;
		}

		this.resource.send(this.datas, (count) => {
			this.streamer.load(db, this.data.first, this.data.last, Math.max(count, 10)).then((users) => {
				// bookmark is not first of next batch, but rather last status from previous
				// so it must be removed from array
				if (users.length && users[0]._id === status.bookmark) {
					users.shift();
				}
				var fed, lst;
				if (!users || users.length === 0) {
					log.d('Nothing to feed anymore');
					this.resource.feed([]);
				} else if (users.length === 1) {
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
					log.d('Going to feed %d users while %d is requested: %j / %j', users.length, count, users, lst);
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
			var codes = statuses.map(s => s[1]);
			var ids = statuses.filter(s => s[1] === 1).map(s => s[0]);
			var errors = codes.filter(s => s < 0).length;
			var unset = statuses.filter(s => s[1] === 0).map(s => s[0]);
			var sent = statuses.length - errors - unset.length;

			log.d('Got %d statuses: %d sent, %d unset, %d errors', statuses.length, sent, unset.length, errors);

			if (unset.length) {
				let q = unset.length === 1 ? {_id: unset[0]} : {_id: {$in: unset}},
					$unset = {
						[this.fieldToken]: 1,
						[this.fieldIndex]: 1,
					};

				log.d('[%d]: Unsetting %d tokens in %j: %j / %j, pulling %j', process.pid, unset.length, 'app_users' + this.app._id, q, $unset, message._id);
				db.collection('app_users' + this.app._id).update(q, {$unset: $unset}, {multi: true}, log.logdb('unsetting tokens'));
			}

			if (ids.length) {
				db.collection('app_users' + this.app._id).update({_id: {$in: ids}}, {$push: {msgs: this.anote._id}}, {multi: true}, log.logdb('adding message to app_users'));
			}

			if (statuses.length) {
				db.collection('messages').update({_id: this.anote._id}, {$inc: {'result.sent': sent, 'result.processed': statuses.length, 'result.errors': errors}}, log.logdb('updating message with sent'));
			}

			statuses.filter(s => s[1] === 2).forEach(status => {
				db.collection('app_users' + this.app._id).updateOne({_id: status[0]}, {$set: {[this.fieldToken]: status[2]}}, log.logdb('updating GCM token'));
			});

			status.done += statuses.length;

			if (sent) {
				var params = {
					qstring: {
						events: [
							{ key: '[CLY]_push_sent', count: sent, segmentation: {i: this.anote._id } }
						]
					},
					app_id: this.anote.creds.app_id,
					appTimezone: this.anote.creds.app_timezone,
					time: require('../../../../api/utils/common.js').initTimeObj(this.anote.creds.app_timezone)
				};

				require('../../../../api/parts/data/events.js').processEvents(params);
			}

			if (errors) {
				let errorsInc = {};
				codes.filter(s => s < 0).forEach(c => {
					let key = 'result.errorCodes.' + N.Platform.APNS + ((-1) * c);
					if (errorsInc[key]) {
						errorsInc[key]++;
					} else {
						errorsInc[key] = 1;
					}
				});
				log.d('setting error codes for %s: %j', this.anote._id, {$inc: errorsInc});
				db.collection('messages').update({_id: this.anote._id}, {$inc: errorsInc}, log.logdb('updating message with error codes'));
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
				this.streamer.clear(db);
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
				let query = {_id: this.anote._id},
					update = {$set: {'result.status': N.Status.Aborted, 'result.error': 'Cancelled'}};

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
