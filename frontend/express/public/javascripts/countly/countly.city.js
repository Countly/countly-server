/*global countlyCommon, jQuery, CountlyHelpers, google, _, countlyGlobal*/

/**
 * @module countly.city
 * @description Module for handling city-level geolocation data and visualization
 */

// Private Properties
/** @private */
let _chart;
/** @private */
let _dataTable;
/** @private */
let _chartElementId = "geo-chart";
/** @private */
let _chartOptions = {
    displayMode: 'markers',
    colorAxis: {minValue: 0, colors: ['#D7F1D8', '#6BB96E']},
    resolution: 'countries',
    toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
    legend: "none",
    backgroundColor: "transparent",
    datalessRegionColor: "#FFF",
    region: "TR"
};

// Create the countlyCity object
const countlyCity = {};

/**
 * Draws the geo chart with city markers for the specified metric
 * @private
 * @param {object} ob - The metric configuration object
 * @param {string} ob.id - The metric identifier
 * @param {string} ob.label - The display label for the metric
 * @param {string} ob.type - The data type (e.g., 'number')
 * @param {string} ob.metric - The metric key ('t' for total sessions, 'u' for users, 'n' for new users)
 * @returns {void}
 */
function draw(ob) {
    ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
    const chartData = {cols: [], rows: []};

    _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

    const tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
        {
            "name": "city",
            "func": function(rangeArr) {
                if (rangeArr === "Unknown") {
                    return jQuery.i18n.map["common.unknown"];
                }
                return rangeArr;
            }
        },
        { "name": "t" },
        { "name": "u" },
        { "name": "n" }
    ], "cities");

    chartData.cols = [
        {id: 'city', label: "City", type: 'string'}
    ];
    chartData.cols.push(ob);
    chartData.rows = _.map(tt.chartData, function(value) {
        if (value.city === jQuery.i18n.map["common.unknown"]) {
            return {
                c: [
                    {v: ""},
                    {v: value[ob.metric]}
                ]
            };
        }
        return {
            c: [
                {v: value.city},
                {v: value[ob.metric]}
            ]
        };
    });

    _dataTable = new google.visualization.DataTable(chartData);

    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
        _chartOptions.region = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
    }

    _chartOptions.resolution = 'countries';
    _chartOptions.displayMode = "markers";

    if (ob.metric === "t") {
        _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
    }
    else if (ob.metric === "u") {
        _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
    }
    else if (ob.metric === "n") {
        _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
    }

    _chart.draw(_dataTable, _chartOptions);
}

/**
 * Redraws the geo chart with updated city data for the specified metric
 * @private
 * @param {object} ob - The metric configuration object
 * @param {string} ob.id - The metric identifier
 * @param {string} ob.label - The display label for the metric
 * @param {string} ob.type - The data type (e.g., 'number')
 * @param {string} ob.metric - The metric key ('t' for total sessions, 'u' for users, 'n' for new users)
 * @returns {void}
 */
function reDraw(ob) {
    ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
    const chartData = {cols: [], rows: []};

    const tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
        {
            "name": "city",
            "func": function(rangeArr) {
                if (rangeArr === "Unknown") {
                    return jQuery.i18n.map["common.unknown"];
                }
                return rangeArr;
            }
        },
        { "name": "t" },
        { "name": "u" },
        { "name": "n" }
    ], "cities");

    chartData.cols = [
        {id: 'city', label: "City", type: 'string'}
    ];
    chartData.cols.push(ob);
    chartData.rows = _.map(tt.chartData, function(value) {
        if (value.city === jQuery.i18n.map["common.unknown"]) {
            return {
                c: [
                    {v: ""},
                    {v: value[ob.metric]}
                ]
            };
        }
        return {
            c: [
                {v: value.city},
                {v: value[ob.metric]}
            ]
        };
    });

    if (ob.metric === "t") {
        _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
    }
    else if (ob.metric === "u") {
        _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
    }
    else if (ob.metric === "n") {
        _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
    }

    _dataTable = new google.visualization.DataTable(chartData);
    _chart.draw(_dataTable, _chartOptions);
}

// Stub functions for when CITY_DATA is disabled

/**
 * Stub initialize function used when city data collection is disabled
 * @returns {boolean} Always returns true
 * @example
 * // When countlyCommon.CITY_DATA === false
 * initializeStub(); // Returns true, does nothing
 */
export function initializeStub() {
    return true;
}

/**
 * Stub refresh function used when city data collection is disabled
 * @returns {boolean} Always returns true
 * @example
 * // When countlyCommon.CITY_DATA === false
 * refreshStub(); // Returns true, does nothing
 */
export function refreshStub() {
    return true;
}

/**
 * Stub drawGeoChart function used when city data collection is disabled
 * @returns {boolean} Always returns true
 * @example
 * // When countlyCommon.CITY_DATA === false
 * drawGeoChartStub(); // Returns true, does nothing
 */
export function drawGeoChartStub() {
    return true;
}

/**
 * Stub refreshGeoChart function used when city data collection is disabled
 * @returns {boolean} Always returns true
 * @example
 * // When countlyCommon.CITY_DATA === false
 * refreshGeoChartStub(); // Returns true, does nothing
 */
export function refreshGeoChartStub() {
    return true;
}

/**
 * Stub getLocationData function used when city data collection is disabled
 * @returns {Array} Always returns an empty array
 * @example
 * // When countlyCommon.CITY_DATA === false
 * getLocationDataStub(); // Returns []
 */
export function getLocationDataStub() {
    return [];
}

// Main functions for when CITY_DATA is enabled

/**
 * Initializes the city data module
 * Delegates to the initialize method set up by createMetricModel
 * @returns {boolean} True if initialization was successful
 * @example
 * initialize(); // Initializes city data from the metric model
 */
