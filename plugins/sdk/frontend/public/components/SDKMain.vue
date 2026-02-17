<template>
    <div>
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs" :query="$route.params && $route.params.query">
            <template v-slot:tables="scope">
                <span>{{ scope.tab.title }}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { tabsMixin, mixins as containerMixins } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';

export default {
    mixins: [
        i18nMixin,
        autoRefreshMixin,
        tabsMixin({"sdkTabs": "/manage/sdk"})
    ].concat(containerMixins(["/manage/sdk"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "stats"
        };
    },
    computed: {
        tabs: function() {
            return this.sdkTabs;
        }
    },
    methods: {
        refresh: function() {
            // noop - tabs handle their own refresh
        }
    }
};
</script>
