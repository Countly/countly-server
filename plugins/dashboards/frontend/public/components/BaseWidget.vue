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
                        v-model="bucketValue"
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
            :echartRef="$refs.echartRef && $refs.echartRef.$refs && $refs.echartRef.$refs.echarts"
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
                        v-if="tableData.length"
                        :hideTop="true"
                        :rows="tableData"
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
        <annotation-drawer
            :controls="drawers.annotation"
            :settings="drawerSettingsForWidgets"
            @cly-refresh="refreshNotes"
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
import AnnotationDrawer from '../../../../../frontend/express/public/core/notes/components/AnnotationDrawer.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyChartZoom from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-zoom.vue';
import ClyChartTime from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-time.vue';
import ClyChartBar from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-bar.vue';
import ClyChartPie from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-pie.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyBlank from '../../../../../frontend/express/public/javascripts/components/helpers/cly-blank.vue';
import ClydWidgetTitle from './helpers/widget/ClydWidgetTitle.vue';
import ClydBucket from './helpers/widget/ClydBucket.vue';
import ClydPrimaryLegend from './helpers/widget/ClydPrimaryLegend.vue';
import ClydSecondaryLegend from './helpers/widget/ClydSecondaryLegend.vue';
import ClydWidgetApps from './helpers/widget/ClydWidgetApps.vue';
import { mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [
        mixins.customDashboards.global,
        mixins.customDashboards.widget,
        mixins.customDashboards.apps,
        mixins.zoom,
        mixins.i18n,
        mixins.hasDrawers("annotation"),
        mixins.graphNotesCommand,
        mixins.commonFormatters
    ],
    components: {
        AnnotationDrawer,
        ClyMoreOptions,
        ClyChartZoom,
        ClyChartTime,
        ClyChartBar,
        ClyChartPie,
        ClyDatatableN,
        ClyBlank,
        ClydWidgetTitle,
        ClydBucket,
        ClydPrimaryLegend,
        ClydSecondaryLegend,
        ClydWidgetApps
    },
    props: {
        title: { type: String, default: "" },
        selectedBucket: { type: String, default: "daily" },
        showBuckets: { type: Boolean, default: false },
        tableData: { type: Array, default: function() { return []; } },
        tableStructure: { type: Array, default: function() { return []; } },
        timelineGraph: { type: Object, default: function() { return { lineOptions: { series: [] } }; } },
        stackedBarOptions: { type: Object, default: function() { return {}; } },
        stackedBarTimeSeriesOptions: { type: Object, default: function() { return {}; } },
        pieGraph: { type: Object, default: function() { return {}; } },
        number: { type: Object, default: function() { return {}; } },
        metricLabels: { type: [Array, Object], default: function() { return []; } },
        legendLabels: { type: Object, default: function() { return {}; } },
        valFormatter: { type: Function, default: null }
    },
    data: function() {
        return {
            bucketValue: this.selectedBucket
        };
    },
    methods: {
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
        }
    }
};
</script>
