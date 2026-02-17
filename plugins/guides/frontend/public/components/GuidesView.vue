<template>
<div>
    <cly-header
        :title="i18n('guides.plugin-title')"
    >
        <template v-slot:header-right class="cly-vue-listbox__header bu-p-3">
            <a class="el-button bu-mr-2" href="https://support.count.ly" target="_blank">
                {{ i18n('guides.go-to-help-center') }}
                <i class="ion-android-open bu-ml-1"></i>
            </a>
            <el-input
                ref="searchBox"
                autocomplete="off"
                v-model="searchQuery"
                :placeholder="i18n('guides.search.in-guides')"
                @focus="onFocus"
            >
                <i slot="prefix" class="el-input__icon el-icon-search"></i>
                <i slot="suffix" class="el-input__icon el-icon-circle-close" @click="clearSearch"></i>
            </el-input>
        </template>
        <template v-slot:header-tabs>
            <cly-dynamic-tabs
                v-model="currentTab"
                skin="secondary"
                :tabs="tabs"
            >
                <template v-slot:tables="scope">
                    <span>{{ scope.tab.title }}</span>
                </template>
            </cly-dynamic-tabs>
        </template>
    </cly-header>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import OverviewTab from './OverviewTab.vue';
import WalkthroughsTab from './WalkthroughsTab.vue';
import ArticlesTab from './ArticlesTab.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            currentTab: (this.$route.params && this.$route.params.primaryTab) || 'overview',
            searchQuery: '',
            tabs: [
                {
                    title: i18n('guides.overview'),
                    name: "overview",
                    component: OverviewTab,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/overview"
                },
                {
                    title: i18n('guides.walkthroughs'),
                    name: "walkthroughs",
                    component: WalkthroughsTab,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs",
                },
                {
                    title: i18n('guides.articles'),
                    name: "articles",
                    component: ArticlesTab,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles",
                }
            ]
        };
    },
    methods: {
        onFocus: function() {
            if (this.searchQuery === "") {
                app.navigate("#/guides/search", true);
            }
        },
        clearSearch: function() {
            this.searchQuery = '';
        },
    }
};
</script>
