<template>
    <div v-bind:class="[componentId]">
        <clyd-home-widget-header :widget="headerData"></clyd-home-widget-header>
        <cly-section>
            <cly-metric-cards :multiline="false" v-loading="isLoading" style="min-height:100px;">
                    <cly-metric-card :label="item.name" :test-id="'crashes-index-' + idx" :tooltip="item.info" :isEstimate="item.isEstimate" :estimateTooltip="i18n('common.estimation')" :box-type="5" formatting="long" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center" :key="idx" v-for="(item, idx) in crashesItems">
                        <template v-slot:number>{{item.value}}</template>
                        <span v-if="item.trend=='d'" slot="description" :class="['cly-trend-down', item.reverse ? 'negated' : '']" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-desc'"><i class="cly-trend-down-icon ion-android-arrow-down" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-icon'"></i>{{item.change}}</span>
                        <span v-else-if="item.trend=='u'" slot="description" :class="['cly-trend-up', item.reverse ? 'negated' : '']" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-desc'"><i class="cly-trend-up-icon ion-android-arrow-up" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-icon'"></i>{{item.change}}</span>
                        <span v-else slot="description" class="cly-trend-neutral" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-desc'"><i class="cly-trend-up-icon cly-trend-neutral-icon ion-minus-round" :data-test-id="'metric-card-crashes-index-' + idx + '-coloumn-trend-icon'"></i>{{item.change}}</span>
                    </cly-metric-card>
            </cly-metric-cards>
        </cly-section>
    </div>
</template>

<script>
import { i18nMixin, i18n as cvI18n, vuex } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyCrashes from '../store/index.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            crashesItems: [],
            isLoading: true,
            headerData: {
                label: cvI18n("crashes.crash-statistics"),
                description: cvI18n("crashes.plugin-description"),
                linkTo: {"label": cvI18n('crashes.go-to-crashes'), "href": "#/crashes"},
            }
        };
    },
    mounted: function() {
        var self = this;
        this.$store.dispatch("countlyCrashes/overview/refresh").then(function() {
            self.calculateAllData();
            self.isLoading = false;
        });
    },
    beforeCreate: function() {
        this.module = countlyCrashes.getVuexModule();
        vuex.registerGlobally(this.module);
    },
    beforeDestroy: function() {
        vuex.unregister(this.module.name);
        this.module = null;
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            this.$store.dispatch("countlyCrashes/overview/refresh").then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {

            var data = this.$store.getters["countlyCrashes/overview/dashboardData"] || {};
            var blocks = [];

            var getUs = [
                {"name": cvI18n('crashes.total-crashes'), "info": cvI18n('crashes.home.total'), "prop": "cr", "r": true},
                {"name": cvI18n('crashes.unique'), "info": cvI18n('crashes.home.unique'), "prop": "cru", "r": true},
                {"name": cvI18n('crashes.total-per-session'), "info": cvI18n('crashes.home.per-session'), "prop": "cr-session", "r": true},
                {"name": cvI18n('crashes.free-users'), "info": cvI18n('crashes.help-free-users'), "prop": "crau", "p": true},
                {"name": cvI18n('crashes.free-sessions'), "info": cvI18n('crashes.help-free-sessions'), "prop": "crinv", "p": true}
            ];

            for (var k = 0; k < getUs.length; k++) {
                data[getUs[k].prop] = data[getUs[k].prop] || {};
                var value = data[getUs[k].prop].total;
                if (!getUs[k].p) {
                    value = countlyCommon.getShortNumber(data[getUs[k].prop].total || 0);
                }

                blocks.push({
                    "name": getUs[k].name,
                    "reverse": getUs[k].r,
                    "value": value,
                    "info": getUs[k].info,
                    "trend": data[getUs[k].prop].trend,
                    "change": data[getUs[k].prop].change,
                    "isEstimate": data[getUs[k].prop].isEstimate || false,
                });
            }

            this.crashesItems = blocks;
        }
    }
};
</script>
