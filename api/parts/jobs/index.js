
let instance, cmd = process.argv[1];

if (cmd.endsWith('manager.js')) {
    instance = require('./manager.js');
}
else if (cmd.endsWith('api.js') || cmd.endsWith('app.js') || cmd.endsWith('executor.js') || cmd.endsWith('testo.js') || cmd.indexOf('mocha' !== -1)) {
    if (require('cluster').isMaster) {
        instance = require('./master.js');
    }
    else {
        instance = require('./worker.js');
    }
}
else {
    throw new Error('Unsupported jobs handle type');
}


module.exports = instance;