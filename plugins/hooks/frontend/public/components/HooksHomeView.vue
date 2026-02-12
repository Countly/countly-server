<template>
<div v-bind:class="[componentId]">
   <cly-header
    :title="i18n('hooks.plugin-title')"
    :tooltip="{description: i18n('hooks.plugin-title-desc'), position: 'top-center'}"
   >
     <template v-slot:header-right>
      <el-button type="success" icon="el-icon-circle-plus" v-if="canUserCreate" v-on:click="createHook()" data-test-id="new-hook-button">{{i18n('hooks.new-hook')}}</el-button>
   </template>
  </cly-header>

  <cly-main>
     <table-view v-on:open-drawer="openDrawer"></table-view>
  </cly-main>
  <drawer @close="closeDrawer" :controls="drawers.home"></drawer>
</div>
</template>

<script>
import { i18nMixin, authMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import hooksPlugin from '../store/index.js';
import TableView from './TableView.vue';
import HookDrawer from './HookDrawer.vue';

var FEATURE_NAME = "hooks";

export default {
    mixins: [
        i18nMixin,
        mixins.hasDrawers("home"),
        authMixin(FEATURE_NAME),
    ],
    components: {
        "table-view": TableView,
        "drawer": HookDrawer,
    },
    data: function() {
        return {};
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyHooks/initialize");
    },
    methods: {
        createHook: function() {
            this.$store.dispatch("countlyHooks/resetTestResult");
            this.openDrawer("home", hooksPlugin.defaultDrawerConfigValue());
        },
    },
};
</script>
