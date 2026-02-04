/**
 * This module defines default model to handle event data
 * @module "api/lib/countly.event"
 * @extends module:api/lib/countly.model~countlyMetric
 */

import type { CountlyMetric } from './countly.model.js';
import type { DataProperty } from '../../types/countly.common.js';

const countlyModel = require('./countly.model.js');
const countlyCommon = require('./countly.common.js');

/**
 * Options for getSubperiodData
 */
export interface SubperiodDataOptions {
    bucket?: 'monthly' | 'daily';
}

/**
 * Extended countly metric for events with additional methods
 */
export interface CountlyEventMetric extends CountlyMetric {
    /**
     * Get event data by periods
     * @param options - options object
     * @returns array with event data objects
     */
    getSubperiodData(options?: SubperiodDataOptions): Array<Record<string, unknown>>;

    /**
     * Get event data by segments
     * @param segment - segment for which to get data
     * @returns array with event data objects
     */
    getSegmentedData(segment: string): Array<Record<string, unknown>>;
}

/**
 * Model creator
 * @returns new model
 */
function create(): CountlyEventMetric {
    const countlyEvent = countlyModel.create(function(val: string): string {
        return val.replace(/:/g, '.').replace(/\[CLY\]/g, '').replace(/.\/\//g, '://');
    }) as CountlyEventMetric;

    countlyEvent.setMetrics(['c', 's', 'dur']);
    countlyEvent.setUniqueMetrics([]);

    /**
     * Get event data by periods
     * @param options - options object
     * @returns array with event data objects
     */
    countlyEvent.getSubperiodData = function(options?: SubperiodDataOptions): Array<Record<string, unknown>> {
        const dataProps: DataProperty[] = [
            { name: 'c' },
            { name: 's' },
            { name: 'dur' }
        ];
        options = options || {};
        return countlyCommon.extractData(countlyEvent.getDb(), countlyEvent.clearObject, dataProps, countlyCommon.calculatePeriodObject(null, options.bucket));
    };

    /**
     * Get event data by segments
     * @param segment - segment for which to get data
     * @returns array with event data objects
     */
    countlyEvent.getSegmentedData = function(segment: string): Array<Record<string, unknown>> {
        return countlyCommon.extractMetric(countlyEvent.getDb(), countlyEvent.getMeta(segment), countlyEvent.clearObject, [
            {
                name: segment,
                func: function(rangeArr: string): string {
                    return rangeArr;
                }
            },
            { 'name': 'c' },
            { 'name': 's' },
            { 'name': 'dur' }
        ]);
    };

    return countlyEvent;
}

export default create;
export { create };
