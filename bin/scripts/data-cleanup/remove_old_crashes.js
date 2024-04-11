/*
 *  Generates a list of crashgroup ids that is older than the specified timestamp for each Countly app
 *  If DRY_RUN is false, will also delete those crashgroups and their related documents
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node remove_old_crashes.js
 */

// API key here with permission to delete crashgroups, crashes, crashusers
const API_KEY = '';
// API key here with permission to delete crashgroups, crashes, crashusers
const APP_ID = '';
// if true, nothing will be deleted
const DRY_RUN = true;
// countly instance public url, something like 'https://name.count.ly'
const SERVER_URL = '';
// the limit of crashgroups to delete per Countly app
const BATCH_LIMIT = 1000;
// format 'YYYY-MM-DD', crashes with last occurence older than this will be removed
const LAST_TIMESTAMP = '';

const moment = require('moment-timezone');
const _ = require('underscore');

const request = require('countly-request');
const pluginManager = require('../../../plugins/pluginManager.js');

if (API_KEY.length === 0) {
    console.warn('Please provide an API_KEY');
    process.exit(1);
}

try {
    moment(LAST_TIMESTAMP);

    if (LAST_TIMESTAMP.length === 0) {
        console.warn('Please provide LAST_TIMESTAMP in this format \'YYYY-MM-DD\'');
        process.exit(1);
    }
}
catch (err) {
    console.warn('Please provide LAST_TIMESTAMP in this format \'YYYY-MM-DD\'');
    process.exit(1);
}

async function generateRequestOptions(db, {
    api_key,
    apps,
    batchCount,
    batchLimit,
    lastUnixTimestamp,
    uri,
}) {
    const requestOptions = [];

    for (let idx = 0; idx < apps.length; idx += 1) {
        const app_id = `${apps[idx]._id}`;
        const crashgroups = await db.collection(`app_crashgroups${app_id}`)
            .find({ lastTs: { $lt: lastUnixTimestamp } }, { _id: 1 })
            .skip(batchLimit * batchCount)
            .limit(batchLimit)
            .toArray();

        if (crashgroups.length > 0) {
            const crashgroupIds = crashgroups.map((crashgroup) => crashgroup._id);

            requestOptions.push({
                uri,
                method: 'POST',
                json: {
                    api_key,
                    app_id,
                    args: {
                        crashes: crashgroupIds,
                    },
                },
            });
        }
    }

    return requestOptions;
}

function urlFromRequestOption(requestOption) {
    try {
        const urlObj = new URL(requestOption.uri);

        for (let key in requestOption.json) {
            const value = requestOption.json[key];
            urlObj.searchParams.append(key, _.isObject(value) ? JSON.stringify(value) : value);
        }

        return urlObj.href;
    }
    catch (err) {
        return JSON.stringify(requestOption);
    }
}

pluginManager.dbConnection().then(async(db) => {
    let requestOptions = [];
    let batchCount = 0;

    let urlObj = {};
    try {
        urlObj = new URL(SERVER_URL);
    }
    catch (err) {
        urlObj = new URL((process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost"));
    }
    urlObj.pathname = 'i/crashes/delete';

    const lastUnixTimestamp = moment(LAST_TIMESTAMP).unix();

    console.log(`Finding crashgroups older than ${LAST_TIMESTAMP}`);

    const apps = (APP_ID.length) ? [{_id: APP_ID}] : await db.collection('apps').find({}, { _id: 1 }).toArray();

    requestOptions = requestOptions.concat(await generateRequestOptions(db, {
        api_key: API_KEY,
        apps,
        batchCount,
        batchLimit: BATCH_LIMIT,
        lastUnixTimestamp,
        uri: urlObj.href,
    }));

    while (requestOptions.length > 0) {
        const requestOption = requestOptions.shift();

        if (DRY_RUN) {
            console.log(urlFromRequestOption(requestOption));
        }
        else {
            console.log('Sending deletion requests');

            await new Promise((resolve) => {
                request(requestOption, (err, response, body) => {
                    if (err) {
                        console.warn('Request failed ', JSON.stringify(requestOption.json.app_id), err);
                    }
                    else {
                        console.warn('Request finished ', JSON.stringify(requestOption.json.app_id), body);
                    }
                    resolve();
                });
            });
        }

        if (requestOptions.length === 0) {
            if (DRY_RUN) {
                batchCount += 1;
            }

            requestOptions = requestOptions.concat(await generateRequestOptions(db, {
                api_key: API_KEY,
                apps,
                batchCount,
                batchLimit: BATCH_LIMIT,
                lastUnixTimestamp,
                uri: urlObj.href,
            }));
        }
    }

    db.close();
});