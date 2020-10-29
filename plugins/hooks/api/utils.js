const common = require('../../../api/utils/common.js');
const utils = {};

utils.updateRuleTriggerTime = function updateRuleTriggerTime(hookID) {
    const db = common.db;
    console.log("update rule trigger time,", hookID);

    db && db.collection('hooks').findAndModify(
        {_id: common.db.ObjectID(hookID)},
        {},
        {$set: {lastTriggerTimestamp: new Date().getTime()}, $inc: { triggerCount: 1}},
        function(err, result) {
            console.log(err, result, "update triggerCountresult");
        }
    );
};


utils.visitObjectByPath = function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        }
        else {
            return;
        }
    }
    return o;
};

utils.parseStringTemplate = function(str, data) {
    const parseData = function (obj) {
        if (typeof obj === 'object') {
            return JSON.stringify(obj);
        }
        return obj;
    }
    
    return str.replace(/\{\{(.*?)}\}/g, (sub, path) => {
        path = path.trim();
        path = path.replace(/\[(\w+)\]/g, '.$1');

        const props = path.split('.');
        let obj = data;
        if (props.length === 1 && props[0] === 'payload') {
            return parseData(obj);
        }
        
        if (props.length === 1 && props[0] === 'payload_string') {
            jsonStr = parseData(obj);
            return jsonStr.replace(/"|\\"/g, '\\"');
        }
        props.forEach(prop => {
            obj = obj[prop] || undefined;
        });
        return parseData(obj);
    });
};


let a = `{{name}} is name. {{v}} is v, {{ e.l[1] }} is ll`;
utils.parseStringTemplate(a, {name: 2, v: 3, e: {l: [0, 1, 2]}});

module.exports = utils;
