'use strict';

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

	const  _id = options._id,
		  nam = options.name,
		  file = options.file,
		  json = options.job,
		  Constructor = require(file),
		  channel = new IPC.IdChannel(_id),
		  tmp = new Constructor(json),
		  resource = tmp.createResource(_id, nam),
		  db = plugins.singleDefaultConnection();

	process.on('message', LOGGER.ipcHandler);
	channel.attach(process);

	resource.start(channel, db, Constructor);

	log.d('[%d]: Started resource %j (%j): options %j', process.pid, nam, _id);
} catch (e) {
	log.e('[%d]: Error in executor %j', process.pid, e, e.stack);
}

