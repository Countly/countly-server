/**
 * This module defines default model to handle device_details data
 * @module "api/lib/countly.device_details"
 * @extends module:api/lib/countly.model~countlyMetric
 */

import type { CountlyMetric } from './countly.model.js';
import type { ExtractedTwoLevelData } from '../../types/countly.common.js';

const countlyModel = require('./countly.model.js');
const countlyCommon = require('./countly.common.js');
const countlyOsMapping = require('../../frontend/express/public/javascripts/countly/countly.device.osmapping.js');

/**
 * OS mapping entry structure
 */
interface OsMappingEntry {
    name: string;
    [key: string]: unknown;
}

/**
 * OS mapping dictionary
 */
interface OsMapping {
    [key: string]: OsMappingEntry;
}

/**
 * Chart data item with range and optional os property
 */
interface ChartDataItem {
    range: string;
    os?: string;
    [key: string]: unknown;
}

/**
 * Extended countly metric for device details with fixBarSegmentData method
 */
export interface CountlyDeviceDetailsMetric extends CountlyMetric {
    /**
     * Function to fix data based on segment for Bars
     * @param segment - name of the segment/metric to get data for
     * @param rangeData - countly standard metric data object
     * @returns metric data object
     */
    fixBarSegmentData(segment: string, rangeData: ExtractedTwoLevelData): ExtractedTwoLevelData;
}

/**
 * Model creator
 * @returns new model
 */
function create(): CountlyDeviceDetailsMetric {
    const countlyDeviceDetails = countlyModel.create(function(rangeArr: string): string {
        return rangeArr.replace(/:/g, ".");
    }) as CountlyDeviceDetailsMetric;

    /**
     * Function to fix data based on segment for Bars
     * @param segment - name of the segment/metric to get data for, by default will use default _name provided on initialization
     * @param rangeData - countly standard metric data object
     * @returns metric data object
     */
    countlyDeviceDetails.fixBarSegmentData = function(segment: string, rangeData: ExtractedTwoLevelData): ExtractedTwoLevelData {
        if (segment === "os") {
            let chartData = rangeData.chartData as ChartDataItem[];
            const osMapping = countlyOsMapping as OsMapping;

            for (let i = 0; i < chartData.length; i++) {
                if (osMapping[chartData[i].range.toLowerCase()]) {
                    chartData[i].os = osMapping[chartData[i].range.toLowerCase()].name;
                }
            }

            chartData = countlyCommon.mergeMetricsByName(chartData, "os") as ChartDataItem[];
            rangeData.chartData = chartData;
        }

        return rangeData;
    };

    return countlyDeviceDetails;
}

export default create;
export { create };
