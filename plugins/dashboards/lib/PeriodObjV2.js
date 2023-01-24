var moment = require('moment-timezone');

/**
 * PeriodObjV2 class contains period. This is created to be used instead of the existing periodObj in future
 */
class PeriodObjV2 {
  static appTimezone = "UTC";
  static currMoment = moment();

  constructor() {
    this.period = "hour";
  }

  constructor(period) {
    this.period = period;
  }

  getPeriod() {
    return this.period;
  }
  setPeriod(period) {
    this.period = period;
  }

  getPeriodObj() {
    var startTimestamp, endTimestamp, periodObject, cycleDuration;

  periodObject = {
      start: 0,
      end: 0,
      currentPeriodArr: [],
      previousPeriodArr: [],
      dateString: "NA",
      isSpecialPeriod: false,
      daysInPeriod: 0,
      periodContainsToday: true,
      uniquePeriodArr: [],
      uniquePeriodCheckArr: [],
      previousUniquePeriodArr: [],
      previousUniquePeriodCheckArr: [],
      activePeriod: "NA",
      previousPeriod: "NA",
      periodMax: "NA",
      periodMin: "NA",
      reqMonthDbDateIds: [],
      reqZeroDbDateIds: []
  };

  endTimestamp = currMoment.clone().endOf("day");

  if (this.period.since) {
      this.period = [this.period.since, Date.now()];
  }

  if (this.period && typeof this.period === 'string' && this.period.indexOf(",") !== -1) {
      try {
          this.period = JSON.parse(this.period);
      }
      catch (SyntaxError) {
          console.log("period JSON parse failed");
          this.period = "30days";
      }
  }

  if (Array.isArray(this.period)) {
      if ((this.period[0] + "").length === 10) {
          this.period[0] *= 1000;
      }
      if ((this.period[1] + "").length === 10) {
          this.period[1] *= 1000;
      }
      var fromDate, toDate;

      if (Number.isInteger(this.period[0]) && Number.isInteger(this.period[1])) {
          fromDate = moment(this.period[0]);
          toDate = moment(this.period[1]);
      }
      else {
          fromDate = moment(this.period[0], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
          toDate = moment(this.period[1], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
      }

      startTimestamp = fromDate.clone().startOf("day");
      endTimestamp = toDate.clone().endOf("day");
      fromDate.tz(appTimezone);
      toDate.tz(appTimezone);

      if (fromDate.valueOf() === toDate.valueOf()) {
          cycleDuration = moment.duration(1, "day");
          Object.assign(periodObject, {
              dateString: "D MMM, HH:mm",
              periodMax: 23,
              periodMin: 0,
              activePeriod: fromDate.format("YYYY.M.D"),
              previousPeriod: fromDate.clone().subtract(1, "day").format("YYYY.M.D")
          });
      }
      else if (fromDate.valueOf() > toDate.valueOf()) {
          //incorrect range - reset to 30 days
          let nDays = 30;

          startTimestamp = currMoment.clone().startOf("day").subtract(nDays - 1, "days");
          endTimestamp = currMoment.clone().endOf("day");

          cycleDuration = moment.duration(nDays, "days");
          Object.assign(periodObject, {
              dateString: "D MMM",
              isSpecialPeriod: true
          });
      }
      else {
          cycleDuration = moment.duration(Math.round(moment.duration(endTimestamp - startTimestamp).asDays()), "days");
          Object.assign(periodObject, {
              dateString: "D MMM",
              isSpecialPeriod: true
          });
      }
  }
  else if (this.period === "month") {
      startTimestamp = currMoment.clone().startOf("year");
      cycleDuration = moment.duration(1, "year");
      periodObject.dateString = "MMM";
      Object.assign(periodObject, {
          dateString: "MMM",
          periodMax: 12,
          periodMin: 1,
          activePeriod: currMoment.year(),
          previousPeriod: currMoment.year() - 1
      });
  }
  else if (this.period === "day") {
      startTimestamp = currMoment.clone().startOf("month");
      cycleDuration = moment.duration(1, "month");
      periodObject.dateString = "D MMM";
      Object.assign(periodObject, {
          dateString: "D MMM",
          periodMax: currMoment.clone().endOf("month").date(),
          periodMin: 1,
          activePeriod: currMoment.format("YYYY.M"),
          previousPeriod: currMoment.clone().subtract(1, "month").format("YYYY.M")
      });
  }
  else if (this.period === "hour") {
      startTimestamp = currMoment.clone().startOf("day");
      cycleDuration = moment.duration(1, "day");
      Object.assign(periodObject, {
          dateString: "HH:mm",
          periodMax: 23,
          periodMin: 0,
          activePeriod: currMoment.format("YYYY.M.D"),
          previousPeriod: currMoment.clone().subtract(1, "day").format("YYYY.M.D")
      });
  }
  else if (this.period === "yesterday") {
      let yesterday = currMoment.clone().subtract(1, "day");

      startTimestamp = yesterday.clone().startOf("day");
      endTimestamp = yesterday.clone().endOf("day");
      cycleDuration = moment.duration(1, "day");
      Object.assign(periodObject, {
          dateString: "D MMM, HH:mm",
          periodMax: 23,
          periodMin: 0,
          activePeriod: yesterday.format("YYYY.M.D"),
          previousPeriod: yesterday.clone().subtract(1, "day").format("YYYY.M.D")
      });
  }
  else if (/([0-9]+)days/.test(this.period)) {
      let nDays = parseInt(/([0-9]+)days/.exec(this.period)[1]);
      if (nDays < 1) {
          nDays = 30; //if there is less than 1 day
      }
      startTimestamp = currMoment.clone().startOf("day").subtract(nDays - 1, "days");
      cycleDuration = moment.duration(nDays, "days");
      Object.assign(periodObject, {
          dateString: "D MMM",
          isSpecialPeriod: true
      });
  }
  else if (/([0-9]+)weeks/.test(this.period)) {
      let nDays = parseInt(/([0-9]+)weeks/.exec(this.period)[1]) * 7;
      if (nDays < 1) {
          nDays = 30; //if there is less than 1 day
      }
      startTimestamp = currMoment.clone().startOf("day").subtract(nDays - 1, "days");
      cycleDuration = moment.duration(nDays, "days");
      Object.assign(periodObject, {
          dateString: "D MMM",
          isSpecialPeriod: true
      });
  }
  else if (/([0-9]+)months/.test(this.period)) {
      let nDays = parseInt(/([0-9]+)months/.exec(this.period)[1]) * 30;
      if (nDays < 1) {
          nDays = 30; //if there is less than 1 day
      }
      startTimestamp = currMoment.clone().startOf("day").subtract(nDays - 1, "days");
      cycleDuration = moment.duration(nDays, "days");
      Object.assign(periodObject, {
          dateString: "D MMM",
          isSpecialPeriod: true
      });
  }
  //incorrect period, defaulting to 30 days
  else {
      let nDays = 30;

      startTimestamp = currMoment.clone().startOf("day").subtract(nDays - 1, "days");
      cycleDuration = moment.duration(nDays, "days");
      Object.assign(periodObject, {
          dateString: "D MMM",
          isSpecialPeriod: true
      });
  }

  Object.assign(periodObject, {
      start: startTimestamp.valueOf(),
      end: endTimestamp.valueOf(),
      daysInPeriod: Math.round(moment.duration(endTimestamp - startTimestamp).asDays()),
      periodContainsToday: (startTimestamp <= currMoment) && (currMoment <= endTimestamp),
  });

  for (let dayIt = startTimestamp.clone(); dayIt < endTimestamp; dayIt.add(1, "day")) {
      periodObject.currentPeriodArr.push(dayIt.format("YYYY.M.D"));
      periodObject.previousPeriodArr.push(dayIt.clone().subtract(cycleDuration).format("YYYY.M.D"));
  }

  periodObject.uniquePeriodArr = getTicksBetween(startTimestamp, endTimestamp);
  periodObject.uniquePeriodCheckArr = getTicksCheckBetween(startTimestamp, endTimestamp);
  periodObject.previousUniquePeriodArr = getTicksBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));
  periodObject.previousUniquePeriodCheckArr = getTicksCheckBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));

  let zeroIDs = new Set(),
      monthIDs = new Set();

  for (let index in periodObject.currentPeriodArr) {
      let [year, month] = periodObject.currentPeriodArr[index].split("."),
          [prevYear, prevMonth] = periodObject.previousPeriodArr[index].split(".");

      zeroIDs.add(year + ":0");
      monthIDs.add(year + ":" + month);
      zeroIDs.add(prevYear + ":0");
      monthIDs.add(prevYear + ":" + prevMonth);
  }

  periodObject.reqZeroDbDateIds = Array.from(zeroIDs);
  periodObject.reqMonthDbDateIds = Array.from(monthIDs);

  return periodObject;
  }


}

module.exports = PeriodObjV2;