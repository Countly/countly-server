import { Database } from "./pluginManager";
import { Logger } from "./log";

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
    loadCityCoordiantes: (options: LoadCityCoordinatesOptions, callback: LoadCityCoordinatesCallback) => void;
}

declare const geoData: GeoData;
export default geoData;
