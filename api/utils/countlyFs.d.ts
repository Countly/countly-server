import { Db, GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "stream";

/**
 * Module to abstract storing files on hard drive or in a shared system between multiple countly instances, currently based on GridFS
 * @module api/utils/countlyFs
 */
export interface CountlyFsOptions {
  id?: string;
  writeMode?: "overwrite" | "version";
  chunkSizeBytes?: number;
  metadata?: any;
  contentType?: string;
  aliases?: string[];
  forceClean?: boolean;
}

export interface CountlyFs {
  gridfs: {
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param dest - filename
     * @param readStream - stream where to get file content
     * @param options - additional options for saving file
     * @param options.id - custom id for the file
     * @param callback - function called when we have result, providing error object as first param and id as second
     */
    saveData(
      category: string,
      dest: string,
      data: string,
      options: CountlyFsOptions,
      callback: (err: any, result: any) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param dest - filename
     * @param readStream - stream where to get file content
     * @param options - additional options for saving file
     * @param options.id - custom id for the file
     * @param callback - function called when we have result, providing error object as first param and id as second
     */
    saveStream(
      category: string,
      dest: string,
      readStream: Readable,
      options: CountlyFsOptions,
      callback: (err: any, result: any) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param dest - filename
     * @param options - additional options for saving file
     * @param options.id - custom id for the file
     * @param callback - function called when we have result, providing error object as first param and stream as second
     */
    getStream(
      category: string,
      dest: string,
      options: CountlyFsOptions,
      callback: (err: any, stream: Readable) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param id - file id
     * @param callback - function called when we have result, providing error object as first param and stream as second
     */
    getStreamById(
      category: string,
      id: string,
      callback: (err: any, stream: Readable) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param dest - filename
     * @param options - additional options for saving file
     * @param options.id - custom id for the file
     * @param callback - function called when we have result, providing error object as first param and size as second
     */
    getSize(
      category: string,
      dest: string,
      options: CountlyFsOptions,
      callback: (err: any, size: number) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param id - file id
     * @param callback - function called when we have result, providing error object as first param
     */
    deleteFileById(
      category: string,
      id: string,
      callback: (err: any) => void
    ): void;
    /**
     * Generic save function for data in gridfs
     * @param category - collection where to store data
     * @param id - file id
     * @param updateFields - fields to update
     * @param callback - function called when updating was completed or errored, providing error object as first param and result as second
     */
    updateFileById(
      category: string,
      id: string,
      updateFields: any,
      callback: (err: any, result: any) => void
    ): void;
  };
  /**
   * Get file's id
   * @param category - collection where to store data
   * @param filename - filename
   * @param callback - function called when we have result, providing error object as first param and id as second
   */
  getId(
    category: string,
    filename: string,
    callback: (err: any, id: string | false) => void
  ): void;
  /**
   * Check if file exists
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param callback - function called when we have result, providing error object as first param and boolean as second to indicate if file exists
   */
  exists(
    category: string,
    dest: string,
    options: CountlyFsOptions,
    callback: (err: any, exists: boolean) => void
  ): void;
  /**
   * Save file in shared system
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param source - source file
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
   * @param options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
   * @param options.metadata - Optional object to store in the file document's metadata field
   * @param contentType - Optional string to store in the file document's contentType field
   * @param aliases - Optional array of strings to store in the file document's aliases field
   * @param callback - function called when saving was completed or errored, providing error object as first param
   */
  saveFile(
    category: string,
    dest: string,
    source: string,
    options: CountlyFsOptions,
    callback: (err: any) => void
  ): void;
  /**
   * Save string data in shared system
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param data - data to save
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
   * @param options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
   * @param options.metadata - Optional object to store in the file document's metadata field
   * @param contentType - Optional string to store in the file document's contentType field
   * @param aliases - Optional array of strings to store in the file document's aliases field
   * @param callback - function called when saving was completed or errored, providing error object as first param
   */
  saveData(
    category: string,
    dest: string,
    data: string,
    options: CountlyFsOptions,
    callback: (err: any) => void
  ): void;
  /**
   * Save file from stream in shared system
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param readStream - stream where to get file content
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param options.writeMode - write mode, by default errors on existing file, possible values "overwrite" deleting previous file, or "version", will not work with provided custom id
   * @param options.chunkSizeBytes - Optional overwrite this bucket's chunkSizeBytes for this file
   * @param options.metadata - Optional object to store in the file document's metadata field
   * @param contentType - Optional string to store in the file document's contentType field
   * @param aliases - Optional array of strings to store in the file document's aliases field
   * @param callback - function called when saving was completed or errored, providing error object as first param
   */
  saveStream(
    category: string,
    dest: string,
    readStream: Readable,
    options: CountlyFsOptions,
    callback: (err: any) => void
  ): void;
  /**
   * Rename existing file
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param source - source file
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param callback - function called when renaming was completed or errored, providing error object as first param
   */
  rename(
    category: string,
    dest: string,
    source: string,
    options: CountlyFsOptions,
    callback: (err: any) => void
  ): Promise<void>;
  /**
   * Delete file from shared system
   * @param category - collection where to store data
   * @param dest - file's destination
   * @param options - additional options for saving file
   * @param options.id - custom id for the file
   * @param callback - function called when deleting was completed or errored, providing error object as first param
   */
  deleteFile(
    category: string,
    dest: string,
    options: CountlyFsOptions,
    callback: (err: any) => void
  ): void;
  /**
   * Delete all files from collection/category
   * @param category - collection of files to delete
   * @param dest - directory destination
   * @param callback - function called when deleting was completed or errored, providing error object as first param
   */
  deleteAll(
    category: string,
    dest: string,
    callback: (err: any) => void
  ): Promise<void>;
  /**
   * Force clean file if there were errors inserting or deleting previously
   * @param category - collection where to store data
   * @param filename - filename
   * @param callback - function called when deleting was completed or errored, providing error object as first param
   */
  clearFile(
    category: string,
    filename: string,
    callback: (err: any) => void
  ): void;
}

declare const countlyFs: CountlyFs;
export default countlyFs;
