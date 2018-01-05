'use strict';

var common = require('../../../../api/utils/common.js'),
	os = require('os'),
	log = common.log('push:divider'),
	creds = require('./credentials.js'),
	N = require('./note.js'),
	Platform = N.Platform,
	Streamer = require('./streamer.js'),
	momenttz = require('moment-timezone');

const WORKER_CHUNK_SIZE = 100000;

class Divider {
	constructor (note) {
		this.note = note;
	}

	streamers (db) {
		log.d('Dividing note %j', this.note._id);

		return new Promise((resolve, reject) => {
			this.apps(db).then((apps) => {
				log.d('apps', apps);
				if (!apps || !apps.length) {
					return reject('No apps found');
				}

				if (apps.length > 1 && this.note.drillConditions) {
					return reject('Drill conditions can only be used for single-app messages');
				}


				var credentials = [];

				// Find all credentials we'll need
				apps.forEach((app) => {
					if (this.note.platforms.indexOf(Platform.APNS) !== -1 && app.apn && app.apn.length) { credentials.push.apply(credentials, app.apn); }
					if (this.note.platforms.indexOf(Platform.GCM) !== -1 && app.gcm && app.gcm.length) { credentials.push.apply(credentials, app.gcm); }

					if (app.timezone) {
						app.timezone_offset = momenttz.tz(app.timezone).utcOffset();
					} else {
						app.timezone_offset = 0;
					}
				});

				if (credentials.length) {
					log.d('Going to check following credentials: %j', credentials);
					credentials = credentials.map(c => new creds.Credentials(c._id));

					// Load credentials from db
					Promise.all(credentials.map(c => c.load(db))).then(() => {
						var subs = [];

						// apn/gcm level
						credentials.forEach(c => {
							// token field level
							c.divide(this.note.test).forEach(subc => {
								let app = apps.filter(a => (a.apn && a.apn.filter(ac => ac._id.equals(c._id)).length) || (a.gcm && a.gcm.filter(ac => ac._id.equals(c._id)).length))[0],
									appsubcred = subc.app(app._id, {tz: app.timezone, offset: app.timezone_offset}),
									appsubnote = this.note.appsub(subs.length, appsubcred),
									streamer = new Streamer(appsubnote);

								appsubnote.nobuild = !!this.note.build;
								log.d('Compiled appsub %j', appsubnote);
								
								subs.push({
									appsub: appsubnote,
									streamer: streamer
								});
							});
						});

						resolve(subs);
					}, reject);
				} else {
					reject('No credentials');
				}
			}, reject);
		});
	}

	subs (db, clear, audience) {
		return new Promise((resolve, reject) => {
			this.streamers(db).then(results => {
				if (audience === null) {
					results.forEach(result => result.streamer.clear(db));
					resolve();
				} else {
					Promise.all(results.map(result => new Promise((resolve, reject) => {
						 result.streamer[audience ? 'audience' : 'count'](db).then((count => {
						 	log.d('count %j', count);
						 	result[audience ? 'audience' : 'count'] = count;
						 	resolve(result);
						 }), reject);
					}))).then(resolve, reject);
				}
			}, reject);
		});
	}

	removeAll (db) {
		return new Promise((resolve, reject) => {
			this.streamers(db).then(results => {
				Promise.all(results.map(result => result.streamer.removeAll(db))).then(resolve, reject);
			}, reject);
		});
	}

	prepareAuto (db) {
		return this.removeAll(db);
		// return new Promise((resolve, reject) => {
		// 	this.streamers(db).then(results => {
		// 		Promise.all(results.map(result => result.streamer.removeAll(db))).then(resolve, reject);
		// 	}, reject);
		// });
	}

	nextDa (db) {
		return new Promise((resolve, reject) => {
			this.streamers(db).then(results => {
				Promise.all(results.map(result => result.streamer.nextDa(db))).then(results => {
					if (!results || !results.length) {
						reject('no results for nextDa');
					} else {
						results = results.filter(r => !!r);
						if (results.length) {
							resolve(Math.min(results));
						} else {
							resolve();
						}
					}
				}, reject);
			}, reject);
		});
	}

	clear (db) {
		return this.subs(db, true, null);
	}

	audience (db, skipClear) {
		log.d('Audiencing note %j skipClear %j', this.note._id, skipClear);
		return new Promise((resolve, reject) => {
			this.subs(db, !skipClear, true).then((subs) => {
				log.d('Done audiencing in divider: %j', subs);
				var TOTALLY = {TOTALLY: 0};
				for (var i in subs) {
					var sub = subs[i];
					// if (!TOTALLY[field]) {
						// TOTALLY[field] = {TOTALLY: 0};
					// }
					// var L = TOTALLY[field];
					for (let i in sub.audience) {
						let a = sub.audience[i];
						// if (!L[a._id]) { L[a._id] = a.count; }
						// else { L[a._id] += a.count; }
						if (!TOTALLY[a._id]) { TOTALLY[a._id] = a.count; }
						else { TOTALLY[a._id] += a.count; }
						TOTALLY.TOTALLY += a.count;
					}
				}
				log.d('Done counting %j', TOTALLY);
				resolve(TOTALLY);
			}, reject);
		});
	}

