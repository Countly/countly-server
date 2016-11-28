'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:build'),
	  plugins = require('../../../../plugins/pluginManager.js'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  Divider = require('../parts/divider.js'),
	  mess = require('../parts/message.js'),
	  Message = mess.Message;


class BuildJob extends job.TransientJob {
	constructor(name, data) {
		super(name, data);
		log.d('Preparing to build audience for %j', this.data);
		this.message = new Message(this.data.apps, '')
				.setId(this.data._id)
				.addPlatform(this.data.platforms)
				.setUserConditions(this.data.userConditions)
				.setDrillConditions(this.data.drillConditions)
				.setGeo(this.data.geo)
				.setTest(this.data.test);

	}

	retryPolicy () {
		return new retry.NoRetryPolicy();
	}

	run (db, done, progress) {
		log.d('Building audience for %j', this.data);
		
		let geoPromise = this.data.geo && plugins.getPluginsApis().geo ? 
			new Promise((resolve, reject) => {
				db.collection('geos').findOne(db.ObjectID(this.data.geo), (err, geo) => {
					log.d('Geo lookup returned %j / %j', err, geo);
					if (err || !geo) {
						reject(err || 'No geo');
					} else {
						this.message.setUserConditions(plugins.getPluginsApis().geo.conditions(geo, this.message.getUserConditions()));
						resolve();
					}
				});
			})
			: 
			Promise.resolve();

		setTimeout(() => {
		geoPromise.then(() => {
			let divider = new Divider(this.message);
			divider.audience(db, true).then((TOTALLY) => {
				log.d('Done building audience %j: %j', this.data._id, TOTALLY);
				done(null, TOTALLY);
			}, done);
		}, done);
		}, 14000);
	}

	timeout () {
		return 3600000; // 1 hour
	}
}

module.exports = BuildJob;
