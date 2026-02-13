<template>
    <div>
        <cly-header
            :title="i18n('sidebar.management.longtasks')"
        >
            <template v-slot:header-tabs>
                <cly-dynamic-tabs v-model="dynamicTab" skin="secondary" :tabs="localTabs">
                </cly-dynamic-tabs>
            </template>
        </cly-header>
    </div>
</template>

<script>
import { i18nMixin, i18n } from '../../../javascripts/countly/vue/core.js';
import ManualReportsTab from './ManualReportsTab.vue';
import AutomaticReportsTab from './AutomaticReportsTab.vue';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyHeader,
        ClyDynamicTabs,
    },
    mixins: [i18nMixin],
    data: function() {
        return {
            dynamicTab: "manual-reports-tab",
            localTabs: [
                {
                    title: i18n('report-maanger.manually-created'),
                    name: "manual-reports-tab",
                    component: ManualReportsTab
                },
                {
                    title: i18n('report-maanger.automatically-created'),
                    name: "automatic-reports-tab",
                    component: AutomaticReportsTab
                }
            ]
        };
    }
};
</script>
