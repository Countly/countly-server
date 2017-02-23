var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle event data
* @module api/lib/countly_event
* @extends module:api/lib/countly_model
*/
var countlyEvent = countlyModel.create();
countlyEvent.setMetrics(["c","s","dur"]);
countlyEvent.setUniqueMetrics([]);
module.exports = countlyEvent;