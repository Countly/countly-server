
/*!
 * express-expose
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var express = require('express')
  , basename = require('path').basename
  , extname = require('path').extname
  , http = require('http')
  , res = http.ServerResponse.prototype
  , HTTPSServer = express.HTTPSServer
  , HTTPServer = express.HTTPServer
  , fs = require('fs');

/**
 * Library version.
 */

exports.version = '0.2.2';

/**
 * Default namespace.
 */

exports.namespace = 'express';

/**
 * Default local variable name.
 */

exports.name = 'javascript';

/**
 * Expose the given `obj` to the client-side, with
 * an optional `namespace` defaulting to "express".
 *
 * @param {Object|String|Function} obj
 * @param {String} namespace
 * @param {String} name
 * @return {HTTPServer} for chaining
 * @api public
 */

res.expose =
HTTPServer.prototype.expose =
HTTPSServer.prototype.expose = function(obj, namespace, name){
  var app = this.app || this;

  app._exposed = app._exposed || {};

  // support second arg as name
  // when a string or function is given
  if ('string' == typeof obj || 'function' == typeof obj) {
    name = namespace || exports.name;
  } else {
    name = name || exports.name;
    namespace = namespace || exports.namespace;
  }

  // register dynamic helper
  if (!app._exposed[name]) {
    var helpers = {};
    app._exposed[name] = true;
    helpers[name] = function(req, res){
      var appjs = app.exposed(name)
        , resjs = res.exposed(name)
        , js = '';

      if (appjs || resjs) {
        js += '// app: \n' + appjs;
        js += '// res: \n' + resjs;
      }

      return js;
    };
    app.dynamicHelpers(helpers);
  }

  // buffer string
  if ('string' == typeof obj) {
    this.js = this.js || {};
    var buf = this.js[name] = this.js[name] || [];
    buf.push(obj);
  // buffer function
  } else if ('function' == typeof obj && obj.name) {
    this.expose(obj.toString(), name);
  // buffer self-calling function
  } else if ('function' == typeof obj) {
    this.expose(';(' + obj + ')();', name);
  // buffer module object
  } else if (this._require) {
    obj = 'module.exports = ' + string(obj);
    this.expose(renderRegister(namespace, obj), name);
  // buffer object
  } else {
    this.expose(renderNamespace(namespace), name);
    this.expose(renderObject(obj, namespace), name);
    this.expose('\n');
  }

  return this;
};

/**
 * Expose the common-js module system to the client-side.
 *
 * @return {HTTPServer} for chaining
 * @api public
 */

res.exposeRequire =
HTTPServer.prototype.exposeRequire =
HTTPSServer.prototype.exposeRequire = function(){
  if (this._require) return this;
  this._require = true;
  var js = fs.readFileSync(__dirname + '/require.js', 'ascii');
  this.expose(js);
  return this;
};

/**
 * Expose the module at `path`, with optional `namespace`, defaulting
 * to the basename, for example `utils/color.js` would expose `colors.dark()`
 * etc to the client-side.
 *
 * @param {String} path
 * @param {String} namespace
 * @param {String} name
 * @return {HTTPServer} for chaining
 * @api public
 */

res.exposeModule =
HTTPServer.prototype.exposeModule =
HTTPSServer.prototype.exposeModule = function(path, namespace, name){
  var path = require.resolve(path)
    , js = fs.readFileSync(path, 'utf8')
    , namespace = namespace || basename(path, extname(path));

  if (this._require) {
    this.expose(renderRegister(namespace, js), name);
  } else {
    js = namespace
      + ' = (function(exports){\n'
      + js.replace(/^/gm, '  ')
      + '\n\n  return exports;\n})({});';

    this.expose(renderNamespace(namespace));
    this.expose(js, name);
  }

  return this;
};

/**
 * Render the exposed javascript.
 *
 * @return {String}
 * @api private
 */

res.exposed =
HTTPServer.prototype.exposed =
HTTPSServer.prototype.exposed = function(name){
  name = name || exports.name;
  this.js = this.js || {};
  return this.js[name]
    ? this.js[name].join('\n')
    : '';
};

/**
 * Render a client-side module registration with the given
 * `mod` name, and `js` contents.
 *
 * @param {String} mod
 * @param {String} js
 * @return {String}
 * @api private
 */

function renderRegister(mod, js) {
  return 'require.register("'
    + mod + '", function(module, exports, require){\n'
    + js + '\n});';
}

/**
 * Render a namespace from the given `str`.
 *
 * Examples:
 *
 *    renderNamespace('foo.bar.baz');
 *
 *    var foo = foo || {};
 *    foo.bar = foo.bar || {};
 *    foo.bar.baz = foo.bar.baz || {};
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function renderNamespace(str){
  var parts = []
    , split = str.split('.')
    , len = split.length;
 
  return str.split('.').map(function(part, i){
    parts.push(part);
    part = parts.join('.');
    return (i ? '' : 'window.') + part + ' = window.' + part + ' || {};';
  }).join('\n');
}

/**
 * Render `obj` with the given `namespace`.
 *
 * @param {Object} obj
 * @param {String} namespace
 * @return {String}
 * @api private
 */

function renderObject(obj, namespace) {
  return Object.keys(obj).map(function(key){
    var val = obj[key];
    return namespace + '["' + key + '"] = ' + string(val) + ';';
  }).join('\n');
}

/**
 * Return a string representation of `obj`.
 *
 * @param {Mixed} obj
 * @return {String}
 * @api private
 */

function string(obj) {
  if ('function' == typeof obj) {
    return obj.toString();
  } else if (obj instanceof Date) {
    return 'new Date("' + obj + '")';
  } else if (Array.isArray(obj)) {
    return '[' + obj.map(string).join(', ') + ']';
  } else if ('[object Object]' == Object.prototype.toString.call(obj)) {
    return '{' + Object.keys(obj).map(function(key){
      return '"' + key + '":' + string(obj[key]);
    }).join(', ') + '}';
  } else {
    return JSON.stringify(obj);
  }
}