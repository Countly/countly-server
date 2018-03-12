(function() {
  window.countlyMonetization = window.countlyMonetization || {};
  var eventMappings={
    'VI_AdClick':'monetization.adclick',
    'VI_AdStart':'monetization.adstart',
    'VI_AdComplete':'monetization.adcompleted',
  }

  var _data = {};

  var getPeriodArray =  function () {
      var periodArray = [];
      var periodObject = countlyCommon.getPeriodObj();

      if (parseInt(periodObject.numberOfDays) === 1 || periodObject.currentPeriodArr === undefined) {
          for (var i = periodObject.periodMin; i <= periodObject.periodMax; i++) {
              periodArray.push(periodObject.activePeriod + '.' + i);
          }
      } else {
          periodArray = periodObject.currentPeriodArr
      }

      return periodArray;
  };

  countlyMonetization.initialize = function() {
    return $.when(this.requestMetricData());
  }
  countlyMonetization.requestMetricData = function() {
    var period = countlyCommon.getPeriod();
    var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
    return $.ajax({
      type: "GET",
      url: countlyCommon.API_URL + "/o",
      data: {
        api_key: countlyGlobal['member'].api_key,
        app_id: countlyCommon.ACTIVE_APP_ID,
        method: 'monetization',
        period: periodString,
        events: JSON.stringify(["Shared","Sound","Won"])
      },
      success: function(json) {
        json["VI_AdClick"] =     json["Shared"]
        json["VI_AdStart"] =     json["Sound"]
        json["VI_AdComplete"] =     json["Won"]

        var chartDP = countlyMonetization.convertToChartData(Object.keys(eventMappings), json)
        var tableData = countlyMonetization.convertToTableData(Object.keys(eventMappings), json)
        var bigNumbersData = countlyMonetization.convertToBigNumbersData(Object.keys(eventMappings), json)
        _data = {
          tableData: tableData,
          chartDP: chartDP,
          bigNumbersData: bigNumbersData
        };
      }
    });
  };
  countlyMonetization.getColumns=function(){
    return eventMappings;
  }
  countlyMonetization.convertToBigNumbersData = function(keys, data) {
    var container = [];
    keys.forEach(function(key) {
      var overview = data[key].data.count;
      container.push({
        title: jQuery.i18n.map[eventMappings[key]],

        "change":overview.change,
        "prev-total":overview["prev-total"],
        "total":overview.total,
        "trend":overview.trend

      })
    });
    return container;
  }
  countlyMonetization.convertToChartData = function(keys, data) {
    var lines = [];
    keys.forEach(function(key) {
      var obj = {
        label: jQuery.i18n.map[eventMappings[key]],
        data: []
      }
      var i = 0;
      data[key].data.count.sparkline.forEach(function(item) {
        obj.data.push([i++, item]);
      })
      lines.push(obj);
    });
    return lines;
  }
  countlyMonetization.convertToTableData = function(keys, data) {
    if (!keys[0] || !data[keys[0]]) {
      return [];
    }

    var points = [];
    var period = countlyCommon.getPeriod();
    var periodObj = countlyCommon.getPeriodObj();
    if (periodObj.numberOfDays === 1) {
      if (period === "hour") {
        var dateFormat = 'HH:00'
      } else {
        var dateFormat = 'D MMM, HH:00'
      }
    } else if (period !== "month") {
      if (period === "60days" || period === "30days") {
        var dateFormat = 'D MMM, YYYY'
      } else {
        var dateFormat = 'D MMM'
      }
    } else {
      var dateFormat = 'MMM'
    }
    var periodArr= getPeriodArray();
    periodArr.forEach(function(date) {
      var empty = {
        date: moment(date, "YYYY.M.D.H").format(dateFormat)
      }
      keys.forEach(function(key) {
        empty[key] = 0;
      });
      points.push(empty)
    })
    var index = 0;
    points.forEach(function(point) {
      keys.forEach(function(key) {
        var overview = data[key].data.count;
        point[key] = overview.sparkline[index]
      });
      index++;
    })
    return points;
  }
  countlyMonetization.getMetricData = function() {
    return _data;
  }
})();
