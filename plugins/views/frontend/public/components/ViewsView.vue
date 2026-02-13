<template>
    <div v-bind:class="[componentId]">
        <cly-header :title="i18n('views.title')" :tooltip="{description}">
            <template v-slot:header-right>
                <el-button v-if="isDrillEnabled" size="small" icon="cly-is cly-is-drill" type="default" @click="openDrillViewDrawer" class="bu-mr-2">
                    <span class="bu-ml-1">{{ i18n('events.all.drill') }}</span>
                </el-button>
                <cly-more-options test-id="analytics-views" v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="views-date-picker-container"></cly-date-picker-g>
            <cly-notification :text="totalViewCountWarning" v-if="showViewCountWarning" color="light-destructive"
                class="bu-mb-5">
                <template v-slot:close><a href="/dashboard#/manage/configurations/views" style="color: #0166D6;"
                        class="el-button el-button--text">{{i18n('common.adjust-limit')}}</a></template>
            </cly-notification>
            <cly-section v-loading="isGraphLoading">
                <cly-metric-cards :multiline="false">
                    <cly-metric-card :test-id="item.name.toLowerCase().replaceAll(' ', '-')" :number="item.percent"
                        :label="item.name" :tooltip="item.description" :color="item.color"
                        :is-percentage="item.isPercentage" :key="idx" v-for="(item, idx) in totalCards">
                        <template v-slot:number>
                            {{item.value}}
                            <a
                                v-if="item.lu_diff>20"
                                class="bu-is-underlined bu-is-clickable text-medium color-cool-gray-50"
                                data-test-id="deselect-all-button"
                                @click="refreshTotals">
                                {{i18n('common.refresh')}}
                            </a>
                            <cly-tooltip-icon
                                data-test-id="analytics-views-label-total-users-tooltip2"
                                :tooltip="item.ago" v-if="item.lu_diff"
                                con="ion ion-help-circled">
                            </cly-tooltip-icon>
                        </template>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <div class="bu-columns bu-is-gapless">
                <h4 class="bu-pt-1" data-test-id="views-based-on-label">{{i18n('views.based-on')}}</h4>
                <div class="bu-pl-1 bu-pr-1">
                    <el-select test-id="views-based-on" v-model="selectedProperty" :arrow="false" :adaptiveLength="true">
                        <el-option :key="item.value" :value="item.value" :label="item.name"
                            v-for="item in chooseProperties"></el-option>
                    </el-select>
                </div>
                <h4 class="bu-pt-1" data-test-id="for-label">{{i18n('views.for')}}</h4>
                <div class="bu-pl-1">
                    <cly-multi-select test-id="filter-parameter" ref="selectSegmentValue" @change="segmentChosen"
                        :dependantFields="true" v-model="filter" :fields="filterFields"></cly-multi-select>
                </div>
            </div>
            <cly-section class="pageViews_chart">
                <div v-if="lineOptions.series.length < 3">
                    <cly-chart-time test-id="chart-analytics-views" :option="lineOptions" :legend="{position: 'bottom'}"
                        v-loading="isGraphLoading" ref="viewsGraph" :val-formatter="formatChartValue" category="views">
                    </cly-chart-time>
                </div>
                <div v-else>
                    <cly-chart-time test-id="chart-analytics-views" :option="lineOptions" :legend="{position: 'right'}"
                        v-loading="isGraphLoading" ref="viewsGraph" :val-formatter="formatChartValue" category="views">
                    </cly-chart-time>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n v-if="tableMode == 'selected'" test-id="datatable-analytics-views" resizable border
                    :rows="selectedTableRows" :persist-key="tablePersistKey" :available-dynamic-cols="tableDynamicCols"
                    ref="viewsTable">
                    <template v-slot:header-left>
                        <el-select test-id="filter-views" v-model="tableMode" class="bu-mr-2">
                            <el-option :key="item.key" :value="item.key" :label="item.label"
                                v-for="item in tableModes"></el-option>
                        </el-select>
                        <a v-if="canUserDelete || canUserUpdate" data-test-id="edit-views-button"
                            href="#/analytics/views/manage"
                            class="el-button el-button--default">{{i18n('views.table.edit-views')}}</a>
                        <a class="el-button el-button--default" data-test-id="deselect-all-button"
                            @click="deselectAll">{{i18n('common.deselect-all')}}</a>
                    </template>
                    <template v-slot="scope">
                        <el-table-column width="65" fixed="left" prop="selected">
                            <template slot-scope="scope">
                                <el-checkbox :test-id="'datatable-analytics-views-' + scope.$index"
                                    :disabled="persistentSettings.length === 1 && scope.row.selected"
                                    :value=scope.row.selected @input="handleSelectionChange(scope.row._id)"></el-checkbox>
                            </template>
                        </el-table-column>
                        <el-table-column min-width="200" sortable="custom" prop="name" :show-overflow-tooltip="true"
                            :label="i18n('views.table.view')" fixed="left">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-analytics-views-view-' + scope.$index">{{unescapeHtml(scope.row.view)}}
                                </div>
                            </template>
                        </el-table-column>
                        <template v-for="(col,idx) in scope.dynamicCols">
                            <el-table-column :min-width="col.width" v-if="col.value === 'd'" sortable="custom" :key="idx"
                                :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-d-calc-' + scope.$index">
                                        {{scope.row.dCalc}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'scr'" sortable="custom"
                                :key="idx" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-scr-calc-' + scope.$index">
                                        {{scope.row.scrCalc}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'br'" sortable="custom"
                                :key="idx" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-br-' + scope.$index">
                                        {{formatNumber(scope.row.br)}}%</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'u'" :key="idx"
                                :formatter="numberFormatter" :sortable="false" :prop="col.value">
                                <template v-slot:header>
                                    <span v-if="isSpecialPeriod"
                                        data-test-id="analytics-views-label-total-users-tilde">~</span>
                                    <span data-test-id="analytics-views-label-total-users">{{col.label}}</span>
                                    <cly-tooltip-icon data-test-id="analytics-views-label-total-users-tooltip"
                                        v-if="isSpecialPeriod" :tooltip="i18n('common.estimation')"
                                        icon="ion ion-help-circled"></cly-tooltip-icon>
                                </template>
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-u-' + scope.$index">{{scope.row.u}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else :key="idx" :formatter="numberFormatter"
                                sortable="custom" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-' + col.value + '-' + scope.$index">
                                        {{scope.row[col.value]}}</div>
                                </template>
                            </el-table-column>
                        </template>
                    </template>
                </cly-datatable-n>
                <cly-datatable-n v-else resizable border test-id="datatable-analytics-views"
                    :default-sort="{prop: 't', order: 'descending'}" :available-dynamic-cols="tableDynamicCols"
                    :persist-key="tablePersistKey" :data-source="remoteTableDataSource" :export-query="getExportQuery"
                    ref="viewsTable" @selection-change="handleSelectionChange">
                    <template v-slot:header-left>
                        <el-select test-id="filter-views" v-model="tableMode" class="bu-mr-2">
                            <el-option :key="item.key" :value="item.key" :label="item.label"
                                v-for="item in tableModes"></el-option>
                        </el-select>
                        <a v-if="canUserDelete || canUserUpdate" data-test-id="edit-views-button"
                            href="#/analytics/views/manage"
                            class="el-button el-button--default">{{i18n('views.table.edit-views')}}</a>
                        <a class="el-button el-button--default" data-test-id="deselect-all-button"
                            @click="deselectAll">{{i18n('common.deselect-all')}}</a>
                    </template>

                    <template v-slot="scope">
                        <el-table-column width="65" fixed="left" prop="selected">
                            <template slot-scope="scope">
                                <el-checkbox :test-id="'datatable-analytics-views-' + scope.$index"
                                    :disabled="persistentSettings.length === 1 && scope.row.selected"
                                    :value=scope.row.selected @input="handleSelectionChange(scope.row._id)"></el-checkbox>
                            </template>
                        </el-table-column>
                        <el-table-column min-width="200" sortable="custom" prop="name" :show-overflow-tooltip="true"
                            :label="i18n('views.table.view')" fixed="left">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-analytics-views-view-' + scope.$index">{{unescapeHtml(scope.row.view)}}
                                </div>
                            </template>
                        </el-table-column>
                        <template v-for="(col,idx) in scope.dynamicCols">
                            <el-table-column :min-width="col.width" v-if="col.value === 'd'" sortable="custom" :key="idx"
                                :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-d-calc-' + scope.$index">
                                        {{scope.row.dCalc}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'scr'" sortable="custom"
                                :key="idx" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-scr-calc-' + scope.$index">
                                        {{scope.row.scrCalc}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'br'" sortable="custom"
                                :key="idx" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-br-' + scope.$index">
                                        {{formatNumber(scope.row.br)}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else-if="col.value === 'u'" :key="idx"
                                :formatter="numberFormatter" sortable="custom" :prop="col.value">
                                <template v-slot:header>
                                    <span v-if="isSpecialPeriod"
                                        data-test-id="analytics-views-label-total-users-tilde">~</span>
                                    <span data-test-id="analytics-views-label-total-users">{{col.label}}</span>
                                    <cly-tooltip-icon data-test-id="analytics-views-label-total-users-tooltip"
                                        v-if="isSpecialPeriod" :tooltip="i18n('common.estimation')"
                                        icon="ion ion-help-circled"></cly-tooltip-icon>
                                </template>
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-u-' + scope.$index">{{scope.row.u}}</div>
                                </template>
                            </el-table-column>
                            <el-table-column :min-width="col.width" v-else :key="idx" :formatter="numberFormatter"
                                sortable="custom" :prop="col.value" :label="col.label">
                                <template slot-scope="scope">
                                    <div :data-test-id="'datatable-analytics-views-' + col.value + '-' + scope.$index">
                                        {{scope.row[col.value]}}</div>
                                </template>
                            </el-table-column>
                        </template>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
        <drill-view-drawer :controls="drawers['drill-view']"></drill-view-drawer>
    </div>
</template>

<script>
import { i18n, i18nMixin, autoRefreshMixin, commonFormattersMixin, authMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { unescapeHtml } from '../../../../../frontend/express/public/javascripts/countly/countly.common.utils.js';
import { isPluginEnabled } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import jQuery from 'jquery';
import DrillViewDrawer from './DrillViewDrawer.vue';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClyNotification from '../../../../../frontend/express/public/javascripts/components/helpers/cly-notification.vue';
import ClyMetricCards from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-card.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyChartTime from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-time.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyMultiSelect from '../../../../../frontend/express/public/javascripts/components/dropdown/multi-select.vue';

var FEATURE_NAME = "views";

export default {
    components: {
        "drill-view-drawer": DrillViewDrawer,
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyNotification,
        ClyMetricCards,
        ClyMetricCard,
        ClyTooltipIcon,
        ClyMoreOptions,
        ClyChartTime,
        ClyDatatableN,
        ClyMultiSelect
    },
    mixins: [
        i18nMixin,
        autoRefreshMixin,
        commonFormattersMixin,
        dataMixin({ 'externalLinks': '/analytics/views/links' }),
        authMixin(FEATURE_NAME),
        mixins.hasDrawers("drill-view")
    ],
    data: function() {
        var showScrollingCol = false;
        var showActionMapColumn = false;

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "mobile") {
            showScrollingCol = true;
        }

        var cards = this.calculateTotalCards();
        var series = {"series": []};
        var dynamicCols = [{
            value: "u",
            width: "180",
            label: i18n('common.table.total-users'),
            default: true
        },
        /*{
            value: "n",
            width: "180",
            label: i18n('common.table.new-users'),
            default: true
        },*/
        {
            value: "t",
            width: "130",
            label: i18n('views.total-visits'),
            default: true
        },
        {
            value: "s",
            width: "130",
            label: i18n('views.starts'),
            default: true
        },
        {
            value: "e",
            width: "130",
            label: i18n('views.exits'),
            default: true
        },
        {
            value: "d",
            width: "130",
            label: i18n('views.avg-duration'),
            default: true
        },
        {
            value: "b",
            width: "130",
            label: i18n('views.bounces'),
            default: true
        },
        {
            value: "br",
            label: i18n('views.br'),
            width: "140",
            default: true
        }];

        if (showScrollingCol) {
            dynamicCols.push({
                value: "scr",
                label: i18n('views.scrolling-avg'),
                default: true,
                width: "130"
            });
        }

        return {
            description: i18n('views.description'),
            remoteTableDataSource: getServerDataSource(this.$store, "countlyViews", "viewsMainTable"),
            showScrollingCol: showScrollingCol,
            filter: {segment: "all", segmentKey: "all"},
            "all": jQuery.i18n.map["common.all"],
            totalCards: cards,
            lineOptions: series,
            totalViewCountWarning: "",
            showViewCountWarning: false,
            tableDynamicCols: dynamicCols,
            isGraphLoading: true,
            //isTableLoading: true,
            showActionMapColumn: showActionMapColumn, //for action map
            domains: [], //for action map
            persistentSettings: [],
            tablePersistKey: "views_table_" + countlyCommon.ACTIVE_APP_ID,
            tableMode: "all",
            tableModes: [
                {"key": "all", "label": i18n('common.all')},
                {"key": "selected", "label": i18n('views.selected-views')}
            ],
            isSpecialPeriod: countlyCommon.periodObj.isSpecialPeriod,
        };
    },
    mounted: function() {
        var self = this;
        self.persistentSettings = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
        this.$store.dispatch('countlyViews/onSetSelectedViews', self.persistentSettings);
        this.$store.dispatch('countlyViews/fetchData').then(function() {
            self.calculateGraphSeries();
            self.showActionsMapColumn(); //for action map
            self.setUpDomains(); //for action map
        });

        this.$store.dispatch('countlyViews/fetchTotalViewsCount').then(function() {
            self.validateTotalViewCount();
        });
        self.$store.dispatch('countlyViews/fetchTotals').then(function() {
            self.totalCards = self.calculateTotalCards();
        });
        this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue}).then(function() {
            self.isTableLoading = false;
        });
    },
    methods: {
        refreshTotals: function() {
            var self = this;
            this.$store.dispatch('countlyViews/fetchTotals', {no_cache: true}).then(function() {
                self.totalCards = self.calculateTotalCards();
            });
        },
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isGraphLoading = true;
                //self.isTableLoading = true;
            }
            this.$store.dispatch('countlyViews/fetchData').then(function() {
                self.calculateGraphSeries();
                self.showActionsMapColumn();//for action map
                self.setUpDomains();//for action map
            });
            this.$store.dispatch('countlyViews/fetchTotals').then(function() {
                self.totalCards = self.calculateTotalCards();
            });
            this.$store.dispatch('countlyViews/fetchTotalViewsCount').then(function() {
                self.validateTotalViewCount();
            });

            this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue}).then(function() {
                //self.isTableLoading = false;
            });
        },
        validateTotalViewCount: function() {
            this.totalViewCount = this.$store.state.countlyViews.totalViewsCount;
            if (this.totalViewCount >= countlyGlobal.views_limit) {
                this.showViewCountWarning = true;
                this.totalViewCountWarning = i18n('views.max-views-limit', countlyGlobal.views_limit);
            }
        },
        showActionsMapColumn: function() {
            //for action map
            var domains = this.$store.state.countlyViews.domains;
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (domains.length || countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0)) {
                this.showActionMapColumn = true;
            }
        },
        setUpDomains: function() {
            //for action map
            var domains = [];
            var dd = this.$store.state.countlyViews.domains || [];
            for (var k = 0; k < dd.length; k++) {
                domains.push({"value": countlyCommon.decode(dd[k]), "label": countlyCommon.decode(dd[k])});
            }
            this.domains = domains;
        },
        viewActionMapClick: function(url, viewid, domain) {
            var self = this;
            if (domain) {
                url = url.replace("#/analytics/views/action-map/", "");
                url = domain + url;
            }
            var newWindow = window.open("");
            window.countlyTokenManager.createToken("View heatmap", "/o/actions", true, countlyCommon.ACTIVE_APP_ID, 1800, function(err, token) {
                self.token = token && token.result;
                if (self.token) {
                    newWindow.name = "cly:" + JSON.stringify({"token": self.token, "purpose": "heatmap", period: countlyCommon.getPeriodForAjax(), showHeatMap: true, app_key: countlyCommon.ACTIVE_APP_KEY, url: window.location.protocol + "//" + window.location.host});
                    newWindow.location.href = url;
                }
            });
        },
        deselectAll: function() {
            var self = this;
            var selected = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];

            var highestTotalUserSelected = {total: 0, _id: null};
            this.$refs.viewsTable.sourceRows.forEach(row => {
                if (row.selected && row.u > highestTotalUserSelected.total) {
                    highestTotalUserSelected.total = row.u;
                    highestTotalUserSelected._id = row._id;
                }
            });
            selected.splice(0, selected.length);
            selected.push(highestTotalUserSelected._id);

            var persistData = {};
            persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = selected;
            countlyCommon.setPersistentSettings(persistData);

            if (this.$refs.viewsTable) {
                for (var k = 0; k < this.$refs.viewsTable.sourceRows.length; k++) {
                    if (selected.indexOf(this.$refs.viewsTable.sourceRows[k]._id) === -1) {
                        this.$refs.viewsTable.sourceRows[k].selected = false;
                    }
                }
            }

            this.persistentSettings = selected;
            this.$store.dispatch('countlyViews/onSetSelectedViews', selected).then(function() {
                self.isGraphLoading = true;
                self.$store.dispatch('countlyViews/fetchData').then(function() {
                    self.calculateGraphSeries();
                });
            });

            this.refresh(true);
        },
        handleSelectionChange: function(selectedRows) {
            var self = this;
            var selected = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
            var map = {};
            for (var kz = 0; kz < selected.length; kz++) {
                map[selected[kz]] = true;
            }
            selected = Object.keys(map); //get distinct
            if (selected.indexOf(selectedRows) === -1) {
                selected.push(selectedRows);
            }
            else {
                var index = selected.indexOf(selectedRows);
                selected.splice(index, 1);
            }
            var persistData = {};
            persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = selected;
            countlyCommon.setPersistentSettings(persistData);

            if (this.$refs.viewsTable) {
                for (var k = 0; k < this.$refs.viewsTable.sourceRows.length; k++) {
                    if (selected.indexOf(this.$refs.viewsTable.sourceRows[k]._id) > -1) {
                        this.$refs.viewsTable.sourceRows[k].selected = true;
                    }
                    else {
                        this.$refs.viewsTable.sourceRows[k].selected = false;
                    }
                }
            }

            this.persistentSettings = selected;
            this.$store.dispatch('countlyViews/onSetSelectedViews', selected).then(function() {
                self.isGraphLoading = true;
                self.$store.dispatch('countlyViews/fetchData').then(function() {
                    self.calculateGraphSeries();
                });
            });
            return true;
        },
        segmentChosen: function(val) {
            var self = this;
            this.isGraphLoading = true;
            this.isTableLoading = true;
            if (val.segment && val.segment !== "all" && val.segmentKey && val.segmentKey !== "all") {
                this.$store.dispatch('countlyViews/onSetSelectedSegment', val.segment);
                this.$store.dispatch('countlyViews/onSetSelectedSegmentValue', val.segmentKey);
            }
            else {
                this.$store.dispatch('countlyViews/onSetSelectedSegment', "");
                this.$store.dispatch('countlyViews/onSetSelectedSegmentValue', "");
            }
            this.$store.dispatch('countlyViews/fetchData').then(function() {
                self.calculateGraphSeries();
            });
            this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue}).then(function() {
                self.isTableLoading = false;
            });
        },
        calculateTotalCards: function() {
            var totals = this.$store.state.countlyViews.totals || {};
            totals.t = totals.t || 0;
            totals.uvc = totals.uvc || 0;
            totals.s = totals.s || 0;
            totals.b = totals.b || 0;
            totals.u = totals.u || 0;
            if (totals.s) {
                totals.br = Math.round(totals.b / totals.s * 1000) / 10;
            }
            else {
                totals.br = 0;
            }
            return [
                {
                    "name": i18n('views.total_page_views.title'),
                    "description": i18n('views.total_page_views.desc'),
                    "value": countlyCommon.formatNumber(totals.t),
                    "percent": 0,
                    isPercentage: false
                },
                {
                    "name": i18n('views.u'),
                    "description": i18n('views.unique_users.desc'),
                    "value": countlyCommon.formatNumber(totals.u),
                    "lu": totals.lu,
                    "ago": countlyCommon.formatTimeAgoTextFromDiff(totals.lu_diff),
                    "lu_diff": totals.lu_diff,
                    "percent": 0,
                    isPercentage: false
                },
                {
                    "name": i18n('views.br'),
                    "description": i18n('views.bounce_rate.desc'),
                    "value": totals.br + "%",
                    "percent": Math.min(totals.br, 100),
                    isPercentage: true,
                    "color": "#F96300"
                }
            ];
        },
        calculateGraphSeries: function() {
            var self = this;
            this.$store.dispatch("countlyViews/calculateGraphData").then(function(data2) {
                var have_names = false;
                var good_ones = [];
                for (var k = 0; k < data2.length; k++) {
                    if (data2[k].name !== data2[k]._id) {
                        good_ones.push(data2[k]._id);
                        have_names = true;
                    }
                }
                if (have_names && good_ones.length !== data2.length) { //If we have loaded names - we can clear out the ones without name. (It means not existing, deleted views)
                    var persistData = {};
                    persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = good_ones;
                    countlyCommon.setPersistentSettings(persistData);
                    self.$store.dispatch('countlyViews/onSetSelectedViews', good_ones);
                }
                self.lineOptions = {
                    series: data2,
                    tooltip: {
                        position: function(point, params, dom, rect, size) {
                            if (size.viewSize[0] <= point[0] + 180) {
                                return [point[0] - 180, point[1] + 10];
                            }
                            else {
                                return [point[0], point[1] + 10];
                            }
                        },
                    }
                };
                if (self.selectedProperty === "d") {
                    self.lineOptions.yAxis = {
                        axisLabel: {
                            formatter: function(value) {
                                return countlyCommon.formatSecond(value);
                            }
                        }
                    };
                }
                self.isGraphLoading = false;
            });
        },
        getExportQuery: function() {
            var requestPath = countlyCommon.API_PARTS.data.r + "?method=views&action=getExportQuery" + "&period=" + countlyCommon.getPeriodForAjax() + "&iDisplayStart=0&app_id=" + countlyCommon.ACTIVE_APP_ID + '&api_key=' + countlyGlobal.member.api_key;

            var segment = this.$store.state.countlyViews.selectedSegment;
            var segmentValue = this.$store.state.countlyViews.selectedSegmentValue;
            if (segment && segment !== "" && segmentValue && segmentValue !== "") {
                requestPath += "&segment=" + segment;
                requestPath += "&segmentVal=" + segmentValue;
            }
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Views" + countlyCommon.ACTIVE_APP_ID + "_on_" + window.moment().format("DD-MMM-YYYY"),
                prop: ['aaData'],
                type_name: "views",
                "url": "/o/export/requestQuery"
            };
            return apiQueryData;
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        },
        formatChartValue: function(value) {
            if (this.selectedProperty === "br") {
                return countlyCommon.getShortNumber(value) + '%';
            }
            if (this.selectedProperty === "d") {
                return countlyCommon.formatSecond(value);
            }
            return countlyCommon.getShortNumber(value);
        },
        dateChanged: function() {
            this.isSpecialPeriod = countlyCommon.periodObj.isSpecialPeriod;
            this.refresh(true);
        },
        openDrillViewDrawer: function() {
            let self = this;
            let args = {
                "period": countlyCommon.getPeriod(),
                "selectedSegment": this.filter.segment,
                "selectedSegmentValues": (this.filter.segmentKey && this.filter.segmentKey !== "all") ? [this.filter.segmentKey] : [],
                "selectedViews": this.$store.state.countlyViews.selectedViews.map(function(id) {
                    let view = self.selectedTableRows.find(function(row) {
                        return row._id === id;
                    });
                    return view ? view.view : id;
                })
            };
            this.openDrawer("drill-view", args);
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyViews.appData;
        },
        selectedTableRows: function() {
            return this.$store.getters["countlyViews/selectedTableRows"];
        },
        filterFields: function() {
            return [
                {
                    label: i18n('views.segment-key'),
                    key: "segment",
                    items: this.chooseSegment,
                    default: "all",
                    searchable: true,
                    disabled: this.omittedSegments
                },
                {
                    label: i18n('views.segment-value'),
                    key: "segmentKey",
                    items: this.chooseSegmentValue,
                    default: "all",
                    searchable: true
                }
            ];
        },
        chooseProperties: function() {
            return [
                {"value": "t", "name": i18n('views.total-visits')},
                {"value": "u", "name": i18n('common.table.total-users')},
                // {"value": "n", "name": i18n('common.table.new-users')},
                {"value": "d", "name": i18n('views.avg-duration')},
                {"value": "s", "name": i18n('views.starts')},
                {"value": "e", "name": i18n('views.exits')},
                {"value": "b", "name": i18n('views.bounces')},
                {"value": "br", "name": i18n('views.br')},
                {"value": "scr", "name": i18n('views.scrolling-avg')},
                // {"value": "uvc", "name": i18n('views.uvc')},
            ];
        },
        topDropdown: function() {
            var links = [];
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                for (var k = 0; k < this.externalLinks.length; k++) {
                    links.push(this.externalLinks[k]);
                }
            }
            links.push({"icon": "", "label": i18n('plugins.configs'), "value": "#/manage/configurations/views"}); //to settings
            return links;
        },
        chooseSegment: function() {
            var segments = this.$store.state.countlyViews.segments || {};
            var sortedKeys = Object.keys(segments).sort(Intl.Collator().compare);
            var listed = [{"value": "all", "label": jQuery.i18n.map["views.all-segments"]}];
            for (var i = 0; i < sortedKeys.length; i++) {
                listed.push({"value": sortedKeys[i], "label": sortedKeys[i]});
            }
            return listed;
        },
        chooseSegmentValue: function() {
            var segments = this.$store.state.countlyViews.segments || {};
            var key;
            if (this.$refs && this.$refs.selectSegmentValue && this.$refs.selectSegmentValue.unsavedValue && this.$refs.selectSegmentValue.unsavedValue.segment) {
                key = this.$refs.selectSegmentValue.unsavedValue.segment;
            }
            var listed = [{"value": "all", "label": i18n('common.all')}];
            if (!key) {
                return listed;
            }
            else {
                if (segments[key]) {
                    for (var k = 0; k < segments[key].length; k++) {
                        listed.push({"value": segments[key][k], "label": segments[key][k]});
                    }
                    return listed;
                }
                else {
                    return listed;
                }
            }
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyViews/onSetSelectedProperty', value);
                this.calculateGraphSeries();
            },
            get: function() {
                return this.$store.state.countlyViews.selectedProperty;
            }
        },
        isLoading: function() {
            return this.$store.state.countlyViews.isLoading;
        },
        omittedSegments: function() {
            var omittedSegmentsObj = {
                label: i18n("events.all.omitted.segments"),
                options: []
            };
            var omittedSegments = this.$store.getters['countlyViews/getOmittedSegments'];
            if (omittedSegments) {
                omittedSegmentsObj.options = omittedSegments.map(function(item) {
                    return {
                        "label": item,
                        "value": item
                    };
                });
            }
            return omittedSegmentsObj;
        },
        isDrillEnabled: function() {
            return isPluginEnabled("drill");
        }
    }
};
</script>
