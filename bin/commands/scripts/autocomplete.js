var manager = require('../../../plugins/pluginManager.js'),
    fs = require('fs'),
    path = require('path'),
    myArgs = process.argv.slice(2),
    arr = myArgs[0].split(",").slice(1);

var flattenObject = function(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }

        if ((typeof ob[i]) == 'object' && ob[i] != null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }

                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};

function getConfigs(callback) {
    manager.dbConnection().then((db) => {
        db.collection("plugins").findOne({_id: "plugins"}, function(err, list) {
            db.close();
            var res = {};
            if (!err && list) {
                var keys = Object.keys(flattenObject(list));
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i].indexOf("_id") != 0 && keys[i].indexOf("services.") != 0 && keys[i].indexOf("plugins.") != 0) {
                        res[keys[i]] = null;
                    }
                }
            }

            res.list = {values: null};
            callback(res);
        });
    });
}

function getPlugins(callback) {
    var dir = path.resolve(__dirname, "../../../plugins/");
    var ignore = {"empty": true, "plugins": true};
    fs.readdir(dir, function(err, list) {
        var res = {};
        for (var i = 0; i < list.length; i++) {
            if (list[i].indexOf(".") === -1 && !ignore[list[i]]) {
                res[list[i]] = null;
            }
        }
        callback(res);
    });
}

var commands = {
    start: null,
    stop: null,
    restart: null,
    status: null,
    root: null,
    upgrade: null,
    version: null,
    dir: null,
    test: null,
    backupfiles: null,
    backupdb: null,
    backup: null,
    restorefiles: null,
    restoredb: null,
    restore: null,
    usage: null,
    decrypt: null,
    encrypt: null,
    add_user: null,
    remove_user: null,
    task: {
        jshint: null,
        concat: null,
        uglify: null,
        cssmin: null,
        plugins: null,
        locales: null,
        default: null,
        dist: null
    },
    api: {
        pretty: null
    },
    update: {
        translations: null,
        geoip: null,
        devices: null
    },
    plugin: {
        list: {
            states: null
        },
        enable: getPlugins,
        disable: getPlugins,
        upgrade: getPlugins,
        status: getPlugins,
        version: getPlugins
    },
    config: getConfigs
};

commands.update["sdk-web"] = null;
commands.task["dist-all"] = null;
commands.api["/i"] = null;
commands.api["/o"] = null;

function filterProps(query, ob) {
    var res = [];
    var re = new RegExp('^' + query, 'i');
    for (var i in ob) {
        if (!query || query === "" || re.test(i)) {
            res.push(i);
        }
    }
    console.log(res.join(" "));
}

function iterateObjects(ob, arr) {
    while (arr.length > 1) {
        if (typeof ob === "function") {
            ob(function(res) {
                iterateObjects(res, arr);
            });
            return;
        }
        else if (ob == null) {
            break;
        }
        else {
            ob = ob[arr[0]];
        }
        arr.shift();
    }
    if (ob) {
        if (typeof ob === "function") {
            ob(function(res) {
                filterProps(arr.pop(), res);
            });
        }
        else {
            filterProps(arr.pop(), ob);
        }
    }
}

if (arr.length == 1 && arr[0] == "") {
    console.log(Object.keys(commands).join(" "));
}
else {
    iterateObjects(commands, arr);
}