export function initialize() {
    // This is set up by createMetricModel
    return countlyCity.initialize ? countlyCity.initialize() : true;
}

/**
 * Refreshes the city data
 * Delegates to the refresh method set up by createMetricModel
 * @returns {boolean} True if refresh was successful
 * @example
 * refresh(); // Refreshes city data from the metric model
 */
export function refresh() {
    // This is set up by createMetricModel
    return countlyCity.refresh ? countlyCity.refresh() : true;
}

/**
 * Draws the geo chart with city markers
 * Uses Google Charts GeoChart to render a map with city markers for the active app's country
 * Shows a warning if Google Maps is enabled but no API key is configured
 * @param {object} options - Configuration options for the chart
 * @param {string} [options.chartElementId] - The DOM element ID where the chart should be rendered (default: "geo-chart")
 * @param {number} [options.height] - The height of the chart in pixels (width is calculated to preserve 556:347 aspect ratio)
 * @param {object} options.metric - The metric configuration object for data display
 * @param {string} options.metric.id - The metric identifier
 * @param {string} options.metric.label - The display label for the metric
 * @param {string} options.metric.type - The data type (e.g., 'number')
 * @param {string} options.metric.metric - The metric key ('t' for total, 'u' for users, 'n' for new)
 * @returns {void}
 * @example
 * drawGeoChart({
 *     chartElementId: 'city-chart',
 *     height: 400,
 *     metric: { id: 'total', label: 'Sessions', type: 'number', metric: 't' }
 * });
 */
export function drawGeoChart(options) {
    if (countlyGlobal.config.use_google && !countlyGlobal.config.google_maps_api_key) {
        window.$(".routename-countries .widget-tips").css("display", "block");
    }
    if (options) {
        if (options.chartElementId) {
            _chartElementId = options.chartElementId;
        }

        if (options.height) {
            _chartOptions.height = options.height;

            //preserve the aspect ratio of the chart if height is given
            _chartOptions.width = (options.height * 556 / 347);
        }
    }

    if (google.visualization) {
        draw(options.metric);
    }
    else {
        const googleChartsOptions = {
            packages: ['geochart'],
            callback: function() {
                draw(options.metric);
            }
        };

        if (countlyGlobal.config.google_maps_api_key) {
            googleChartsOptions.mapsApiKey = countlyGlobal.config.google_maps_api_key;
        }

        google.charts.load("current", googleChartsOptions);
    }
}

/**
 * Refreshes the geo chart with updated city data for the specified metric
 * If Google Charts visualization is available, redraws immediately; otherwise loads it first
 * @param {object} metric - The metric configuration object
 * @param {string} metric.id - The metric identifier
 * @param {string} metric.label - The display label for the metric
 * @param {string} metric.type - The data type (e.g., 'number')
 * @param {string} metric.metric - The metric key ('t' for total, 'u' for users, 'n' for new)
 * @returns {void}
 * @example
 * refreshGeoChart({ id: 'users', label: 'Users', type: 'number', metric: 'u' });
 */
export function refreshGeoChart(metric) {
    if (google.visualization) {
        reDraw(metric);
    }
    else {
        const googleChartsOptions = {
            packages: ['geochart'],
            callback: function() {
                draw(metric);
            }
        };

        if (countlyGlobal.config.google_maps_api_key) {
            googleChartsOptions.mapsApiKey = countlyGlobal.config.google_maps_api_key;
        }

        google.charts.load("current", googleChartsOptions);
    }
}

/**
 * Retrieves city location data for display in tables and charts
 * Gets data from the countlyCity model and optionally limits the number of results
 * @param {object} [options] - Configuration options
 * @param {number} [options.maxCountries] - Maximum number of cities to return (despite the name, this limits cities)
 * @returns {Array<object>} An array of city data objects, each containing:
 *   - {string} city - The city name
 *   - {number} t - Total sessions
 *   - {number} u - Unique users
 *   - {number} n - New users
 * @example
 * const cities = getLocationData({ maxCountries: 10 });
 * // Returns top 10 cities with their metrics
 * @example
 * const allCities = getLocationData();
 * // Returns all cities with their metrics
 */
export function getLocationData(options) {
    const locationData = countlyCity.getData();

    if (options && options.maxCountries && locationData.chartData) {
        if (locationData.chartData.length > options.maxCountries) {
            locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
        }
    }

    return locationData.chartData;
}

/**
 * Sets up the city module based on the CITY_DATA configuration flag
 * If city data collection is disabled (CITY_DATA === false), assigns stub functions
 * If enabled, creates the metric model and assigns the real implementation functions
 * Also exposes countlyCity to the window object for backward compatibility
 * @returns {void}
 * @example
 * import { setup } from './countly.city.js';
 * setup(); // Initialize the city module based on configuration
 */
export function setup() {
    if (countlyCommon.CITY_DATA === false) {
        countlyCity.initialize = initializeStub;
        countlyCity.refresh = refreshStub;
        countlyCity.drawGeoChart = drawGeoChartStub;
        countlyCity.refreshGeoChart = refreshGeoChartStub;
        countlyCity.getLocationData = getLocationDataStub;
    }
    else {
        CountlyHelpers.createMetricModel(countlyCity, {name: "cities", estOverrideMetric: "cities"}, jQuery, function(rangeArr) {
            if (rangeArr === "Unknown") {
                return jQuery.i18n.map["common.unknown"];
            }
            return rangeArr;
        });

        countlyCity.drawGeoChart = drawGeoChart;
        countlyCity.refreshGeoChart = refreshGeoChart;
        countlyCity.getLocationData = getLocationData;
    }

    // Expose to window for backward compatibility
    window.countlyCity = countlyCity;
}

// Export the countlyCity object as default
export default countlyCity;