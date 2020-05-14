/**
* This module is meant exporting data as csv or xls
* @module api/parts/data/exports
*/

/** @lends module:api/parts/data/exports */
var exports = {},
    common = require('./../../utils/common.js'),
    moment = require('moment-timezone'),
    plugin = require('./../../../plugins/pluginManager.js'),
    json2csv = require('json2csv'),
    json2xls = require('json2xls'),
    request = require("request");

//npm install node-xlsx-stream !!!!!
var xlsx = require("node-xlsx-stream");

var contents = {
    "json": "application/json",
    "csv": "text/csv",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.ms-excel"
};
var delimiter = "_";

/**
* Flattens array of objects
* @param {array} arr - array with objects to flatten
* @returns {object} with property data for array with flattened objects and fields property for fields array
**/
function flattenArray(arr) {
    if (Array.isArray(arr)) {
        var fields = {};
        var l = arr.length;
        for (var i = 0; i < l; i++) {
            arr[i] = flattenObject(arr[i], fields);
        }
        return {
            data: arr,
            fields: Object.keys(fields)
        };
    }
    return {
        data: [],
        fields: []
    };
}

/**
* Flattens nested object recursively
* @param {object} ob - object to flatten
* @param {object} fields - object with fields to store unique ones
* @returns {object} flattened object
**/
function flattenObject(ob, fields) {
    var toReturn = {};
    for (var i in ob) {
        if (ob[i] && ob[i]._bsontype) {
            //this is ObjectID
            ob[i] = ob[i] + "";
        }
        var type = Object.prototype.toString.call(ob[i]);
        if (ob[i] && type === "[object Object]") {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (fields) {
                    fields[i + delimiter + x] = true;
                }
                toReturn[i + delimiter + x] = preventCSVInjection(flatObject[x]);
            }
        }
        else if (type === "[object Array]") {
            if (fields) {
                fields[i] = true;
            }
            toReturn[i] = ob[i].map(preventCSVInjection).join(", ");
        }
        else {
            if (fields) {
                fields[i] = true;
            }
            toReturn[i] = preventCSVInjection(ob[i]);
        }
    }
    return toReturn;
}

/**
 *  Escape values that can cause CSV injection
 *  @param {varies} val - value to escape
 *  @returns {varies} escaped value
 */
function preventCSVInjection(val) {
    if (typeof val === "string") {
        var ch = val[0];
        if (["@", "=", "+", "-"].indexOf(ch) !== -1) {
            val = '`' + val;
        }
    }
    return val;
}

/**
* Convert json object to needed data type
* @param {array} data - data to convert
* @param {string} type - type to which to convert
* @returns {string} converted data
*/
exports.convertData = function(data, type) {
    let obj;
    switch (type) {
    case "json":
        return JSON.stringify(data);
    case "csv":
        obj = flattenArray(data);
        return json2csv.parse(obj.data, {fields: obj.fields, excelStrings: false});
    case "xls":
    case "xlsx":
        obj = flattenArray(data);
        return json2xls(obj.data, {fields: obj.fields});
    default:
        return data;
    }
};

/**
* Output data as response
* @param {params} params - params object
* @param {string} data - data to output
* @param {string} filename - name of the file to output to browser
* @param {string} type - type to be used in content type
*/
exports.output = function(params, data, filename, type) {
    var headers = {};
    if (type && contents[type]) {
        headers["Content-Type"] = contents[type];
    }
    headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename) + "." + type;
    if (type === "xlsx" || type === "xls") {
        common.returnRaw(params, 200, new Buffer(data, 'binary'), headers);
    }
    else {
        common.returnRaw(params, 200, data, headers);
    }
};

/**
* function to collect calues in order based on current order.
* @param {array} values - arary to collect values
* @param {object} valuesMap - object to see which values are collected
* @param {array} paramList - array of keys(in order)
* @param {object} doc - data from db
*/
function getValues(values, valuesMap, paramList, doc) {
    doc = flattenObject(doc);
    var keys = Object.keys(doc);
    for (var z = 0; z < keys.length; z++) {
        valuesMap[keys[z]] = false;
    }

    for (var p = 0; p < paramList.length; p++) {
        if (doc[paramList[p]]) {
            values.push(doc[paramList[p]]);
        }
        else {
            values.push("");
        }
        valuesMap[paramList[p]] = true;
    }

    for (var k in valuesMap) {
        if (valuesMap[k] === false) {
            values.push(doc[k]);
            paramList.push(k);
        }
    }
}
/**
* Stream data as response
* @param {params} params - params object
* @param {Stream} stream - stream to output
* @param {string} filename - name of the file to output to browser
* @param {string} type - type to be used in content type
* @param {object} projection - object of field projection
*/
exports.stream = function(params, stream, filename, type, projection) {
    var headers = {};
    var listAtEnd = true;

    if (type && contents[type]) {
        headers["Content-Type"] = contents[type];
    }

    headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename) + "." + type;
    var paramList = [];
    if (projection) {
        for (var k in projection) { //keep order as in projection if given
            paramList.push(k);
        }
        listAtEnd = false;
    }
    if (params.res.writeHead) {
        params.res.writeHead(200, headers);
        if (type === "csv") {
            if (listAtEnd === false) {
                params.res.write(paramList.join(',') + '\r\n');
            }

            stream.on('data', function(doc) {
                var values = [];
                var valuesMap = {};
                getValues(values, valuesMap, paramList, doc);
                params.res.write(values.join(',') + '\r\n');
            });

            stream.once('close', function() {
                if (listAtEnd) {
                    params.res.write(paramList.join(','));
                }
                params.res.end();
            });
        }
        else if (type === 'xlsx' || type === 'xls') {
            var xc = xlsx();
            xc.pipe(params.res);
            var sheet = xc.sheet("Countly export");
            if (listAtEnd === false) {
                sheet.write(paramList);
            }
            stream.on('data', function(doc) {
                var values = [];
                var valuesMap = {};
                getValues(values, valuesMap, paramList, doc);
                sheet.write(values);
            });

            stream.once('close', function() {
                if (listAtEnd) {
                    sheet.write(paramList);
                }
                sheet.end();
                xc.finalize();
            });
        }
        else {
            params.res.write("[");
            var first = false;
            stream.on('data', function(doc) {
                if (!first) {
                    first = true;
                    params.res.write(doc);
                }
                else {
                    params.res.write("," + doc);
                }
            });

            stream.once('close', function() {
                params.res.write("]");
                params.res.end();
            });
        }
    }
};

