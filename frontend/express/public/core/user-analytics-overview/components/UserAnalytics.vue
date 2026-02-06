<template>
    <div class="technology-analytics-wrapper">
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs">
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { tabsMixin, mixins } from '../../../javascripts/countly/vue/container.js';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyDynamicTabs
    },
    mixins: [
        tabsMixin({
            "userAnalyticsTabs": "/analytics/users"
        })
    ].concat(mixins(["/analytics/users"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "overview"
        };
    },
    computed: {
        tabs: function() {
            return this.userAnalyticsTabs;
        }
    }
};
</script>
