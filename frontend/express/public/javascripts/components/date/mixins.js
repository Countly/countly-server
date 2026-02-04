import moment from 'moment';
import inViewportMixin from 'vue-in-viewport-mixin';
import { i18n } from '../../countly/vue/core.js';

export const availableShortcuts = {
    "yesterday": {
        label: i18n("common.yesterday"),
        value: "yesterday",
        getRange: function() {
            return [moment().startOf("day").subtract(1, "d"), moment().endOf("day").subtract(1, "d")];
        }
    },
    "hour": {
        label: i18n("common.today"),
        value: "hour",
        getRange: function() {
            return [moment().startOf("day"), moment().endOf("day")];
        }
    },
    "7days": {
        label: i18n("taskmanager.last-7days"),
        value: "7days",
        getRange: function() {
            return [moment().startOf("day").subtract(6, "d"), moment().endOf("day")];
        }
    },
    "30days": {
        label: i18n("taskmanager.last-30days"),
        value: "30days",
        getRange: function() {
            return [moment().startOf("day").subtract(29, "d"), moment().endOf("day")];
        }
    },
    "60days": {
        label: i18n("taskmanager.last-60days"),
        value: "60days",
        getRange: function() {
            return [moment().startOf("day").subtract(59, "d"), moment().endOf("day")];
        }
    },
    "prevMonth": {
        label: moment().subtract(1, "month").format("MMMM, YYYY"),
        value: "prevMonth",
        getRange: function() {
            return [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")];
        }
    },
    "day": {
        label: moment().format("MMMM, YYYY"),
        value: "day",
        getRange: function() {
            return [moment().startOf("month"), moment().endOf("month")];
        }
    },
    "month": {
        label: moment().year(),
        value: "month",
        getRange: function() {
            return [moment().startOf("year"), moment().endOf("year")];
        }
    },
    "0days": {
        label: i18n("common.all-time"),
        value: "0days",
        getRange: function() {
            return [moment([2010, 0, 1]), moment().endOf("year")];
        }
    }
};

// Global date ranges
export const globalMin = moment([2010, 0, 1]);
export const globalMax = moment().endOf('day');
export const globalFutureMin = moment().startOf('day');
export const globalFutureMax = moment().startOf('day').add(10, "y");

/**
 * Builds global date ranges used across datepickers
 * @returns {Object} Object containing global date ranges
 */
function buildGlobalRanges() {
    var globalDaysRange = [],
        globalMonthsRange = [],
        globalYearsRange = [],
        globalFutureDaysRange = [],
        globalFutureMonthsRange = [],
        globalFutureYearsRange = [],
        daysCursor = moment(globalMin.toDate()),
        monthsCursor = moment(globalMin.toDate()),
        yearsCursor = moment(globalMin.toDate());

    while (daysCursor < globalMax) {
        globalDaysRange.push({
            date: daysCursor.toDate(),
            title: daysCursor.format("MMMM YYYY"),
            key: daysCursor.unix(),
            anchorClass: "anchor-" + daysCursor.unix(),
        });
        daysCursor = daysCursor.add(1, "M");
    }

    globalFutureDaysRange.push(globalDaysRange[globalDaysRange.length - 1]);

    while (daysCursor < globalFutureMax) {
        globalFutureDaysRange.push({
            date: daysCursor.toDate(),
            title: daysCursor.format("MMMM YYYY"),
            key: daysCursor.unix(),
            anchorClass: "anchor-" + daysCursor.unix(),
        });
        daysCursor = daysCursor.add(1, "M");
    }

    while (monthsCursor < globalMax) {
        globalMonthsRange.push({
            date: monthsCursor.toDate(),
            title: monthsCursor.format("YYYY"),
            key: monthsCursor.unix(),
            anchorClass: "anchor-" + monthsCursor.unix(),
        });
        monthsCursor = monthsCursor.add(1, "Y");
    }

    globalFutureMonthsRange.push(globalMonthsRange[globalMonthsRange.length - 1]);

    while (monthsCursor < globalFutureMax) {
        globalFutureMonthsRange.push({
            date: monthsCursor.toDate(),
            title: monthsCursor.format("YYYY"),
            key: monthsCursor.unix(),
            anchorClass: "anchor-" + monthsCursor.unix(),
        });
        monthsCursor = monthsCursor.add(1, "Y");
    }

    while (yearsCursor < globalMax) {
        let year = yearsCursor.year();
        let title = String(year) + " - " + String(yearsCursor.clone().add(9, "Y").year());
        let key = moment([year, 0, 1]).unix();
        globalYearsRange.push({
            date: moment([year, 0, 1]).toDate(),
            title,
            key,
            anchorClass: "anchor-" + key,
        });
        yearsCursor = yearsCursor.add(10, "Y");
    }

    globalFutureYearsRange.push(globalYearsRange[globalYearsRange.length - 1]);

    while (yearsCursor < globalFutureMax) {
        let year = yearsCursor.year();
        let title = String(year) + " - " + String(yearsCursor.clone().add(9, "Y").year());
        let key = moment([year, 0, 1]).unix();
        globalFutureYearsRange.push({
            date: moment([year, 0, 1]).toDate(),
            title,
            key,
            anchorClass: "anchor-" + key,
        });
        yearsCursor = yearsCursor.add(10, "Y");
    }

    Object.freeze(globalDaysRange);
    Object.freeze(globalMonthsRange);
    Object.freeze(globalFutureDaysRange);
    Object.freeze(globalFutureMonthsRange);
    Object.freeze(globalYearsRange);
    Object.freeze(globalFutureYearsRange);

    return {
        globalDaysRange,
        globalMonthsRange,
        globalYearsRange,
        globalFutureDaysRange,
        globalFutureMonthsRange,
        globalFutureYearsRange
    };
}

const ranges = buildGlobalRanges();
export const globalDaysRange = ranges.globalDaysRange;
export const globalMonthsRange = ranges.globalMonthsRange;
export const globalYearsRange = ranges.globalYearsRange;
export const globalFutureDaysRange = ranges.globalFutureDaysRange;
export const globalFutureMonthsRange = ranges.globalFutureMonthsRange;
export const globalFutureYearsRange = ranges.globalFutureYearsRange;

/**
 * Returns the range label for a given state object
 * @param {Object} state Current state of datepicker
 * @param {String} type Datepicker type
 * @returns {String} Range label
 */
export function getRangeLabel(state, type) {
    if (state.selectedShortcut === "0days") {
        return i18n("common.all-time");
    }

    type = type || "date";
    var level = type.replace("range", "");

    if (!state.rangeMode || state.rangeMode === 'inBetween' || state.labelMode === 'absolute') {
        var effectiveRange = [moment(state.minDate), moment(state.maxDate)];
        switch (level) {
        case "date":
            if (effectiveRange[0].isSame(effectiveRange[1])) {
                return effectiveRange[0].format("lll");
            }
            else if (effectiveRange[1] - effectiveRange[0] > 86400000) {
                return effectiveRange[0].format("ll") + " - " + effectiveRange[1].format("ll");
            }
            else {
                return effectiveRange[0].format("lll") + " - " + effectiveRange[1].format("lll");
            }
        case "month":
            if (effectiveRange[0].isSame(effectiveRange[1])) {
                return effectiveRange[0].format("MMM YYYY");
            }
            return effectiveRange[0].format("MMM YYYY") + " - " + effectiveRange[1].format("MMM YYYY");
        }
    }
    else if (state.rangeMode === 'since') {
        return i18n('common.time-period-name.since', moment(state.minDate).format("ll"));
    }
    else if (state.rangeMode === 'onm') {
        return i18n('common.time-period-name.on', moment(state.minDate).format("ll"));
    }
    else if (state.rangeMode === 'before') {
        return i18n('common.time-period-name.before', moment(state.maxDate).format("ll"));
    }
    else if (state.rangeMode === 'inTheLast') {
        var num = parseInt(state.inTheLastInput.raw.text, 10),
            suffix = '';

        if (num > 1) {
            suffix = "-plural";
        }
        return i18n('common.in-last-' + state.inTheLastInput.raw.level + suffix, num);
    }
}

/**
 * Provides picker with the default input state
 * @param {String} formatter Formatter string e.g. MM/DD/YYYY
 * @returns {Object} State object, can be merged to component data
 */
export function getDefaultInputState(formatter) {
    var now = moment(),
        minDateMM = moment().subtract(1, 'month'),
        minDateText = minDateMM.format(formatter),
        minDate = minDateMM.toDate(),
        maxDateMM = now,
        maxDate = maxDateMM.toDate();

    var state = {
        now: now,
        selectedShortcut: null,
        customRangeSelection: true,
        presetSelection: false,
        rangeMode: 'inBetween',
        minDate: minDate,
        maxDate: maxDate,
        minTime: new Date(minDate.getTime()),
        inBetweenInput: {
            raw: {
                textStart: minDateText,
                textEnd: maxDateMM.format(formatter),
            },
            parsed: [minDate, maxDate]
        },
        sinceInput: {
            raw: {
                text: minDateText,
            },
            parsed: [minDate, maxDate]
        },
        onmInput: {
            raw: {
                text: minDateText,
            },
            parsed: [minDate, minDate]
        },
        beforeInput: {
            raw: {
                text: minDateText,
            },
            parsed: [minDate, maxDate]
        },
        inTheLastInput: {
            raw: {
                text: '1',
                level: 'days'
            },
            parsed: [moment().startOf("days").toDate(), moment().endOf("days").toDate()]
        }
    };
    state.label = getRangeLabel(state, false);
    return state;
}

/**
 * Creates an initial state object
 * @param {Object} instance Instance configuration
 * @returns {Object} Initial state object for datepicker
 */
export function getInitialState(instance) {
    var formatter = null,
        tableType = "",
        globalRange = null,
        inputDisable = false;

    if (instance.type.includes("minute")) {
        formatter = "YYYY-MM";
        tableType = "minute";
        globalRange = null;
    }
    if (instance.type.includes("hour")) {
        formatter = "YYYY-MM";
        tableType = "hour";
        globalRange = null;
    }
    if (instance.type.includes("month")) {
        formatter = "YYYY-MM";
        tableType = "month";
        globalRange = instance.isFuture ? globalFutureMonthsRange : globalMonthsRange;
    }
    else if (instance.type.includes("year")) {
        formatter = "YYYY";
        tableType = "year";
        globalRange = instance.isFuture ? globalFutureYearsRange : globalYearsRange;
    }
    else {
        formatter = "YYYY-MM-DD";
        tableType = "day";
        globalRange = instance.isFuture ? globalFutureDaysRange : globalDaysRange;
    }

    var state = {
        rangeState: {
            endDate: null,
            selecting: false,
            row: null,
            column: null,
            focusOn: null
        },
        rangeBackup: {
            minDate: null,
            maxDate: null
        },
        scrollOps: {
            scrollPanel: { scrollingX: false},
            bar: {minSize: 0.2, background: 'rgba(129,134,141,.3)'}
        },
        formatter: formatter,
        globalRange: globalRange,
        tableType: tableType,
        tableTypeMapper: {years: "year", months: "month", weeks: "week", days: "day", hours: "hour", minutes: "minute"},
        inputDisable: inputDisable,
        leftSideShortcuts: [
            {label: i18n('common.time-period-select.range'), value: "inBetween"},
            {label: i18n('common.time-period-select.before'), value: "before"},
            {label: i18n('common.time-period-select.since'), value: "since"},
            {label: i18n('common.time-period-select.last-n'), value: "inTheLast"},
            {label: i18n('common.all-time'), value: "0days"},
        ],
        globalMonthsRange: globalMonthsRange,
        globalYearsRange: globalYearsRange,
        globalMin: instance.isFuture ? globalFutureMin : globalMin,
        globalMax: instance.isFuture ? globalFutureMax : globalMax
    };
    return Object.assign(state, getDefaultInputState(formatter));
}

/**
 * Returns the period label for a given period input
 * @param {String|Object|Array} period The period input
 * @param {Boolean} excludeCurrentDay Whether to exclude the current day
 * @param {String} labelMode The label mode
 * @returns {String} Period label
 */
export function getPeriodLabel(period, excludeCurrentDay, labelMode) {
    var state = {};
    const type = "date";
    const now = moment().toDate();

    if (Array.isArray(period)) {
        if (period.length >= 2) {
            state = {
                rangeMode: "inBetween",
                minDate: new Date(period[0]),
                maxDate: new Date(period[1]),
            };
        }
    }
    else if (typeof period === "object") {
        if (Object.prototype.hasOwnProperty.call(period, "since")) {
            state = {
                rangeMode: "since",
                minDate: new Date(period.since),
                maxDate: excludeCurrentDay ? moment().subtract(1, 'days').endOf("day").toDate() : now
            };
        }
    }
    else if (typeof period === "string") {
        const matches = period.match(/^(\d+)(\D+)$/);
        if (matches && matches.length === 3) {
            state = {
                rangeMode: "inTheLast",
                inTheLastInput: { raw: { text: matches[1], level: matches[2] } },
                minDate: moment().subtract((matches[1] - 1), matches[2]).startOf("day").toDate(),
                maxDate: excludeCurrentDay ? moment().subtract(1, 'days').endOf("day").toDate() : now
            };
        }
    }
    state.labelMode = labelMode;
    return getRangeLabel(state, type);
}

// Abstract table component mixin
export const AbstractTableMixin = {
    props: {
        dateMeta: Object
    },
    data: function() {
        return {
            visible: false
        };
    },
    mixins: [inViewportMixin],
    watch: {
        'inViewport.now': function(visible) {
            this.visible = visible;
        }
    }
};

// Input controls mixin
export const InputControlsMixin = {
    methods: {
        tryParsing: function(newVal, target, sourceIndex, targetIndexes) {
            var parsedRange = target.parsed,
                handleUpdate = false,
                self = this;

            targetIndexes = targetIndexes || [sourceIndex];

            var parsed = moment(newVal);
            targetIndexes.forEach(function(targetIndex) {
                var needsSync = newVal !== moment(parsedRange[targetIndex]).format(self.formatter);
                if (needsSync) {
                    if (parsed && parsed.isValid() && (parsed >= self.globalMin) && (parsed <= self.globalMax)) {
                        target.raw['invalid' + targetIndex] = false;
                        parsedRange[targetIndex] = parsed.toDate();
                        if (targetIndex === sourceIndex) {
                            handleUpdate = true;
                        }
                    }
                    else {
                        target.raw['invalid' + targetIndex] = true;
                    }
                }
            });
            if (handleUpdate) {
                this.handleUserInputUpdate(parsedRange[sourceIndex]);
            }
        },
        handleTextStartFocus: function() {
            this.scrollTo(this.inBetweenInput.parsed[0]);
        },
        handleTextEndFocus: function() {
            this.scrollTo(this.inBetweenInput.parsed[1]);
        },
        handleTextStartBlur: function() {
            if (this.inBetweenInput.raw.invalid0 && this.inBetweenInput.parsed[0]) {
                this.inBetweenInput.raw.textStart = moment(this.inBetweenInput.parsed[0]).format(this.formatter);
                this.inBetweenInput.raw.invalid0 = false;
            }
        },
        handleTextEndBlur: function() {
            if (this.inBetweenInput.raw.invalid1 && this.inBetweenInput.parsed[1]) {
                this.inBetweenInput.raw.textEnd = moment(this.inBetweenInput.parsed[1]).format(this.formatter);
                this.inBetweenInput.raw.invalid1 = false;
            }
        },
        handleSinceBlur: function() {
            if (this.sinceInput.raw.invalid0 && this.sinceInput.parsed[0]) {
                this.sinceInput.raw.text = moment(this.sinceInput.parsed[0]).format(this.formatter);
                this.sinceInput.raw.invalid0 = false;
            }
        },
        handleOnmBlur: function() {
            if (this.onmInput.raw.invalid0 && this.onmInput.parsed[0]) {
                this.onmInput.raw.text = moment(this.onmInput.parsed[0]).format(this.formatter);
                this.onmInput.raw.invalid0 = false;
            }
        },
        handleUserInputUpdate: function(scrollToDate) {
            var inputObj = null;
            switch (this.rangeMode) {
            case 'inBetween':
                this.tableType = this.retentionConfiguration ? this.tableTypeMapper[this.retentionConfiguration] : "day";
                if (this.tableType === "week") {
                    inputObj = [moment().startOf("isoWeek").toDate(), moment().endOf("day").toDate()];
                }
                else {
                    if (this.inBetweenInput.parsed && this.inBetweenInput.parsed.length) {
                        this.inBetweenInput.parsed[0] = moment(this.inBetweenInput.parsed[0]).startOf("day").toDate();
                        this.inBetweenInput.parsed[1] = moment(this.inBetweenInput.parsed[1]).endOf("day").toDate();
                    }
                    inputObj = this.inBetweenInput.parsed;
                }
                break;
            case 'since':
                this.tableType = this.retentionConfiguration ? this.tableTypeMapper[this.retentionConfiguration] : "day";
                if (this.tableType === "week") {
                    inputObj = [moment().startOf("isoWeek").toDate(), moment().endOf("day").toDate()];
                }
                else {
                    inputObj = this.sinceInput.parsed;
                }
                break;
            case 'onm':
                this.tableType = "day";
                inputObj = this.onmInput.parsed;
                break;
            case 'inTheLast':
                if (this.inTheLastInput.raw.level === "minutes") {
                    this.tableType = "minute";
                }
                if (this.inTheLastInput.raw.level === "hours") {
                    this.tableType = "hour";
                }
                if (this.inTheLastInput.raw.level === "months") {
                    this.tableType = "month";
                }
                if (this.inTheLastInput.raw.level === "years") {
                    this.tableType = "year";
                }
                this.tableType = this.retentionConfiguration ? this.tableTypeMapper[this.retentionConfiguration] : this.inTheLastInput.raw.level.slice(0, -1) || this.tableType;
                inputObj = this.inTheLastInput.parsed;
                break;
            case 'before':
                this.beforeInput.parsed[0] = globalMin.toDate();
                inputObj = this.beforeInput.parsed;
                break;
            default:
                return;
            }

            if (scrollToDate) {
                this.scrollTo(scrollToDate);
            }
            else if (this.rangeMode === "before" && inputObj[1]) {
                this.scrollTo(inputObj[1]);
            }
            else if (inputObj[0]) {
                this.scrollTo(inputObj[0]);
            }
            if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] <= inputObj[1]) {
                this.minDate = inputObj[0];
                this.maxDate = inputObj[1];
            }
            var self = this;
            if (this.tableType === "month") {
                this.formatter = "YYYY-MM";
                this.globalRange = this.isFuture ? globalFutureMonthsRange : globalMonthsRange;
                setTimeout(function() {
                    self.scrollTo(self.inTheLastInput.parsed[0]);
                }, 0);
            }
            else if (this.tableType === "year") {
                this.formatter = "YYYY";
                this.globalRange = this.isFuture ? globalFutureYearsRange : globalYearsRange;
                setTimeout(function() {
                    self.scrollTo(self.inTheLastInput.parsed[0]);
                }, 0);
            }
            else if (this.tableType === "minute") {
                this.formatter = "YYYY-MM";
                this.globalRange = null;
            }
            else if (this.tableType === "hour") {
                this.formatter = "YYYY-MM";
                this.globalRange = null;
            }
            else {
                this.formatter = "YYYY-MM-DD";
                this.globalRange = this.isFuture ? globalFutureDaysRange : globalDaysRange;
                setTimeout(function() {
                    self.scrollTo(self.inTheLastInput.parsed[0]);
                }, 0);
            }
        },
        setCurrentInBetween: function(minDate, maxDate) {
            this.inBetweenInput = {
                raw: {
                    textStart: moment(minDate).format(this.formatter),
                    textEnd: moment(maxDate).format(this.formatter)
                },
                parsed: [minDate, maxDate]
            };
        },
        setCurrentSince: function(minDate, maxDate) {
            this.sinceInput = {
                raw: {
                    text: moment(minDate).format(this.formatter)
                },
                parsed: [minDate, maxDate]
            };
        },
        setCurrentOnm: function(minDate, maxDate) {
            this.onmInput = {
                raw: {
                    text: moment(minDate).format(this.formatter)
                },
                parsed: [minDate, maxDate]
            };
        },
        setCurrentBefore: function(minDate, maxDate) {
            this.beforeInput = {
                raw: {
                    text: moment(maxDate).format(this.formatter)
                },
                parsed: [minDate, maxDate]
            };
        },
        setCurrentInTheLast: function(minDate, maxDate) {
            if (this.retentionConfiguration) {
                this.tableType = this.tableTypeMapper[this.retentionConfiguration] || "day";
                this.inTheLastInput.raw.level = this.retentionConfiguration;
            }
            this.inTheLastInput.parsed = [minDate, maxDate];
            var diffBetweenTwoDates = (moment(this.inTheLastInput.parsed[1]).diff(moment(this.inTheLastInput.parsed[0]), this.inTheLastInput.raw.level));
            this.inTheLastInput.raw.text = diffBetweenTwoDates ? (diffBetweenTwoDates + 1) : 1;
        }
    },
    watch: {
        'inBetweenInput.raw.textStart': function(newVal) {
            if (this.isRange) {
                this.tryParsing(newVal, this.inBetweenInput, 0);
            }
            else {
                this.tryParsing(newVal, this.inBetweenInput, 0, [0, 1]);
            }
        },
        'inBetweenInput.raw.textEnd': function(newVal) {
            this.tryParsing(newVal, this.inBetweenInput, 1);
        },
        'sinceInput.raw.text': function(newVal) {
            this.tryParsing(newVal, this.sinceInput, 0);
        },
        'onmInput.raw.text': function(newVal) {
            this.tryParsing(newVal, this.onmInput, 0, [0, 1]);
        },
        'beforeInput.raw.text': function(newVal) {
            this.tryParsing(newVal, this.beforeInput, 1);
        },
        'inTheLastInput.raw': {
            deep: true,
            handler: function(newVal) {
                this.$emit("update-stringified-value", newVal);
                var self = this;
                var parsed = moment().subtract(newVal.text - 1, newVal.level).startOf(newVal.level.slice(0, -1) || "day");
                if (newVal.level === "minutes") {
                    parsed = moment().subtract(newVal.text - 1, newVal.level).startOf("minute");
                }
                if (newVal.level === "hours") {
                    parsed = moment().subtract(newVal.text - 1, newVal.level).startOf("hour");
                }
                if (newVal.level === "weeks") {
                    parsed = moment().subtract(newVal.text - 1, newVal.level).startOf("isoWeek");
                }
                if (newVal.text.toString() === "1" && newVal.level === "days") {
                    parsed = moment().startOf("day");
                }
                else if (newVal.text.toString() === "1" && newVal.level === "weeks") {
                    parsed = moment().startOf("isoWeek");
                }
                if (parsed && !parsed.isSame(moment(this.inTheLastInput.parsed[0]))) {
                    if (parsed.isValid()) {
                        this.inTheLastInput.parsed[0] = parsed.toDate();
                        this.inTheLastInput.parsed[1] = moment().endOf("day").toDate();
                        this.handleUserInputUpdate(this.inTheLastInput.parsed[0], this.inTheLastInput.parsed[1]);
                    }
                }
                if (newVal.level === "years") {
                    this.globalRange = this.globalYearsRange;
                    this.tableType = "year";
                }
                else if (newVal.level === "months") {
                    this.globalRange = this.globalMonthsRange;
                    this.tableType = "month";
                }
                else if (newVal.level === "weeks") {
                    this.tableType = "week";
                    this.globalRange = this.isFuture ? globalFutureDaysRange : globalDaysRange;
                    setTimeout(function() {
                        self.scrollTo(self.inTheLastInput.parsed[0]);
                    }, 0);
                }
                else if (newVal.level === "days") {
                    this.formatter = "YYYY-MM-DD";
                    this.tableType = "day";
                    this.globalRange = this.isFuture ? globalFutureDaysRange : globalDaysRange;
                    setTimeout(function() {
                        self.scrollTo(self.inTheLastInput.parsed[0]);
                    }, 0);
                }
                else if (newVal.level === "hours") {
                    this.globalRange = this.globalHoursRange;
                    this.tableType = "hour";
                }
                else if (newVal.level === "minutes") {
                    this.globalRange = this.globalMinutesRange;
                    this.tableType = "minute";
                }
            }
        },
    }
};

