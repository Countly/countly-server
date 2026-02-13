<template>
<div class="user-management-wrapper" v-bind:class="[componentId]">
    <cly-dynamic-tabs v-model="dynamicTab" :tabs="tabs">
        <template v-slot:tables="scope">
            <span>{{scope.tab.title}}</span>
        </template>
    </cly-dynamic-tabs>
</div>
</template>

<script>
import { i18nMixin, i18n } from '../../../javascripts/countly/vue/core.js';
import { tabsMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import ManageUsersContainer from './ManageUsersContainer.vue';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyDynamicTabs,
    },
    mixins: [
        i18nMixin,
        tabsMixin({
            "externalTabs": "groups/tab"
        })
    ],
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            dynamicTab: (this.$route.params && this.$route.params.tab) || "users",
            localTabs: [
                {
                    title: i18n('management-users.users'),
                    name: "users",
                    component: ManageUsersContainer,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/users"
                }
            ]
        };
    },
    computed: {
        tabs: function() {
            var allTabs = this.localTabs.concat(this.externalTabs);
            return allTabs;
        }
    }
};
</script>
