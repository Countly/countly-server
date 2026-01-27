import jQuery from 'jquery';
import { createMetricModel } from './countly.helpers.js';

const _carrierCodeMap = {"46000": "中国移动(GSM)", "46001": "中国联通(GSM)", "46002": "中国移动(TD-S)", "46003": "中国电信(CDMA)", "46005": "中国电信(CDMA)", "46006": "中国联通(WCDMA)", "46007": "中国移动(TD-S)", "46011": "中国电信(FDD-LTE)", "460 11": "中国电信(FDD-LTE)"};

/** function returns carrier code name
* @param {string} code - carrier code
* @returns {string} carrier name
*/
function getCarrierCodeName(code) {
    return _carrierCodeMap[code] ? _carrierCodeMap[code] : code;
}

/** Function gets list of carrier codes
* @param {string} value  - carrier name
* @returns{array} list if carrier id's
*/
function getCodesFromName(value) {
    var codes = [];
    if (_carrierCodeMap) {
        for (var p in _carrierCodeMap) {
            if (_carrierCodeMap[p].indexOf(value) > -1) {
                codes.push(p);
            }
        }
    }
    return codes;
}

const countlyCarrier = {
    getCarrierCodeName,
    getCodesFromName
};

createMetricModel(countlyCarrier, {name: "carriers", estOverrideMetric: "carriers"}, jQuery, getCarrierCodeName);

export default countlyCarrier;
