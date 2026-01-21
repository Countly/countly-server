import { Moment } from "moment-timezone";
import { Params } from "./requestProcessor";

/**
 * Period object containing all period-related information for data extraction
 */
export interface PeriodObject {
    /** Period start timestamp in milliseconds */
    start: number;
    /** Period end timestamp in milliseconds */
    end: number;
    /** Array with ticks for current period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...] */
    currentPeriodArr: string[];
    /** Array with ticks for previous period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...] */
    previousPeriodArr: string[];
    /** Date format to use when outputting date in graphs, example "D MMM, YYYY" */
    dateString: string;
    /** True if current period is special period, false if it is not */
    isSpecialPeriod: boolean;
    /** Amount of full days in selected period, example 30 */
    daysInPeriod: number;
    /** True if period contains today, false if not */
    periodContainsToday: boolean;
    /** Array with ticks for current period which contains data for unique values, like unique users */
    uniquePeriodArr: string[];
    /** Array with ticks for higher buckets to current period unique value estimation */
    uniquePeriodCheckArr: string[];
    /** Array with ticks for previous period which contains data for unique values */
    previousUniquePeriodArr: string[];
    /** Array with ticks for higher buckets to previous period unique value estimation */
    previousUniquePeriodCheckArr: string[];
    /** Period name formatted in dateString (available in non-special periods) */
    activePeriod: string | number;
    /** Previous period name formatted in dateString (available in non-special periods) */
    previousPeriod: string | number;
    /** Max value of current period tick (available in non-special periods) */
    periodMax: number | string;
    /** Min value of current period tick (available in non-special periods) */
    periodMin: number | string;
    /** Metric model month document ids to query for this period */
    reqMonthDbDateIds: string[];
    /** Metric model year document ids to query for this period */
    reqZeroDbDateIds: string[];
    /** Map structure for unique value calculation in current period */
    uniqueMap?: Record<string, any>;
    /** Map structure for unique value calculation in previous period */
    uniquePrevMap?: Record<string, any>;
}

/**
 * Percent change result object
 */
export interface PercentChange {
    /** Percentage change as string with % sign */
    percent: string;
    /** Trend direction: "u" for upward, "d" for downward */
    trend: "u" | "d";
}

/**
 * Dashboard data item for a single property
 */
export interface DashboardDataItem {
    /** Total value for current period */
    total: number;
    /** Total value for previous period */
    "prev-total": number;
    /** Percent change as string */
    change: string;
    /** Trend direction */
    trend: "u" | "d";
    /** Whether the value is estimated (for unique metrics) */
    is_estimate?: boolean;
}

/**
 * Dashboard data object containing metrics
 */
export interface DashboardData {
    [property: string]: DashboardDataItem;
}

/**
 * Data property definition for extraction functions
 */
export interface DataProperty {
    /** Property name */
    name: string;
    /** Optional function to transform the value */
    func?: (dataObj: any) => any;
    /** Period to use: "previous" or "current" */
    period?: "previous" | "current" | "previousThisMonth";
}

/**
 * Chart data point structure
 */
export interface ChartDataPoint {
    /** Data array of [index, value] pairs */
    data: Array<[number, number]>;
    /** Label for the data series */
    label?: string;
    /** Color for the data series */
    color?: string;
    /** Mode for rendering */
    mode?: string;
}

/**
 * Key events for chart data
 */
export interface KeyEvent {
    /** Minimum value */
    min: number;
    /** Maximum value */
    max: number;
}

/**
 * Extracted chart data result
 */
export interface ExtractedChartData {
    /** Chart data points */
    chartDP: ChartDataPoint[];
    /** Table data array */
    chartData: Array<Record<string, any>>;
    /** Key events for min/max values */
    keyEvents: KeyEvent[];
}

/**
 * Extracted two level data result
 */
export interface ExtractedTwoLevelData {
    /** Chart data array */
    chartData: Array<Record<string, any>>;
}

/**
 * Bar data item
 */
export interface BarDataItem {
    /** Name/label of the bar */
    name: string;
    /** Value of the bar */
    value: number;
    /** Percentage of total */
    percent: number;
}

/**
 * Period range query object for MongoDB
 */
export interface PeriodRangeQuery {
    $gt: number;
    $lt: number;
    $gte: number;
    $lte: number;
}

/**
 * Timestamp range query object for MongoDB
 */
export interface TimestampRangeQuery {
    $gte: number;
    $lt: number;
}

/**
 * Clear function type for data extraction
 */
export type ClearFunction = (obj: any) => any;

/**
 * Fetch function type for bar data extraction
 */
export type FetchFunction = (rangeArr: string, dataObj?: any) => string;

/**
 * Fix bar segment data function type
 */
export type FixBarSegmentDataFunction = (rangeData: ExtractedTwoLevelData) => ExtractedTwoLevelData;

/**
 * CountlyCommon module interface
 */
export interface CountlyCommon {
    /**
     * Currently selected period object
     */
    periodObj: PeriodObject;

