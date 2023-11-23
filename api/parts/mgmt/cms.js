/**
* This module is meant for handling CMS API requests.
* @module api/parts/mgmt/cms
*/

/** @lends module:api/parts/mgmt/cms */
var cmsApi = {},
    common = require('./../../utils/common.js'),
    config = require('./../../config.js');

var current_processes = {},
    log = common.log('core:cms');


const AVAILABLE_API_IDS = ["server-guides", "server-consents", "server-intro-video", "server-quick-start", "server-guide-config"],
    UPDATE_INTERVAL = 2, // hours
    TOKEN = "17fa74a2b4b1524e57e8790250f89f44f364fe567f13f4dbef02ef583e70dcdb700f87a6122212bb01ca6a14a8d4b85dc314296f71681988993c013ed2f6305b57b251af723830ea2aa180fc689af1052dd74bc3f4b9b35e5674d4214a8c79695face42057424f0494631679922a3bdaeb780b522bb025dfaea8d7d56a857dba",
    BASE_URL = "https://cms.count.ly/api/";

/**
* Get entries for a given API ID from Countly CMS
* @param {params} params - params object
* @param {function} callback - callback function
**/
function fetchFromCMS(params, callback) {
    const url = BASE_URL + params.qstring._id;
    const pageSize = 100;
    var results = [];

    /**
    * Get a single page of data
    * @param {number} pageNumber - page number
    **/
    function fetchPage(pageNumber) {
        var pageUrl = `${url}?pagination[page]=${pageNumber}&pagination[pageSize]=${pageSize}`;

        if (params.qstring.populate) {
            pageUrl += `&populate=*`;
        }

        fetch(pageUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + TOKEN
            }
        })
            .then(response => response.json())
            .then(responseData => {
                const {data, meta} = responseData;
                if (data && (data.length > 0 || data.id)) {
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
                log.e(error);
                callback(error, null);
            });
    }

    fetchPage(1);
}

/**
* Transform and store CMS entries in DB
* @param {params} params - params object
* @param {object} err - error object
* @param {array} data - data array
* @param {function} callback - callback function
**/
function transformAndStoreData(params, err, data, callback) {
    const lu = Date.now();

    if (err || !data || data.length === 0) {
        //Add meta entry
        common.db.collection('cms_cache').updateOne({_id: `${params.qstring._id}_meta`}, { $set: {_id: `${params.qstring._id}_meta`, lu, error: !!err}}, { upsert: true }, function() {
            callback(null);
        });
    }
    else {
        var transformedData = [];
        for (let i = 0; i < data.length; i++) {
            transformedData.push(Object.assign({_id: `${params.qstring._id}_${data[i].id}`, lu}, data[i].attributes));
        }

        var bulk = common.db.collection("cms_cache").initializeUnorderedBulkOp();
        for (let i = 0; i < transformedData.length; i++) {
            bulk.find({
                "_id": transformedData[i]._id
            }).upsert().updateOne({
                "$set": transformedData[i]
            });
        }

        // Add meta entry
        bulk.find({
            "_id": `${params.qstring._id}_meta`
        }).upsert().replaceOne({
            "_id": `${params.qstring._id}_meta`,
            "lu": lu
        });

        // Execute bulk operations to update/insert new entries
        bulk.execute(function(err1) {
            if (err1) {
                callback(err1);
            }

            // Delete old entries
            common.db.collection('cms_cache').deleteMany({'_id': {'$regex': `^${params.qstring._id}`}, 'lu': {'$lt': lu}}, function(err2) {
                if (err2) {
                    callback(err2);
                }
                callback(null);
            });
        });
    }
}

/**
* Get entries for a given API ID from Countly CMS
* @param {params} params - params object
**/
function syncCMSDataToDB(params) {
    // Check if there is a process running
    if (!current_processes.id || (current_processes.id && current_processes.id >= new Date(Date.now() - 5 * 60 * 1000))) {
        // Set current process
        current_processes.id = Date.now();
        fetchFromCMS(params, function(err, results) {
            transformAndStoreData(params, err, results, function(err1) {
                delete current_processes.id;
                if (err1) {
                    log.e('An error occured while storing entries in DB: ' + err1);
                }
            });
        });
    }
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

    var query = { '_id': { '$regex': `^${params.qstring._id}` } };

    try {
        params.qstring.query = JSON.parse(params.qstring.query);
    }
    catch (ex) {
        params.qstring.query = null;
    }

    if (params.qstring.query) {
        query = {
            $and: [
                { '_id': { '$regex': `^${params.qstring._id}` } },
                {
                    $or: [
                        { '_id': `${params.qstring._id}_meta` },
                    ]
                }
            ]
        };
        for (var cond in params.qstring.query) {
            var condition = {};
            condition[cond] = params.qstring.query[cond];
            query.$and[1].$or.push(condition);
        }
        params.qstring.query = query;
    }

    common.db.collection('cms_cache').find(query).toArray(function(err, entries) {
        if (err) {
            common.returnMessage(params, 500, 'An error occured while fetching CMS entries from DB: ' + err);
            return false;
        }
        let results = {data: entries || []};

        if (!entries || entries.length === 0) {
            // Force update
            results.updating = true;
            syncCMSDataToDB(params);
        }
        else {
            const updateInterval = UPDATE_INTERVAL * 60 * 60 * 1000;
            const timeDifference = Date.now() - entries[0].lu;

            // Update if the update interval has passed
            if (timeDifference >= updateInterval) {
                results.updating = true;
                syncCMSDataToDB(params);
            }
            // Update if the refresh flag is set and the meta entry does not contain an error
            else if (params.qstring.refresh) {
                let metaEntry = entries.find((item) => item._id.endsWith('meta'));
                if (metaEntry && !metaEntry.error) {
                    results.updating = true;
                    syncCMSDataToDB(params);
                }
            }
        }

        // Remove meta entry
        results.data = results.data.filter((item) => !item._id.endsWith('meta'));

        // Special case for server-guide-config
        if (params.qstring._id === 'server-guide-config' && results.data && results.data[0]) {
            results.data[0].enableGuides = results.data[0].enableGuides || config.enableGuides;
        }

        common.returnOutput(params, results);
        return true;
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
        else {
            common.returnMessage(params, 200, "CMS cache cleared");
        }
    });
};

module.exports = cmsApi;