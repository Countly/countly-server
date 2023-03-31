/**
* This module is meant exporting data as csv or xls
* @module api/parts/data/exports
*/

/** @lends module:api/parts/data/exports */
var exports = {},
    common = require('./../../utils/common.js'),
    moment = require('moment-timezone'),
    plugin = require('./../../../plugins/pluginManager.js'),
    json2csv = require('json2csv');

const log = require('./../../utils/log.js')('core:export');

var XLSXTransformStream = require('xlsx-write-stream');
const Transform = require('stream').Transform;
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
            var is_complex = false;
            for (let p = 0; p < ob[i].length; p++) { //check if entities are complex.
                let type1 = Object.prototype.toString.call(ob[i][p]);
                if (ob[i][p] && (type1 === "[object Object]" || type1 === "[object Array]")) {
                    is_complex = true;
                }
            }
            if (!is_complex) {
                if (fields) {
                    fields[i] = true;
                }
                toReturn[i] = ob[i].map(preventCSVInjection).join(", "); //just join values
            }
            else {
                for (let p = 0; p < ob[i].length; p++) {
                    if (fields) {
                        fields[i + delimiter + p] = true;
                    }
                    toReturn[i + delimiter + p] = preventCSVInjection(JSON.stringify(ob[i][p])); //stringify values
                }
            }

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
* Function to make all values CSV friendly
* @param {string} value - value to convert
* @returns {string}   - converted string
*/
function processCSVvalue(value) {
    if (value === null || value === undefined) {
        return undefined;
    }

    const valueType = typeof value;
    if (valueType !== 'boolean' && valueType !== 'number' && valueType !== 'string') {
        value = JSON.stringify(value);

        if (value === undefined) {
            return undefined;
        }
        if (value[0] === '"') {
            value = value.replace(/^"(.+)"$/, '$1');
        }
    }

    if (typeof value === 'string') {
        if (value.includes('"')) {
            value = value.replace(new RegExp('"', 'g'), '"' + '"');
        }

        value = '"' + value + '"';
    }

    return value;
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
        var stream = new XLSXTransformStream();
        for (var k = 0; k < obj.data.length; k++) {
            var arr1 = [];
            for (var z = 0; z < obj.fields.length; z++) {
                arr1.push(obj.data[k][obj.fields[z]] || "");
            }
            stream.write(arr1);
        }
        stream.end();

        return stream;
    default:
        return data;
    }
};

