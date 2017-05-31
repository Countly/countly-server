/**
* Module to abstract storing files in a shared system between multiple countly instances
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
    function checkIfOpened(callback){
        if(db.isOpen())
            callback();
        else{
            db._emitter.once('open', function (err, db) {
                callback();
            });
        }
    }
    
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
    * @param {string=} filename - filename, can be used to rename file, if not provided will be used from path
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveFile("test", "./CHANGELOG.md", function(err){
    *   console.log("Storing file finished", err);
    * });
    */
    countlyFs.saveFile = function(category, path, filename, callback){
        if(typeof filename === "function"){
            callback = filename;
            filename = null;
        }
        if(!filename)
            filename = path.split("/").pop();
        countlyFs.exists(category, filename, function(err, res){
            if(!err){
                if(!res){
                    checkIfOpened(function(){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        var readStream = fs.createReadStream(path);
                        var uploadStream = bucket.openUploadStream(filename);
                        uploadStream.once('finish', function() {
                            if(callback)
                                callback(null)
                        });
                        uploadStream.on('error', function(error) {
                            if(callback)
                                callback(error);
                        });
                        readStream.pipe(uploadStream);
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
    };
    
    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {string} data - data to save
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveData("test", "test.text", "some\nmultiline\ntest", function(err){
    *   console.log("Storing data finished", err);
    * });
    */
    countlyFs.saveData = function(category, filename, data, callback){
        countlyFs.exists(category, filename, function(err, res){
            if(!err){
                if(!res){
                    checkIfOpened(function(){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        var readStream = new Readable;
                        readStream.push(data);
                        readStream.push(null);
                        var uploadStream = bucket.openUploadStream(filename);
                        uploadStream.once('finish', function() {
                            if(callback)
                                callback(null)
                        });
                        uploadStream.on('error', function(error) {
                            if(callback)
                                callback(error);
                        });
                        readStream.pipe(uploadStream);
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
    };
    
    /**
    * Save file from stream in shared system
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {stream} stream - stream where to get file content
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveStream("test", "AGPLv3", fs.createReadStream("AGPLv3"), function(err){
    *   console.log("Storing stream finished", err);
    * });
    */
    countlyFs.saveStream = function(category, filename, stream, callback){
        countlyFs.exists(category, filename, function(err, res){
            if(!err){
                if(!res){
                    checkIfOpened(function(){
                        var bucket = new GridFSBucket(db._native, { bucketName: category });
                        var uploadStream = bucket.openUploadStream(filename);
                        uploadStream.once('finish', function() {
                            if(callback)
                                callback(null)
                        });
                        uploadStream.on('error', function(error) {
                            if(callback)
                                callback(error);
                        });
                        stream.pipe(uploadStream);
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
        checkIfOpened(function(){
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
        checkIfOpened(function(){
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
        checkIfOpened(function(){
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
        checkIfOpened(function(){
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
        checkIfOpened(function(){
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
    
}(countlyFs));

module.exports = countlyFs;