/**
* This module is meant for handling CMS API requests.
* @module api/parts/mgmt/cms
*/

/** @lends module:api/parts/mgmt/cms */
var cmsApi = {},
    common = require('./../../utils/common.js');

const AVAILABLE_API_IDS = ["server-guides", "server-consents", "server-intro-video", "server-quick-start"],
    token = "17fa74a2b4b1524e57e8790250f89f44f364fe567f13f4dbef02ef583e70dcdb700f87a6122212bb01ca6a14a8d4b85dc314296f71681988993c013ed2f6305b57b251af723830ea2aa180fc689af1052dd74bc3f4b9b35e5674d4214a8c79695face42057424f0494631679922a3bdaeb780b522bb025dfaea8d7d56a857dba",
    baseURL = "https://cms.count.ly/api/";


/**
* Get entries for a given API ID from Countly CMS
* @param {params} params - params object
* @param {function} callback - callback function
**/
function fetchFromCMS(params, callback) {
    const url = baseURL + params.qstring._id;
    const pageSize = 100;
    var results = [];

    /**
    * Get a single page of data
    * @param {number} pageNumber - page number
    **/
    function fetchPage(pageNumber) {
        const pageUrl = `${url}?pagination[page]=${pageNumber}&pagination[pageSize]=${pageSize}`;

        fetch(pageUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
            .then(response => response.json())
            .then(responseData => {
                const {data, meta} = responseData;
                if (data && data.length > 0) {
                    // Add data to results
                    results = results.concat(data);
                }

                if (meta && meta.pagination && meta.pagination.page < meta.pagination.pageCount) {
                    // Fetch next page
                    fetchPage(meta.pagination.page + 1);
                }
                else {
                    // All pages fetched or no pagination metadata, invoke callback
                    callback(null, results);
                }
            })
            .catch(error => {
                console.log(error);
                callback(error, null);
            });
    }

    fetchPage(1);
}

/**
* Transform and store CMS entries in DB
* @param {params} params - params object
* @param {array} data - data array
* @param {function} callback - callback function
**/
function transformAndStoreData(params, data, callback) {
    let lu = Date.now();
    if (!data || data.length === 0) {
        //Add meta entry
        common.db.collection('cms_cache').insertOne({_id: `${params.qstring._id}_meta`, lu}, function() {
            callback(null, []);
        });
    }
    else {
        var transformedData = [];
        for (var i = 0; i < data.length; i++) {
            transformedData.push(Object.assign({_id: `${params.qstring._id}_${data[i].id}`, lu}, data[i].attributes));
        }
        //Delete old entries
        common.db.collection('cms_cache').deleteMany({'_id': {'$regex': `^${params.qstring._id}`}}, function(err) {
            if (err) {
                callback(err, null);
            }
            //Insert new entries
            common.db.collection('cms_cache').insert(transformedData, {ordered: false}, function(err1, entries) {
                if (err1) {
                    callback(err1, null);
                }
                if (entries) {
                    //Add meta entry
                    common.db.collection('cms_cache').insertOne({_id: `${params.qstring._id}_meta`, lu}, function() {
                        callback(null, entries.ops);
                    });
                }
            });
        });
    }
}

/**
* Get entries for a given API ID from Countly CMS
* @param {params} params - params object
**/
function syncCMSDataToDB(params) {
    fetchFromCMS(params, function(err, results) {
        if (err) {
            common.returnMessage(params, 500, 'An error occured while fetching entries from CMS: ' + err);
            return false;
        }
        if (results) {
            transformAndStoreData(params, results, function(err1, storedResults) {
                if (err1) {
                    common.returnMessage(params, 500, 'An error occured while storing entries in DB: ' + err1);
                    return false;
                }
                if (storedResults) {
                    common.returnOutput(params, storedResults);
                    return true;
                }
            });
        }
    });
}

/**
* Get entries for a given API ID
* @param {params} params - params object
* @returns {boolean} true
**/
cmsApi.getEntries = function(params) {

    if (!params.qstring._id || AVAILABLE_API_IDS.indexOf(params.qstring._id) === -1) {
        common.returnMessage(params, 400, 'Missing or incorrect API _id parameter');
        return false;
    }

    //WIP
    var query = {'$or': [ {'_id': {'$regex': `^${params.qstring._id}`}}, {'_id': `${params.qstring._id}_meta`} ]};
    if (params.qstring.query) {
        for (var key in params.qstring.query) {
            query[key] = params.qstring.query[key];
        }
    }

    common.db.collection('cms_cache').find(query).toArray(function(err, entries) {
        if (err) {
            common.returnMessage(params, 500, 'An error occured while fetching CMS entries from DB: ' + err);
            return false;
        }
        if (!entries || entries.length === 0) {
            //No entries, fetch them
            syncCMSDataToDB(params);
        }
        else {
            const updateInterval = 24 * 60 * 60 * 1000;
            const timeDifference = Date.now() - entries[0].lu;

            if (entries.length === 1 && entries[0]._id === `${params.qstring._id}_meta`) {
                //Only meta entry, check if it's time to update
                if (timeDifference >= updateInterval) {
                    syncCMSDataToDB(params);
                }
                else {
                    common.returnOutput(params, []);
                    return true;
                }
            }

            //Entries exist, check if it's time to update
            if (entries.length > 1 && timeDifference >= updateInterval) {
                syncCMSDataToDB(params);
            }
            else {
                common.returnOutput(params, entries || []);
                return true;
            }
        }

    });
};

/**
* Clear cache for all API IDs
* @param {params} params - params object
**/
cmsApi.clearCache = function(params) {
    var query = {};
    if (params.qstring._id) {
        query = {'_id': {'$regex': `^${params.qstring._id}`}};
    }
    common.db.collection('cms_cache').deleteMany(query, function(err) {
        if (err) {
            common.returnMessage(params, 500, 'An error occured while clearing CMS cache: ' + err);
        }
        common.returnMessage(params, 200, "CMS cache cleared");
    });
};

module.exports = cmsApi;