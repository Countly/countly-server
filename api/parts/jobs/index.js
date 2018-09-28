'use strict';

if (require('cluster').isMaster && process.argv[1].endsWith('api/api.js')) {
    module.exports = require('./manager.js');
}
else {
    module.exports = require('./handle.js');
}