<template>
    <div>
        <cly-header
            :title="i18n('user-analytics.overview-title')"
            :tooltip="{description}"
        >
            <template v-slot:header-left>
                <h2> {{i18n('user-analytics.overview-title')}} </h2>
                <cly-tooltip-icon data-test-id="header-title-tooltip" :tooltip="description" icon="ion ion-help-circled" style="margin-left:8px" placement="bottom-end"> </cly-tooltip-icon>
            </template>
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="app-version-date-picker-container"></cly-date-picker-g>
            <cly-section>
                <cly-chart-time test-id="user-analytics-overview" :option="lineOptions" :legend="lineLegend" v-loading="isLoading" :force-loading="isLoading" category="user-analytics"> </cly-chart-time>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="user-analytics-overview" :exportFormat="formatExportFunction" :default-sort="{prop: 'dateVal', order: 'ascending'}" v-loading="isLoading" :force-loading="isLoading" :rows="tableData" :resizable="true" >
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="dateVal" :label="i18n('common.date')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-user-analytics-overview-date-' + scope.$index">{{scope.row.date}}</div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="u" :label="i18n('common.total-users')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-user-analytics-overview-total-users-' + scope.$index">{{formatNumber(scope.row.u)}}</div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="n" :label="i18n('common.new-users')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-user-analytics-overview-new-users-' + scope.$index">{{formatNumber(scope.row.n)}}</div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="returning" :label="i18n('common.returning-users')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-user-analytics-overview-returning-users-' + scope.$index">{{formatNumber(scope.row.returning)}}</div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import jQuery from 'jquery';
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlySession from '../../../javascripts/countly/countly.session.js';
import countlyTotalUsers from '../../../javascripts/countly/countly.total.users.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyChartTime from '../../../javascripts/components/echart/cly-chart-time.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';

var CV = countlyVue;
var $ = jQuery;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyChartTime,
        ClyDatatableN,
        ClyTooltipIcon,
        ClyMoreOptions
    },
    mixins: [
        dataMixin({
            'externalLinks': '/analytics/users/links'
        }),
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n,
        autoRefreshMixin
    ],
    data: function() {
        return {
            description: CV.i18n('user-analytics.overview-desc'),
            tableData: [],
            graphOptions: this.createSeries(),
            lineLegend: this.createLineLegend(),
            lineOptions: this.createSeries(),
            isLoading: true
        };
    },
    mounted: function() {
        var self = this;
        $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
            self.calculateAllData();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        dateChanged: function() {
            this.refresh(true);
        },
        calculateAllData: function() {
            var userDP = countlySession.getUserDP();
            this.lineOptions = this.createSeries(userDP.chartDP);
            this.tableData = this.calculateTableData();
            this.lineLegend = this.createLineLegend();
        },
        formatExportFunction: function() {
            var userDP = countlySession.getUserDP();
            var table = [];
            for (var k = 0; k < userDP.chartData.length; k++) {
                var item = {};
                item[CV.i18n('common.date')] = userDP.chartData[k].date;
                item[CV.i18n('common.table.total-users')] = userDP.chartData[k].u;
                item[CV.i18n('common.table.new-users')] = userDP.chartData[k].n;
                item[CV.i18n('common.table.returning-users')] = userDP.chartData[k].returning;
                table.push(item);
            }
            return table;
        },
        calculateTableData: function() {
            var userDP = countlySession.getUserDP();
            for (var k = 0; k < userDP.chartData.length; k++) {
                userDP.chartData[k].dateVal = k;
            }
            return userDP.chartData;
        },
        createSeries: function(data) {
            var series = [];

            if (data) {
                for (var k = 0; k < data.length; k++) {
                    series.push({"name": data[k].label, data: this.fixArray(data[k].data)});
                }
            }
            else {
                series.push({"name": CV.i18n('common.table.total-users'), data: []});
                series.push({"name": CV.i18n('common.table.new-users'), data: []});
                series.push({"name": CV.i18n('common.table.returning-users'), data: []});
            }

            return {series: series};
        },
        fixArray: function(array) {
            var aa = [];
            for (var k = 0; k < array.length; k++) {
                aa.push(array[k][1]);
            }
            return aa;
        },
        createLineLegend: function() {
            var sessionData = countlySession.getSessionData();
            sessionData = sessionData || {};
            sessionData.usage = sessionData.usage || {};
            sessionData.usage["total-users"] = sessionData.usage["total-users"] || {};
            sessionData.usage["new-users"] = sessionData.usage["new-users"] || {};
            sessionData.usage["returning-users"] = sessionData.usage["returning-users"] || {};

            var legend = {"type": "primary", data: []};

            legend.data = [
                {
                    "name": jQuery.i18n.map["common.table.total-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["total-users"].total),
                    "trend": (sessionData.usage["total-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.total-users-desc"),
                    "percentage": sessionData.usage["total-users"].change,
                    "isEstimate": sessionData.usage["total-users"].isEstimate,
                    "estimateTooltip": CV.i18n("common.estimation")
                },
                {
                    "name": jQuery.i18n.map["common.table.new-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["new-users"].total),
                    "trend": (sessionData.usage["new-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.new-users-desc"),
                    "percentage": sessionData.usage["new-users"].change
                },
                {
                    "name": jQuery.i18n.map["common.table.returning-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["returning-users"].total),
                    "trend": (sessionData.usage["returning-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.returning-users-desc"),
                    "percentage": sessionData.usage["returning-users"].change
                }
            ];

            return legend;
        }
    },
    computed: {
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        },
    }
};
</script>
