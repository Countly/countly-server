<template>
    <div>
        <cly-header
            :title="i18n('session-durations.title')"
            :tooltip="{description: i18n('session-durations.description')}">
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="session-durations-date-picker-container"></cly-date-picker-g>
            <cly-section>
                <cly-chart-bar
                    test-id="chart-session-durations"
                    :option="sessionDurationsOptions"
                    :height="400"
                    v-loading="isLoading"
                    :force-loading="isLoading">
                </cly-chart-bar>
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="datatable-session-durations"
                    :rows="sessionDurationsRows"
                    :resizable="true"
                    :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column
                            :sortable="true"
                            prop="duration"
                            :label="i18n('common.session-duration')"
                            :sort-method="sortDurationBuckets">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-session-durations-session-duration-' + scope.$index">
                                    {{scope.row.duration}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="numberOfSessions"
                            :label="i18n('common.number-of-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-session-durations-number-of-sessions-' + scope.$index">
                                    {{formatNumber(scope.row.numberOfSessions)}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="numberOfSessions"
                            column-key="percentage"
                            :label="i18n('common.percent')">
                            <template slot-scope="scope">
                                <div class="bu-level-left">
                                    <div
                                        class="bu-level-item slipping-away-users-table-data-item"
                                        :data-test-id="'datatable-session-durations-percent-' + scope.$index">
                                        <span>{{scope.row.percentage}}%</span>
                                    </div>
                                    <cly-progress-bar
                                        :data-test-id="'datatable-session-durations-progress-bar-' + scope.$index"
                                        :percentage="parseInt(scope.row.percentage)"
                                        :color="progressBarColor">
                                    </cly-progress-bar>
                                </div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyProgressBar from '../../../javascripts/components/progress/progress-bar.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyChartBar,
        ClyDatatableN,
        ClyProgressBar
    },
    mixins: [countlyVue.mixins.commonFormatters, countlyVue.mixins.i18n, autoRefreshMixin],
    data: function() {
        return {
            progressBarColor: "#017AFF"
        };
    },
    computed: {
        sessionDurations: function() {
            return this.$store.state.countlySessionDurations.sessionDurations;
        },
        isLoading: function() {
            return this.$store.getters['countlySessionDurations/isLoading'];
        },
        sessionDurationsRows: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows;
        },
        sessionDurationsOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionDurationsPeriods,
                    axisLabel: {
                        color: "#333C48"
                    }
                },
                series: this.yAxisSessionDurationsCountSeries
            };
        },
        xAxisSessionDurationsPeriods: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows.map(function(tableRow) {
                return tableRow.duration;
            });
        },
        yAxisSessionDurationsCountSeries: function() {
            return this.sessionDurations.series.map(function(sessionDurationsSerie) {
                return {
                    data: sessionDurationsSerie.data,
                    name: sessionDurationsSerie.label,
                };
            });
        },
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionDurations/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionDurations/fetchAll', true);
        },
        sortDurationBuckets: function(a, b) {
            return a.weight - b.weight;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionDurations/fetchAll', true);
    }
};
</script>