// Calendars mixin
export const CalendarsMixin = {
    methods: {
        disabledDateFn: function(date) {
            return date > this.globalMax || date < this.globalMin;
        },
        handleRangePick: function(val) {
            var firstClick = !this.rangeState.selecting,
                singleSelectRange = this.rangeMode === "since" || this.rangeMode === "onm" || this.rangeMode === "inTheLast" || this.rangeMode === "before";

            if (!singleSelectRange) {
                this.rangeMode = "inBetween";
            }

            if (firstClick) {
                if (this.tableType === "week") {
                    this.minDate = moment(this.minDate).startOf("isoWeek").toDate();
                    this.maxDate = moment(this.maxDate).endOf("isoWeek").toDate();
                }
                this.rangeBackup = {
                    minDate: this.minDate,
                    maxDate: this.maxDate
                };
            }
            var minDate, maxDate;
            if (firstClick) {
                if (this.tableType === "day") {
                    minDate = moment(val.minDate).startOf("day").toDate();
                    maxDate = moment(val.minDate).endOf("day").toDate();
                }
                else if (this.tableType === "week") {
                    minDate = moment(val.minDate).startOf("isoWeek").toDate();
                    maxDate = moment(val.maxDate).endOf("isoWeek").toDate();
                }
                else if (this.tableType === "month") {
                    minDate = moment(val.minDate).startOf("month").toDate();
                    maxDate = moment(val.minDate).endOf("month").toDate();
                }

                if (!this.isRange || singleSelectRange) {
                    this.resetRangeState();
                }

                if (this.rangeMode === 'since') {
                    maxDate = moment().toDate();
                    this.setCurrentSince(minDate, maxDate);
                }
                else if (this.rangeMode === 'onm') {
                    maxDate = minDate;
                    this.setCurrentOnm(minDate, maxDate);
                }
                else if (this.rangeMode === 'inTheLast') {
                    maxDate = moment().toDate();
                    this.setCurrentInTheLast(minDate, maxDate);
                }
                else if (this.rangeMode === 'before') {
                    maxDate = minDate;
                    minDate = globalMin.toDate();
                    this.setCurrentBefore(minDate, maxDate);
                }
                this.setCurrentInBetween(minDate, maxDate);
            }
            else {
                if (this.tableType === "day") {
                    minDate = moment(val.minDate).startOf("day").toDate();
                    maxDate = moment(val.maxDate).endOf("day").toDate();
                }
                else if (this.tableType === "week") {
                    minDate = moment(val.minDate).startOf("isoWeek").toDate();
                    maxDate = moment(val.maxDate).endOf("isoWeek").toDate();

                    if (this.retentionConfiguration) {
                        minDate = moment(val.minDate).startOf("isoWeek").toDate();
                        if (this.retentionConfiguration === "weeks") {
                            maxDate = moment(val.maxDate).endOf("isoWeek").toDate() > moment().toDate() ? moment().endOf("day").toDate() : moment(val.maxDate).endOf("isoWeek").toDate();
                        }
                        else {
                            maxDate = moment(val.maxDate).endOf("isoWeek").toDate();
                        }
                    }
                }
                else if (this.tableType === "month") {
                    minDate = moment(val.minDate).startOf("month").toDate();
                    maxDate = moment(val.maxDate).endOf("month").toDate();
                }
            }

            if (this.maxDate === maxDate && this.minDate === minDate) {
                return;
            }
            this.onPick && this.onPick(val);
            this.minDate = minDate;
            this.maxDate = maxDate;
        },
        handleChangeRange: function(val) {
            this.minDate = val.minDate;
            this.maxDate = val.maxDate;
            this.rangeState = val.rangeState;

            var startsAt, endsAt;

            if (this.minDate <= this.rangeState.endDate) {
                startsAt = this.minDate;
                endsAt = this.rangeState.endDate;
                this.rangeState.focusOn = "end";
            }
            else {
                startsAt = this.rangeState.endDate;
                endsAt = this.minDate;
                this.rangeState.focusOn = "start";
            }

            this.setCurrentInBetween(startsAt, endsAt);
        },
        scrollTo: function(date) {
            if (!this.customRangeSelection) {
                return;
            }
            var anchorClass = null;
            if (this.tableType === "year") {
                let dateMoment = moment(date);
                anchorClass = ".anchor-" + dateMoment.startOf('year').subtract(dateMoment.year() % 10, 'years').unix();
            }
            else if (this.tableType === "month") {
                anchorClass = ".anchor-" + moment(date).startOf("year").unix();
            }
            else {
                anchorClass = ".anchor-" + moment(date).startOf("month").unix();
            }
            if (this.$refs.vs) {
                this.$refs.vs.scrollIntoView(anchorClass);
            }
        },
        resetRangeState: function() {
            this.rangeState = {
                endDate: null,
                selecting: false,
                row: null,
                column: null,
                focusOn: null
            };
        },
        abortPicking: function() {
            if (this.rangeState.selecting) {
                this.resetRangeState();
                this.minDate = this.rangeBackup.minDate;
                this.maxDate = this.rangeBackup.maxDate;
                this.rangeBackup = {
                    minDate: null,
                    maxDate: null
                };
                this.setCurrentInBetween(this.minDate, this.maxDate);
            }
        },
    }
};