    /**
     * Calculates unique values from a hierarchical map structure
     * @param dbObj - Database object containing hierarchical data
     * @param uniqueMap - Map with hierarchical structure used to calculate unique values
     * @returns Count of unique items
     */
    calculateUniqueFromMap(dbObj: Record<string, any>, uniqueMap: Record<string, any>): number;

    /**
     * Checks if the period parameter is valid
     * @param period - Period parameter
     * @returns True if period is valid
     */
    isValidPeriodParam(period: string | string[] | Record<string, any>): boolean;

    /**
     * Gets timezone from params
     * @param params - Params object
     * @returns Timezone string
     */
    getTimezone(params: Params): string;

    /**
     * Returns query range for querying in drill data with data shifted based on timezone OR offset
     * @param period - Common period in Countly
     * @param timezone - App timezone (optional)
     * @param offset - Offset in minutes
     * @returns Period range query object
     */
    getPeriodRange(period: string | string[], timezone?: string, offset?: number): PeriodRangeQuery;

    /**
     * Change timezone of internal Date object
     * @param appTimezone - Name of the timezone
     */
    setTimezone(appTimezone: string): void;

    /**
     * Change currently selected period
     * @param period - New period
     */
    setPeriod(period: string | number[]): void;

    /**
     * Calculates the percent change between previous and current values
     * @param previous - Data for previous period
     * @param current - Data for current period
     * @returns Percent change object
     */
    getPercentChange(previous: number, current: number): PercentChange;

    /**
     * Fetches nested property values from an object
     * @param obj - Standard countly metric object
     * @param desc - Dot separated path to fetch from object
     * @returns Fetched object from provided path
     */
    getDescendantProp(obj: Record<string, any>, desc: string): any;

    /**
     * Extract range data from standard countly metric data model
     * @param db - Countly standard metric data object
     * @param propertyName - Name of the property to extract
     * @param rangeArray - Array of all metrics/segments to extract
     * @param explainRange - Function to convert range/bucket index to meaningful label
     * @returns Array containing extracted ranged data
     */
    extractRangeData(
        db: Record<string, any>,
        propertyName: string,
        rangeArray: string[],
        explainRange?: (range: string) => string
    ): Array<Record<string, any>>;

    /**
     * Extract single level data without metrics/segments
     * @param db - Countly standard metric data object
     * @param clearFunction - Function to prefill all expected properties
     * @param chartData - Prefill chart data with labels, colors, etc
     * @param dataProperties - Describing which properties and how to extract
     * @returns Object to use in timeline graph
     */
    extractChartData(
        db: Record<string, any>,
        clearFunction: ClearFunction,
        chartData: ChartDataPoint[],
        dataProperties: DataProperty[]
    ): ExtractedChartData;

    /**
     * Extract single level data for stacked bar charts
     * @param db - Countly standard metric data object
     * @param clearFunction - Function to prefill all expected properties
     * @param chartData - Prefill chart data with labels, colors, etc
     * @param dataProperties - Describing which properties and how to extract
     * @param metric - Metric to select
     * @param disableHours - Disable hourly data for graphs
     * @returns Object to use in timeline graph
     */
    extractStackedBarData(
        db: Record<string, any>,
        clearFunction: ClearFunction,
        chartData: ChartDataPoint[],
        dataProperties: DataProperty[],
        metric?: string,
        disableHours?: boolean
    ): ExtractedChartData;

    /**
     * Get total data for period's each time bucket as comma separated string
     * @param data - Countly metric model data
     * @param props - Object where key is output property name and value is key or function
     * @param clearObject - Function to prefill all expected properties
     * @param periodObject - Period object override
     * @returns Object with sparkline data for each property
     */
    getSparklineData(
        data: Record<string, any>,
        props: Record<string, string | ((tmp_x: any) => number)>,
        clearObject: ClearFunction,
        periodObject?: PeriodObject
    ): Record<string, string>;

    /**
     * Extract two level data with metrics/segments
     * @param db - Countly standard metric data object
     * @param rangeArray - Array of all metrics/segments to extract
     * @param clearFunction - Function to prefill all expected properties
     * @param dataProperties - Describing which properties and how to extract
     * @param totalUserOverrideObj - Data from total users api request
     * @param period - Period to extract data from
     * @returns Object to use in bar and pie charts
     */
    extractTwoLevelData(
        db: Record<string, any>,
        rangeArray: string[],
        clearFunction: ClearFunction,
        dataProperties: DataProperty[],
        totalUserOverrideObj?: Record<string, number>,
        period?: PeriodObject
    ): ExtractedTwoLevelData;

    /**
     * Extracts top items that have the biggest total session counts
     * @param db - Countly standard metric data object
     * @param rangeArray - Array of all metrics/segments to extract
     * @param clearFunction - Function to prefill all expected properties
     * @param fetchFunction - Function to fetch property
     * @param maxItems - Amount of items to return, default 3
     * @param metric - Metric to output and use in sorting
     * @param totalUserOverrideObj - Data from total users api request
     * @param fixBarSegmentData - Function to make adjustments to the extracted data
     * @param period - Period to extract data from
     * @returns Array with top values
     */
    extractBarData(
        db: Record<string, any>,
        rangeArray: string[],
        clearFunction: ClearFunction,
        fetchFunction?: FetchFunction,
        maxItems?: number,
        metric?: string,
        totalUserOverrideObj?: Record<string, number>,
        fixBarSegmentData?: FixBarSegmentDataFunction,
        period?: PeriodObject
    ): BarDataItem[];

