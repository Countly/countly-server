/*global $, jQuery, countlyCommon, moment*/

(function(countlyMonetization) {
    /**
    * Stores the events to be shown. It contains a structure for each event type.
    * If 'enabled' is false for an event, it will be hidden only in chart.
    * 'localize' property is basically a reference to the human-readable name of the
    * event type
    * @type {Object}
    */
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

    /**
    * API data object. Only the countlyMonetization model module maintains
    * (fetches, stores and manipulates) it. To prevent any inconsistencies,
    * it shouldn't be modified outside of this module.
    * Currently selected period
    * @property {array} bigNumbersData - Used by big numbers, contains an item for each event type
    [
      {title: "Ad Clicked", id: "VI_AdClick", change: "NA", prev-total: 0, total: 0, ...},
      {title: "Ad Started", ...},
      {title: "Ad Completed", ...}
    ]
    * @property {Object} chartDP - Used by chart, contains a key-value pair for each event type
    {
       VI_AdClick : {label: "Ad Clicked", data: Array(LengthOfPeriod), color: ...},
       VI_AdStart : {...},
       VI_AdComplete : {...}
    }
    * @property {array} tableData - Used by table, contains a 'row' for each point in the given period
    [
      {date: "1 Jan, 1970", VI_AdClick: 1, VI_AdStart: 2, VI_AdComplete: 3},
      {date: "2 Jan, 1970", VI_AdClick: 1, VI_AdStart: 2, VI_AdComplete: 3},
      ...
    ]
    * @type {Object}
    */
    var _data = {};

    var getPeriodArray = function() {
        var periodArray = [];
        var periodObject = countlyCommon.getPeriodObj();

        if (parseInt(periodObject.numberOfDays) === 1 || periodObject.currentPeriodArr === undefined || (periodObject.activePeriod !== undefined && typeof periodObject.activePeriod !== 'string')) {
            for (var i = periodObject.periodMin; i <= periodObject.periodMax; i++) {
                periodArray.push(periodObject.activePeriod + '.' + i);
            }
        }
        else {
            periodArray = periodObject.currentPeriodArr;
        }

        return periodArray;
    };

    /**
    * Makes the first request and returns Promise
    * @returns {Promise} Returns the data request promise
    **/
    countlyMonetization.initialize = function() {
        return $.when(this.requestMetricData());
    };

    /**
    *  Events can be set enabled/disabled by view. This function sets the status.
    *  If you don't have an enforcing reason, please do NOT use this directly.
    * Instead, use 'enableEvent' to enable an event, and use 'tryDisableEvent' to
    * disable one.
    * @param {string} id - Event name
    * @param {boolean} enabled - Status to be set
    * @returns {undefined} Returns nothing
    **/
    countlyMonetization.setEventStatus = function(id, enabled) {
        eventMappings[id].enabled = enabled;
    };

    /**
    * Tries to disable an event 'safely'. 'Safely' means that, it is guaranteed
    * that there will be at least 1 enabled event in list.
    * @param {string} id - Event name
    * @returns {boolean} Returns the result of request.
    **/
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

    /**
    * Enables an event.
    * @param {string} id - Event name
    * @returns {undefined} Returns nothing
    **/
    countlyMonetization.enableEvent = function(id) {
        countlyMonetization.setEventStatus(id, true);
    };

    /**
    * Creates an array of names of enabled events.
    * @returns {string[]} Returns names array.
    **/
    countlyMonetization.getEnabledEvents = function() {
        var enabled = [];
        for (var key in eventMappings) {
            if (eventMappings[key].enabled) {
                enabled.push(key);
            }
        }
        return enabled;
    };

    /**
    * Returns the current state of registered events. It immediately processes the data,
    * converts it into renderable forms of each UI component.
    * @returns {Object} Returns eventMappings object.
    **/
    countlyMonetization.requestMetricData = function() {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o",
            data: {
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

    /**
    * Returns the current state of registered events.
    * @returns {Object} Returns eventMappings object.
    **/
    countlyMonetization.getColumns = function() {
        return eventMappings;
    };

    /**
    * This function is intended to be used internally. Called by
    * countlyMonetization.requestMetricData when data successfully arrives.
    * Extracts statistical data from the given 'data' object based on given keys
    * (array of selected events).
    * @param {string[]} keys - Event names
    * @param {object} data - Data object fetched from api
    * @returns {Object[]} Returns an object prepared for big numbers component.
    **/
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

    /**
    * This function is intended to be used internally. Called by
    * countlyMonetization.requestMetricData when data successfully arrives.
    * Converts time-series data to a renderable form based on given keys
    * (array of selected events).
    * @param {string[]} keys - Event names
    * @param {object} data - Data object fetched from api
    * @returns {Object[]} Returns an object prepared for chart component.
    **/
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

    /**
    * This function is intended to be used internally. Called by
    * countlyMonetization.requestMetricData when data successfully arrives.
    * Converts time-series data to a datatables plugin accepted form based on
    * given keys (array of selected events).
    * @param {string[]} keys - Event names
    * @param {object} data - Data object fetched from api
    * @returns {Object[]} Returns an object prepared for table component.
    **/
    countlyMonetization.convertToTableData = function(keys, data) {
        if (!keys[0] || !data[keys[0]]) {
            return [];
        }

        var points = [];
        var period = countlyCommon.getPeriod();
        var periodObj = countlyCommon.getPeriodObj();
        var dateFormat = "";
        if (periodObj.numberOfDays === 1) {
            if (period === "hour") {
                dateFormat = 'HH:00';
            }
            else {
                dateFormat = 'D MMM, HH:00';
            }
        }
        else if (period !== "month") {
            if (period === "60days" || period === "30days") {
                dateFormat = 'D MMM, YYYY';
            }
            else {
                dateFormat = 'D MMM';
            }
        }
        else {
            dateFormat = 'MMM';
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

    /**
    * Returns the renderable data object. Used by countly.views.js to access
    * data.
    * @returns {Object[]} Returns an object prepared for table component.
    **/
    countlyMonetization.getMetricData = function() {
        return _data;
    };

})(window.countlyMonetization = window.countlyMonetization || {});