exports.getType = function(key) {
    if (contents[key]) {
        return contents[key];
    }
    else {
        return key;
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

    if (type === "xlsx" || type === "xls") { //we have stream
        params.res.writeHead(200, headers);
        data.pipe(params.res);
        //common.returnRaw(params, 200, new Buffer(data, 'binary'), headers);
    }
    else {
        common.returnRaw(params, 200, data, headers);
    }
};

/**
* Transform value
* @param {object} value - any value
* @param {string} key - key
* @param {object} mapper - object with information how to transform data
* @returns {string} transformed value
*/
function transformValue(value, key, mapper) {
    if (mapper && mapper.fields && mapper.fields[key]) {
        //if we need we can easy add later different transformations and pass other params for them
        if (mapper.fields[key].to && mapper.fields[key].to === "time") {
            if (value) {
                if (Math.round(value).toString().length === 10) {
                    value *= 1000;
                }
                value = moment(new Date(value)).tz(mapper.tz);
                if (value) {
                    var format = "ddd, D MMM YYYY HH:mm:ss";
                    if (mapper.fields[key].format) {
                        format = mapper.fields[key].format;
                    }
                    value = value.format(format);
                }
                else {
                    value /= 1000;
                }
            }
        }
        return value;
    }
    else {
        return value;
    }
}

/**
* Transform all values in object
* @param {object} doc - any value
* @param {object} mapper - object with information how to transform data
* @returns {object} object with transformed data
*/
function transformValuesInObject(doc, mapper) {
    for (var z in doc) {
        doc[z] = transformValue(doc[z], z, mapper);
    }
    return doc;
}
/**
* function to collect calues in order based on current order.
* @param {array} values - arary to collect values
* @param {object} valuesMap - object to see which values are collected
* @param {array} paramList - array of keys(in order)
* @param {object} doc - data from db
* @param {object} options -{options.collectProp = true if collect properties,if false use only listed(from projection), options.mapper - mapper for fransforming data}
*/
function getValues(values, valuesMap, paramList, doc, options) {
    if (options && options.collectProp) {
        doc = flattenObject(doc);
        var keys = Object.keys(doc);
        for (var z = 0; z < keys.length; z++) {
            valuesMap[keys[z]] = false;
        }
        for (var p = 0; p < paramList.length; p++) {
            if (doc[paramList[p]]) {
                values.push(transformValue(doc[paramList[p]], paramList[p], options.mapper));
            }
            else {
                values.push("");
            }
            valuesMap[paramList[p]] = true;
        }
        for (var k in valuesMap) {
            if (valuesMap[k] === false) {
                values.push(transformValue(doc[k], k, options.mapper));
                paramList.push(k);
            }
        }
    }
    else {
        for (var kz = 0; kz < paramList.length; kz++) {
            var value = common.getDescendantProp(doc, paramList[kz]) || "";
            if (typeof value === 'object' || Array.isArray(value)) {
                values.push(JSON.stringify(transformValue(value, paramList[kz], options.mapper)));
            }
            else {
                values.push(transformValue(value, paramList[kz], options.mapper));
            }
        }
    }
}
/**
* Stream data as response
* @param {params} params - params object
* @param {Stream} stream - cursor object. Need to call stream on it. 
* @param {string} options - options object 
		options.filename - name of the file to output to browser
		options.type - type to be used in content type
		options.projection - object of field projection
		options.mapper - object of mapping if need to transform data(for example timestamp to date string)
*/
exports.stream = function(params, stream, options) {
    var headers = {};

    var filename = options.filename;
    var type = options.type;
    var projection = options.projection;
    var mapper = options.mapper;
    var listAtEnd = true;
    if (type && contents[type]) {
        headers["Content-Type"] = contents[type];
    }
    headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename) + "." + type;
    var paramList = [];
    if (projection) {
        for (var k in projection) { //keep order as in projection if given
            paramList.push(k);
            listAtEnd = false;
        }
    }
    if (options.writeHeaders && params.res.writeHead) {
        params.res.writeHead(200, headers);
    }
    if (type === "csv") {
        var head = [];
        if (listAtEnd === false) {
            for (let p = 0; p < paramList.length; p++) {
                head.push(processCSVvalue(paramList[p]));
            }
            params.res.write(head.join(',') + '\r\n');
        }

        stream.stream(options.streamOptions).on('data', function(doc) {
            var values = [];
            var valuesMap = {};
            getValues(values, valuesMap, paramList, doc, {mapper: mapper, collectProp: listAtEnd}); // if we have list at end - then we don'thave projection

            for (let p = 0; p < values.length; p++) {
                values[p] = processCSVvalue(values[p]);
            }
            params.res.write(values.join(',') + '\r\n');
        });

        stream.once('close', function() {
            setTimeout(function() {
                if (listAtEnd) {
                    for (var p = 0; p < paramList.length; p++) {
                        head.push(processCSVvalue(paramList[p]));
                    }
                    params.res.write(head.join(',') + '\r\n');
                }
                params.res.end();
            }, 100);
        });
    }
    else if (type === 'xlsx' || type === 'xls') {
        var xc = new XLSXTransformStream();
        xc.pipe(params.res);
        if (listAtEnd === false) {
            xc.write(paramList);
        }
        stream.stream(options.streamOptions).on('data', function(doc) {
            var values = [];
            var valuesMap = {};
            getValues(values, valuesMap, paramList, doc, {mapper: mapper, collectProp: listAtEnd});
            xc.write(values);
        });

        stream.once('close', function() {
            setTimeout(function() {
                if (listAtEnd) {
                    xc.write(paramList);
                }
                xc.end();
            }, 100);
        });
    }
    else {
        params.res.write("[");
        var first = false;
        stream.stream(options.streamOptions).on('data', function(doc) {
            if (!first) {
                first = true;
                params.res.write(doc);
            }
            else {
                params.res.write("," + doc);
            }
        });

        stream.once('close', function() {
            setTimeout(function() {
                params.res.write("]");
                params.res.end();
            }, 100);
        });
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
    options.writeHeaders = true;

    if (options.params && options.params.qstring && options.params.qstring.formatFields) {
        options.mapper = options.params.qstring.formatFields;
    }

    if (options.limit && options.limit !== "") {
        options.limit = parseInt(options.limit, 10);
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

    if (options.collection.startsWith("app_users")) {
        options.params.qstring.method = "user_details";
        options.params.app_id = options.collection.replace("app_users", "");
    }

    if (options.params && options.params.qstring && options.params.qstring.get_index && options.params.qstring.get_index !== null) {
        options.db.collection(options.collection).indexes(function(err, indexes) {
            if (!err) {
                exports.fromData(indexes, options);
            }
        });
    }
    else {
        plugin.dispatch("/drill/preprocess_query", {
            query: options.query,
            params: options.params
        }, ()=>{
            var cursor = options.db.collection(options.collection).find(options.query, {"projection": options.projection});
            if (options.sort) {
                cursor.sort(options.sort);
            }

            if (options.skip) {
                cursor.skip(parseInt(options.skip));
            }
            if (options.limit) {
                cursor.limit(parseInt(options.limit));
            }
            options.streamOptions = {};
            if (options.type === "stream" || options.type === "json") {
                options.streamOptions.transform = function(doc) {
                    doc = transformValuesInObject(doc, options.mapper);
                    return JSON.stringify(doc);
                };
            }
            if (options.type === "stream" || options.type === "json" || options.type === "xls" || options.type === "xlsx" || options.type === "csv") {
                options.output = options.output || function(stream) {
                    exports.stream(options.params, stream, options);
                };
                options.output(cursor);
            }
            else {
                cursor.toArray(function(err, data) {
                    exports.fromData(data, options);
                });
            }
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
    options.filename = options.filename || options.path.replace(/\//g, "_") + "_on_" + moment().format("DD-MMM-YYYY");


    //creating request context
    var params = {
        //providing data in request object
        'req': {
            url: options.path,
            body: options.data || {},
            method: "export"
        },
        //adding custom processing for API responses
        'APICallback': function(err, body) {
            if (err) {
                log.e(err);
                log.e(JSON.stringify(body));
            }
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
            //"stream all data"
            exports.fromData(data, options);
        }
    };

    //processing request
    common.processRequest(params);
};


exports.fromRequestQuery = function(options) {
    options.path = options.path || "/";
    if (!options.path.startsWith("/")) {
        options.path = "/" + options.path;
    }
    options.filename = options.filename || options.path.replace(/\//g, "_") + "_on_" + moment().format("DD-MMM-YYYY");


    //creating request context
    var params = {
        //providing data in request object
        'req': {
            url: options.path,
            body: options.data || {},
            method: "export"
        },
        //adding custom processing for API responses
        'APICallback': function(err, body) {
            if (err) {
                log.e(err);
            }
            if (body) {
                var cursor = common.db.collection(body.collection).aggregate(body.pipeline);
                options.projection = body.projection;
                var outputStream = new Transform({
                    objectMode: true,
                    transform: (data, _, done) => {
                        done(null, data);
                    }
                });
                options.streamOptions = {};
                if (options.type === "stream" || options.type === "json") {
                    options.streamOptions.transform = function(doc) {
                        doc = transformValuesInObject(doc, options.mapper);
                        return JSON.stringify(doc);
                    };
                }
                exports.stream({res: outputStream}, cursor, options);

                options.output(outputStream);
            }
        }
    };

    //processing request
    common.processRequest(params);
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
    if (typeof data === "object") {
        data = Object.values(data);
    }
    if (typeof data === "string") {
        options.output(data);
    }
    else {
        options.output(exports.convertData(data, options.type));
    }
};

module.exports = exports;