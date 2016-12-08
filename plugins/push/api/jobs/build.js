'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:build'),
	  plugins = require('../../../../plugins/pluginManager.js'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  Divider = require('../parts/divider.js'),
	  N = require('../parts/note.js');


class BuildJob extends job.TransientJob {
	constructor(name, data) {
		super(name, data);
		log.d('Preparing to build audience for %j', this.data);
	}

	prepare (manager, db) {
		log.d('Preparing build job ', this.data);
		var json = this.data;
		json._id = db.ObjectID(json._id);
		json.apps = json.apps.map(db.ObjectID);
		json.geo = json.geo ? db.ObjectID(json.geo) : undefined;
		this.note = new N.Note(json);
		return Promise.resolve();
	}

	retryPolicy () {
		return new retry.NoRetryPolicy();
	}

	run (db, done) {
		log.d('Building audience for %j', this.data);
		
		let geoPromise = this.data.geo && plugins.getPluginsApis().geo ? 
			new Promise((resolve, reject) => {
				db.collection('geos').findOne(db.ObjectID(this.data.geo), (err, geo) => {
					log.d('Geo lookup returned %j / %j', err, geo);
					if (err || !geo) {
						reject(err || 'No geo');
					} else {
						this.note.userConditions = plugins.getPluginsApis().geo.conditions(geo, this.note.userConditions);
						resolve();
					}
				});
			})
			: 
			Promise.resolve();

		setTimeout(() => {
		geoPromise.then(() => {
			let divider = new Divider(this.note);
			divider.audience(db, true).then((TOTALLY) => {
				log.d('Done building audience %j: %j', this.data._id, TOTALLY);
				done(null, TOTALLY);
			}, done);
		}, done);
		}, 10);
	}

	timeout () {
		return 3600000; // 1 hour
	}
}

module.exports = BuildJob;
