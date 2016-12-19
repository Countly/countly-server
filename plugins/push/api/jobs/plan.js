'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:plan'),
	  plugins = require('../../../../plugins/pluginManager.js'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  Divider = require('../parts/divider.js'),
	  N = require('../parts/note.js');


class PlanJob extends job.TransientJob {
	constructor(name, data) {
		super(name, data);
		log.d('Preparing to plan audience for %j', this.data);
	}

	prepare (manager, db) {
		log.d('Preparing plan job ', this.data);
		return N.Note.load(db, this.data._id).then((note) => {
			this.note = note;
			log.d('Prepared plan job ', this.note);
			return note;
		});
	}

	retryPolicy () {
		return new retry.NoRetryPolicy();
	}

	run (db, done) {
		log.d('Planning sending for %j', this.data);

		let divider = new Divider(this.note);
		divider.divide(db, true).then((TOTALLY) => {
			log.d('Done building audience %j: %j', this.data._id, TOTALLY);
			done(null, TOTALLY);
		}, done);
	}

	timeout () {
		return 3600000; // 1 hour
	}
}

module.exports = PlanJob;
