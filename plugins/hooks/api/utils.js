const common = require('../../../api/utils/common.js');
const utils = {};

utils.updateRuleTriggerTime = function updateRuleTriggerTime(hookID) {
    //console.log("update rule trigger time,", hookID);
    if (!hookID) {
        return;
    }

    const updateOperation = {$set: {lastTriggerTimestamp: new Date().getTime()}, $inc: { triggerCount: 1}};

    common.writeBatcher.add("hooks", hookID, updateOperation);
};

utils.addErrorRecord = function addErrorRecord(hookId, error, params, effectStep, _originalInput) {
    if (!hookId) {
        return;
    }
    let errorString = error;
    if (typeof error === 'object') {
        errorString = `message:${error.message}\n\nstack: ${JSON.stringify(error.stack)}`;
    }
    const updateOperation = {
        $push: {
            error_logs: {
                $each: [ {e: errorString, timestamp: new Date().getTime(), params, effectStep, _originalInput} ],
                $slice: -10
            }
        }
    };
    common.writeBatcher.add("hooks", hookId, updateOperation);
};


utils.parseStringTemplate = function(str, data, httpMethod) {
    const parseData = function(obj) {
        let d = "";
        if (typeof obj === 'object') {
            if (common.dbext.ObjectId.isValid(obj)) {
                d = obj + "";
            }
            else {
                d = JSON.stringify(obj);
            }
        }
        else {
            d = obj;
        }
        if (httpMethod === 'get') {
            return encodeURIComponent(d);
        }
        return d;
    };

    return str.replace(/\{\{(.*?)}\}/g, (sub, path) => {
        let obj = null;
        try {
            path = path.trim();
            path = path.replace(/\[(\w+)\]/g, '.$1');

            const props = path.split('.');
            obj = data;
            if (props.length === 1 && props[0] === 'payload_json') {
                return parseData(obj);
            }

            if (props.length === 1 && props[0] === 'payload_string') {
                let jsonStr = parseData(obj);
                return jsonStr.replace(/"|\\"/g, '\\"');
            }
            props.forEach(prop => {
                obj = (obj && obj[prop]) || undefined;
            });
        }
        catch (e) {
            console.log(e);
        }
        if (obj) {
            return parseData(obj);
        }
        else {
            return sub;
        }
    });
};



// Add these functions to your existing utils.js

/**
 * Check if rate limit is reached for a rule
 * @param {Object} rule - hook rule
 * @returns {Boolean} true if rate limit reached
 */
utils.checkRateLimitReached = function(rule) {
    const plugins = require('../../pluginManager.ts');

    if (plugins.getConfig("hooks").requestLimit === 0) {
        return false;
    }

    let requestCount = global.triggerRequestCount.find(item => {
        return item.ruleId.toString() === rule._id.toString();
    });

    if (!requestCount) {
        utils.addInitialRequestCounter(rule);
        return false;
    }

    return utils.incrementRequestCounter(rule);
};

/**
 * Add initial request counter for a rule
 * @param {Object} rule - hook rule
 */
utils.addInitialRequestCounter = function(rule) {
    const plugins = require('../../pluginManager.ts');
    let startTime = Date.now();
    let endTime = startTime + plugins.getConfig("hooks").timeWindowForRequestLimit;
    global.triggerRequestCount.push({
        ruleId: rule._id.toString(),
        startTime: startTime,
        endTime: endTime,
        counter: 1
    });
};

/**
 * Increment request counter for a rule
 * @param {Object} rule - hook rule
 * @returns {Boolean} true if limit exceeded
 */
utils.incrementRequestCounter = function(rule) {
    const plugins = require('../../pluginManager.ts');
    const currentTimestamp = Date.now();

    // Delete records which are not in time frame
    global.triggerRequestCount = global.triggerRequestCount.filter(item => {
        return currentTimestamp >= item.startTime && currentTimestamp <= item.endTime;
    });

    let counterIndex = global.triggerRequestCount.findIndex(item => {
        return item.ruleId.toString() === rule._id.toString();
    });

    if (counterIndex < 0) {
        return false;
    }

    global.triggerRequestCount[counterIndex].counter++;

    return global.triggerRequestCount[counterIndex].counter > plugins.getConfig("hooks").requestLimit;
};


let a = `{{name}} is name. {{v}} is v, {{ e.l[1] }} is ll`;
utils.parseStringTemplate(a, {name: 2, v: 3, e: {l: [0, 1, 2]}});

module.exports = utils;
