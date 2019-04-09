
let instance, cmd = process.argv[1];

if (cmd.endsWith('manager.js')) {
    instance = require('./manager.js');
}
else if (cmd.endsWith('api.js') || cmd.endsWith('testo.js')) {
    if (require('cluster').isMaster) {
        instance = require('./master.js');
    }
    else {
        instance = require('./worker.js');
    }
}
else if (cmd.endsWith('app.js')) {
    instance = require('./master.js');
}
else {
    throw new Error('Unsupported jobs handle type');
}


module.exports = instance;