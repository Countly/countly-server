var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    countlyDeviceList = require('../../frontend/express/public/javascripts/countly/countly.device.list.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle devices data
* @module "api/lib/countly.devices"
* @extends module:api/lib/countly.model~countlyMetric
*/
var countlyDevices= countlyModel.create(function (shortName) {;
	if(countlyDeviceList && countlyDeviceList[shortName])
		return countlyDeviceList[shortName];
    return shortName;
});
module.exports = countlyDevices;