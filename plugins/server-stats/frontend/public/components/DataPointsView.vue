<template>
    <div>
        <cly-header
            :title="title"
            :tooltip="tooltip"
        >
            <template v-slot:header-top>
                <cly-back-link
                    v-if="subPage"
                    link="#/manage/data-points"
                    :title="i18n('common.back')"
                />
            </template>
        </cly-header>
        <cly-main>
            <div
                v-if="!subPage"
                class="bu-level-left"
            >
                <h4 data-test-id="top-applications-by-data-points-in-the-last-two-hours-label">
                    {{ i18n('server-stats.data-points-last_hours') }}
                </h4>
            </div>
            <cly-section
                v-if="!subPage"
                class="bu-mt-4"
            >
                <cly-metric-cards
                    :multiline="false"
                    v-loading="isLoading"
                    style="min-height:100px;"
                >
                    <cly-metric-card
                        :test-id="'datapoint-app-' + idx"
                        formatting="long"
                        :is-percentage="false"
                        :box-type="3"
                        :label="item.name"
                        color="#097EFF"
                        numberClasses="bu-is-flex bu-is-align-items-center"
                        :key="idx"
                        v-for="(item, idx) in topApps"
                    >
                        <template v-slot:number>
                            {{ item.value }}
                        </template>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <cly-section>
                <cly-date-picker-g class="bu-m-5" />
                <cly-chart-bar
                    test-id="chart-datapoint"
                    v-if="useBasicGraph"
                    :legend="{show:false}"
                    :option="dataPointsGraph"
                    :height="520"
                    v-loading="isLoading"
                    :force-loading="isLoading"
                />
                <cly-chart-generic
                    v-else
                    :height="520"
                    :option="dataPointsGraph"
                    v-loading="isLoading"
                    :force-loading="isLoading"
                />
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="datatable-apps-datapoint"
                    :exportFormat="formatExportFunction"
                    :rows="dataPointsRows"
                    :resizable="true"
                    v-loading="isLoading"
                    :force-loading="isLoading"
                    :default-sort="{prop: 'data-points', order: 'descending'}"
                >
                    <el-table-column
                        min-width="200"
                        type="clickable"
                        sortable="custom"
                        prop="appName"
                        :show-overflow-tooltip="true"
                        :label="i18n('compare.apps.app-name')"
                        fixed="left"
                    >
                        <template v-slot="scope">
                            <a
                                v-if="!subPage && scope.row.appId"
                                :href="'#/manage/data-points/' + scope.row.appId"
                                :data-test-id="'datatable-datapoints-app-name-' + scope.$index"
                            >
                                {{ scope.row.appName }}
                            </a>
                            <span
                                v-else
                                class="i_am_not_clickable"
                                data-test-id="datatable-all-datapoints"
                            >
                                {{ scope.row.appName }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="150"
                        :formatter="numberFormatter"
                        sortable="custom"
                        prop="sessions"
                        :label="i18n('sidebar.analytics.sessions')"
                    >
                        <template v-slot:header>
                            {{ i18n('sidebar.analytics.sessions') }}
                            <cly-tooltip-icon
                                class="bu-pl-1"
                                :tooltip="i18n('server-stats.sessions-description')"
                                placement="top-center"
                                data-test-id="datatable-apps-datapoint-tooltip-sessions"
                            />
                        </template>
                        <template v-slot="scope">
                            <span :data-test-id="'datatable-datapoints-sessions-' + scope.$index">
                                {{ eventsNumberFormatter(scope.row.sessions) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="150"
                        :formatter="numberFormatter"
                        sortable="custom"
                        prop="events"
                        :label="i18n('server-stats.events')"
                    >
                        <template v-slot:header>
                            {{ i18n('server-stats.events') }}
                            <cly-tooltip-icon
                                class="bu-pl-1"
                                :tooltip="i18n('server-stats.events-description')"
                                placement="top-center"
                                data-test-id="datatable-apps-datapoint-tooltip-non-session-datapoints"
                            />
                        </template>
                        <template v-slot="scopeRow">
                            <div :data-test-id="'datatable-datapoints-no-session-datapoints-' + scopeRow.$index">
                                <el-popover
                                    trigger="hover"
                                    placement="right"
                                    :offset="50"
                                    :close-delay="50"
                                >
                                    <div slot="default">
                                        <div class="bu-is-uppercase bu-has-text-weight-medium popover-title">
                                            {{ i18n('server-stats.event-breakdown') }}
                                        </div>
                                        <table class="bu-mt-1">
                                            <tr
                                                v-for="eventPair in scopeRow.row.sorted_breakdown"
                                                :key="eventPair[0]"
                                            >
                                                <td class="bu-pt-3 bu-is-capitalized bu-has-text-weight-normal popover-key">
                                                    {{ getPopoverKey(eventPair[0]) }}
                                                </td>
                                                <td class="bu-pt-3 bu-pl-5 bu-has-text-right bu-has-text-weight-medium popover-value">
                                                    {{ eventsNumberFormatter(eventPair[1]) }}
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <span slot="reference">
                                        {{ eventsNumberFormatter(scopeRow.row.events) }}
                                    </span>
                                </el-popover>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="150"
                        :formatter="numberFormatter"
                        sortable="custom"
                        prop="data-points"
                        :label="i18n('server-stats.total-datapoints')"
                    >
                        <template v-slot="rowScope">
                            <div :data-test-id="'datatable-datapoints-total-datapoints-' + rowScope.$index">
                                {{ eventsNumberFormatter(rowScope.row['data-points']) }}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="150"
                        :formatter="numberFormatter"
                        sortable="custom"
                        prop="change"
                        :label="i18n('server-stats.datapoint-change')"
                    >
                        <template v-slot="rowScope">
                            <div :data-test-id="'datatable-datapoints-datapoint-change-' + rowScope.$index">
                                {{ eventsNumberFormatter(rowScope.row['change']) }}
                            </div>
                        </template>
                    </el-table-column>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>
<script>
import moment from 'moment';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { i18n, i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { service } from '../store/index.js';

export default {
    mixins: [autoRefreshMixin, i18nMixin],
    data: function() {
        var settings = {
            title: i18n('server-stats.data-points'),
            description: i18n('server-stats.data-points-description'),
            app_id: (this.$route.params && this.$route.params.appid) || null,
            subPage: false,
            isLoading: true,
            dataPointsRows: [],
            dataPointsGraph: this.calculateSeries(),
            useBasicGraph: false,
            showPushColumn: false,
            topApps: []
        };
        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("push") > -1) {
            settings.showPushColumn = true;
        }
        if (this.$route.params && this.$route.params.appid) {
            settings.subPage = true;
            if (countlyGlobal.apps[this.$route.params.appid]) {
                settings.title = countlyGlobal.apps[this.$route.params.appid].name;
            }
            else {
                settings.title = this.$route.params.appid;
            }
        }
        return settings;
    },
    mounted: function() {
        var self = this;
        Promise.all([
            service.initialize({app_id: this.app_id}),
            service.calculateTop(),
            service.punchCard({app_id: this.app_id})
        ]).then(function() {
            self.dataPointsGraph = self.calculateSeries();
            self.dataPointsRows = service.getTableData();
            self.topApps = service.getTop();
            self.isLoading = false;
        });
    },
    computed: {
        tooltip: function() {
            return !this.app_id ? {description: this.description, placement: 'top-center'} : null;
        }
    },
    methods: {
        getPopoverKey: function(key) {
            var eventsBreakdownEnum = {
                "crashes": i18n('server-stats.crashes'),
                "nps": i18n('server-stats.nps'),
                "views": i18n('server-stats.views'),
                "actions": i18n('server-stats.actions'),
                "surveys": i18n('server-stats.surveys'),
                "ratings": i18n('server-stats.ratings'),
                "apm": i18n('server-stats.apm'),
                "custom": i18n('server-stats.custom'),
                "cs": i18n('server-stats.cs'),
                "ps": i18n('server-stats.ps'),
                "push": i18n('server-stats.push'),
                llm: i18n('server-stats.llm'),
                aclk: i18n('server-stats.aclk'),
            };
            return eventsBreakdownEnum[key];
        },
        refresh: function(force) {
            if (force) {
                this.isLoading = true;
            }
            var self = this;
            Promise.all([
                service.initialize({app_id: this.app_id}),
                service.punchCard({app_id: this.app_id})
            ]).then(function() {
                self.dataPointsGraph = self.calculateSeries();
                self.dataPointsRows = service.getTableData();
                self.isLoading = false;
            });
            service.calculateTop().then(function() {
                self.topApps = service.getTop();
            });
        },
        getNormalizedSymbolCoefficient: function() {
            return 30 / this.max;
        },
        numberFormatter: function(row, col, value) {
            if (value === null) {
                return "-";
            }
            else {
                return countlyCommon.formatNumber(value, 0);
            }
        },
        eventsNumberFormatter: function(value) {
            if (value === null) {
                return "-";
            }
            else {
                return countlyCommon.formatNumber(value, 0);
            }
        },
        calculateSeries: function() {
            var info = service.getPunchCardData();
            var data = info.data || [];

            var labels = [
                i18n('common.monday'),
                i18n('common.tuesday'),
                i18n('common.wednesday'),
                i18n('common.thursday'),
                i18n('common.friday'),
                i18n('common.saturday'),
                i18n('common.sunday')
            ];
            if (info.labels && info.labels.length > 0) {
                for (var k = 0; k < info.labels.length; k++) {
                    var thisDay = moment(info.labels[k], "YYYY.M.D");
                    info.labels[k] = countlyCommon.formatDate(thisDay, "D MMM, YYYY");
                }
                labels = info.labels;
            }
            var max = 0;
            if (data && data.length > 0) {
                for (var ddd = 0; ddd < data.length; ddd++) {
                    for (var hour = 0; hour < 24; hour++) {
                        max = Math.max(max, data[ddd][2]);
                    }
                }
            }
            this.max = max;
            var self = this;

            var graphObject = {
                title: {
                    text: i18n('server-stats.data-points')
                },
                tooltip: {
                    position: 'top',
                    trigger: 'item',
                    borderColor: "#ececec",
                    borderWidth: 1,
                },
                xAxis: {
                    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                    splitLine: {
                        show: true
                    },
                    axisLine: {
                        show: false
                    },
                    name: i18n('common.hours'),
                    nameLocation: "start",
                    nameTextStyle: {
                        color: "#A7AEB8",
                        padding: [0, 0, -20, 0],
                        verticalAlign: 'bottom'
                    }
                }
            };
            if (!info.dayCount || info.dayCount > 1) {
                this.useBasicGraph = false;
                graphObject.tooltip.formatter = function(params) {
                    var dd = params.data || [];
                    dd = dd[3] || {};
                    dd.avg = 0;
                    if (dd.cn > 0) {
                        dd.avg = Math.round(dd.sum / dd.cn);
                    }
                    else {
                        dd.avg = dd.sum;
                    }
                    var lines = [];

                    if (dd.e) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.e * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('sidebar.events') + '</td>');
                    }

                    if (dd.s) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.s * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('sidebar.analytics.sessions') + '</td>');
                    }

                    if (dd.p && self.showPushColumn) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.p * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('push.plugin-title') + '</td>');
                    }

                    var retString = '<div class="data-points-tooltip color-cool-gray-100 text-small"><div>' + i18n('server-stats.total-datapoints') + '</div><div class="text-big bu-pt-1 bu-pb-3">' + countlyCommon.formatNumber(dd.sum || 0) + '</div><table><tr><td class="bu-pr-2">Max.</td><td>Min.</td><td>Avg.</td></tr><tr class="text-big"><td>' + countlyCommon.formatNumber(dd.max, 0) + '</td><td>' + countlyCommon.formatNumber((dd.min || 0), 0) + '</td><td>' + countlyCommon.formatNumber(dd.avg, 0) + '</td></tr></table>';

                    if (lines.length > 0) {
                        retString += '<div class="color-cool-gray-100 text-small bu-p-0 bu-pt-3 data-points-tooltip-bottom-table"><table><tr>' + lines.join('</tr><tr>') + '</tr></table></div>';
                    }
                    return retString;
                };

                graphObject.yAxis = {
                    type: 'category',
                    data: labels,
                    nameLocation: 'middle',
                    boundaryGap: true,
                    axisTick: {
                        alignWithLabel: true
                    }
                };
                graphObject.series = [{
                    name: i18n('server-stats.data-points'),
                    type: "scatter",
                    itemStyle: {
                        color: function(params) {
                            var vv = 1;
                            if (params && params.value) {
                                vv = 0.2 + (0.8 * Math.round(100 * params.value[2] / self.max) / 100);
                            }
                            return "rgba(57,192,200,+" + vv + ")";
                        },
                    },
                    emphasis: {
                        scale: false,
                        itemStyle: {
                            color: 'rgba(57,192,200,1)',
                            shadowColor: "#39C0C8",
                            shadowBlur: 10
                        }
                    },
                    symbolSize: function(val) {
                        var dataIndexValue = 2;
                        if (val[dataIndexValue] === 0) {
                            return 0;
                        }
                        else {
                            return Math.max(5, val[dataIndexValue] * self.getNormalizedSymbolCoefficient());
                        }
                    },
                    data: data
                }];

                return graphObject;
            }
            else {
                this.useBasicGraph = true;
                var seriesArr = [];
                var seriesInfo = {};
                for (var z = 0; z < info.data.length; z++) {
                    seriesArr.push(info.data[z][2]);
                    seriesInfo[z + ""] = info.data[z][3];
                }
                this.seriesInfo = seriesInfo;
                graphObject.tooltip.formatter = function(params) {
                    var dd = params.name;
                    dd = self.seriesInfo[dd];
                    dd.avg = 0;
                    if (dd.cn > 0) {
                        dd.avg = Math.round(dd.sum / dd.cn);
                    }
                    else {
                        dd.avg = dd.sum;
                    }
                    var lines = [];

                    if (dd.e) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.e * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('sidebar.events') + '</td>');
                    }

                    if (dd.s) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.s * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('sidebar.analytics.sessions') + '</td>');
                    }

                    if (dd.p && self.showPushColumn) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.p * 100 / dd.sum || 1), 0) + '%</td><td>' + i18n('push.plugin-title') + '</td>');
                    }

                    var retString = '<div class="data-points-tooltip color-cool-gray-100 text-small"><div>' + i18n('common.table.total-users') + '</div><div class="text-big bu-pt-1 bu-pb-3">' + countlyCommon.formatNumber(dd.sum || 0) + '</div>';
                    if (lines.length > 0) {
                        retString += '<div class="color-cool-gray-100 text-small bu-p-0 bu-pt-3 data-points-tooltip-bottom-table"><table><tr>' + lines.join('</tr><tr>') + '</tr></table></div>';
                    }
                    return retString;
                };
                graphObject.xAxis.nameTextStyle.padding = [0, 0, -30, 0];
                graphObject.series = [{"type": "bar", data: seriesArr, name: "data-points"}];
                return graphObject;
            }
        },
        formatExportFunction: function() {
            var dataPoints = service.getTableData();
            var table = [];
            for (var k = 0; k < dataPoints.length; k++) {
                var item = {};
                item[i18n('server-stats.app-name')] = dataPoints[k].appName;
                item[i18n('server-stats.sessions')] = dataPoints[k].sessions;
                item[i18n('server-stats.events')] = dataPoints[k].events;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.crashes')] = dataPoints[k].events_breakdown.crashes;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.views')] = dataPoints[k].events_breakdown.views;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.actions')] = dataPoints[k].events_breakdown.actions;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.nps')] = dataPoints[k].events_breakdown.nps;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.surveys')] = dataPoints[k].events_breakdown.surveys;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.ratings')] = dataPoints[k].events_breakdown.ratings;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.apm')] = dataPoints[k].events_breakdown.apm;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.custom')] = dataPoints[k].events_breakdown.custom;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.push')] = dataPoints[k].events_breakdown.push;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.ps')] = dataPoints[k].events_breakdown.ps;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.cs')] = dataPoints[k].events_breakdown.cs;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.llm')] = dataPoints[k].events_breakdown.llm;
                item[i18n('server-stats.events') + ": " + i18n('server-stats.aclk')] = dataPoints[k].events_breakdown.aclk;
                item[i18n('server-stats.data-points')] = dataPoints[k]['data-points'];
                item[i18n('server-stats.datapoint-change')] = dataPoints[k].change;
                table.push(item);
            }
            return table;
        }
    }
};
</script>
