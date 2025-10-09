import { ObjectId } from "mongodb";
import { ValidateArgsProperties, ValidateArgsReturn } from "./common";

/**
 * Base class for data classes for json getter
 *
 * @see push/api/data/* for examples
 */
export class Jsonable {
  /**
   * Internal data storage
   */
  protected _data: Record<string, any>;

  /**
   * Constructor
   *
   * @param data data object
   */
  constructor(data?: Record<string, any>);

  /**
   * Set data doing any decoding / transformations along the way
   *
   * @param data data to set
   */
  setData(data: Record<string, any>): void;

  /**
   * Update internal data doing any decoding / transformations along the way
   *
   * @param update data update
   */
  updateData(update: Record<string, any>): void;

  /**
   * Get new object containing all fields ready for sending to client side
   */
  get json(): Record<string, any>;

  /**
   * Compatibility layer for cache & standard node.js functions IPC
   *
   * @returns json string
   */
  toJSON(): Record<string, any>;
}

/**
 * Validation class
 *
 * @see push/api/data/* for examples
 */
export class Validatable extends Jsonable {
  /**
   * Class scheme
   */
  static get scheme(): Record<string, ValidateArgsProperties>;

  /**
   * Class schema per given data, allows schema variativity for given data (validates according to subclasses schemas using a discriminator field)
   * @see push/api/data/trigger.js
   *
   * @returns class schema by default
   */
  static discriminator(
    data?: Record<string, any>
  ): Record<string, ValidateArgsProperties>;

  /**
   * Override Jsonable logic allowing only valid data to be saved
   */
  get json(): Record<string, any>;

  /**
   * Validate data
   *
   * @param data data to validate
   * @param scheme optional scheme override
   * @returns common.validateArgs object with replaced by class instance: {errors: [], result: true, obj: Validatable}
   */
  static validate(
    data: Record<string, any>,
    scheme?: Record<string, ValidateArgsProperties>
  ): ValidateArgsReturn;

  /**
   * Validate data
   *
   * @returns array of string errors or undefined if validation passed
   */
  validate(): string[] | undefined;
}

/**
 * Batch insert interface for MongoDB operations
 */
export interface BatchInsert {
  /**
   * Get current batch buffer length
   */
  readonly length: number;

  /**
   * Get current batch total count
   */
  readonly total: number;

  /**
   * Async push, that is if we're ok with a promise per insert
   *
   * @param record document to insert
   */
  pushAsync(record: Record<string, any>): Promise<void>;

  /**
   * Sync push, that is if we're NOT ok with a promise per insert
   *
   * @param record document to insert
   * @returns true if buffer needs to be flush()ed
   */
  pushSync(record: Record<string, any>): boolean;

  /**
   * Flush the buffer by inserting documents into collection
   *
   * @param ignore_codes error codes to ignore
   */
  flush(ignore_codes?: number[]): Promise<Record<string, ObjectId>>;
}

/**
 * Base class for MongoDB-backed instances
 *
 * @see push/api/data/* for examples
 */
export class Mongoable extends Validatable {
  /**
   * Must be overridden in subclasses to return collection name
   */
  static get collection(): string;

  /**
   * Getter for id as a string
   */
  get id(): string | undefined;

  /**
   * Getter for id as is
   */
  get _id(): ObjectId | undefined;

  /**
   * Setter for _id
   *
   * @param id ObjectID value
   */
  set _id(id: ObjectId | null | undefined);

  /**
   * Find a record in db and map it to instance of this class
   *
   * @param query query for findOne
   * @returns instance of this class if the record is found in database, null otherwise
   */
  static findOne<T extends Mongoable>(
    this: new (...args: any[]) => T,
    query: Record<string, any> | string | ObjectId
  ): Promise<T | null>;

  /**
   * Refresh current instance with data from the database
   *
   * @returns this instance of this class if the record is found in database, false otherwise
   */
  refresh<T extends Mongoable>(): Promise<T | false>;

  /**
   * Find multiple records in db and map them to instances of this class
   *
   * @param query query for find
   * @returns array of instances of this class if the records are found in the database, empty array otherwise
   */
  static findMany<T extends Mongoable>(
    this: new (...args: any[]) => T,
    query: Record<string, any>
  ): Promise<T[]>;

  /**
   * Count records in collection
   *
   * @param query query for count
   * @returns count of records in collection satisfying the query
   */
  static count(query: Record<string, any>): Promise<number>;

  /**
   * Delete record from collection
   *
   * @param query query for count
   * @returns count of records in collection satisfying the query
   */
  static deleteOne(query: Record<string, any>): Promise<any>;

  /**
   * Pass current data to mongo's save
   */
  save(): Promise<void>;

  /**
   * Run an update operation modifying this's _data
   *
   * @param update query for an update
   * @param op op to run to modify state of this in case of success
   */
  update<T extends Mongoable>(
    update: Record<string, any>,
    op: (instance: T) => any
  ): Promise<any>;

  /**
   * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
   *
   * @param filter filter for an update
   * @param update modify for a findAndModify
   * @returns true in case of success, false otherwise
   */
  static findOneAndUpdate<T extends Mongoable>(
    this: new (...args: any[]) => T,
    filter: Record<string, any>,
    update: Record<string, any>
  ): Promise<T | false>;

  /**
   * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
   *
   * @param filter filter for an update
   * @param update modify for a findAndModify
   * @returns true in case of success, false otherwise
   */
  updateAtomically<T extends Mongoable>(
    filter: Record<string, any>,
    update: Record<string, any>
  ): Promise<T | false>;

  /**
   * Simple batch insert object:
   *
   * let batch = Model.batchInsert(3);
   * await batch.pushAsync({a: 1});
   * await batch.pushAsync({a: 2});
   * await batch.pushAsync({a: 3}); // <- insertMany here
   * await batch.pushAsync({a: 4});
   * ...
   * await batch.flush(); // flush the rest
   *
   * --- or ---
   *
   * for (let n of [1, 2, 3]) {
   *     if (batch.pushSync({a: 1})) {
   *         await batch.flush();
   *     }
   * }
   *
   * @param batch batch size
   * @returns with 2 async methods: push(record) and flush()
   */
  static batchInsert(batch?: number): BatchInsert;
}
