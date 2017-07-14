/**
* Module to abstract storing files in a shared system between multiple countly instances, currently based on GridFS
* @module api/utils/countlyFs
*/

/** @lends module:api/utils/countlyFs */
var countlyFs = {};

var plugins = require("../../plugins/pluginManager.js");
var GridFSBucket = require("mongoskin").GridFSBucket;
var Readable = require('stream').Readable;
var db = plugins.dbConnection("countly_fs");
var fs = require("fs");

(function (countlyFs) {
    function save(category, filename, readStream, options, callback){
        var bucket = new GridFSBucket(db._native, { bucketName: category });
        var uploadStream;
        var id = options.id;
        delete options.id;
        delete options.writeMode;
        if(typeof id === "string")
            uploadStream = bucket.openUploadStreamWithId(id, filename, options);
        else
            uploadStream = bucket.openUploadStream(filename, options);
        uploadStream.once('finish', function() {
            if(callback)
                callback(null)
        });
        uploadStream.on('error', function(error) {
            if(callback)
                callback(error);
        });
        readStream.pipe(uploadStream);
    }
    
    function beforeSave(category, filename, options, callback, done){
        countlyFs.getId(category, filename, function(err, res){
            if(!err){
                if(!res || options.writeMode === "version"){
                    db.onOpened(function(){
                        done();
                    });
                }
                else if(options.writeMode === "overwrite"){
                    db.onOpened(function(){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        bucket.delete(res, function(error) {
                            if(!error){
                                setTimeout(done, 1);
                            }
                            else if(callback)
                                callback(error);
                        });
                    });
                }
                else{
                    if(callback)
                        callback(new Error("File already exists"), res);
                }
            }
            else{
                if(callback)
                    callback(err, res);
            }
        });
    }
    
    /**
    * Get file's id
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {function} callback - function called when we have result, providing error object as first param and id as second
    * @example
    * countlyFs.getId("test", "./CHANGELOG.md", function(err, exists){
    *   if(exists)
    *       console.log("File exists");
    * });
    */
    countlyFs.getId = function(category, filename, callback){
        db.collection(category+".files").findOne({ filename: filename }, {_id:1}, function(err, res){
            if(callback)
                callback(err, (res && res._id) ? res._id : false);
        });
    };
    
    /**
    * Check if file exists
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
    * @example
    * countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
    *   if(exists)
    *       console.log("File exists");
    * });
    */
    countlyFs.exists = function(category, filename, callback){
        db.collection(category+".files").findOne({ filename: filename }, {_id:1}, function(err, res){
            if(callback)
                callback(err, (res && res._id) ? true : false);
        });
    };
    
    /**
    * Save file in shared system
    * @param {string} category - collection where to store data
    * @param {string} path - path to file
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {string} options.filename- filename, can be used to rename file, if not provided will be used from path
    * @param {string} options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
    * @param {number} options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
    * @param {object} options.metadata - Optional object to store in the file document's metadata field
    * @param {string} options.contentType - Optional string to store in the file document's contentType field
    * @param {array} options.aliases - Optional array of strings to store in the file document's aliases field
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveFile("test", "./CHANGELOG.md", function(err){
    *   console.log("Storing file finished", err);
    * });
    */
    countlyFs.saveFile = function(category, path, options, callback){
        if(typeof options === "function"){
            callback = options;
            options = null;
        }
        if(!options){
            options = {};
        }
        var filename = options.filename;
        delete options.filename;
        if(!filename)
            filename = path.split("/").pop();
        beforeSave(category, filename, options, callback, function(){
            save(category, filename, fs.createReadStream(path), options, callback);
        });
    };
    
    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {string} data - data to save
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {string} options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
    * @param {number} options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
    * @param {object} options.metadata - Optional object to store in the file document's metadata field
    * @param {string} options.contentType - Optional string to store in the file document's contentType field
    * @param {array} options.aliases - Optional array of strings to store in the file document's aliases field
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveData("test", "test.text", "some\nmultiline\ntest", function(err){
    *   console.log("Storing data finished", err);
    * });
    */
    countlyFs.saveData = function(category, filename, data, options, callback){
        if(typeof options === "function"){
            callback = options;
            options = null;
        }
        if(!options){
            options = {};
        }
        beforeSave(category, filename, options, callback, function(){
            var readStream = new Readable;
            readStream.push(data);
            readStream.push(null);
            save(category, filename, readStream, options, callback);
        });
    };
    
    /**
    * Save file from stream in shared system
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {stream} readStream - stream where to get file content
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {string} options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
    * @param {number} options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
    * @param {object} options.metadata - Optional object to store in the file document's metadata field
    * @param {string} options.contentType - Optional string to store in the file document's contentType field
    * @param {array} options.aliases - Optional array of strings to store in the file document's aliases field
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveStream("test", "AGPLv3", fs.createReadStream("AGPLv3"), function(err){
    *   console.log("Storing stream finished", err);
    * });
    */
    countlyFs.saveStream = function(category, filename, readStream, options, callback){
        if(typeof options === "function"){
            callback = options;
            options = null;
        }
        if(!options){
            options = {};
        }
        beforeSave(category, filename, options, callback, function(){
            save(category, filename, readStream, options, callback);
        });
    };
    
    /**
    * Rename existing file
    * @param {string} category - collection where to store data
    * @param {string} oldname - old filename
    * @param {string} newname - new filename
    * @param {function} callback - function called when renaming was completed or errored, providing error object as first param
    * @example
    * countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
    *   console.log("Finished", err);
    * });
    */
    countlyFs.rename = function(category, oldname, newname, callback){
        db.onOpened(function(){
            db.collection(category+".files").findOne({ filename: oldname }, {_id:1}, function(err, res){
                if(!err){
                    if(res && res._id){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        bucket.rename(res._id, newname, function(error) {
                            if(callback)
                                callback(error);
                        });
                    }
                    else{
                        if(callback)
                            callback(new Error("File does not exist"));
                    }
                }
                else{
                    if(callback)
                        callback(err);
                }
            });
        });
    };
    
    /**
    * Delete file from shared system
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    countlyFs.deleteFile = function(category, filename, callback){
        db.onOpened(function(){
            db.collection(category+".files").findOne({ filename: filename }, {_id:1}, function(err, res){
                if(!err){
                    if(res && res._id){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        bucket.delete(res._id, function(error) {
                            if(callback)
                                callback(error);
                        });
                    }
                    else{
                        if(callback)
                            callback(new Error("File does not exist"));
                    }
                }
                else{
                    if(callback)
                        callback(err);
                }
            });
        });
    };
    
    /**
    * Delete all files from collection/category
    * @param {string} category - collection of files to delete
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteAll("test", function(err){
    *   console.log("Finished", err);
    * });
    */
    countlyFs.deleteAll = function(category, callback){
        db.onOpened(function(){
            var bucket = new GridFSBucket(db._native, { bucketName: category });
            bucket.drop(function(error) {
                if(callback)
                    callback(error);
            });
        });
    };
    
    /**
    * Get stream for file
    * @param {string} category - collection from where to read data
    * @param {string} filename - filename
    * @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
    * @example
    * countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
    *   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
    *   stream.pipe(writeStream);
    * });
    */
    countlyFs.getStream = function(category, filename, callback){
        db.onOpened(function(){
            if(callback){
                var bucket = new GridFSBucket(db._native, { bucketName: category });
                callback(null, bucket.openDownloadStreamByName(filename));
            }
        });
    };
    
    /**
    * Get file data
    * @param {string} category - collection from where to read data
    * @param {string} filename - filename
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getData("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    countlyFs.getData = function(category, filename, callback){
        db.onOpened(function(){
            var bucket = new GridFSBucket(db._native, { bucketName: category });
            var downloadStream = bucket.openDownloadStreamByName(filename);
            downloadStream.on('error', function(error) {
                if(callback)
                    callback(error, null);
            });
            
            var str = '';
            downloadStream.on('data', function(data) {
                str += data.toString('utf8');
            });
    
            downloadStream.on('end', function() {
                if(callback)
                    callback(null, str);
            });
        });
    };
    
    /**
    * Get file data by file id
    * @param {string} category - collection from where to read data
    * @param {string} id - file id provided upon creation
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getDataById("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    countlyFs.getDataById = function(category, id, callback){
        db.onOpened(function(){
            var bucket = new GridFSBucket(db._native, { bucketName: category });
            var downloadStream = bucket.openDownloadStream(id);
            downloadStream.on('error', function(error) {
                if(callback)
                    callback(error, null);
            });
            
            var str = '';
            downloadStream.on('data', function(data) {
                str += data.toString('utf8');
            });
    
            downloadStream.on('end', function() {
                if(callback)
                    callback(null, str);
            });
        });
    };
    
    /**
    * Get handler for filesystem, which in case of GridFS is database connection
    * @returns {object} databse connection
    * @example
    * var db = countlyFs.getHandler();
    * db.close();
    */
    countlyFs.getHandler = function(){
        return db;
    };
    
}(countlyFs));

module.exports = countlyFs;