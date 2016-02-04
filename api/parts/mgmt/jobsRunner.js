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
        ping: function(job, done){
            var db = plugins.dbConnection();
            db.collection("members").findOne({global_admin:true}, function(err, member){
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
            })
        }
	}, true, function(err, worker){
		log.i('Jobs started', err ? err : worker.types);
	});
    
    jobs.job('ping', {}).replace().schedule(require('later').parse.recur().every(1).dayOfYear());
}, 1000);

process.on('message', logger.ipcHandler);
