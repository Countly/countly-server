<template>
    <div class="session-analytics-wrapper">
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs">
            <template v-slot:overview="scope">
                <span>{{scope.tab.title}}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { tabsMixin } from '../../../javascripts/countly/vue/container.js';

export default {
    mixins: [
        tabsMixin({
            "sessionAnalyticsTabs": "/analytics/sessions"
        })
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "overview"
        };
    },
    computed: {
        tabs: function() {
            return this.sessionAnalyticsTabs;
        }
    }
};
</script>
