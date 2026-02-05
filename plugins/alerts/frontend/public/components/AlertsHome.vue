<template>
    <div id="alerts-view">
        <cly-header
            :title="i18n('alert.plugin-title')"
            :tooltip="{description: i18n('alert.tips'), placement: 'top-center'}">
            <template v-slot:header-right>
                <el-button
                    data-test-id="add-new-alert-button"
                    type="success"
                    icon="el-icon-circle-plus"
                    v-if="canCreate"
                    @click="createAlert">
                    {{ i18n('alert.Add_New_Alert') }}
                </el-button>
            </template>
        </cly-header>
        <cly-main>
            <div class="bu-mb-4 cly-vue-section__content white-bg" v-if="!shouldHideCount" v-loading="!initialized">
                <cly-metric-cards>
                    <cly-metric-card
                        :test-id="i18n(item.label).toLowerCase().replaceAll(' ', '-')"
                        :columnWidth="4"
                        :color="item.color"
                        :number="item.percent"
                        :key="idx"
                        v-for="(item, idx) in countData">
                        {{ i18n(item.label) }}
                        <template v-slot:number>{{ item.value || 0 }}</template>
                    </cly-metric-card>
                </cly-metric-cards>
            </div>
            <div class="bu-mt-6">
                <alerts-table @open-drawer="openDrawer" :callCreateAlertDrawer="createAlert"></alerts-table>
            </div>
        </cly-main>
        <alert-drawer @close="closeDrawer" :controls="drawers.home"></alert-drawer>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import * as countlyAuth from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import AlertsTable from './AlertsTable.vue';
import AlertDrawer from './AlertDrawer.vue';
import { defaultDrawerConfigValue } from '../store/index.js';

const ALERTS_FEATURE_NAME = "alerts";

export default {
    mixins: [
        countlyVue.mixins.hasDrawers("home"),
        countlyVue.mixins.auth(ALERTS_FEATURE_NAME),
        countlyVue.mixins.i18n,
    ],
    components: {
        "alerts-table": AlertsTable,
        "alert-drawer": AlertDrawer,
    },
    data: function() {
        return {
            canCreate: countlyAuth.validateCreate(ALERTS_FEATURE_NAME),
        };
    },
    computed: {
        countData: function() {
            var count = this.$store.getters["countlyAlerts/table/count"];
            return [
                { label: "alert.RUNNING_ALERTS", value: count.r },
                { label: "alert.TOTAL_ALERTS_SENT", value: count.t },
                { label: "alert.ALERTS_SENT_TODAY", value: count.today },
            ];
        },
        shouldHideCount: function() {
            var result = this.$store.getters["countlyAlerts/table/getInitialized"];
            var rows = this.$store.getters["countlyAlerts/table/all"];
            return result && rows.length === 0;
        },
        initialized: function() {
            var result = this.$store.getters["countlyAlerts/table/getInitialized"];
            return result;
        },
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyAlerts/initialize");
    },
    methods: {
        i18n: i18n,
        createAlert: function() {
            var config = defaultDrawerConfigValue();
            this.openDrawer("home", config);
        },
    },
};
</script>