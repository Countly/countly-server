import jQuery from 'jquery';
import countlyCommon from './countly.common.js';
import countlyGlobal from './countly.global.js';

var AVAILABLE_API_IDS = ["server-guides", "server-consents", "server-intro-video", "server-quick-start", "server-guide-config"];
var CMS_TKN = "17fa74a2b4b1524e57e8790250f89f44f364fe567f13f4dbef02ef583e70dcdb700f87a6122212bb01ca6a14a8d4b85dc314296f71681988993c013ed2f6305b57b251af723830ea2aa180fc689af1052dd74bc3f4b9b35e5674d4214a8c79695face42057424f0494631679922a3bdaeb780b522bb025dfaea8d7d56a857dba";
var CMS_BASE_URL = "https://cms.count.ly/";
var UPDATE_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

var transformCMSResponse = function(response, params) {
    var result = [];

    response.forEach(function(item) {
        result.push(Object.assign({_id: params._id + '_' + item.id, lu: Date.now()}, item.attributes));
    });

    return result;
};

var entryNeedsUpdate = function(entry) {
    if ('lu' in entry) {
        var diff = Date.now() - entry.lu;
        return diff >= UPDATE_INTERVAL;
    }

    return true;
};


/**
 * requestFromCMS - Fetches data from the CMS API with pagination support
 * @param {*} params  Parameters for the request, must include _id and optional populate
 * @returns  {Promise} Promise that resolves with the fetched data
 */
export function requestFromCMS(params) {
    var pageSize = 100;
    var url = new URL('/api/' + params._id, CMS_BASE_URL);
    var results = [];

    var doRequest = function(pageNumber) {
        url.searchParams.append('pagination[page]', pageNumber);
        url.searchParams.append('pagination[pageSize]', pageSize);

        if (params.populate) {
            url.searchParams.append('populate', '*');
        }

        return new Promise(function(resolve, reject) {
            jQuery.ajax({
                url: url.href,
                headers: {
                    'Authorization': 'Bearer ' + CMS_TKN,
                },
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr) {
                    reject(xhr.responseJSON);
                },
            });
        });
    };

    var requestPage = function(pageNumber) {
        return doRequest(pageNumber).then(function(response) {
            var data = response.data;
            var meta = response.meta;

            if (data && data.length > 0 || data.id) {
                results = results.concat(data);
            }

            if (meta && meta.pagination && meta.pagination.page < meta.pagination.pageCount) {
                // Fetch next page
                return requestPage(meta.pagination.page + 1);
            }
            else {
                // All pages fetched or no pagination metadata, resolve
                return Promise.resolve(results);
            }
        });
    };

    return requestPage(1);
}

/**
 * saveEntries - Saves fetched entries to the backend
 * @param {*} entryID - Entry ID
 * @param {*} entries - Entries data to save
 * @returns {Promise} Promise that resolves when the save is complete
 */
export function saveEntries(entryID, entries) {
    var formData = new FormData();
    formData.append('app_id', countlyCommon.ACTIVE_APP_ID);
    formData.append('api_key', countlyGlobal.member.api_key);
    formData.append('_id', entryID);
    formData.append('entries', JSON.stringify(entries));

    return new Promise(function(resolve, reject) {
        jQuery.ajax({
            url: countlyCommon.API_PARTS.data.w + "/cms/save_entries",
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                reject(xhr.responseJSON);
            },
        });
    });
}

/**
 * requestFromBackend - Fetches data from the backend CMS storage
 * @param {*} params - Parameters for the request, must include _id
 * @returns {Promise} Promise that resolves with the fetched data
 */
export function requestFromBackend(params) {
    return new Promise(function(resolve, reject) {
        jQuery.ajax({
            url: countlyCommon.API_PARTS.data.r + "/cms/entries",
            data: params,
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                reject(xhr.responseJSON);
            },
        });
    });
}

/**
 * requestFromCMSAndSave - Fetches data from the CMS and saves it to the backend
 * @param {*} params - Parameters for the request, must include _id and optional populate
 * @returns {Promise} Promise that resolves with the fetched and saved data
 */
export function requestFromCMSAndSave(params) {
    return new Promise(function(resolve, reject) {
        requestFromCMS(params)
            .then(function(response) {
                var transformedResponse = transformCMSResponse(response, params);

                saveEntries(params._id, transformedResponse);

                resolve({data: transformedResponse});
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

/**
 * fetchEntry - Fetches an entry either from the backend or CMS based on freshness 
 * @param {*} entryID - Entry ID to fetch
 * @param {*} options - Options for fetching, can include populate, query, CMSFirst, refresh
 * @returns {Promise} Promise that resolves with the fetched entry data
 */
export function fetchEntry(entryID, options) {
    if (!AVAILABLE_API_IDS.includes(entryID)) {
        return Promise.reject({ result: 'Missing or incorrect API _id parameter'});
    }

    var params = {};
    params._id = entryID;

    if (options) {
        if (options.populate) {
            params.populate = options.populate;
        }
        if (options.query) {
            params.query = JSON.stringify(options.query);
        }
    }

    if (options && options.CMSFirst) {
        // Request from cms first
        return requestFromCMSAndSave(params);
    }
    else {
        // Request from backend first
        return new Promise(function(resolve, reject) {
            requestFromBackend(params)
                .then(function(response) {
                    // data found in backend
                    if (response.data && response.data.length > 0) {
                        // if data from backend is stale, get new data
                        if (entryNeedsUpdate(response.data[0]) || (options && options.refresh)) {
                            return requestFromCMSAndSave(params);
                        }
                        else {
                            resolve(response);
                        }
                    }
                    else {
                        // data not found in backend, get from cms
                        return requestFromCMSAndSave(params);
                    }
                })
                .then(function(response) {
                    resolve(response);
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }
}

/**
 * clearCache - Clears the cache for a specific entry in the backend CMS storage
 * @param {*} entryID - Entry ID for which the cache should be cleared
 * @returns {Promise} Promise that resolves when the cache is cleared
 */
export function clearCache(entryID) {
    return new Promise(function(resolve, reject) {
        jQuery.ajax({
            url: countlyCommon.API_PARTS.data.r + "/cms/clear",
            data: { _id: entryID },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                reject(xhr.responseJSON);
            },
        });
    });
}

const countlyCMS = {
    requestFromCMS,
    saveEntries,
    requestFromBackend,
    requestFromCMSAndSave,
    fetchEntry,
    clearCache
};

export default countlyCMS;
