const moment = require("moment");
const stats = require('../api/parts/stats.js');
const pluginManager = require('../../pluginManager.js');

var myArgs = process.argv.slice(2);
if (myArgs[0] === "help") {
    return;
}

var type = myArgs[0] || "max";
pluginManager.dbConnection().then(async(db) => {
    var utcMoment = moment.utc();
    var curMonth = utcMoment.format("YYYY") + ":" + utcMoment.format("M");

    try {
        const _punchCard = await stats.punchCard(db, {_id: {$regex: ".*_" + curMonth}});
        var res = {};
        for (let i = 0; i < _punchCard.length; i++) {
            for (let key in _punchCard[i]) {
                res[key] = _punchCard[i][key];
            }
        }
        console.table(res[type + "Value"]);
    }
    catch (ex) {
        console.log(ex);
    }
    db.close();
});