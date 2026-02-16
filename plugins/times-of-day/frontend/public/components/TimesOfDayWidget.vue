<template>
    <div :class="[componentId, 'clyd-widget']">
        <div class="bu-level">
            <div
                class="bu-level-left bu-is-flex-shrink-1"
                style="min-width: 0"
            >
                <clyd-widget-title
                    class="bu-level-item"
                    :title="title"
                />
            </div>
            <div class="bu-level-right">
                <slot name="action" />
            </div>
        </div>
        <div
            class="clyd-widget__content"
            v-loading="loading"
            @mousedown.stop
        >
            <template v-if="!loading">
                <scatter-chart
                    height="auto"
                    :maxSeriesValue="maxSeriesValue"
                    :series="series"
                    :showDownload="false"
                    :show-zoom="false"
                    :show-toggle="false"
                    skin="full"
                />
            </template>
        </div>
        <clyd-widget-apps :apps="data.apps" />
    </div>
</template>
<script>
import { i18n, i18nMixin, commonFormattersMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { service } from '../store/index.js';
import ScatterChart from './ScatterChart.vue';

export default {
    components: {
        ScatterChart
    },
    mixins: [
        mixins.customDashboards.global,
        commonFormattersMixin,
        i18nMixin
    ],
    computed: {
        title: function() {
            var self = this;
            var periods = service.getDateBucketsList();
            var periodName = periods.filter(function(obj) {
                return obj.value === self.data.period;
            });

            var esTypeName = this.data.data_type === "session" ? this.i18n('times-of-day.sessions') : this.data.events[0].split("***")[1];
            var widgetTitle = i18n('times-of-day.title') + " : " + esTypeName + " (" + periodName[0].label + ")";
            return this.data.title || widgetTitle;
        },
        dashboardData: function() {
            if (this.data.dashData && this.data.dashData.data) {
                return this.data.dashData.data;
            }
            return [];
        },
        series: function() {
            return service.mapSeries(this.dashboardData);
        },
        maxSeriesValue: function() {
            return service.findMaxSeriesValue(this.dashboardData);
        }
    }
};
</script>
