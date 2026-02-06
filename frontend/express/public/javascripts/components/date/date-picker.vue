<template>
    <cly-dropdown
        v-tooltip="label"
        ref="dropdown"
        @hide="handleDropdownHide"
        @show="handleDropdownShow"
        :placement="placement"
        :pop-class="popClass"
        :placeholder="placeholder"
        :disabled="disabled"
        id="cly-datepicker"
    >
        <template v-slot:trigger="dropdown">
            <slot name="trigger">
                <cly-input-dropdown-trigger
                    ref="trigger"
                    :test-id="testId"
                    :adaptive-length="true"
                    :min-width="minInputWidth"
                    :max-width="maxInputWidth"
                    :arrow="true"
                    :prefix-icon="'cly-icon-date cly-icon-prefix-icon'"
                    :disabled="disabled"
                    :selected-options="label"
                    :focused="dropdown.focused"
                    :opened="dropdown.visible"
                    :size="size"
                    :placeholder="placeholder">
                </cly-input-dropdown-trigger>
            </slot>
        </template>
        <div class="cly-vue-daterp" :style="customStyle">
            <div class="cly-vue-daterp__shortcuts-col" v-if="shortcuts && shortcuts.length > 0">
                <div v-if="allowCustomRange && !moveRangeTabsToLeftSide" class="text-medium font-weight-bold cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom"
                :class="{'cly-vue-daterp__shortcut--active': customRangeSelection,  'cly-vue-daterp__shortcut--deactive': !customRangeSelection, 'cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom--override': enabledShortcuts.length === 1 || allowPresets}"
                @click="handleCustomRangeClick">
                <span :data-test-id="testId + '-select-date-custom-label'">{{$i18n('common.time-period-select.custom-range')}}</span><i class="el-icon-caret-right"></i>
                </div>
                <div v-if="allowPresets" class="text-medium font-weight-bold cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom"
                :class="{'cly-vue-daterp__shortcut--active': presetSelection,  'cly-vue-daterp__shortcut--deactive': !presetSelection}"
                @click="handlePresetClick">
                    <span :data-test-id="testId + '-select-date-custom-label'">{{$i18n('common.time-period-select.presets')}}</span><i class="el-icon-caret-right"></i>
                </div>
                <div class="text-medium font-weight-bold cly-vue-daterp__shortcut"
                    :class="{'cly-vue-daterp__shortcut--active': selectedShortcut == shortcut.value, 'cly-vue-daterp__shortcut--deactive': customRangeSelection && !moveRangeTabsToLeftSide}"
                    v-for="shortcut in shortcuts"
                    :key="shortcut.value"
                    @click="handleShortcutClick(shortcut.value)">
                    <span :data-test-id="testId + '-select-date-' +  shortcut.label.toString().replace(/[\s,]+/g, '-').toLowerCase() + '-button'">{{shortcut.label}}</span>
                </div>
            </div>
            <div class="cly-vue-daterp__calendars-col" v-if="(isVisible && customRangeSelection)">
                <div class="cly-vue-daterp__input-methods" :class="{'cly-vue-daterp__hidden-tabs': !showRelativeModes || !isRange}">
                    <el-tabs v-model="rangeMode" :class="{'cly-vue-daterp__tab-list' : allowOnSelection || allowBeforeSelection}" @tab-click="handleTabChange" v-if="!moveRangeTabsToLeftSide">
                        <el-tab-pane name="inBetween">
                            <template slot="label">
                                <span :data-test-id="testId+ '-select-date-tab-in-between'" class="text-medium font-weight-bold">{{$i18n('common.time-period-select.range')}}</span>
                            </template>
                            <div class="cly-vue-daterp__input-wrapper">
                                <template v-if="isRange && !displayOneMode">
                                    <el-input :test-id="testId + '-in-between-start-date-input'" size="small" :disabled="inputDisable" :class="{'is-active': isStartFocused, 'is-error': inBetweenInput.raw.invalid0}" @focus="handleTextStartFocus" @blur="handleTextStartBlur" v-model="inBetweenInput.raw.textStart"></el-input>
                                    <span :data-test-id="testId + '-in-between-and-span'" class="text-medium cly-vue-daterp__in-between-conj">{{$i18n('common.and')}}</span>
                                    <el-input :test-id="testId + '-in-between-end-date-input'" size="small" :disabled="inputDisable" :class="{'is-active': isEndFocused, 'is-error': inBetweenInput.raw.invalid1}" @focus="handleTextEndFocus" @blur="handleTextEndBlur" v-model="inBetweenInput.raw.textEnd"></el-input>
                                </template>
                                <template v-else>
                                    <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-baseline" style="width:100%">
                                        <div>
                                            <span :data-test-id="testId + '-in-between-start-date-label'" class="text-medium">{{$i18n('common.' + type)}}</span>
                                        </div>
                                        <div>
                                            <el-input :test-id="testId + '-in-between-start-date-input'" size="small" :class="{'is-active': isStartFocused, 'is-error': inBetweenInput.raw.invalid0}" @focus="handleTextStartFocus" @blur="handleTextStartBlur" v-model="inBetweenInput.raw.textStart"></el-input>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane name="before" v-if="allowBeforeSelection">
                            <template slot="label">
                                <span :data-test-id="testId + '-select-date-tab-before'" class="text-medium font-weight-bold">{{$i18n('common.time-period-select.before')}}</span>
                            </template>
                            <div class="cly-vue-daterp__input-wrapper">
                                <el-input :test-id="testId + '-before-start-date-input'" size="small" :disabled="inputDisable" :class="{'is-error': beforeInput.raw.invalid0}" v-model="beforeInput.raw.text"></el-input>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane name="since">
                            <template slot="label">
                                <span :data-test-id="testId + '-select-date-tab-since'"  class="text-medium font-weight-bold">{{$i18n('common.time-period-select.since')}}</span>
                            </template>
                            <div class="cly-vue-daterp__input-wrapper">
                                <el-input :test-id="testId + '-since-start-date-input'" size="small" :disabled="inputDisable" :class="{'is-error': sinceInput.raw.invalid0}" v-model="sinceInput.raw.text" @blur="handleSinceBlur"></el-input>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane name="inTheLast">
                            <template slot="label">
                                <span :data-test-id="testId + '-select-date-tab-in-the-last'" class="text-medium font-weight-bold">{{$i18n('common.time-period-select.last-n')}}</span>
                            </template>
                            <div v-if="!retentionConfiguration" class="cly-vue-daterp__input-wrapper bu-is-justify-content-center">
                                <validation-provider name="startDate" v-slot="v" rules="required|integer|min_value:0|max_value:99999">
                                    <el-input class="in-the-last-start-date bu-mr-2" :class="{'is-error': v.errors.length > 0}" :test-id="testId + '-in-the-last-start-date-input'" size="small" v-model.number="inTheLastInput.raw.text"></el-input>
                                </validation-provider>
                                <el-select class="in-the-last-start-date" :test-id="testId + '-in-the-last-start-date'" size="small" v-model="inTheLastInput.raw.level">
                                    <el-option v-if="inTheLastMinutes" :label="$i18n('common.buckets.minutes')" value="minutes"></el-option>
                                    <el-option v-if="inTheLastHours" :label="$i18n('common.buckets.hours')" value="hours"></el-option>
                                    <el-option :label="$i18n('common.buckets.days')" value="days"></el-option>
                                    <el-option :label="$i18n('common.buckets.weeks')" value="weeks"></el-option>
                                    <el-option :label="$i18n('common.buckets.months')" value="months"></el-option>
                                    <el-option :label="$i18n('common.buckets.years')" value="years"></el-option>
                                </el-select>
                            </div>
                            <div v-else class="cly-vue-daterp__input-wrapper bu-is-justify-content-flex-end">
                                <el-input :test-id="testId + '-in-the-last-start-date-input'" size="small" style="width: 100px;" v-model.number="inTheLastInput.raw.text"></el-input>
                                <span class="text-medium bu-ml-2">{{retentionConfiguration}}</span>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane name="onm" v-if="allowOnSelection">
                            <template slot="label"><span class="text-medium font-weight-bold">{{$i18n('common.time-period-select.on')}}</span></template>
                            <div class="cly-vue-daterp__input-wrapper">
                                <el-input :test-id="testId + '-select-date-range-onm-start-date'" size="small" :class="{'is-error': onmInput.raw.invalid0}" v-model="onmInput.raw.text" @blur="handleOnmBlur"></el-input>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                    <div v-if="moveRangeTabsToLeftSide" class="cly-vue-daterp__input-wrapper">
                        <div v-if="rangeMode === 'inBetween'" class="cly-vue-daterp__input-wrapper-content">
                            <el-input :test-id="testId + '-select-date-range-in-between-start-date'" size="small" :disabled="inputDisable" :class="{'is-active': isStartFocused, 'is-error': inBetweenInput.raw.invalid0}" @focus="handleTextStartFocus" @blur="handleTextStartBlur" v-model="inBetweenInput.raw.textStart"></el-input>
                            <span :data-test-id="testId + '-select-date-range-in-between-and-label'" class="text-medium cly-vue-daterp__in-between-conj">{{$i18n('common.and')}}</span>
                            <el-input size="small" :test-id="testId + '-select-date-range-in-between-end-date'" :disabled="inputDisable" :class="{'is-active': isEndFocused, 'is-error': inBetweenInput.raw.invalid1}" @focus="handleTextEndFocus" @blur="handleTextEndBlur" v-model="inBetweenInput.raw.textEnd"></el-input>
                        </div>
                        <el-input :test-id="testId + '-before-date-raw'" v-if="rangeMode === 'before'" size="small" :disabled="inputDisable" :class="{'is-error': beforeInput.raw.invalid0}" v-model="beforeInput.raw.text"></el-input>
                        <el-input v-if="rangeMode === 'since'" :test-id="testId + '-since-date-raw'" size="small" :disabled="inputDisable" :class="{'is-error': sinceInput.raw.invalid0}" v-model="sinceInput.raw.text" @blur="handleSinceBlur"></el-input>
                        <div v-if="rangeMode === 'inTheLast'" class="cly-vue-daterp__input-wrapper-content">
                            <el-input size="small" :test-id="testId + '-in-the-last-date-raw'" v-model.number="inTheLastInput.raw.text"></el-input>
                            <el-select size="small" v-model="inTheLastInput.raw.level" :test-id="testId + '-in-the-last-date-input'">
                                <el-option v-if="inTheLastMinutes" :label="$i18n('common.buckets.minutes')" value="minutes"></el-option>
                                <el-option v-if="inTheLastHours" :label="$i18n('common.buckets.hours')" value="hours"></el-option>
                                <el-option :label="$i18n('common.buckets.days')" value="days"></el-option>
                                <el-option :label="$i18n('common.buckets.weeks')" value="weeks"></el-option>
                                <el-option :label="$i18n('common.buckets.months')" value="months"></el-option>
                                <el-option :label="$i18n('common.buckets.years')" value="years"></el-option>
                            </el-select>
                        </div>
                    </div>
                    <div class="cly-vue-daterp__day-names-wrapper" v-if="tableType === 'day' || tableType === 'week'">
                        <table class="cly-vue-daterp__day-names">
                            <tr>
                                <th v-for="dayName in weekdays" :key="dayName">{{ dayName }}</th>
                            </tr>
                        </table>
                    </div>
                </div>
                <div :class="[!(tableType === 'minute' || tableType === 'hour') && 'cly-vue-daterp__calendars-wrapper']" :style="tableType === 'hour' || tableType === 'minute' ? {'border-bottom': '1px solid #ececec'} : {}">
                    <div class="cly-vue-daterp__table-wrap" :class="{'is-point': !isRange, 'is-start-focused': isStartFocused, 'is-end-focused': isEndFocused}" style="height: 238px" :style="setMinuteAndHourStyle" ref="calendarsViewport">
                        <vue-scroll ref="vs" :ops="scrollOps">
                            <div class="cly-vue-daterp__table-view" v-if="tableType === 'year'">
                                <year-table
                                    v-for="item in globalRange"
                                    :key="item.key"
                                    :date-meta="item"
                                    :in-viewport-requires-root="true"
                                    :in-viewport-root="$refs.calendarsViewport"
                                    selection-mode="years"
                                    :date="item.date"
                                    :disabled-date="disabledDateFn"
                                    :min-date="minDate"
                                    :max-date="maxDate"
                                    @pick="handleYearPick">
                                </year-table>
                            </div>
                            <div class="cly-vue-daterp__table-view" v-else-if="tableType === 'month'">
                                <month-table
                                    v-for="item in globalRange"
                                    :key="item.key"
                                    :date-meta="item"
                                    :in-viewport-requires-root="true"
                                    :in-viewport-root="$refs.calendarsViewport"
                                    selection-mode="range"
                                    :date="item.date"
                                    :min-date="minDate"
                                    :max-date="maxDate"
                                    :disabled-date="disabledDateFn"
                                    :rangeState="rangeState"
                                    @pick="handleRangePick"
                                    @changerange="handleChangeRange">
                                </month-table>
                            </div>
                            <div class="cly-vue-daterp__table-view" v-else-if="tableType === 'day' || tableType === 'week'">
                                <date-table
                                    v-for="item in globalRange"
                                    :key="item.key"
                                    :date-meta="item"
                                    :in-viewport-requires-root="true"
                                    :in-viewport-root="$refs.calendarsViewport"
                                    selection-mode="range"
                                    :date="item.date"
                                    :min-date="minDate"
                                    :first-day-of-week="1"
                                    :max-date="maxDate"
                                    :disabled-date="disabledDateFn"
                                    :rangeState="rangeState"
                                    @pick="handleRangePick"
                                    @changerange="handleChangeRange">
                                </date-table>
                            </div>
                        </vue-scroll>
                    </div>
                </div>
                <div v-if="isTimePickerEnabled" class="cly-vue-daterp__time-picker-section">
                    <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-baseline" style="width:100%">
                        <div>
                            <span class="text-medium">{{$i18n('common.time')}}</span>
                        </div>
                        <div>
                            <cly-time-picker align="right" :width="100" v-model="minTime" :min-date-value="minDate" :is-future="isFuture"></cly-time-picker>
                        </div>
                    </div>
                </div>
                <div v-if="warnings" class="bu-mt-4 bu-mx-4" style="text-align: right;" :style="setMinuteAndHourStyle">
                    <span class="text-medium" v-for="(warning, key) in warnings" :key="key">{{warning}}</span>
                </div>
                <div class="cly-vue-daterp__commit-section">
                    <el-button :data-test-id="testId + '-select-date-cancel-button'" @click="handleDiscardClick" class="cly-vue-daterp__cancel-button color-cool-gray-100 bg-warm-gray-20" size="small">{{ $i18n("common.cancel") }}</el-button>
                    <el-button :data-test-id="testId + '-select-date-apply-range-button'" @click="handleConfirmClick" v-tooltip="commitTooltip" class="cly-vue-daterp__confirm-button" type="success" size="small">{{ !isRange ? $i18n("common.apply") : $i18n("common.apply-range") }}</el-button>
                </div>
            </div>
            <date-presets-list v-if="(isVisible && presetSelection && allowPresets)" @preset-selected="handlePresetSelected" :local-preset-id="selectedPreset && selectedPreset._id" :is-global-date-picker="isGlobalDatePicker" :allow-create="allowCreatePresets"></date-presets-list>
        </div>
    </cly-dropdown>
