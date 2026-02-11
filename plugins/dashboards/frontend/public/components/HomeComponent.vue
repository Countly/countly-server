<template>
<div v-bind:class="[componentId, 'cly-vue-dashboards']">
    <template v-if="noSelectedDashboard">
        <cly-main v-if="!isInitLoad" class="bu-mt-6">
            <no-dashboard></no-dashboard>
        </cly-main>
        <cly-main v-else v-loading="isInitLoad" style="margin-top: 35%;"></cly-main>
    </template>
    <template v-else>
        <header>
            <div style="padding: 32px 32px 20px 32px;">
                <div class="bu-level">
                    <div class="bu-level-left bu-is-flex-shrink-1" style="min-width: 0;">
                        <div class="bu-level-item bu-is-flex-shrink-1" style="min-width: 0;">
                            <h2 class="has-ellipsis" data-test-id="dashboard-name">{{dashboard.name}}</h2>
                        </div>
                    </div>
                    <div class="bu-level-right">
                        <div class="bu-level-item">
                            <cly-date-picker-g test-id="dashboard-date-picker"></cly-date-picker-g>
                        </div>
                        <template v-if="!isInitLoad">
                            <template v-if="!fullscreen">
                                <div class="bu-level-item" v-if="canUpdateGrid">
                                    <el-button @click="newWidget" type="success" icon="el-icon-circle-plus" data-test-id="add-widget-button">{{i18nM('dashboards.add-widget')}}</el-button>
                                </div>
                                <div class="bu-level-item">
                                    <cly-more-options @command="onDashboardAction($event, dashboard)" test-id="dashboard">
                                        <el-dropdown-item command="fullscreen" data-test-id="dashboard-more-button-fullscreen-option">{{i18nM('dashboards.activate-full-screen')}}</el-dropdown-item>
                                        <el-dropdown-item command="edit" v-if="canUpdateGrid && canUpdateDashboard" data-test-id="dashboard-more-button-edit-option">{{i18nM('common.edit')}}</el-dropdown-item>
                                        <el-dropdown-item v-if="canUpdateGrid"><a :href="'#/manage/reports/create/dashboard/' + dashboard._id" data-test-id="dashboard-more-button-create-email-reports-option">{{i18nM('dashboards.create-email-reports')}}</a></el-dropdown-item>
                                        <el-dropdown-item command="duplicate" v-if="canUpdateGrid" data-test-id="dashboard-more-button-duplicate-option">{{i18nM('dashboards.duplicate-dashboard')}}</el-dropdown-item>
                                        <el-dropdown-item command="delete" v-if="canUpdateGrid && canUpdateDashboard" data-test-id="dashboard-more-button-delete-option">{{i18nM('common.delete')}}</el-dropdown-item>
                                    </cly-more-options>
                                </div>
                            </template>
                            <template v-else>
                                <div class="bu-level-item">
                                    <el-button @click="exitFullScreen" icon="el-icon-circle-close" data-test-id="exit-fullscreen-button"></el-button>
                                </div>
                            </template>
                        </template>
                    </div>
                </div>
                <div class="bu-level bu-mt-2" v-if="dashboard.creation.time || dashboard.creation.by">
                    <div class="bu-level-left">
                        <div class="bu-level-item">
                            <div class="bu-level-item color-cool-gray-50 text-medium" data-test-id="dashboard-creation-info">
                                <span>
                                    <i class="far fa-clock" data-test-id="dashboard-creation-time-icon"></i>
                                    <span data-test-id="dashboard-created-label">{{i18nM('dashbaords.created')}}</span>
                                </span>
                                <span v-if="dashboard.creation.time" class="bu-ml-1" data-test-id="dashboard-creation-time">
                                    {{dashboard.creation.time}}
                                </span>
                                <span v-if="dashboard.creation.by" class="bu-ml-1" data-test-id="dashboard-creation-by">
                                    {{i18nM('dashbaords.created-by', dashboard.creation.by)}}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        <cly-main>
            <no-widget v-if="noWidgets && !isWidgetProcessing" :can-update="canUpdateGrid" @new-widget="newWidget"></no-widget>
            <dashboards-grid ref="grid" :loading="isInitLoad || isRefreshing" :can-update="canUpdateGrid"></dashboards-grid>

            <dashboards-drawer :controls="drawers.dashboards"></dashboards-drawer>
            <widgets-drawer @add-widget="addWidgetToGrid" @reset="onReset" :controls="drawers.widgets"></widgets-drawer>
        </cly-main>
    </template>
