<template>
    <div v-bind:class="[componentId]">
        <cly-dynamic-tabs v-model="selectedTab" :tabs="tabs" :query="$route.params.query">
            <template v-slot:tables="scope">
                <span>{{scope.tab.title}}</span>
            </template>
        </cly-dynamic-tabs>
    </div>
</template>

<script>
import { tabsMixin, mixins } from '../../../javascripts/countly/vue/container.js';

export default {
    mixins: [
        tabsMixin({
            "logsTabs": "/manage/logs"
        })
    ].concat(mixins(["/manage/logs"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab)
        };
    },
    computed: {
        tabs: function() {
            return this.logsTabs;
        }
    }
};
</script>
