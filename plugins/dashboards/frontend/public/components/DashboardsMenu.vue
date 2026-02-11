<template>
<div style="height: 100%;">
    <div class="cly-vue-sidebar__header">
        <span class="cly-vue-sidebar__header-title" data-test-id="dashboard-menu-title">Dashboards</span>
        <span class="cly-vue-sidebar__header-button" v-if="canCreate">
            <el-button type="success" size="small" @click="addDashboard" data-test-id="add-dashboard-button">
                <i class="ion-plus-circled"></i>
                <span>New</span>
            </el-button>
        </span>
        <form>
            <el-input
                class="bu-mt-5 cly-vue-sidebar__header-search"
                test-id="dashboard-search-box"
                autocomplete="off"
                v-model="searchQuery"
                placeholder="Search in Dashboards">
                <i slot="prefix" class="el-input__icon el-icon-search"></i>
            </el-input>
        </form>
    </div>
    <div class="cly-vue-sidebar__main-menu">
        <vue-scroll :ops="{scrollPanel: { scrollingX: false }}">
            <ul>
                <li
                    v-for="(dashboard, idx) in allDashboards"
                    :key="dashboard.id"
                    :class="['bu-px-3 bu-mb-1 bu-is-clickable', {'bu-mb-6': (idx === (allDashboards.length - 1) ? true: false)}]"
                    :data-test-id="'custom-dashboard-' + idx"
                >
                    <a :href="'#/custom/' + dashboard._id">
                        <div
                            style="width: calc(100% - 24px);"
                            :class="['cly-vue-sidebar__menu-items has-ellipsis',
                            {'cly-vue-sidebar__menu-items--selected': selectedDashboard._id === dashboard._id}]"
                            @click="onDashboardMenuItemClick(dashboard)">
                            <span>{{unescapeHtml(dashboard.name)}}</span>
                        </div>
                    </a>
                </li>
            </ul>
        </vue-scroll>
    </div>

    <dashboards-drawer :controls="drawers.dashboards"></dashboards-drawer>
</div>
</template>

<script>
import { mixins, commonFormattersMixin, registerGlobally } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyDashboards from '../store/index.js';
import DashboardMixin from '../mixins/DashboardMixin.js';
import DashboardDrawer from './DashboardDrawer.vue';

export default {
    mixins: [mixins.hasDrawers("dashboards"), DashboardMixin, commonFormattersMixin],
    components: {
        "dashboards-drawer": DashboardDrawer
    },
    data: function() {
        return {
            canCreate: true,
            searchQuery: "",
        };
    },
    computed: {
        selectedDashboard: function() {
            var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];

            if (selected.menu === "dashboards") {
                return selected.item;
            }

            return {};
        },
        allDashboards: function() {
            var query = this.searchQuery;

            var dashboards = (this.$store.getters["countlyDashboards/all"] || []).slice();

            dashboards.sort(function(a, b) {
                var nameA = (a.name || "").toLowerCase();
                var nameB = (b.name || "").toLowerCase();

                if (nameA < nameB) {
                    return -1;
                }

                if (nameA > nameB) {
                    return 1;
                }

                return 0;
            });

            if (!query) {
                return dashboards;
            }

            query = (query + "").trim().toLowerCase();

            return dashboards.filter(function(option) {
                var compareTo = option.name || "";
                return compareTo.toLowerCase().indexOf(query) > -1;
            });
        }
    },
    methods: {
        onDashboardMenuItemClick: function(dashboard) {
            this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: dashboard});
        },
        identifySelected: function() {
            var dashboards = this.$store.getters["countlyDashboards/all"];

            var currLink = window.Backbone.history.fragment;

            if (/^\/custom/.test(currLink) === false) {
                var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                if (selected.menu === "dashboards") {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "dashboards", item: {} });
                }

                return;
            }

            currLink = currLink.split("/");
            var id = currLink[currLink.length - 1];

            var currMenu = dashboards.find(function(d) {
                return d._id === id;
            });

            this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: currMenu || {}});
        }
    },
    beforeCreate: function() {
        this.module = countlyDashboards.getVuexModule();
        registerGlobally(this.module);
    },
    beforeMount: function() {
        var self = this;
        this.$store.dispatch("countlyDashboards/getAll", {just_schema: true}).then(function() {
            self.identifySelected();
        });
    }
};
</script>
