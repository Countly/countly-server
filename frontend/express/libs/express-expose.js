
/*!
 * express-expose
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module to expose objects to template
 * @module frontend/express/libs/express-expose
 */

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
 * @param {Object|String|Function} obj - object to expose
 * @param {String} namespace - namespace for exposing
 * @param {String} name - name of the key
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

    /**
    * Add exposed object to res.locals
    * @param {object} reqOb - request object
    * @param {object} resOb - response object
    **/
    function locals(reqOb, resOb) {

        var appjs = app.exposed(name);
        var resjs = resOb.exposed(name);
        var js = '';

        if (appjs || resjs) {
            js += '// app: \n' + appjs;
            js += '// res: \n' + resjs;
        }

        resOb.locals[name] = js;

    }


    // app level locals
    if (!req && !app._exposed[name]) {
        app._exposed[name] = true;
        app.use(function(reqOb, res, next) {
            locals(reqOb, res);
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
 * @param {string} name - name of exposed value
 * @return {String} exposed value
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
 * @example
 *
 *    renderNamespace('foo.bar.baz');
 *
 *    var foo = foo || {};
 *    foo.bar = foo.bar || {};
 *    foo.bar.baz = foo.bar.baz || {};
 *
 * @param {String} str - namespace name
 * @return {String} rendered string to be used in source
 * @api private
 */
function renderNamespace(str) {

    var parts = [];

    return str.split('.').map(function(part, i) {
        parts.push(part);
        part = parts.join('.');
        return (i ? '' : 'window.') + part + ' = window.' + part + ' || {};';
    }).join('\n');
}

/**
 * Render `obj` with the given `namespace`.
 *
 * @param {Object} obj - object to render
 * @param {String} namespace - render ybder provided namespace
 * @return {String} rendered object
 * @api private
 */
function renderObject(obj, namespace) {
    return Object.keys(obj).map(function(key) {
        var val = obj[key];
        return namespace + '["' + escape_js_string(key) + '"] = ' + string(val) + ';';
    }).join('\n');
}

/**
 * Return a string representation of `obj`.
 *
 * @param {Mixed} obj - object to stringify
 * @return {String} stringified object
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
            return '"' + escape_js_string(key) + '":' + string(obj[key]);
        }).join(', ') + '}';
    }
    else {
        obj = JSON.stringify(obj);
        if (obj) {
            // Only escape things that could break out of script context
            obj = obj.replace(/<\/script>/ig, '</scr"+"ipt>');
            obj = obj.replace(/<!--/g, '<\\!--');
            obj = obj.replace(/\u2028/g, '\\u2028'); // Line separator
            obj = obj.replace(/\u2029/g, '\\u2029'); // Paragraph separator
        }
        return obj;
    }
}

/**
* Escape special characters that could break JavaScript string context
*
* @param  {string} str - The string to escape
* @return {string} escaped string
* @public
*/
function escape_js_string(str) {
    if (typeof str !== 'string') {
        return str;
    }

    return str
        .replace(/\\/g, '\\\\') // Backslash
        .replace(/"/g, '\\"') // Double quote
        .replace(/'/g, "\\'") // Single quote
        .replace(/`/g, '\\`') // Backtick (template literal)
        .replace(/\$/g, '\\$') // Dollar sign (template literal)
        .replace(/\n/g, '\\n') // Newline
        .replace(/\r/g, '\\r') // Carriage return
        .replace(/\t/g, '\\t') // Tab
        .replace(/\f/g, '\\f') // Form feed
        .replace(/\v/g, '\\v') // Vertical tab
        .replace(/\0/g, '\\0') // Null character
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, function(ch) {
            return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
        });
}

exports = module.exports = function(app) {
    app.expose = expose.bind(app);
    app.response.expose = expose;
    app.exposed = app.response.exposed = exposed;
    return app;
};