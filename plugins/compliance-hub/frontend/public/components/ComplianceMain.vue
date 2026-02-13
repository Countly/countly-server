<template>
    <div v-bind:class="[componentId]">
        <cly-header>
            <template v-slot:header-left>
                <div class="bu-is-flex bu-is-flex-direction-row title bu-mr-2">
                    <h3 class="bu-mr-2">Compliance Hub </h3>
                    <cly-guide></cly-guide>
                </div>
            </template>
            <template v-slot:header-tabs>
                    <cly-dynamic-tabs class="cly-vue-complaince__hub" v-model="dynamicTab" skin="secondary" :tabs="tabs">
                    </cly-dynamic-tabs>
            </template>
        </cly-header>
    </div>
</template>

<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { validateGlobalAdmin } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import MetricsView from './MetricsView.vue';
import UserView from './UserView.vue';
import ConsentHistory from './ConsentHistory.vue';
import ExportHistory from './ExportHistory.vue';

import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyHeader,
        ClyDynamicTabs,
    },
    data: function() {
        var tabs = [
            {
                title: "Metrics",
                name: "metrics",
                component: MetricsView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/"
            },
            {
                title: "Users",
                name: "users",
                component: UserView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/users"
            },
            {
                title: "Consent History",
                name: "history",
                component: ConsentHistory,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/history"
            }
        ];

        if (validateGlobalAdmin()) {
            tabs.push({
                title: "Export/Purge History",
                name: "actionlogs",
                component: ExportHistory,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/actionlogs"
            });
        }
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            dynamicTab: (this.$route.params && this.$route.params.tab) || "",
            localTabs: tabs
        };
    },
    computed: {
        tabs: function() {
            var allTabs = this.localTabs;
            return allTabs;
        }
    }
};
</script>