</template>

<script>
import moment from 'moment';
import countlyCommon from '../../countly/countly.common.js';
import DateTable from './date-table.vue';
import MonthTable from './month-table.vue';
import YearTable from './year-table.vue';
import vuescroll from 'vuescroll';
import {
    availableShortcuts,
    globalMin,
    globalFutureMin,
    globalFutureMax,
    globalDaysRange,
    globalMonthsRange,
    globalYearsRange,
    globalFutureDaysRange,
    globalFutureMonthsRange,
    globalFutureYearsRange,
    getRangeLabel,
    getInitialState,
    InputControlsMixin,
    CalendarsMixin
} from './mixins.js';

export default {
    mixins: [
        InputControlsMixin,
        CalendarsMixin,
        window.ELEMENT.utils.Emitter // TO-DO: window reference will be removed and it will be imported after vue 3 migration
    ],
    components: {
        'date-table': DateTable,
        'month-table': MonthTable,
        'year-table': YearTable,
        'vue-scroll': vuescroll
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
                    window.countlyPresets.refreshGlobalDatePreset();
                    let globalPreset = window.countlyPresets.getGlobalDatePreset();
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
                state.minDate = globalMin.toDate();

                state.maxDate = new Date(this.fixTimestamp(meta.value.before, "input"));
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
                this.presetSelection = this.allowPresets && window.countlyPresets.getGlobalDatePresetId() !== null;
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
                        this.tableType = "day";
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
                else {
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
                var _maxDate = new Date(this.maxDate);
                var currentDate = new Date(_maxDate.getTime());
            }
            if (this.rangeMode === 'inBetween' || (this.modelMode === "absolute")) {
                var effectiveMinDate = this.isTimePickerEnabled ? this.mergeDateTime(this.minDate, this.minTime) : this.minDate;
                if (this.tableType === "minute" || this.tableType === "hour") {
                    this.maxDate = new Date();
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
                        window.countlyPresets.clearGlobalDatePresetId();
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
    }
};
</script>