	divide (db, skipClear/*, transient*/) {
		log.d('Dividing note %j skipClear %j', this.note._id, skipClear);

		return new Promise((resolve, reject) => {
			// var workerCount = 1;
			let workerCount = (common.config.api.workers || os.cpus().length) * 2;
			// Then, for each app-platform combination whenver audience is too big for one core, split it between multiple cores
			this.subs(db, !skipClear).then((subs) => {
				log.d('Counted all audience for note %j: %d results', this.note._id, subs.length);
				subs.filter(s => s.count <= 0).forEach(s => s.streamer.clear(db));
				
				subs = subs.filter(s => s.count > 0);

				if (subs.length === 0) {
					return reject('No audience found');
				}

				var total = subs.map(x => x.count).reduce((a, b) => a + b),
					chunk = WORKER_CHUNK_SIZE,
					chunks = Math.max(1, Math.ceil(total / chunk));
				// var total = subs.reduce((p, c) => {
				// 		return {count: p.count + c.count};
				// 	}).count,
				// 	minChunk = MIN_WORKER_CHUNK_SIZE,
					// workerCount = 1 /* (common.config.api.workers || os.cpus().length) * 2 */,
					// chunk = Math.max(total / workerCount, minChunk),
					// chunks = Math.max(1, Math.round(total / chunk));

				log.d('Message %j will have %d subs (%d recipients, ~%d per worker, max %d workers at a time) after filtering empty audiences', this.note._id, chunks, total, chunk, workerCount);

				var divisors = subs.map(s => new Promise((resolve, reject) => {
					var data = {
							appsub: s.appsub
						};

					if (this.note.tz !== false || s.count < 1.5 * chunk) {
						resolve([{data: Object.assign({size: s.count}, data)}]);
					} else {
						var parts = [];
						var next = (skip, count) => {
							db.collection(s.streamer.collection()).find().skip(skip).limit(2).toArray((err, first) => {
								log.d('nexting %j / %j', err, first);
								if (err) {
									reject(err);
								} else if (!first || !first.length) {
									log.d('No document after skipping ' + skip + ' in ' + s.streamer.collection());
									resolve(parts);
									// reject('No document after skipping ' + start + ' in ' + 'app_users' + sub.appId + ' for ' + sub.query);
								} else {
									if (parts.length) {
										if (first.length === 2) {
											var prev = parts[parts.length - 1];
											prev.data.last = first[0]._id;
											parts.push({data: Object.assign({size: count, first: first[1]._id}, data)});
											log.d('[%d]: Added sub for %d devices from %j, set last to ', process.pid, count, first[1]._id, prev.data.last);
											next(skip + count, count);
										} else if (first.length === 1) {
											// double-sized chunk here
											resolve(parts);
										}
									} else {
										parts.push({data: Object.assign({size: count, first: first[0]._id}, data)});
										log.d('[%d]: Added sub for %d devices from %j', process.pid, count, first[0]._id);
										if (first.length === 2) {
											next(skip + count, count);
										} else if (first.length === 1) {
											// just to save an expensive query when sending to 1 heavily drilled user
											resolve(parts);
										}
									}
								}
							});
						};

						next(0, chunk);
					}

				}));

				// Once done dividing, save all divisions to message document and create corresponding subjobs
				Promise.all(divisors).then((subs) => {
					let ret = [];
					subs.forEach(subs => ret = ret.concat(subs));
					log.d('Done dividing message %j totalling %d workers with %d subs: %j', this.note._id, workerCount, ret.length, ret);
					resolve({subs: ret, workers: Math.min(workerCount, ret.length)});
				}, reject);
			}, reject);

		});
	}

	apps (db) {
		log.d('Looking for apps %j', this.note.apps);
		return new Promise((resolve, reject) => {
			var apps = this.note.apps.map(a => typeof a === 'string' ? db.ObjectID(a) : a);
			db.collection('apps').find({_id: {$in: apps}}).toArray((err, apps) => {
				if (err || !apps.length) { reject(err || 'Apps not found'); }
				else { resolve(apps); }
			});
		});
	}

	store (db, app, uids, now) {
		return new Promise((resolve, reject) => {
			db.collection('app_users' + app._id).find({uid: {$in: uids}}, {la: 1, tz: 1, msgs: 1, tk: 1}).toArray((err, users) => {
				if (err) {
					reject(err);
				} else if (!users || !users.length) {
					log.w('Users %j not found for app %j', uids, app);
					resolve();
				} else {
					if (this.note.autoCapMessages) {
						users = users.filter(user => {
							return !user.msgs || user.msgs.filter(msg => {
								return msg.length === 2 && msg[0].equals(this.note._id);
							}).length < this.note.autoCapMessages;
						});
						log.d('After capping messages number left %d users for note %j', users.length, this.note._id);
					}

					if (this.note.autoCapSleep) {
						users = users.filter(user => {
							let same = !user.msgs ? [] : user.msgs.filter(msg => {
								return msg.length === 2 && msg[0].equals(this.note._id);
							}).map(msg => msg[1]);

							return same.length === 0 || Math.max(same) < now.getTime() - this.note.autoCapSleep;
						});
						log.d('After capping messages sleep left %d users for note %j', users.length, this.note._id);
					}

					this.streamers(db).then(subs => {
						Promise.all(subs.map(sub => sub.streamer.store(db, users, now))).then((results) => {
							var saved = results.reduce((a, b) => a + b);
							resolve(saved);
						}, reject);
					}, reject);
				}
			});
		});
	}
}

module.exports = Divider;

