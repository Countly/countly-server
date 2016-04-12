var jobs = require('./jobs.js'),
	logger = require('../../utils/log.js'),
    plugins = require('../../../plugins/pluginManager.js'),
    request = require('request'),
	log = logger('jobs:runner');

setTimeout(function(){
	jobs.startWorker(null, {
		test: function(job, done){
			done();
		},
        clearJobs: function(job, done) {
            var query = {
                $and: [
                    {status: {$in: [jobs.STATUS.DONE, jobs.STATUS.CANCELLED]}},
                    {$or: [
                        {done: {$exists: false}},
                        {done: {$lt: Date.now() - 60 * 60 * 24 * 1000}}
                    ]}
                ]
            }
            require('../../utils/common.js').db.collection('jobs').deleteMany(query, (err, result) => {
                if (err) {
                    log.e('Error while clearing jobs: ', err);
                } else {
                    log.d('Done clearing old jobs done before %j:', query.$and[1].$or[1].done.$lt, result);
                }
                done(err);
            });
        },
        ping: function(job, done){
            var db = plugins.dbConnection();
            db.collection("members").findOne({global_admin:true}, function(err, member){
                if(!err && member){
                    var date = new Date();
                    request({
                        uri:"https://stats.count.ly/i",
                        method:"GET",
                        timeout:4E3,
                        qs:{
                            device_id:member.email,
                            app_key:"386012020c7bf7fcb2f1edf215f1801d6146913f",
                            timestamp: Math.round(date.getMilliseconds()/1000),
                            hour: date.getHours(),
                            dow: date.getDay(),
                            events:JSON.stringify([
                                {
                                    key: "PING",
                                    count: 1
                                }
                            ])
                            
                        }
                    }, function(a, c, b) {
                        db.close();
                        done();
                    });
                }
            })
        }
	}, true, function(err, worker){
		log.i('Jobs started', err ? err : worker.types);
	});
    
    jobs.job('ping').replace().schedule('every 1 day');
    jobs.job('clearJobs').replace().schedule('every 1 hour');
}, 1000);

process.on('message', logger.ipcHandler);
