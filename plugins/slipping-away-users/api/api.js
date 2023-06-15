'use strict';

const plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common.js'),
    BPromise = require('bluebird'),
    moment = require('moment-timezone'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'slipping_away_users';

var cohorts;
try {
    cohorts = require("../../cohorts/api/parts/cohorts.js");
}
catch (ex) {
    cohorts = null;
}

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.setConfigs("slipping-away-users", {
        p1: 7,
        p2: 14,
        p3: 30,
        p4: 60,
        p5: 90,
    });

    /**
     * @api {get} /o/slipping Get slipping away data 
     * @apiName  getData
     * @apiGroup slipping
     *
     * @apiDescription get user count and percentage sliping away from 
     *  7, 14, 30, 60, 90 days ago. 
     * @apiQuery {string} method set "slipping" to get slipping away data 
     * @apiQuery {String} query JSON string of user filter query on DB  
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [
     *     {
     *       "period": 7,
     *       "count": 0,
     *       "percentage": "0.00",
     *       "timeStamp": 1649816027
     *     },
     *     {
     *       "period": 14,
     *       "count": 0,
     *       "percentage": "0.00",
     *       "timeStamp": 1649211227
     *     },
     *     {
     *       "period": 30,
     *       "count": 0,
     *       "percentage": "0.00",
     *       "timeStamp": 1647828827
     *     },
     *     {
     *       "period": 60,
     *       "count": 0,
     *       "percentage": "0.00",
     *       "timeStamp": 1645236827
     *     },
     *     {
     *       "period": 90,
     *       "count": 0,
     *       "percentage": "0.00",
     *       "timeStamp": 1642644827
     *     }
     *   ]
     */
    plugins.register("/o/slipping", function(ob) {
        const params = ob.params;
        const app_id = params.qstring.app_id;
        let user_query = params.qstring.query || {};
        if (typeof user_query === "string") {
            try {
                user_query = JSON.parse(user_query);
            }
            catch (e) {
                console.log(e);
            }
        }

        if (cohorts) {
            var cohortQuery = cohorts.preprocessQuery(user_query);
            user_query = Object.assign(user_query, cohortQuery);
        }

        const countlyDb = common.db;
        const sp = plugins.getConfig("slipping-away-users");
        const periods = [sp.p1, sp.p2, sp.p3, sp.p4, sp.p5];
        validateRead(params, FEATURE_NAME, function() {
            const timeList = {};
            const tasks = [];
            const conditions = [];

            periods.forEach((p) => {
                timeList[p] = moment().subtract(p, 'days').utc().unix();
                let c = {
                    lac: {$lt: timeList[p]},
                };
                if (user_query) {
                    c = Object.assign(c, user_query);
                }
                conditions.push(c);
            });

            conditions.push({}); // find  all user count;

            conditions.forEach((condition) => {
                tasks.push(new BPromise(function(resolve, reject) {
                    countlyDb.collection('app_users' + app_id).count(condition, function(err, count) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(count);
                    });
                }));
            });

            BPromise.all(tasks).spread(function() {
                const result = [];
                periods.forEach((p, index) => {
                    let percentage = (arguments[index] / arguments[periods.length]) * 100;
                    percentage = isNaN(percentage) ? 0 : percentage;
                    result.push({
                        period: p,
                        count: arguments[index],
                        percentage: `${ percentage.toFixed(2) }`,
                        timeStamp: timeList[p],
                    });
                });
                common.returnOutput(params, result);
            });


        });
        return true;
    });

}());
