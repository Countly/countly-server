
/*!
 * express-expose
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var basename = require('path').basename;
var extname = require('path').extname;
var fs = require('fs');

/**
 * Default namespace.
 */
var _namespace = 'app';

/**
 * Default local variable name.
 */
var _name = 'javascript';

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

function expose(obj, namespace, name) {

    var app = this.app || this;
    var req = this.req;

    app._exposed = app._exposed || {};

    // support second arg as name
    // when a string or function is given
    if ('string' === typeof obj || 'function' === typeof obj) {
        name = namespace || _name;
    }
    else {
        name = name || _name;
        namespace = namespace || _namespace;
    }

    // buffer string
    if ('string' === typeof obj) {
        this.js = this.js || {};
        var buf = this.js[name] = this.js[name] || [];
        buf.push(obj);
        // buffer function
    }
    else if ('function' === typeof obj && obj.name) {
        this.expose(obj.toString(), name);
        // buffer self-calling function
    }
    else if ('function' === typeof obj) {
        this.expose(';(' + obj + ')();', name);
        // buffer object
    }
    else {
        this.expose(renderNamespace(namespace), name);
        this.expose(renderObject(obj, namespace), name);
        this.expose('\n');
    }

    // locals
    function locals(req, res) {

        var appjs = app.exposed(name);
        var resjs = res.exposed(name);
        var js = '';

        if (appjs || resjs) {
            js += '// app: \n' + appjs;
            js += '// res: \n' + resjs;
        }

        res.locals[name] = js;

    }


    // app level locals
    if (!req && !app._exposed[name]) {
        app._exposed[name] = true;
        app.use(function(req, res, next) {
            locals(req, res);
            next();
        });
        // request level locals
    }
    else if (req) {
        locals(req, this);
    }

    return this;
}

/**
 * Render the exposed javascript.
 *
 * @return {String}
 * @api private
 */

function exposed(name) {
    name = name || _name;
    this.js = this.js || {};
    return this.js[name]
        ? this.js[name].join('\n')
        : '';
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

function renderNamespace(str) {

    var parts = [];
    var split = str.split('.');
    var len = split.length;

    return str.split('.').map(function(part, i) {
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
    return Object.keys(obj).map(function(key) {
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
    if ('function' === typeof obj) {
        return obj.toString();
    }
    else if (obj instanceof Date) {
        return 'new Date("' + obj + '")';
    }
    else if (Array.isArray(obj)) {
        return '[' + obj.map(string).join(', ') + ']';
    }
    else if ('[object Object]' === Object.prototype.toString.call(obj)) {
        return '{' + Object.keys(obj).map(function(key) {
            return '"' + key + '":' + string(obj[key]);
        }).join(', ') + '}';
    }
    else {
        obj = escape_html(JSON.stringify(obj));
        if (obj) {
            obj = obj.replace(/<\/script>/ig, '</scr"+"ipt>');
        }
        return obj;
    }
}

/**
* Escape special characters in the given string of html.
*
* @param  {string} string The string to escape for inserting into HTML
* @return {string}
* @public
*/
var matchHtmlRegExp = /[<>]/;
function escape_html(string) {
    var str = '' + string;
    var match = matchHtmlRegExp.exec(str);

    if (!match) {
        return str;
    }

    var escape;
    var html = '';
    var index = 0;
    var lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
        case 60: // <
            escape = '&lt;';
            break;
        case 62: // >
            escape = '&gt;';
            break;
        default:
            continue;
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

exports = module.exports = function(app) {
    app.expose = expose.bind(app);
    app.response.expose = expose;
    app.exposed = app.response.exposed = exposed;
    return app;
};