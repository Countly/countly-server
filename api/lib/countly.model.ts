/**
 * This module loads existing model or create one from default module if it does not exist
 * @module "api/lib/countly.model"
 */

import type {
    PeriodObject,
    ClearFunction,
    DataProperty,
    DashboardData,
    BarDataItem,
    ExtractedTwoLevelData,
    FixBarSegmentDataFunction
} from '../../types/countly.common.js';

import type { Database } from '../../plugins/pluginManager.js';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const countlyCommon = require('./countly.common.js');
const _ = require('underscore');

/**
 * Function type for fetching and transforming values from data model
 */
export type FetchValueFunction = (val: string, data?: Record<string, unknown>, separate?: boolean) => string;

/**
 * Total users object structure for unique user correction
 */
export interface TotalUsersObj {
    users?: number;
    [key: string]: number | undefined;
}

/**
 * Chart data point for pie/bar charts
 */
export interface ChartDPItem {
    data: Array<[number, number | null]>;
    label: string;
}

/**
 * Chart data with joined metrics for bar charts
 */
export interface JoinedChartDP {
    dp: ChartDPItem[];
    ticks: Array<[number, string]>;
}

/**
 * Get data result structure
 */
export interface GetDataResult {
    chartData: Array<Record<string, unknown>>;
    chartDP?: JoinedChartDP;
    [key: string]: unknown;
}

/**
 * Table data result structure
 */
export interface TableDataResult {
    cols: string[];
    rows: Array<Array<string | number>>;
}

/**
 * Number metric result with sparkline
 */
export interface NumberMetricResult {
    total: number;
    'prev-total': number;
    change: string;
    trend: 'u' | 'd';
    is_estimate?: boolean;
    sparkline?: number[];
}

/**
 * Timeline data result structure
 */
export interface TimelineDataResult {
    [dateKey: string]: Record<string, number>;
}

/**
 * Stacked bar series item
 */
export interface StackedBarSeriesItem {
    data: number[];
    label: string;
    name?: string;
    stack?: string;
}

/**
 * Stacked bar legend item
 */
export interface StackedBarLegendItem {
    name: string;
    value: number;
    trend: string;
    tooltip: string;
    percentage: number;
}

/**
 * Stacked bar data result
 */
export interface StackedBarDataResult {
    xAxis: {
        type: string;
        data: string[];
    };
    yAxis: {
        axisLabel?: {
            formatter: string;
        };
    };
    series: StackedBarSeriesItem[];
}

/**
 * Range data chart result
 */
export interface RangeDataResult {
    chartData: Array<Record<string, unknown>>;
    chartDP: {
        dp: Array<{ data: Array<[number, number | null]> }>;
        ticks: Array<[number, string]>;
    };
}

/**
 * Common metric object interface, all metric models inherit from it
 */
export interface CountlyMetric {
    /** Fetching method to modify segment values */
    fetchValue: FetchValueFunction;
    /** Get the current period Object for the model */
    getPeriod(): PeriodObject | null;
    /** Set period object for the model to use */
    setPeriod(period: PeriodObject | null): void;
    /** Reset/delete all retrieved metric data */
    reset(): void;
    /** Get current data */
    getDb(): Database;
    /** Set current data for model */
    setDb(db: Database): void;
    /** Extend current data for model */
    extendDb(data: Record<string, unknown>): void;
    /** Set total user object for unique user correction */
    setTotalUsersObj(totalUsersObj?: TotalUsersObj, prevTotalUserObj?: TotalUsersObj): void;
    /** Get total user object for unique user correction */
    getTotalUsersObj(prev?: boolean): TotalUsersObj;
    /** Sets array of metric names that are unique */
    setUniqueMetrics(uniques: string[]): void;
    /** Get array of unique metric names */
    getUniqueMetrics(): string[];
    /** Sets array of metric names used by this model */
    setMetrics(metrics: string[]): void;
    /** Get array of metric names */
    getMetrics(): string[];
    /** Get array of unique segment values */
    getMeta(metric: string): string[];
    /** Get data after initialize finished */
    getData(segment?: string, clean?: boolean, join?: boolean): GetDataResult;
    /** Prefill all expected metrics with 0 */
    clearObject: ClearFunction;
    /** Get bar data for metric */
    getBars(segment?: string, maxItems?: number, metric?: string): BarDataItem[];
    /** Get data for dynamic tables */
    getTableData(segment?: string, maxItems?: number): TableDataResult;
    /** Get value of single metric with changes and sparkline */
    getNumber(metric?: string, isSparklineNotRequired?: boolean): NumberMetricResult;
    /** Get timeline data for higher metrics without segments */
    getTimelineData(): TimelineDataResult;
    /** Get timeline data for higher metrics with segments */
    getStackedBarData(segment: string, maxItems?: number, metric?: string, displayType?: string): StackedBarDataResult;
    /** Get range data for buckets */
    getRangeData(metric: string, meta: string, explain: (range: string) => string): RangeDataResult;
    /** Optional function to fix bar segment data */
    fixBarSegmentData?: (segment: string, rangeData: ExtractedTwoLevelData) => ExtractedTwoLevelData;
}

