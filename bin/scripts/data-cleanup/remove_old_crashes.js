/*
 *  Generates a list of crashgroup ids that is older than the specified timestamp for each Countly app
 *  If DRY_RUN is false, will also delete those crashgroups and their related documents
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node remove_old_crashes.js
 */

const moment = require('moment-timezone');
const request = require('countly-request');

const pluginManager = require('../../../plugins/pluginManager.js');

// API key here with permission to delete crashgroups, crashes, crashusers
const API_KEY = '';
// if true, nothing will be deleted
const DRY_RUN = true;
// countly instance public url, something like 'https://name.count.ly'
const SERVER_URL = '';

// format 'YYYY-MM-DD', crashes with last occurence older than this will be removed
const LAST_TIMESTAMP = '';

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

pluginManager.dbConnection().then(async(db) => {
    const requestOptions = [];

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
    const apps = await db.collection('apps').find().toArray();

    for (let idx = 0; idx < apps.length; idx += 1) {
        const app_id = apps[idx]._id;
        const crashgroups = await db.collection(`app_crashgroups${app_id}`)
            .find({ lastTs: { $lt: lastUnixTimestamp } }, { _id: 1 })
            .toArray();

        if (crashgroups.length > 0) {
            const crashgroupIds = crashgroups.map((crash) => crash._id);

            requestOptions.push({
                uri: urlObj.href,
                method: 'POST',
                json: {
                    api_key: API_KEY,
                    app_id,
                    args: {
                        crashes: crashgroupIds,
                    },
                },
            });
        }
    }

    if (DRY_RUN) {
        requestOptions.forEach((option) => {
            console.log(JSON.stringify(option));
        });
    }
    else {
        console.log('Sending deletion requests');

        for (let idx = 0; idx < requestOptions.length; idx += 1) {
            await new Promise((resolve) => {
                request(requestOptions[idx], (err, response, body) => {
                    if (err) {
                        console.warn('Request failed ', JSON.stringify(requestOptions[idx].json.app_id), err);
                    }
                    else {
                        console.warn('Request finished ', JSON.stringify(requestOptions[idx].json.app_id), body);
                    }
                    resolve();
                });
            });
        }
    }

    db.close();
});
