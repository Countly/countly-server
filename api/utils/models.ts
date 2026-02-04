import type { ObjectId, Collection, Document, Filter, UpdateFilter, FindOneAndUpdateOptions } from 'mongodb';
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);
const mongodb = require('mongodb');
const ObjectIdClass = mongodb.ObjectId as typeof ObjectId;

interface ValidationResult {
    result: boolean;
    errors?: string[];
    obj?: Record<string, unknown>;
    data?: unknown;
}

interface SchemeField {
    type: string;
    required?: boolean;
    [key: string]: unknown;
}

type Scheme = Record<string, SchemeField>;

interface CommonModule {
    db: {
        ObjectID: (id: string) => ObjectId;
        collection: <T extends Document = Document>(name: string) => Collection<T>;
    };
    validateArgs: (data: Record<string, unknown>, scheme: Scheme | Record<string, SchemeField>, returnResult?: boolean) => ValidationResult | null;
}

/**
 * Base class for data classes for json getter
 *
 * @see push/api/data/* for examples
 */
class Jsonable {
    protected _data: Record<string, unknown>;

    /**
     * Constructor
     *
     * @param data data object
     */
    constructor(data: Record<string, unknown> = {}) {
        this._data = {};
        this.setData(data);
    }

    /**
     * Set data doing any decoding / transformations along the way
     *
     * @param data data to set
     */
    setData(data: Record<string, unknown>): void {
        this._data = Object.assign({}, data);
    }

    /**
     * Update internal data doing any decoding / transformations along the way
     *
     * @param update data update
     */
    updateData(update: Record<string, unknown>): void {
        Object.assign(this._data, update);
    }

    /**
     * Get new object containing all fields ready for sending to client side
     */
    get json(): Record<string, unknown> {
        const json: Record<string, unknown> = {};
        for (const k of Object.keys(this._data)
            .filter(fk => this._data[fk] !== null && this._data[fk] !== undefined)) {
            const v = this._data[k];
            if (v instanceof Jsonable) {
                json[k] = v.json;
            }
            else if (Array.isArray(v)) {
                json[k] = v.map(x => x instanceof Jsonable ? x.json : x);
            }
            else if (typeof v === 'object') {
                const ret: Record<string, unknown> = {};
                for (const key in v as Record<string, unknown>) {
                    const val = (v as Record<string, unknown>)[key];
                    if (val && val instanceof Jsonable) {
                        ret[key] = val.json;
                    }
                    else {
                        ret[key] = val;
                    }
                }
                json[k] = ret;
            }
            else {
                json[k] = v;
            }
        }
        return json;
    }

    /**
     * Compatibility layer for cache & standard node.js functions IPC
     *
     * @returns json string
     */
    toJSON(): Record<string, unknown> {
        return this.json;
    }
}

/**
 * Validation class
 *
 * @see push/api/data/* for examples
 */
class Validatable extends Jsonable {
    /**
     * Class scheme
     */
    static get scheme(): Scheme {
        throw new Error('Must be overridden');
    }

    /**
     * Class schema per given data, allows schema variativity for given data (validates according to subclasses schemas using a discriminator field)
     * @see push/api/data/trigger.js
     *
     * @returns class schema by default
     */
    static discriminator(_data?: unknown): Scheme {
        return this.scheme;
    }

    /**
     * Override Jsonable logic allowing only valid data to be saved
     */
    get json(): Record<string, unknown> {
        const json: Record<string, unknown> = {};
        const scheme = (this.constructor as typeof Validatable).scheme;
        for (const k of Object.keys(scheme)
            .filter(fk => this._data[fk] !== null && this._data[fk] !== undefined)) {
            const v = this._data[k];
            if (v instanceof Validatable) {
                json[k] = v.json;
            }
            else if (Array.isArray(v) && v.filter(vv => vv instanceof Validatable).length === v.length) {
                json[k] = v.map(vv => vv.json);
            }
            else if (scheme[k].type === 'Object' && typeof v === 'object' && v !== null && Object.values(v as Record<string, unknown>).filter(vv => vv instanceof Validatable).length === Object.values(v as Record<string, unknown>).length) {
                json[k] = {};
                for (const kk in v as Record<string, unknown>) {
                    (json[k] as Record<string, unknown>)[kk] = ((v as Record<string, unknown>)[kk] as Validatable).json;
                }
            }
            else {
                const common: CommonModule = require('./common.js');
                const valid = common.validateArgs({ data: this._data[k] }, { data: scheme[k] });
                if (valid) {
                    json[k] = valid.data;
                }
            }
        }
        return json;
    }

