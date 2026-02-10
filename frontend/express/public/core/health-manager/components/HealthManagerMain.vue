<template>
    <div v-bind:class="[componentId]" class="health-manager-view">
        <cly-header :title="i18n('health-manager.title')">
            <template v-slot:header-tabs>
                <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs" skin="secondary" :hide-single-tab="false" :query="$route.params.query"></cly-dynamic-tabs>
            </template>
        </cly-header>
    </div>
</template>

<script>
import { tabsMixin, mixins } from '../../../javascripts/countly/vue/container.js';
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyHeader,
        ClyDynamicTabs
    },
    mixins: [
        i18nMixin,
        tabsMixin({
            "healthTabs": "/manage/health"
        })
    ].concat(mixins(["/manage/health"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab)
        };
    },
    computed: {
        tabs: function() {
            return this.healthTabs;
        }
    }
};
</script>
