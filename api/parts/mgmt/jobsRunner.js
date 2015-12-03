var jobs = require('./jobs.js'),
	logger = require('../../utils/log.js'),
	log = logger('jobs:runner');

setTimeout(function(){
	jobs.startWorker(null, {
		test: function(job, done){
			done();
		}
	}, true, function(err, worker){
		log.i('Jobs started', err ? err : worker.types);
	});
}, 1000);

process.on('message', logger.ipcHandler);
