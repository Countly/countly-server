const agents = {
        http: require('./http'),
        https: require('./https')
    },
    protos = {
        http: require('http'),
        https: require('https')
    },
    common = require('../../../../api/utils/common'),
    log = common.log('push:api:message');

let options = module.exports.opts = function(url, {host, port, user, pass, auth, http2}) {
    let proto = url.substr(0, url.indexOf(':')),
        opts = {};
    if (proto === 'https') {
        opts.agent = new agents.https({proxy: {host, port, user, pass, auth, http2}});
    }
    else if (proto === 'http') {
        opts.agent = new agents.http({proxy: {host, port, user, pass}});
    }
    else {
        return new Error('Invalid protocol in url ' + url);
    }
    return {opts, proto};
};

module.exports.http2 = function(url, {host, port, user, pass, auth, http2}, callback) {
    let agent = new agents.https({proxy: {host, port, user, pass, auth, http2}});
    agent.createConnection(new URL(url), f => callback(null, agent, f));
};

let request = module.exports.request = function(url, method, {host, port, user, pass, auth, http2}, callback) {
    let opts = options(url, {host, port, user, pass, auth, http2}),
        proto;
    if (options instanceof Error) {
        return Promise.reject(options);
    }
    else {
        ({opts, proto} = opts);
    }

    log.d('requesting %s %s', method, url);

    opts.method = method;

    return protos[proto].request(url, opts, callback);
};

module.exports.requestEither = function(url, method, conf, callback) {
    if (conf && conf.proxyhost && conf.proxyport) {
        return request(url, method, {
            host: conf.proxyhost,
            port: conf.proxyport,
            user: conf.proxyuser || undefined,
            pass: conf.proxyuser && conf.proxypass || undefined,
            auth: !(conf.proxyunauthorized || false)
        }, callback);
    }
    else {
        let proto = url.substr(0, url.indexOf(':'));
        if (!protos[proto]) {
            return new Error('Invalid protocol in url ' + url);
        }
        return protos[proto].request(url, {}, callback);
    }
};


// let req = request('https://static.npmjs.com/255a118f56f5346b97e56325a1217a16.svg', 'HEAD', {host: 'doclet.io', port: '8080', auth: false}, res => {
//     console.log(res.statusCode, res.headers);
//     res.on('end', () => {
//         console.log('done');
//     });
//     res.on('close', () => {
//         console.log('done');
//     });
// });

// req.on('error', err => {
//     console.error(err);
// });

// req.end();