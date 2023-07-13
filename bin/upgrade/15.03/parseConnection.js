//from mongodb-uri
var dbObject = {};
function _parseAddress(address, uriObject) {
    uriObject.hosts = [];
    address.split(',').forEach(function(h) {
        var i = h.indexOf(':');
        if (i >= 0) {
            uriObject.hosts.push(
                {
                    host: decodeURIComponent(h.substring(0, i)),
                    port: parseInt(h.substring(i + 1))
                }
            );
        }
        else {
            uriObject.hosts.push({ host: decodeURIComponent(h) });
        }
    });
};

function parse(uri) {

    var uriObject = {};

    var i = uri.indexOf('://');
    if (i < 0) {
        throw new Error('No scheme found in URI ' + uri);
    }
    uriObject.scheme = uri.substring(0, i);
    if (this.scheme && this.scheme !== uriObject.scheme) {
        throw new Error('URI must begin with ' + this.scheme + '://');
    }
    var rest = uri.substring(i + 3);

    i = rest.indexOf('@');
    if (i >= 0) {
        var credentials = rest.substring(0, i);
        rest = rest.substring(i + 1);
        i = credentials.indexOf(':');
        if (i >= 0) {
            uriObject.username = decodeURIComponent(credentials.substring(0, i));
            uriObject.password = decodeURIComponent(credentials.substring(i + 1));
        }
        else {
            uriObject.username = decodeURIComponent(credentials);
        }
    }

    i = rest.indexOf('?');
    if (i >= 0) {
        var options = rest.substring(i + 1);
        rest = rest.substring(0, i);
        uriObject.options = {};
        options.split('&').forEach(function(o) {
            var iEquals = o.indexOf('=');
            uriObject.options[decodeURIComponent(o.substring(0, iEquals))] = decodeURIComponent(o.substring(iEquals + 1));
        });
    }

    i = rest.indexOf('/');
    if (i >= 0) {
        // Make sure the database name isn't the empty string
        if (i < rest.length - 1) {
            uriObject.database = decodeURIComponent(rest.substring(i + 1));
        }
        rest = rest.substring(0, i);
    }

    _parseAddress(rest, uriObject);

    return uriObject;

};

load("../../../frontend/express/config.js");

if (typeof countlyConfig.mongodb === "string") {
    var uriObject = parse(countlyConfig.mongodb);
    dbObject.name = uriObject.database;

    for (var i = 0; i < uriObject.hosts.length; i++) {
        if (uriObject.hosts[i].port) {
            uriObject.hosts[i] = uriObject.hosts[i].host + ":" + uriObject.hosts[i].port;
        }
        else {
            uriObject.hosts[i] = uriObject.hosts[i].host;
        }
    }
    dbObject.host = uriObject.hosts.join(",");

    if (uriObject.options && uriObject.options.replicaSet) {
        dbObject.host = uriObject.options.replicaSet + "/" + dbObject.host;
    }

    dbObject.username = uriObject.username;
    dbObject.password = uriObject.password;
}
else {
    dbObject.name = countlyConfig.mongodb.db || 'countly';
    if (typeof countlyConfig.mongodb.replSetServers === 'object') {
        //mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
        dbObject.host = countlyConfig.mongodb.replSetServers.join(",");
        if (countlyConfig.mongodb.replicaName) {
            dbObject.host = countlyConfig.mongodb.replicaName + "/" + dbObject.host;
        }
    }
    else {
        dbObject.host = countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port;
    }
    if (countlyConfig.mongodb.username && countlyConfig.mongodb.password) {
        dbObject.username = countlyConfig.mongodb.username;
        dbObject.password = countlyConfig.mongodb.password;
    }
}