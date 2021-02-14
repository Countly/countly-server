/* global Vue, ELEMENT, moment */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;


    Vue.component("cly-daterangepicker", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        components: {
            'date-table': ELEMENT.DateTable
        },
        template: '<div class="cly-vue-daterp">\
                    <div class="cly-vue-daterp__shortcuts-col">\
                        <div class="text-medium font-weight-bold" v-for="shortcut in shortcuts" @click="handleShortcutClick(shortcut.value)">{{shortcut.label}}</div>\
                    </div>\
                    <div class="cly-vue-daterp__calendars-col">\
                        <div class="cly-vue-daterp__input-methods">\
                            <el-tabs>\
                                <el-tab-pane name="in-between">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In Between</span></template>\
                                    <el-input size="small"></el-input> and <el-input size="small"></el-input>\
                                </el-tab-pane>\
                                <el-tab-pane name="since">\
                                    <template slot="label"><span class="text-medium font-weight-bold">Since</span></template>\
                                    <el-input size="small"></el-input>\
                                </el-tab-pane>\
                                <el-tab-pane name="in-the-last">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In The Last</span></template>\
                                    <el-input size="small"></el-input> <el-input size="small"></el-input>\
                                </el-tab-pane>\
                            </el-tabs>\
                        </div>\
                        <el-scrollbar\
                            wrap-class="cly-vue-daterp__table-wrap"\
                            view-class="cly-vue-daterp__table-view">\
                            <div class="cly-vue-daterp__table-wrap" style="height: 248px">\
                                <div class="cly-vue-daterp__table-view">\
                                    <div :key="item.key" v-for="item in globalRange">\
                                        <span class="text-medium">{{ item.title }}</span>\
                                        <date-table \
                                            selection-mode="range"\
                                            :date="item.date"\
                                            :min-date="minDate"\
                                            :max-date="maxDate"\
                                            :range-state="rangeState"\
                                            @pick="handleRangePick"\
                                            @changerange="handleChangeRange">\
                                        </date-table>\
                                    </div>\
                                </div>\
                            </div>\
                        </el-scrollbar>\
                    </div>\
                </div>',
        data: function() {
            var maxYearsBack = 1,
                globalRange = [],
                globalMin = moment().subtract(maxYearsBack, 'y').startOf("M"),
                globalMax = moment(),
                cursor = moment(globalMin.toDate());

            while (cursor < globalMax) {
                cursor = cursor.add(1, "M");
                globalRange.push({
                    date: cursor.toDate(),
                    title: cursor.format("MMMM, YYYY"),
                    key: cursor.unix()
                });
            }
            return {
                rangeState: {
                    endDate: null,
                    selecting: false,
                    row: null,
                    column: null
                },
                minDate: moment().subtract(1, 'M').startOf("M").toDate(),
                maxDate: globalMax.toDate(),
                globalRange: globalRange,
                shortcuts: [
                    {label: moment().subtract(1, "days").format("Do"), value: "yesterday"},
                    {label: this.i18n("common.today"), value: "hour"},
                    {label: this.i18n("taskmanager.last-7days"), value: "7days"},
                    {label: this.i18n("taskmanager.last-30days"), value: "30days"},
                    {label: this.i18n("taskmanager.last-60days"), value: "60days"},
                    {label: moment().format("MMMM, YYYY"), value: "day"},
                    {label: moment().year(), value: "month"},
                ]
            };
        },
        methods: {
            handleRangePick: function(val) {
                var defaultTime = this.defaultTime || [];
                var minDate = ELEMENT.DateUtil.modifyWithTimeString(val.minDate, defaultTime[0]);
                var maxDate = ELEMENT.DateUtil.modifyWithTimeString(val.maxDate, defaultTime[1]);

                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick(val);
                this.maxDate = maxDate;
                this.minDate = minDate;

                // workaround for https://github.com/ElemeFE/element/issues/7539, should remove this block when we don't have to care about Chromium 55 - 57
                setTimeout(function() {
                    this.maxDate = maxDate;
                    this.minDate = minDate;
                }, 10);
            },
            handleChangeRange: function(val) {
                this.minDate = val.minDate;
                this.maxDate = val.maxDate;
                this.rangeState = val.rangeState;
            },
            handleShortcutClick: function() {

            }
        }
    }));


}(window.countlyVue = window.countlyVue || {}));
