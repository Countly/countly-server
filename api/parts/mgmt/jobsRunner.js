var jobs = require('./jobs.js'),
	log = require('../../utils/log.js')('jobs:runner');

jobs.startWorker(null, {
	test: function(job, done){
		done();
	}
}, true, function(err, worker){
	log.i('Jobs started', err ? err : worker.types);
});