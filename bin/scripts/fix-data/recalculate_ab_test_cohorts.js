/*
 *  Sends recalculate request for all ab testing experiment variant cohorts
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node recalculate_ab_test_cohorts.js
 */

// API key here with permission to update cohorts
const API_KEY = '';
// Countly app id, if not specified will do nothing
const APP_ID = '';
// ab test experiment id, will do nothing if not specified
const EXPERIMENT_ID = '';
// countly instance public url, something like 'https://name.count.ly'
const SERVER_URL = '';

const pluginManager = require('../../../plugins/pluginManager.js');
const request = require('countly-request')(pluginManager.getConfig('security'));

if (API_KEY.length === 0) {
    console.warn('Please provide an API_KEY');
    process.exit(1);
}

pluginManager.dbConnection('countly_out').then(async(db) => {
    let urlObj = {};
    try {
        urlObj = new URL(SERVER_URL);
    }
    catch (err) {
        urlObj = new URL((process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost"));
    }
    urlObj.pathname = 'i/cohorts/recalculate';
    urlObj.searchParams.append('api_key', API_KEY);
    urlObj.searchParams.append('app_id', APP_ID);

    console.log(`Finding ab test experiment ${EXPERIMENT_ID} in app ${APP_ID}`);

    const experimentCollectionName = `ab_testing_experiments${APP_ID}`;
    const experiment = await db.collection(experimentCollectionName).findOne({ _id: db.ObjectID(EXPERIMENT_ID) });

    if (experiment?.variants?.length > 0) {
        for (let varIdx = 0; varIdx < experiment.variants.length; varIdx += 1) {
            const variant = experiment.variants[varIdx];

            if (variant?.cohorts && Object.keys(variant.cohorts).length > 0) {
                for (let cohIdx = 0; cohIdx < Object.keys(variant.cohorts).length; cohIdx += 1) {
                    const cohortId = variant.cohorts[Object.keys(variant.cohorts)[cohIdx]];
                    console.log(`Sending recalculate request for variant ${variant.name}, cohort ${cohortId}`);

                    urlObj.searchParams.delete('cohort_id');
                    urlObj.searchParams.append('cohort_id', cohortId);

                    await new Promise((resolve) => {
                        request.get(urlObj.href, (err, _, body) => {
                            if (err) {
                                console.warn('Request failed ', JSON.stringify(cohortId), err);
                            }
                            else {
                                console.log('Request finished ', JSON.stringify(cohortId), body);
                            }
                            resolve();
                        });
                    });
                }
            }
        }
    }
    else {
        console.warn(`Experiments ${EXPERIMENT_ID} not found in app ${APP_ID}`);
    }

    db.close();
});
