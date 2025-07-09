/**
 * Module that processes main session and user information
 */

import { Params } from "./requestProcessor";

/** Location object structure */
export interface Location {
    lat?: number;
    lon?: number;
    country?: string;
    city?: string;
    tz?: number;
    gps?: boolean;
}

/** User properties for predefined metrics */
export interface UserProperties {
    [key: string]: string | number | boolean | object;
}

/** Predefined metrics structure */
export interface PredefinedMetrics {
    [key: string]: string | number | boolean | object;
}

/** Session duration range */
export interface SessionDurationRange {
    range: string;
    min: number;
    max: number;
}

/** Usage module interface */
export interface UsageModule {
    /**
     * Set location for user based on coordinates or country/city
     * @param params - Params object with request context
     * @returns Promise that resolves when location is set
     */
    setLocation(params: Params): Promise<void>;

    /**
     * Set user location in params
     * @param params - Params object with request context
     * @param loc - Location object with coordinates or country/city data
     */
    setUserLocation(params: Params, loc: Location): void;

    /**
     * Process session duration and update user data
     * @param params - Params object with request context
     * @param callback - Callback function when processing is complete
     */
    processSessionDuration(params: Params, callback: (err?: Error) => void): void;

    /**
     * Get predefined metrics for user
     * @param params - Params object with request context
     * @param userProps - User properties object
     * @returns Predefined metrics object
     */
    getPredefinedMetrics(params: Params, userProps: UserProperties): PredefinedMetrics;

    /**
     * Return all processed metrics for user
     * @param params - Params object with request context
     * @returns All processed metrics
     */
    returnAllProcessedMetrics(params: Params): PredefinedMetrics;

    /**
     * Process session duration range for user
     * @param totalSessionDuration - Total session duration in seconds
     * @param params - Params object with request context
     * @param done - Callback function when processing is complete
     */
    processSessionDurationRange(
        totalSessionDuration: number, 
        params: Params, 
        done: (err?: Error) => void
    ): void;
}

declare const usage: UsageModule;
export default usage;