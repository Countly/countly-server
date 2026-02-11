<template>
    <div v-bind:class="[componentId, 'clyd-widget']">
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
                    :legend="{ show: false }"
                    height="auto"
                    ref="echartRef"
                    :option="timelineGraph.lineOptions"
                    :showDownload="false"
                    :showToggle="false"
                    :show-zoom="false"
                    skin="full"
                    :sub-category="data.feature === 'events' ? data.events : []"
                    @patchzoom="onPatchZoom"
                    @datazoom="onDataZoom"
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
                        <i class="cly-trend-down-icon ion-android-arrow-down bu-ml-2" /><span>{{ number.change }}</span>
                        <span class="text-medium">{{ i18n('dashboards.compared-to-prev-period') }}</span>
                    </p>
                </div>
                <div
                    v-else-if="data.visualization === 'table'"
                    style="width: 100%; height: 100%;"
                >
                    <cly-datatable-n
                        v-if="getTableData.length"
                        :hideTop="true"
                        :rows="getTableData"
                        style="width: 100%; height: 100%;"
                    >
                        <template v-slot="scope">
                            <el-table-column
                                v-for="(item, index) in tableStructure"
                                :key="index"
                                :label="item.title"
                                :prop="item.prop"
                                :sortable="false"
                            >
                                <template slot-scope="scope">
                                    <span v-if="item.type === 'number'">
                                        {{ formatNumber(scope.row[item.prop] || 0) }}
                                    </span>
                                    <span v-else>
                                        {{ scope.row[item.prop] }}
                                    </span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                    <cly-blank
                        v-else
                        :classes="{ 'bu-p-0': true }"
                    />
                </div>
                <cly-chart-bar
                    v-else-if="data.visualization === 'bar-chart'"
                    height="auto"
                    :legend="{ show: false }"
                    :option="stackedBarOptions"
                    :patch-x-axis="stackedBarOptions.patchXAxis !== undefined ? stackedBarOptions.patchXAxis : true"
                    ref="echartRef"
                    :showDownload="false"
                    :showToggle="false"
                    :show-zoom="false"
                    skin="full"
                    @patchzoom="onPatchZoom"
                    @datazoom="onDataZoom"
                />
                <cly-chart-bar
                    v-else-if="data.visualization === 'time-series'"
                    category="user-analytics"
                    height="auto"
                    :hideNotation="false"
                    :no-hourly="true"
                    :option="stackedBarTimeSeriesOptions"
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
                    :showZoom="false"
                    :showToggle="false"
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
import { i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import AnnotationDrawer from '../../../../../frontend/express/public/core/notes/components/AnnotationDrawer.vue';

export default {
    mixins: [
        mixins.customDashboards.global,
        mixins.customDashboards.widget,
        mixins.customDashboards.apps,
        mixins.zoom,
        mixins.hasDrawers("annotation"),
        i18nMixin,
        mixins.graphNotesCommand
    ],
    components: {
        "drawer": AnnotationDrawer
    },
    data: function() {
        return {
            selectedBucket: "daily",
            map: {
                "t": this.i18n("common.total-sessions"),
                "u": this.i18n("common.unique-sessions"),
                "n": this.i18n("common.new-sessions")
            },
        };
    },
    computed: {
        title: function() {
            var autoTitle = "Analytics";
            return this.data.title || autoTitle;
        },
        showBuckets: function() {
            return false;
        },
        getTableData: function() {
            return this.calculateTableDataFromWidget(this.data);
        },
        tableStructure: function() {
            return this.calculateTableColsFromWidget(this.data, this.map);
        },
        timelineGraph: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};

            var series = [];
            var appIndex = 0;
            var multiApps = this.data.app_count === "multiple" ? true : false;

            var dates = [];

            for (var app in this.data.dashData.data) {
                var name;
                for (var k = 0; k < this.data.metrics.length; k++) {
                    if (multiApps) {
                        if (this.data.metrics.length > 1) {
                            name = (this.map[this.data.metrics[k]] || this.data.metrics[k]) + " " + (this.__allApps[app] && this.__allApps[app].name || "Unknown");
                        }
                        else {
                            name = (this.__allApps[app] && this.__allApps[app].name || "Unknown");
                        }
                    }
                    else {
                        name = (this.map[this.data.metrics[k]] || this.data.metrics[k]);
                    }
                    series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], color: countlyCommon.GRAPH_COLORS[series.length]});
                }

                for (var date in this.data.dashData.data[app]) {
                    if (appIndex === 0) {
                        dates.push(date);
                    }
                    for (var kk = 0; kk < this.data.metrics.length; kk++) {
                        series[appIndex * this.data.metrics.length + kk].data.push(this.data.dashData.data[app][date][this.data.metrics[kk]] || 0);
                    }
                }
                appIndex++;
            }
            if (this.data.custom_period) {
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series}
                };
            }
            else if (countlyCommon.periodObj.daysInPeriod === 1 && countlyCommon.periodObj.isSpecialPeriod === true) {
                dates = [dates[0] + " 00:00", dates[0] + " 24:00"];
                for (var z = 0; z < series.length; z++) {
                    series[z].data.push(series[z].data[0]);
                }
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series}
                };
            }
            else {
                return {
                    lineOptions: {"series": series}
                };
            }
        },
        stackedBarOptions: function() {
            return this.calculateStackedBarOptionsFromWidget(this.data, this.map);
        },
        number: function() {
            return this.calculateNumberFromWidget(this.data);
        },
        metricLabels: function() {
            this.data = this.data || {};
            var listed = [];

            for (var k = 0; k < this.data.metrics.length; k++) {
                listed.push(this.map[this.data.metrics[k]] || this.data.metrics[k]);
            }
            return listed;
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
        beforeCopy: function(data) {
            return data;
        },
        refresh: function() {
            this.refreshNotes();
        },
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
    },
};
</script>
