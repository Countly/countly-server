const common = require('../../../api/utils/common.js');
const utils = {};

utils.updateRuleTriggerTime = function updateRuleTriggerTime(hookID) {
    console.log("update rule trigger time,", hookID);
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


let a = `{{name}} is name. {{v}} is v, {{ e.l[1] }} is ll`;
utils.parseStringTemplate(a, {name: 2, v: 3, e: {l: [0, 1, 2]}});

module.exports = utils;
