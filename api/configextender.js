var traverse = require('traverse');

var parser = function(val) {
    var parsedVal;
    try {
        parsedVal = JSON.parse(val);
        if (typeof val === typeof parsedVal) {
            val = parsedVal;
        } else if (val === parsedVal.toString()) {
            val = parsedVal;
        } else if (Array.isArray(parsedVal)) {
            val = parsedVal;
        }
    } catch (error) {}
    return val;
};

var read = function(config, parser){
    var tc = traverse(config);
    var tcKeyMap = {};

    // make paths case-insensitive. Useful while converting from uppercase env
    // vars to camelCase variables.
    tc.paths().forEach(function(path) {
        // store paths as lowercase with their corresponding actual paths. will be
        // used while updating the value
        tcKeyMap[path.join('_').toLowerCase()] = path;
    });

    var ref = process.env;
    var env;
    for (env in ref) {
        var val = ref[env];

        // we only care about env vars starting with "countly"
        if (!env.startsWith('COUNTLY_')) {
            continue;
        }
        var path = env.split('_');
        if (path.length < 2) {
            continue;
        }

        // get the underlying value of env var
        val = parser(val);
        if (!val) {
            continue;
        }

        // generate path from env vars, while removing the first COUNTLY_ part
        var newPath = path.slice(1).map(function(node) {
            return parser(node.toLowerCase());
        });

        // if we dont have the new path defined in config, we might be creating a
        // new node
        var location = tcKeyMap[newPath.join('_')] || newPath;
        tc.set(location, val);
    }
};

module.exports = function (config) {
    read(config, parser);
    return config;
};
