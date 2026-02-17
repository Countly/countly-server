<template>
<div class="search">
    <cly-header
        :title="i18n('guides.search.in-countly-guides')"
    >
        <template v-slot:header-top>
            <cly-back-link :title="i18n('guides.back-to-guides')" link="#/guides/overview"></cly-back-link>
        </template>
        <template v-slot:header-right class="cly-vue-listbox__header bu-p-3">
            <form>
            <el-input
                ref="searchBox"
                autocomplete="off"
                autofocus="true"
                v-model="currentSearchQuery"
                :placeholder="i18n('guides.search.in-guides')"
                @keyup.enter.native="OnEnterSearch"
            >
                <i slot="prefix" class="el-input__icon el-icon-search"></i>
                <i slot="suffix" class="el-input__icon el-icon-circle-close" @click="clearSearch"></i>
            </el-input>
            </form>
        </template>
    </cly-header>
    <cly-main>
        <cly-empty-view
            v-if="!results"
            style="opacity:1"
            :title="i18n('guides.search.start')"
            :subTitle="i18n('guides.search.start-description')"
        >
            <template v-slot:icon>
                <img :src="'images/icons/start-search.svg'">
            </template>
        </cly-empty-view>
        <cly-empty-view
            v-else-if="results && results.length === 0"
            style="opacity:1"
            :title="i18n('guides.search.no-result')"
            :subTitle="i18n('guides.search.no-result-description')"
        >
            <template v-slot:icon>
                <img :src="'images/icons/no-search-result.svg'">
            </template>
        </cly-empty-view>
        <div v-else>
            <div class="count">
                {{ i18n('guides.search.results-count', resultCount, searchQuery) }}
            </div>
            <div>
                <cly-dynamic-tabs
                    v-model="currentTab"
                    :tabs="tabs"
                    customStyle="background: unset; padding: 0px;"
                >
                    <template v-slot:tables="scope">
                        <span>{{ scope.tab.title }}</span>
                    </template>
                </cly-dynamic-tabs>
            </div>
        </div>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyGuides from '../store/index.js';
import SearchResultTab from './SearchResultTab.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            searchQuery: (this.$route.params && this.$route.params.query) || '',
            currentSearchQuery: '',
            currentTab: 'all',
            results: null
        };
    },
    computed: {
        tabs: function() {
            return [
                {
                    title: i18n('guides.all'),
                    name: "all",
                    component: SearchResultTab,
                    props: {
                        items: this.results
                    }
                },
                {
                    title: i18n('guides.walkthroughs'),
                    name: "walkthroughs",
                    component: SearchResultTab,
                    props: {
                        items: this.results && this.results.filter(function(item) {
                            return item.type === "walkthrough";
                        })
                    }
                },
                {
                    title: i18n('guides.articles'),
                    name: "articles",
                    component: SearchResultTab,
                    props: {
                        items: this.results && this.results.filter(function(item) {
                            return item.type === "article";
                        })
                    }
                }
            ];
        },
        resultCount: function() {
            return this.results ? this.results.length : 0;
        }
    },
    methods: {
        OnEnterSearch: function() {
            var self = this;
            if (this.currentSearchQuery !== '') {
                this.searchQuery = this.currentSearchQuery;
                countlyGuides.searchEntries(this.searchQuery).then(function(results) {
                    self.results = results;
                    app.navigate("#/guides/search/" + self.searchQuery);
                });
            }
        },
        clearSearch: function() {
            this.currentSearchQuery = '';
        }
    }
};
</script>
