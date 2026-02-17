<template>
<div v-bind:class="[componentId]">
    <cly-header
        :title="i18n('languages.title')"
        :tooltip="{description}"
    >
        <template v-slot:header-right>
          <cly-more-options v-if="topDropdown" size="small">
            <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
          </cly-more-options>
        </template>
    </cly-header>
    <cly-main>
        <cly-date-picker-g class="languages-date-picker-container"></cly-date-picker-g>
        <cly-section>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-6">
                    <cly-chart-pie test-id="pie-total" :option="pieOptionsTotal" :showToggle="false" :force-loading="isLoading" v-loading="isLoading"></cly-chart-pie>
                </div>
                <div class="bu-column bu-is-6">
                    <cly-chart-pie test-id="pie-new" :option="pieOptionsNew" :showToggle="false" :force-loading="isLoading" v-loading="isLoading"></cly-chart-pie>
                </div>
            </div>
        </cly-section>
        <cly-section>
            <cly-datatable-n test-id="languages" :rows="appRows" :exportFormat="formatExportFunction" :resizable="true" :force-loading="isLoading" v-loading="isLoading">
                <template v-slot="scope">
                    <el-table-column sortable="custom" prop="langs" :label="i18n('languages.table.language')">
                        <template slot-scope="scope">
                            <div class="bu-level">
                                <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-languages-language-' + scope.$index">
                                    <span>{{scope.row.langs}}</span>
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="t" :label="i18n('common.table.total-sessions')">
                        <template slot-scope="scope">
                            <div class="bu-level">
                                <div class="bu-is-flex user-activity-table__data-item-container">
                                    <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-languages-total-session-' + scope.$index">
                                        <span>{{formatNumber(scope.row.t)}}</span>
                                    </div>
                                    <div class="bu-level user-activity-table__divider" :data-test-id="'datatable-languages-total-session-divider-' + scope.$index">
                                        <span>|</span>
                                    </div>
                                    <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-languages-total-session-percentage-' + scope.$index">
                                        <span>{{scope.row.tPerc}}%</span>
                                    </div>
                                </div>
                                <cly-progress-bar :data-test-id="'datatable-languages-total-session-progress-bar-' + scope.$index" :percentage="parseInt(scope.row.tPerc)" :height=8 > </cly-progress-bar>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="u" :label="i18n('common.table.total-users')">
                        <template slot-scope="scope">
                            <div class="bu-level">
                                <div class="bu-is-flex user-activity-table__data-item-container">
                                    <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-languages-total-users-' + scope.$index">
                                        <span>{{formatNumber(scope.row.u)}}</span>
                                    </div>
                                    <div class="bu-level user-activity-table__divider" :data-test-id="'datatable-languages-total-users-divider-' + scope.$index">
                                        <span>|</span>
                                    </div>
                                    <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-languages-total-users-percentage-' + scope.$index">
                                        <span>{{scope.row.uPerc}}%</span>
                                    </div>
                                </div>
                                <cly-progress-bar :data-test-id="'datatable-languages-total-users-progress-bar-' + scope.$index" :percentage="parseInt(scope.row.uPerc)" :height=8 > </cly-progress-bar>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="n" :label="i18n('common.table.new-users')">
                        <template slot-scope="scope">
                            <div class="bu-level">
                                <div class="bu-is-flex user-activity-table__data-item-container">
                                    <div class="bu-level bu-is-justify-content-flex-start" :data-test-id="'datatable-languages-new-users-' + scope.$index">
                                        <span>{{formatNumber(scope.row.n)}}</span>
                                    </div>
                                    <div class="bu-level user-activity-table__divider" :data-test-id="'datatable-languages-new-users-divider-' + scope.$index">
                                        <span>|</span>
                                    </div>
                                    <div class="bu-level bu-is-justify-content-flex-end" :data-test-id="'datatable-languages-new-users-percentage-' + scope.$index">
                                        <span>{{scope.row.nPerc}}%</span>
                                    </div>
                                </div>
                                <cly-progress-bar :data-test-id="'datatable-languages-new-users-progress-bar-' + scope.$index" :percentage="parseInt(scope.row.nPerc)" :height=8 > </cly-progress-bar>
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
import { i18nMixin, commonFormattersMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';

export default {
    mixins: [
        i18nMixin,
        commonFormattersMixin,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/language/links'
        })
    ],
    data: function() {
        return {
            description: this.i18n('help.languages.chart')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyLanguage/fetchAll', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyLanguage/fetchAll', force);
        },
        formatExportFunction: function() {
            var tableData = this.appRows;
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[this.i18n('languages.table.language').toUpperCase()] = tableData[i].langs;
                item[this.i18n('common.table.total-sessions').toUpperCase()] = tableData[i].t + " | " + tableData[i].tPerc + "%";
                item[this.i18n('common.table.total-users').toUpperCase()] = tableData[i].u + " | " + tableData[i].uPerc + "%";
                item[this.i18n('common.table.new-users').toUpperCase()] = tableData[i].n + " | " + tableData[i].nPerc + "%";
                table.push(item);
            }
            return table;
        },
    },
    computed: {
        data: function() {
            return this.$store.state.countlyLanguage.Language;
        },
        pieOptionsNew: function() {
            var self = this;
            return {
                series: [
                    {
                        name: this.i18n('common.table.new-users'),
                        data: self.data.pie.newUsers,
                        label: {
                            formatter: "{a|" + this.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.data.totals.newUsers || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        pieOptionsTotal: function() {
            var self = this;
            return {
                series: [
                    {
                        name: this.i18n('common.table.total-sessions'),
                        data: self.data.pie.totalSessions,
                        label: {
                            formatter: "{a|" + this.i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(self.data.totals.totalSessions || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        appRows: function() {
            return this.data.table || [];
        },
        isLoading: function() {
            return this.$store.getters["countlyLanguage/isLoading"];
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    },
};
</script>
