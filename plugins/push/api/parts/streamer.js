'use strict';

const common = require('../../../../api/utils/common.js'),
      plugins = require('../../../pluginManager.js'),
      credentials = require('./credentials.js'),
	  log = common.log('push:streamer');

class Streamer {
	constructor (appsubnote) {
		this.anote = appsubnote;
		this.field = this.anote.creds.field;
		this.projection = {
			tz: {$ifNull: ['$tz', this.anote.creds.app_timezone.offset]},
			_id: 1, 
			[credentials.DB_USER_MAP.tokens + this.field]: '$' + credentials.DB_USER_MAP.tokens + '.' + this.field, 
			la: 1,
		};
		this.projection2 = {
			_id: 1,
			[credentials.DB_USER_MAP.tokens + this.field]: 1,
			la: 1,
			tz: 1,
			da: {$subtract: [(this.anote.date || new Date()).getTime() - (this.anote.tz || 0) * 60000, {$multiply: [60000, '$tz']} ]}
		};
	}

	drill () {
		return plugins.getPluginsApis().drill || null;
	}

	collection () {
		return 'push_' + common.crypto.createHash('sha1').update(this.anote.id).digest('hex');
	}

	clear (db) {
		log.d('[%d:%s]: Clearing streamer for %s', process.pid, this.anote.id, this.collection());
		return new Promise((resolve, reject) => {
			// resolve();
			db.collection(this.collection()).drop((err) => {
				if (err) { 
					if (this.anote.nobuild) {
						resolve();
					} else {
						log.d('[%d:%s]: Error when dropping push_ collection', process.pid, this.anote.id, this.collection(), err);
						reject(err); 
					}
				}
				else { resolve(); }
			});
		});
	}

	removeAll (db) {
		log.d('[%d:%s]: Removing users from streamer for %s', process.pid, this.anote.id, this.collection());
		return new Promise((resolve) => {
			db.collection(this.collection()).remove({}, (err) => {
				log.d('Removed users from streamer collection, error %j', err);
				resolve();
			});
		});
	}