    /**
     * Validate data
     *
     * @param data data to validate
     * @param scheme optional scheme override
     * @returns common.validateArgs object with replaced by class instance: {errors: [], result: true, obj: Validatable}
     */
    static validate(data: Record<string, unknown>, scheme?: Scheme): ValidationResult | null {
        const common: CommonModule = require('./common.js');
        return common.validateArgs(data, scheme || this.scheme, true);
    }

    /**
     * Validate data
     *
     * @returns array of string errors or undefined if validation passed
     */
    validate(): string[] | undefined {
        const common: CommonModule = require('./common.js');
        const ret = common.validateArgs(this._data, (this.constructor as typeof Validatable).scheme, true);
        if (ret && !ret.result) {
            return ret.errors;
        }
        return undefined;
    }
}

interface BatchInsert<T> {
    readonly length: number;
    readonly total: number;
    pushAsync(record: T): Promise<void>;
    pushSync(record: T): boolean;
    flush(ignore_codes?: number[]): Promise<Record<string, ObjectId> | void>;
}

/**
 * Base class for MongoDB-backed instances
 *
 * @see push/api/data/* for examples
 */
class Mongoable extends Validatable {
    /**
     * Must be overridden in subclasses to return collection name
     */
    static get collection(): string {
        throw new Error('Not implemented');
    }

    /**
     * Getter for id as a string
     */
    get id(): string | undefined {
        return this._data._id ? (this._data._id as ObjectId).toString() : undefined;
    }

    /**
     * Getter for id as is
     */
    get _id(): ObjectId | undefined {
        return this._data._id as ObjectId | undefined;
    }

    /**
     * Setter for _id
     *
     * @param id ObjectID value
     */
    set _id(id: ObjectId | null | undefined) {
        if (id !== null && id !== undefined) {
            this._data._id = id;
        }
        else {
            delete this._data._id;
        }
    }

    /**
     * Find a record in db and map it to instance of this class
     *
     * @param query query for findOne
     * @returns instance of this class if the record is found in database, null otherwise
     */
    static async findOne<T extends Mongoable>(this: new (data: Record<string, unknown>) => T, query: Filter<Document> | string): Promise<T | null> {
        const common: CommonModule = require('./common.js');
        let finalQuery: Filter<Document>;

        if (typeof query === 'string') {
            finalQuery = { _id: common.db.ObjectID(query) };
        }
        else if (query instanceof ObjectIdClass) {
            finalQuery = { _id: query };
        }
        else {
            finalQuery = query;
        }

        const data = await common.db.collection((this as unknown as typeof Mongoable).collection).findOne(finalQuery);
        if (data) {
            return new this(data as Record<string, unknown>);
        }
        else {
            return null;
        }
    }

    /**
     * Refresh current instance with data from the database
     *
     * @returns this instance of this class if the record is found in database, false otherwise
     */
    async refresh(): Promise<this | false> {
        const common: CommonModule = require('./common.js');
        const data = await common.db.collection((this.constructor as typeof Mongoable).collection).findOne({ _id: this._id });
        if (data) {
            this.setData(data as Record<string, unknown>);
            return this;
        }
        else {
            return false;
        }
    }

    /**
     * Find multiple records in db and map them to instances of this class
     *
     * @param query query for find
     * @returns array of instances of this class if the records are found in the database, empty array otherwise
     */
    static async findMany<T extends Mongoable>(this: new (data: Record<string, unknown>) => T, query: Filter<Document>): Promise<T[]> {
        const common: CommonModule = require('./common.js');
        const data = await common.db.collection((this as unknown as typeof Mongoable).collection).find(query).toArray();
        if (data && data.length > 0) {
            const Constr = this;
            return data.map(dt => new Constr(dt as Record<string, unknown>));
        }
        else {
            return [];
        }
    }

    /**
     * Count records in collection
     *
     * @param query query for count
     * @returns count of records in collection satisfying the query
     */
    static async count(query: Filter<Document>): Promise<number> {
        const common: CommonModule = require('./common.js');
        return await common.db.collection(this.collection).countDocuments(query);
    }

    /**
     * Delete record from collection
     *
     * @param query query for deleteOne
     * @returns delete result
     */
    static async deleteOne(query: Filter<Document>): Promise<{ deletedCount: number }> {
        const common: CommonModule = require('./common.js');
        return await common.db.collection(this.collection).deleteOne(query);
    }