/**
* Export data from database
* @param {object} options - options for the export
* @param {object} options.db - database connection
* @param {params} options.params - params object
* @param {string} options.collection - name of the collection to export
* @param {object} [options.query={}] - database query which data to filter
* @param {object} [options.projection={}] - database projections which fields to return
* @param {object} [options.sort=natural] - sort object for cursor
* @param {number} [options.limit=10000] - amount of items to output
* @param {number} [options.skip=0] - amount of items to skip from start
* @param {string} [options.type=json] - type of data to output
* @param {string} [options.filename] - name of the file to output, by default auto generated
* @param {function} options.output - callback function where to pass data, by default outputs as file based on type
*/
exports.fromDatabase = function(options) {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.projection = options.projection || {};
    if (options.limit && options.limit !== "") {
        options.limit = parseInt(options.limit);
        if (options.limit > plugin.getConfig("api").export_limit) {
            options.limit = plugin.getConfig("api").export_limit;
        }
    }
    if (Object.keys(options.projection).length > 0) {
        if (!options.projection._id) { //because it will be returned anyway
            options.projection._id = 1;
        }
    }
    var alternateName = (options.collection.charAt(0).toUpperCase() + options.collection.slice(1).toLowerCase());
    if (options.skip) {
        alternateName += "_from_" + options.skip;
        if (options.limit) {
            alternateName += "_to_" + (parseInt(options.skip) + parseInt(options.limit));
        }
    }
    alternateName += "_exported_on_" + moment().format("DD-MMM-YYYY");
    options.filename = options.filename || alternateName;
    plugin.dispatch("/drill/preprocess_query", {
        query: options.query
    });

    var cursor = options.db._native.collection(options.collection).find(options.query, {"projection": options.projection});
    if (options.sort) {
        cursor.sort(options.sort);
    }
    if (options.limit) {
        cursor.limit(parseInt(options.limit));
    }
    if (options.skip) {
        cursor.skip(parseInt(options.skip));
    }

    if (options.type === "stream" || options.type === "json") {
        options.output = options.output || function(stream) {
            exports.stream(options.params, stream, options.filename, "json", options.projection);
        };
        cursor.stream({
            transform: function(doc) {
                return JSON.stringify(doc);
            }
        });
        options.output(cursor);
    }
    else if (options.type === "xls" || options.type === "xlsx" || options.type === "csv") {
        options.output = options.output || function(stream) {
            exports.stream(options.params, stream, options.filename, options.type, options.projection);
        };
        cursor.stream();
        options.output(cursor);
    }
    else {
        cursor.toArray(function(err, data) {
            exports.fromData(data, options);
        });
    }
};

/**
* Export data from response of request
* @param {object} options - options for the export
* @param {params} options.params - params object
* @param {object} options.path - path for api endpoint
* @param {object} options.data - json data to use as post or query string
* @param {object} options.prop - which property to export, tries to export whole response if not provided
* @param {object} [options.method=POST] - request method type
* @param {string} [options.type=json] - type of data to output
* @param {string} [options.filename] - name of the file to output, by default auto generated
* @param {function} options.output - callback function where to pass data, by default outputs as file based on type
*/
exports.fromRequest = function(options) {
    options.path = options.path || "/";
    if (!options.path.startsWith("/")) {
        options.path = "/" + options.path;
    }
    var opts = {
        uri: "http://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + options.path,
        method: options.method || 'POST',
        json: options.data || {},
        strictSSL: false
    };
    options.filename = options.filename || options.path.replace(/\//g, "_") + "_on_" + moment().format("DD-MMM-YYYY");

    /**
     *  Make request to get data
     */
    function makeRequest() {
        request(opts, function(error, response, body) {
            //we got a redirect, we need to follow it
            if (response && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                opts.uri = response.headers.location;
                makeRequest();
            }
            else {
                var data = [];
                try {
                    if (options.prop) {
                        var path = options.prop.split(".");
                        for (var i = 0; i < path.length; i++) {
                            body = body[path[i]];
                        }
                    }
                    data = body;
                }
                catch (ex) {
                    data = [];
                }
                exports.fromData(data, options);
            }
        });
    }

    makeRequest();
};

/**
* Create export from provided data
* @param {string|array} data - data to format
* @param {object} options - options for the export
* @param {params} options.params - params object
* @param {string} [options.type=json] - type of data to output
* @param {string} [options.filename] - name of the file to output, by default auto generated
* @param {function} options.output - callback function where to pass data, by default outputs as file based on type
*/
exports.fromData = function(data, options) {
    options.type = options.type || "json";
    options.filename = options.filename || "Data_export_on_" + moment().format("DD-MMM-YYYY");
    options.output = options.output || function(odata) {
        exports.output(options.params, odata, options.filename, options.type);
    };
    if (!data) {
        data = [];
    }
    if (typeof data === "string") {
        options.output(data);
    }
    else {
        options.output(exports.convertData(data, options.type));
    }
};

module.exports = exports;