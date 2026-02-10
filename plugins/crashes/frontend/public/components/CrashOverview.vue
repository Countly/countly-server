<template>
    <div class="crashes-overview">
        <cly-tabs v-model="currentTab">
            <el-tab-pane name="crash-groups">
                <span data-test-id="tab-crash-groups-label" slot="label">{{i18n("crashes.crash-groups")}}</span>
                <cly-header
                    :title="i18n('crashes.crash-groups')"
                    :tooltip="{description: i18n('crashes.help-crash-group')}"
                >
                    <template v-slot:header-right>
                        <cly-auto-refresh-toggle ref="crashesAutoRefreshToggle" feature="crashes" :default-value="true" test-id="crash-groups"></cly-auto-refresh-toggle>
                    </template>
                </cly-header>
                <cly-main>
                    <cly-qb-bar v-if="hasDrillPermission" feature="crashes" class="bu-mb-5" v-model="crashgroupsFilter" :property-source-config="{drill: false}" queryStore="crashgroups" :additionalProperties="crashgroupsFilterProperties" :additionalRules="crashgroupsFilterRules" format="crashgroups"></cly-qb-bar>
                    <cly-datatable-n test-id="crash-groups" :data-source="remoteTableDataSource" @selection-change="handleSelectionChange" :available-dynamic-cols="tableDynamicCols" :persist-key="tablePersistKey" ref="dataTable" class="bu-mb-6">
                        <template v-slot="scope">
                            <el-table-column type="selection" reserve-selection width="65" fixed="left"></el-table-column>
                            <el-table-column :label="errorColumnLabel" min-width="415" fixed="left">
                                <template slot-scope="col">
                                    <div class="bu-is-flex bu-is-flex-direction-column">
                                        <a
                                            class="crash-group-title has-ellipsis"
                                            :data-test-id="'datatable-crash-groups-group-title-' + col.$index"
                                            :href="'#/crashes/' + col.row._id"
                                            v-html="col.row.name">
                                        </a>
                                        <div class="bu-mt-2 bu-is-flex">
                                            <crash-badge :type="badge.type" v-html="badge.content" v-for="(badge, badgeIndex) in badgesFor(col.row)" :data-test-id="'datatable-crash-groups-badge-type-' + badgeIndex + '-col-' + col.$index"></crash-badge>
                                        </div>
                                    </div>
                                </template>
                            </el-table-column>
                            <template v-for="(col,idx) in scope.dynamicCols">
                                <el-table-column v-if="col.value === 'os'" :key="idx" prop="os" :label="i18n('crashes.platform')" width="120" show-overflow-tooltip sortable>
                                    <template slot-scope="rowScope">
                                        <span :data-test-id="'datatable-crash-groups-platform-' + rowScope.$index">{{rowScope.row.os}}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column v-if="col.value === 'reports'" :key="idx" prop="reports" :label="i18n('crashes.reports')" width="150" sortable :sort-method="occurrenceSort">
                                    <template slot-scope="rowScope">
                                        <span v-if="singleAppVersionFilter.length" :data-test-id="'datatable-crash-groups-occurences-' + rowScope.$index">{{rowScope.row.app_version[singleAppVersionFilter.replace(/\./g, ':')]}}</span>
                                        <span v-else :data-test-id="'datatable-crash-groups-occurences-' + rowScope.$index">{{rowScope.row.reports}}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column v-if="col.value === 'lastTs'" :key="idx" prop="lastTs" :label="i18n('crashes.last_time')" :formatter="formatDate" width="180" sortable>
                                    <template slot-scope="rowScope">
                                        <div :data-test-id="'datatable-crash-groups-last-occurrence-' + rowScope.$index">{{formatDate(null,null,rowScope.row.lastTs)}}</div>
                                    </template>
                                </el-table-column>
                                <el-table-column v-if="col.value === 'users'" :key="idx" prop="users" :label="i18n('crashes.affected-users')" width="170" sortable>
                                    <template slot-scope="rowScope">
                                        <span :data-test-id="'datatable-crash-groups-affected-users-' + rowScope.$index">{{rowScope.row.users}}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column v-if="col.value === 'latest_version'" :key="idx" prop="latest_version" :label="i18n('crashes.latest_app')" width="190" sortable :sort-method="appVersionSort">
                                    <template slot-scope="rowScope">
                                        <span :data-test-id="'datatable-crash-groups-latest-app-version-' + rowScope.$index">{{rowScope.row.latest_version}}</span>
                                    </template>
                                </el-table-column>
                            </template>
                        </template>
                        <template v-slot:bottomline="scope">
                            <cly-diff-helper v-if="(canUserDelete || canUserUpdate)" :diff="selectedCrashgroups" @discard="scope.unpatch()" :isModal=true>
                                <template v-slot:main>
                                    <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                        <span class="selected-count-blue bu-pl-1 text-medium">
                                            <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{selectedCrashgroups.length}}</span><span class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{i18n('common.selected')}}</span>
                                        </span>
                                        <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                        <cly-more-options v-if="canUserUpdate" class="bu-mr-3" size="small" text="Change Status" type="default" icon="cly-io cly-io-refresh bu-mr-2" :showArrows=true @command="setSelectedAs($event)" >
                                            <el-dropdown-item command="resolved" icon="cly-io cly-io-check-circle">{{ i18n('crashes.action-resolved') }}</el-dropdown-item>
                                            <el-dropdown-item command="resolving" icon="cly-io cly-io-clock">{{ i18n('crashes.action-resolving') }}</el-dropdown-item>
                                            <el-dropdown-item command="unresolved" icon="cly-io cly-io-x-circle">{{ i18n('crashes.action-unresolved') }}</el-dropdown-item>
                                        </cly-more-options>
                                        <cly-more-options v-if="canUserUpdate" size="small" :text=" i18n('data-manager.change-visibility') " :widthSameAsTrigger="true" type="default" icon="cly-io cly-io-eye bu-mr-2" :showArrows=true @command="setSelectedAs($event)">
                                            <el-dropdown-item command="show"><i class="cly-io cly-io-eye"></i>{{ i18n('crashes.action-view') }}</el-dropdown-item>
                                            <el-dropdown-item command="hide"><i class="cly-io cly-io-eye-off"></i>{{ i18n('crashes.action-hide') }}</el-dropdown-item>
                                        </cly-more-options>
                                        <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                        <el-button v-if="canUserDelete" class="bu-mr-3" size="small" type="default" @click="showDeleteForm">
                                            <i class="cly-io-16 cly-io cly-io-trash" style="color:red"></i>
                                            <span class="ml-1" style="color: red">
                                                {{ i18n('crashes.action-delete') }}
                                            </span>
                                        </el-button>
                                        <el-button class="x-button" @click="unpatchSelectedGroups">
                                            <i class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                                        </el-button>
                                    </div>
                                </template>
                            </cly-diff-helper>
                            <cly-confirm-dialog
                            @cancel="closeDeleteForm"
                            @confirm="setSelectedAs('delete')"
                            :before-close="closeDeleteForm"
                            ref="deleteConfirmDialog"
                            :visible.sync="showDeleteDialog"
                            dialogType="danger"
                            :saveButtonLabel="i18n('crashes.yes-delete')"
                            :cancelButtonLabel="i18n('common.no-dont-delete')"
                            :title=confirmDialogTitle>
                                <template slot-scope="scope">
                                    {{i18n('crashes.groups-want-to-delete')}}
                                    <cly-list-drawer :list="selectedGroups" :dropdownText="confirmDialogText"></cly-list-drawer>
                                </template>
                            </cly-confirm-dialog>
                        </template>
                    </cly-datatable-n>
                </cly-main>
            </el-tab-pane>
            <el-tab-pane name="crash-statistics">
                <span slot="label" data-test-id="tab-crash-statistics-label">
                    {{i18n("crashes.crash-statistics")}}
                </span>
                <cly-header
                    :title="i18n('crashes.crash-statistics')"
                    :tooltip="{description: i18n('crashes.help-crash-statistics')}"
                >
                </cly-header>
                <cly-main>
                    <cly-section class="crashes-statistics-dashboard">
                        <div class="crashes-statistics-dashboard__tiles-container bu-columns bu-is-gapless bu-is-mobile">
                            <cly-crashes-dashboard-tile v-if="Object.keys(statistics).length > 0">
                                <div class="crashes-tile__content--fill bu-columns bu-is-gapless bu-is-mobile bu-is-flex-direction-column">
                                    <cly-metric-card test-id="affected-user" :is-percentage="true" color="#CDAD7A" :number="statistics.users.affected.totalPercent" :tooltip="i18n('crashes.help-affected')">
                                        {{i18n('crashes.affected-users')}}
                                        <template v-slot:description>
                                            <span class="text-medium" style="white-space: initial;">{{getShortNumber(statistics.users.affected.total)}} of {{getShortNumber(statistics.users.total)}} Total Users</span>
                                        </template>
                                    </cly-metric-card>
                                    <div class="cly-divider"></div>
                                    <cly-metric-card test-id="resolution-status" :label="i18n('crashes.resolution-status')" :is-percentage="true" color="#F96300" :number="statistics.crashes.resolvedPercent" :tooltip="i18n('crashes.help-resolved')">
                                        <template v-slot:description>
                                            <span class="text-medium" style="white-space: initial;">{{getShortNumber(statistics.crashes.resolved)}} Resolved of {{getShortNumber(statistics.crashes.total)}} Total Crashes</span>
                                        </template>
                                    </cly-metric-card>
                                    <div class="cly-divider"></div>
                                    <cly-metric-card test-id="crash-fatality" :label="i18n('crashes.fatality')" :tooltip="i18n('crashes.help-crash-fatality')" :is-percentage="true" color="#F62404" :number="parseFloat(statistics.crashes.fatalPercent.toFixed(2))">
                                        <template v-slot:description>
                                            <span class="text-medium" style="white-space: initial;">{{getShortNumber(statistics.crashes.fatal)}} Fatal of {{getShortNumber(statistics.crashes.total)}} Total Crashes</span>
                                        </template>
                                    </cly-metric-card>
                                </div>
                            </cly-crashes-dashboard-tile>
                            <cly-crashes-dashboard-tile>
                                <div class="crashes-tile__content--fill bu-columns bu-is-mobile bu-is-flex-direction-column bu-m-0 bu-px-4">
                                    <div class="bu-columns bu-m-0 bu-is-align-items-center bu-column text-small text-uppercase font-weight-bold color-gray-100" style="letter-spacing: 0.5px;">
                                        <div data-test-id="crash-statistics-top-platforms-label">{{i18n("crashes.top-platforms")}}</div>
                                        <div class="bu-ml-1"><cly-tooltip-icon data-test-id="crash-statistics-top-platforms-tooltip" icon="ion ion-help-circled" :tooltip="i18n('crashes.help-platforms')"></cly-tooltip-icon></div>
                                    </div>
                                    <div class="bu-column bu-pt-0" v-for="(platform, platformIndex) in statistics.topPlatformsOrder">
                                        <div class="bu-columns bu-is-gapless bu-is-mobile text-medium color-gray-100 bu-mb-1">
                                            <div class="bu-column" :data-test-id="'crash-statistics-top-platforms-platform-' + platformIndex">{{platform}}</div>
                                            <div class="bu-column bu-has-text-right" :data-test-id="'crash-statistics-top-platforms-platform-users-percentage-' + platformIndex">
                                                {{statistics.topPlatforms[platform].count}} Users ({{statistics.topPlatforms[platform].percent.toFixed(1)}}%)
                                            </div>
                                        </div>
                                        <cly-progress-bar :test-id="'crash-statistics-top-platforms-platform-' + platformIndex" :percentage="statistics.topPlatforms[platform].percent" color="#F96300" backgroundColor="#ECECEC" :height="8">
                                        </cly-progress-bar>
                                    </div>
                                </div>
                            </cly-crashes-dashboard-tile>
                            <cly-crashes-dashboard-tile>
                                <div class="crashes-tile__content--fill bu-columns bu-is-gapless bu-is-mobile bu-is-flex-direction-column" v-if="!!statistics.crashes">
                                    <cly-crashes-dashboard-tile test-id="crash-statistics-new-crashes" isVertical :tooltip="i18n('crashes.help-new')">
                                        <template v-slot:title>{{i18n("crashes.new-crashes")}}</template>
                                        <template v-slot:value>{{getShortNumber(statistics.crashes.new)}}</template>
                                    </cly-crashes-dashboard-tile>
                                    <cly-crashes-dashboard-tile test-id="crash-statistics-reoccured-crashes" isVertical :tooltip="i18n('crashes.help-reoccurred')">
                                        <template v-slot:title>{{i18n("crashes.renew-crashes")}}</template>
                                        <template v-slot:value>{{getShortNumber(statistics.crashes.reoccured)}}</template>
                                    </cly-crashes-dashboard-tile>
                                    <cly-crashes-dashboard-tile test-id="crash-statistics-revenue-loss" isVertical :tooltip="i18n('crashes.help-loss')">
                                        <template v-slot:title>{{i18n("crashes.loss")}}</template>
                                        <template v-slot:value>{{getShortNumber(statistics.revenueLoss)}}</template>
                                    </cly-crashes-dashboard-tile>
                                </div>
                            </cly-crashes-dashboard-tile>
                        </div>
                    </cly-section>
                    <div class="bu-is-flex bu-is-align-items-center bu-mt-5 bu-mb-4" style="margin-top: 32px !important;">
                        <cly-date-picker-g></cly-date-picker-g>
                        <div class="text-small text-uppercase bu-mx-3" style="color: #969FAD;" data-test-id="crashes-crash-filters-label">{{i18n("crashes.crash-filters")}}</div>
                        <cly-multi-select v-model="activeFilter" :fields="activeFilterFields"></cly-multi-select>
                    </div>
                    <div class="crashes-statistics-graph" v-loading="loading">
                        <el-tabs v-model="statisticsGraphTab" type="card" stretch>
                            <el-tab-pane name="total-occurrences" style="border-top-left-radius: 4px;" data-test-id="total-occurrences-graph">
                                <div class="bu-p-5" slot="label">
                                    <crash-tab-label :title="i18n('crashes.total')" :tooltip="i18n('crashes.help-total')" :data="dashboardData[{'both': 'cr', 'fatal': 'crf', 'nonfatal': 'crnf'}[activeFilter.fatality]]" negateTrend>
                                    </crash-tab-label>
                                </div>
                                <cly-chart-line xAxisLabelOverflow="unset" :option="chartData('cr')" category="crashes"></cly-chart-line>
                            </el-tab-pane>
                            <el-tab-pane name="unique-crashes" data-test-id="unique-crashes-graph">
                                <div class="bu-p-5" slot="label">
                                    <crash-tab-label :title="i18n('crashes.unique')" :tooltip="i18n('crashes.help-unique')" :data="dashboardData[{'both': 'cru', 'fatal': 'cruf', 'nonfatal': 'crunf'}[activeFilter.fatality]]" negateTrend>
                                    </crash-tab-label>
                                </div>
                                <cly-chart-line xAxisLabelOverflow="unset" :option="chartData('cru')" category="crashes"></cly-chart-line>
                            </el-tab-pane>
                            <el-tab-pane name="crashes-per-session" data-test-id="crashes-per-session-graph">
                                <div class="bu-p-5" slot="label">
                                    <crash-tab-label :title="i18n('crashes.total-per-session')" :tooltip="i18n('crashes.help-frequency-short')" :data="dashboardData[{'both': 'cr-session', 'fatal': 'crtf', 'nonfatal': 'crtnf'}[activeFilter.fatality]]" negateTrend>
                                    </crash-tab-label>
                                </div>
                                <cly-chart-line xAxisLabelOverflow="unset" :option="chartData('cr-session')" category="crashes"></cly-chart-line>
                            </el-tab-pane>
                            <el-tab-pane name="crashfree-users" data-test-id="crashfree-users-graph">
                                <div class="bu-p-5" slot="label">
                                    <crash-tab-label :title="i18n('crashes.free-users')" :tooltip="i18n('crashes.help-free-users')" :data="dashboardData[{'both': 'crau', 'fatal': 'crauf', 'nonfatal': 'craunf'}[activeFilter.fatality]]">
                                    </crash-tab-label>
                                </div>
                                <cly-chart-line xAxisLabelOverflow="unset" :option="chartData('crau')" category="crashes"></cly-chart-line>
                            </el-tab-pane>
                            <el-tab-pane name="crashfree-sessions" style="border-top-right-radius: 4px;" data-test-id="crashfree-sessions-graph">
                                <div class="bu-p-5" slot="label">
                                    <crash-tab-label :title="i18n('crashes.free-sessions')" :tooltip="i18n('crashes.help-free-sessions')" :data="dashboardData[{'both': 'crinv', 'fatal': 'crfinv', 'nonfatal': 'crnfinv'}[activeFilter.fatality]]">
                                    </crash-tab-label>
                                </div>
                                <cly-chart-line xAxisLabelOverflow="unset" :option="chartData('crinv')" category="crashes"></cly-chart-line>
                            </el-tab-pane>
                        </el-tabs>
                    </div>
                </cly-main>
            </el-tab-pane>
        </cly-tabs>
    </div>
