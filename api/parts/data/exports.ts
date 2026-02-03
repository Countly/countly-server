/**
 * This module is meant for exporting data as csv or xls
 * @module api/parts/data/exports
 */

import { createRequire } from 'module';
import { Transform } from 'stream';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('./../../utils/common.js');
const moment = require('moment-timezone');
const plugin = require('./../../../plugins/pluginManager.ts');
const json2csv = require('json2csv');
const logModule = require('./../../utils/log.js');
const XLSXTransformStream = require('xlsx-write-stream');

const log = logModule('core:export') as { e: (...args: unknown[]) => void };

/**
 * Params interface
 */
interface Params {
    res: {
        writeHead?: (status: number, headers: Record<string, string>) => void;
        write: (data: string | Buffer) => void;
        end: () => void;
    };
    qstring: {
        method?: string;
        formatFields?: Mapper;
        filename?: string;
        get_index?: string | null;
    };
    app_id?: string;
}

/**
 * Mapper interface for data transformation
 */
interface Mapper {
    tz?: string;
    fields?: Record<string, {
        formula?: { $eq?: string };
        to?: string;
        format?: string;
        type?: string;
    }>;
    calculated_fields?: string[];
}

/**
 * Export options interface
 */
interface ExportOptions {
    db?: unknown;
    params?: Params;
    collection?: string;
    query?: Record<string, unknown>;
    projection?: Record<string, number>;
    sort?: Record<string, number>;
    limit?: number | string;
    skip?: number | string;
    type?: string;
    filename?: string;
    output?: (data: unknown) => void;
    mapper?: Mapper;
    writeHeaders?: boolean;
    streamOptions?: {
        transform?: (doc: unknown) => unknown;
    };
    transformFunction?: (doc: unknown) => unknown;
    path?: string;
    data?: Record<string, unknown>;
    prop?: string;
    method?: string;
    columnNames?: Record<string, string>;
    db_name?: string;
}

/**
 * Flattened array result interface
 */
interface FlattenedArrayResult {
    data: Record<string, unknown>[];
    fields: string[];
}

const contents: Record<string, string> = {
    'json': 'application/json',
    'csv': 'text/csv',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.ms-excel'
};
const delimiter = '_';

/**
 * Flattens array of objects
 * @param arr - array with objects to flatten
 * @returns object with property data for array with flattened objects and fields property for fields array
 */
