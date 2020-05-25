const plugins = require('../plugins/pluginManager.js');
const log = require('../api/utils/log.js')('core:jobs');
const common = require('../api/utils/common.js');
const jobs = require('../api/parts/jobs');

var t = ["countly:", "jobs"];

console.log("Starting jobs.js");
common.db = plugins.dbConnection();
t.push("node");
t.push(process.argv[1]);

// Finaly set the visible title
process.title = t.join(' ');

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (err) => {
    console.log('Caught exception on jobs.js: %j', err, err.stack);
    if (log && log.e) {
        log.e('Logging caught exception');
    }
    console.trace();
    process.exit(1);
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection on jobs.js for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    if (log && log.e) {
        log.e('Logging unhandled rejection');
    }
    console.trace();
});

plugins.loadConfigs(common.db);

// Allow configs to load & scanner to find all jobs classes
setTimeout(() => {
    jobs.job('api:topEvents').replace().schedule('every 1 day');
    jobs.job('api:ping').replace().schedule('every 1 day');
    jobs.job('api:clear').replace().schedule('every 1 day');
    jobs.job('api:clearTokens').replace().schedule('every 1 day');
    jobs.job('api:clearAutoTasks').replace().schedule('every 1 day');
    jobs.job('api:task').replace().schedule('every 5 minutes');
    jobs.job('api:userMerge').replace().schedule('every 1 hour on the 10th min');
}, 10000);