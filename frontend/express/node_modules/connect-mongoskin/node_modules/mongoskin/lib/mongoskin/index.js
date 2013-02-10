/*!
 * mongoskin - index.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var url = require('url');
var Router = require('./router').Router;
var mongo = require('mongodb');
var SkinServer = require('./server').SkinServer;
var SkinDb =require('./db').SkinDb;
var Db = mongo.Db;
var Server = mongo.Server;
var ReplSetServers = mongo.ReplSetServers;
var BSONNative = mongo.BSONNative;
var constant = require('./constant');
var DEFAULT_PORT = constant.DEFAULT_PORT;

function toBool(value) {
  return value !== undefined && value !== 'false' && value !== 'no' && value !== 'off';
}

/**
 * parse the database url to config
 *
 * [*://]username:password@host[:port]/database?options
 *
 * @param {String} serverUrl
 * @return {Object} config
 *  - {String} host
 *  - {Number} port, default is `DEFAULT_PORT`.
 *  - {String} [database], no database by default.
 *  - {Object} options
 *    - {Bool} auto_reconnect, default is `false`.
 *    - {Number} poolSize, default is `1`.
 *  - {String} [username], no username by default.
 *  - {String} [password], no password by default.
 * @api private
 */
var parseUrl = function (serverUrl) {
  serverUrl = /\w+:\/\//.test(serverUrl) ? serverUrl : 'db://' + serverUrl;
  var uri = url.parse(serverUrl, true);
  var config = {};
  var serverOptions = uri.query;

  config.host = uri.hostname;
  config.port = parseInt(uri.port, 10) || DEFAULT_PORT;
  if (uri.pathname) {
    config.database = uri.pathname.replace(/\//g, '');
  }
  config.options = {};
  config.options.auto_reconnect = toBool(serverOptions.auto_reconnect);
  config.options.poolSize = parseInt(serverOptions.poolSize || 1, 10);
  if (uri && uri.auth) {
    var auth = uri.auth;
    var separator = auth.indexOf(':');
    config.username = auth.substr(0, separator);
    config.password = auth.substr(separator + 1);
  }
  return config;
};

/**
 * constructor Server from url
 *
 * @param {String} serverUrl
 * @return {Server}
 * @api private
 */
var parseServer = function (serverUrl) {
  var config = parseUrl(serverUrl);
  return new Server(config.host, config.port, config.options);
};

/*
 * exports mongo classes ObjectID Long Code DbRef ... to mongoskin
 */
for (var key in mongo) {
  exports[key] = mongo[key];
}

/**
 * constructor SkinDb from serverURL[s]
 *
 * ReplicaSet: mongoskin.db(serverURLs, dbOptions, replicasetOptions)
 *
 * ```js
 * mongoskin.db([
 *   '192.168.0.1:27017/',
 *   '192.168.0.2/?auto_reconnect',
 *   '192.168.0.3'
 * ], {database: 'mydb'}, {connectArbiter: false, socketOptions: {timeout: 2000}});
 * ```
 * 
 * Single Server: mongoskin.db(dbURL, options)
 * 
 * ```js
 * mongoskin.db('192.168.0.1:27017/mydb');
 * // or
 * mongoskin.db('192.168.0.1:27017', {database: 'mydb'});
 * // set the connection timeout to `2000ms`
 * mongoskin.db('192.168.0.1:27017', {database: 'mydb', socketOptions: {timeout: 2000}});
 * ```
 * 
 * @param {String|Array} serverUrl or server urls.
 * @param {Object} [dbOptions]
 *  - {Object} socketOptions: @see http://mongodb.github.com/node-mongodb-native/markdown-docs/database.html#socket-options
 *  - the other, @see http://mongodb.github.com/node-mongodb-native/markdown-docs/database.html#db-options
 * @param {Object} [replicasetOptions], options for replicaset.
 *   The detail of this options, please
 *   @see https://github.com/mongodb/node-mongodb-native/blob/master/lib/mongodb/connection/repl_set.js#L27.
 * @return {SkinDb}
 * @api public
 */
exports.db = function (serverUrl, dbOptions, replicasetOptions) {
  dbOptions = dbOptions || {};

  var server, database, config;

  if (Array.isArray(serverUrl)) {
    if (!dbOptions.database) {
      throw new Error('Please provide a database in `dbOptions` to connect.');
    }
    database = dbOptions.database;

    var len = serverUrl.length;
    var servers = [];
    for (var i = 0; i < len; i++) {
      config = parseUrl(serverUrl[i]);
      if (config.database || config.username) {
        console.log('MONGOSKIN:WARN: database or username found in RepliSet server URL, ' + serverUrl[i]);
      }
      servers.push(new Server(config.host, config.port, config.options));
    }
    server = new ReplSetServers(servers, replicasetOptions);
  } else {
    config = parseUrl(serverUrl);
    database = dbOptions.database || config.database;
    if (!database) {
      throw new Error('Please provide a database to connect to.');
    }
    var socketOptions = dbOptions.socketOptions;
    if (socketOptions) {
      delete dbOptions.socketOptions;
      config.options.socketOptions = socketOptions;
    }
    server = new Server(config.host, config.port, config.options);

    if (dbOptions.username === undefined) {
      dbOptions.username = config.username;
      dbOptions.password = config.password;
    }
  }

  var skinServer = new SkinServer(server);
  return skinServer.db(database, dbOptions);
};

/**
 * select different db by collection name
 *
 * @param select `function(name)` returns SkinDb
 *
 * ```js
 * var router = mongoskin.router(function (name) {
 *   swhich (name) {
 *     case 'user':
 *     case 'group':
 *       return authDb;
 *     default:
 *       return appDb;
 *   }
 * });
 * router.collection('user')
 * ```
 * 
 * @param {Function(name)} select
 * @return {Router}
 * @api public
 */
exports.router = function (select) {
  return new Router(select);
};

/*
 * export Skin classes from ./db ./collection ./cursor ./admin
 */
['server', 'db', 'collection', 'cursor', 'admin'].forEach(function (path) {
  var module = require('./' + path);
  for (var name in module) {
    exports[name] = module[name];
  }
});
