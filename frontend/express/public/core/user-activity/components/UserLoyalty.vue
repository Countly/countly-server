<template>
    <div class="user-loyalty-wrapper">
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs">
            <template v-slot:overview="scope">
                <span>{{scope.tab.title}}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { tabsMixin } from '../../../javascripts/countly/vue/container.js';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyDynamicTabs
    },
    mixins: [
        tabsMixin({
            "userLoyaltyTabs": "/analytics/loyalty"
        })
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "user-activity"
        };
    },
    computed: {
        tabs: function() {
            return this.userLoyaltyTabs;
        }
    },
};
</script>
