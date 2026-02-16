<template>
    <div class="sources-wrapper">
        <cly-dynamic-tabs
            v-model="tab"
            :tabs="tabs"
        >
            <template v-slot:tables="scope">
                <span>{{ scope.tab.title }}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>
<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import SourcesTab from './SourcesTab.vue';
import KeywordsTab from './KeywordsTab.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            tab: (this.$route.params && this.$route.params.tab) || 'sources',
            isWeb: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web",
            appId: countlyCommon.ACTIVE_APP_ID,
            tabs: [
                {
                    title: i18n('sources.title'),
                    name: 'sources',
                    component: SourcesTab
                }
            ]
        };
    },
    watch: {
        tab: function(newVal) {
            if (newVal === 'sources') {
                window.location.hash = "#/analytics/acquisition";
            }
        }
    },
    created: function() {
        if (this.isWeb) {
            this.tabs.push({
                title: i18n('keywords.title'),
                name: 'keywords',
                component: KeywordsTab
            });
        }
        if (this.$route.params && this.$route.params.tab === 'keywords') {
            this.tab = 'keywords';
        }
    }
};
</script>
