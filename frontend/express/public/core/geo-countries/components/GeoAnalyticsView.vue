<template>
    <div class="geo-analytics-wrapper" v-bind:class="[componentId]">
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs">
            <template v-slot:overview="scope">
                <span>{{scope.tab.title}}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import { tabsMixin, mixins } from '../../../javascripts/countly/vue/container.js';

import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyDynamicTabs
    },
    mixins: [
        i18nMixin,
        tabsMixin({
            "geoAnalyticsTabs": "/analytics/geo"
        }),
        mixins(["/analytics/geo"])
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "countries"
        };
    },
    computed: {
        tabs: function() {
            return this.geoAnalyticsTabs;
        }
    }
};
</script>
