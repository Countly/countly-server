<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('resolutions.title')"
            :tooltip="{description}"
        >
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-5"></cly-date-picker-g>
            <cly-section>
                <div class="bu-columns bu-is-gapless bu-mt-2 technology-pie-graphs">
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie test-id="pie-new" :option="pieOptionsNew" :showToggle="false" v-loading="isLoading" :force-loading="isLoading"></cly-chart-pie>
                    </div>
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie test-id="pie-total" :option="pieOptionsTotal" :showToggle="false" v-loading="isLoading" :force-loading="isLoading"></cly-chart-pie>
                    </div>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="resolutions" :rows="appResolutionRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="resolutions" :label="i18n('resolutions.table.resolution')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-resolutions-resolution-' + rowScope.$index">
                                    {{ rowScope.row.resolutions }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-resolutions-total-sessions-' + rowScope.$index">
                                    {{ rowScope.row.t }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-resolutions-total-users-' + rowScope.$index">
                                    {{ rowScope.row.u }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-resolutions-new-users-' + rowScope.$index">
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
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n,
        autoRefreshMixin,
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/resolutions/links'
        })
    ],
    data: function() {
        return {
            description: CV.i18n('resolutions.description')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchResolution', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchResolution', force);
        },
        dateChanged: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchResolution', true);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        pieOptionsNew: function() {
            var self = this;

            self.appResolution.totals = self.appResolution.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.appResolution.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.appResolution.totals.newUsers || 0),
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
            self.appResolution.totals = self.appResolution.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.appResolution.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + (countlyCommon.getShortNumber(self.appResolution.totals.totalSessions) || 0),
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
        appResolutionRows: function() {
            return this.appResolution.table || [];
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.resolutionLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    }
};
</script>
