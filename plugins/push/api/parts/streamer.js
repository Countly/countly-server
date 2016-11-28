'use strict';

const common = require('../../../../api/utils/common.js'),
      plugins = require('../../../pluginManager.js'),
      credentials = require('./credentials.js'),
	  log = common.log('push:streamer');

class Streamer {
	constructor (pushly, app) {
		this.pushly = pushly;
		this.app = app;
		this.field = this.pushly.credentials.id.split('.')[0];
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
		return 'push_' + common.crypto.createHash('sha1').update(this.pushly.key()).digest('hex');
	}

	clear (db) {
		log.d('Clearing streamer for %j', this.pushly.id, this.collection());
		return new Promise((resolve, reject) => {
			db.collection(this.collection()).drop((err) => {
				log.d('Dropped streamer collection, error %j', err);
				if (err) { reject(err); }
				else { resolve(); }
			});
		});
	}

	build (db) {
		log.d('Building streamer for %j', this.pushly.id);
		return new Promise((resolve, reject) => {
			if (this.pushly.devices || this.built) {
				resolve(this.pushly.devices || this.built);
			} else {
				db.collection(this.collection()).count((err, count) => {
					log.d('First count returned %j / %j for %j', err, count, this.pushly.id);
					if (!err && count) {
						this.built = this.collection();
						log.d('Already built collection %j', this.built);
						resolve(this.built);
					} else {
						var query;
						log.d('building audience for %s (%s)', this.pushly.id, this.pushly.credentials.id);
						
						if (typeof this.pushly.devicesQuery === 'string') {
							try {
								this.pushly.devicesQuery = JSON.parse(this.pushly.devicesQuery);
							} catch (e) {
								log.e('Error while parsing devicesQuery', e, e.stack);
							}
						}

						if (this.pushly.devicesQuery.drill) {
							if (!this.drill()) {
								return reject('Drill is not enabled while pushly has drill conditions');
							}

							this.drill().openDrillDb();

							var params = {
								time: common.initTimeObj(this.app.timezone, Date.now()),
								qstring: Object.assign({app_id: this.app._id.toString()}, this.pushly.devicesQuery.drill)
							};

							log.i('Drilling: %j', params);

							this.drill().drill.fetchUsers(params, (err, uids) => {
								query = this.pushly.devicesQuery.user;
								query[common.dbUserMap.tokens + this.field] = true;

								log.i('Counting with drill of %d users: %j', uids.length, query);
								query.uid = {$in: uids};

								db.collection('app_users' + this.app._id).aggregate([
									{$match: query}, 
									{$project: this.projection},
									{$sort: {_id: 1}},
									{$out: this.collection()}
								], {allowDiskUse:true}, (err) => {
									log.d('Aggregation done: %j', arguments);
									if (err) {
										reject(err);
									} else {
										this.built = this.collection();
										log.d('Just built collection %j after drilling', this.built);
										resolve(this.built);
									}
								});
							});
						} else {
							query = this.pushly.devicesQuery.user;
							query[common.dbUserMap.tokens + this.field] = true;

							log.d('Not drilling %j for %j', [{$match: query}, {$out: this.collection()}], this.pushly.id);
							db.collection('app_users' + this.app._id).aggregate([
								{$match: query},
								{$project: this.projection},
								{$sort: {_id: 1}},
								{$out: this.collection()}
							], {allowDiskUse:true}, (err) => {
								if (err) {
									reject(err);
								} else {
									this.built = this.collection();
									log.d('Just built collection %j', this.built);
									resolve(this.built);
								}
							});
						}
					}
				});
			}
		});
	}

	count (db) {
		log.d('Counting streamer for %j', this.pushly.id);
		return new Promise((resolve, reject) => {
			this.build(db).then((devices) => {
				if (typeof devices === 'string') {
					log.d('Counting collection %j for %j', this.collection(), this.pushly.id);
					db.collection(this.built).count((err, count) => {
						log.d('Counted collection %j for %j: %j', this.collection(), this.pushly.id, count);
						if (err) { reject(err); }
						else { resolve(count); }
					});
				} else {
					resolve(devices.length);
				}
			});
		});
	}

	audience (db) {
		log.d('Audiencing streamer for %j', this.pushly.id);
		return new Promise((resolve, reject) => {
			this.build(db).then((devices) => {
				if (typeof devices === 'string') {
					log.d('Counting collection %j for %j', this.collection(), this.pushly.id);
					db.collection(this.built).aggregate([{$match: {}}, {$group: {_id: '$la', count: {$sum: 1}}}], (err, count) => {
						log.d('Counted collection %j for %j: %j', this.collection(), this.pushly.id, count);
						if (err) { reject(err); }
						else { resolve(count); }
					});
				} else {
					resolve(devices.length);
				}
			});
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
		log.d('Loading streamer for %j from %s to %s, totalling %d', this.pushly.id, first, last, count);
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
}


module.exports = Streamer;