</template>

<script>
import moment from 'moment';
import { i18nMixin, authMixin, i18n as cvI18n, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { alert as CountlyAlert, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyCrashes from '../store/index.js';
import CrashTabLabel from './CrashTabLabel.vue';
import CrashBadge from './CrashBadge.vue';

var FEATURE_NAME = 'crashes';

export default {
    components: {"crash-tab-label": CrashTabLabel, "crash-badge": CrashBadge},
    mixins: [
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        i18nMixin
    ],
    data: function() {
        var filterProperties = [];
        if (window.countlyQueryBuilder) {
            filterProperties.push(
                new window.countlyQueryBuilder.Property({
                    id: "nonfatal",
                    name: cvI18n("crashes.fatality-label") || "Fatality",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("crashes.fatal") || "Fatal", value: false},
                            {name: cvI18n("crashes.non-fatal") || "Non-fatal", value: true}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "is_hidden",
                    name: cvI18n("crashes.visibility") || "Visibility",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("crashes.hidden") || "Hidden", value: true},
                            {name: cvI18n("crashes.shown") || "Shown", value: false}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "is_new",
                    name: cvI18n("crashes.viewed") || "Viewed",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: false},
                            {name: cvI18n("drill.opr.is-set-false"), value: true}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "is_renewed",
                    name: cvI18n("crashes.reoccurred") || "Reoccurred",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: true},
                            {name: cvI18n("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "is_resolved",
                    name: cvI18n("crashes.resolved") || "Resolved",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: true},
                            {name: cvI18n("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "is_resolving",
                    name: cvI18n("crashes.resolving") || "Resolving",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: true},
                            {name: cvI18n("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "error",
                    name: "Crash",
                    type: window.countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "users",
                    name: "Affected Users",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "reports",
                    name: "Occurrences",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "device",
                    name: "Device",
                    type: window.countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "resolution",
                    name: "Resolution",
                    type: window.countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "startTs",
                    name: "First Seen On",
                    type: window.countlyQueryBuilder.PropertyType.DATE,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "lastTs",
                    name: "Last Seen On",
                    type: window.countlyQueryBuilder.PropertyType.DATE,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "background",
                    name: "Background",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: "yes"},
                            {name: cvI18n("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "online",
                    name: "Online",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: "yes"},
                            {name: cvI18n("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "root",
                    name: "Rooted",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: "yes"},
                            {name: cvI18n("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "signal",
                    name: "Signal",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: "yes"},
                            {name: cvI18n("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "muted",
                    name: "Muted",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: cvI18n("drill.opr.is-set-true"), value: "yes"},
                            {name: cvI18n("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new window.countlyQueryBuilder.Property({
                    id: "os_version",
                    name: "Platform Version",
                    type: window.countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "bat.max",
                    name: "Battery Max",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "bat.min",
                    name: "Battery Min",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "disk.max",
                    name: "Disk Max",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "disk.min",
                    name: "Disk Min",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "ram.max",
                    name: "RAM Max",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "ram.min",
                    name: "RAM Min",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "run.max",
                    name: "Running Max",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new window.countlyQueryBuilder.Property({
                    id: "run.min",
                    name: "Running Min",
                    type: window.countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                })
            );
        }

        if (validateRead('drill') && typeof window.countlyDrillMeta !== "undefined") {
            var crashMeta = window.countlyDrillMeta.getContext("[CLY]_crash");
            var getRemoteFilterValues = function(segmentationKey) {
                return function() {
                    return new Promise(function(resolve) {
                        crashMeta.getBigListMetaData('sg.' + segmentationKey, '', function(vals) {
                            resolve(vals.map(function(item) {
                                var name = (segmentationKey === "orientation") ? cvI18n("crashes.filter." + segmentationKey + "." + item) : item;
                                return {label: name, name: name, value: item};
                            }));
                        });
                    });
                };
            };

            var self = this;
            var getAppVersions = function(query) {
                return new Promise(function(resolve) {
                    resolve(self.$store.getters["countlyCrashes/overview/appVersions"].reduce(function(acc, version) {
                        var properVersion = version.replace(/:/g, ".");
                        if (!query || properVersion.indexOf(query) > -1) {
                            acc.push({ name: properVersion, value: properVersion });
                        }

                        return acc;
                    }, []));
                });
            };

            crashMeta.initialize();

            if (window.countlyQueryBuilder) {
                filterProperties.push({
                    id: "app_version_list",
                    name: "App Version",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getAppVersions,
                });
                filterProperties.push({
                    id: "latest_version",
                    name: "Latest App Version",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getAppVersions,
                });
                filterProperties.push({
                    id: "opengl",
                    name: "OpenGL Version",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getRemoteFilterValues('opengl')
                });
                filterProperties.push({
                    id: "orientation",
                    name: "Orientation",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getRemoteFilterValues('orientation')
                });
                filterProperties.push({
                    id: "os",
                    name: "Platform",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getRemoteFilterValues('os')
                });
                filterProperties.push({
                    id: "cpu",
                    name: "CPU",
                    type: window.countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    searchRemoteList: getRemoteFilterValues('cpu')
                });
            }
        }

        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            currentTab: (this.$route.params && this.$route.params.tab) || "crash-groups",
            statisticsGraphTab: "total-occurrences",
            selectedCrashgroups: [],
            tablePersistKey: 'crashGroupsTable_' + countlyCommon.ACTIVE_APP_ID,
            tableDynamicCols: [{
                value: "os",
                label: cvI18n('crashes.platform'),
                required: true
            },
            {
                value: "reports",
                label: cvI18n('crashes.reports'),
                default: true
            },
            {
                value: "lastTs",
                label: cvI18n('crashes.last_time'),
                default: true
            },
            {
                value: "users",
                label: cvI18n('crashes.affected-users'),
                default: true
            },
            {
                value: "latest_version",
                label: cvI18n('crashes.latest_app'),
                default: true
            }],
            remoteTableDataSource: getServerDataSource(this.$store, "countlyCrashes", "crashgroups"),
            crashgroupsFilterProperties: filterProperties,
            crashgroupsFilterRules: (window.countlyQueryBuilder) ? [
                new window.countlyQueryBuilder.RowRule({
                    name: "cly.crashes.no-math-ineq-for-strings",
                    selector: function(row) {
                        return row.property.type === window.countlyQueryBuilder.PropertyType.STRING;
                    },
                    actions: [new window.countlyQueryBuilder.RowAction({
                        id: "disallowOperator",
                        params: {
                            selector: function(operator) {
                                return ["cly.>", "cly.>=", "cly.<", "cly.<="].includes(operator.id);
                            }
                        }
                    })]
                }),
                new window.countlyQueryBuilder.RowRule({
                    name: "cly.crashes.no-isset",
                    selector: function() {
                        return true;
                    },
                    actions: [new window.countlyQueryBuilder.RowAction({
                        id: "disallowOperator",
                        params: {
                            selector: function(operator) {
                                return operator.id === "cly.isset";
                            }
                        }
                    })]
                }),
                new window.countlyQueryBuilder.RowRule({
                    name: "cly.crashes.no-regex",
                    selector: function(row) {
                        return row.property && !["app_version_list", "error", "latest_version"].includes(row.property.id);
                    },
                    actions: [new window.countlyQueryBuilder.RowAction({
                        id: "disallowOperator",
                        params: {
                            selector: function(operator) {
                                return operator.meta.regex;
                            }
                        }
                    })]
                }),
                new window.countlyQueryBuilder.RowRule({
                    name: "cly.crashes.single-val",
                    selector: function(row) {
                        return row.property && row.property.type === window.countlyQueryBuilder.PropertyType.LIST && row.property.getValueList && row.property.getValueList().length <= 2;
                    },
                    actions: [new window.countlyQueryBuilder.RowAction({
                        id: "overrideValueStrategy",
                        params: {
                            strategy: new window.countlyQueryBuilder.ValueStrategy({
                                type: window.countlyQueryBuilder.ValueType.PREDEF,
                                getValueList: function(row) {
                                    return row.property.getValueList();
                                }
                            }),
                        }
                    })]
                }),
            ] : [],
            formatDate: function(row, col, cell) {
                return moment(cell * 1000).format("lll");
            },
            hasDrillPermission: validateRead('drill'),
            showDeleteDialog: false,
            selectedGroups: [],
        };
    },
    computed: {
        crashgroupsFilter: {
            set: function(newValue) {
                var query = {};
                var tmpQuery = {};

                if (newValue.query) {
                    tmpQuery = countlyCrashes.modifyQueries(newValue.query);
                    query = countlyCrashes.modifyExistsQueries(tmpQuery);
                }

                if (newValue.query) {
                    app.navigate("#/crashes/filter/" + JSON.stringify({ query: newValue.query }));
                }
                else {
                    app.navigate("#/crashes", true);
                }

                return Promise.all([
                    this.$store.dispatch("countlyCrashes/overview/setCrashgroupsFilter", newValue),
                    this.$store.dispatch("countlyCrashes/pasteAndFetchCrashgroups", {query: JSON.stringify(query)})
                ]);
            },
            get: function() {
                return this.$store.getters["countlyCrashes/overview/crashgroupsFilter"];
            }
        },
        activeFilter: {
            set: function(newValue) {
                return this.$store.dispatch("countlyCrashes/overview/setActiveFilter", newValue);
            },
            get: function() {
                return this.$store.getters["countlyCrashes/overview/activeFilter"];
            }
        },
        activeFilterFields: function() {
            var platforms = [{value: "all", label: "All Platforms"}];
            this.$store.getters["countlyCrashes/overview/platforms"].forEach(function(platform) {
                platforms.push({value: platform, label: platform});
            });

            var appVersions = [{value: "all", label: "All Versions"}];
            this.$store.getters["countlyCrashes/overview/appVersions"].forEach(function(appVersion) {
                appVersions.push({value: appVersion, label: appVersion.replace(/:/g, ".")});
            });

            return [
                {
                    label: "Fatality",
                    key: "fatality",
                    items: [{value: "both", label: "Both"}, {value: "fatal", label: "Fatal"}, {value: "nonfatal", label: "Nonfatal"}],
                    default: "both"
                },
                {
                    label: "Platforms",
                    key: "platform",
                    options: platforms,
                    default: "all"
                },
                {
                    label: "Versions",
                    key: "version",
                    items: appVersions,
                    default: "all"
                },
            ];
        },
        dashboardData: function() {
            return this.$store.getters["countlyCrashes/overview/dashboardData"];
        },
        chartData: function() {
            return function(metric, name) {
                return this.$store.getters["countlyCrashes/overview/chartData"](metric, name);
            };
        },
        statistics: function() {
            return this.$store.getters["countlyCrashes/overview/statistics"];
        },
        errorColumnLabel: function() {
            var appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            return appType === 'mobile' ? cvI18n('crashes.crash-group') : cvI18n('crashes.error');
        },
        singleAppVersionFilter: function() {
            var currentFilter = this.$store.getters["countlyCrashes/overview/crashgroupsFilter"];

            if (currentFilter.query) {
                if (currentFilter.query.app_version_list && currentFilter.query.app_version_list.$in && Array.isArray(currentFilter.query.app_version_list.$in) && currentFilter.query.app_version_list.$in.length === 1) {
                    return currentFilter.query.app_version_list.$in[0];
                }
            }

            return '';
        },
        isLoading: function() {
            return this.$store.getters["countlyCrashes/overview/isLoading"];
        },
        loading: function() {
            return this.$store.getters["countlyCrashes/overview/loading"];
        },
        confirmDialogTitle: function() {
            var title = "crashes.confirm-action-title";
            title = this.selectedGroups.length > 1 ? title + "-plural" : title;
            return cvI18n(title);
        },
        confirmDialogText: function() {
            var text = "crashes.groups-confirm-delete";
            text = this.selectedGroups.length > 1 ? text + "-plural" : text;
            return cvI18n(text, this.selectedGroups.length);
        },
    },
    methods: {
        refresh: function(force) {
            if (this.$refs && this.$refs.dataTable && this.$refs.dataTable.externalParams) {
                this.$refs.dataTable.externalParams.skipLoading = true;
            }
            if (this.$refs && this.$refs.crashesAutoRefreshToggle && this.$refs.crashesAutoRefreshToggle.autoRefresh) {
                var query = {};
                var tmpQuery = {};
                if (this.crashgroupsFilter.query) {
                    tmpQuery = countlyCrashes.modifyQueries(this.crashgroupsFilter.query);
                    query = countlyCrashes.modifyExistsQueries(tmpQuery);
                }

                return Promise.all([
                    this.$store.dispatch("countlyCrashes/pasteAndFetchCrashgroups", {query: JSON.stringify(query)}),
                    this.$store.dispatch("countlyCrashes/overview/refresh", force)
                ]);
            }
        },
        handleSelectionChange: function(selectedRows, force) {
            force = force || false;
            var self = this;
            this.selectedGroups = [];
            this.$data.selectedCrashgroups = selectedRows.map(function(row) {
                self.selectedGroups.push(row.name);
                return row._id;
            });
            if (force) {
                self.$refs.dataTable.$refs.elTable.clearSelection();
            }
        },
        badgesFor: function(crash) {
            return countlyCrashes.generateBadges(crash);
        },
        setSelectedAs: function(state) {
            var promise;
            var self = this;

            if (state === "resolved") {
                promise = this.$store.dispatch("countlyCrashes/overview/setSelectedAsResolved", this.$data.selectedCrashgroups);
            }
            else if (state === "resolving") {
                promise = this.$store.dispatch("countlyCrashes/overview/setSelectedAsResolving", this.$data.selectedCrashgroups);
            }
            else if (state === "unresolved") {
                promise = this.$store.dispatch("countlyCrashes/overview/setSelectedAsUnresolved", this.$data.selectedCrashgroups);
            }
            else if (state === "hide") {
                promise = this.$store.dispatch("countlyCrashes/overview/setSelectedAsHidden", this.$data.selectedCrashgroups);
            }
            else if (state === "show") {
                promise = this.$store.dispatch("countlyCrashes/overview/setSelectedAsShown", this.$data.selectedCrashgroups);
            }
            else if (state === "delete") {
                self.$store.dispatch("countlyCrashes/overview/setSelectedAsDeleted", self.$data.selectedCrashgroups)
                    .then(function(response) {
                        if (Array.isArray(response.result)) {
                            var itemList = response.result.reduce(function(acc, curr) {
                                acc += "<li>" + curr + "</li>";
                                return acc;
                            }, "");
                            CountlyAlert("<ul>" + itemList + "</ul>", "red", { title: cvI18n("crashes.alert-fails") });
                        }
                        else {
                            notify({
                                title: cvI18n("systemlogs.action.crash_deleted"),
                                message: cvI18n("systemlogs.action.crash_group_deleted")
                            });
                        }
                    }).finally(function() {
                        self.selectedCrashgroups = [];
                        self.$refs.dataTable.$refs.elTable.clearSelection();
                        self.closeDeleteForm();
                        self.refresh();
                    });
            }

            if (typeof promise !== "undefined") {
                promise.then(function(response) {
                    if (Array.isArray(response.result)) {
                        var itemList = response.result.reduce(function(acc, curr) {
                            acc += "<li>" + curr + "</li>";
                            return acc;
                        }, "");
                        CountlyAlert("<ul>" + itemList + "</ul>", "red", { title: cvI18n("crashes.alert-fails") });
                    }
                    else {
                        notify({
                            title: cvI18n("configs.changed"),
                            message: cvI18n("configs.saved")
                        });
                    }
                }).finally(function() {
                    self.selectedCrashgroups = [];
                    self.$refs.dataTable.$refs.elTable.clearSelection();
                });
            }
        },
        appVersionSort: function(item1, item2) {
            if (item1.latest_version_for_sort && item2.latest_version_for_sort) {
                return item1.latest_version_for_sort.localeCompare(item2.latest_version_for_sort);
            }

            return item1.latest_version.localeCompare(item2.latest_version);
        },
        occurrenceSort: function(item1, item2) {
            if (this.singleAppVersionFilter.length) {
                var appVersion = this.singleAppVersionFilter.replace(/\./g, ':');

                return item1.app_version[appVersion] - item2.app_version[appVersion];
            }

            return item1.reports - item2.reports;
        },
        unpatchSelectedGroups: function() {
            this.handleSelectionChange([], true);
        },
        showDeleteForm: function() {
            this.showDeleteDialog = true;
        },
        closeDeleteForm: function() {
            this.showDeleteDialog = false;
        },
    },
    beforeCreate: function() {
        var query = {};
        var tmpQuery = {};
        if (this.$route.params && this.$route.params.query) {
            tmpQuery = countlyCrashes.modifyQueries(this.$route.params.query.query);
            query = countlyCrashes.modifyExistsQueries(tmpQuery);

            this.$store.dispatch("countlyCrashes/overview/setCrashgroupsFilter", this.$route.params.query);
            this.$store.dispatch("countlyCrashes/pasteAndFetchCrashgroups", {query: JSON.stringify(query)});
        }

        this.$store.dispatch("countlyCrashes/overview/refresh", true);
    }
};
</script>