</div>
</template>

<script>
import { mixins, i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyDashboards from '../store/index.js';
import WidgetsMixin from '../mixins/WidgetsMixin.js';
import NoDashboard from './NoDashboard.vue';
import NoWidget from './NoWidget.vue';
import GridComponent from './GridComponent.vue';
import DashboardDrawer from './DashboardDrawer.vue';
import WidgetDrawer from './WidgetDrawer.vue';

var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

export default {
    mixins: [i18nMixin, commonFormattersMixin, mixins.hasDrawers("dashboards"), mixins.hasDrawers("widgets"), WidgetsMixin],
    components: {
        "no-dashboard": NoDashboard,
        "no-widget": NoWidget,
        "dashboards-grid": GridComponent,
        "dashboards-drawer": DashboardDrawer,
        "widgets-drawer": WidgetDrawer
    },
    data: function() {
        return {
            dashboardId: this.$route.params && this.$route.params.dashboardId,
            fullscreen: false,
            preventTimeoutInterval: null
        };
    },
    computed: {
        noSelectedDashboard: function() {
            var selected = this.$store.getters["countlyDashboards/selected"];
            return !(selected.id && selected.data);
        },
        noWidgets: function() {
            return !this.$store.getters["countlyDashboards/widgets/all"].length;
        },
        dashboard: function() {
            var selected = this.$store.getters["countlyDashboards/selected"];
            var dashboard = selected.data || {};

            dashboard.creation = {};

            if (dashboard.created_at) {
                var formattedTime = this.parseTimeAgo(dashboard.created_at) || {};
                dashboard.creation.time = formattedTime.text;
            }

            if (dashboard.owner && dashboard.owner.full_name) {
                dashboard.creation.by = dashboard.owner.full_name;
            }

            dashboard.name = countlyCommon.unescapeHtml(dashboard.name);

            return dashboard;
        },
        canUpdateGrid: function() {
            return this.dashboard.is_editable ?? true;
        },
        canUpdateDashboard: function() {
            return !!(AUTHENTIC_GLOBAL_ADMIN || this.dashboard.is_owner);
        },
        isInitLoad: function() {
            var isInit = this.$store.getters["countlyDashboards/requests/isInitializing"];
            return isInit;
        },
        isRefreshing: function() {
            var isRefreshing = this.$store.getters["countlyDashboards/requests/isRefreshing"];
            return isRefreshing;
        },
        isDrawerOpen: function() {
            var isOpen = this.$store.getters["countlyDashboards/requests/drawerOpenStatus"];
            return isOpen;
        },
        isWidgetProcessing: function() {
            var isProcessing = this.$store.getters["countlyDashboards/requests/isProcessing"];
            return isProcessing;
        },
        isGridInteraction: function() {
            var isInteraction = this.$store.getters["countlyDashboards/requests/gridInteraction"];
            return isInteraction;
        },
        isRequestSane: function() {
            var isSane = this.$store.getters["countlyDashboards/requests/isSane"];
            return isSane;
        }
    },
    created: function() {
        var self = this;
        var $ = window.jQuery;
        var fullscreeToggle = function() {
            if (document.fullscreenElement) {
                $("html").addClass("full-screen");
                self.preventTimeoutInterval = setInterval(function() {
                    $(document).trigger("extend-dashboard-user-session");
                }, 1000);
                $(document).idleTimer("pause");
                self.fullscreen = true;
            }
            else {
                $("html").removeClass("full-screen");
                clearInterval(self.preventTimeoutInterval);
                $(document).idleTimer("reset");
                self.fullscreen = false;
            }
        };
        document.removeEventListener('fullscreenchange', fullscreeToggle);
        document.addEventListener('fullscreenchange', fullscreeToggle);
    },
    methods: {
        refresh: function(forceRefresh) {
            var isRefreshing = this.isRefreshing;
            var isInitializing = this.isInitLoad;
            var isDrawerOpen = this.isDrawerOpen;
            var isWidgetProcessing = this.isWidgetProcessing;
            var isGridInteraction = this.isGridInteraction;
            var isRequestSane = this.isRequestSane;

            if (!isRequestSane) {
                if (!isRefreshing && !isInitializing && !isGridInteraction && !isWidgetProcessing) {
                    this.$store.dispatch("countlyDashboards/requests/markSanity", true);
                }

                return;
            }

            if (isInitializing || isRefreshing || isDrawerOpen || isWidgetProcessing || isGridInteraction) {
                return;
            }

            this.dateChanged(forceRefresh);
        },
        dateChanged: function(isRefresh) {
            var self = this;
            this.$store.dispatch("countlyDashboards/requests/isRefreshing", isRefresh);

            this.$store.dispatch("countlyDashboards/getDashboard", {id: this.dashboardId, isRefresh: isRefresh}).then(function() {
                self.$store.dispatch("countlyDashboards/requests/isRefreshing", false);
            });
        },
        onDashboardAction: function(command, data) {
            var self = this;
            var d = JSON.parse(JSON.stringify(data));

            switch (command) {
            case "fullscreen":
                if (window.screenfull.enabled && !window.screenfull.isFullscreen) {
                    window.screenfull.request();
                }
                else {
                    window.screenfull.exit();
                }
                break;
            case "edit":
                d.__action = "edit";
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
                self.openDrawer("dashboards", d);
                break;

            case "duplicate":
                d.name = "Copy - " + d.name;
                var empty = countlyDashboards.factory.dashboards.getEmpty();

                var obj = {};
                for (var key in empty) {
                    obj[key] = d[key] || empty[key];
                }

                obj.__action = "duplicate";

                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
                self.openDrawer("dashboards", obj);
                break;

            case "delete":
                d.__action = "delete";
                CountlyConfirm(this.i18nM("dashboards.delete-dashboard-text", d.name), "popStyleGreen", function(result) {
                    if (!result) {
                        return false;
                    }

                    self.$store.dispatch("countlyDashboards/delete", d._id).then(function(res) {
                        if (res) {
                            notify({
                                message: "Dashboard deleted successfully!",
                                type: "success"
                            });

                            window.app.navigate('#/custom');
                            self.dashboardId = null;
                        }
                    });

                }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.yes-delete-dashboard")], {title: this.i18nM("dashboards.delete-dashboard-title"), image: "delete-dashboard"});
                break;
            }
        },
        newWidget: function() {
            var empty = {};
            var setting = this.widgetSettingsPrimary({widget_type: "analytics"});

            var defaultEmpty = setting.drawer.getEmpty();

            empty.__action = "create";
            this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
            this.openDrawer("widgets", Object.assign({}, empty, defaultEmpty));
        },
        addWidgetToGrid: function(widget) {
            this.$refs.grid.addWidget(widget);
        },
        exitFullScreen: function() {
            window.screenfull.exit();
        }
    },
    beforeMount: function() {
        var self = this;

        this.$store.dispatch("countlyDashboards/setDashboard", {id: this.dashboardId, isRefresh: false}).then(function() {
            self.$store.dispatch("countlyDashboards/requests/isInitializing", false);
        });
    },
    beforeDestroy: function() {
        this.$store.dispatch("countlyDashboards/requests/reset");
    }
};
</script>
