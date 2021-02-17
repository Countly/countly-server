/* global Vue, ELEMENT, moment, _ */

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
                    </div>',
    };

    Vue.component("cly-daterangepicker", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        components: {
            'date-table': dateTableComponent
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
                            <el-tabs v-model="rangeMode" @tab-click="handleUserInputUpdate()">\
                                <el-tab-pane name="inBetween">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In Between</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model="inBetweenInput.raw.textStart"></el-input>\
                                        <span class="text-medium">and</span>\
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
                            <el-button @click="doDiscard" size="small">{{ i18n("common.cancel") }}</el-button>\
                            <el-button @click="doCommit" type="primary" size="small">{{ i18n("common.confirm") }}</el-button>\
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

                minDate: moment().subtract(1, 'month').startOf("month").toDate(),
                maxDate: globalMax.toDate(),

                rangeState: {
                    endDate: null,
                    selecting: false,
                    row: null,
                    column: null
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
            }
        },
        methods: {
            scrollTo: _.throttle(function(date) {
                var anchorClass = ".anchor-" + moment(date).startOf("month").unix();
                this.$refs.vs.scrollIntoView(anchorClass);
            }, 200),
            handleRangePick: function(val) {
                this.rangeMode = "inBetween";
                var defaultTime = this.defaultTime || [];
                var minDate = ELEMENT.DateUtil.modifyWithTimeString(val.minDate, defaultTime[0]);
                var maxDate = ELEMENT.DateUtil.modifyWithTimeString(val.maxDate, defaultTime[1]);

                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick(val);
                this.maxDate = maxDate;
                this.minDate = minDate;
                setTimeout(function() {
                    this.maxDate = maxDate;
                    this.minDate = minDate;
                }, 10);
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

                if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] < inputObj[1]) {
                    this.minDate = inputObj[0];
                    this.maxDate = inputObj[1];

                    if (scrollToDate) {
                        this.scrollTo(scrollToDate);
                    }
                    else {
                        this.scrollTo(inputObj[0]);
                    }
                }
            },
            doDiscard: function() {

            },
            doCommit: function() {

            }
        }
    }));


}(window.countlyVue = window.countlyVue || {}));
