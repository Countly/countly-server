var jobs = require('./jobs.js');

jobs.startWorker(null, {
	test: function(job, done){
		done();
	}
}, true, function(){
	console.log('Jobs started', arguments);
});