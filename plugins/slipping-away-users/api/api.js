'use strict';

const plugin = {},
  plugins = require('../../pluginManager'),
	common = require('../../../api/utils/common.js'),
  BPromise = require('bluebird'),
  moment = require('moment'),
  periods = [7, 14, 30, 60, 90];

(function (plugin) {
  plugins.register("/o/slipping", function(ob){
    var params = ob.params;
    var app_id = params.qstring.app_id;
    var validate = ob.validateUserForDataReadAPI;
    var countlyDb = common.db;
    validate(params, function(){
      const timeList={};
      const tasks = [];
      const conditions = [];

      const now = new moment();
      now.utc().hours(0).minutes(0).seconds(0).unix();
      const dayOfYear = now.dayOfYear();

      periods.forEach((p) => {
        timeList[p] = now.dayOfYear(dayOfYear - p).utc().unix();
        conditions.push({
          ls:{$lt: timeList[p]},
        });
      });

      conditions.push({}); // find  all user count;

      conditions.forEach((condition) => {
        tasks.push(new BPromise(function(resolve, reject) {
        countlyDb.collection('app_users' + app_id).find(condition)
          .count(function(err,count){
            if(err){
              return reject(err);
            }
            return resolve(count);
          });
        }));
      });

      BPromise.all(tasks).spread(function() {
        const result = [];
        periods.forEach((p,index) => {
          const percentage = (arguments[index] / arguments[periods.length]) * 100;
        result.push({
          period: p,
          count: arguments[index],
          percentage: `${ percentage.toFixed(2) }`,
          timeStamp: timeList[p],
        })
      });
        common.returnOutput(params, result);
      });


    });
    return true;
  });

}(plugin));

module.exports = plugin;