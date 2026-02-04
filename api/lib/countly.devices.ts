/**
 * This module defines default model to handle devices data
 * @module "api/lib/countly.devices"
 * @extends module:api/lib/countly.model~countlyMetric
 */

import type { CountlyMetric } from './countly.model.js';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const countlyModel = require('./countly.model.js');
const countlyDeviceList = require('../../frontend/express/public/javascripts/countly/countly.device.list.js');

/**
 * Device list dictionary mapping short names to full names
 */
interface DeviceList {
    [shortName: string]: string;
}

/**
 * Model creator
 * @returns new model
 */
function create(): CountlyMetric {
    const deviceList = countlyDeviceList as DeviceList;

    const countlyDevices = countlyModel.create(function(shortName: string): string {
        if (deviceList && deviceList[shortName]) {
            return deviceList[shortName];
        }
        return shortName;
    }) as CountlyMetric;

    return countlyDevices;
}

export default create;
export { create };