    /**
     * Pass current data to mongo's save
     */
    async save(): Promise<void> {
        const common: CommonModule = require('./common.js');
        const json = this.json;
        await common.db.collection((this.constructor as typeof Mongoable).collection).updateOne(
            { _id: this._id },
            { $set: json },
            { upsert: true }
        );
    }

    /**
     * Run an update operation modifying this's _data
     *
     * @param update query for an update
     * @param op op to run to modify state of this in case of success
     */
    async update<T>(update: UpdateFilter<Document>, op: (instance: this) => T): Promise<T> {
        const common: CommonModule = require('./common.js');
        await common.db.collection((this.constructor as typeof Mongoable).collection).updateOne({ _id: this._id }, update);
        return op(this);
    }

    /**
     * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
     *
     * @param filter filter for an update
     * @param update modify for a findAndModify
     * @returns new instance in case of success, false otherwise
     */
    static async findOneAndUpdate<T extends Mongoable>(
        this: new (data: Record<string, unknown>) => T,
        filter: Filter<Document>,
        update: UpdateFilter<Document>
    ): Promise<T | false> {
        const common: CommonModule = require('./common.js');
        const options: FindOneAndUpdateOptions = { returnDocument: 'after' };
        const data = await common.db.collection((this as unknown as typeof Mongoable).collection).findOneAndUpdate(filter, update, options);
        if (data && data.value) {
            return new this(data.value as Record<string, unknown>);
        }
        return false;
    }

    /**
     * Run an atomic update operation against `filter` with modifications in `update`, updating instance data with latest version in case of success
     *
     * @param filter filter for an update
     * @param update modify for a findAndModify
     * @returns this instance in case of success, false otherwise
     */
    async updateAtomically(filter: Filter<Document>, update: UpdateFilter<Document>): Promise<this | false> {
        const common: CommonModule = require('./common.js');
        const options: FindOneAndUpdateOptions = { returnDocument: 'after' };
        const data = await common.db.collection((this.constructor as typeof Mongoable).collection).findOneAndUpdate(filter, update, options);
        if (data && data.value) {
            this.setData(data.value as Record<string, unknown>);
            return this;
        }
        return false;
    }

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
    static batchInsert<T extends Document = Document>(batch: number = 10000): BatchInsert<T> {
        const common: CommonModule = require('./common.js');
        let buffer: T[] = [];
        let total = 0;
        const collection = common.db.collection(this.collection);

        return {
            /**
             * Get current batch buffer length
             */
            get length(): number {
                return buffer.length;
            },

            /**
             * Get current batch buffer length
             */
            get total(): number {
                return total;
            },

            /**
             * Async push, that is if we're ok with a promise per insert
             *
             * @param record document to insert
             */
            async pushAsync(record: T): Promise<void> {
                total++;
                buffer.push(record);
                if (buffer.length >= batch) {
                    await this.flush();
                }
            },

            /**
             * Sync push, that is if we're NOT ok with a promise per insert
             *
             * @param record document to insert
             * @returns true if buffer needs to be flush()ed
             */
            pushSync(record: T): boolean {
                total++;
                buffer.push(record);
                return buffer.length >= batch;
            },

            /**
             * Flush the buffer by inserting documents into collection
             *
             * @param ignore_codes error codes to ignore
             */
            async flush(ignore_codes: number[] = []): Promise<Record<string, ObjectId> | void> {
                if (buffer.length > 0) {
                    try {
                        const res = await collection.insertMany(buffer as unknown as Document[]);
                        total -= (buffer.length - res.insertedCount);
                        buffer = [];
                        return res.insertedIds as unknown as Record<string, ObjectId>;
                    }
                    catch (e) {
                        const error = e as { code?: number; result?: { insertedCount?: number; result?: { insertedIds?: Record<string, ObjectId> } } };
                        if (error.result && error.result.result && error.result.result.insertedIds) {
                            total -= (buffer.length - (error.result.insertedCount || 0));
                        }
                        if (!error.code || !ignore_codes.includes(error.code)) {
                            throw e;
                        }
                        else {
                            buffer = [];
                            return error.result?.result?.insertedIds;
                        }
                    }
                }
            }
        };
    }
}

export { Jsonable, Validatable, Mongoable };
export type { ValidationResult, SchemeField, Scheme, BatchInsert };
