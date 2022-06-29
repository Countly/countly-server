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
    var dateObj = {};
    dateObj[curMonth] = {"full": true};

    try {
        const _punchCard = await stats.punchCard(db, {_id: {$regex: ".*_" + curMonth}}, {periodObj: {}, dateObj: dateObj});
        var res = {};
        console.log(JSON.stringify(_punchCard));
        for (let i = 0; i < _punchCard.data.length; i++) {
            for (let key in _punchCard.data[i]) {
                res[key] = _punchCard.data[i][key];
            }
        }
        console.table(res[type + "Value"]);
    }
    catch (ex) {
        console.log(ex);
    }
    db.close();
});