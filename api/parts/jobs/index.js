'use strict';

const countlyConfig = require('./../../config');

if (require('cluster').isMaster && process.argv[1].endsWith('api/api.js') && !(countlyConfig && countlyConfig.preventJobs)) {
    module.exports = require('./manager.js');
}
else {
    module.exports = require('./handle.js');
}