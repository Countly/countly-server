/* global Vue, ELEMENT, moment, countlyCommon, _, CV, countlyPresets */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var availableShortcuts = {
        "yesterday": {
            label: countlyVue.i18n("common.yesterday"),
            value: "yesterday",
            getRange: function() {
                return [moment().startOf("day").subtract(1, "d"), moment().endOf("day").subtract(1, "d")];
            }
        },
        "hour": {
            label: countlyVue.i18n("common.today"),
            value: "hour",
            getRange: function() {
                return [moment().startOf("day"), moment().endOf("day")];
            }
        },
        "7days": {
            label: countlyVue.i18n("taskmanager.last-7days"),
            value: "7days",
            getRange: function() {
                return [moment().startOf("day").subtract(6, "d"), moment().endOf("day")];
            }
        },
        "30days": {
            label: countlyVue.i18n("taskmanager.last-30days"),
            value: "30days",
            getRange: function() {
                return [moment().startOf("day").subtract(29, "d"), moment().endOf("day")];
            }
        },
        "60days": {
            label: countlyVue.i18n("taskmanager.last-60days"),
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
            label: countlyVue.i18n("common.all-time"),
            value: "0days",
            getRange: function() {
                return [moment([2010, 0, 1]), moment().endOf("year")];
            }
        }
    };

    /**
     * Provides picker with the default input state
     * @param {String} formatter Formatter string e.g. MM/DD/YYYY
     * @returns {Object} State object, can be merged to component data  
     */
    function getDefaultInputState(formatter) {
        var now = moment(),
            minDateMM = moment().subtract(1, 'month'),
            minDateText = minDateMM.format(formatter),
            minDate = minDateMM.toDate(),
            maxDateMM = now,
            maxDate = maxDateMM.toDate();

        var state = {
            // User input
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
        state.label = getRangeLabel(state, this.type);
        return state;
    }

    var globalDaysRange = [],
        globalMonthsRange = [],
        globalYearsRange = [],
        globalFutureDaysRange = [],
        globalFutureMonthsRange = [],
        globalFutureYearsRange = [],
        globalMin = moment([2010, 0, 1]),
        globalMax = moment().endOf('day'),
        globalFutureMin = moment().startOf('day'),
        globalFutureMax = moment().startOf('day').add(10, "y"),
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

    /**
     * Creates an initial state object 
     * @param {Object} instance Instance configuration
     * @returns {Object} Initial state object for datepicker
     */
    function getInitialState(instance) {
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

        if (this.retentionConfiguration) {
            inputDisable = true;
        }

        var state = {
            // Calendar state
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

            // Constants
            formatter: formatter,
            globalRange: globalRange,
            tableType: tableType,
            tableTypeMapper: {years: "year", months: "month", weeks: "week", days: "day", hours: "hour", minutes: "minute"},
            inputDisable: inputDisable,
            leftSideShortcuts: [
                {label: CV.i18n('common.time-period-select.range'), value: "inBetween"},
                {label: CV.i18n('common.time-period-select.before'), value: "before"},
                {label: CV.i18n('common.time-period-select.since'), value: "since"},
                {label: CV.i18n('common.time-period-select.last-n'), value: "inTheLast"},
                {label: CV.i18n('common.all-time'), value: "0days"},
            ],
            globalMonthsRange: globalMonthsRange,
            globalYearsRange: globalYearsRange,
            globalMin: instance.isFuture ? globalFutureMin : globalMin,
            globalMax: instance.isFuture ? globalFutureMax : globalMax
        };
        return _.extend(state, getDefaultInputState(formatter));
    }

    /**
     * Returns the range label for a given state object
     * @param {Object} state Current state of datepicker
     * @param {String} type Datepicker type
     * @returns {String} Range label
     */
    function getRangeLabel(state, type) {
        if (state.selectedShortcut === "0days") {
            return countlyVue.i18n("common.all-time");
        }

        type = type || "date";
        var level = type.replace("range", "");

        if (!state.rangeMode || state.rangeMode === 'inBetween' || state.labelMode === 'absolute') {
            var effectiveRange = [moment(state.minDate), moment(state.maxDate)];
            switch (level) {
            case "date":
                if (effectiveRange[0].isSame(effectiveRange[1])) { // single point
                    return effectiveRange[0].format("lll");
                }
                else if (effectiveRange[1] - effectiveRange[0] > 86400000) {
                    return effectiveRange[0].format("ll") + " - " + effectiveRange[1].format("ll");
                }
                else {
                    return effectiveRange[0].format("lll") + " - " + effectiveRange[1].format("lll");
                }
                // case "week":
                //     return;
            case "month":
                if (effectiveRange[0].isSame(effectiveRange[1])) { // single point
                    return effectiveRange[0].format("MMM YYYY");
                }
                return effectiveRange[0].format("MMM YYYY") + " - " + effectiveRange[1].format("MMM YYYY");
            }
        }
        else if (state.rangeMode === 'since') {
            return CV.i18n('common.time-period-name.since', moment(state.minDate).format("ll"));
        }
        else if (state.rangeMode === 'onm') {
            return CV.i18n('common.time-period-name.on', moment(state.minDate).format("ll"));
        }
        else if (state.rangeMode === 'before') {
            return CV.i18n('common.time-period-name.before', moment(state.maxDate).format("ll"));
        }
        else if (state.rangeMode === 'inTheLast') {
            var num = parseInt(state.inTheLastInput.raw.text, 10),
                suffix = '';

            if (num > 1) {
                suffix = "-plural";
            }
            return CV.i18n('common.in-last-' + state.inTheLastInput.raw.level + suffix, num);
        }
    }

    var AbstractTableComponent = {
        props: {
            dateMeta: Object
        },
        components: {
            'el-date-table': ELEMENT.DateTable
        },
        data: function() {
            return {
                visible: false
            };
        },
        mixins: [ _mixins.inViewport ],
        watch: {
            'inViewport.now': function(visible) {
                this.visible = visible;
            }
        },
        template: '<div class="cly-vue-daterp__date-table-wrapper" :class="dateMeta.anchorClass">\
                        <span class="text-medium">{{ dateMeta.title }}</span>\
                        <table-component v-if="visible" v-bind="$attrs" v-on="$listeners">\
                        </table-component>\
                        <div v-if="!visible" style="height:180px"></div>\
                    </div>',
    };

    var dateTableComponent = {
        components: {
            'table-component': ELEMENT.DateTable
        },
        mixins: [AbstractTableComponent]
    };

    var monthTableComponent = {
        components: {
            'table-component': ELEMENT.MonthTable
        },
        mixins: [AbstractTableComponent]
    };

    var ExtendedYearTable = {
        extends: ELEMENT.YearTable,
        props: {
            minDate: Date,
            maxDate: Date
        },
        methods: {
            getCellStyle(year) {
                const style = ELEMENT.YearTable.methods.getCellStyle.call(this, year);
                const extendedStyle = Object.assign({}, style);
                const minDateYear = moment(this.minDate).year();
                const maxDateYear = moment(this.maxDate).year();
                extendedStyle["start-date"] = year === minDateYear;
                extendedStyle["end-date"] = year === maxDateYear;
                extendedStyle["in-range"] = year >= minDateYear && year <= maxDateYear;
                return extendedStyle;
            }
        }
    };

    var yearTableComponent = {
        components: {
            'table-component': ExtendedYearTable
        },
        mixins: [AbstractTableComponent],
    };

    var InputControlsMixin = {
        methods: {
            tryParsing: function(newVal, target, sourceIndex, targetIndexes) {
                var parsedRange = target.parsed,
                    handleUpdate = false,
                    self = this;

                targetIndexes = targetIndexes || [sourceIndex];
                // if no target specified, then it is just a self-update

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
                    this.inTheLastInput.raw.level = this.retentionConfiguration ;
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

    var CalendarsMixin = {
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

    Vue.component("cly-date-picker", countlyVue.components.create({
        mixins: [
            _mixins.i18n,
            InputControlsMixin,
            CalendarsMixin,
            ELEMENT.utils.Emitter
        ],
        components: {
            'date-table': dateTableComponent,
            'month-table': monthTableComponent,
            'year-table': yearTableComponent,
        },
        computed: {
            isStartFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "start";
            },
            isEndFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "end";
            },
            shortcuts: function() {
                if (this.moveRangeTabsToLeftSide) {
                    return this.customDateRanges ? this.customDateRanges : this.leftSideShortcuts;
                }
                else if (this.type === "daterange" && this.displayShortcuts) {
                    var self = this;
                    return Object.keys(availableShortcuts).reduce(function(acc, shortcutKey) {
                        if (self.enabledShortcuts === false && self.disabledShortcuts === false) {
                            acc.push(availableShortcuts[shortcutKey]);
                        }
                        else if (self.enabledShortcuts !== false) {
                            if (self.enabledShortcuts.indexOf(shortcutKey) !== -1) {
                                acc.push(availableShortcuts[shortcutKey]);
                            }
                        }
                        else if (self.disabledShortcuts !== false) {
                            if (self.disabledShortcuts.indexOf(shortcutKey) === -1) {
                                acc.push(availableShortcuts[shortcutKey]);
                            }
                        }
                        return acc;
                    }, []);
                }
                return [];
            },
            isRange: function() {
                return this.type.includes('range');
            },
            isTimePickerEnabled: function() {
                return this.type === 'date' && this.selectTime;
            },
            weekdays: function() {
                var weekdaysMin = moment.weekdaysMin();
                var startFromMonday = [weekdaysMin[1], weekdaysMin[2], weekdaysMin[3], weekdaysMin[4], weekdaysMin[5], weekdaysMin[6], weekdaysMin[0]];
                return startFromMonday;
            },
            warnings: function() {
                if (this.isRange && this.rangeLimits.maxLength && this.rangeLimits.maxLength.length === 2) {
                    var lengthStr = this.rangeLimits.maxLength[0] + ' ' + CV.i18n('common.buckets.' + this.rangeLimits.maxLength[1]);
                    return {'maxLength': CV.i18n('common.range-length-limit', lengthStr)};
                }
                return "";
            },
            setMinuteAndHourStyle: function() {
                return { display: this.tableType === 'minute' || this.tableType === 'hour' ? 'none' : '' };
            },
            customStyle: function() {
                return {
                    height: (this.isVisible && this.presetSelection) ? "447px" : "auto"
                };
            }
        },
        props: {
            value: [Object, String, Array, Number],
            isFuture: {
                type: Boolean,
                default: false,
                required: false
            },
            type: {
                type: String,
                default: "daterange",
                validator: function(value) {
                    return ['date', 'daterange', 'month', 'monthrange', "week", 'year', 'yearrange'].includes(value);
                }
            },
            displayShortcuts: {
                type: Boolean,
                default: true
            },
            disabledShortcuts: {
                type: [Array, Boolean],
                default: false
            },
            enabledShortcuts: {
                type: [Array, Boolean],
                default: false
            },
            placeholder: {type: String, default: 'Select'},
            disabled: { type: Boolean, default: false},
            size: {type: String, default: 'small'},
            showRelativeModes: {type: Boolean, default: true },
            offsetCorrection: {type: Boolean, default: true},
            modelMode: {
                type: String,
                default: "mixed",
                validator: function(value) {
                    return ['mixed', 'absolute'].includes(value);
                }
            },
            timestampFormat: {
                type: String,
                default: 's',
                validator: function(value) {
                    return ['s', 'ms'].includes(value);
                }
            },
            placement: {
                type: String,
                default: 'bottom-start'
            },
            selectTime: {
                type: Boolean,
                default: false
            },
            allowOnSelection: {
                type: Boolean,
                default: false,
                required: false
            },
            allowBeforeSelection: {
                type: Boolean,
                default: false,
                required: false
            },
            minInputWidth: {
                type: Number,
                default: -1,
                required: false
            },
            maxInputWidth: {
                type: Number,
                default: -1,
                required: false
            },
            allowCustomRange: {
                type: Boolean,
                default: true,
                required: false
            },
            rangeLimits: {
                type: Object,
                default: function() {
                    return {};
                },
                required: false
            },
            popClass: {
                type: String
            },
            retentionConfiguration: {
                type: String,
                default: null,
                required: false
            },
            moveRangeTabsToLeftSide: {
                type: Boolean,
                default: false,
                required: false
            },
            displayOneMode: {
                type: String,
                default: null,
                required: false
            },
            customDateRanges: {
                type: Array,
                default: null,
                required: false
            },
            isGlobalDatePicker: {
                type: Boolean,
                default: false,
                required: false
            },
            inTheLastMinutes: {
                type: Boolean,
                default: false,
                required: false
            },
            inTheLastHours: {
                type: Boolean,
                default: false,
                required: false
            },
            testId: {
                type: String,
                default: "cly-datepicker-test-id",
                required: false
            },
            allowPresets: {
                type: Boolean,
                default: true
            },
            allowCreatePresets: {
                type: Boolean,
                default: true
            },
            labelModeProp: {
                type: String,
                default: "mixed",
                validator: function(value) {
                    return ['mixed', 'absolute'].includes(value);
                }
            }
        },
        data: function() {
            var data = getInitialState(this);
            data.isVisible = false;
            data.commitTooltip = {};
            data.exceptionOffset = false;
            data.selectedPreset = null;
            return data;
        },
        watch: {
            'value': {
                immediate: true,
                handler: function(newVal) {
                    var val = newVal;
                    if (this.isGlobalDatePicker) {
                        try {
                            const latestDateRange = JSON.parse(localStorage.getItem("countly_date_range_mode_" + countlyCommon.ACTIVE_APP_ID));
                            if (latestDateRange.rangeMode === "inTheLast" && (latestDateRange.tableType === "hour" && !this.inTheLastHours || this.latestDateRange === "minute" && !this.inTheLastMinutes)) {
                                val = "30days";
                                this.doCommit(val, true);
                            }
                        }
                        catch (error) {
                            val = "30days";
                            this.doCommit(val, true);
                        }
                    }
                    this.loadValue(val);
                }
            },
            'type': function() {
                /*
                    Type change causes almost everything to change.
                    So we simply reinitialize the component.
                */
                Object.assign(this.$data, getInitialState(this));
                this.loadValue(this.value);
            },
            'isFuture': function() {
                Object.assign(this.$data, getInitialState(this));
                this.loadValue(this.value);
            },
            retentionConfiguration: function(newVal) {
                this.inTheLastInput.raw.text = "1";
                this.inTheLastInput.raw.level = newVal;
                this.tableType = this.tableTypeMapper[newVal];
            },
            'label': function() {
                this.$emit("change-label", {
                    label: this.label
                });
            }
        },
        methods: {
            loadValue: function(value) {
                if (!value) {
                    return;
                }
                var changes = this.valueToInputState(value),
                    self = this;
                changes.label = getRangeLabel(changes, this.type);

                Object.keys(changes).forEach(function(fieldKey) {
                    self[fieldKey] = changes[fieldKey];
                });
            },
            valueToInputState: function(value) {
                var excludeCurrentDay = false;
                if (value.period) {
                    excludeCurrentDay = value.exclude_current_day;
                    value = value.period;
                }
                if (this.allowPresets) {
                    if (this.selectedPreset) {
                        excludeCurrentDay = this.selectedPreset.exclude_current_day;
                    }
                    else if (this.isGlobalDatePicker) {
                        countlyPresets.refreshGlobalDatePreset();
                        let globalPreset = countlyPresets.getGlobalDatePreset();
                        excludeCurrentDay = globalPreset && globalPreset.exclude_current_day;
                    }
                }

                if (!excludeCurrentDay) {
                    var isShortcut = this.shortcuts && this.shortcuts.some(function(shortcut) {
                        return shortcut.value === value;
                    });
                    if (this.moveRangeTabsToLeftSide) {
                        this.customRangeSelection = false;
                    }
                    if (isShortcut) {
                        var shortcutRange = availableShortcuts[value].getRange();
                        return {
                            minDate: shortcutRange[0].toDate(),
                            maxDate: shortcutRange[1].toDate(),
                            selectedShortcut: value
                        };
                    }
                }

                if (Number.isFinite(value) || !this.isRange) {
                    value = [value, value];
                }

                var meta = countlyCommon.convertToTimePeriodObj(value),
                    now = moment().toDate(),
                    state = {
                        selectedShortcut: null,
                        customRangeSelection: true,
                        presetSelection: false,
                    };
                if (meta.type === "range") {
                    state.rangeMode = 'inBetween';
                    state.minDate = new Date(this.fixTimestamp(meta.value[0], "input"));
                    state.maxDate = new Date(this.fixTimestamp(meta.value[1], "input"));

                    state.inBetweenInput = {
                        raw: {
                            textStart: moment(state.minDate).format(this.formatter),
                            textEnd: moment(state.maxDate).format(this.formatter)
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                    this.moveRangeTabsToLeftSide ? state.selectedShortcut = "inBetween" : null;
                }
                else if (meta.type === "since") {
                    state.rangeMode = 'since';

                    state.minDate = new Date(this.fixTimestamp(meta.value.since, "input"));

                    state.maxDate = excludeCurrentDay ? moment().subtract(1, 'days').endOf("day").toDate() : now;
                    state.sinceInput = {
                        raw: {
                            text: moment(state.minDate).format(this.formatter),
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                    this.moveRangeTabsToLeftSide ? state.selectedShortcut = "since" : null;
                }
                else if (meta.type === "on") {
                    state.rangeMode = 'onm';

                    state.minDate = new Date(this.fixTimestamp(meta.value.on, "input"));

                    state.maxDate = state.minDate;
                    state.onmInput = {
                        raw: {
                            text: moment(state.minDate).format(this.formatter),
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                    this.moveRangeTabsToLeftSide ? state.selectedShortcut = "on" : null;
                }
                else if (meta.type === "before") {
                    state.rangeMode = 'before';
                    state.minDate = globalMin.toDate(); //new Date(this.fixTimestamp(meta.value.before, "input"));

                    state.maxDate = new Date(this.fixTimestamp(meta.value.before, "input"));//meta.value.before;
                    state.beforeInput = {
                        raw: {
                            text: moment(state.maxDate).format(this.formatter),
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                    this.moveRangeTabsToLeftSide ? state.selectedShortcut = "before" : null;
                }
                else if (meta.type === "last-n") {
                    state.rangeMode = 'inTheLast';
                    if (meta.level === "hours") {
                        state.minDate = moment().subtract(meta.value - 1, meta.level).startOf("hour").toDate();
                        state.maxDate = now;
                    }
                    else if (meta.level === "minutes") {
                        state.minDate = moment().subtract(meta.value - 1, meta.level).startOf("minute").toDate();
                        state.maxDate = now;
                    }
                    else {
                        let startOf = meta.level === "weeks" ? "isoWeek" : meta.level.slice(0, -1) || "day";
                        state.minDate = moment().subtract((meta.value - 1), meta.level).startOf(startOf).toDate();
                        state.maxDate = excludeCurrentDay ? moment().subtract(1, 'days').endOf("day").toDate() : now;
                    }
                    state.inTheLastInput = {
                        raw: {
                            text: meta.value + '',
                            level: meta.level
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                    if (this.moveRangeTabsToLeftSide && meta.value === "0days") {
                        state.selectedShortcut = "0days";
                    }
                    else if (this.moveRangeTabsToLeftSide) {
                        state.selectedShortcut = "inTheLast";
                    }
                }
                else if (availableShortcuts[value]) {
                    /*
                        Shortcuts values should be mapped to a real date range for the cases shortcuts are disabled. 
                    */
                    var effectiveShortcutRange = availableShortcuts[value].getRange();
                    state.rangeMode = 'inBetween';
                    state.minDate = effectiveShortcutRange[0].toDate();
                    state.maxDate = effectiveShortcutRange[1].toDate();
                    state.inBetweenInput = {
                        raw: {
                            textStart: effectiveShortcutRange[0].format(this.formatter),
                            textEnd: effectiveShortcutRange[1].format(this.formatter)
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                }
                state.minTime = new Date(state.minDate.getTime());
                state.labelMode = excludeCurrentDay ? "absolute" : this.labelModeProp;
                return state;
            },
            handleDropdownHide: function(aborted) {
                if (this.tableType !== ("hour" || "minute") && !this.retentionConfiguration) {
                    this.tableType = "day";
                }
                this.abortPicking();
                this.clearCommitWarning(true);
                if (aborted) {
                    this.loadValue(this.value);
                }
                this.isVisible = false;
            },
            refreshCalendarDOM: function() {
                if (this.customRangeSelection) {
                    var self = this;
                    this.$nextTick(function() {
                        if (self.$refs && self.$refs.dropdown && self.$refs.dropdown.$refs && self.$refs.dropdown.$refs.popper && self.$refs.dropdown.$refs.popper.$el) {
                            self.$refs.dropdown.$refs.popper.$el.style = '';
                        }
                        self.broadcast('ElSelectDropdown', 'updatePopper');
                        self.$forceUpdate();
                        if (self.rangeMode === "before") {
                            self.scrollTo(self.maxDate);
                        }
                        else {
                            self.scrollTo(self.minDate);
                        }
                    });
                }
            },
            handleDropdownShow: function() {
                this.isVisible = true;
                if (this.isGlobalDatePicker) {
                    this.presetSelection = this.allowPresets && countlyPresets.getGlobalDatePresetId() !== null;
                }
                else {
                    this.presetSelection = this.allowPresets && this.selectedPreset !== null;
                }
                this.customRangeSelection = this.allowCustomRange && !this.presetSelection;
                this.refreshCalendarDOM();
                if (this.retentionConfiguration) {
                    this.tableType = this.tableTypeMapper[this.retentionConfiguration] || "day";
                    if (this.retentionConfiguration !== "days") {
                        this.inputDisable = true;
                    }
                }
                if (this.isGlobalDatePicker) {
                    try {
                        var storedDateItems = JSON.parse(localStorage.getItem("countly_date_range_mode_" + countlyCommon.ACTIVE_APP_ID));
                        var inTheLastInputLevelMapper = {"year": "years", "month": "months", "week": "weeks", "day": "days", "hour": "hours", "minute": "minutes"};
                        this.rangeMode = storedDateItems.rangeMode;
                        this.tableType = storedDateItems.tableType;
                        if (this.rangeMode === "inTheLast") {
                            this.inTheLastInput.raw.level = inTheLastInputLevelMapper[storedDateItems.tableType];
                            this.setCurrentInTheLast(this.minDate, this.maxDate);
                        }
                        else {
                            this.tableType = "day"; //in case of chosen inBetween-montly in retention
                        }
                    }
                    catch (error) {
                        this.rangeMode = "inBetween";
                    }
                }
                if (this.displayOneMode && this.displayOneMode.length) {
                    this.rangeMode = this.displayOneMode;
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
                else if (this.tableType === ("hour" || "minute")) {
                    this.formatter = "YYYY-MM-DD";
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
            handleCustomRangeClick: function() {
                if (this.allowCustomRange) {
                    if (this.allowPresets) {
                        this.customRangeSelection = !this.customRangeSelection;
                        this.presetSelection = !this.customRangeSelection;
                    }
                    else if (!this.customRangeSelection) {
                        this.customRangeSelection = true;
                    }
                    this.refreshCalendarDOM();
                }
            },
            handlePresetClick: function() {
                if (this.allowPresets) {
                    this.presetSelection = !this.presetSelection;
                    if (this.allowCustomRange) {
                        this.customRangeSelection = !this.presetSelection;
                    }
                    this.refreshCalendarDOM();
                }
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
                if (this.moveRangeTabsToLeftSide) {
                    this.handleCustomTabChange(value);
                }
                else {
                    if (value) {
                        this.doCommit(value, true);
                    }
                }
            },
            handleCustomTabChange: function(val) {
                var self = this;
                if (val === "0days") {
                    this.doCommit(val, true);
                    return;
                }
                this.rangeMode = val;
                this.customRangeSelection = true;
                this.presetSelection = false;
                setTimeout(function() {
                    self.abortPicking();
                    self.handleUserInputUpdate();
                }, 0);
            },
            handleTabChange: function() {
                var self = this;
                if (!this.retentionConfiguration && this.rangeMode !== "inTheLast") {
                    this.formatter = "YYYY-MM-DD";
                    this.tableType = "day";
                    this.globalRange = this.isFuture ? globalFutureDaysRange : globalDaysRange;
                    setTimeout(function() {
                        self.scrollTo(self.inTheLastInput.parsed[0]);
                    }, 0);
                }
                this.abortPicking();
                this.handleUserInputUpdate();
            },
            fixTimestamp: function(value, mode) {
                if (!this.offsetCorrection && this.timestampFormat === "ms") {
                    return value;
                }

                var newValue = value;
                if (this.timestampFormat === "s") {
                    if (mode === "output") {
                        newValue = Math.floor(value / 1000);
                    }
                    else { // mode === "input"
                        newValue = value * 1000;
                    }
                }
                return newValue;
            },
            mergeDateTime: function(oDate, oTime) {
                return new Date(
                    oDate.getFullYear(),
                    oDate.getMonth(),
                    oDate.getDate(),
                    oTime.getHours(),
                    oTime.getMinutes(),
                    oTime.getSeconds()
                );
            },
            handleConfirmClick: function(event, isPreset) {
                if (this.rangeMode === 'inBetween') {
                    //var _minDate = new Date(this.minDate.setHours(0,0));
                    var _maxDate = new Date(this.maxDate);
                    var currentDate = new Date(_maxDate.getTime());
                }
                if (this.rangeMode === 'inBetween' || (this.modelMode === "absolute")) {
                    var effectiveMinDate = this.isTimePickerEnabled ? this.mergeDateTime(this.minDate, this.minTime) : this.minDate;
                    if (this.tableType === "minute" || this.tableType === "hour") {
                        this.maxDate = new Date(); // take current date as max
                    }
                    else if (this.type === "date" && !this.selectTime) {
                        effectiveMinDate.setHours(23, 59);
                        this.maxDate.setHours(23, 59);
                    }
                    this.doCommit([
                        this.fixTimestamp(effectiveMinDate.valueOf(), "output"),
                        this.fixTimestamp(currentDate ? currentDate.valueOf() : this.maxDate.valueOf(), "output")
                    ], false, isPreset);
                }
                else if (this.rangeMode === 'since') {
                    this.doCommit({ since: this.fixTimestamp(this.minDate.valueOf(), "output") }, false, isPreset);
                }
                else if (this.rangeMode === 'inTheLast') {
                    this.doCommit(this.inTheLastInput.raw.text + this.inTheLastInput.raw.level, false, isPreset);
                }
                else if (this.rangeMode === 'onm') {
                    this.doCommit({ on: this.fixTimestamp(this.minDate.valueOf(), "output") }, false, isPreset);
                }
                else if (this.rangeMode === 'before') {
                    this.doCommit({ before: this.fixTimestamp(this.maxDate.valueOf(), "output") }, false, isPreset);
                }
            },
            handleDiscardClick: function() {
                this.doDiscard();
            },
            triggerCommitWarning: function(errorType) {
                var self = this;
                clearTimeout(self.commitTooltip._timeout);
                self.commitTooltip = {
                    show: true,
                    content: this.warnings[errorType],
                    trigger: 'manual'
                };
                self.commitTooltip._timeout = setTimeout(function() {
                    self.clearCommitWarning();
                }, 3000);
            },
            clearCommitWarning: function(destroyTimeout) {
                if (destroyTimeout) {
                    clearTimeout(this.commitTooltip._timeout);
                }
                this.commitTooltip = {};
            },
            doClose: function() {
                if (this.$refs.dropdown) {
                    this.$refs.dropdown.handleClose();
                }
                this.clearCommitWarning(true);
            },
            doDiscard: function() {
                this.handleDropdownHide(true);
                this.doClose();
            },
            doCommit: function(value, isShortcut, isPreset) {
                if (value) {
                    if (this.isRange && this.rangeLimits.maxLength && this.rangeLimits.maxLength.length === 2) {
                        var allowedMax = moment(this.minDate).add(this.rangeLimits.maxLength[0] + 1, this.rangeLimits.maxLength[1]);
                        if (allowedMax < moment(this.maxDate)) {
                            return this.triggerCommitWarning('maxLength');
                        }
                    }
                    var submittedVal = this.isRange ? value : value[0];
                    var effectiveMinDate = this.isTimePickerEnabled ? this.mergeDateTime(this.minDate, this.minTime) : this.minDate;
                    if (this.type === "date" && !this.selectTime) {
                        effectiveMinDate.setHours(23, 59);
                    }
                    this.$emit("input", submittedVal);
                    this.$emit("change", {
                        effectiveRange: [
                            this.fixTimestamp(effectiveMinDate.valueOf(), "output"),
                            this.fixTimestamp(this.maxDate.valueOf(), "output")
                        ],
                        isShortcut: isShortcut,
                        value: submittedVal,
                        label: this.label,
                        excludeCurrentDay: this.selectedPreset ? this.selectedPreset.exclude_current_day : false
                    });

                    if (this.isGlobalDatePicker) {
                        if (!isShortcut) {
                            localStorage.setItem("countly_date_range_mode_" + countlyCommon.ACTIVE_APP_ID, JSON.stringify({"rangeMode": this.rangeMode, "tableType": this.tableType}));
                        }
                        else {
                            localStorage.setItem("countly_date_range_mode_" + countlyCommon.ACTIVE_APP_ID, JSON.stringify({"rangeMode": "inBetween", "tableType": this.tableType}));
                        }
                    }

                    if (this.allowPresets && !isPreset) {
                        this.selectedPreset = null;
                        if (this.isGlobalDatePicker) {
                            countlyPresets.clearGlobalDatePresetId();
                        }
                    }

                    this.doClose();
                }
            },
            handleYearPick: function(val) {
                let minDate = moment(val, 'YYYY').startOf("year").toDate();
                let maxDate = moment().toDate();
                this.setCurrentInTheLast(minDate, maxDate);
                this.setCurrentInBetween(minDate, maxDate);
                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick({minDate, maxDate});
                this.minDate = minDate;
                this.maxDate = maxDate;
            },
            handlePresetSelected: function(preset) {
                this.selectedPreset = preset;
                this.loadValue(preset.range);
                this.handleConfirmClick(null, true);
                this.doClose();
            }
        },
        beforeDestroy: function() {
            this.clearCommitWarning(true);
        },
        template: CV.T('/javascripts/countly/vue/templates/datepicker.html')
    }));

    var globalDatepicker = countlyBaseComponent.extend({
        computed: {
            globalDate:
            {
                get: function() {
                    return this.$store.getters["countlyCommon/period"];
                },
                set: function(newVal) {
                    countlyCommon.setPeriod(newVal);
                }
            }
        },
        methods: {
            onChange: function() {
                this.$root.$emit("cly-date-change");
            }
        },
        template: '<cly-date-picker is-global-date-picker v-bind="$attrs" timestampFormat="ms" :disabled-shortcuts="[\'0days\']" modelMode="absolute" v-model="globalDate" @change="onChange"></cly-date-picker>'
    });

    Vue.component("cly-date-picker-g", globalDatepicker);

    /*
        Remove the following component.
        Its only used by
        - surveys
        - cly-panel (deprecated)
    */
    Vue.component("cly-global-date-selector-w", globalDatepicker);

    Vue.component("cly-time-picker", {
        props: {
            width: {
                type: Number,
                default: 100,
                required: false
            },
            format: {
                type: String,
                default: 'HH:mm',
                required: false
            },
            clearable: {
                type: Boolean,
                default: false,
                required: false
            },
            appendToBody: {
                type: Boolean,
                default: true,
                required: false
            },
            minDateValue: {
                type: Date
            },
            isFuture: {
                type: Boolean,
                default: false
            }
        },
        computed: {
            pickerOptions() {
                const defaultRange = { selectableRange: '00:00:00 - 23:59:00' };

                if (!this.minDateValue) {
                    return defaultRange;
                }

                const now = moment();
                const minDateMoment = moment(this.minDateValue);
                const isToday = minDateMoment.isSame(now, 'day');

                if (this.isFuture && isToday) {
                    return {
                        selectableRange: `${now.format('HH:mm:ss')} - 23:59:00`
                    };
                }

                return defaultRange;
            }
        },
        template: `
                <el-time-picker
                    :append-to-body="appendToBody"
                    :clearable="clearable"
                    :format="format"
                    :picker-options="pickerOptions"
                    :style="{\'width\': width + \'px\'}"
                    class="cly-vue-time-picker"
                    v-bind="$attrs"
                    v-on="$listeners"
                >
                </el-time-picker>`
    });


    /**
     * Returns the period label for a given period input
     * @param {String|Object|Array} period The period input (string, object, or array of timestamps)
     * @param {Boolean} excludeCurrentDay Whether to exclude the current day from the period
     * @param {String} labelMode The label mode (mixed or absolute)
     * @returns {String} Period label
     */
    function getPeriodLabel(period, excludeCurrentDay, labelMode) {
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

    countlyVue.getPeriodLabel = getPeriodLabel;

}(window.countlyVue = window.countlyVue || {}));