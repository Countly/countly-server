<template>
    <cly-main>
        <div class="bu-level bu-my-4">
            <div class="bu-level-left">
                <span class="text-big font-weight-bold" data-test-id="export-purge-history-for-label">Export/Purge History for</span>
                <cly-select-x
                        class="bu-ml-3"
                        test-id="metrics-filter"
                        :width="300"
                        :arrow="false"
                        :borderless="true"
                        :adaptiveLength="true"
                        :auto-commit="true"
                        :hide-default-tabs="true"
                        :hide-all-options-tab="true"
                        :options="filter0"
                        v-model="selectedfilterforMetrics">
                    </cly-select-x>
            </div>
            <div class="bu-level-right">
                <cly-date-picker-g type="daterange" range-separator="To" start-placeholder="Start date" end-placeholder="End date">
                </cly-date-picker-g>
            </div>
        </div>
        <cly-section class="cly-vue-complaince__export__table cly-vue-complaince__hub_style_widthzero">
            <cly-datatable-n test-id="datatable-compliance-hub-export-purge-history" :data-source="exportHistoryTableSource" :default-sort="{prop: 'ts', order: 'descending'}">
                <template v-slot="scope">
                    <el-table-column sortable="custom" prop="u" label="USER">
                        <template slot-scope="scope">
                            <div :data-test-id="'datatable-export-purge-history-user-' + scope.$index">
                                {{scope.row.u}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="ip" label="IP ADDRESS">
                        <template slot-scope="scope">
                            <div :data-test-id="'datatable-export-purge-history-ip-address-' + scope.$index">
                                {{scope.row.ip}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="400" sortable="custom" label="ACTION">
                        <template v-slot="rowScope">
                            <span v-html="rowScope.row.actions" :data-test-id="'datatable-export-purge-history-action-' + rowScope.$index"></span>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="time" label="TIME">
                        <template v-slot="rowScope">
                            <div :data-test-id="'datatable-export-purge-history-time-' + rowScope.$index">
                                {{rowScope.row.time}}
                            </div>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-section>
    </cly-main>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import countlyConsentManager from '../store/index.js';

import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyMain,
        ClySelectX,
        ClyDatePickerG,
        ClySection,
        ClyDatatableN,
    },
    data: function() {
        return {
            exportHistoryTableSource: getServerDataSource(this.$store, "countlyConsentManager", "exportHistoryDataResource"),
            filter0: [
                { value: 'all', label: this.i18n("common.all") },
                { value: 'export_app_user', label: this.i18n("compliance_hub.Export-finished") },
                { value: 'app_user_deleted', label: this.i18n("compliance_hub.App-user-deleted") },
                { value: 'export_app_user_deleted', label: this.i18n("compliance_hub.Export-file-deleted") }
            ],
            filter1: [
                { value: 'all', label: this.i18n("common.all") },
                { value: 'i', label: this.i18n("consent.opt-i") },
                { value: 'o', label: this.i18n("consent.opt-o") }
            ],
            selectedfilter1: 'all',
            selectedfilter0: 'all',
            selectedfilterforConsent: 'i',
        };
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyConsentManager/fetchExportHistoryDataResource");
    },
    computed: {
        selectedfilterforMetrics: {
            get: function() {
                return this.selectedfilter0;
            },
            set: function(newValue) {
                this.selectedfilter0 = newValue;
                this.initializeStoreData();
            }
        },
    },
    methods: {
        dateChanged: function() {
            this.initializeStoreData();
        },
        initializeStoreData: function() {
            var newValue = this.selectedfilter0;
            if (this.selectedfilter0 === 'all') {
                newValue = "";
            }
            var self = this;
            countlyConsentManager.initialize().then(function() {
                var payload = {
                    "segment": newValue
                };
                self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                self.$store.dispatch("countlyConsentManager/_purgeDP");
                self.$store.dispatch("countlyConsentManager/_ePData");
                self.$store.commit("countlyConsentManager/exportHistoryFilter", self.selectedfilter0);
                self.$store.dispatch("countlyConsentManager/fetchExportHistoryDataResource");
            });
        },
    }
};
</script>
