/* global Vue, ELEMENT, moment, countlyCommon, _, CV */

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
            inTheLastInput: {
                raw: {
                    text: '1',
                    level: 'months'
                },
                parsed: [minDate, maxDate]
            },
        };
        state.label = getRangeLabel(state, this.type);
        return state;
    }

    var globalDaysRange = [],
        globalMonthsRange = [],
        globalFutureDaysRange = [],
        globalFutureMonthsRange = [],
        globalMin = moment([2010, 0, 1]),
        globalMax = moment().endOf('day'),
        globalFutureMin = moment().startOf('day'),
        globalFutureMax = moment().startOf('day').add(10, "y"),
        daysCursor = moment(globalMin.toDate()),
        monthsCursor = moment(globalMin.toDate());

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

    Object.freeze(globalDaysRange);
    Object.freeze(globalMonthsRange);
    Object.freeze(globalFutureDaysRange);
    Object.freeze(globalFutureMonthsRange);

    /**
     * Creates an initial state object 
     * @param {Object} instance Instance configuration
     * @returns {Object} Initial state object for datepicker
     */
    function getInitialState(instance) {
        var formatter = null,
            tableType = "",
            globalRange = null;

        if (instance.type.includes("month")) {
            formatter = "YYYY-MM";
            tableType = "month";
            globalRange = instance.isFuture ? globalFutureMonthsRange : globalMonthsRange;
        }
        else {
            formatter = "YYYY-MM-DD";
            tableType = "date";
            globalRange = instance.isFuture ? globalFutureDaysRange : globalDaysRange;
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

        if (!state.rangeMode || state.rangeMode === 'inBetween') {
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
                    inputObj = this.inBetweenInput.parsed;
                    break;
                case 'since':
                    inputObj = this.sinceInput.parsed;
                    break;
                case 'onm':
                    inputObj = this.onmInput.parsed;
                    break;
                case 'inTheLast':
                    inputObj = this.inTheLastInput.parsed;
                    break;
                default:
                    return;
                }

                if (scrollToDate) {
                    this.scrollTo(scrollToDate);
                }
                else if (inputObj[0]) {
                    this.scrollTo(inputObj[0]);
                }

                if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] <= inputObj[1]) {
                    this.minDate = inputObj[0];
                    this.maxDate = inputObj[1];
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
            'inTheLastInput.raw': {
                deep: true,
                handler: function(newVal) {
                    var parsed = moment().subtract(newVal.text, newVal.level).startOf("day");
                    if (!parsed.isSame(moment(this.inTheLastInput.parsed[0]))) {
                        if (parsed && parsed.isValid()) {
                            this.inTheLastInput.parsed[0] = parsed.toDate();
                            this.handleUserInputUpdate(this.inTheLastInput.parsed[0]);
                        }
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
                    singleSelectRange = this.rangeMode === "since" || this.rangeMode === "onm";

                if (!singleSelectRange) {
                    this.rangeMode = "inBetween";
                }
                if (firstClick) {
                    this.rangeBackup = {
                        minDate: this.minDate,
                        maxDate: this.maxDate
                    };
                }
                var minDate, maxDate;
                if (firstClick) {
                    if (this.tableType === "date") {
                        minDate = moment(val.minDate).startOf("day").toDate();
                        maxDate = moment(val.minDate).endOf("day").toDate();
                    }
                    else {
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

                    this.setCurrentInBetween(minDate, maxDate);
                }
                else {
                    if (this.tableType === "date") {
                        minDate = moment(val.minDate).startOf("day").toDate();
                        maxDate = moment(val.maxDate).endOf("day").toDate();
                    }
                    else {
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
                if (this.tableType === "month") {
                    anchorClass = ".anchor-" + moment(date).startOf("year").unix();
                }
                else {
                    anchorClass = ".anchor-" + moment(date).startOf("month").unix();
                }
                this.$refs.vs.scrollIntoView(anchorClass);
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
            'month-table': monthTableComponent
        },
        computed: {
            isStartFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "start";
            },
            isEndFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "end";
            },
            shortcuts: function() {
                if (this.type === "daterange" && this.displayShortcuts) {
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
                return moment.weekdaysMin();
            },
            warnings: function() {
                if (this.isRange && this.rangeLimits.maxLength && this.rangeLimits.maxLength.length === 2) {
                    var lengthStr = this.rangeLimits.maxLength[0] + ' ' + CV.i18n('common.buckets.' + this.rangeLimits.maxLength[1]);
                    return {'maxLength': CV.i18n('common.range-length-limit', lengthStr)};
                }
                return {};
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
                    return ['date', 'daterange', 'month', 'monthrange'].includes(value);
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
            }
        },
        data: function() {
            var data = getInitialState(this);
            data.isVisible = false;
            data.commitTooltip = {};
            data.exceptionOffset = false;
            return data;
        },
        watch: {
            'value': {
                immediate: true,
                handler: function(newVal) {
                    this.loadValue(newVal);
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
            }
        },
        methods: {
            loadValue: function(value) {
                var changes = this.valueToInputState(value),
                    self = this;

                changes.label = getRangeLabel(changes, this.type);

                Object.keys(changes).forEach(function(fieldKey) {
                    self[fieldKey] = changes[fieldKey];
                });
            },
            valueToInputState: function(value) {

                var isShortcut = this.shortcuts && this.shortcuts.some(function(shortcut) {
                    return shortcut.value === value;
                });

                if (isShortcut) {
                    var shortcutRange = availableShortcuts[value].getRange();
                    return {
                        minDate: shortcutRange[0].toDate(),
                        maxDate: shortcutRange[1].toDate(),
                        selectedShortcut: value,
                        customRangeSelection: false
                    };
                }

                if (Number.isFinite(value) || !this.isRange) {
                    value = [value, value];
                }

                var meta = countlyCommon.convertToTimePeriodObj(value),
                    now = moment().toDate(),
                    state = {
                        selectedShortcut: null,
                        customRangeSelection: true
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
                }
                else if (meta.type === "since") {
                    state.rangeMode = 'since';

                    state.minDate = new Date(this.fixTimestamp(meta.value.since, "input"));


                    state.maxDate = now;
                    state.sinceInput = {
                        raw: {
                            text: moment(state.minDate).format(this.formatter),
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
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
                }
                else if (meta.type === "last-n") {
                    state.rangeMode = 'inTheLast';
                    state.minDate = moment().subtract(meta.value, meta.level).startOf("day").toDate();
                    state.maxDate = now;
                    state.inTheLastInput = {
                        raw: {
                            text: meta.value + '',
                            level: meta.level
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
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
                return state;
            },
            handleDropdownHide: function(aborted) {
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
                        self.broadcast('ElSelectDropdown', 'updatePopper');
                        self.$forceUpdate();
                        self.scrollTo(self.minDate);
                    });
                }
            },
            handleDropdownShow: function() {
                this.isVisible = true;
                this.refreshCalendarDOM();
            },
            handleCustomRangeClick: function() {
                if (this.allowCustomRange) {
                    this.customRangeSelection = true;
                    this.refreshCalendarDOM();
                }
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
                if (value) {
                    this.doCommit(value, true);
                }
            },
            handleTabChange: function() {
                this.abortPicking();
                this.handleUserInputUpdate();
            },
            fixTimestamp: function(value, mode) {
                if (!this.offsetCorrection && this.timestampFormat === "ms") {
                    return value;
                }

                var newValue = value;

                if (this.exceptionOffset) {
                    if (mode === "output") {
                        newValue = newValue - countlyCommon.getOffsetCorrectionForTimestamp(newValue);
                    }
                    else {
                        if (this.timestampFormat === "s") {
                            return newValue * 1000;
                        }
                        else {
                            return newValue;
                        }
                    }
                }

                if (this.timestampFormat === "s") {
                    if (mode === "output") {
                        newValue = Math.floor(value / 1000);
                    }
                    else { // mode === "input"
                        newValue = value * 1000;
                    }
                }

                if (this.offsetCorrection) {
                    if (mode === "output") {
                        newValue = newValue - countlyCommon.getOffsetCorrectionForTimestamp(newValue);
                    }
                    else { // mode === "input" 
                        newValue = newValue + countlyCommon.getOffsetCorrectionForTimestamp(newValue);
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
            handleConfirmClick: function() {
                if (this.rangeMode === 'inBetween') {
                    var _minDate = new Date(this.minDate);
                    var _maxDate = new Date(this.maxDate);

                    // case of custom range is selected by same day
                    if (_maxDate.getTime() - _minDate.getTime() <= 86400000) {
                        this.exceptionOffset = false;
                    }
                    else {
                        this.exceptionOffset = true;
                        var currentDate = new Date(_maxDate.getTime());
                        currentDate.setDate(_maxDate.getDate() - 1);
                    }
                }
                if (this.rangeMode === 'inBetween' || this.modelMode === "absolute") {
                    var effectiveMinDate = this.isTimePickerEnabled ? this.mergeDateTime(this.minDate, this.minTime) : this.minDate;
                    this.doCommit([
                        this.fixTimestamp(effectiveMinDate.valueOf(), "output"),
                        this.fixTimestamp(currentDate ? currentDate.valueOf() : this.maxDate, "output")
                    ], false);
                }
                else if (this.rangeMode === 'since') {
                    this.doCommit({ since: this.fixTimestamp(this.minDate.valueOf(), "output") }, false);
                }
                else if (this.rangeMode === 'inTheLast') {
                    this.doCommit(this.inTheLastInput.raw.text + this.inTheLastInput.raw.level, false);
                }
                else if (this.rangeMode === 'onm') {
                    this.doCommit({ on: this.fixTimestamp(this.minDate.valueOf(), "output") }, false);
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
                this.$refs.dropdown.handleClose();
                this.clearCommitWarning(true);
            },
            doDiscard: function() {
                this.handleDropdownHide(true);
                this.doClose();
            },
            doCommit: function(value, isShortcut) {
                if (value) {
                    if (this.isRange && this.rangeLimits.maxLength && this.rangeLimits.maxLength.length === 2) {
                        var allowedMax = moment(this.minDate).add(this.rangeLimits.maxLength[0] + 1, this.rangeLimits.maxLength[1]);
                        if (allowedMax < moment(this.maxDate)) {
                            return this.triggerCommitWarning('maxLength');
                        }
                    }
                    var submittedVal = this.isRange ? value : value[0];
                    var effectiveMinDate = this.isTimePickerEnabled ? this.mergeDateTime(this.minDate, this.minTime) : this.minDate;
                    this.$emit("input", submittedVal);
                    this.$emit("change", {
                        effectiveRange: [
                            this.fixTimestamp(effectiveMinDate.valueOf(), "output"),
                            this.fixTimestamp(this.maxDate.valueOf(), "output")
                        ],
                        isShortcut: isShortcut,
                        value: submittedVal
                    });
                    this.doClose();
                }
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
        template: '<cly-date-picker v-bind="$attrs" timestampFormat="ms" :disabled-shortcuts="[\'0days\']" modelMode="absolute" v-model="globalDate" @change="onChange"></cly-date-picker>'
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
            }
        },
        template: '<el-time-picker :append-to-body="appendToBody" :style="{\'width\': width + \'px\'}" class="cly-vue-time-picker" v-bind="$attrs" v-on="$listeners" :format="format" :clearable="clearable"></el-time-picker>'
    });

}(window.countlyVue = window.countlyVue || {}));