/**
 * Segment configuration for model loading
 */
export interface SegmentConfig {
    name: string;
    [key: string]: unknown;
}

/**
 * CountlyModel module interface
 */
export interface CountlyModelModule {
    /** Load countly model for provided data */
    load(segment: string | SegmentConfig): CountlyMetric;
    /** Create Countly data model */
    create(fetchValue?: FetchValueFunction): CountlyMetric;
}

const countlyModel: CountlyModelModule = {
    /**
     * Loads countly model for provided data if it already exists in api/lib folder or in plugins,
     * or creates new one from default model if it does not exist
     * @param segment - data segment name to process
     * @returns countly metric model for provided name
     * @example
     * var countlyModel = require("api/lib/countly.model.js");
     * var countlyDensity = countlyModel.load("densities");
     */
    load: function(segment: string | SegmentConfig): CountlyMetric {
        const _name = (typeof segment === 'object' && segment.name) ? segment.name : segment as string;
        let model: CountlyMetric;
        try {
            // try loading model from core
            model = require('./countly.' + _name + '.js')();
        }
        catch {
            try {
                // try loading model from plugin
                model = require('../../plugins/' + _name + '/api/lib/countly.model.js')();
            }
            catch {
                // just create standard model
                model = this.create();
            }
        }
        return model;
    },

    /**
     * Create Countly data model to process data segment from fetched from server
     * @param fetchValue - default function to fetch and transform if needed value from standard data model
     * @returns new countly metric model
     * @example
     * var countlyModel = require("api/lib/countly.model.js");
     * var countlyDensity = countlyModel.create(function(val, data, separate){
     *      if(separate){
     *          //request separated/unprocessed data
     *          return val;
     *      }
     *      else{
     *          //we can preprocess data and group, for example, by first letter
     *          return val[0];
     *      }
     * });
     */
    create: function(fetchValue?: FetchValueFunction): CountlyMetric {
        // Private Properties
        let _Db: Database = {} as Database;
        let _period: PeriodObject | null = null;
        let _metas: Record<string, string[]> = {};
        let _uniques: string[] = ['u'];
        let _metrics: string[] = ['t', 'u', 'n'];
        let _totalUsersObj: TotalUsersObj = {};
        let _prevTotalUsersObj: TotalUsersObj = {};

        /**
         * Sets meta object
         */
        function setMeta(): void {
            const db = _Db as unknown as { meta?: Record<string, string[]> };
            if (db.meta) {
                for (const i in db.meta) {
                    _metas[i] = (db.meta[i]) ? db.meta[i] : [];
                }
            }
            else {
                _metas = {};
            }
        }

        /**
         * Extends meta object
         */
        function extendMeta(): void {
            const db = _Db as unknown as { meta?: Record<string, string[]> };
            if (db.meta) {
                for (const i in db.meta) {
                    _metas[i] = countlyCommon.union(_metas[i], db.meta[i]);
                }
            }
        }

        const countlyMetric: CountlyMetric = {
            /**
             * Fetching method to modify segment values, like changing name or grouping them
             */
            fetchValue: fetchValue || function(val: string): string {
                return val;
            },

            /**
             * Get the current period Object for the model
             */
            getPeriod: function(): PeriodObject | null {
                return _period;
            },

            /**
             * Set period object for the model to use, for overriding calls to common methods
             */
            setPeriod: function(period: PeriodObject | null): void {
                _period = period;
            },

            /**
             * Reset/delete all retrieved metric data, like when changing app or selected time period
             */
            reset: function(): void {
                _Db = {} as Database;
                setMeta();
            },

            /**
             * Get current data, if some view or model requires access to raw data
             */
            getDb: function(): Database {
                return _Db;
            },

            /**
             * Set current data for model, if you need to provide data for model from another resource
             */
            setDb: function(db: Database): void {
                _Db = db;
                setMeta();
            },

            /**
             * Extend current data for model with some additional information about latest period
             */
            extendDb: function(data: Record<string, unknown>): void {
                countlyCommon.extendDbObj(_Db, data);
                extendMeta();
            },

            /**
             * Set total user object for this metric to use for unique user correction
             */
            setTotalUsersObj: function(totalUsersObj?: TotalUsersObj, prevTotalUserObj?: TotalUsersObj): void {
                _totalUsersObj = totalUsersObj || {};
                _prevTotalUsersObj = prevTotalUserObj || {};
            },

            /**
             * Get total user object for this metric to use for unique user correction
             */
            getTotalUsersObj: function(prev?: boolean): TotalUsersObj {
                if (prev) {
                    return _prevTotalUsersObj;
                }
                return _totalUsersObj;
            },

            /**
             * Sets array of metric names that are unique and estimation should be applied to them
             */
            setUniqueMetrics: function(uniques: string[]): void {
                _uniques = uniques;
            },

            /**
             * Get array of unique metric names, for which user estimation should be applied
             */
            getUniqueMetrics: function(): string[] {
                return _uniques;
            },

            /**
             * Sets array of metric names that is used by this model
             */
            setMetrics: function(metrics: string[]): void {
                _metrics = metrics;
            },

            /**
             * Get array of metric names, for this data
             */
            getMetrics: function(): string[] {
                return _metrics;
            },

            /**
             * Get array of unique segment values available for provided segment data
             */
            getMeta: function(metric: string): string[] {
                return _metas[metric] || [];
            },

            /**
             * Prefill all expected metrics as u, t, n with 0 if they don't exist
             */
            clearObject: function(obj?: Record<string, unknown>): Record<string, unknown> {
                if (obj) {
                    for (let i = 0; i < _metrics.length; i++) {
                        if (!obj[_metrics[i]]) {
                            obj[_metrics[i]] = 0;
                        }
                    }
                }
                else {
                    obj = {};
                    for (let i = 0; i < _metrics.length; i++) {
                        obj[_metrics[i]] = 0;
                    }
                }

                return obj;
            },

            /**
             * Get data after initialize finished and data was retrieved
             */
            getData: function(segment?: string, clean?: boolean, join?: boolean): GetDataResult {
                if (segment) {
                    const dataProps: DataProperty[] = [
                        {
                            name: segment,
                            func: function(rangeArr: string): string {
                                rangeArr = countlyCommon.decode(rangeArr);
                                if (fetchValue && !clean) {
                                    return fetchValue(rangeArr);
                                }
                                else {
                                    return rangeArr;
                                }
                            }
                        }];

                    // add metrics
                    for (let i = 0; i < _metrics.length; i++) {
                        dataProps.push({ 'name': _metrics[i] });
                    }
                    const chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(segment), this.clearObject, dataProps, _totalUsersObj);
                    chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, segment);
                    chartData.chartData.sort(function(a: Record<string, number>, b: Record<string, number>) {
                        return b[_metrics[0]] - a[_metrics[0]];
                    });
                    const namesData = _.pluck(chartData.chartData, segment) as string[];
                    const otherData: Record<string, number[]> = {};
                    for (let i = 0; i < _metrics.length; i++) {
                        otherData[_metrics[i]] = _.pluck(chartData.chartData, _metrics[i]) as number[];
                    }

                    if (join) {
                        chartData.chartDP = { ticks: [] as Array<[number, string]> };
                        const chartDP: ChartDPItem[] = [];

                        for (let i = 0; i < _metrics.length; i++) {
                            chartDP.push({
                                data: [],
                                label: _metrics[i]
                            });
                            chartDP[i].data[0] = [-1, null];
                            chartDP[i].data[namesData.length + 1] = [namesData.length, null];
                        }

                        chartData.chartDP.ticks.push([-1, '']);
                        chartData.chartDP.ticks.push([namesData.length, '']);

                        for (let i = 0; i < namesData.length; i++) {
                            for (let j = 0; j < _metrics.length; j++) {
                                chartDP[j].data[i + 1] = [i, otherData[_metrics[i]][i]];
                            }
                            chartData.chartDP.ticks.push([i, namesData[i]]);
                        }

                        chartData.chartDP.dp = chartDP;
                    }
                    else {
                        for (let j = 0; j < _metrics.length; j++) {
                            const chartData2: ChartDPItem[] = [];

                            for (let i = 0; i < namesData.length; i++) {
                                chartData2[i] = {
                                    data: [
                                        [0, otherData[_metrics[j]][i]]
                                    ],
                                    label: namesData[i]
                                };
                            }

                            chartData['chartDP' + _metrics[j]] = {};
                            (chartData['chartDP' + _metrics[j]] as { dp: ChartDPItem[] }).dp = chartData2;
                        }
                    }
                    return chartData as GetDataResult;
                }
                else {
                    // try to fetch higher level data without segments
                    const chartData: ChartDPItem[] = [];
                    const dataProps: DataProperty[] = [];

                    for (let i = 0; i < _metrics.length; i++) {
                        chartData.push({
                            data: [],
                            label: _metrics[i]
                        });
                        dataProps.push({ name: _metrics[i] });
                    }

                    return countlyCommon.extractChartData(this.getDb(), this.clearObject, chartData, dataProps) as GetDataResult;
                }
            },

            /**
             * Get bar data for metric
             */
            getBars: function(segment?: string, maxItems?: number, metric?: string): BarDataItem[] {
                let periodObject: PeriodObject | null = null;
                if (this.getPeriod()) {
                    periodObject = countlyCommon.getPeriodObj({ qstring: {} }, this.getPeriod());
                }
                metric = metric || _metrics[0];
                if (segment) {
                    const fixFn = this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) as FixBarSegmentDataFunction : undefined;
                    return countlyCommon.extractBarData(_Db, this.getMeta(segment), this.clearObject, fetchValue, maxItems, metric, this.getTotalUsersObj(), fixFn, periodObject);
                }
                else {
                    let barData: BarDataItem[] = [];
                    let sum = 0;
                    let totalPercent = 0;

                    maxItems = maxItems || 3;

                    const chartData = [
                        {
                            data: [] as Array<[number, number]>,
                            label: metric
                        }
                    ];
                    const dataProps: DataProperty[] = [
                        {
                            name: metric,
                            func: function(dataObj: Record<string, number>): number {
                                return dataObj[metric as string];
                            }
                        }
                    ];

                    const totalUserData = countlyCommon.extractChartData(this.getDb(), this.clearObject, chartData, dataProps);
                    const topUsers = _.sortBy(_.reject(totalUserData.chartData, function(obj: Record<string, number>) {
                        return obj[metric as string] === 0;
                    }), function(obj: Record<string, number>) {
                        return -obj[metric as string];
                    }) as Array<Record<string, number | string>>;

                    topUsers.forEach(function(r) {
                        sum += r[metric as string] as number;
                    });

                    for (let i = topUsers.length - 1; i >= 0; i--) {
                        const percent = countlyCommon.round(((topUsers[i][metric as string] as number) / sum) * 100, 1);
                        totalPercent += percent;

                        barData[i] = {
                            'name': topUsers[i].date as string,
                            value: topUsers[i][metric as string] as number,
                            'percent': percent
                        };
                    }

                    barData = countlyCommon.fixPercentageDelta(barData, totalPercent);

                    if (topUsers.length < maxItems) {
                        maxItems = topUsers.length;
                    }

                    if (maxItems !== -1) {
                        barData = barData.slice(0, maxItems);
                    }

                    return _.sortBy(barData, function(obj: BarDataItem) {
                        return -obj.value;
                    });
                }
            },

            /**
             * Get data for dynamic tables
             */
            getTableData: function(segment?: string, maxItems?: number): TableDataResult {
                const cols = _metrics.slice();
                cols.unshift(segment || 'date');
                const ret: TableDataResult = {
                    cols: cols,
                    rows: []
                };
                const data = this.getData(segment, false, true).chartData;
                const sortedData = _.sortBy(_.reject(data, function(obj: Record<string, number>) {
                    return obj[cols[1]] === 0;
                }), function(obj: Record<string, number>) {
                    return -obj[cols[1]];
                }) as Array<Record<string, number | string>>;

                // eslint-disable-next-line unicorn/explicit-length-check
                let itemCount = maxItems || sortedData.length;
                if (sortedData.length < itemCount) {
                    itemCount = sortedData.length;
                }
                for (let i = 0; i < itemCount; i++) {
                    const ob: Array<string | number> = [];
                    for (let j = 0; j < cols.length; j++) {
                        if (typeof sortedData[i][cols[j]] === 'number') {
                            sortedData[i][cols[j]] = Math.round((sortedData[i][cols[j]] as number) * 100) / 100;
                        }
                        ob.push(sortedData[i][cols[j]]);
                    }
                    ret.rows.push(ob);
                }
                return ret;
            },

            /**
             * Get value of single metric with changes and sparkle lines
             */
            getNumber: function(metric?: string, isSparklineNotRequired?: boolean): NumberMetricResult {
                let periodObject: PeriodObject | null = null;
                if (this.getPeriod()) {
                    periodObject = countlyCommon.getPeriodObj({ qstring: {} }, this.getPeriod());
                }
                metric = metric || _metrics[0];
                const metrics = [metric];
                // include other default metrics for data correction
                if (metric === 'u') {
                    metrics.push('n');
                    metrics.push('t');
                }
                if (metric === 'n') {
                    metrics.push('u');
                }
                const data: DashboardData = countlyCommon.getDashboardData(this.getDb(), metrics, _uniques, { u: this.getTotalUsersObj().users }, { u: this.getTotalUsersObj(true).users }, periodObject);
                if (isSparklineNotRequired) {
                    return data[metric] as NumberMetricResult;
                }
                const ob: Record<string, string> = {};
                ob[metric] = metric;
                const sparkLines = countlyCommon.getSparklineData(this.getDb(), ob, function(obj?: Record<string, number>): Record<string, number> {
                    if (obj) {
                        if (!obj[metric as string]) {
                            obj[metric as string] = 0;
                        }
                    }
                    else {
                        obj = {};
                        obj[metric as string] = 0;
                    }

                    return obj;
                }, periodObject);
                for (const i in data) {
                    if (sparkLines[i]) {
                        (data[i] as NumberMetricResult).sparkline = sparkLines[i].split(',').map(function(item: string) {
                            return Number.parseInt(item);
                        });
                    }
                }
                return data[metric] as NumberMetricResult;
            },

            /**
             * Get timeline data for higher metrics without segments
             */
            getTimelineData: function(): TimelineDataResult {
                const dataProps: DataProperty[] = [];
                let periodObject: PeriodObject | null = null;
                for (let i = 0; i < _metrics.length; i++) {
                    dataProps.push({ name: _metrics[i] });
                }
                if (this.getPeriod()) {
                    periodObject = countlyCommon.getPeriodObj({ qstring: {} }, this.getPeriod());
                }
                const data = countlyCommon.extractData(this.getDb(), this.clearObject, dataProps, periodObject);
                const ret: TimelineDataResult = {};
                for (let i = 0; i < data.length; i++) {
                    ret[data[i]._id as string] = {};
                    for (let j = 0; j < _metrics.length; j++) {
                        ret[data[i]._id as string][_metrics[j]] = data[i][_metrics[j]] as number;
                    }
                }
                return ret;
            },

            /**
             * Get timeline data for higher metrics with segments
             */
            getStackedBarData: function(segment: string, maxItems?: number, metric?: string, displayType?: string): StackedBarDataResult {
                metric = metric || _metrics[0];
                if (!metric) {
                    metric = 'u';
                }
                const isPercentage = displayType === 'percentage';
                const data = this.getData(segment, true, true).chartData;
                const chartData: Array<{ data: unknown[]; label: string }> = [];
                const dataProps: DataProperty[] = [];
                for (let i = 0; i < data.length; i++) {
                    const segment_value = fetchValue ? fetchValue(data[i][segment] as string) : data[i][segment] as string;
                    if (segment_value) {
                        chartData.push({ data: [], label: segment_value });
                        dataProps.push({ name: data[i][segment] as string });
                    }
                }
                const dd = countlyCommon.extractStackedBarData(this.getDb(), this.clearObject, chartData, dataProps, '', true);
                let series = dd.chartDP as unknown as StackedBarSeriesItem[];
                const totals: number[] = [];
                const percent: number[] = [];
                const labels: string[] = [];

                for (let z = 0; z < dd.chartData.length; z++) {
                    labels.push(dd.chartData[z].date as string);
                }

                // lets sort series
                series = series.sort(function(a, b) {
                    const v1 = a.label.split('.');
                    const v2 = b.label.split('.');
                    const longest = Math.max(v1.length, v2.length);

                    for (let z = 0; z < longest; z++) {
                        let i1 = 0;
                        let i2 = 0;
                        if (v1[z]) {
                            i1 = Number.parseInt(v1[z], 10);
                        }
                        if (v2[z]) {
                            i2 = Number.parseInt(v2[z], 10);
                        }
                        if (i1 !== i2) {
                            if (i2 > i1) {
                                return 1;
                            }
                            else {
                                return -1;
                            }
                        }
                    }
                    return 1;
                });

                for (let i = 0; i < series.length; i++) {
                    for (let j = 0; j < series[i].data.length; j++) {
                        totals[j] = totals[j] || 0;
                        const dataItem = series[i].data[j] as unknown;
                        if (dataItem && typeof dataItem === 'object' && dataItem !== null) {
                            const itemWithMetric = (dataItem as [number, Record<string, number>])[1];
                            if (itemWithMetric && itemWithMetric[metric as string]) {
                                totals[j] += itemWithMetric[metric as string] || 0;
                                percent[j] = 100;
                                series[i].data[j] = itemWithMetric[metric as string] || 0;
                            }
                            else {
                                series[i].data[j] = 0;
                                if (!percent[j]) {
                                    percent[j] = 0;
                                }
                            }
                        }
                        else {
                            series[i].data[j] = 0;
                            if (!percent[j]) {
                                percent[j] = 0;
                            }
                        }
                    }
                }

                for (let i = 0; i < series.length; i++) {
                    series[i].name = series[i].label;
                    series[i].stack = 'default';

                    for (let j = 0; j < series[i].data.length; j++) {
                        if (isPercentage) {
                            const value = Math.round((series[i].data[j] as number) * 100 / totals[j]);
                            if ((percent[j] - value) > 0) {
                                series[i].data[j] = value;
                                percent[j] = percent[j] - value;
                                // if last value
                                if (i + 1 === series.length && percent[j] > 0) {
                                    // find the largest value and assign the remainder to it
                                    let index = -1;
                                    let val = 0;
                                    for (let z = 0; z < series.length; z++) {
                                        if ((series[z].data[j] as number) > val) {
                                            val = series[z].data[j] as number;
                                            index = z;
                                        }
                                    }
                                    if (index > -1) {
                                        (series[index].data[j] as number) += percent[j];
                                    }
                                }
                            }
                            else {
                                series[i].data[j] = percent[j];
                                percent[j] = 0;
                            }
                        }
                    }
                }

                const xAxis = {
                    type: 'category',
                    data: labels
                };

                const yAxis: { axisLabel?: { formatter: string } } = {};
                if (isPercentage) {
                    yAxis.axisLabel = { formatter: '{value} %' };
                }
                return { xAxis: xAxis, yAxis: yAxis, series: series };
            },

            /**
             * Get range data which is usually stored in some time ranges/buckets
             */
            getRangeData: function(metric: string, meta: string, explain: (range: string) => string): RangeDataResult {
                const chartData: RangeDataResult = {
                    chartData: [],
                    chartDP: {
                        dp: [],
                        ticks: []
                    }
                };

                chartData.chartData = countlyCommon.extractRangeData(_Db, metric, this.getMeta(meta), explain);

                const frequencies = _.pluck(chartData.chartData, metric) as string[];
                const frequencyTotals = _.pluck(chartData.chartData, 't') as number[];
                const chartDP = [
                    { data: [] as Array<[number, number | null]> }
                ];

                chartDP[0].data[0] = [-1, null];
                chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

                chartData.chartDP.ticks.push([-1, '']);
                chartData.chartDP.ticks.push([frequencies.length, '']);

                for (let i = 0; i < frequencies.length; i++) {
                    chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
                    chartData.chartDP.ticks.push([i, frequencies[i]]);
                }

                chartData.chartDP.dp = chartDP;

                for (let i = 0; i < chartData.chartData.length; i++) {
                    const item = chartData.chartData[i] as Record<string, unknown>;
                    item.percent = "<div class='percent-bar' style='width:" + (2 * (item.percent as number)) + "px;'></div>" + (item.percent as number) + '%';
                }

                return chartData;
            }
        };

        return countlyMetric;
    }
};

export default countlyModel;
export { countlyModel };
