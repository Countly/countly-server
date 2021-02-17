/* global Vue, ELEMENT, moment, countlyCommon */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins,
        availableDateFormats = ['MMDDYYYY', 'MM-DD-YYYY', 'MM/DD/YYYY', 'MMDDYY', 'MM-DD-YY', 'MM/DD/YYYY'];

    /**
     * Attempts to parse the provided string using one of the available date formats.
     * @param {String} rawString String value to be parsed
     * @returns {Object} Moment object 
     */
    function tryParsingDate(rawString) {
        return moment(rawString, availableDateFormats, true);
    }

    var dateTableComponent = {
        props: {
            dateMeta: Object,
            rangeState: Object
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
                        <el-date-table ref="elDateTable" :range-state="rangeState" v-if="visible" v-bind="$attrs" v-on="$listeners">\
                        </el-date-table>\
                        <div v-if="!visible" style="height:180px"></div>\
                    </div>',
    };

    Vue.component("cly-daterangepicker", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        components: {
            'date-table': dateTableComponent
        },
        props: {
            value: [Object, String, Array]
        },
        template: '<div class="cly-vue-daterp" :class="{\'cly-vue-daterp--custom-selection\': !selectedShortcut}">\
                    <div class="cly-vue-daterp__shortcuts-col">\
                        <div class="text-medium font-weight-bold cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom"\
                            @click="handleShortcutClick()">\
                            Custom Range<i class="el-icon-caret-right"></i>\
                        </div>\
                        <div class="text-medium font-weight-bold cly-vue-daterp__shortcut"\
                            :class="{\'cly-vue-daterp__shortcut--active\': selectedShortcut == shortcut.value}"\
                            v-for="shortcut in shortcuts"\
                            @click="handleShortcutClick(shortcut.value)">\
                            {{shortcut.label}}\
                        </div>\
                    </div>\
                    <div class="cly-vue-daterp__calendars-col" v-if="!selectedShortcut">\
                        <div class="cly-vue-daterp__input-methods">\
                            <el-tabs v-model="rangeMode" @tab-click="handleTabChange">\
                                <el-tab-pane name="inBetween">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In Between</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model="inBetweenInput.raw.textStart"></el-input>\
                                        <span class="text-medium cly-vue-daterp__in-between-conj">and</span>\
                                        <el-input size="small" v-model="inBetweenInput.raw.textEnd"></el-input>\
                                    </div>\
                                </el-tab-pane>\
                                <el-tab-pane name="since">\
                                    <template slot="label"><span class="text-medium font-weight-bold">Since</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model="sinceInput.raw.text"></el-input>\
                                    </div>\
                                </el-tab-pane>\
                                <el-tab-pane name="inTheLast">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In the Last</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model.number="inTheLastInput.raw.text"></el-input>\
                                        <el-select size="small" v-model="inTheLastInput.raw.level">\
                                            <el-option label="Days" value="days"></el-option>\
                                            <el-option label="Weeks" value="weeks"></el-option>\
                                            <el-option label="Months" value="months"></el-option>\
                                        </el-select>\
                                    </div>\
                                </el-tab-pane>\
                            </el-tabs>\
                            <div class="cly-vue-daterp__day-names-wrapper">\
                                <table class="cly-vue-daterp__day-names"><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></table>\
                            </div>\
                        </div>\
                        <div class="cly-vue-daterp__calendars-wrapper">\
                            <div class="cly-vue-daterp__table-wrap" style="height: 248px">\
                                <vue-scroll ref="vs" :ops="scrollOps">\
                                    <div class="cly-vue-daterp__table-view">\
                                        <date-table\
                                            v-for="item in globalRange"\
                                            :key="item.key"\
                                            :date-meta="item"\
                                            in-viewport-root-margin="10% 0%"\
                                            selection-mode="range"\
                                            :date="item.date"\
                                            :min-date="minDate"\
                                            :max-date="maxDate"\
                                            :range-state="rangeState"\
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
                </div>',
        data: function() {
            var globalRange = [],
                globalMin = moment([2010, 0, 1]),
                globalMax = moment(),
                cursor = moment(globalMin.toDate()),
                now = moment().toDate();

            while (cursor < globalMax) {
                cursor = cursor.add(1, "M");
                globalRange.push({
                    date: cursor.toDate(),
                    title: cursor.format("MMMM, YYYY"),
                    key: cursor.unix()
                });
            }
            return {
                // Calendar state

                minDate: moment().subtract(1, 'month').toDate(),
                maxDate: globalMax.toDate(),

                rangeState: {
                    endDate: null,
                    selecting: false,
                    row: null,
                    column: null
                },

                rangeBackup: {
                    minDate: null,
                    maxDate: null
                },

                scrollOps: {
                    scrollPanel: { scrollingX: false},
                    bar: {minSize: 0.2, background: 'rgba(129,134,141,.3)'}
                },

                // Time constants

                now: now,
                globalRange: globalRange,

                // Shortcuts

                selectedShortcut: null,
                shortcuts: [
                    {label: this.i18n("common.yesterday"), value: "yesterday"},
                    {label: this.i18n("common.today"), value: "hour"},
                    {label: this.i18n("taskmanager.last-7days"), value: "7days"},
                    {label: this.i18n("taskmanager.last-30days"), value: "30days"},
                    {label: this.i18n("taskmanager.last-60days"), value: "60days"},
                    {label: moment().format("MMMM, YYYY"), value: "day"},
                    {label: moment().year(), value: "month"},
                ],

                // User input

                rangeMode: 'inBetween',
                inBetweenInput: {
                    raw: {
                        textStart: '',
                        textEnd: ''
                    },
                    parsed: [null, null]
                },
                sinceInput: {
                    raw: {
                        text: '',
                    },
                    parsed: [null, now]
                },
                inTheLastInput: {
                    raw: {
                        text: '',
                        level: 'days'
                    },
                    parsed: [null, now]
                },
            };
        },
        watch: {
            'inBetweenInput.raw.textStart': function(newVal) {
                var needsSync = newVal !== moment(this.inBetweenInput.parsed[0]).format("MM/DD/YYYY");
                if (needsSync) {
                    var parsed = tryParsingDate(newVal);
                    if (parsed && parsed.isValid()) {
                        this.inBetweenInput.parsed[0] = parsed.toDate();
                        this.handleUserInputUpdate(this.inBetweenInput.parsed[0]);
                    }
                }
            },
            'inBetweenInput.raw.textEnd': function(newVal) {
                var needsSync = newVal !== moment(this.inBetweenInput.parsed[1]).format("MM/DD/YYYY");
                if (needsSync) {
                    var parsed = tryParsingDate(newVal);
                    if (parsed && parsed.isValid()) {
                        this.inBetweenInput.parsed[1] = parsed.toDate();
                        this.handleUserInputUpdate(this.inBetweenInput.parsed[1]);
                    }
                }
            },
            'sinceInput.raw.text': function(newVal) {
                var parsed = tryParsingDate(newVal);
                if (parsed && parsed.isValid()) {
                    this.sinceInput.parsed[0] = parsed.toDate();
                    this.handleUserInputUpdate(this.sinceInput.parsed[0]);
                }
            },
            'inTheLastInput.raw': {
                deep: true,
                handler: function(newVal) {
                    var parsed = moment().subtract(newVal.text, newVal.level);
                    if (parsed && parsed.isValid()) {
                        this.inTheLastInput.parsed[0] = parsed.toDate();
                        this.handleUserInputUpdate(this.inTheLastInput.parsed[0]);
                    }
                }
            },
            'value': {
                immediate: true,
                handler: function(newVal) {
                    this.loadValue(newVal);
                }
            }
        },
        methods: {
            loadValue: function(value) {
                var isShortcut = this.shortcuts.some(function(shortcut) {
                    return shortcut.value === value;
                });

                if (isShortcut) {
                    this.selectedShortcut = value;
                }
                else {
                    var meta = countlyCommon.convertToTimePeriodObj(value),
                        now = moment().toDate(),
                        rangeMode = 'inBetween',
                        minDate = moment().subtract(1, 'month').toDate(),
                        maxDate = now,
                        sinceInput = {
                            raw: {
                                text: moment(minDate).format("MM/DD/YYYY"),
                            },
                            parsed: [minDate, maxDate]
                        },
                        inTheLastInput = {
                            raw: {
                                text: '1',
                                level: 'months'
                            },
                            parsed: [minDate, maxDate]
                        };

                    if (meta.type === "range") {
                        rangeMode = 'inBetween';
                        minDate = new Date(meta.value[0] * 1000);
                        maxDate = new Date(meta.value[1] * 1000);
                    }
                    else if (meta.type === "since") {
                        rangeMode = 'since';
                        minDate = new Date(meta.value.since * 1000);
                        sinceInput = {
                            raw: {
                                text: moment(minDate).format("MM/DD/YYYY"),
                            },
                            parsed: [minDate, maxDate]
                        };
                    }
                    else if (meta.type === "last-n") {
                        rangeMode = 'inTheLast';
                        minDate = moment().subtract(meta.value, meta.level).toDate();
                        inTheLastInput = {
                            raw: {
                                text: meta.value + '',
                                level: meta.level
                            },
                            parsed: [minDate, maxDate]
                        };
                    }

                    this.now = now;
                    this.rangeMode = rangeMode;
                    this.minDate = minDate;
                    this.maxDate = maxDate;
                    this.inBetweenInput = {
                        raw: {
                            textStart: moment(minDate).format("MM/DD/YYYY"),
                            textEnd: moment(maxDate).format("MM/DD/YYYY")
                        },
                        parsed: [minDate, maxDate]
                    };
                    this.sinceInput = sinceInput;
                    this.inTheLastInput = inTheLastInput;
                }

            },
            scrollTo: function(date) {
                var anchorClass = ".anchor-" + moment(date).startOf("month").unix();
                this.$refs.vs.scrollIntoView(anchorClass);
            },
            handleRangePick: function(val) {
                this.rangeMode = "inBetween";
                if (!this.rangeState.selecting) {
                    this.rangeBackup = {
                        minDate: this.minDate,
                        maxDate: this.maxDate
                    };
                }
                var defaultTime = this.defaultTime || [];
                var minDate = ELEMENT.DateUtil.modifyWithTimeString(val.minDate, defaultTime[0]);
                var maxDate = ELEMENT.DateUtil.modifyWithTimeString(val.maxDate, defaultTime[1]);

                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick(val);
                this.maxDate = maxDate;
                this.minDate = minDate;
            },
            handleChangeRange: function(val) {
                this.minDate = val.minDate;
                this.maxDate = val.maxDate;
                this.rangeState = val.rangeState;

                var startsAt, endsAt;

                if (this.minDate < this.rangeState.endDate) {
                    startsAt = this.minDate;
                    endsAt = this.rangeState.endDate;
                }
                else {
                    startsAt = this.rangeState.endDate;
                    endsAt = this.minDate;
                }

                this.inBetweenInput = {
                    raw: {
                        textStart: moment(startsAt).format("MM/DD/YYYY"),
                        textEnd: moment(endsAt).format("MM/DD/YYYY")
                    },
                    parsed: [startsAt, endsAt]
                };
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
                if (value) {
                    this.doCommit(value);
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

                if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] < inputObj[1]) {
                    this.minDate = inputObj[0];
                    this.maxDate = inputObj[1];
                }
            },
            abortPicking: function() {
                if (this.rangeState.selecting) {
                    this.rangeState = {
                        endDate: null,
                        selecting: false,
                        row: null,
                        column: null
                    };
                    this.minDate = this.rangeBackup.minDate;
                    this.maxDate = this.rangeBackup.maxDate;
                    this.rangeBackup = {
                        minDate: null,
                        maxDate: null
                    };
                    this.inBetweenInput = {
                        raw: {
                            textStart: moment(this.minDate).format("MM/DD/YYYY"),
                            textEnd: moment(this.maxDate).format("MM/DD/YYYY")
                        },
                        parsed: [this.minDate, this.maxDate]
                    };
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
                // reload value
            },
            doDiscard: function() {
            },
            doCommit: function(value) {
                if (this.value) {
                    this.$emit("input", value);
                }
            }
        }
    }));


}(window.countlyVue = window.countlyVue || {}));
