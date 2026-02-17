<template>
    <div id="reports-view">
        <cly-header
            :title="i18n('reports.title')"
            :tooltip="{description: i18n('reports.tips'), placement: 'top-center'}"
        >
            <template v-slot:header-right>
                <el-button id="create-report-button" type="success" icon="el-icon-circle-plus" v-if="canUserCreate" @click="createReport" data-test-id="create-new-report-button">{{i18n('reports.create')}}</el-button>
            </template>
        </cly-header>
        <cly-main>
            <table-view v-on:open-drawer="openDrawer" :callCreateReportDrawer="createReport"></table-view>
        </cly-main>
        <drawer @close="closeDrawer" :controls="drawers.home"></drawer>
    </div>
</template>

<script>
import { i18nMixin, authMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { defaultDrawerConfigValue, reportsState } from '../store/index.js';
import ReportsTable from './ReportsTable.vue';
import ReportsDrawer from './ReportsDrawer.vue';

export default {
    mixins: [
        mixins.hasDrawers("home"),
        authMixin("reports"),
        i18nMixin,
    ],
    components: {
        "table-view": ReportsTable,
        "drawer": ReportsDrawer,
    },
    data: function() {
        return {};
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyReports/initialize");
    },
    methods: {
        createReport: function() {
            this.openDrawer("home", defaultDrawerConfigValue());
        },
    },
    mounted: function() {
        if (reportsState.createDashboard) {
            var defaultData = defaultDrawerConfigValue();
            var data = Object.assign({}, defaultData);
            if (data.title) {
                data.title = countlyCommon.unescapeHtml(data.title);
            }
            data.report_type = "dashboards";
            data.dashboards = reportsState.createDashboard;
            this.openDrawer("home", data);
            reportsState.createDashboard = null;
        }
    },
};
</script>
