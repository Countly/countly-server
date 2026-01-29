import countlySession from './countly.session.js';
import { countlyCommon } from './countly.common.js';
import { T, createMetricModel } from './countly.helpers.js';
import _ from 'underscore';
import jQuery from 'jquery';
import countlyGlobal from './countly.global.js';

let _regionMap = {};
let _countryMap = {};

// Create the countlyLocation object
export const countlyLocation = {};

/**
 * Gets the localized country name from a country code
 * @param {string} cc - The ISO country code (e.g., 'US', 'TR', 'DE')
 * @returns {string} The localized country name, or "European Union" for 'EU', or "Unknown" if not found
 * @example
 * getCountryName('US'); // Returns "United States"
 * getCountryName('EU'); // Returns "European Union"
 * getCountryName('XX'); // Returns "Unknown"
 */
export function getCountryName(cc) {
    const countryName = _countryMap[cc && (cc + "").toUpperCase()];
    if (countryName) {
        return countryName;
    }
    else if (cc && (cc + "").toUpperCase() === "EU") {
        return jQuery.i18n.map["common.eu"] || "European Union";
    }
    else {
        return jQuery.i18n.map["common.unknown"] || "Unknown";
    }
}

/**
 * Gets country codes that match a given country name prefix
 * @param {string} name - The country name or prefix to search for (case-insensitive)
 * @returns {string[]} An array of matching country codes
 * @example
 * getCodesFromName('United'); // Returns ['US', 'GB', 'AE', ...] for countries starting with "United"
 * getCodesFromName('ger'); // Returns ['DE'] for Germany
 */
export function getCodesFromName(name) {
    const codes = [];
    const lowerCase = name.toLowerCase();
    for (const p in _countryMap) {
        if (_countryMap[p].toLowerCase().startsWith(lowerCase)) {
            codes.push(p);
        }
    }
    return codes;
}

/**
 * Gets the region name from a region code, optionally with country context
 * @param {string} rgn - The region code
 * @param {string} [country] - The country code to provide context for region lookup
 * @returns {string} The region name, or the original region code if not found
 * @example
 * getRegionName('CA', 'US'); // Returns "California"
 * getRegionName('34', 'TR'); // Returns "İstanbul"
 */
export function getRegionName(rgn, country) {
    return _regionMap[rgn] || _regionMap[country + "-" + rgn] || rgn;
}

/**
 * Initializes the location module by setting the database from the session data
 * This should be called when the location view is first loaded
 * @returns {void}
 */
export function initialize() {
    countlyLocation.setDb(countlySession.getDb());
}

/**
 * Refreshes the location data with new JSON data
 * @param {object} [newJSON] - The new data to extend the existing database with
 * @returns {void}
 */
export function refresh(newJSON) {
    if (newJSON) {
        countlyLocation.extendDb(newJSON);
    }
}

/**
 * Sorts location data by the specified metric type in descending order
 * @param {string} type - The metric type to sort by ('t' for total, 'u' for users, 'n' for new)
 * @param {Array<object>} locationData - The array of location data objects to sort
 * @returns {Array<object>} The sorted array of location data objects
 * @example
 * const sorted = orderByType('u', locationData); // Sort by users, descending
 */
export function orderByType(type, locationData) {
    return _.sortBy(locationData, function(obj) {
        return -obj[type];
    });
}

/**
 * Retrieves and processes location data for display in tables and charts
 * Extracts country data from the database, merges duplicates, sorts by total sessions,
 * and adds country flag HTML for each entry
 * @param {object} [options] - Configuration options
 * @param {number} [options.maxCountries] - Maximum number of countries to return (truncates the rest)
 * @returns {Array<object>} An array of location data objects, each containing:
 *   - {string} country - The localized country name
 *   - {string} code - The lowercase country code
 *   - {number} t - Total sessions
 *   - {number} u - Unique users
 *   - {number} n - New users
 *   - {string} country_flag - HTML string with flag image and country name
 * @example
 * const data = getLocationData({ maxCountries: 10 });
 * // Returns top 10 countries with their metrics and flag HTML
 */
export function getLocationData(options) {
    let locationData = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
        {
            "name": "country",
            "func": function(rangeArr) {
                return countlyLocation.getCountryName(rangeArr);
            }
        },
        {
            "name": "code",
            "func": function(rangeArr) {
                return rangeArr.toLowerCase();
            }
        },
        { "name": "t" },
        { "name": "u" },
        { "name": "n" }
    ], "countries");
    locationData.chartData = countlyCommon.mergeMetricsByName(locationData.chartData, "country");
    locationData.chartData = _.sortBy(locationData.chartData, function(obj) {
        return -obj.t;
    });

    if (options && options.maxCountries && locationData.chartData) {
        if (locationData.chartData.length > options.maxCountries) {
            locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
        }
    }

    for (let i = 0; i < locationData.chartData.length; i++) {
        locationData.chartData[i].country_flag =
            "<div class='flag " + locationData.chartData[i].code + "' style='margin-top:2px; background-image:url(" + countlyGlobal.path + "/images/flags/" + locationData.chartData[i].code + ".png);'></div>" +
            locationData.chartData[i].country;
    }

    return locationData.chartData;
}

/**
 * Changes the language for country names by reloading the country map
 * from the localization files based on the current browser language
 * @returns {Promise} A promise that resolves when the country names have been loaded
 * @example
 * await changeLanguage(); // Reloads country names for current browser language
 */
export function changeLanguage() {
    // Load local country names
    return T.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
        _countryMap = data;
    });
}

/**
 * Sets up the location module by loading localization data and creating the metric model
 * This function must be called before using other location functions
 * It performs the following:
 * - Loads country names for the current browser language
 * - Loads region names
 * - Assigns all public methods to the countlyLocation object
 * - Creates the metric model for countries
 * @returns {void}
 * @example
 * import { setup } from './countly.location.js';
 * setup(); // Initialize the location module
 */
export function setup() {
    // Load local country names
    T.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
        _countryMap = data;
    });

    T.get('/localization/countries/en/region.json', function(data) {
        _regionMap = data;
    });

    // Assign methods to countlyLocation object
    countlyLocation.getCountryName = getCountryName;
    countlyLocation.getCodesFromName = getCodesFromName;
    countlyLocation.getRegionName = getRegionName;
    countlyLocation.initialize = initialize;
    countlyLocation.refresh = refresh;
    countlyLocation.orderByType = orderByType;
    countlyLocation.getLocationData = getLocationData;
    countlyLocation.changeLanguage = changeLanguage;

    // Create metric model
    createMetricModel(countlyLocation, {name: "countries", estOverrideMetric: "countries"}, jQuery, countlyLocation.getCountryName);
}

// Export the countlyLocation object as default
export default countlyLocation;