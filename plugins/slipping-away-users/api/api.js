'use strict';

const plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common.js'),
    BPromise = require('bluebird'),
    moment = require('moment-timezone'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'slipping_away_users';

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

    plugins.register("/o/slipping", function(ob) {
        const params = ob.params;
        const app_id = params.qstring.app_id;
        let user_query = params.qstring.query;
        if (user_query) {
            try {
                user_query = JSON.parse(user_query);
            }
            catch (e) {
                console.log(e);
            }
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
                    countlyDb.collection('app_users' + app_id).find(condition)
                        .count(function(err, count) {
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