function flattenArray(arr: unknown[]): FlattenedArrayResult {
    if (Array.isArray(arr)) {
        const fields: Record<string, boolean> = {};
        const l = arr.length;
        for (let i = 0; i < l; i++) {
            arr[i] = flattenObject(arr[i] as Record<string, unknown>, fields);
        }
        return {
            data: arr as Record<string, unknown>[],
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
 * @param ob - object to flatten
 * @param fields - object with fields to store unique ones
 * @returns flattened object
 */
function flattenObject(ob: Record<string, unknown>, fields?: Record<string, boolean>): Record<string, unknown> {
    const toReturn: Record<string, unknown> = {};
    for (const i in ob) {
        if (ob[i] && (ob[i] as { _bsontype?: string })._bsontype) {
            // this is ObjectID
            ob[i] = ob[i] + '';
        }
        const type = Object.prototype.toString.call(ob[i]);
        if (ob[i] && type === '[object Object]') {
            const flatObject = flattenObject(ob[i] as Record<string, unknown>);
            for (const x in flatObject) {
                if (fields) {
                    fields[i + delimiter + x] = true;
                }
                toReturn[i + delimiter + x] = preventCSVInjection(flatObject[x]);
            }
        }
        else if (type === '[object Array]') {
            let is_complex = false;
            const arr = ob[i] as unknown[];
            for (let p = 0; p < arr.length; p++) {
                const type1 = Object.prototype.toString.call(arr[p]);
                if (arr[p] && (type1 === '[object Object]' || type1 === '[object Array]')) {
                    is_complex = true;
                }
            }
            if (!is_complex) {
                if (fields) {
                    fields[i] = true;
                }
                toReturn[i] = arr.map(preventCSVInjection).join(', ');
            }
            else {
                for (let p = 0; p < arr.length; p++) {
                    if (fields) {
                        fields[i + delimiter + p] = true;
                    }
                    toReturn[i + delimiter + p] = preventCSVInjection(JSON.stringify(arr[p]));
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
 * Escape values that can cause CSV injection
 * @param val - value to escape
 * @returns escaped value
 */
function preventCSVInjection(val: unknown): unknown {
    if (typeof val === 'string') {
        const ch = val[0];
        if (['@', '=', '+', '-'].indexOf(ch) !== -1) {
            val = '`' + val;
        }
    }
    return val;
}

/**
 * Function to make all values CSV friendly
 * @param value - value to convert
 * @returns converted string
 */
function processCSVvalue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const valueType = typeof value;
    if (valueType !== 'boolean' && valueType !== 'number' && valueType !== 'string') {
        value = JSON.stringify(value);

        if (value === undefined) {
            return undefined;
        }
        if ((value as string)[0] === '"') {
            value = (value as string).replace(/^"(.+)"$/, '$1');
        }
    }

    if (typeof value === 'string') {
        if (value.includes('"')) {
            value = value.replace(new RegExp('"', 'g'), '"' + '"');
        }

        value = '"' + value + '"';
    }

    return value as string;
}

/**
 * Convert json object to needed data type
 * @param data - data to convert
 * @param type - type to which to convert
 * @returns converted data
 */
function convertData(data: unknown[], type: string): unknown {
    let obj: FlattenedArrayResult;
    switch (type) {
    case 'json':
        return JSON.stringify(data);
    case 'csv':
        obj = flattenArray(data);
        return json2csv.parse(obj.data, { fields: obj.fields, excelStrings: false });
    case 'xls':
    case 'xlsx':
        obj = flattenArray(data);
        const stream = new XLSXTransformStream();
        stream.write(obj.fields);
        for (let k = 0; k < obj.data.length; k++) {
            const arr1: unknown[] = [];
            for (let z = 0; z < obj.fields.length; z++) {
                arr1.push(obj.data[k][obj.fields[z]] || '');
            }
            stream.write(arr1);
        }
        stream.end();
        return stream;
    default:
        return data;
    }
}

/**
 * Get content type for given key
 * @param key - type key
 * @returns content type
 */
function getType(key: string): string {
    if (contents[key]) {
        return contents[key];
    }
    else {
        return key;
    }
}

/**
 * Output data as response
 * @param params - params object
 * @param data - data to output
 * @param filename - name of the file to output to browser
 * @param type - type to be used in content type
 */
function output(params: Params, data: unknown, filename: string, type: string): void {
    const headers: Record<string, string> = {};
    if (type && contents[type]) {
        headers['Content-Type'] = contents[type];
    }
    headers['Content-Disposition'] = 'attachment;filename=' + encodeURIComponent(filename) + '.' + type;

    if (type === 'xlsx' || type === 'xls') {
        params.res.writeHead?.(200, headers);
        (data as { pipe: (res: unknown) => void }).pipe(params.res);
    }
    else {
        common.returnRaw(params, 200, data, headers);
    }
}

/**
 * Transform value
 * @param value - any value
 * @param key - key
 * @param mapper - object with information how to transform data
 * @param doc - original document
 * @returns transformed value
 */
function transformValue(value: unknown, key: string, mapper?: Mapper, doc?: Record<string, unknown>): unknown {
    if (mapper && mapper.fields && mapper.fields[key]) {
        if (mapper.fields[key].formula) {
            if (mapper.fields[key].formula!.$eq) {
                value = doc?.[mapper.fields[key].formula!.$eq!];
            }
        }
        if (mapper.fields[key].to && mapper.fields[key].to === 'time') {
            if (value) {
                let numValue = value as number;
                if (Math.round(numValue).toString().length === 10) {
                    numValue *= 1000;
                }
                const momentValue = moment(new Date(numValue)).tz(mapper.tz);
                if (momentValue) {
                    let format = 'ddd, D MMM YYYY HH:mm:ss';
                    if (mapper.fields[key].format) {
                        format = mapper.fields[key].format!;
                    }
                    value = momentValue.format(format);
                }
                else {
                    value = numValue / 1000;
                }
            }
        }
        if (mapper.fields[key].type) {
            switch (mapper.fields[key].type) {
            case 'number':
                value = common.formatNumber(value);
                break;
            case 'second':
                value = common.formatSecond(value);
                break;
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
 * @param doc - any value
 * @param mapper - object with information how to transform data
 * @returns object with transformed data
 */
function transformValuesInObject(doc: Record<string, unknown>, mapper?: Mapper): Record<string, unknown> {
    const docOrig = JSON.parse(JSON.stringify(doc));
    for (const z in doc) {
        doc[z] = transformValue(doc[z], z, mapper, docOrig);
    }
    if (mapper && mapper.calculated_fields) {
        for (let n = 0; n < mapper.calculated_fields.length; n++) {
            doc[mapper.calculated_fields[n]] = transformValue(0, mapper.calculated_fields[n], mapper, docOrig);
        }
    }
    return doc;
}

/**
 * Function to collect values in order based on current order
 * @param values - array to collect values
 * @param valuesMap - object to see which values are collected
 * @param paramList - array of keys(in order)
 * @param doc - data from db
 * @param options - options object
 */
function getValues(
    values: unknown[],
    valuesMap: Record<string, boolean>,
    paramList: string[],
    doc: Record<string, unknown>,
    options?: { collectProp?: boolean; mapper?: Mapper }
): void {
    if (options && options.collectProp) {
        doc = flattenObject(doc) as Record<string, unknown>;
        const docOrig = JSON.parse(JSON.stringify(doc));
        const keys = Object.keys(doc);
        for (let z = 0; z < keys.length; z++) {
            valuesMap[keys[z]] = false;
        }
        for (let p = 0; p < paramList.length; p++) {
            if (doc[paramList[p]]) {
                values.push(transformValue(doc[paramList[p]], paramList[p], options.mapper, docOrig));
            }
            else {
                values.push('');
            }
            valuesMap[paramList[p]] = true;
        }
        for (const k in valuesMap) {
            if (valuesMap[k] === false) {
                values.push(transformValue(doc[k], k, options.mapper, docOrig));
                paramList.push(k);
            }
        }
    }
    else {
        const docOrig = JSON.parse(JSON.stringify(doc));
        for (let kz = 0; kz < paramList.length; kz++) {
            let value = common.getDescendantProp(doc, paramList[kz]) || '';
            if (typeof value === 'object' || Array.isArray(value)) {
                values.push(JSON.stringify(transformValue(value, paramList[kz], options?.mapper, docOrig)));
            }
            else {
                values.push(transformValue(value, paramList[kz], options?.mapper));
            }
        }
    }
}

/**
 * Stream data as response
 * @param params - params object
 * @param stream - cursor object
 * @param options - options object
 */
function streamExport(
    params: Params,
    stream: { on: (event: string, callback: (data?: unknown) => void) => void; once: (event: string, callback: () => void) => void },
    options: ExportOptions
): void {
    const headers: Record<string, string> = {};
    const emptyFun = function(val: unknown): unknown {
        return val;
    };
    const transformFunction = options.transformFunction || emptyFun;
    const filename = options.filename || '';
    const type = options.type || 'json';
    let projection = options.projection;
    const mapper = options.mapper;
    let listAtEnd = true;
    if (type && contents[type]) {
        headers['Content-Type'] = contents[type];
    }
    headers['Content-Disposition'] = 'attachment;filename=' + encodeURIComponent(filename) + '.' + type;
    const paramList: string[] = [];
    if (projection) {
        for (const k in projection) {
            paramList.push(k);
            listAtEnd = false;
        }
    }
    if (options.writeHeaders && params.res.writeHead) {
        params.res.writeHead(200, headers);
    }
    if (type === 'csv') {
        if (options.streamOptions) {
            options.streamOptions.transform = transformFunction;
        }
        const head: (string | undefined)[] = [];
        if (listAtEnd === false) {
            for (let p = 0; p < paramList.length; p++) {
                head.push(processCSVvalue(paramList[p]));
            }
            params.res.write(head.join(',') + '\r\n');
        }

        stream.on('data', function(doc: unknown) {
            doc = transformFunction(doc);
            const values: unknown[] = [];
            const valuesMap: Record<string, boolean> = {};
            getValues(values, valuesMap, paramList, doc as Record<string, unknown>, { mapper: mapper, collectProp: listAtEnd });

            const processedValues: (string | undefined)[] = [];
            for (let p = 0; p < values.length; p++) {
                processedValues.push(processCSVvalue(values[p]));
            }
            params.res.write(processedValues.join(',') + '\r\n');
        });

        stream.once('end', function() {
            setTimeout(function() {
                if (listAtEnd) {
                    for (let p = 0; p < paramList.length; p++) {
                        head.push(processCSVvalue(paramList[p]));
                    }
                    params.res.write(head.join(',') + '\r\n');
                }
                params.res.end();
            }, 100);
        });
    }
    else if (type === 'xlsx' || type === 'xls') {
        const xc = new XLSXTransformStream();
        xc.pipe(params.res);
        if (listAtEnd === false) {
            xc.write(paramList);
        }
        stream.on('data', function(doc: unknown) {
            doc = transformFunction(doc);
            const values: unknown[] = [];
            const valuesMap: Record<string, boolean> = {};
            getValues(values, valuesMap, paramList, doc as Record<string, unknown>, { mapper: mapper, collectProp: listAtEnd });
            xc.write(values);
        });

        stream.once('end', function() {
            setTimeout(function() {
                if (listAtEnd) {
                    xc.write(paramList);
                }
                xc.end();
            }, 100);
        });
    }
    else {
        params.res.write('[');
        let first = false;
        stream.on('data', function(doc: unknown) {
            doc = transformFunction(doc);
            if (!first) {
                first = true;
                params.res.write(doc as string);
            }
            else {
                params.res.write(',' + doc);
            }
        });

        stream.once('end', function() {
            setTimeout(function() {
                params.res.write(']');
                params.res.end();
            }, 100);
        });
    }
}

/**
 * Check if id is valid ObjectID
 * @param id - id to check
 * @returns true if valid
 */
function isObjectId(id: unknown): boolean {
    const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
    if (typeof id === 'undefined' || id === null) {
        return false;
    }
    if ((typeof id !== 'undefined' && id !== null) && 'number' !== typeof id && ((id as string).length !== 24)) {
        return false;
    }
    else {
        if (typeof id === 'string' && id.length === 24) {
            return checkForHexRegExp.test(id);
        }
        return true;
    }
}

/**
 * Export data from database
 * @param options - options for the export
 */
function fromDatabase(options: ExportOptions): void {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.projection = options.projection || {};
    options.writeHeaders = true;

    if (options.params && options.params.qstring && options.params.qstring.formatFields) {
        options.mapper = options.params.qstring.formatFields;
    }

    if (options.limit && options.limit !== '') {
        options.limit = parseInt(options.limit as string, 10);
        if (options.limit > plugin.getConfig('api').export_limit) {
            options.limit = plugin.getConfig('api').export_limit;
        }
    }
    if (Object.keys(options.projection).length > 0) {
        if (!options.projection._id) {
            options.projection._id = 1;
        }
    }
    let alternateName = ((options.collection || '').charAt(0).toUpperCase() + (options.collection || '').slice(1).toLowerCase());
    if (options.skip) {
        alternateName += '_from_' + options.skip;
        if (options.limit) {
            alternateName += '_to_' + (parseInt(options.skip as string) + parseInt(options.limit as unknown as string));
        }
    }
    alternateName += '_exported_on_' + moment().format('DD-MMM-YYYY');
    options.filename = options.filename || options.params?.qstring.filename || alternateName;

    if (options.collection?.startsWith('app_users')) {
        if (options.params) {
            options.params.qstring.method = 'user_details';
            options.params.app_id = options.collection.replace('app_users', '');
        }
    }

    if (options.params && options.params.qstring && options.params.qstring.get_index && options.params.qstring.get_index !== null) {
        (options.db as { collection: (name: string) => { indexes: (callback: (err: Error | null, indexes: unknown[]) => void) => void } }).collection(options.collection!).indexes(function(err: Error | null, indexes: unknown[]) {
            if (!err) {
                fromData(indexes, options);
            }
        });
    }
    else {
        plugin.dispatch('/drill/preprocess_query', {
            query: options.query,
            params: options.params
        }, () => {
            if (options.query!._id && isObjectId(options.query!._id)) {
                options.query!._id = common.db.ObjectID(options.query!._id);
            }
            const cursor = (options.db as { collection: (name: string) => { find: (query: Record<string, unknown>, options: { projection: Record<string, number> }) => unknown } }).collection(options.collection!).find(options.query!, { 'projection': options.projection! }) as {
                sort: (sort: Record<string, number>) => unknown;
                skip: (skip: number) => unknown;
                limit: (limit: number) => unknown;
                toArray: (callback: (err: Error | null, data: unknown[]) => void) => void;
                on: (event: string, callback: (data?: unknown) => void) => void;
                once: (event: string, callback: () => void) => void;
            };
            if (options.sort) {
                cursor.sort(options.sort);
            }

            if (options.skip) {
                cursor.skip(parseInt(options.skip as string));
            }
            if (options.limit) {
                cursor.limit(parseInt(options.limit as string));
            }
            options.streamOptions = {};
            if (options.type === 'stream' || options.type === 'json') {
                options.streamOptions.transform = function(doc: unknown) {
                    doc = transformValuesInObject(doc as Record<string, unknown>, options.mapper);
                    return JSON.stringify(doc);
                };
            }
            if (options.type === 'stream' || options.type === 'json' || options.type === 'xls' || options.type === 'xlsx' || options.type === 'csv') {
                options.output = options.output || function(stream: unknown) {
                    streamExport(options.params!, stream as { on: (event: string, callback: (data?: unknown) => void) => void; once: (event: string, callback: () => void) => void }, options);
                };
                options.output(cursor);
            }
            else {
                cursor.toArray(function(err: Error | null, data: unknown[]) {
                    fromData(data, options);
                });
            }
        });
    }
}

/**
 * Get cursor for export
 * @param options - options for the export
 * @param body - response from api with info for query
 * @param callback - callback function with (err,cursor)
 */
async function getCursorForExport(
    options: ExportOptions,
    body: { collection?: string; pipeline?: unknown[]; transformFunction?: (doc: unknown) => unknown },
    callback: (err: Error | null, cursor: unknown) => void
): Promise<void> {
    if (options.db_name === 'countly_drill') {
        try {
            const cursor = await common.drillQueryRunner.getDrillCursorForExport(body, {});
            callback(null, cursor);
        }
        catch (err) {
            callback(err as Error, null);
        }
    }
    else {
        callback(null, (options.db as { collection: (name: string) => { aggregate: (pipeline: unknown[]) => unknown } }).collection(body.collection!).aggregate(body.pipeline!));
    }
}

/**
 * Export data from response of request
 * @param options - options for the export
 */
function fromRequest(options: ExportOptions): void {
    options.path = options.path || '/';
    if (!options.path.startsWith('/')) {
        options.path = '/' + options.path;
    }
    options.filename = options.filename || options.path.replace(/\//g, '_') + '_on_' + moment().format('DD-MMM-YYYY');

    const params = {
        'req': {
            url: options.path,
            body: options.data || {},
            method: 'export'
        },
        'APICallback': function(err: Error | null, body: Record<string, unknown>) {
            if (err) {
                log.e(err);
                log.e(JSON.stringify(body));
            }
            let data: unknown[] = [];
            try {
                if (options.prop) {
                    const path = options.prop.split('.');
                    for (let i = 0; i < path.length; i++) {
                        body = body[path[i]] as Record<string, unknown>;
                    }
                }
                if (options.projection) {
                    for (const key in body) {
                        for (const prop in body[key] as Record<string, unknown>) {
                            if (!options.projection[prop]) {
                                delete (body[key] as Record<string, unknown>)[prop];
                            }
                        }
                    }
                }
                if (options.columnNames || options.mapper) {
                    for (const key in body) {
                        if (options.mapper) {
                            body[key] = transformValuesInObject(body[key] as Record<string, unknown>, options.mapper);
                        }
                        for (const prop in body[key] as Record<string, unknown>) {
                            if (options.columnNames) {
                                if (options.columnNames[prop]) {
                                    (body[key] as Record<string, unknown>)[options.columnNames[prop]] = (body[key] as Record<string, unknown>)[prop];
                                    delete (body[key] as Record<string, unknown>)[prop];
                                }
                            }
                        }
                    }
                }
                data = body as unknown as unknown[];
            }
            catch (ex) {
                data = [];
            }
            fromData(data, options);
        }
    };

    common.processRequest(params);
}

/**
 * Export data from request query
 * @param options - options for the export
 */
function fromRequestQuery(options: ExportOptions): void {
    options.db = options.db || common.db;
    options.path = options.path || '/';
    if (!options.path.startsWith('/')) {
        options.path = '/' + options.path;
    }
    options.filename = options.filename || options.path.replace(/\//g, '_') + '_on_' + moment().format('DD-MMM-YYYY');

    const params = {
        'req': {
            url: options.path,
            body: options.data || {},
            method: 'export'
        },
        'APICallback': function(err0: Error | null, body: { collection?: string; pipeline?: unknown[]; projection?: Record<string, number>; transformFunction?: (doc: unknown) => unknown }) {
            if (err0) {
                log.e(err0);
            }
            if (body) {
                if (body.transformFunction) {
                    options.transformFunction = body.transformFunction;
                }
                getCursorForExport(options, body, function(err, cursor) {
                    if (err) {
                        log.e(err);
                        options.output?.({ 'error': 'Could not get data for export' });
                        return;
                    }
                    options.projection = body.projection;
                    const outputStream = new Transform({
                        objectMode: true,
                        transform: (data, _, done) => {
                            done(null, data);
                        }
                    });
                    options.streamOptions = {};
                    if (options.type === 'stream' || options.type === 'json') {
                        options.streamOptions.transform = function(doc: unknown) {
                            doc = transformValuesInObject(doc as Record<string, unknown>, options.mapper);
                            if (body.transformFunction) {
                                return JSON.stringify(body.transformFunction(doc));
                            }
                            else {
                                return JSON.stringify(doc);
                            }
                        };
                    }
                    streamExport({ res: outputStream } as unknown as Params, cursor as { on: (event: string, callback: (data?: unknown) => void) => void; once: (event: string, callback: () => void) => void }, options);
                    options.output?.(outputStream);
                });
            }
        }
    };

    common.processRequest(params);
}

/**
 * Create export from provided data
 * @param data - data to format
 * @param options - options for the export
 */
function fromData(data: unknown, options: ExportOptions): void {
    options.type = options.type || 'json';
    options.filename = options.filename || 'Data_export_on_' + moment().format('DD-MMM-YYYY');
    options.output = options.output || function(odata: unknown) {
        output(options.params!, odata, options.filename!, options.type!);
    };
    if (!data) {
        data = [];
    }
    if (typeof data === 'object' && !Array.isArray(data)) {
        data = Object.values(data as Record<string, unknown>);
    }
    if (typeof data === 'string') {
        options.output(data);
    }
    else {
        options.output(convertData(data as unknown[], options.type));
    }
}

const exportsModule = {
    convertData,
    getType,
    output,
    stream: streamExport,
    fromDatabase,
    fromRequest,
    fromRequestQuery,
    fromData
};

export default exportsModule;
export {
    exportsModule,
    convertData,
    getType,
    output,
    streamExport,
    fromDatabase,
    fromRequest,
    fromRequestQuery,
    fromData
};
export type { ExportOptions, Params, Mapper };
