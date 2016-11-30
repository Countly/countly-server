'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:clear'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  Divider = require('../parts/divider.js'),
	  mess = require('../parts/message.js'),
	  Message = mess.Message,
	  MessageStatus = mess.MessageStatus;


class ClearJob extends job.Job {
	constructor(name, data) {
		super(name, data);
		log.d('Preparing to clear audience for %j', this.data);
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

	run (db, done) {
		log.d('Clearing audience for %j', this.data);
		
		db.collection('message').findOne({_id: db.ObjectID(this.data._id)}, (err, msg) => {
			if (err) { done(err); }
			else if (!msg || msg.clear || (msg.result.status === MessageStatus.Preparing && msg.created === null) || (msg.result.status & MessageStatus.Done)) {
				let divider = new Divider(this.message);
				divider.clear(db).then(() => {
					log.d('Done clearing audience for %j', this.data._id);
					done();
				}, done);
			}
		});
	}
}

module.exports = ClearJob;
