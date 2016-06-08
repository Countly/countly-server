'use strict';

var common = require('../../../../api/utils/common.js'),
	os = require('os'),
	log = common.log('push:divider'),
	credentials = require('./credentials.js'),
	Streamer = require('./streamer.js');

const MIN_WORKER_CHUNK_SIZE = 1000;
const WORKER_CHUNK_SIZE = 10000;

class Divider {
	constructor (message) {
		this.message = message;
	}

	subs (db, clear, audience) {
		log.d('Dividing message %j', this.message._id);

		return new Promise((resolve, reject) => {
			this.apps(db).then((apps) => {
				if (!apps || !apps.length) {
					return reject('No apps found');
				}

				if (apps.length > 1 && this.message.hasDrillConditions()) {
					return reject('Drill conditions can only be used for single-app messages');
				}

				var subs = [];

				// First, we need to count audience for each app-platform combination
				apps.forEach((app) => {
					var creds = credentials.credentials(this.message, app);

					log.d('Dividing message %j app %j, credentials %j', this.message._id, app._id, creds);

					creds.forEach((creds) => {

						subs.push(new Promise((resolve, reject) => {
							let pushly = this.message.toPushly(creds, this.message.dividerQuery(), [''+ app._id, creds.id]);
							let streamer = new Streamer(pushly, app);
							log.d('Streamer is going to count %j', pushly);

							streamer[audience ? 'audience' : 'count'](db).then((count) => {
								if (clear) { streamer.clear(db); }
								resolve({
									mid: this.message._id,
									app: app,
									pushly: pushly,
									streamer: streamer,
									[audience ? 'audience' : 'count']: count,
									field: pushly.credentials.id.split('.')[0]
								});
							}, reject);
						}));
					});
				});

				Promise.all(subs).then(resolve, reject);
			}, reject);
		});
	}

	count (db, skipClear) {
		return new Promise((resolve, reject) => {
			this.subs(db, !skipClear).then((subs) => {
				var TOTALLY = {TOTALLY: 0};
				for (var i in subs) {
					var sub = subs[i], field = credentials.DB_USER_MAP.tokens + '.' + sub.field;
					TOTALLY[field] = sub.count;
					TOTALLY.TOTALLY += sub.count;
				}
				log.d('Done counting %j', TOTALLY);
				resolve(TOTALLY);
			}, reject);
		});
	}

	audience (db, skipClear) {
		return new Promise((resolve, reject) => {
			this.subs(db, !skipClear, true).then((subs) => {
				log.d('Done audiencing in divider: %j', subs);
				var TOTALLY = {TOTALLY: 0};
				for (var i in subs) {
					var sub = subs[i], field = credentials.DB_USER_MAP.tokens + '.' + sub.field;
					if (!TOTALLY[field]) {
						TOTALLY[field] = {TOTALLY: 0};
					}
					var L = TOTALLY[field];
					for (let i in sub.audience) {
						let a = sub.audience[i];
						if (!L[a._id]) { L[a._id] = a.count; }
						else { L[a._id] += a.count; }
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

	divide (db, skipClear, transient) {
		log.d('Dividing message %j', this.message._id);


		return new Promise((resolve, reject) => {
			// var workerCount = 1;
			let workerCount = (common.config.api.workers || os.cpus().length) * 2;
			// Then, for each app-platform combination whenver audience is too big for one core, split it between multiple cores
			this.subs(db, !skipClear).then((subs) => {
				log.d('Counted all audience for message %j: %d results', this.message._id, subs);
				subs.filter(s => s.count === 0).forEach(s => s.streamer.clear(db));
				
				subs = subs.filter(s => s.count > 0);

				if (subs.length === 0) {
					return reject('No audience found');
				}

				var total = subs.reduce((p, c) => {
						return {count: p.count + c.count};
					}).count,
					chunk = WORKER_CHUNK_SIZE,
					chunks = Math.max(1, Math.ceil(total / chunk));
				// var total = subs.reduce((p, c) => {
				// 		return {count: p.count + c.count};
				// 	}).count,
				// 	minChunk = MIN_WORKER_CHUNK_SIZE,
					// workerCount = 1 /* (common.config.api.workers || os.cpus().length) * 2 */,
					// chunk = Math.max(total / workerCount, minChunk),
					// chunks = Math.max(1, Math.round(total / chunk));

				log.d('Message %j will have %d subs (%d recipients, ~%d per worker, max %d workers at a time) after filtering empty audiences', this.message._id, chunks, total, chunk, workerCount);

				var divisors = subs.map(s => new Promise((resolve, reject) => {
					var data = {
							mid: s.mid,
							appId: s.app._id,
							pushly: s.pushly
						};

					if (s.count < 1.5 * chunk) {
						resolve([{data: Object.assign({size: s.count}, data)}]);
					} else {
						var parts = [];
						var next = (skip, count) => {
							db.collection(s.streamer.collection()).find().skip(skip).limit(2).toArray((err, first) => {
								log.d('nexting %j / %j', err, first);
								if (err) {
									reject(err);
								} else if (!first || !first.length) {
									log.d('No document after skipping ' + skip + ' in ' + 'app_users' + s.appId + ' for ' + s.query);
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
					log.d('Done dividing message %j totalling %d workers with %d subs: %j', this.message._id, workerCount, ret.length, ret);
					resolve({subs: ret, workers: workerCount});
				}, reject);
			}, reject);

		});
	}

	apps (db) {
		log.d('Looking for apps %j', this.message.apps.map(common.db.ObjectID));
		return new Promise((resolve, reject) => {
			db.collection('apps').find({_id: {$in: this.message.apps.map(common.db.ObjectID)}}).toArray((err, apps) => {
				if (err) { reject(err); }
				else { resolve(apps); }
			});
		});
	}
}

module.exports = Divider;

