/**
* Module to abstract storing files on hard drive or in a shared system between multiple countly instances, currently based on GridFS
* @module api/utils/countlyFs
*/

/** @lends module:api/utils/countlyFs */
var countlyFs = {};

var GridFSBucket = require("mongodb").GridFSBucket;
var Readable = require('stream').Readable;
var fs = require("fs");
var path = require("path");
var config = require("../config.js");
var db;
var log = require('./log.js')('core:fs');

/**
* Direct GridFS methods
*/
countlyFs.gridfs = {};

(function(ob) {
    /**
    * Generic save function for data in gridfs
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {stream} readStream - stream where to get file content
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when we have result, providing error object as first param and id as second
    **/
    function save(category, filename, readStream, options, callback) {
        log.d("saving file", filename);
        var bucket = new GridFSBucket(db, { bucketName: category });
        var uploadStream;
        var id = options.id;
        delete options.id;
        delete options.writeMode;
        if (typeof id === "string") {
            uploadStream = bucket.openUploadStreamWithId(id, filename, options);
        }
        else {
            uploadStream = bucket.openUploadStream(filename, options);
        }
        uploadStream.once('finish', function() {
            log.d("file saved", filename);
            if (callback) {
                callback(null);
            }
        });
        uploadStream.on('error', function(error) {
            log.d("error saving file", filename, error);
            if (callback) {
                callback(error);
            }
        });
        readStream.pipe(uploadStream);
    }

    /**
    * Preprocessing hook before saving data
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when we have result, providing error object as first param and id as second
    * @param {function} done - function called hook is done
    **/
    function beforeSave(category, filename, options, callback, done) {
        log.d("checking file", filename);
        ob.getId(category, filename, function(err, res) {
            log.d("file state", filename, err, res);
            if (options.forceClean) {
                ob.clearFile(category, filename, done);
            }
            else if (!err) {
                if (!res || options.writeMode === "version") {
                    done();
                }
                else if (options.writeMode === "overwrite") {
                    var bucket = new GridFSBucket(db, { bucketName: category });
                    log.d("deleting file", filename);
                    bucket.delete(res, function(error) {
                        log.d("deleted", filename, error);
                        if (!error) {
                            setTimeout(done, 1);
                        }
                        else if (callback) {
                            callback(error);
                        }
                    });
                }
                else {
                    if (callback) {
                        callback(new Error("File already exists"), res);
                    }
                }
            }
            else {
                if (callback) {
                    callback(err, res);
                }
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
    ob.getId = function(category, filename, callback) {
        db.collection(category + ".files").findOne({ filename: filename }, {_id: 1}, function(err, res) {
            if (callback) {
                callback(err, (res && res._id) ? res._id : false);
            }
        });
    };

    /**
    * Check if file exists
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
    * @example
    * countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
    *   if(exists)
    *       console.log("File exists");
    * });
    */
    ob.exists = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }
        var query = {};
        if (options.id) {
            query._id = options.id;
        }
        else {
            query.filename = dest.split(path.sep).pop();
        }
        db.collection(category + ".files").findOne(query, {_id: 1}, function(err, res) {
            if (callback) {
                callback(err, (res && res._id) ? true : false);
            }
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
    ob.saveFile = function(category, dest, source, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var filename = dest.split(path.sep).pop();
        beforeSave(category, filename, options, callback, function() {
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
    ob.saveData = function(category, dest, data, options, callback) {
        var filename = dest.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }
        beforeSave(category, filename, options, callback, function() {
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
    ob.saveStream = function(category, dest, readStream, options, callback) {
        var filename = dest.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }
        beforeSave(category, filename, options, callback, function() {
            save(category, filename, readStream, options, callback);
        });
    };

    /**
    * Rename existing file
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when renaming was completed or errored, providing error object as first param
    * @example
    * countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.rename = function(category, dest, source, options, callback) {
        var newname = dest.split(path.sep).pop();
        var oldname = source.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        if (options.id) {
            let bucket = new GridFSBucket(db, { bucketName: category });
            bucket.rename(options.id, newname, function(error) {
                if (callback) {
                    callback(error);
                }
            });
        }
        else {
            db.collection(category + ".files").findOne({ filename: oldname }, {_id: 1}, function(err, res) {
                if (!err) {
                    if (res && res._id) {
                        let bucket = new GridFSBucket(db, { bucketName: category });
                        bucket.rename(res._id, newname, function(error) {
                            if (callback) {
                                callback(error);
                            }
                        });
                    }
                    else {
                        if (callback) {
                            callback(new Error("File does not exist"));
                        }
                    }
                }
                else {
                    if (callback) {
                        callback(err);
                    }
                }
            });
        }
    };

    /**
    * Delete file from shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteFile = function(category, dest, options, callback) {
        var filename = dest.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        if (options.id) {
            ob.deleteFileById(category, options.id, callback);
        }
        else {
            db.collection(category + ".files").findOne({ filename: filename }, {_id: 1}, function(err, res) {
                if (!err) {
                    if (res && res._id) {
                        ob.deleteFileById(category, res._id, callback);
                    }
                    else {
                        if (callback) {
                            callback(new Error("File does not exist"));
                        }
                    }
                }
                else {
                    if (callback) {
                        callback(err);
                    }
                }
            });
        }
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
    ob.deleteAll = function(category, dest, callback) {
        var bucket = new GridFSBucket(db, { bucketName: category });
        bucket.drop(function(error) {
            if (callback) {
                callback(error);
            }
        });
    };

    /**
    * Get stream for file
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
    * @example
    * countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
    *   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
    *   stream.pipe(writeStream);
    * });
    */
    ob.getStream = function(category, dest, options, callback) {
        var filename = dest.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        if (callback) {
            if (options.id) {
                ob.getStreamById(category, options.id, callback);
            }
            else {
                var bucket = new GridFSBucket(db, { bucketName: category });
                callback(null, bucket.openDownloadStreamByName(filename));
            }
        }
    };

    /**
    * Get file data
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getData("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    ob.getData = function(category, dest, options, callback) {
        var filename = dest.split(path.sep).pop();
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        if (options.id) {
            ob.getDataById(category, options.id, callback);
        }
        else {
            var bucket = new GridFSBucket(db, { bucketName: category });
            var downloadStream = bucket.openDownloadStreamByName(filename);
            downloadStream.on('error', function(error) {
                if (callback) {
                    callback(error, null);
                }
            });

            var str = '';
            downloadStream.on('data', function(data) {
                str += data.toString('utf8');
            });

            downloadStream.on('end', function() {
                if (callback) {
                    callback(null, str);
                }
            });
        }
    };

    /**
    * Get file size
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
    * @example
    * countlyFs.getSize("test", "AGPLv3", function(err, size){
    *   console.log("Retrieved", err, size); 
    * });
    */
    ob.getSize = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var query = {};
        if (options.id) {
            query._id = options.id;
        }
        else {
            query.filename = dest.split(path.sep).pop();
        }
        db.collection(category + ".files").findOne(query, {length: 1}, function(err, res) {
            if (callback) {
                callback(err, (res && res.length) ? res.length : 0);
            }
        });
    };

    /**
    * Get file stats
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
    * @example
    * countlyFs.getStats("test", "AGPLv3", function(err, stats){
    *   console.log("Retrieved", err, stats); 
    * });
    */
    ob.getStats = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var query = {};
        if (options.id) {
            query._id = options.id;
        }
        else {
            query.filename = dest.split(path.sep).pop();
        }
        db.collection(category + ".files").findOne(query, {}, function(err, res) {
            if (callback) {
                var stats = {};
                stats.size = (res && res.length) ? res.length : 0;
                stats.blksize = (res && res.chunkSize) ? res.chunkSize : 0;
                stats.atimeMs = (res && res.uploadDate) ? res.uploadDate.getTime() : 0;
                stats.mtimeMs = (res && res.uploadDate) ? res.uploadDate.getTime() : 0;
                stats.ctimeMs = (res && res.uploadDate) ? res.uploadDate.getTime() : 0;
                stats.birthtimeMs = (res && res.uploadDate) ? res.uploadDate.getTime() : 0;
                stats.atime = (res && res.uploadDate) ? res.uploadDate : new Date();
                stats.mtime = (res && res.uploadDate) ? res.uploadDate : new Date();
                stats.ctime = (res && res.uploadDate) ? res.uploadDate : new Date();
                stats.birthtime = (res && res.uploadDate) ? res.uploadDate : new Date();
                callback(err, stats);
            }
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
    ob.getDataById = function(category, id, callback) {
        var bucket = new GridFSBucket(db, { bucketName: category });
        var downloadStream = bucket.openDownloadStream(id);
        downloadStream.on('error', function(error) {
            if (callback) {
                callback(error, null);
            }
        });

        var str = '';
        downloadStream.on('data', function(data) {
            str += data.toString('utf8');
        });

        downloadStream.on('end', function() {
            if (callback) {
                callback(null, str);
            }
        });
    };

    /**
    * Get file stream by file id
    * @param {string} category - collection from where to read data
    * @param {string} id - file id provided upon creation
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getStreamById("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    ob.getStreamById = function(category, id, callback) {
        if (callback) {
            var bucket = new GridFSBucket(db, { bucketName: category });
            callback(null, bucket.openDownloadStream(id));
        }
    };

    /**
    * Delete file by id from shared system
    * @param {string} category - collection where to store data
    * @param {string} id - file id provided upon creation
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFileById("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteFileById = function(category, id, callback) {
        var bucket = new GridFSBucket(db, { bucketName: category });
        bucket.delete(id, function(error) {
            if (callback) {
                callback(error);
            }
        });
    };

    /**
    * Force clean file if there were errors inserting or deleting previously
    * @param {string} category - collection where to store data
    * @param {string} filename - filename
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.clearFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.clearFile = function(category, filename, callback) {
        db.collection(category + ".files").deleteMany({ filename: filename }, function(err1, res1) {
            log.d("deleting files", category, { filename: filename }, err1, res1 && res1.result);
            db.collection(category + ".chunks").deleteMany({ files_id: filename }, function(err2, res2) {
                log.d("deleting chunks", category, { files_id: filename }, err1, res2 && res2.result);
                if (callback) {
                    callback(err1 || err2);
                }
            });
        });
    };
    /**
     * List files inside the category (collection/directory)
     * @param {string} category - collection to list files in
     * @param {function} callback - function called when files found or query errored, providing error object as first param and a list of filename, creation date and size as secondas second
     */
    ob.listFiles = function(category, callback) {
        const bucket = new GridFSBucket(db, { bucketName: category });
        bucket.find().toArray()
            .then((records) => callback(
                null,
                records.map(({ filename, uploadDate, length }) =>  ({
                    filename,
                    createdOn: uploadDate,
                    size: length
                }))
            ))
            .catch((error) => callback(error, null));
    }

    /**
    * Get handler for filesystem, which in case of GridFS is database connection
    * @returns {object} databse connection
    * @example
    * var db = countlyFs.getHandler();
    * db.close();
    */
    ob.getHandler = function() {
        return db;
    };

    /**
    * Set handler for filesystem, which in case of GridFS is database connection
    * @param {object} dbCon - database connection
    */
    ob.setHandler = function(dbCon) {
        db = dbCon;
    };

}(countlyFs.gridfs));

/**
* Direct FS methods
*/
countlyFs.fs = {};
(function(ob) {
    /**
    * Check if file exists
    * @param {string} category - collection where to store data
    * @param {string} dest - destination of file
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
    * @example
    * countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
    *   if(exists)
    *       console.log("File exists");
    * });
    */
    ob.exists = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.exists(dest, function(exists) {
            if (callback) {
                callback(null, exists);
            }
        });
    };

    /**
    * Save file in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveFile("test", "./CHANGELOG.md", function(err){
    *   console.log("Storing file finished", err);
    * });
    */
    ob.saveFile = function(category, dest, source, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var is = fs.createReadStream(source);
        var os = fs.createWriteStream(dest);
        is.pipe(os);
        is.on('end', function() {});
        if (callback) {
            os.on('finish', callback);
        }
    };

    /**
    * Save string data in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} data - data to save
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveData("test", "test.text", "some\nmultiline\ntest", function(err){
    *   console.log("Storing data finished", err);
    * });
    */
    ob.saveData = function(category, dest, data, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.writeFile(dest, data, function(err) {
            if (callback) {
                callback(err);
            }
        });
    };

    /**
    * Save file from stream in shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {stream} is - stream where to get file content
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when saving was completed or errored, providing error object as first param
    * @example
    * countlyFs.saveStream("test", "AGPLv3", fs.createReadStream("AGPLv3"), function(err){
    *   console.log("Storing stream finished", err);
    * });
    */
    ob.saveStream = function(category, dest, is, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var os = fs.createWriteStream(dest);
        is.pipe(os);
        is.on('end', function() {});
        os.on('finish', function() {
            if (callback) {
                callback();
            }
        });
    };

    /**
    * Rename existing file
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {string} source - source file
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when renaming was completed or errored, providing error object as first param
    * @example
    * countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.rename = function(category, dest, source, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.rename(source, dest, function(err) {
            if (callback) {
                callback(err);
            }
        });
    };

    /**
    * Delete file from shared system
    * @param {string} category - collection where to store data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when deleting was completed or errored, providing error object as first param
    * @example
    * countlyFs.deleteFile("test", "AGPLv3", function(err){
    *   console.log("Finished", err);
    * });
    */
    ob.deleteFile = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.unlink(dest, function(err) {
            if (callback) {
                callback(err);
            }
        });

    };

    /**
    * Get stream for file
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
    * @example
    * countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
    *   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
    *   stream.pipe(writeStream);
    * });
    */
    ob.getStream = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        var rstream = fs.createReadStream(dest);
        if (callback) {
            callback(null, rstream);
        }
    };

    /**
    * Get file data
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {function} callback - function called when retrieving stream was completed or errored, providing error object as first param and filedata as second
    * @example
    * countlyFs.getData("test", "AGPLv3", function(err, data){
    *   console.log("Retrieved", err, data); 
    * });
    */
    ob.getData = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.readFile(dest, 'utf8', function(err, data) {
            if (callback) {
                callback(err, data);
            }
        });
    };

    /**
    * Get file size
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
    * @example
    * countlyFs.getSize("test", "AGPLv3", function(err, size){
    *   console.log("Retrieved", err, size); 
    * });
    */
    ob.getSize = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.stat(dest, function(err, stats) {
            if (callback) {
                callback(err, stats.size);
            }
        });
    };

    /**
    * Get file stats
    * @param {string} category - collection from where to read data
    * @param {string} dest - file's destination
    * @param {object=} options - additional options for saving file
    * @param {string} options.id - custom id for the file
    * @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
    * @example
    * countlyFs.getStats("test", "AGPLv3", function(err, stats){
    *   console.log("Retrieved", err, stats); 
    * });
    */
    ob.getStats = function(category, dest, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }

        fs.stat(dest, function(err, stats) {
            if (callback) {
                callback(err, stats);
            }
        });
    };

    /**
     * List files inside the category (directory)
     * @param {string} category - directory to list files in
     * @param {function} callback - function called when files found, providing error object as first param and a list of filename, creation date and size as second
     */
    ob.listFiles = function(category, callback) {
        fs.readdir(category, function(err, files){
            if (err) {
                return callback(err);
            }
            callback(
                null,
                files.map(filename => {
                    const stats = fs.statSync(category + '/' + filename);
                    return {
                        filename,
                        createdOn: stats.mtime,
                        size: stats.size
                    };
                })
            );
        });  
    }

    /**
    * Get handler for filesystem, which in case of GridFS is database connection
    * @returns {object} databse connection
    * @example
    * var db = countlyFs.getHandler();
    * db.close();
    */
    ob.getHandler = function() {
        return db;
    };

    /**
    * Set handler for filesystem, which in case of GridFS is database connection
    * @param {object} dbCon - database connection
    */
    ob.setHandler = function(dbCon) {
        db = dbCon;
    };

}(countlyFs.fs));

/**
* Check if file exists
* @param {string} category - collection where to store data for gridfs
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
* @example
* countlyFs.exists("test", "./CHANGELOG.md", function(err, exists){
*   if(exists)
*       console.log("File exists");
* });
*/
countlyFs.exists = function() {
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
* countlyFs.saveFile("test", "./CHANGELOG", "./CHANGELOG.md", function(err){
*   console.log("Storing file finished", err);
* });
*/
countlyFs.saveFile = function() {
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
countlyFs.saveData = function() {
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
countlyFs.saveStream = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.saveStream.apply(handler, arguments);
};

/**
* Move or Rename existing file
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
* @param {string} source - source file
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when renaming was completed or errored, providing error object as first param
* @example
* countlyFs.rename("test", "AGPLv3", "LICENSE.md", function(err){
*   console.log("Finished", err);
* });
*/
countlyFs.rename = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.rename.apply(handler, arguments);
};

/**
* Delete file from shared system
* @param {string} category - collection where to store data
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when deleting was completed or errored, providing error object as first param
* @example
* countlyFs.deleteFile("test", "AGPLv3", function(err){
*   console.log("Finished", err);
* });
*/
countlyFs.deleteFile = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.deleteFile.apply(handler, arguments);
};

/**
* Get stream for file
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when establishing stream was completed or errored, providing error object as first param and stream as second
* @example
* countlyFs.getStream("test", "CHANGELOG.md", function(err, stream){
*   var writeStream = fs.createWriteStream('./CHANGELOG.md');    
*   stream.pipe(writeStream);
* });
*/
countlyFs.getStream = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.getStream.apply(handler, arguments);
};

/**
* Get file data
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when retrieving file was completed or errored, providing error object as first param and filedata as second
* @example
* countlyFs.getData("test", "AGPLv3", function(err, data){
*   console.log("Retrieved", err, data); 
* });
*/
countlyFs.getData = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.getData.apply(handler, arguments);
};

/**
* Get file size
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
* @example
* countlyFs.getSize("test", "AGPLv3", function(err, size){
*   console.log("Retrieved", err, size); 
* });
*/
countlyFs.getSize = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.getSize.apply(handler, arguments);
};

/**
* Get file stats
* @param {string} category - collection from where to read data
* @param {string} dest - file's destination
* @param {object=} options - additional options for saving file
* @param {string} options.id - custom id for the file
* @param {function} callback - function called when retrieving file size was completed or errored, providing error object as first param and file size as second
* @example
* countlyFs.getStats("test", "AGPLv3", function(err, stats){
*   //similar to fs.stat object
*   console.log("Retrieved", err, stats); 
* });
*/
countlyFs.getStats = function() {
    var handler = this[config.fileStorage] || this.fs;
    handler.getStats.apply(handler, arguments);
};

/**
* Get handler for connection to close it, for stopping separate scripts
* @returns {object} databse connection
* @example
* var db = countlyFs.getHandler();
* db.close();
*/
countlyFs.getHandler = function() {
    var handler = this[config.fileStorage] || this.fs;
    return handler.getHandler();
};

/**
* Set handler for connection
* @param {object} dbCon - database connection
*/
countlyFs.setHandler = function(dbCon) {
    var handler = this[config.fileStorage] || this.fs;
    handler.setHandler(dbCon);
};

/**
* Currently used file storage type
**/
countlyFs.type = config.fileStorage || "fs";

module.exports = countlyFs;