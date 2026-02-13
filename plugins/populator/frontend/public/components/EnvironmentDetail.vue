<template>
<div v-bind:class="[componentId]">
    <cly-header :isHeaderTop=true :title="templateInformations.templateName">
        <template v-slot:header-top>
            <cly-back-link :title="i18n('populator.back-to-template')"></cly-back-link>
        </template>
        <template v-slot:header-left>
            <div class="bu-is-flex bu-is-flex-direction-column">
                <div class="bu-is-flex bu-is-align-items-center">
                    <h3 class="crashes-crashgroup-header__name" v-html="templateInformations.templateName"></h3>
                </div>
                <div class="bu-mt-4 bu-is-flex">
                    <div class="color-cool-gray-50 text-medium">
                        <span>
                            <i class="far fa-clock"></i>
                            {{i18n('populator.generated-on')}}
                        </span>
                        <span>
                            {{templateInformations.generatedOn}}
                        </span>
                    </div>
                </div>
            </div>
        </template>
        <template v-slot:header-right>
            <div v-if="hasDeleteRight" class="bu-level-item">
                <el-button type="success" @click="deleteEnvironment"
                    size="small">{{i18n('populator.delete-environment')}}
                </el-button>
            </div>
        </template>
    </cly-header>
    <cly-main>
        <cly-section>
            <cly-confirm-dialog @cancel="closeConfirmDialog" @confirm="submitConfirmDialog" :visible.sync="dialog.showDialog" dialogType="success" :saveButtonLabel="dialog.saveButtonLabel" :cancelButtonLabel="dialog.cancelButtonLabel" :title="dialog.title" :show-close="false">
                <template slot-scope="scope">
                    <div v-html="dialog.text"></div>
                </template>
            </cly-confirm-dialog>
            <cly-datatable-n ref="populatorEnvTable" id="populator-environment-table" :data-source="remoteTableDataSource" :force-loading="isLoading" searchPlaceholder="Search in User Name" :hasExport="false">
                <template v-slot:header-left>
                    <el-select v-model="environmentId" @change="onEnvironmentChange()">
                        <el-option v-for="item in filterByEnvironmentOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
                    </el-select>
                </template>
                <template v-slot="scope">
                    <el-table-column fixed="left" :width="calculateWidth(30)" prop="userName" :label="i18n('populator.user-name')">
                        <template v-slot="rowScope">
                            <div>
                                {{rowScope.row.userName}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column :width="calculateWidth(20)"  prop="platform" :label="i18n('populator.platform')">
                        <template v-slot="rowScope">
                            <div>
                                {{rowScope.row.platform}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column :width="calculateWidth(20)" prop="device" :label="i18n('populator.device')">
                        <template v-slot="rowScope">
                            <div>
                                {{rowScope.row.device}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="!customProperties.length" :width="calculateWidth(30)">
                    </el-table-column>
                    <el-table-column
                        v-else
                        :key="item"
                        v-for="item in customProperties"
                        :formatter="formatTableCell(item)"
                        :label="item"
                        :width="calculateWidth(15)">
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-section>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { ServerDataTable, getServerDataSource, getLocalStore } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { validateDelete } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import countlyPopulator from '../store/index.js';
import moment from 'moment';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyBackLink from '../../../../../frontend/express/public/javascripts/components/helpers/cly-back-link.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyConfirmDialog from '../../../../../frontend/express/public/javascripts/components/dialog/cly-confirm-dialog.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

var FEATURE_NAME = 'populator';

export default {
    components: {
        ClyHeader,
        ClyBackLink,
        ClyMain,
        ClySection,
        ClyConfirmDialog,
        ClyDatatableN
    },
    mixins: [i18nMixin],
    data: function() {
        var self = this;
        var tableStore = getLocalStore(ServerDataTable("environmentUsersTable", {
            columns: ['userName', "platform", "device"],
            onRequest: function() {
                self.isLoading = true;
                if (self.environmentId) {
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o/populator/environment/get",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            template_id: self.$route.params.id,
                            environment_id: self.environmentId
                        }
                    };
                }
            },
            onReady: function(context, rows) {
                self.isLoading = false;
                rows.forEach(item => {
                    if (item.custom) {
                        const customKeys = Object.keys(item.custom);
                        customKeys.forEach(key => {
                            if (!self.customProperties.includes(key)) {
                                self.customProperties.push(key);
                            }
                        });
                    }
                });
                return rows;
            }
        }));
        return {
            environmentInformations: [],
            templateInformations: {},
            templateId: this.$route.params.id,
            customProperties: [],
            isLoading: false,
            environmentId: '',
            filterByEnvironmentOptions: [],
            dialog: {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''},
            tableStore,
            remoteTableDataSource: getServerDataSource(tableStore, "environmentUsersTable")
        };
    },
    computed: {
        hasDeleteRight: function() {
            return validateDelete(FEATURE_NAME);
        },
    },
    methods: {
        refresh: function(force) {
            if (this.isLoading || force) {
                this.isLoading = false;
                this.tableStore.dispatch("fetchEnvironmentUsersTable");
            }
        },
        deleteEnvironment: function() {
            this.openDialog();
        },
        closeConfirmDialog: function() {
            this.dialog.showDialog = false;
        },
        submitConfirmDialog: function() {
            var self = this;
            countlyPopulator.removeEnvironment(this.templateId, this.environmentId, function(res) {
                if (res.result) {
                    notify({type: "ok", title: i18n("common.success"), message: i18n('populator-success-delete-environment'), sticky: true, clearAll: true});
                    self.dialog.showDialog = false;
                    app.navigate("/manage/populate", true);
                }
                else {
                    notify({type: "error", title: i18n("common.error"), message: i18n('populator.failed-to-delete-environment', self.environmentId), sticky: false, clearAll: true});
                }
            });
        },
        openDialog: function() {
            this.dialog = {
                type: "check",
                showDialog: true,
                saveButtonLabel: i18n('common.yes'),
                cancelButtonLabel: i18n('common.cancel'),
                title: i18n('populator.environment-delete-warning-title'),
                text: i18n('populator.environment-delete-warning-description', this.filterByEnvironmentOptions.filter(x => x.value === this.environmentId)[0].label)
            };
        },
        calculateWidth: function(percentage) {
            if (document.querySelector('#populator-environment-table')) {
                const tableWidth = document.querySelector('#populator-environment-table').offsetWidth;
                return (tableWidth * percentage) / 100;
            }
            return 300;
        },
        formatTableCell: function(item) {
            return function(row) {
                return row.custom[item] === null || typeof row.custom[item] === 'undefined' ? '-' : row.custom[item].toString();
            };
        },
        onEnvironmentChange: function() {
            this.refresh(true);
        }
    },
    created: function() {
        var self = this;
        this.templateId = this.$route.params.id;
        countlyPopulator.getEnvironments(function(envs) {
            self.filterByEnvironmentOptions = envs.filter(x => x.templateId === self.templateId)
                .map(x => ({value: x._id, label: countlyCommon.unescapeHtml(x.name)}));
            self.environmentId = self.filterByEnvironmentOptions[0].value;
            self.refresh(true);
        });
    },
    beforeCreate: function() {
        var self = this;
        countlyPopulator.getTemplate(this.$route.params.id, function(template) {
            self.templateInformations.templateName = template.name,
            self.templateInformations.generatedOn = moment(template.generatedOn).format("DD MMM YYYY");
        });
    }
};
</script>
