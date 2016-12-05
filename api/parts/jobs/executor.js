'use strict';

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    process.exit(1);
});
 
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
});

/**
 * Entry point for child_process.fork to run a corresponding resource / job.
 */
const IPC = require('./ipc.js'),
	  LOGGER = require('../../utils/log.js'),
	  log = LOGGER('jobs:executor'),
	  plugins = require('../../../plugins/pluginManager.js');


try {
	const options = JSON.parse(process.argv[2]);

	log.d('[%d]: Starting executor %j', process.pid, options);

	const _id = options._id,
		  nam = options.name,
		  file = options.file,
		  json = options.job,
		  Constructor = require(file),
		  channel = new IPC.IdChannel(_id),
		  tmp = new Constructor(json),
		  db = plugins.singleDefaultConnection();

	process.on('message', LOGGER.ipcHandler);
	channel.attach(process);

	plugins.loadConfigs(db, () => {
		LOGGER.ipcHandler({cmd: 'log', config: plugins.getConfig('logs')});

		log.d('[%d]: Preparing resource %j (%j): options %j', process.pid, nam, _id, options);
		tmp.prepare(null, db).then(() => {
			var resource = tmp.createResource(_id, nam);
			resource.start(channel, db, Constructor);
			log.d('[%d]: Started resource %j (%j): options %j', process.pid, nam, _id, options);
		}, err => {
			log.e('Error while preparing job: %j / %j', err, err.stack);
			process.exit(1);
		});
	});

} catch (e) {
	log.e('[%d]: Error in executor %j', process.pid, e, e.stack);
}

