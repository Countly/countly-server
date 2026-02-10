<template>
    <cly-main class="compliance-hub-consent-history">
        <div class="bu-level bu-my-4">
            <div class="bu-level-left bu-is-flex bu-is-flex-direction-column">
                <div>
                    <cly-database-engine-debug-panel @refresh-data="refreshData" class="compliance-hub-consent-history__debug-panel bu-mb-5"/>
                </div>
                <div class="compliance-hub-consent-history__metrics">
                    <span class="text-big font-weight-bold" data-test-id="consent-history-for-label">Consent History for </span>
                    <cly-select-x test-id="consent-filter" class="bu-ml-3 bu-mr-3" :width="300" :borderless="true" :adaptiveLength="true"
                        :auto-commit="true" :hide-default-tabs="true" :arrow="false" :hide-all-options-tab="true" :options="filter1"
                        v-model="selectedfilterforConsent">
                    </cly-select-x>
                    <span class="text-big font-weight-bold" data-test-id="and-label"> and </span>
                    <cly-select-x test-id="metrics-filter" class="bu-ml-3 bu-mr-3" :width="300" :borderless="true" :auto-commit="true"
                        :adaptiveLength="true" :arrow="false" :hide-default-tabs="true" :hide-all-options-tab="true" :options="filter0"
                        v-model="selectedfilterforMetrics">
                    </cly-select-x>
                </div>
            </div>
            <div class="bu-level-right">
                <cly-date-picker-g type="daterange" range-separator="To" start-placeholder="Start date" end-placeholder="End date">
                </cly-date-picker-g>
            </div>
        </div>
        <cly-section class="cly-vue-compliance__consent_history cly-vue-complaince__hub_style_widthzero">
            <cly-datatable-n test-id="datatable-compliance-hub-consent-history" :force-loading="consentHistoryLoading" :data-source="consentHistoryTableSource" :default-sort="{prop: 'ts', order: 'ascending'}" ref="table" @row-click="tableRowClickHandler" row-class-name="bu-is-clickable">
                <template v-slot="scope">
                    <el-table-column fixed type="expand">
                        <template slot-scope="props">
                            <div class="bu-level bu-mb-4 cly-vue-compliance__consent_history_expanded_column">
                                <div class="bu-level-left text-medium font-weight-bold" :data-test-id="'expand-device-id-label-' + props.$index">Device ID</div>
                                <div style="width: 80%;" class="bu-level-right">
                                    <p style="width: 100%;" :data-test-id="'expand-device-id-' + props.$index">{{props.row.device_id}}</p>
                                </div>
                            </div>
                            <div v-if="props.row.optin.length > 0"
                                class="bu-level bu-mb-4 cly-vue-compliance__consent_history_expanded_column">
                                <div class="bu-level-left text-medium font-weight-bold" :data-test-id="'expand-opt-in-label-' + props.$index">{{i18n("consent.opt-i")}}</div>
                                <div style="width: 80%;" class="bu-level-right">
                                    <p style="width: 100%;" :data-test-id="'expand-opt-in-' + props.$index">
                                        {{props.row.optin.join(',')}}
                                    </p>
                                </div>
                            </div>
                            <div v-if="props.row.optout.length > 0"
                                class="bu-level bu-mb-4 cly-vue-compliance__consent_history_expanded_column">
                                <div class="bu-level-left text-medium font-weight-bold" :data-test-id="'expand-opt-out-label-' + props.$index">{{i18n("consent.opt-o")}}</div>
                                <div style="width: 80%;" class="bu-level-right">
                                    <p style="width: 100%;" :data-test-id="'expand-opt-out-' + props.$index">
                                        {{props.row.optout.join(',')}}
                                    </p>
                                </div>
                            </div>
                            <div class="bu-level bu-mb-4 cly-vue-compliance__consent_history_expanded_column">
                                <div class="bu-level-left text-medium font-weight-bold" :data-test-id="'expand-device-label-' + props.$index">Device</div>
                                <div style="width: 80%;" class="bu-level-right">
                                    <p style="width: 100%;" :data-test-id="'expand-device-' + props.$index">
                                        {{props.row.d + "(" + props.row.p + " " + props.row.pv + ")"}}
                                    </p>
                                </div>
                            </div>
                            <div class="bu-level cly-vue-compliance__consent_history_expanded_column">
                                <div class="bu-level-left text-medium font-weight-bold" :data-test-id="'expand-app-version-label-' + props.$index">App version</div>
                                <div style="width: 80%;" class="bu-level-right">
                                    <p style="width: 100%;" :data-test-id="'expand-app-version-' + props.$index">
                                        {{props.row.av}}
                                    </p>
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column fixed width="250" sortable="custom" prop="device_id" label="ID">
                        <template slot-scope="scope">
                            <div :data-test-id="'datatable-consent-history-id-' + scope.$index">
                                {{scope.row.device_id}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" prop="uid" label="UID">
                        <template slot-scope="scope">
                            <div :data-test-id="'datatable-consent-history-uid-' + scope.$index">
                                {{scope.row.uid}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column sortable="custom" width="220px" label="CHANGES">
                        <template v-slot="rowScope">
                            <div>
                                <p v-if="rowScope.row.type.includes('i')" :data-test-id="'datatable-consent-history-changes-opt-in-label-' + rowScope.$index">{{i18n("consent.opt-i")}}</p>
                                <p v-if="rowScope.row.type.includes('o')" :data-test-id="'datatable-consent-history-changes-opt-out-label-' + rowScope.$index">{{i18n("consent.opt-o")}} </p>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="250" sortable="custom" label="CONSENT">
                        <template v-slot="rowScope">
                            <div>
                                <p v-if="rowScope.row.optin.length > 0" :data-test-id="'datatable-consent-history-consent-opt-in-' + rowScope.$index">{{i18n("consent.opt-i")}} for {{rowScope.row.optin.length}} feature(s)
                                </p>
                                <p v-if="rowScope.row.optout.length > 0" :data-test-id="'datatable-consent-history-consent-opt-out-' + rowScope.$index">{{i18n("consent.opt-o")}} from {{rowScope.row.optout.length}}
                                    feature(s)</p>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="230" sortable="custom" prop="ts" label="TIME">
                        <template v-slot="rowScope">
                            <div :data-test-id="'datatable-consent-history-time-' + rowScope.$index">
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

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            consentHistoryTableSource: getServerDataSource(this.$store, "countlyConsentManager", "consentHistoryResource"),
            filter0: [
                { value: 'all', label: this.i18n("common.all") },
                { value: 'sessions', label: this.i18n("compliance_hub.Sessions") },
                { value: "events", label: this.i18n('compliance_hub.Events') },
                { value: 'views', label: this.i18n('compliance_hub.Views') },
                { value: 'scrolls', label: this.i18n('compliance_hub.Scrolls') },
                { value: 'clicks', label: this.i18n('compliance_hub.Clicks') },
                { value: 'forms', label: this.i18n('compliance_hub.Forms') },
                { value: 'crashes', label: this.i18n("compliance_hub.Crashes") },
                { value: 'push', label: this.i18n('compliance_hub.Push') },
                { value: 'attribution', label: this.i18n('compliance_hub.Attribution') },
                { value: 'users', label: this.i18n('compliance_hub.Users') },
                { value: 'star-rating', label: this.i18n('compliance_hub.Star-rating') }
            ],
            filter1: [
                { value: 'all', label: this.i18n("common.all") },
                { value: 'i', label: this.i18n("consent.opt-i") },
                { value: 'o', label: this.i18n("consent.opt-o") }
            ],
        };
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyConsentManager/uid", this.$route.params.uid);
        this.$store.dispatch("countlyConsentManager/fetchConsentHistoryResource");
    },
    computed: {
        selectedfilterforConsent: {
            get: function() {
                return this.$store.getters["countlyConsentManager/consentHistoryFilter"].type;
            },
            set: function(newValue) {
                this.$store.commit("countlyConsentManager/setConsentHistoryFilter", {
                    key: 'type',
                    value: newValue,
                });
                this.initializeStoreData();
            }
        },
        selectedfilterforMetrics: {
            get: function() {
                return this.$store.getters["countlyConsentManager/consentHistoryFilter"].change;
            },
            set: function(newValue) {
                this.$store.commit("countlyConsentManager/setConsentHistoryFilter", {
                    key: 'change',
                    value: newValue,
                });
                this.initializeStoreData();
            }
        },
        consentHistoryLoading: function() {
            return this.$store.getters["countlyConsentManager/consentHistoryLoading"];
        }
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
                self.$store.dispatch("countlyConsentManager/fetchConsentHistoryResource");
            });
        },
        tableRowClickHandler: function(row) {
            if (window.getSelection().toString().length === 0) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        },
        refreshData: function() {
            this.initializeStoreData();
        }
    }
};
</script>
