const core = require('../core'),
    formidable = require('formidable'),
    {processRequest} = require('./utils/requestProcessor');

let server;

core.gracefulShutdown(() => new Promise(res => {
    if (server) {
        server.close(() => res());
    }
    else {
        res();
    }
}));

core.init(require('../config'), 'api').then(async() => {
    const log = core.log('api'),
        cfg = core.config.api;

    core.listenForErrors(log);

    let common = require('./utils/common.js');

    server = await core.http('api', (req, res) => {
        res.send('api');
        // const params = {
        //     qstring: {},
        //     res: res,
        //     req: req
        // };

        // if (req.method.toLowerCase() === 'post') {
        //     const form = new formidable.IncomingForm();
        //     req.body = '';
        //     req.on('data', (data) => {
        //         req.body += data;
        //     });

        //     form.parse(req, (err, fields, files) => {
        //         params.files = files;
        //         for (const i in fields) {
        //             params.qstring[i] = fields[i];
        //         }
        //         if (!params.apiPath) {
        //             processRequest(params);
        //         }
        //     });
        // }
        // else if (req.method.toLowerCase() === 'options') {
        //     const headers = {};
        //     headers["Access-Control-Allow-Origin"] = "*";
        //     headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
        //     headers["Access-Control-Allow-Headers"] = "countly-token, Content-Type";
        //     res.writeHead(200, headers);
        //     res.end();
        // }
        // //attempt process GET request
        // else if (req.method.toLowerCase() === 'get') {
        //     processRequest(params);
        // }
        // else {
        //     common.returnMessage(params, 405, "Method not allowed");
        // }
    });

    server.timeout = cfg.timeout;

    log.i(`API listens on port ${core.port}`);

}, err => {
    core.log('api').e('Cannot start API, exiting: %j', err);
    process.exit(1);
});
