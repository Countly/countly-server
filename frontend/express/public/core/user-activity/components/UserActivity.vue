<template>
    <div>
        <cly-header
            :title="i18n('user-activity.title')"
            :tooltip="{description: i18n('user-activity.description')}"
        >
        </cly-header>
        <cly-main>
            <cly-qb-bar feature="core" v-if="showDrillFilter" class="bu-mb-5" v-model="userActivityFilters" queryStore="user-activity" format="mongo" style="margin-bottom:32px" :propertySourceConfig="{'wrappedUserProperties': false}" :show-in-the-last-hours="true" :show-in-the-last-minutes="true"></cly-qb-bar>
            <cly-section>
                <cly-chart-bar test-id="user-activity" :option="userActivityOptions" :height="400" v-loading="isLoading" :force-loading="isLoading"></cly-chart-bar>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="user-activity" :rows="userActivityRows" :exportFormat="formatExportFunction" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="bucket" :label="i18n('user-activity.table-session-count')">
                            <template slot-scope="scope">
                                <div class="bu-columns bu-is-gapless">
                                    <div class="bu-column bu-is-2" :data-test-id="'datatable-user-activity-session-count-' + scope.$index">
                                        <span>{{scope.row.bucket}}</span>
                                    </div>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="all" :label="i18n('user-activity.table-all-users')">
                            <template slot-scope="scope">
                                <div class="bu-level">
                                    <div class="bu-is-flex user-activity-table__data-item-container">
                                        <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-user-activity-all-users-value-' + scope.$index">
                                            <span>{{formatNumber(scope.row.all)}}</span>
                                        </div>
                                        <div class="bu-is-flex user-activity-table__divider" :data-test-id="'datatable-user-activity-all-users-divider-' + scope.$index">
                                            <span>|</span>
                                        </div>
                                        <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-user-activity-all-users-percentage-' + scope.$index">
                                            <span>{{formatPercentage(scope.row.all/seriesTotal.all)}}%</span>
                                        </div>
                                    </div>
                                    <cly-progress-bar :data-test-id="'datatable-user-activity-all-users-progress-bar-' + scope.$index" :percentage="formatPercentage(scope.row.all/seriesTotal.all)" :color="progressBarColor"> </cly-progress-bar>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="thirtyDays" :label="i18n('user-activity.table-thirty-days')">
                            <template slot-scope="scope">
                                <div class="bu-level">
                                    <div class="bu-is-flex user-activity-table__data-item-container">
                                        <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-user-activity-active-users-thirty-days-value-' + scope.$index">
                                            <span>{{formatNumber(scope.row.thirtyDays)}}</span>
                                        </div>
                                        <div class="bu-level user-activity-table__divider " :data-test-id="'datatable-user-activity-active-users-thirty-days-divider-' + scope.$index">
                                            <span>|</span>
                                        </div>
                                        <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-user-activity-active-users-thirty-days-percentage-' + scope.$index">
                                            <span>{{formatPercentage(scope.row.thirtyDays/seriesTotal.thirtyDays)}}%</span>
                                        </div>
                                    </div>
                                    <cly-progress-bar :data-test-id="'datatable-user-activity-active-users-thirty-days-progress-bar-' + scope.$index" :percentage="formatPercentage(scope.row.thirtyDays/seriesTotal.thirtyDays)" :color="progressBarColor"> </cly-progress-bar>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="sevenDays" :label="i18n('user-activity.table-seven-days')">
                            <template slot-scope="scope">
                                    <div class="bu-level">
                                        <div class="bu-is-flex user-activity-table__data-item-container">
                                            <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-user-activity-active-users-seven-days-value-' + scope.$index">
                                                <span>{{formatNumber(scope.row.sevenDays)}}</span>
                                            </div>
                                            <div class="bu-level user-activity-table__divider" :data-test-id="'datatable-user-activity-active-users-seven-days-divider-' + scope.$index">
                                                <span>|</span>
                                            </div>
                                            <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-user-activity-active-users-seven-days-percentage-' + scope.$index">
                                                <span>{{formatPercentage(scope.row.sevenDays/seriesTotal.sevenDays)}}%</span>
                                            </div>
                                        </div>
                                        <cly-progress-bar :data-test-id="'datatable-user-activity-active-users-seven-days-progress-bar-' + scope.$index" :percentage="formatPercentage(scope.row.sevenDays/seriesTotal.sevenDays)" :color="progressBarColor"> </cly-progress-bar>
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
import countlyVue from '../../../javascripts/countly/vue/core.js';
import * as countlyAuth from '../../../javascripts/countly/countly.auth.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import app from '../../../javascripts/countly/countly.template.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyProgressBar from '../../../javascripts/components/progress/progress-bar.vue';