    /**
     * Shortens the given number by adding K or M postfix
     * @param number - Number to shorten
     * @returns Shorter representation of number
     */
    getShortNumber(number: number): string;

    /**
     * Getting the date range shown on the dashboard
     * @returns String with formatted date range
     */
    getDateRange(): string;

    /**
     * Extract single level data without metrics/segments
     * @param db - Countly standard metric data object
     * @param clearFunction - Function to prefill all expected properties
     * @param dataProperties - Describing which properties and how to extract
     * @param periodObject - Period object override
     * @returns Array of extracted data
     */
    extractData(
        db: Record<string, any>,
        clearFunction: ClearFunction,
        dataProperties: DataProperty[],
        periodObject?: PeriodObject
    ): Array<Record<string, any>>;

    /**
     * Extract metrics data break down by segments
     * @param db - Countly standard metric data object
     * @param rangeArray - Array of all metrics/segments to extract
     * @param clearFunction - Function to prefill all expected properties
     * @param dataProperties - Describing which properties and how to extract
     * @param totalUserOverrideObj - Data from total users api request
     * @returns Array of extracted metric data
     */
    extractMetric(
        db: Record<string, any>,
        rangeArray: string[],
        clearFunction: ClearFunction,
        dataProperties: DataProperty[],
        totalUserOverrideObj?: Record<string, number>
    ): Array<Record<string, any>>;

    /**
     * Format duration into highest unit of how much time have passed
     * @param timespent - Amount in seconds or milliseconds
     * @returns Formatted time string
     */
    timeString(timespent: number): string;

    /**
     * Get calculated totals for each property
     * @param data - Countly metric model data
     * @param properties - Array of all properties to extract
     * @param unique - Array of all properties that are unique
     * @param totalUserOverrideObj - Override object for unique metrics
     * @param prevTotalUserOverrideObj - Override object for previous period
     * @param periodObject - Period object override
     * @returns Dashboard data object
     */
    getDashboardData(
        data: Record<string, any>,
        properties: string[],
        unique: string[],
        totalUserOverrideObj?: Record<string, number>,
        prevTotalUserOverrideObj?: Record<string, number>,
        periodObject?: PeriodObject
    ): DashboardData;

    /**
     * Get timestamp query range based on request data
     * @param params - Params object
     * @param inSeconds - If true will output result in seconds
     * @returns MongoDB query object
     */
    getTimestampRangeQuery(params: Params, inSeconds?: boolean): TimestampRangeQuery;

    /**
     * Merge metric data in chartData by metric name
     * @param chartData - Chart data array
     * @param metric - Metric name to merge
     * @returns Merged chart data
     */
    mergeMetricsByName(chartData: Array<Record<string, any>>, metric: string): Array<Record<string, any>>;

    /**
     * Join 2 arrays into one removing all duplicated values
     * @param x - First array
     * @param y - Second array
     * @returns Array with unique values
     */
    union(x: any[], y: any[]): any[];

    /**
     * Encode value to be passed to db as key
     * @param str - Value to encode
     * @returns Encoded string
     */
    encode(str: string): string;

    /**
     * Decode value from db
     * @param str - Value to decode
     * @returns Decoded string
     */
    decode(str: string): string;

    /**
     * Get period object in atomic way from params
     * @param params - Params object with app timezone and period
     * @param defaultPeriod - Default period value
     * @returns Period object
     */
    getPeriodObj(params: Params, defaultPeriod?: string | string[]): PeriodObject;

    /**
     * Validate email address
     * @param email - Email address to validate
     * @returns True if valid
     */
    validateEmail(email: string): boolean;

    /**
     * Round to provided number of digits
     * @param num - Number to round
     * @param digits - Amount of digits to round to
     * @returns Rounded number
     */
    round(num: number, digits?: number): number;

    /**
     * Function to fix percentage difference
     * @param items - All items
     * @param totalPercent - Total percentage so far
     * @returns Fixed items array
     */
    fixPercentageDelta(items: BarDataItem[], totalPercent: number): BarDataItem[];

    /**
     * Calculate period function
     * @param period - Given period
     * @param bucket - Bucket for period - monthly or daily
     * @returns Period object
     */
    calculatePeriodObject(period?: string | string[] | Record<string, any>, bucket?: "monthly" | "daily"): PeriodObject;

    /**
     * Function that increments strings alphabetically
     * @param str - String that next character will be calculated
     * @returns Calculated string
     */
    stringIncrement(str: string): string;

    /**
     * Format timestamp to readable date/time string
     * @param timestamp - Timestamp in seconds or milliseconds
     * @param format - Format to use
     * @returns Formatted time and date
     */
    formatTime(timestamp: number, format?: string): string;
}

declare const countlyCommon: CountlyCommon;
export default countlyCommon;
