<template>
    <div v-bind:class="[componentId]" class="cly-vue-data-manager">
        <cly-dynamic-tabs v-model="currentPrimaryTab" :tabs="primaryTabs" skin="primary" :no-history=true></cly-dynamic-tabs>
    </div>
</template>

<script>
import { i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { tabsMixin, mixins as containerMixins } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { validateRead } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import EventsView from './EventsView.vue';

var FEATURE_NAME = "data_manager";
var SUB_FEATURE_TRANSFORMATIONS = FEATURE_NAME + '_transformations';

export default {
    mixins: [
        tabsMixin({
            "externalTabs": "/manage/data-manager"
        }),
        commonFormattersMixin,
        i18nMixin
    ].concat(containerMixins(["/manage/data-manager"])),
    data: function() {
        var localTabs = [];
        if (validateRead(FEATURE_NAME) || validateRead(SUB_FEATURE_TRANSFORMATIONS)) {
            localTabs.push({
                priority: 1,
                title: this.i18n('data-manager.events'),
                name: "events",
                component: EventsView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events",
            });
        }
        return {
            currentPrimaryTab: (this.$route.params && this.$route.params.primaryTab) || "events",
            localTabs: localTabs
        };
    },
    computed: {
        primaryTabs: function() {
            return this.localTabs.concat(this.externalTabs);
        }
    }
};
</script>
