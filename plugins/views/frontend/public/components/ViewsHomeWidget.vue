<template>
    <div v-bind:class="[componentId]">
        <clyd-home-widget-header :widget="headerData"></clyd-home-widget-header>
        <cly-section class="views-dashboard-widget">
            <cly-metric-cards v-loading="isLoading" style="min-height:100px;">
                <cly-metric-card :number="item.percent" :test-id="'views-index-' + idx" :label="item.name" :color="item.color" :tooltip="item.description" :is-percentage="item.isPercentage" :key="idx" v-for="(item, idx) in dataBlocks">
                    <!-- <span class="cly-vue-tooltip-icon ion ion-help-circled" style="margin-left:10px" v-tooltip.top-center="item.description"></span> -->
                    <template v-slot:number>{{item.value}}</template>
                </cly-metric-card>
            </cly-metric-cards>
        </cly-section>
    </div>
</template>

<script>
import { i18n, i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { registerGlobally, unregister } from '../../../../../frontend/express/public/javascripts/countly/vue/data/store.js';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyMetricCards from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-card.vue';

export default {
    components: {
        ClySection,
        ClyMetricCards,
        ClyMetricCard
    },
    mixins: [i18nMixin, autoRefreshMixin],
    data: function() {
        return {
            dataBlocks: [],
            isLoading: true,
            headerData: {
                label: i18n("views.title"),
                description: i18n("views.title-desc"),
                linkTo: {"label": i18n('views.go-to-views'), "href": "#/analytics/views"},
            }
        };
    },
    mounted: function() {
        var self = this;
        self.$store.dispatch('countlyViews/fetchTotals').then(function() {
            self.dataBlocks = self.calculateAllData();
            self.isLoading = false;
        });
    },
    beforeCreate: function() {
        this.module = window.countlyViews.getVuexModule();
        registerGlobally(this.module);
    },
    beforeDestroy: function() {
        unregister(this.module.name);
        this.module = null;
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            self.$store.dispatch('countlyViews/fetchTotals').then(function() {
                self.dataBlocks = self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {
            var totals = {};
            if (this.$store && this.$store.state && this.$store.state.countlyViews) {
                totals = this.$store.state.countlyViews.totals || {};
            }
            totals.t = totals.t || 0;
            totals.uvc = totals.uvc || 0;
            totals.s = totals.s || 0;
            totals.b = totals.b || 0;
            if (totals.s) {
                totals.br = Math.round(totals.b / totals.s * 1000) / 10;
            }
            else {
                totals.br = 0;
            }

            return [
                {
                    "name": i18n('views.total_page_views.title'),
                    "description": i18n('views.total_page_views.desc'),
                    "value": countlyCommon.formatNumber(totals.t),
                    "percent": 0,
                    isPercentage: false
                },
                {
                    "name": i18n('views.uvc'),
                    "description": i18n('views.unique_page_views.desc'),
                    "value": countlyCommon.formatNumber(totals.uvc),
                    "percent": 0,
                    isPercentage: false
                },
                {
                    "name": i18n('views.br'),
                    "description": i18n('views.bounce_rate.desc'),
                    "value": totals.br + "%",
                    "percent": Math.min(totals.br, 100),
                    isPercentage: true,
                    "color": "#F96300"
                }
            ];
        }
    }
};
</script>
