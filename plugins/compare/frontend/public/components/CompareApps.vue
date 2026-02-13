<template>
    <div>
        <cly-header>
            <cly-back-link
                slot="header-top"
                :title="i18n('compare.back')"
            ></cly-back-link>
            <template v-slot:header-bottom>
                <div class="bu-is-flex bu-is-align-items-center">
                    <h2 class="bu-mr-2"> {{i18n('compare.apps.title')}} </h2>
                    <cly-guide></cly-guide>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <div class="bu-mb-4 cly-vue-compare-apps">
                <el-select
                    style="width:620px"
                    v-model="value"
                    multiple
                    popper-class="cly-vue-compare-apps__compare__width"
                    filterable
                    default-first-option
                    :multiple-limit="maxLimit"
                    :placeholder="placeholder"
                >
                    <el-option
                        v-for="item in allCompareAppsList"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    >
                    </el-option>
                </el-select>
                <el-button
                    :disabled="value.length===0"
                    @click="compareApps"
                    class="cly-vue-compare-apps__button"
                    size="small"
                >{{i18n('compare.button')}}
                </el-button>
            </div>
            <div class="bu-pt-4 bu-mb-4">
                <cly-date-picker-g class="cly-vue-apps-all-date-picker"></cly-date-picker-g>
            </div>
            <div class="bu-pt-3 bu-mb-5">
                <span class="text-big font-weight-bold bu-pr-2">{{i18n('compare.results.by')}}</span>
                <el-select
                    :arrow="false"
                    :adaptiveLength="true"
                    v-model="selectedGraph"
                >
                    <el-option
                        v-for="item in availableMetrics"
                        :key="item.key"
                        :value="item.key"
                        :label="item.label"
                    >
                    </el-option>
                </el-select>
            </div>
            <cly-section>
                <div>
                    <cly-chart-time
                        :option="lineChartData"
                        :legend="lineLegend"
                        :force-loading="isChartLoading"
                        v-loading="isChartLoading"
                        category="applications"
                    ></cly-chart-time>
                </div>
            </cly-section>
            <cly-section>
                <detail-tables></detail-tables>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import CompareAppsTable from './CompareAppsTable.vue';

import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyBackLink from '../../../../../frontend/express/public/javascripts/components/helpers/cly-back-link.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyChartTime from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-time.vue';

export default {
    mixins: [countlyVue.mixins.i18n, autoRefreshMixin],
    components: {
        "detail-tables": CompareAppsTable,
        ClyHeader,
        ClyBackLink,
        ClyMain,
        ClyDatePickerG,
        ClySection,
        ClyChartTime,
    },
    methods: {
        compareApps: function() {
            this.$store.dispatch('countlyCompareApps/setTableLoading', true);
            this.$store.dispatch('countlyCompareApps/setChartLoading', true);
            this.$store.dispatch('countlyCompareApps/setSelectedApps', this.value);
            this.$store.dispatch('countlyCompareApps/fetchCompareAppsData');
        },
        dateChanged: function() {
            this.$store.dispatch('countlyCompareApps/setTableLoading', true);
            this.$store.dispatch('countlyCompareApps/setChartLoading', true);
            this.$store.dispatch('countlyCompareApps/fetchCompareAppsData');
        }
    },
    computed: {
        allCompareAppsList: function() {
            return this.$store.getters["countlyCommon/getAllApps"];
        },
        lineChartData: function() {
            return this.$store.getters["countlyCompareApps/lineChartData"];
        },
        lineLegend: function() {
            return this.$store.getters["countlyCompareApps/lineLegend"];
        },
        selectedGraph: {
            get: function() {
                var self = this;
                if (self.selectedMetric === "totalSessions") {
                    return this.i18n("compare.apps.results.by.total.sessions");
                }
                else if (self.selectedMetric === "totalVisitors") {
                    return this.i18n("compare.apps.results.by.total.visitors");
                }
                else if (self.selectedMetric === "newVisitors") {
                    return this.i18n("compare.apps.results.by.new.visitors");
                }
                else if (self.selectedMetric === "timeSpent") {
                    return this.i18n("compare.apps.results.by.time.spent");
                }
                return this.i18n("compare.apps.results.by.avg.session.duration");
            },
            set: function(selectedItem) {
                var self = this;
                this.$store.dispatch('countlyCompareApps/setTableLoading', true);
                this.$store.dispatch('countlyCompareApps/setChartLoading', true);
                var selectedApps = this.$store.getters["countlyCompareApps/selectedApps"];
                if (selectedItem === "totalSessions") {
                    self.selectedMetric = "totalSessions";
                    this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-sessions");
                    this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                }
                else if (selectedItem === "totalVisitors") {
                    self.selectedMetric = "totalVisitors";
                    this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-users");
                    this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                }
                else if (selectedItem === "newVisitors") {
                    self.selectedMetric = "newVisitors";
                    this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "new-users");
                    this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                }
                else if (selectedItem === "timeSpent") {
                    self.selectedMetric = "timeSpent";
                    this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-time-spent");
                    this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                }
                else {
                    self.selectedMetric = "avgSessionDuration";
                    this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "time-spent");
                    this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                }
            }
        },
        isChartLoading: function() {
            return this.$store.getters["countlyCompareApps/isChartLoading"];
        }
    },
    data: function() {
        return {
            value: "",
            maxLimit: 20,
            placeholder: this.i18n("compare.apps.maximum.placeholder"),
            availableMetrics: [
                { key: "totalSessions", label: this.i18n("compare.apps.results.by.total.sessions")},
                { key: "totalVisitors", label: this.i18n("compare.apps.results.by.total.visitors")},
                { key: "newVisitors", label: this.i18n("compare.apps.results.by.new.visitors")},
                { key: "timeSpent", label: this.i18n("compare.apps.results.by.time.spent")},
                { key: "avgSessionDuration", label: this.i18n("compare.apps.results.by.avg.session.duration")}
            ],
            selectedMetric: "totalSessions"
        };
    },
    beforeCreate: function() {
        this.$store.dispatch('countlyCompareApps/initializeTableStateMap');
    }
};
</script>
