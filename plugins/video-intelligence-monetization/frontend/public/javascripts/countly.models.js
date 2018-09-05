(function() {
    window.countlyMonetization = window.countlyMonetization || {};
    var eventMappings = {
        'VI_AdClick': {
            enabled: true,
            localize: 'monetization.adclick',
            color: countlyCommon.GRAPH_COLORS[0]
        },
        'VI_AdStart': {
            enabled: true,
            localize: 'monetization.adstart',
            color: countlyCommon.GRAPH_COLORS[1]
        },
        'VI_AdComplete': {
            enabled: true,
            localize: 'monetization.adcompleted',
            color: countlyCommon.GRAPH_COLORS[2]
        }
    };

    var _data = {};

    var getPeriodArray = function() {
        var periodArray = [];
        var periodObject = countlyCommon.getPeriodObj();

        if (parseInt(periodObject.numberOfDays) === 1 || periodObject.currentPeriodArr === undefined) {
            for (var i = periodObject.periodMin; i <= periodObject.periodMax; i++) {
                periodArray.push(periodObject.activePeriod + '.' + i);
            }
        }
        else {
            periodArray = periodObject.currentPeriodArr;
        }

        return periodArray;
    };

    countlyMonetization.initialize = function() {
        return $.when(this.requestMetricData());
    };

    countlyMonetization.setEventStatus = function(id, enabled) {
        eventMappings[id].enabled = enabled;
    };

    countlyMonetization.tryDisableEvent = function(id) {
        var count = 0;
        for (var key in eventMappings) {
            if (eventMappings[key].enabled) {
                count++;
            }
            if (count > 1) {
                countlyMonetization.setEventStatus(id, false);
                return true; //means; it is disabled
            }
        }
        return false;
    };

    countlyMonetization.enableEvent = function(id) {
        countlyMonetization.setEventStatus(id, true);
    };

    countlyMonetization.getEnabledEvents = function() {
        var enabled = [];
        for (var key in eventMappings) {
            if (eventMappings[key].enabled) {
                enabled.push(key);
            }
        }
        return enabled;
    };

    countlyMonetization.requestMetricData = function() {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o",
            data: {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'monetization',
                period: periodString,
            },
            success: function(json) {
                var eventKeys = Object.keys(eventMappings);
                var chartDP = countlyMonetization.convertToChartData(eventKeys, json);
                var tableData = countlyMonetization.convertToTableData(eventKeys, json);
                var bigNumbersData = countlyMonetization.convertToBigNumbersData(eventKeys, json);
                _data = {
                    tableData: tableData,
                    chartDP: chartDP,
                    bigNumbersData: bigNumbersData
                };
            }
        });
    };
    countlyMonetization.getColumns = function() {
        return eventMappings;
    };
    countlyMonetization.convertToBigNumbersData = function(keys, data) {
        var container = [];
        keys.forEach(function(key) {
            var overview = data[key].data.count;
            container.push({
                "title": jQuery.i18n.map[eventMappings[key].localize],
                "id": key,
                "change": overview.change,
                "prev-total": overview["prev-total"],
                "total": overview.total,
                "trend": overview.trend,
                "selected": eventMappings[key].enabled ? "selected" : ""
            });
        });
        return container;
    };
    countlyMonetization.convertToChartData = function(keys, data) {
        var lines = {};
        keys.forEach(function(key) {
            var mp = eventMappings[key];
            var obj = {
                label: jQuery.i18n.map[mp.localize],
                data: [],
                color: mp.color
            };
            var i = 0;
            data[key].data.count.sparkline.forEach(function(item) {
                obj.data.push([i++, item]);
            });
            lines[key] = obj;
        });
        return lines;
    };
    countlyMonetization.convertToTableData = function(keys, data) {
        if (!keys[0] || !data[keys[0]]) {
            return [];
        }

        var points = [];
        var period = countlyCommon.getPeriod();
        var periodObj = countlyCommon.getPeriodObj();
        if (periodObj.numberOfDays === 1) {
            if (period === "hour") {
                var dateFormat = 'HH:00';
            }
            else {
                var dateFormat = 'D MMM, HH:00';
            }
        }
        else if (period !== "month") {
            if (period === "60days" || period === "30days") {
                var dateFormat = 'D MMM, YYYY';
            }
            else {
                var dateFormat = 'D MMM';
            }
        }
        else {
            var dateFormat = 'MMM';
        }
        var periodArr = getPeriodArray();
        periodArr.forEach(function(date) {
            var empty = {
                date: moment(date, "YYYY.M.D.H").format(dateFormat)
            };
            keys.forEach(function(key) {
                empty[key] = 0;
            });
            points.push(empty);
        });
        var index = 0;
        points.forEach(function(point) {
            keys.forEach(function(key) {
                var overview = data[key].data.count;
                point[key] = overview.sparkline[index];
            });
            index++;
        });
        return points;
    };
    countlyMonetization.getMetricData = function() {
        return _data;
    };
})();