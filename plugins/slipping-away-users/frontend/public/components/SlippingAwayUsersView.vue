<template>
    <div>
        <cly-header
            :title="i18n('slipping-away-users.title')"
            :tooltip="{description: i18n('slipping-away-users.description')}"
        />
        <cly-main>
            <cly-qb-bar
                v-if="showDrillFilter"
                feature="slipping_away_users"
                v-model="slippingAwayUsersFilters"
                queryStore="slipping-away-users"
                format="mongo"
                style="margin-bottom:32px"
                :propertySourceConfig="{'wrappedUserProperties': false}"
                show-in-the-last-hours
                show-in-the-last-minutes
            />
            <cly-section>
                <cly-chart-bar
                    test-id="slipping-away"
                    :option="slippingAwayUsersOptions"
                    :height="400"
                    v-loading="isLoading"
                    :force-loading="isLoading"
                />
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="slipping-away"
                    :rows="slippingAwayUsersRows"
                    :resizable="true"
                    :force-loading="isLoading"
                >
                    <template v-slot="scope">
                        <el-table-column
                            test-id="slipping-away-no-session-in"
                            sortable="custom"
                            prop="period"
                            :label="i18n('slipping-away-users.table-period')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-no-sessions-in-' + scope.$index">
                                    {{ scope.row.period }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="count"
                            :label="i18n('slipping-away-users.table-count')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-slipping-away-user-count-' + scope.$index">
                                    {{ formatNumber(scope.row.count) }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="percentage"
                            :label="i18n('slipping-away-users.table-percentage')"
                        >
                            <template slot-scope="scope">
                                <div
                                    class="bu-level-left"
                                    style="padding: 7px 28px 7px 0;"
                                >
                                    <div
                                        class="bu-level-item slipping-away-users-table__data-item"
                                        :data-test-id="'datatable-percentage-' + scope.$index"
                                    >
                                        <span>{{ scope.row.percentage }}%</span>
                                    </div>
                                    <cly-progress-bar
                                        :data-test-id="'datatable-percentage-progress-bar-' + scope.$index"
                                        :percentage="parseInt(scope.row.percentage)"
                                        :color="progressBarColor"
                                    />
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            v-if="showViewUsers"
                            prop="timeStamp"
                            align="center"
                        >
                            <template slot-scope="scope">
                                <div class="bu-level-right">
                                    <el-link
                                        type="primary"
                                        :underline="false"
                                        class="slipping-away-users-table__link"
                                        @click="onUserListClick(scope.row.timeStamp)"
                                    >
                                        {{ i18n('slipping-away-users.table-user-list') }}
                                    </el-link>
                                </div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>
<script>
import { i18n, i18nMixin, commonFormattersMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { goTo } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';

export default {
    mixins: [commonFormattersMixin, autoRefreshMixin, i18nMixin],
    data: function() {
        return {
            progressBarColor: "#F96300"
        };
    },
    computed: {
        showViewUsers: function() {
            return countlyGlobal.plugins.indexOf('users') > -1;
        },
        showDrillFilter: function() {
            if (validateRead('drill') && countlyGlobal.plugins.indexOf("drill") !== -1) {
                return true;
            }
            else {
                return false;
            }
        },
        slippingAwayUsersFilters: {
            get: function() {
                return this.$store.state.countlySlippingAwayUsers.filters;
            },
            set: function(value) {
                this.$store.dispatch('countlySlippingAwayUsers/onSetFilters', value);
                this.$store.dispatch("countlySlippingAwayUsers/fetchAll", true);
                if (value.query) {
                    app.navigate("#/analytics/loyalty/slipping-away-users/" + JSON.stringify(value.query));
                }
                else {
                    app.navigate("#/analytics/loyalty/slipping-away-users/");
                }
            }
        },
        slippingAwayUsersOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSlippingAwayUsersPeriods,
                    axisLabel: {
                        color: "#333C48"
                    }
                },
                series: [{
                    data: this.$store.state.countlySlippingAwayUsers.series,
                    name: i18n('slipping-away-users.barchart-description'),
                    color: this.progressBarColor
                }]
            };
        },
        slippingAwayUsersRows: function() {
            return this.$store.state.countlySlippingAwayUsers.rows;
        },
        xAxisSlippingAwayUsersPeriods: function() {
            var periods = [];
            this.slippingAwayUsersRows.forEach(function(element) {
                periods.push(i18n('slipping-away-users.serie-item', element.period));
            });
            return periods;
        },
        isLoading: function() {
            return this.$store.getters['countlySlippingAwayUsers/isLoading'];
        }
    },
    methods: {
        onUserListClick: function(timeStamp) {
            var data = {
                lac: {"$lt": timeStamp}
            };
            var currentFilters = this.$store.state.countlySlippingAwayUsers.filters;
            if (currentFilters.query) {
                Object.assign(data, currentFilters.query);
            }
            goTo({
                url: '/users/query/' + JSON.stringify(data),
                from: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/loyalty/slipping-away-users",
                title: i18n("slipping-away-users.back-to-slipping-away")
            });
        },
        refresh: function() {
            this.$store.dispatch("countlySlippingAwayUsers/fetchAll", false);
        }
    },
    mounted: function() {
        if (this.$route.params && this.$route.params.query) {
            this.$store.dispatch('countlySlippingAwayUsers/onSetFilters', {query: this.$route.params.query });
        }
        this.$store.dispatch("countlySlippingAwayUsers/fetchAll", true);
    }
};
</script>