var CV = countlyVue;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyChartBar,
        ClyDatatableN,
        ClyProgressBar
    },
    mixins: [
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
            barChartItemsLegends: {
                all: CV.i18n('user-activity.barchart-all-users'),
                sevenDays: CV.i18n('user-activity.barchart-seven-days'),
                thirtyDays: CV.i18n('user-activity.barchart-thirty-days')
            },
            progressBarColor: "#39C0C8",
            DECIMAL_PLACES_FORMAT: 2,
        };
    },
    computed: {
        showDrillFilter: function() {
            if (countlyAuth.validateRead('drill') && countlyGlobal.plugins.indexOf("drill") !== -1) {
                return true;
            }
            else {
                return false;
            }
        },
        userActivity: function() {
            return this.$store.state.countlyUserActivity.userActivity;
        },
        userActivityFilters: {
            get: function() {
                return this.$store.state.countlyUserActivity.userActivityFilters;
            },
            set: function(value) {
                this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', value);
                this.$store.dispatch('countlyUserActivity/fetchAll', true);
                if (value.query) {
                    app.navigate("#/analytics/loyalty/user-activity/" + JSON.stringify(value.query));
                }
                else {
                    app.navigate("#/analytics/loyalty/user-activity/");
                }
            }
        },
        isLoading: function() {
            return this.$store.getters['countlyUserActivity/isLoading'];
        },
        seriesTotal: function() {
            return this.$store.state.countlyUserActivity.seriesTotal;
        },
        userActivityRows: function() {
            var rows = [];
            var self = this;
            Object.keys(self.userActivity).forEach((function(userActivityKey) {
                var userActivitySerie = self.userActivity[userActivityKey];
                userActivitySerie.forEach(function(userActivitySerieItem, userActivitySerieItemIndex) {
                    self.addEmptyRowIfNotFound(rows, userActivitySerieItemIndex);
                    rows[userActivitySerieItemIndex].bucket = userActivitySerieItem._id;
                    rows[userActivitySerieItemIndex][userActivityKey] = userActivitySerieItem.count;
                });
            }));
            return rows;
        },
        userActivityOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisUserActivitySessionBuckets,
                    axisLabel: {
                        color: "#333C48"
                    }
                },
                series: this.yAxisUserActivityCountSeries
            };
        },
        xAxisUserActivitySessionBuckets: function() {
            return this.$store.state.countlyUserActivity.nonEmptyBuckets;
        },
        yAxisUserActivityCountSeries: function() {
            var self = this;
            return Object.keys(this.userActivity).map(function(userActivityKey) {
                return {
                    data: self.userActivity[userActivityKey].map(function(item) {
                        return item.count;
                    }),
                    name: self.barChartItemsLegends[userActivityKey],
                };
            });
        },
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyUserActivity/fetchAll', false);
        },
        formatPercentage: function(value) {
            return CountlyHelpers.formatPercentage(value);
        },
        addEmptyRowIfNotFound: function(rowsArray, index) {
            if (!rowsArray[index]) {
                rowsArray.push({});
            }
        },
        formatExportFunction: function() {
            var tableData = this.userActivityRows;
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[CV.i18n('user-activity.table-session-count').toUpperCase()] = tableData[i].bucket;
                item[CV.i18n('user-activity.table-all-users').toUpperCase()] = this.formatNumber(tableData[i].all);
                item[CV.i18n('user-activity.table-thirty-days').toUpperCase()] = tableData[i].thirtyDays;
                item[CV.i18n('user-activity.table-seven-days').toUpperCase()] = this.formatNumber(tableData[i].sevenDays);
                table.push(item);
            }
            return table;
        },
    },
    mounted: function() {
        if (this.$route.params && this.$route.params.query) {
            this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', {query: this.$route.params.query });
        }
        this.$store.dispatch('countlyUserActivity/fetchAll', true);
    }
};
</script>
