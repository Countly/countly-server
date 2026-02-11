<template>
    <div class="clyd-widget">
        <div
            v-if="!showZoom"
            class="bu-level"
        >
            <div
                class="bu-level-left bu-is-flex-shrink-1"
                style="min-width: 0"
            >
                <clyd-widget-title
                    class="bu-level-item"
                    :labels="metricLabels"
                    :title="title"
                />
            </div>
            <div
                v-if="isAllowed"
                class="bu-level-right"
            >
                <div class="bu-level-item">
                    <clyd-bucket
                        v-if="showBuckets"
                        v-model="selectedBucket"
                        :widget-id="data._id"
                    />
                </div>
                <div class="bu-level-item">
                    <cly-more-options @command="onWidgetCommand">
                        <el-dropdown-item
                            class="dashboard-more-options"
                            command="edit"
                        >
                            {{ i18n('common.edit') }}
                        </el-dropdown-item>
                        <el-dropdown-item
                            class="dashboard-more-options"
                            command="delete"
                        >
                            {{ i18n('common.delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item
                            v-if="data.visualization === 'time-series' || data.visualization === 'bar-chart'"
                            class="dashboard-more-options"
                            command="zoom"
                        >
                            {{ i18n('common.zoom-in') }}
                        </el-dropdown-item>
                        <div v-if="data.visualization === 'time-series'">
                            <hr class="dashboard-more-options__divider">
                            <el-dropdown-item
                                class="dashboard-more-options"
                                command="add"
                            >
                                {{ i18n('notes.add-note') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                                class="dashboard-more-options"
                                command="manage"
                            >
                                {{ i18n('notes.manage-notes') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                                class="dashboard-more-options"
                                command="show"
                            >
                                {{ !areNotesHidden ? i18n("notes.hide-notes") : i18n("notes.show-notes") }}
                            </el-dropdown-item>
                        </div>
                    </cly-more-options>
                </div>
            </div>
        </div>
        <cly-chart-zoom
            v-if="showZoom"
            class="bu-is-flex bu-is-align-items-center bu-is-justify-content-flex-end bu-m-0 cly-vue-zoom__external"
            :echartRef="$refs.echartRef.$refs.echarts"
            ref="zoomRef"
            @zoom-reset="onZoomReset"
        />
        <clyd-primary-legend :custom-period="data.custom_period" />
        <div
            v-loading="loading"
            class="clyd-widget__content"
            :class="'clyd-widget__content--vis-' + data.visualization"
            @mousedown.stop
        >
            <template v-if="!loading">
                <cly-chart-time
                    v-if="data.visualization === 'time-series' && !data.breakdowns"
                    :category="data.data_type || data.feature"
                    height="auto"
                    :legend="{show: false}"
                    :option="timelineGraph.lineOptions"
                    ref="echartRef"
                    :show-zoom="false"
                    :showDownload="false"
                    :showToggle="false"
                    skin="full"
                    :sub-category="data.feature === 'events' ? data.events : []"
                    @datazoom="onDataZoom"
                    @patchzoom="onPatchZoom"
                />
                <div v-else-if="data.visualization === 'number'">
                    <h1 class="bu-pb-2">
                        {{ formatNumber(number.total) }}
                    </h1>
                    <p
                        v-if="number.trend == 'u'"
                        class="trend-up bu-p-0 bu-m-0"
                    >
                        <i class="cly-trend-up-icon ion-android-arrow-up bu-ml-2" /><span>{{ number.change }}</span>
                        <span class="text-medium">{{ i18n('dashboards.compared-to-prev-period') }}</span>
                    </p>
                    <p
                        v-if="number.trend == 'd'"
                        class="trend-down bu-p-0 bu-m-0"
                    >
                        <i class="cly-trend-down-icon ion-android-arrow-down bu-ml-2"></i><span>{{ number.change }}</span>
                        <span class="text-medium">{{ i18n('dashboards.compared-to-prev-period') }}</span>
                    </p>
                </div>
                <div
                    v-else-if="data.visualization === 'table'"
                    style="width: 100%; height: 100%;"
                >
                    <cly-datatable-n
                        v-if="getTableData.length"
                        hideTop
                        :rows="getTableData"
                        style="width: 100%; height: 100%;"
                    >
                        <template v-slot="scope">
                            <el-table-column
                                v-for="(item, index) in tableStructure"
                                :label="item.title"
                                :key="index"
                                :prop="item.prop"
                                :sortable="false"
                            >
                                <template slot-scope="scope">
                                    <span v-if="item.type === 'number'">
                                        {{ formatNumber(scope.row[item.prop] || 0) }}
                                    </span>
                                    <span v-else>
                                        {{ scope.row[item.prop]}}
                                    </span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                    <cly-blank
                        v-else
                        :classes="{'bu-p-0': true}"
                    />
                </div>
                <cly-chart-bar
                    v-else-if="data.visualization === 'bar-chart'"
                    height="auto"
                    :legend="{show: false}"
                    :option="barOptions"
                    :patch-x-axis="barOptions.patchXAxis !== undefined ? barOptions.patchXAxis : true"
                    ref="echartRef"
                    :showDownload="false"
                    :showToggle="false"
                    :show-zoom="false"
                    skin="full"
                    @patchzoom="onPatchZoom"
                    @datazoom="onDataZoom"
                />
                <cly-chart-time
                    v-else-if="data.visualization === 'time-series'"
                    category="user-analytics"
                    height="auto"
                    :hideNotation="false"
                    :no-hourly="true"
                    :option="timelineGraph.lineOptions"
                    :patch-x-axis="false"
                    ref="echartRef"
                    :showDownload="false"
                    :showToggle="false"
                    :show-zoom="false"
                    skin="full"
                    :valFormatter="valFormatter"
                    @patchzoom="onPatchZoom"
                    @datazoom="onDataZoom"
                />
                <cly-chart-pie
                    v-else-if="data.visualization === 'pie-chart'"
                    height="auto"
                    :legend="{ show: false }"
                    :option="pieGraph"
                    :showDownload="false"
                    :showToggle="false"
                    :showZoom="false"
                    skin="full"
                />
            </template>
        </div>
        <drawer
            :controls="drawers.annotation"
            :settings="drawerSettingsForWidgets"
            @cly-refresh="refresh"
        />
        <clyd-secondary-legend
            v-if="data.visualization === 'time-series' && !data.breakdowns"
            :apps="data.apps"
            :labels="legendLabels"
        />
        <clyd-widget-apps :apps="data.apps" />
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import { PeriodCalculator } from '../../../javascripts/countly/countly.period.calculator.js';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyChartTime from '../../../javascripts/components/echart/cly-chart-time.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyChartPie from '../../../javascripts/components/echart/cly-chart-pie.vue';
import ClyChartZoom from '../../../javascripts/components/echart/cly-chart-zoom.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyBlank from '../../../javascripts/components/helpers/cly-blank.vue';
import AnnotationDrawer from '../../notes/components/AnnotationDrawer.vue';

export default {
    components: {
        ClyMoreOptions,
        ClyChartTime,
        ClyChartBar,
        ClyChartPie,
        ClyChartZoom,
        ClyDatatableN,
        ClyBlank,
        "drawer": AnnotationDrawer
    },
    mixins: [
        countlyVue.mixins.customDashboards.global,
        countlyVue.mixins.customDashboards.widget,
        countlyVue.mixins.customDashboards.apps,
        countlyVue.mixins.zoom,
        countlyVue.mixins.hasDrawers("annotation"),
        countlyVue.mixins.graphNotesCommand,
        countlyVue.mixins.i18n,
        countlyVue.mixins.commonFormatters
    ],
    data: function() {
        return {
            showBuckets: false,
            map: {
                "u": this.i18n("common.table.total-users"),
                "r": this.i18n("common.table.returning-users"),
                "n": this.i18n("common.table.new-users")
            },
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }

            return this.i18n("user-analytics.overview-title");
        },
        metricLabels: function() {
            this.data = this.data || {};
            var listed = [];

            for (var k = 0; k < this.data.metrics.length; k++) {
                listed.push(this.map[this.data.metrics[k]] || this.data.metrics[k]);
            }
            return listed;
        },
        timelineGraph: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};

            var series = [];
            var dates = [];
            var appIndex = 0;
            var multiApps = false;
            if (Object.keys(this.data.dashData.data).length > 0) {
                multiApps = true;
            }

            for (var app in this.data.dashData.data) {
                for (var k = 0; k < this.data.metrics.length; k++) {
                    var name = this.map[this.data.metrics[k]] || this.data.metrics[k];

                    if (multiApps) {
                        name = (this.__allApps[app] && this.__allApps[app].name || app) + " (" + name + ")";
                    }
                    series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], color: countlyCommon.GRAPH_COLORS[series.length]});
                }
                for (var date in this.data.dashData.data[app]) {
                    if (appIndex === 0) {
                        dates.push(date);
                    }
                    for (var kk = 0; kk < this.data.metrics.length; kk++) {
                        if (this.data.metrics[kk] === 'r') {
                            var vv = this.data.dashData.data[app][date].u - this.data.dashData.data[app][date].n;
                            series[appIndex * this.data.metrics.length + kk].data.push(vv);
                        }
                        else {
                            series[appIndex * this.data.metrics.length + kk].data.push(this.data.dashData.data[app][date][this.data.metrics[kk]] || 0);
                        }
                    }
                }
                appIndex++;
            }
            if (this.data.custom_period) {
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series, patchXAxis: false}
                };
            }
            else if (countlyCommon && countlyCommon.periodObj && countlyCommon.periodObj.daysInPeriod === 1 && countlyCommon.periodObj.isSpecialPeriod === true) {
                dates = [dates[0] + " 00:00", dates[0] + " 24:00"];
                for (var z = 0; z < series.length; z++) {
                    series[z].data.push(series[z].data[0]);
                }
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series, patchXAxis: false}
                };
            }
            else {
                var xAxisData = [];
                var period = countlyCommon && countlyCommon.getPeriod();
                var tickPeriod = period === 'month' ? 'monthly' : '';

                var periodCalculator = new PeriodCalculator();
                periodCalculator.setPeriod(period);
                var tickObj = periodCalculator.getTickObj(tickPeriod, false, true);
                var ticks = tickObj.ticks;
                for (var i = 0; i < ticks.length; i++) {
                    var tick = ticks[i];
                    var tickIndex = tick[0];
                    var tickValue = tick[1];
                    while (xAxisData.length < tickIndex) {
                        xAxisData.push("");
                    }
                    xAxisData.push(tickValue);
                }

                return {
                    lineOptions: {"series": series, xAxis: { data: xAxisData }, patchXAxis: false},
                };
            }
        },
        stackedBarTimeSeriesOptions: function() {
            return this.timelineGraph.lineOptions;
        },
        barOptions: function() {
            var data = this.timelineGraph;
            return data.lineOptions;
        },
        number: function() {
            this.data = this.data || {};
            var mm = 'u';
            if (this.data && this.data.metrics && this.data.metrics[0]) {
                mm = this.data.metrics[0];
            }
            var value = {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};
            for (var app in this.data.dashData.data) {
                value = this.data.dashData.data[app];
                if (mm === 'r') {
                    var returning = {"trend": "u"};
                    if (value.u && value.n) {
                        returning.total = (value.u.total || 0) - (value.n.total || 0);
                        returning["prev-total"] = (value.u["prev-total"] || 0) - (value.n["prev-total"] || 0);
                    }
                    else {
                        returning.total = 0;
                        returning["prev-total"] = 0;
                    }
                    if (returning["prev-total"] > returning.total) {
                        returning.trend = "d";
                    }
                    returning.change = countlyCommon.getPercentChange(returning["prev-total"], returning.total);
                    returning.trend = returning.change.trend;
                    returning.change = returning.change.percent;

                    value.r = returning;
                }
                if (value[mm]) {
                    value = value[mm];
                }
            }
            return value;
        },
        legendLabels: function() {
            var labels = {};

            var graphData = this.timelineGraph;
            var series = graphData.lineOptions.series;

            for (var i = 0; i < series.length; i++) {
                if (!labels[series[i].app]) {
                    labels[series[i].app] = [];
                }

                labels[series[i].app].push({
                    appId: series[i].app,
                    color: series[i].color,
                    label: this.map[series[i].metric] || series[i].metric
                });
            }

            return labels;
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        },
        valFormatter: countlyCommon.getShortNumber,
        onWidgetCommand: function(event) {
            if (event === 'add' || event === 'manage' || event === 'show') {
                this.graphNotesHandleCommand(event);
                return;
            }
            else if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            else {
                return this.$emit('command', event);
            }
        },
    }
};
</script>
