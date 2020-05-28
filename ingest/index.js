const core = require('../core');

let server;

core.gracefulShutdown(() => new Promise(res => {
    if (server) {
        server.close(() => res());
    }
    else {
        res();
    }
}));

core.init(require('../config'), 'ingest').then(async() => {
    const log = core.log('ingest'),
        cfg = core.config.ingest;

    core.listenForErrors(log);

    server = await core.http('ingest', (req, res) => {
        core.db.collection('ingest').save({method: req.method, url: req.url}).then(() => {
            res.send('ingest');
            // res.writeHead(200);
            // res.end();
        }, err => {
            log.e(err);

            res.writeHead(500);
            res.end();
        });
    });

    log.i(`Ingest listens on port ${core.port}`);

}, err => {
    core.log('ingest').e('Cannot start Ingest, exiting: %j', err);
    process.exit(1);
});
