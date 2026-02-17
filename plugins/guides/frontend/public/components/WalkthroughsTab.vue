<template>
<cly-dynamic-tabs
    v-model="currentTab"
    :tabs="tabs"
    :hideSingleTab="false"
    customStyle="background: unset; padding: 0px 30px;"
    skin="primary"
>
    <template v-slot:tables="scope">
        <span>{{ scope.tab.title }}</span>
    </template>
</cly-dynamic-tabs>
</template>

<script>
import { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGuides from '../store/index.js';
import WalkthroughsComponent from './WalkthroughsComponent.vue';

export default {
    data: function() {
        return {
            currentTab: (this.$route.params && this.$route.params.secondaryTab) || "all",
            walkthroughs: [],
            tabs: []
        };
    },
    created: function() {
        var self = this;
        countlyGuides.fetchEntries()
            .then(function() {
                self.walkthroughs = countlyGuides.getWalkthroughs();
                self.createTabs();
            })
            .catch(function() {
                // silent
            });
    },
    methods: {
        createTabs: function() {
            var self = this;
            var tabs = [
                {
                    title: i18n('guides.walkthroughs.all'),
                    name: "all",
                    component: WalkthroughsComponent,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs",
                    props: {
                        items: self.walkthroughs
                    }
                },
            ];
            var sections = [];
            self.walkthroughs.forEach(function(walkthrough) {
                if (!sections.includes(walkthrough.sectionID)) {
                    sections.push(walkthrough.sectionID);
                    tabs.push({
                        title: countlyCommon.unescapeHtml(walkthrough.sectionTitle),
                        name: walkthrough.sectionID.substring(1),
                        component: WalkthroughsComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs" + walkthrough.sectionID,
                        props: {
                            items: self.walkthroughs.filter(function(item) {
                                return item.sectionID === walkthrough.sectionID;
                            })
                        }
                    });
                }
            });
            self.tabs = tabs;
        }
    }
};
</script>
