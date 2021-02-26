/* global Vue, ELEMENT, moment, countlyCommon, _ */

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
                return [moment().startOf("day").subtract(7, "d"), moment().endOf("day")];
            }
        },
        "30days": {
            label: countlyVue.i18n("taskmanager.last-30days"),
            value: "30days",
            getRange: function() {
                return [moment().startOf("day").subtract(30, "d"), moment().endOf("day")];
            }
        },
        "60days": {
            label: countlyVue.i18n("taskmanager.last-60days"),
            value: "60days",
            getRange: function() {
                return [moment().startOf("day").subtract(60, "d"), moment().endOf("day")];
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

        return {
            // User input
            now: now,
            selectedShortcut: null,
            customRangeSelection: true,
            rangeMode: 'inBetween',
            minDate: minDate,
            maxDate: maxDate,
            label: getRangeLabel([minDate, maxDate]),
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
            inTheLastInput: {
                raw: {
                    text: '1',
                    level: 'months'
                },
                parsed: [minDate, maxDate]
            },
        };
    }

    function getInitialState(instance) {
        var globalRange = [],
            globalMin = moment([2010, 0, 1]),
            globalMax = moment(),
            cursor = moment(globalMin.toDate()),
            formatter = null,
            tableType = "";

        if (instance.type === "monthrange") {
            formatter = "YYYY-MM";
            tableType = "month";
            while (cursor < globalMax) {
                globalRange.push({
                    date: cursor.toDate(),
                    title: cursor.format("YYYY"),
                    key: cursor.unix()
                });
                cursor = cursor.add(1, "Y");
            }
        }
        else {
            formatter = "YYYY-MM-DD";
            tableType = "date";
            while (cursor < globalMax) {
                globalRange.push({
                    date: cursor.toDate(),
                    title: cursor.format("MMMM YYYY"),
                    key: cursor.unix()
                });
                cursor = cursor.add(1, "M");
            }
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
            globalMin: globalMin,
            globalMax: globalMax
        };

        return _.extend(state, getDefaultInputState(formatter));
    }

    function getRangeLabel(value) {
        var effectiveRange = [moment(value[0]), moment(value[1])];
        if (effectiveRange[1] - effectiveRange[0] > 86400000) {
            return effectiveRange[0].format("ll") + " - " + effectiveRange[1].format("ll");
        }
        else {
            return effectiveRange[0].format("lll") + " - " + effectiveRange[1].format("lll");
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
        template: '<div class="cly-vue-daterp__date-table-wrapper" :class="[\'anchor-\' + dateMeta.key]">\
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
            tryParsing: function(newVal, target, index) {
                var parsedRange = target.parsed;
                var needsSync = newVal !== moment(parsedRange[index]).format(this.formatter);
                if (needsSync) {
                    var parsed = moment(newVal);
                    if (parsed && parsed.isValid() && (parsed >= this.globalMin) && (parsed <= this.globalMax)) {
                        target.raw['invalid' + index] = false;
                        parsedRange[index] = parsed.toDate();
                        this.handleUserInputUpdate(parsedRange[index]);
                    }
                    else {
                        target.raw['invalid' + index] = true;
                    }
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
            handleUserInputUpdate: function(scrollToDate) {
                var inputObj = null;

                switch (this.rangeMode) {
                case 'inBetween':
                    inputObj = this.inBetweenInput.parsed;
                    break;
                case 'since':
                    inputObj = this.sinceInput.parsed;
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
            }
        },
        watch: {
            'inBetweenInput.raw.textStart': function(newVal) {
                this.tryParsing(newVal, this.inBetweenInput, 0);
            },
            'inBetweenInput.raw.textEnd': function(newVal) {
                this.tryParsing(newVal, this.inBetweenInput, 1);
            },
            'sinceInput.raw.text': function(newVal) {
                this.tryParsing(newVal, this.sinceInput, 0);
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
            handleRangePick: function(val) {
                this.rangeMode = "inBetween";
                var firstClick = !this.rangeState.selecting;
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
            abortPicking: function() {
                if (this.rangeState.selecting) {
                    this.rangeState = {
                        endDate: null,
                        selecting: false,
                        row: null,
                        column: null,
                        focusOn: null
                    };
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

    Vue.component("cly-daterangepicker", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n,
            InputControlsMixin,
            CalendarsMixin
        ],
        components: {
            'date-table': dateTableComponent,
            'month-table': monthTableComponent
        },
        computed: {
            isStartFocused: function (){
                return this.rangeState.selecting && this.rangeState.focusOn === "start"; 
            },
            isEndFocused: function (){
                return this.rangeState.selecting && this.rangeState.focusOn === "end";
            },
            shortcuts: function() {
                if (this.type === "daterange" && this.displayShortcuts) {
                    return Object.keys(availableShortcuts).map(function(shortcutKey) {
                        return availableShortcuts[shortcutKey];
                    });
                }
                return [];
            }
        },
        props: {
            value: [Object, String, Array],
            type: {
                type: String,
                default: "daterange"
            },
            displayShortcuts: {
                type: Boolean,
                default: true
            },
            placeholder: {type: String, default: 'Select'},
            disabled: { type: Boolean, default: false},
            size: {type: String, default: 'small'}
        },
        data: function() {
            return getInitialState(this);
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
            }
        },
        methods: {
            loadValue: function(value) {
                var changes = this.valueToInputState(value),
                    self = this;

                changes.label = getRangeLabel([changes.minDate, changes.maxDate]);

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

                var meta = countlyCommon.convertToTimePeriodObj(value),
                    now = moment().toDate(),
                    state = {
                        selectedShortcut: null,
                        customRangeSelection: true
                    };

                if (meta.type === "range") {
                    state.rangeMode = 'inBetween';
                    state.minDate = new Date(meta.value[0] * 1000);
                    state.maxDate = new Date(meta.value[1] * 1000);
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
                    state.minDate = new Date(meta.value.since * 1000);
                    state.maxDate = now;
                    state.sinceInput = {
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
                        Shortcuts values should be mapped to a real date range if shortcuts are disabled. 
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
                return state;
            },
            handleDropdownHide: function(aborted) {
                this.abortPicking();
                if (aborted) {
                    this.loadValue(this.value);
                }
            },
            handleDropdownShow: function() {
                var self = this;
                this.$forceUpdate();
                this.$nextTick(function() {
                    self.scrollTo(self.minDate);
                });
            },
            handleCustomRangeClick: function() {
                this.customRangeSelection = true;
                var self = this;
                this.$nextTick(function() {
                    self.$forceUpdate();
                    self.scrollTo(self.minDate);
                });
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
                if (value) {
                    this.doCommit(value);
                }
            },
            handleTabChange: function() {
                this.abortPicking();
                this.handleUserInputUpdate();
            },
            handleConfirmClick: function() {
                if (this.rangeMode === 'inBetween') {
                    this.doCommit([Math.floor(this.minDate.valueOf() / 1000), Math.floor(this.maxDate.valueOf() / 1000)]);
                }
                else if (this.rangeMode === 'since') {
                    this.doCommit({ since: Math.floor(this.minDate.valueOf() / 1000) });
                }
                else if (this.rangeMode === 'inTheLast') {
                    this.doCommit(this.inTheLastInput.raw.text + this.inTheLastInput.raw.level);
                }
            },
            handleDiscardClick: function() {
                this.doDiscard();
            },
            doClose: function() {
                this.$refs.dropdown.handleClose();
            },
            doDiscard: function() {
                this.doClose();
            },
            doCommit: function(value) {
                if (this.value) {
                    this.$emit("input", value);
                    this.doClose();
                }
            }
        },
        template: '<cly-dropdown\
                        ref="dropdown"\
                        @hide="handleDropdownHide"\
                        @show="handleDropdownShow"\
                        :placeholder="placeholder"\
                        :disabled="disabled">\
                        <template v-slot:trigger="dropdown">\
                            <slot name="trigger">\
                                <cly-input-dropdown-trigger\
                                    ref="trigger"\
                                    :arrow="false"\
                                    :prefix-icon="\'el-icon-date\'"\
                                    :disabled="disabled"\
                                    :selected-options="label"\
                                    :focused="dropdown.focused"\
                                    :opened="dropdown.visible"\
                                    :size="size"\
                                    :placeholder="placeholder">\
                                </cly-input-dropdown-trigger>\
                            </slot>\
                        </template>\
                        <div class="cly-vue-daterp">\
                            <div class="cly-vue-daterp__shortcuts-col" v-if="shortcuts && shortcuts.length > 0">\
                                <div class="text-medium font-weight-bold cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom"\
                                    @click="handleCustomRangeClick">\
                                    Custom Range<i class="el-icon-caret-right"></i>\
                                </div>\
                                <div class="text-medium font-weight-bold cly-vue-daterp__shortcut"\
                                    :class="{\'cly-vue-daterp__shortcut--active\': selectedShortcut == shortcut.value}"\
                                    v-for="shortcut in shortcuts"\
                                    @click="handleShortcutClick(shortcut.value)">\
                                    {{shortcut.label}}\
                                </div>\
                            </div>\
                            <div class="cly-vue-daterp__calendars-col" v-if="customRangeSelection">\
                                <div class="cly-vue-daterp__input-methods">\
                                    <el-tabs v-model="rangeMode" @tab-click="handleTabChange">\
                                        <el-tab-pane name="inBetween">\
                                            <template slot="label"><span class="text-medium font-weight-bold">In Between</span></template>\
                                            <div class="cly-vue-daterp__input-wrapper">\
                                                <el-input size="small" :class="{\'is-active\': isStartFocused, \'is-error\': inBetweenInput.raw.invalid0}" @focus="handleTextStartFocus" @blur="handleTextStartBlur" v-model="inBetweenInput.raw.textStart"></el-input>\
                                                <span class="text-medium cly-vue-daterp__in-between-conj">and</span>\
                                                <el-input size="small" :class="{\'is-active\': isEndFocused, \'is-error\': inBetweenInput.raw.invalid1}" @focus="handleTextEndFocus" @blur="handleTextEndBlur" v-model="inBetweenInput.raw.textEnd"></el-input>\
                                            </div>\
                                        </el-tab-pane>\
                                        <el-tab-pane name="since">\
                                            <template slot="label"><span class="text-medium font-weight-bold">Since</span></template>\
                                            <div class="cly-vue-daterp__input-wrapper">\
                                                <el-input size="small" :class="{\'is-error\': sinceInput.raw.invalid0}" v-model="sinceInput.raw.text" @blur="handleSinceBlur"></el-input>\
                                            </div>\
                                        </el-tab-pane>\
                                        <el-tab-pane name="inTheLast">\
                                            <template slot="label"><span class="text-medium font-weight-bold">In the Last</span></template>\
                                            <div class="cly-vue-daterp__input-wrapper">\
                                                <el-input size="small" v-model.number="inTheLastInput.raw.text"></el-input>\
                                                <el-select size="small" v-model="inTheLastInput.raw.level">\
                                                    <el-option v-if="tableType === \'date\'" label="Days" value="days"></el-option>\
                                                    <el-option v-if="tableType === \'date\'" label="Weeks" value="weeks"></el-option>\
                                                    <el-option label="Months" value="months"></el-option>\
                                                </el-select>\
                                            </div>\
                                        </el-tab-pane>\
                                    </el-tabs>\
                                    <div class="cly-vue-daterp__day-names-wrapper" v-if="tableType === \'date\'">\
                                        <table class="cly-vue-daterp__day-names"><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></table>\
                                    </div>\
                                </div>\
                                <div class="cly-vue-daterp__calendars-wrapper">\
                                    <div class="cly-vue-daterp__table-wrap" :class="{\'is-start-focused\': isStartFocused, \'is-end-focused\': isEndFocused}" style="height: 248px" ref="calendarsViewport">\
                                        <vue-scroll ref="vs" :ops="scrollOps">\
                                            <div class="cly-vue-daterp__table-view" v-if="tableType === \'month\'">\
                                                <month-table\
                                                    v-for="item in globalRange"\
                                                    :key="item.key"\
                                                    :date-meta="item"\
                                                    :in-viewport-requires-root="true"\
                                                    :in-viewport-root="$refs.calendarsViewport"\
                                                    selection-mode="range"\
                                                    :date="item.date"\
                                                    :min-date="minDate"\
                                                    :max-date="maxDate"\
                                                    :rangeState="rangeState"\
                                                    @pick="handleRangePick"\
                                                    @changerange="handleChangeRange">\
                                                </month-table>\
                                            </div>\
                                            <div class="cly-vue-daterp__table-view" v-else>\
                                                <date-table\
                                                    v-for="item in globalRange"\
                                                    :key="item.key"\
                                                    :date-meta="item"\
                                                    :in-viewport-requires-root="true"\
                                                    :in-viewport-root="$refs.calendarsViewport"\
                                                    selection-mode="range"\
                                                    :date="item.date"\
                                                    :min-date="minDate"\
                                                    :max-date="maxDate"\
                                                    :rangeState="rangeState"\
                                                    @pick="handleRangePick"\
                                                    @changerange="handleChangeRange">\
                                                </date-table>\
                                            </div>\
                                        </vue-scroll>\
                                    </div>\
                                </div>\
                                <div class="cly-vue-daterp__commit-section">\
                                    <el-button @click="handleDiscardClick" size="small">{{ i18n("common.cancel") }}</el-button>\
                                    <el-button @click="handleConfirmClick" type="primary" size="small">{{ i18n("common.confirm") }}</el-button>\
                                </div>\
                            </div>\
                        </div>\
                    </cly-dropdown>',
    }));

}(window.countlyVue = window.countlyVue || {}));