	build (db) {
		log.d('[%d:%s]: Building streamer', process.pid, this.anote.id);
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).count((err, count) => {
				log.d('[%d:%s]: First %s.count() returned %j / %j', process.pid, this.anote.id, this.collection(), err, count);
				if (!err && count) {
					this.built = this.collection();
					log.d('[%d:%s]: Already built collection %j', process.pid, this.anote.id, this.built);
					resolve(this.built);
				} else if (this.anote.nobuild) {
					this.built = this.collection();
					log.d('[%d:%s]: No build for collection %j', process.pid, this.anote.id, this.built);
					resolve(this.built);
				} else {
					var query;
					log.d('[%d:%s]: Building audience for %j', process.pid, this.anote.id, this.anote);
					
					if (this.anote.query && this.anote.query.drill) {
						if (!this.drill()) {
							return reject('[%s]: Drill is not enabled while message has drill conditions', this.anote.id);
						}

						this.drill().openDrillDb();

						var params = {
							time: common.initTimeObj(this.anote.creds.app_timezone.tz, Date.now()),
							qstring: Object.assign({app_id: this.anote.creds.app_id.toString()}, this.anote.query.drill)
						};
                        
                        //check for cohort query
                        var cohorts = {}, i;
                        if(params.qstring.queryObject.chr){
                            if(params.qstring.queryObject.chr.$in && params.qstring.queryObject.chr.$in.length){
                                for(i = 0; i < params.qstring.queryObject.chr.$in.length; i++){
                                    cohorts["chr."+params.qstring.queryObject.chr.$in[i]+".in"] = "true";
                                }
                            }
                            if(params.qstring.queryObject.chr.$nin && params.qstring.queryObject.chr.$nin.length){
                                for(i = 0; i < params.qstring.queryObject.chr.$nin.length; i++){
                                    cohorts["chr."+params.qstring.queryObject.chr.$nin[i]+".in"] = {$exists:false};
                                }
                            }
                            delete params.qstring.queryObject.chr;
                        }

						log.i('[%s]: Drilling: %j', process.pid, this.anote.id, params);

						this.drill().drill.fetchUsers(params, (err, uids) => {
							query = Object.assign({}, this.anote.query.user || {}, cohorts);
							query[common.dbUserMap.tokens + this.field] = true;

							log.i('[%s]: Counting with drill of %d users: %j', process.pid, this.anote.id, uids.length, query);
							query.uid = {$in: uids};

							db.collection('app_users' + this.anote.creds.app_id).aggregate([
								{$match: query}, 
								{$project: this.projection},
								{$project: this.projection2},
								{$sort: {_id: 1}},
								{$out: this.collection()}
							], {allowDiskUse:true}, (err, res) => {
								log.d('[%d:%s]: Aggregation done: %j', process.pid, this.anote.id, res);
								if (err) {
									log.d('[%d:%s]: >>>>>>>>>>>>>>>> Running aggregation second time!!!1111 <<<<<<<<<<<<<<<<<<', process.pid, this.anote.id);
									db.collection('app_users' + this.anote.creds.app_id).aggregate([
										{$match: query}, 
										{$project: this.projection},
										{$project: this.projection2},
										{$sort: {_id: 1}},
										{$out: this.collection()}
									], {allowDiskUse:true}, (err, res) => {
										log.d('[%d:%s]: 2nd Aggregation done: %j', process.pid, this.anote.id, res);
										if (err) {
											reject(err);
										} else {
											this.built = this.collection();
											log.d('[%d:%s]: 2nd Just built collection %j after drilling', process.pid, this.anote.id, this.built);
											resolve(this.built);
										}
									});
								} else {
									this.built = this.collection();
									log.d('[%d:%s]: Just built collection %j after drilling', process.pid, this.anote.id, this.built);
									resolve(this.built);
								}
							});
						}, db);
					} else {
						query = this.anote.query ? Object.assign({}, this.anote.query.user || {}) : {};
						query[common.dbUserMap.tokens + this.field] = true;

						log.d('[%d:%s]: Not drilling %j to %s', process.pid, this.anote.id, {$match: query}, this.collection());
						db.collection('app_users' + this.anote.creds.app_id).aggregate([
							{$match: query},
							{$project: this.projection},
							{$project: this.projection2},
							{$sort: {_id: 1}},
							{$out: this.collection()}
						], {allowDiskUse:true}, (err) => {
							log.d('[%d:%s]: Aggregation done: %j', process.pid, this.anote.id, arguments);
							if (err) {
								log.d('[%d:%s]: >>>>>>>>>>>>>>>> Running aggregation second time!!!1111 <<<<<<<<<<<<<<<<<<', process.pid, this.anote.id);
								db.collection('app_users' + this.anote.creds.app_id).aggregate([
									{$match: query},
									{$project: this.projection},
									{$project: this.projection2},
									{$sort: {_id: 1}},
									{$out: this.collection()}
								], {allowDiskUse:true}, (err) => {
									log.d('[%d:%s]: 2nd Aggregation done: %j', process.pid, this.anote.id, arguments);
									if (err) {
										reject(err);
									} else {
										this.built = this.collection();
										log.d('[%d:%s]: 2nd Just built collection %j', process.pid, this.anote.id, this.built);
										resolve(this.built);
									}
								});
							} else {
								this.built = this.collection();
								log.d('[%d:%s]: Just built collection %j', process.pid, this.anote.id, this.built);
								resolve(this.built);
							}
						});
					}
				}
			});
		});
	}

	count (db) {
		log.d('[%d:%s]: Counting streamer', process.pid, this.anote.id);
		return new Promise((resolve, reject) => {
			this.build(db).then(() => {
				log.d('[%d:%s]: Counting collection %j', process.pid, this.anote.id, this.collection());
				db.collection(this.collection()).count((err, count) => {
					log.d('[%d:%s]: Counted collection %j: %j', process.pid, this.anote.id, this.collection(), count);
					if (err) { reject(err); }
					else { resolve(count); }
				});
			}, reject);
		});
	}

	audience (db) {
		log.d('[%d:%s]: Audiencing streamer', process.pid, this.anote.id);
		return new Promise((resolve, reject) => {
			this.build(db).then(() => {
				log.d('[%d:%s]: Counting grouping by lang collection %j', process.pid, this.anote.id, this.collection());
				db.collection(this.collection()).aggregate([{$match: {}}, {$group: {_id: '$la', count: {$sum: 1}}}], (err, count) => {
					log.d('[%d:%s]: Counted grouping by lang collection %j: %j', process.pid, this.anote.id, this.collection(), count);
					if (err) { reject(err); }
					else { 
						resolve(count); 
					}
				});
			}, reject);
		});
	}

	load (db, first, last, count, mindate, maxdate) {
		log.d('[%d:%s]: Loading streamer for %j from %s to %s, totalling %d', process.pid, this.anote.id, first, last, count);
		return new Promise((resolve, reject) => {
			(this.anote.auto ? Promise.resolve() : this.build(db)).then(() => {
				let q = {};
				if (first) { q._id = {$gte: first}; }
				if (last) { 
					if (!q._id) { q._id = {}; }
					q._id.$lte = last;
				}
				if (mindate && maxdate) {
					q.da = {$gte: mindate, $lte: maxdate};
				}
				log.d('[%d:%s]: Loading users with %j', process.pid, this.anote.id, q);
				db.collection(this.collection()).find(q).sort({_id: 1}).limit(count || 100000).toArray((err, devices) => {
					if (err) { reject(err); }
					else { resolve(devices); }
				});
			}, reject);
		});
	}

	unload (db, ids) {
		return new Promise((resolve, reject) => {
			if (typeof ids === 'number') {
				log.d('[%d:%s]: Removing users from collection %s with da < %j', process.pid, this.anote.id, this.built, ids);
			} else {
				log.d('[%d:%s]: Removing users from collection %s [%j ... %j]', process.pid, this.anote.id, this.built, ids[0], ids[ids.length - 1]);
			}
			// resolve();
			db.collection(this.collection()).remove(typeof ids === 'number' ? {da: {$lt: ids}} : {_id: {$in: ids}}, (err, ok) => {
				if (err) { reject(err); }
				else { 
					var unloaded = ok && ok.result && ok.result.n ? ok.result.n : 0;
					log.d('[%d:%s]: Removed %j users from collection %s, tz %j', process.pid, this.anote.id, ok, this.built, this.anote.tz);
					if (this.anote.auto || (this.anote.tz !== false && typeof this.anote.tz !== 'undefined')) {
						db.collection(this.collection()).find({}, {da: 1}).sort({da: 1}).limit(1).toArray((err, min) => {
							if (err) { reject(err); }
							else if (!min || !min.length) { resolve({unloaded: unloaded}); }
							else {
								resolve({next: min[0].da, unloaded: unloaded});
							}
						});
					} else {
						resolve(); 
					}
				}
			});
		});
	}

	nextDa (db) {
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).find({}, {da: 1}).sort({da: 1}).limit(1).toArray((err, min) => {
				if (err) { reject(err); }
				else if (!min || !min.length) { resolve(); }
				else {
					resolve(min[0].da);
				}
			});
		});
	}

	store (db, users, now) {
		log.i('[%d:%s]: %s Storing %d users', process.pid, this.anote.id, now, users.length);
		return new Promise((resolve, reject) => {
			var autoDate, serverOffset = new Date().getTimezoneOffset() || 0;
			if (this.anote.autoTime) {
				autoDate = new Date(now.getTime());
				autoDate.setHours(0);
				autoDate.setMinutes(0);
				autoDate.setSeconds(0);
				autoDate.setMilliseconds(0);
				autoDate = new Date(autoDate.getTime() + this.anote.autoTime);
			}

			// log.i('[%d:%s]: Storing %j for field %j', process.pid, this.anote.id, users, this.field);
			users = users.filter(u => u[credentials.DB_USER_MAP.tokens] && u[credentials.DB_USER_MAP.tokens][this.field]);
			if (users.length === 0) {
				log.d('[%d:%s]: no users with tokens: %j', process.pid, this.anote.id, users);
				return resolve(0);
			}

			Promise.all(users.map(user => {
				// log.i('[%d:%s]: user tz %j app tz %j, now %s', process.pid, this.anote.id, user.tz, this.anote.creds.app_timezone.offset, now);
				user.tz = typeof user.tz === 'undefined' ? this.anote.creds.app_timezone.offset : user.tz;
				user.da = now.getTime();

				if (this.anote.autoDelay) {
					user.da = user.da + this.anote.autoDelay;
				}
				if (autoDate) {
					var inTz = autoDate.getTime() + (serverOffset - user.tz) * 60000;
					if (inTz < user.da) {
						user.da = inTz + 24 * 60 * 60000;
					} else {
						user.da = inTz;
					}
				}

				if (this.anote.autoEnd < user.da) {
					return resolve(0);
				}

				log.d('[%d:%s]: Storing user %s to be sent on %j', process.pid, this.anote.id, user._id, new Date(user.da));
				return new Promise((resolve, reject) => {
					db.collection(this.collection()).save({
						_id: user._id,
						[credentials.DB_USER_MAP.tokens + this.field]: user[credentials.DB_USER_MAP.tokens][this.field],
						la: user.la,
						tz: user.tz,
						da: user.da
					}, (err) => {
						if (err) { reject(err); }
						else { resolve(1); }
					});
				});
			})).then(results => {
				resolve(results.filter(r => !!r).length);
			}, reject);
		});
	}

}


module.exports = Streamer;