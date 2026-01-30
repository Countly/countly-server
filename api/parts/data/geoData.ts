/**
 * Module for geographic data operations
 * @module api/parts/data/geoData
 */

import type { Database } from '../../../plugins/pluginManager';

import logModule from '../../utils/log.js';
import common from '../../utils/common.js';

const log = logModule('core:geo');

/** Options for loading city coordinates */
export interface LoadCityCoordinatesOptions {
    /** Database connection to use, defaults to common.db */
    db: Database;
    /** MongoDB query object to filter cities */
    query: Record<string, any>;
    /** MongoDB projection object for fields to return */
    projection: Record<string, number>;
    /** Country code to filter by */
    country: string;
}

/** City coordinate data returned from database */
export interface CityCoordinate {
    /** Country code */
    country?: string;
    /** Location coordinates [longitude, latitude] */
    loc?: [number, number];
    /** City name */
    name?: string;
    /** MongoDB ObjectId */
    _id?: any;
}

/** Callback for loadCityCoordinates */
export type LoadCityCoordinatesCallback = (err: Error | null, cities: CityCoordinate[]) => void;

/**
 * GeoData module for geographic data operations
 */
export interface GeoData {
    /**
     * Load city coordinates from the database
     * @param options - Options for loading city coordinates
     * @param callback - Callback function receiving error and cities array
     */
    loadCityCoordiantes: (options: Partial<LoadCityCoordinatesOptions>, callback: LoadCityCoordinatesCallback) => void;
}

const geoData: GeoData = {
    loadCityCoordiantes(options: Partial<LoadCityCoordinatesOptions>, callback: LoadCityCoordinatesCallback): void {
        const db = options.db || common.db;
        let query: Record<string, any> = options.query || {};
        const projection = options.projection || { 'country': 1, 'loc': 1, 'name': 1 };

        if (query) {
            try {
                query = JSON.parse(query as unknown as string);
            }
            catch (_e) {
                log.e("Can't parse city query");
                query = {};
            }
        }

        if (options.country) {
            query.country = options.country;
        }

        const pipeline = [{ '$match': query }, { '$project': projection }];

        db.collection('cityCoordinates').aggregate(pipeline).toArray((err: Error | null, cities: CityCoordinate[]) => {
            if (err) {
                log.e(err);
            }
            callback(err, cities || []);
        });
    }
};

export default geoData;
