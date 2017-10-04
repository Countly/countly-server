/**
* Module to abstract storing files on hard drive or in a shared system between multiple countly instances, currently based on GridFS
* @module api/utils/countlyFs
*/

/** @lends module:api/utils/countlyFs */
var countlyFs = {};

var plugins = require("../../plugins/pluginManager.js");
var GridFSBucket = require("mongoskin").GridFSBucket;
var Readable = require('stream').Readable;
var db = plugins.dbConnection("countly_fs");
var fs = require("fs");
var path = require("path");
var config = require("../config.js");

/**
 * Direct GridFS methods
 */
countlyFs.gridfs = {};

(function (ob) {
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
        ob.getId(category, filename, function(err, res){
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
    ob.getId = function(category, filename, callback){
        db.collection(category+".files").findOne({ filename: filename }, {_id:1}, function(err, res){
            if(callback)
                callback(err, (res && res._id) ? res._id : false);
        });
    };
    
    /**
    * Check if file exists
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
    * @example
    * countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
    *   if(exists)
    *       console.log("File exists");
    * });
    */
    ob.exists = function(category, dest, callback){
        var filename = dest.split(path.sep).pop();
        db.collection(category+".files").findOne({ filename: filename }, {_id:1}, function(err, res){
            if(callback)
                callback(err, (res && res._id) ? true : false);
        });
    };
    
    /**
    * Save file in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
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
    ob.saveFile = function(category, dest, source, options, callback){
        if(typeof options === "function"){
            callback = options;
            options = null;
        }
        if(!options){
            options = {};
        }

        var filename = dest.split(path.sep).pop();
        beforeSave(category, filename, options, callback, function(){
            save(category, filename, fs.createReadStream(source), options, callback);
        });
    };
    
    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
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
    ob.saveData = function(category, dest, data, options, callback){
        var filename = dest.split(path.sep).pop();
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
    * @param {string} dest - file's destination
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
    ob.saveStream = function(category, dest, readStream, options, callback){
        var filename = dest.split(path.sep).pop();
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
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {function} callback - function called when renaming was completed or errored, providing error object as first param
    * @example
    * countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.rename = function(category, dest, source, callback){
        var newname = dest.split(path.sep).pop();
        var oldname = source.split(path.sep).pop();
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
    * @param {string} dest - file's destination
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteFile = function(category, dest, callback){
        var filename = dest.split(path.sep).pop();
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
    * @param {string} dest - directory destination
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteAll("test", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteAll = function(category, dest, callback){
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
    * @param {string} dest - file's destination
    * @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
    * @example
    * countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
    *   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
    *   stream.pipe(writeStream);
    * });
    */
    ob.getStream = function(category, dest, callback){
        var filename = dest.split(path.sep).pop();
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
    * @param {string} dest - file's destination
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getData("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    ob.getData = function(category, dest, callback){
        var filename = dest.split(path.sep).pop();
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
    ob.getDataById = function(category, id, callback){
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
    ob.getHandler = function(){
        return db;
    };
    
}(countlyFs.gridfs));

/**
 * Direct FS methods
 */
countlyFs.fs = {};
(function (ob) {
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
    ob.exists = function(category, dest, callback){
        fs.exists(dest, function(exists){
            if(callback)
                callback(null, exists);
        });
    };
    
    /**
    * Save file in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
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
    ob.saveFile = function(category, dest, source, options, callback){
        var is = fs.createReadStream(source);
        var os = fs.createWriteStream(dest);
        is.pipe(os);
        is.on('end',function() {});
        if(callback)
            os.on('finish', callback);
    };
    
    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
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
    ob.saveData = function(category, dest, data, options, callback){
        fs.writeFile(dest, data, function(err){
            if(callback)
                callback(err);
        });
    };
    
    /**
    * Save file from stream in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
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
    ob.saveStream = function(category, dest, is, options, callback){
        var os = fs.createWriteStream(dest);
        is.pipe(os);
        if(callback)
            os.on('finish', callback);
    };
    
    /**
    * Rename existing file
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {function} callback - function called when renaming was completed or errored, providing error object as first param
    * @example
    * countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.rename = function(category, dest, source, callback){
        fs.rename(source, dest, function(err){
            if(callback)
                callback(err);
        });
    };
    
    /**
    * Delete file from shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteFile = function(category, dest, callback){
        fs.unlink(dest, function(err){
            if(callback)
                callback(err);
        });
        
    };
    
    /**
    * Get stream for file
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
    * @example
    * countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
    *   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
    *   stream.pipe(writeStream);
    * });
    */
    ob.getStream = function(category, dest, callback){
        var rstream = fs.createReadStream(dest);
        if(callback)
            callback(null, rstream);
    };
    
    /**
    * Get file data
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getData("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    ob.getData = function(category, dest, callback){
        fs.readFile(dest, 'utf8', function(err, data){
            if(callback)
                callback(err, data);
        });
    };
    
    /**
    * Get handler for filesystem, which in case of GridFS is database connection
    * @returns {object} databse connection
    * @example
    * var db = countlyFs.getHandler();
    * db.close();
    */
    ob.getHandler = function(){
        return db;
    };
    
}(countlyFs.fs));

/**
* Check if file exists
* @param {string} category - collection where to store data for gridfs
* @param {string} dest - file's destination
* @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
* @example
* countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
*   if(exists)
*       console.log("File exists");
* });
*/
countlyFs.exists = function(category, dest, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.exists.apply(handler, arguments);
};

/**
* Save file in shared system
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
* @param {string} source - source file
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
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
countlyFs.saveFile = function(category, dest, source, options, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.saveFile.apply(handler, arguments);
};

/**
* Save string data in shared system
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
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
    var handler = this[config.fileStorage] || this.fs;
    handler.saveData.apply(handler, arguments);
};

/**
* Save file from stream in shared system
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
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
    var handler = this[config.fileStorage] || this.fs;
    handler.saveStream.apply(handler, arguments);
};

/**
* Move or Rename existing file
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
* @param {string} source - source file
* @param {function} callback - function called when renaming was completed or errored, providing error object as first param
* @example
* countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
*   console.log("Finished", err);
* });
*/
countlyFs.rename = function(category, oldname, newname, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.rename.apply(handler, arguments);
};

/**
* Delete file from shared system
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
* @param {function} callback - function called when deleting was completed or errored, providing error object as first param
* @example
* countlyFs.deleteFile("test", "AGPLv3", function(err){
*   console.log("Finished", err);
* });
*/
countlyFs.deleteFile = function(category, filename, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.deleteFile.apply(handler, arguments);
};

/**
* Get stream for file
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
* @example
* countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
*   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
*   stream.pipe(writeStream);
* });
*/
countlyFs.getStream = function(category, dest, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.getStream.apply(handler, arguments);
};

/**
* Get file data
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {function} callback - function called when retrieving file was completed or errored, providing error object as first param and filedata as second
* @example
* countlyFs.getData("test", "AGPLv3", function(err, data){
*   console.log("Retrieved", err, data); 
* });
*/
countlyFs.getData = function(category, filename, callback){
    var handler = this[config.fileStorage] || this.fs;
    handler.getData.apply(handler, arguments);
};

/**
* Get handler for connection to close it, for stopping separate scripts
* @returns {object} databse connection
* @example
* var db = countlyFs.getHandler();
* db.close();
*/
countlyFs.getHandler = function(){
    var handler = this[config.fileStorage] || this.fs;
    return handler.getHandler();
};

module.exports = countlyFs;