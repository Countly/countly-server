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

(function (exports) {
    var contents = {
        "json": "application/json",
        "csv": "text/csv",
        "xls": "application/vnd.ms-excel"
    };
    var delimiter = "_";
    function typeCheck(value){
        if (common.isNumber(value)) {
            //this is a seconds timestamp
            if((Math.round(parseFloat(value, 10)) + "").length === 10){
                value = moment(new Date(parseInt(value, 10)*1000)).format("ddd, D MMM YYYY HH:mm:ss");
            }
            //this is a miliseconds timestamp
            else if((Math.round(parseFloat(value, 10)) + "").length === 13){
                value = moment(new Date(parseInt(value, 10))).format("ddd, D MMM YYYY HH:mm:ss");
            }
        }
        return value;
    }
    function flattenArray(arr){
        if(Array.isArray(arr)){
            var fields = {};
            var l = arr.length;
            for(var i = 0; i < l; i++){
                arr[i] = flattenObject(arr[i], fields);
            }
            return {data:arr, fields:Object.keys(fields)};
        }
        return {data:[], fields:[]};
    }
    function flattenObject(ob, fields) {
        var toReturn = {};   
        for (var i in ob) {
            if(ob[i] && ob[i]._bsontype) {
                //this is ObjectID
                ob[i] = ob[i]+"";
            }
            var type = Object.prototype.toString.call(ob[i]);
            if (ob[i] && type === "[object Object]") {
                var flatObject = flattenObject(ob[i]);
                for (var x in flatObject) {
                    if(fields)
                        fields[i + delimiter + x] = true;
                    toReturn[i + delimiter + x] = flatObject[x];
                }
            } else if(type === "[object Array]") {
                if(fields)
                    fields[i] = true;
                toReturn[i] = ob[i].join(", ");
            } else {
                if(fields)
                    fields[i] = true;
                toReturn[i] = typeCheck(ob[i]);
            }
        }
        return toReturn;
    };
    
    /**
    * Convert json object to needed data type
    * @param {array} data - data to convert
    * @param {string} type - type to which to convert
    */
    exports.convertData = function(data, type){
        switch(type){
            case "json":
                return JSON.stringify(data);
            case "csv":
                var obj = flattenArray(data);
                return json2csv({ data: obj.data, fields:obj.fields});
            case "xls":
                var obj = flattenArray(data);
                return json2xls(obj.data, {fields:obj.fields});
            default:
                return data;
        }
    };
    
    /**
    * Output data as response
    * @param {params} params - params object
    * @param {string} data - data to output
    * @param {string} type - type to be used in content type
    */
    exports.output = function(params, data, filename, type){
        var headers = {};
        if(type && contents[type])
            headers["Content-Type"] = contents[type];
        headers["Content-Disposition"] = "attachment;filename="+encodeURIComponent(filename)+"."+type;
        params.res.writeHead(200, headers);
        if(type === "xls")
            params.res.write(new Buffer(data, 'binary'));
        else
            params.res.write(data);
        params.res.end();
    };
    
    /**
    * Stream data as response
    * @param {params} params - params object
    * @param {string} data - data to output
    * @param {string} type - type to be used in content type
    */
    exports.stream = function(params, stream, filename, type){
        var headers = {};
        if(type && contents[type])
            headers["Content-Type"] = contents[type];
        headers["Content-Disposition"] = "attachment;filename="+filename+"."+type;
        params.res.writeHead(200, headers);
        params.res.write("[");
        var first = false;
        stream.on('data', function(doc) {
            if(!first){
                first = true;
                params.res.write(doc);
            }
            else
                params.res.write(","+doc);
        });

        stream.once('end', function() {
            params.res.write("]");
            params.res.end();
        });
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
    exports.fromDatabase = function(options){
        options.db = options.db || common.db;
        options.query = options.query || {};
        options.projection = options.projection || {};
        if(!options.limit || parseInt(options.limit) > plugin.getConfig("api").export_limit)
            options.limit = plugin.getConfig("api").export_limit;
        var alternateName = (options.collection.charAt(0).toUpperCase() + options.collection.slice(1).toLowerCase());
        if(options.skip){
            alternateName += "_from_"+options.skip;
            if(options.limit)
                alternateName += "_to_"+(parseInt(options.skip)+parseInt(options.limit));
        }
        alternateName += "_exported_on_"+moment().format("DD-MMM-YYYY");
        options.filename = options.filename || alternateName;
        var cursor = options.db.collection(options.collection).find(options.query, options.projection);
        if(options.sort)
            cursor.sort(options.sort);
        if(options.limit)
            cursor.limit(parseInt(options.limit));
        if(options.skip)
            cursor.skip(parseInt(options.skip));

        if(options.type === "stream"){
            options.output = options.output || function(stream){ exports.stream(options.params, stream, options.filename, "json"); };
            cursor.stream({
                transform: function(doc){return JSON.stringify(doc);}
            });
            options.output(cursor);
        }
        else{
            cursor.toArray(function(err, data){
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
    exports.fromRequest = function(options){
        options.path = options.path || "/";
        if(!options.path.startsWith("/"))
            options.path = "/"+options.path;
        var opts = {
            uri: "http://localhost"+options.path,
            method: options.method || 'POST',
            json:options.data || {}
        };
        options.filename = options.filename || options.path.replace(/\//g, "_")+"_on_"+moment().format("DD-MMM-YYYY");
        request(opts, function (error, response, body) {
            var data = [];
            try{
                if(options.prop){
                    var path = options.prop.split(".");
                    for(var i = 0; i < path.length; i++){
                        body = body[path[i]];
                    }
                }
                data = body;
            }
            catch(ex){
                data = [];
            }
            exports.fromData(data, options);
        });
    };
    
    /**
    * Create export from provided data
    * @param {object} options - options for the export
    * @param {params} options.params - params object
    * @param {string} [options.type=json] - type of data to output
    * @param {string} [options.filename] - name of the file to output, by default auto generated
    * @param {function} options.output - callback function where to pass data, by default outputs as file based on type
    */
    exports.fromData = function(data, options){
        options.type = options.type || "json";
        options.filename = options.filename || "Data_export_on_"+moment().format("DD-MMM-YYYY");
        options.output = options.output || function(data){ exports.output(options.params, data, options.filename, options.type); };
        if(!data)
            data = [];
        if(typeof data === "string")
            options.output(data);
        else    
            options.output(exports.convertData(data, options.type));
    }
}(exports));

module.exports = exports;