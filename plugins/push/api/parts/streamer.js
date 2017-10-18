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
			la: 1
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
				log.d('Dropped streamer collection, error %j', err);
				if (err) { 
					if (this.anote.nobuild) {
						log.d('[%d:%s]: Ignoring drop error for %s since nobuild is set', process.pid, this.anote.id, this.collection(), err);
						resolve();
					} else {
						reject(err); 
					}
				}
				else { resolve(); }
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

						log.i('[%s]: Drilling: %j', process.pid, this.anote.id, params);

						this.drill().drill.fetchUsers(params, (err, uids) => {
							query = Object.assign({}, this.anote.query.user || {});
							query[common.dbUserMap.tokens + this.field] = true;

							log.i('[%s]: Counting with drill of %d users: %j', process.pid, this.anote.id, uids.length, query);
							query.uid = {$in: uids};

							db.collection('app_users' + this.anote.creds.app_id).aggregate([
								{$match: query}, 
								{$project: this.projection},
								{$sort: {_id: 1}},
								{$out: this.collection()}
							], {allowDiskUse:true}, (err) => {
								log.d('[%d:%s]: Aggregation done: %j', process.pid, this.anote.id, arguments);
								if (err) {
									log.d('[%d:%s]: >>>>>>>>>>>>>>>> Running aggregation second time!!!1111 <<<<<<<<<<<<<<<<<<', process.pid, this.anote.id);
									db.collection('app_users' + this.anote.creds.app_id).aggregate([
										{$match: query}, 
										{$project: this.projection},
										{$sort: {_id: 1}},
										{$out: this.collection()}
									], {allowDiskUse:true}, (err) => {
										log.d('[%d:%s]: 2nd Aggregation done: %j', process.pid, this.anote.id, arguments);
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
							{$sort: {_id: 1}},
							{$out: this.collection()}
						], {allowDiskUse:true}, (err) => {
							log.d('[%d:%s]: Aggregation done: %j', process.pid, this.anote.id, arguments);
							if (err) {
								log.d('[%d:%s]: >>>>>>>>>>>>>>>> Running aggregation second time!!!1111 <<<<<<<<<<<<<<<<<<', process.pid, this.anote.id);
								db.collection('app_users' + this.anote.creds.app_id).aggregate([
									{$match: query},
									{$project: this.projection},
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
				db.collection(this.built).count((err, count) => {
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
				db.collection(this.built).aggregate([{$match: {}}, {$group: {_id: '$la', count: {$sum: 1}}}], (err, count) => {
					log.d('[%d:%s]: Counted grouping by lang collection %j: %j', process.pid, this.anote.id, this.collection(), count);
					if (err) { reject(err); }
					else { 
						if (this.anote.tz !== false) {
							this.loadTzs(db).then(resolve.bind(null, count), reject);
						} else {
							resolve(count); 
						}
					}
				});
			}, reject);
		});
	}

	loadTzs (db) {
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).distinct('tz', (err, tzs) => {
				if (err) {
					reject(err);
				} else {
					this.anote.tzs = tzs || [];
					this.anote.tzs.sort((a, b) => b - a);
					resolve();
				}
			});
		});
	}

	load (db, first, last, count, tz) {
		log.d('[%d:%s]: Loading streamer for %j from %s to %s, totalling %d', process.pid, this.anote.id, first, last, count);
		return new Promise((resolve, reject) => {
			this.build(db).then(() => {
				let q = {};
				if (first) { q._id = {$gte: first}; }
				if (last) { 
					if (!q._id) { q._id = {}; }
					q._id.$lte = last;
				}
				if (tz) {
					q.tz = tz;
				}
				db.collection(this.built).find(q).sort({_id: 1}).limit(count || 100000).toArray((err, devices) => {
					if (err) { reject(err); }
					else { resolve(devices); }
				});
			}, reject);
		});
	}

	unload (db, ids) {
		return new Promise((resolve, reject) => {
			log.d('[%d:%s]: Removing users from collection %s [%j ... %j]', process.pid, this.anote.id, this.built, ids[0], ids[ids.length - 1]);
			// resolve();
			db.collection(this.built).remove({_id: {$in: ids}}, (err, ok) => {
				if (err) { reject(err); }
				else { 
					log.d('[%d:%s]: Removed %j users from collection %s', process.pid, this.anote.id, ok, this.built);
					resolve(); 
				}
			});
		});
	}
}


module.exports = Streamer;