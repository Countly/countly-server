<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('carriers.title')"
            :tooltip="{description, placement: 'top-center'}"
        >
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="app-carrier-date-picker-container"></cly-date-picker-g>
            <cly-section>
                <div class="bu-columns bu-is-gapless technology-pie-graphs">
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie test-id="pie-new" :option="pieOptionsNew" :showToggle="false" v-loading="isLoading" :force-loading="isLoading"></cly-chart-pie>
                    </div>
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie test-id="pie-total" :option="pieOptionsTotal" :showToggle="false" v-loading="isLoading" :force-loading="isLoading"></cly-chart-pie>
                    </div>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="carriers" :rows="appCarrierRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="carriers" :label="i18n('carriers.table.carrier')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-carriers-carrier-' + rowScope.$index">
                                    {{ rowScope.row.carriers }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" :formatter="numberFormatter" prop="t" :label="i18n('common.table.total-sessions')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-carriers-total-sessions-' + rowScope.$index">
                                    {{ rowScope.row.t }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" :formatter="numberFormatter" prop="u" :label="i18n('common.table.total-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-carriers-total-users-' + rowScope.$index">
                                    {{ rowScope.row.u }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" :formatter="numberFormatter" prop="n" :label="i18n('common.table.new-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-carriers-new-users-' + rowScope.$index">
                                    {{ rowScope.row.n }}
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
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyChartPie from '../../../javascripts/components/echart/cly-chart-pie.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';

const CV = countlyVue;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyChartPie,
        ClyDatatableN,
        ClyMoreOptions
    },
    mixins: [
        countlyVue.mixins.i18n,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/carriers/links'
        })
    ],
    data: function() {
        return {
            description: CV.i18n('carriers.description')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyAppCarrier/fetchAll', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyAppCarrier/fetchAll', force);
        },
        dateChanged: function() {
            this.$store.dispatch('countlyAppCarrier/fetchAll', true);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appCarrier: function() {
            return this.$store.state.countlyAppCarrier.appCarrier;
        },
        pieOptionsNew: function() {
            var self = this;
            self.appCarrier.totals = self.appCarrier.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.appCarrier.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.appCarrier.totals.newUsers || 0),
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
            self.appCarrier.totals = self.appCarrier.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.appCarrier.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(self.appCarrier.totals.totalSessions || 0),
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
        appCarrierRows: function() {
            if (this.appCarrier && this.appCarrier.table) {
                this.appCarrier.table.forEach(function(row) {
                    row.carriers = countlyCommon.unescapeHtml(row.carriers);
                });
                return this.appCarrier.table;
            }
            return [];
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        },
        isLoading: function() {
            return this.$store.state.countlyAppCarrier.isLoading;
        }
    }
};
</script>
