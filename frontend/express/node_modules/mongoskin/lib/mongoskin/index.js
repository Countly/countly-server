var url = require('url'),
    Router = require('./router').Router,
    mongo = require('mongodb'),
    SkinServer = require('./server').SkinServer,
    SkinDb =require('./db').SkinDb,
    Db = mongo.Db,
    Server = mongo.Server,
    ReplSetServers = mongo.ReplSetServers,
    BSONNative = mongo.BSONNative,
    DEFAULT_PORT = 27017;

function toBool(value) {
  return value !== undefined && value != 'false' && value != 'no' && value != 'off';
}

/**
 * parse the database url to config
 *
 * [*://]username:password@host[:port]/database?options
 *
 */
var parseUrl = function(serverUrl) {
  var serverUrl = /\w+:\/\//.test(serverUrl) ? serverUrl : 'db://' + serverUrl,
      uri = url.parse(serverUrl, true),
      config = {},
      serverOptions = uri.query,
      reconnect = serverOptions['auto_reconnect'];

  config.host = uri.hostname;
  config.port = Number(uri.port) || DEFAULT_PORT;
  if(uri.pathname) {
    config.database = uri.pathname.replace(/\//g, '');
  }
  config.options = {};
  config.options['auto_reconnect'] = toBool(serverOptions['auto_reconnect']);
  config.options['poolSize'] = parseInt(serverOptions['poolSize'] || 1);
  if (uri && uri.auth) {
    var auth = uri.auth,
        separator = auth.indexOf(':');
    config.username = auth.substr(0, separator);
    config.password = auth.substr(separator + 1);
  }
  return config;
};

/**
 * constructor Server from url
 *
 */
var parseServer = function(serverUrl) {
  var config = parseUrl(serverUrl);
  return new Server(config.host, config.port, config.options);
};

/*
 * exports mongo classes ObjectID Long Code DbRef ... to mongoskin
 */
for(var key in mongo) {
  exports[key] = mongo[key];
}

/**
 * constructor SkinDb from serverUrls
 *
 * repliSet: mongoskin.db(serverUrls, rs_options, db_options)
 *
 * mongoskin.db(['192.168.0.1:27017/', '192.168.0.2/?auto_reconnect', '192.168.0.3/?auto_reconnect'], {
 *    database: 'mydb'
 * })
 *
 * single Server: mongoskin.db(dbUrl, db_options)
 *
 * mongoskin.db('192.168.0.1:27017/mydb')
 *
 */
exports.db = function(serverUrl, options) {
  if(!options) {
    options = {};
  }

  var server, database;

  if(Array.isArray(serverUrl)) {
    if(!options.database) {
      throw new Error('Please provide a database in options to connect.');
    }
    database = options.database;

    var len = serverUrl.length;
    var servers = [];
    for(var i = 0; i < len; i++) {
      var config = parseUrl(serverUrl[i]);
      if(config.database || config.username) {
        console.log('MONGOSKIN:WARN: database or username found in RepliSet server URL, ' + serverUrl[i]);
      }
      servers.push( new Server(config.host, config.port, config.options) );
    }
    server = new ReplSetServers(servers);
  } else {
    var config = parseUrl(serverUrl);
    if (!config.database) {
      throw new Error('Please provide a database to connect to.');
    }
    database = config.database;

    server = new Server(config.host, config.port, config.options);

    if(options.username === undefined) {
      options.username = config.username;
      options.password = config.password;
    }
  }

  var skinServer = new SkinServer(server);
  return skinServer.db(database, options);
};

/**
 * select different db by collection name
 *
 * @param select function(name) returns SkinDb
 *
 * var router = mongoskin.router(function(name){
 *      select(name){
 *      case 'user':
 *      case 'group':
 *          return authDb;
 *      default:
 *          return appDb;
 *      }
 * });
 *
 * router.collection('user')
 *
 */
exports.router = function(select) {
  return new Router(select);
};

/*
 * export Skin classes from ./db ./collection ./cursor ./admin
 */
['server', 'db', 'collection', 'cursor', 'admin'].forEach(function(path) {
  var foo, module, name;
  module = require('./' + path);
  for (name in module) {
    foo = module[name];
    exports[name] = foo;
  }
});
