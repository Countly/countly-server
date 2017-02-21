var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

var countlyEvent = countlyModel.create();
countlyEvent.setMetrics(["c","s","dur"]);
countlyEvent.setUniqueMetrics([]);
module.exports = countlyEvent;