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
import ArticlesComponent from './ArticlesComponent.vue';

export default {
    data: function() {
        return {
            currentTab: (this.$route.params && this.$route.params.secondaryTab) || "all",
            articles: [],
            tabs: []
        };
    },
    created: function() {
        var self = this;
        countlyGuides.fetchEntries()
            .then(function() {
                self.articles = countlyGuides.getArticles();
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
                    title: i18n('guides.articles.all'),
                    name: "all",
                    component: ArticlesComponent,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles",
                    props: {
                        items: self.articles
                    }
                },
            ];
            var sections = [];
            self.articles.forEach(function(article) {
                if (!sections.includes(article.sectionID)) {
                    sections.push(article.sectionID);
                    tabs.push({
                        title: countlyCommon.unescapeHtml(article.sectionTitle),
                        name: article.sectionID.substring(1),
                        component: ArticlesComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles" + article.sectionID,
                        props: {
                            items: self.articles.filter(function(item) {
                                return item.sectionID === article.sectionID;
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
