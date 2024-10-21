//Script to look for meaningful differences in drill vs aggregated data.
var data = {"601ba83d99111111d9": {"name": "My Good test APP", "total": 25, "bad": 0}, "6026972d182f7e014cd82114": {"name": "My BAD APP", "total": 100, "bad": 2, "events": {"BAD EVENT": {"e": "BAD EVENT", "report": {"totals": {"c": 1000}, "data": {"2024.10.2": {"c": 1000, "s": 0, "dur": -9.094947017729282e-13}}}}}}}; //output of compare_drill_aggregated.js script

//Should be adjusted based on data amount.
var total_treshold = 100; //If modulus daily value is bigger than this, it will be autputted
var daily_treshold = 50; //If for any day any value is biiger that this - it will be outputted.

for (var appid in data) {
    if (data[appid].bad > 0) {
        for (var event in data[appid].events) {
            var is_any_total_bad = false;
            for (var m in data[appid].events[event].report.totals) {
                if (data[appid].events[event].report.totals[m] > total_treshold || data[appid].events[event].report.totals[m] < -1 * total_treshold) {
                    is_any_total_bad = true;
                }
            }
            if (is_any_total_bad) {
                console.log("total difference in APP:" + appid + " for event " + event + " " + JSON.stringify(data[appid].events[event].report.totals));

                for (var date in data[appid].events[event].report.data) {
                    var is_any_bad = false;
                    for (var m2 in data[appid].events[event].report.data[date]) {
                        if (data[appid].events[event].report.data[date][m2] > daily_treshold || data[appid].events[event].report.data[date][m2] < daily_treshold * -1) {
                            is_any_bad = true;
                        }
                    }
                    if (is_any_bad) {
                        console.log("       " + date + " : " + JSON.stringify(data[appid].events[event].report.data[date]));
                    }
                }

            }
        }
    }
}