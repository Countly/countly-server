'use strict';

if (require('cluster').isMaster) {
	module.exports = require('./manager.js');
} else {
	module.exports = require('./handle.js');
}