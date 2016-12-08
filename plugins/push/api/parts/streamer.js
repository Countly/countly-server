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
			_id: 1, 
			[credentials.DB_USER_MAP.tokens + this.field]: '$' + credentials.DB_USER_MAP.tokens + '.' + this.field, 
			la: 1,
			tz: 1
		};
	}

	drill () {
		return plugins.getPluginsApis().drill || null;
	}

	collection () {
		return 'push_' + common.crypto.createHash('sha1').update(this.anote.id).digest('hex');
	}

	clear (db) {
		log.d('[%s]: Clearing streamer for %s', this.anote.id, this.collection());
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).drop((err) => {
				log.d('Dropped streamer collection, error %j', err);
				if (err) { reject(err); }
				else { resolve(); }
			});
		});
	}

	build (db) {
		log.d('[%s]: Building streamer', this.anote.id);
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).count((err, count) => {
				log.d('[%s]: First %s.count() returned %j / %j', this.anote.id, this.collection(), err, count);
				if (!err && count) {
					this.built = this.collection();
					log.d('[%s]: Already built collection %j', this.anote.id, this.built);
					resolve(this.built);
				} else {
					var query;
					log.d('[%s]: Building audience', this.anote.id);
					
					if (this.anote.query && this.anote.query.drill) {
						if (!this.drill()) {
							return reject('[%s]: Drill is not enabled while message has drill conditions', this.anote.id);
						}

						this.drill().openDrillDb();

						var params = {
							time: common.initTimeObj(this.anote.creds.app_timezone, Date.now()),
							qstring: Object.assign({app_id: this.anote.creds.app_id.toString()}, this.anote.query.drill)
						};

						log.i('[%s]: Drilling: %j', this.anote.id, params);

						this.drill().drill.fetchUsers(params, (err, uids) => {
							query = this.anote.query.user || {};
							query[common.dbUserMap.tokens + this.field] = true;

							log.i('[%s]: Counting with drill of %d users: %j', this.anote.id, uids.length, query);
							query.uid = {$in: uids};

							db.collection('app_users' + this.anote.creds.app_id).aggregate([
								{$match: query}, 
								{$project: this.projection},
								{$sort: {_id: 1}},
								{$out: this.collection()}
							], {allowDiskUse:true}, (err) => {
								log.d('[%s]: Aggregation done: %j', this.anote.id, arguments);
								if (err) {
									reject(err);
								} else {
									this.built = this.collection();
									log.d('[%s]: Just built collection %j after drilling', this.anote.id, this.built);
									resolve(this.built);
								}
							});
						});
					} else {
						query = this.anote.query ? this.anote.query.user || {} : {};
						query[common.dbUserMap.tokens + this.field] = true;

						log.d('[%s]: Not drilling %j to %s', this.anote.id, {$match: query}, this.collection());
						db.collection('app_users' + this.anote.creds.app_id).aggregate([
							{$match: query},
							{$project: this.projection},
							{$sort: {_id: 1}},
							{$out: this.collection()}
						], {allowDiskUse:true}, (err) => {
							if (err) {
								reject(err);
							} else {
								this.built = this.collection();
								log.d('[%s]: Just built collection %j', this.anote.id, this.built);
								resolve(this.built);
							}
						});
					}
				}
			});
		});
	}

	count (db) {
		log.d('[%s]: Counting streamer', this.anote.id);
		return new Promise((resolve, reject) => {
			this.build(db).then(() => {
				log.d('[%s]: Counting collection %j', this.collection());
				db.collection(this.built).count((err, count) => {
					log.d('[%s]: Counted collection %j: %j', this.anote.id, this.collection(), count);
					if (err) { reject(err); }
					else { resolve(count); }
				});
			}, reject);
		});
	}

	audience (db) {
		log.d('[%s]: Audiencing streamer for %j', this.anote.id);
		return new Promise((resolve, reject) => {
			this.build(db).then(() => {
				log.d('[%s]: Counting grouping by lang collection %j', this.anote.id, this.collection());
				db.collection(this.built).aggregate([{$match: {}}, {$group: {_id: '$la', count: {$sum: 1}}}], (err, count) => {
					log.d('[%s]: Counted grouping by lang collection %j: %j', this.anote.id, this.collection(), count);
					if (err) { reject(err); }
					else { resolve(count); }
				});
			}, reject);
		});
	}

	// load (db) {
	// 	return this.build().then((devices) => {
	// 		if (typeof devices === 'string') {
	// 			db.collection(this.built).find().toArray((err, devices) => {
	// 				if (err) { reject(err); }
	// 				else { resolve(devices); }
	// 			});
	// 		} else {
	// 			resolve(devices);
	// 		}
	// 	});
	// }

	load (db, first, last, count) {
		log.d('Loading streamer for %j from %s to %s, totalling %d', this.anote.id, first, last, count);
		return new Promise((resolve, reject) => {
			this.build(db).then((devices) => {
				if (typeof devices === 'string') {
					let q = {};
					if (first) { q._id = {$gte: first}; }
					if (last) { 
						if (!q._id) { q._id = {}; }
						q._id.$lte = last;
					}
					db.collection(this.built).find(q).sort({_id: 1}).limit(count || 100000).toArray((err, devices) => {
						if (err) { reject(err); }
						else { resolve(devices); }
					});
				} else {
					log.d('DEVICES: %j', devices);
					let start = -1, end = -1;
					devices.forEach((d, i) => {
						if (first && d._id >= first) { start = i; }
					});
					if (start !== -1) { devices = devices.slice(start); }

					for (let i = devices.length - 1; i >= 0; i--) {
						if (last && devices[i]._id <= last ) { end = i; }
					}
					if (start !== -1) { devices = devices.slice(0, end + 1); }

					resolve(devices);
				}
			}, reject);
		});
	}

	unload (db, ids) {
		return new Promise((resolve, reject) => {
			db.collection(this.built).remove({_id: {$in: ids}}, (err, ok) => {
				if (err) { reject(err); }
				else { 
					log.d('[%s]: Removed %d users from collection %s', this.anote.id, ok.result.ops.length, this.built);
					resolve(); 
				}
			});
		});
	}
}


module.exports = Streamer;