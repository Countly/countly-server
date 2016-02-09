'use strict';

var cluster = require('cluster'),
	M = require('./message'),
	pushly;

module.exports.Message = M.Message;
module.exports.MessageStatus = M.Status;
module.exports.Platform = M.Platform;

module.exports = function(logger, opts) {
	if (pushly) return pushly;
	else {
		if (cluster.isMaster) {
		    pushly = new (require('./master.js'))(logger, opts);
		} else {
		    pushly = new (require('./worker.js'))(logger, opts);
		}

		pushly.Message = M.Message;
		pushly.MessageStatus = M.Status;
		pushly.Platform = M.Platform;

		return pushly;
	}
};
