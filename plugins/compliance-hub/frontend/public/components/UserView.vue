<template>
    <cly-main>
        <cly-section class="bu-pt-4 cly-vue-complaince__hub_style_none cly-vue-complaince__hub_style_widthzero">
            <cly-datatable-n test-id="datatable-compliance-hub-users" :data-source="userTableDataSource" :default-sort="{prop: 'lac', order: 'descending'}">
                <template v-slot="scope">
                    <el-table-column fixed="left" width="365" sortable="custom" prop="did" label="ID">
                        <template slot-scope="scope">
                            <div :data-test-id="'datatable-users-id-' + scope.$index">
                                {{scope.row.did}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="180" sortable="custom" prop="d" label="DEVICE">
                        <template v-slot="rowScope">
                            <div v-if="rowScope.row.d" :data-test-id="'datatable-users-device-' + rowScope.$index">
                                {{rowScope.row.d}}
                            </div>
                            <div v-if="!rowScope.row.d" :data-test-id="'datatable-users-device-' + rowScope.$index">
                                -
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="150" sortable prop="av" label="APP VERSION">
                        <template v-slot="rowScope">
                            <div v-if="rowScope.row.av" :data-test-id="'datatable-users-app-version-' + rowScope.$index">
                                {{rowScope.row.av}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column width="400" prop="consent" label="consent">
                        <template v-slot="rowScope">
                            <div v-if="rowScope.row.consent">
                                <p class="color-primary-green text-smaller text-uppercase bu-mb-1" style="margin-top: 0px; font-weight: 700" :data-test-id="'datatable-users-consent-opt-in-label-' + rowScope.$index">{{i18n("consent.opt-i")}}</p>
                                <span class="text-small bu-mb-4" v-html="rowScope.row.optin.join(',')" :data-test-id="'datatable-users-consent-opt-in-list-' + rowScope.$index"></span>
                                <p class="color-red-100 text-smaller text-uppercase bu-mb-1" style="font-weight: 700;" :data-test-id="'datatable-users-consent-opt-out-label-' + rowScope.$index">{{i18n("consent.opt-o")}}</p>
                                <span class="text-small" v-html="rowScope.row.optout.join(',')" :data-test-id="'datatable-users-consent-opt-out-list-' + rowScope.$index"></span>
                            </div>
                            <div v-if="!rowScope.row.consent" :data-test-id="'datatable-users-consent-' + rowScope.$index">
                                -
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column sortable="custom" prop="lac" label="TIME">
                        <template v-slot="rowScope">
                            <div :data-test-id="'datatable-users-time-' + rowScope.$index">
                                {{rowScope.row.time}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column type="options">
                        <template v-slot="rowScope">
                            <cly-more-options test-id="compliance-hub-users" v-if="rowScope.row.hover" size="small" @command="handleCommand($event, rowScope.row.uid)">
                                <el-dropdown-item v-if="canUserRead" :command="{url: '#/manage/compliance/history/' + rowScope.row.uid}" :data-test-id="'datatable-more-button-go-to-consent-history-select-' + rowScope.$index"> {{i18n("consent.go-history")}} </el-dropdown-item>
                                <el-dropdown-item v-if="!rowScope.row.appUserExport && canUserRead" command="exportUserData" :data-test-id="'datatable-more-button-export-user-data-select-' + rowScope.$index">{{i18n("app-users.export-userdata")}}</el-dropdown-item>
                                <el-dropdown-item v-if="rowScope.row.appUserExport && canUserRead" command="downloadExportedData" :data-test-id="'datatable-more-button-download-export-select-' + rowScope.$index">{{i18n("app-users.download-export")}}</el-dropdown-item>
                                <el-dropdown-item v-if="rowScope.row.appUserExport && canUserDelete" command="deleteExport" :data-test-id="'datatable-more-button-delete-export-' + rowScope.$index">{{i18n("app-users.delete-export")}}</el-dropdown-item>
                                <el-dropdown-item v-if="canUserDelete" command="deleteUserData" :data-test-id="'datatable-more-button-delete-user-data-' + rowScope.$index">{{i18n("app-users.delete-userdata")}}</el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-section>
    </cly-main>
</template>

<script>
import { authMixin, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, alert as CountlyAlert, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyConsentManager from '../store/index.js';

var FEATURE_NAME = "compliance_hub";

export default {
    mixins: [authMixin(FEATURE_NAME), i18nMixin],
    data: function() {
        return {
            userTableDataSource: getServerDataSource(this.$store, "countlyConsentManager", "userDataResource"),
        };
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyConsentManager/fetchUserDataResource");
    },
    methods: {
        deleteUserData: function(uid) {
            var self = this;
            CountlyConfirm(this.i18n("app-users.delete-userdata-confirm"), "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                countlyConsentManager.service.deleteUserdata(JSON.stringify({ uid: uid }), function(error) {
                    if (error) {
                        CountlyAlert(error, "red");
                    }
                    else {
                        notify({ type: "success", title: self.i18n("common.success"), message: self.i18n("app-users.userdata-deleted") });
                        self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                    }
                });
            }, [self.i18n("app-users.no-dont-purge"), self.i18n("app-users.yes-purge-data")], { title: self.i18n("app-users.purge-confirm-title"), image: "purge-user-data" });
        },
        exportUserData: function(uid) {
            var self = this;
            countlyConsentManager.service.exportUser(JSON.stringify({ uid: uid }), function(error, export_id, task_id) {
                self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                if (error) {
                    CountlyAlert(error, "red");
                }
                else if (export_id) {
                    notify({
                        type: "ok",
                        title: self.i18n("common.success"),
                        message: self.i18n("app-users.export-finished"),
                        info: self.i18n("consent.export-finished-click"),
                        sticky: false,
                        clearAll: true,
                        onClick: function() {
                            var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/" + export_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                            win.focus();
                        }
                    });
                }
                else if (task_id) {
                    notify({ type: "ok", title: self.i18n("common.success"), message: self.i18n("app-users.export-started"), sticky: false, clearAll: false });
                }
                else {
                    CountlyAlert(self.i18n("app-users.export-failed"), "red");
                }
            });
        },
        deleteExport: function(uid) {
            var self = this;
            countlyConsentManager.service.deleteExport(uid, function(error) {
                self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                if (error) {
                    CountlyAlert(error, "red");
                }
                else {
                    notify({ type: "ok", title: self.i18n("common.success"), message: self.i18n("app-users.export-deleted"), sticky: false, clearAll: true });
                }
            });
        },
        downloadExportedData: function(uid) {
            var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + uid + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
            win.focus();
        },
        handleCommand: function(command, uid) {
            if (command === "deleteUserData") {
                this.deleteUserData(uid);
            }
            else if (command === "exportUserData") {
                this.exportUserData(uid);
            }
            else if (command === "deleteExport") {
                this.deleteExport(uid);
            }
            else if (command === "downloadExportedData") {
                this.downloadExportedData(uid);
            }
        }
    }
};
</script>
