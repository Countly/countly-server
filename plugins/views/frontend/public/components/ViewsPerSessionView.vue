<template>
    <div v-bind:class="[componentId]">
        <cly-header :title="i18n('views-per-session.title')"
            :tooltip="{description: i18n('views-per-session.description')}">
        </cly-header>
        <cly-main>
            <cly-date-picker-g style="margin-bottom:32px"></cly-date-picker-g>
            <cly-section>
                <cly-chart-bar test-id="chart-views-per-session" :option="viewsPerSessionOptions" :height="400"
                    v-loading="isLoading" :force-loading="isLoading"></cly-chart-bar>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="datatable-views-per-session" :rows="viewsPerSessionRows" :resizable="true"
                    :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column :sortable="true" prop="viewsBuckets"
                            :label="i18n('views-per-session.table-views-buckets')" :sort-method="sortSessionViewsBuckets">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-views-per-session-' + scope.$index">
                                    {{scope.row.viewsBuckets}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="numberOfSessions"
                            :label="i18n('common.number-of-sessions')">
                            <template slot-scope="scope">
                                <div
                                    :data-test-id="'datatable-views-per-session-number-of-sessions-' + scope.$index">
                                    {{formatNumber(scope.row.numberOfSessions)}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="percentage" :label="i18n('common.percent')">
                            <template slot-scope="scope">
                                <div class="bu-level-left">
                                    <div class="bu-level-item slipping-away-users-table-data-item" :data-test-id="'datatable-views-per-session-percent-' + scope.$index">
                                        <span>{{scope.row.percentage}}%</span>
                                    </div>
                                    <cly-progress-bar :data-test-id="'datatable-views-per-session-progress-bar-' + scope.$index" :percentage="parseInt(scope.row.percentage)"
                                        :color="progressBarColor"> </cly-progress-bar>
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
import { i18nMixin, autoRefreshMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClyChartBar from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyProgressBar from '../../../../../frontend/express/public/javascripts/components/progress/progress-bar.vue';

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
    mixins: [i18nMixin, autoRefreshMixin, commonFormattersMixin],
    data: function() {
        return {
            progressBarColor: "#017AFF"
        };
    },
    computed: {
        viewsPerSession: function() {
            return this.$store.state.countlyViewsPerSession.viewsPerSession;
        },
        isLoading: function() {
            return this.$store.getters['countlyViewsPerSession/isLoading'];
        },
        viewsPerSessionRows: function() {
            return this.$store.state.countlyViewsPerSession.viewsPerSession.rows;
        },
        viewsPerSessionOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisViewsPerSessionBuckets,
                    axisLabel: {
                        color: "#333C48"
                    }
                },
                series: this.yAxisViewsPerSessionCountSerie
            };
        },
        xAxisViewsPerSessionBuckets: function() {
            return this.$store.state.countlyViewsPerSession.viewsPerSession.rows.map(function(tableRow) {
                return tableRow.viewsBuckets;
            });
        },
        yAxisViewsPerSessionCountSerie: function() {
            return this.viewsPerSession.series.map(function(viewsPerSessionSerie) {
                return {
                    data: viewsPerSessionSerie.data,
                    name: viewsPerSessionSerie.label,
                };
            });
        },
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyViewsPerSession/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlyViewsPerSession/fetchAll', true);
        },
        sortSessionViewsBuckets: function(a, b) {
            return a.weight - b.weight;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlyViewsPerSession/fetchAll', true);
    },
};
</script>
