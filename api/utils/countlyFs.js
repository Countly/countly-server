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
    /**
    * Save file in shared system
    * @param {string} category - collection where to store data
    * @param {string} path - path to file
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    */
    countlyFs.saveFile = function(category, path, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        var readStream = fs.createReadStream(path);
        var filename = path.split("/").pop();
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
    };
    
    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} file - filename
    * @param {string} data - data to save
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    */
    countlyFs.saveData = function(category, path, data, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        var readStream = new Readable;
        readStream.push(data);
        readStream.push(null);
        var filename = path.split("/").pop();
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
    };
    
    /**
    * Save file from stream in shared system
    * @param {string} category - collection where to store data
    * @param {string} file - filename
    * @param {stream} stream - stream where to get file content
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    */
    countlyFs.saveStream = function(category, file, stream, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        var uploadStream = bucket.openUploadStream(file);
        uploadStream.once('finish', function() {
            if(callback)
                callback(null)
        });
        uploadStream.on('error', function(error) {
            if(callback)
                callback(error);
        });
        stream.pipe(uploadStream);
    };
    
    /**
    * Delete file from shared system
    * @param {string} category - collection where to store data
    * @param {string} file - filename
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    */
    countlyFs.deleteFile = function(category, file, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        db.collection(category+".files").findOne({ filename: file }, function(err, res){
            if(!err){
                bucket.delete(res._id, function(error) {
                    if(callback)
                        callback(error);
                });
            }
            else{
                if(callback)
                    callback(err);
            }
        });
    };
    
    /**
    * Delete all files from collection/category
    * @param {string} category - collection of files to delete
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    */
    countlyFs.deleteAll = function(category, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        bucket.drop(function(error) {
            if(callback)
                callback(error);
        });
    };
    
    /**
    * Get stream for file
    * @param {string} category - collection from where to read data
    * @param {string} file - filename
    * @return {stream} read stream
    */
    countlyFs.getStream = function(category, file){
        var bucket = new GridFSBucket(db, { bucketName: category });
        return bucket.openDownloadStreamByName(file);
    };
    
    /**
    * Get file data
    * @param {string} category - collection from where to read data
    * @param {string} file - filename
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    */
    countlyFs.getFile = function(category, file, callback){
        var bucket = new GridFSBucket(db, { bucketName: category });
        var downloadStream = bucket.openDownloadStreamByName(file);
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
    };
    
}(countlyFs));

module.exports = countlyFs;