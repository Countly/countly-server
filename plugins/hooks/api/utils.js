const common = require('../../../api/utils/common.js');
const utils = {};

utils.updateRuleTriggerTime = function updateRuleTriggerTime(hookID) {
    const db = common.db;
    console.log("update rule trigger time,", hookID);

    db && db.collection('hooks').findAndModify(
        {_id: common.db.ObjectID(hookID)},
        {},
        {$set:{lastTriggerTimestamp: new Date().getTime()}, $inc: { triggerCount: 1}},
        function(err, result){console.log(err, result, "update triggerCountresult")}
    )
}

module.exports = utils;
