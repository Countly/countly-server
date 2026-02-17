<template>
    <div v-bind:class="[componentId]">
        <cly-dynamic-tabs
            v-model="dynamicTab"
            :tabs="tabs"
            :noHistory="true"
        />
    </div>
</template>
<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { i18nMixin, commonFormattersMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ParametersView from './ParametersView.vue';
import ConditionsView from './ConditionsView.vue';

export default {
    mixins: [commonFormattersMixin, autoRefreshMixin, i18nMixin],
    data: function() {
        var tabs = [
            {
                title: "Parameters",
                name: "parameters",
                component: ParametersView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/parameters"
            }
        ];
        if (countlyGlobal.plugins.indexOf("drill") > -1) {
            tabs.push({
                title: "Conditions",
                name: "conditions",
                component: ConditionsView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/conditions"
            });
        }
        return {
            dynamicTab: (this.$route.params && this.$route.params.tab) || "parameters",
            tabs: tabs
        };
    },
    beforeCreate: function() {
        var self = this;
        this.$store.dispatch("countlyRemoteConfig/initialize").then(function() {
            self.$store.dispatch("countlyRemoteConfig/conditions/setTableLoading", false);
        });
    },
    methods: {
        refresh: function() {
            this.$store.dispatch("countlyRemoteConfig/initialize");
        },
    }
};
</script>
