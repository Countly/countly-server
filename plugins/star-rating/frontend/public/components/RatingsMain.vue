<template>
    <div class="ratings-wrapper">
        <cly-dynamic-tabs v-model="dynamicTab" :tabs="tabs">
            <template v-slot:tables="scope">
                <span>{{scope.tab.title}}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import RatingsTab from './RatingsTab.vue';
import WidgetsTab from './WidgetsTab.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyDynamicTabs
    },
    mixins: [countlyVue.mixins.i18n],
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            dynamicTab: (this.$route.params && this.$route.params.tab) || "ratings",
            tabs: [
                {
                    title: i18n('feedback.ratings'),
                    name: 'ratings',
                    component: RatingsTab,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/ratings',
                    dataTestId: "ratings-tab-ratings"
                },
                {
                    title: i18n('feedback.widgets'),
                    name: 'widgets',
                    component: WidgetsTab,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/widgets',
                    dataTestId: "ratings-tab-rating-widgets"
                }
            ]
        };
    }
};
</script>
