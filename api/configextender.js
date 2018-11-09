var parser = function(val) {
    var parsedVal;
    try {
        parsedVal = JSON.parse(val);
        if (typeof val === typeof parsedVal) {
            val = parsedVal;
        }
        else if (val === parsedVal.toString()) {
            val = parsedVal;
        }
        else if (Array.isArray(parsedVal)) {
            val = parsedVal;
        }
        else if (typeof parsedVal === 'object') {
            val = parsedVal;
        }
    }
    catch (error) {
        //ignored error
    }
    return val;
};

const OVERRIDES = {
    MONGODB: {
        REPLSETSERVERS: 'replSetServers',
        REPLICANAME: 'replicaName',
        MAX_POOL_SIZE: 'max_pool_size',
        DBOPTIONS: 'dbOptions',
        SERVEROPTIONS: 'serverOptions'
    },

    API: {
        MAX_SOCKETS: 'max_sockets',
    },

    WEB: {
        USE_INTERCOM: 'use_intercom',
        SECURE_COOKIES: 'secure_cookies'
    },

    IGNOREPROXIES: 'ignoreProxies',
    FILESTORAGE: 'fileStorage',
    RELOADCONFIGAFTER: 'reloadConfigAfter'
};

/**
 * Digs one level down in config document
 * 
 * @param  {[type]} config [description]
 * @param  {[type]} over   [description]
 * @param  {[type]} name   [description]
 * @param  {[type]} value  [description]
 * @return {[type]}        [description]
 */
function dig(config, over, name, value) {
    let comps = name.split('_');

    for (let i = comps.length; i > 0; i--) {
        let n = comps.slice(0, i).join('_');

        if (n in over) {
            let sub;

            if (typeof over[n] === 'string') {
                sub = over[n];
                over[n] = {};
            }
            else {
                sub = Object.keys(config).filter(k => k.toUpperCase() === n)[0];
            }

            name = comps.slice(i).join('_');

            if (!name || comps.length === 1) {
                config[sub] = value;
                return true;
            }

            if (typeof config[sub] === 'object') {
                return dig(config[sub], over[n], name, value);
            }
            else if (sub) {
                config[sub] = {};
                return dig(config[sub], over[n], name, value);
            }
            else {
                config[n] = {};
                return dig(config[n], over[n], name, value);
            }
        }
        else if (n === over) {
            name = over;
            config[name] = value;
            return true;
        }
    }

    for (let i = 1; i <= comps.length; i++) {
        let n = comps.slice(0, i).join('_'),
            sub = Object.keys(config).filter(k => k.toUpperCase() === n)[0],
            name2 = comps.slice(i).join('_');

        if (sub) {
            if (comps.length === 1) {
                config[sub] = value;
                return true;
            }
            else {
                config[sub] = typeof config[sub] === 'object' ? config[sub] : {};
                return dig(config[sub], {}, name2, value);
            }
        }
    }

    comps.forEach((c, i) => {
        if (i === comps.length - 1) {
            config[c.toLowerCase()] = value;
        }
        else {
            config = config[c.toLowerCase()] = {};
        }
    });

    return true;
}

module.exports = function(mode, config, opts) {
    // back compatibility
    if (typeof mode === 'object') {
        config = mode;
        mode = 'API';
        opts = process.env;
    }

    if (['API', 'FRONTEND'].indexOf(mode) === -1) {
        throw new Error('Invalid config mode ' + mode);
    }

    config = JSON.parse(JSON.stringify(config));

    Object.keys(opts).filter(n => n.indexOf(`COUNTLY_CONFIG_${mode}_`) === 0).forEach(n => {
        let comps = n.split('_').slice(3);
        dig(config, OVERRIDES, comps.join('_'), parser(opts[n]));
    });

    return config;
};