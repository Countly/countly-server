<template>
<div>
  <cly-datatable-n :force-loading="isLoading" class="bu-mx-5" :rows="list" :persist-key="exportsTablePersistKey">
      <template v-slot="scope">
          <el-table-column sortable="true" prop="app_names" :label="i18n('data-migration.applications')">
              <template v-slot="rowScope">
                  <span class="text-medium">
                    <div>
                      {{ rowScope.row.app_names.join(",") }}
                    </div>
                    <cly-status-tag
                      :text="rowScope.row.status.substr(0, 1).toUpperCase() + rowScope.row.status.substr(1, rowScope.row.status.length - 1)"
                      :color="rowScope.row.status === 'finished' ? 'green' : rowScope.row.status === 'progress' ? 'blue' : 'red'">
                    </cly-status-tag>
                  </span>
              </template>
          </el-table-column>
          <el-table-column sortable="true" prop="status" :label="i18n('data-migration.table.status')">
            <template v-slot="rowScope">
              <div class="bu-py-6">
                <span class="text-medium">
                  {{ rowScope.row.status === 'failed' ? rowScope.row.reason : rowScope.row.step }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column sortable="true" prop="created" column-key="time" :label="i18n('data-migration.table.last-update')">
            <template v-slot="rowScope">
                <span class="text-medium">
                  {{ rowScope.row.time }}
                </span>
            </template>
          </el-table-column>
          <el-table-column width="100">
            <template v-slot="rowScope">
              <cly-more-options v-if="rowScope.row.hover" size="small" @command="handleCommand($event, scope, rowScope.row)">
                <el-dropdown-item v-if="isGlobalAdmin" command="download-log">{{i18n('data-migration.download-log')}}</el-dropdown-item>
                <el-dropdown-item v-if="isGlobalAdmin" command="download-export">{{i18n('data-migration.download-export')}}</el-dropdown-item>
                <el-dropdown-item v-if="canUserCreate && !rowScope.row.only_export" command="resend">{{i18n('data-migration.resend-export')}}</el-dropdown-item>
                <el-dropdown-item v-if="canUserDelete && rowScope.row.status !== 'progress'" command="delete-export">{{i18n('data-migration.delete-export')}}</el-dropdown-item>
                <el-dropdown-item v-if="canUserUpdate && rowScope.row.status === 'progress'" command="stop-export">{{i18n('data-migration.stop-export')}}</el-dropdown-item>
              </cly-more-options>
            </template>
          </el-table-column>
      </template>
  </cly-datatable-n>
</div>
</template>

<script>
import { i18nMixin, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyDataMigration from '../store/index.js';

var FEATURE_NAME = 'data_migration';

export default {
    mixins: [
        i18nMixin,
        authMixin(FEATURE_NAME)
    ],
    data: function() {
        return {
            list: [],
            exportsTablePersistKey: 'exports_table_' + countlyCommon.ACTIVE_APP_ID,
            isLoading: false,
            isGlobalAdmin: countlyGlobal.member.global_admin
        };
    },
    methods: {
        refresh: function(force) {
            this.loadExports(force);
        },
        loadExports: function(forceLoading) {
            var self = this;
            if (forceLoading) {
                this.isLoading = true;
            }
            countlyDataMigration.loadExportList()
                .then(function(res) {
                    if (typeof res.result === "object") {
                        self.list = res.result;
                    }
                    else if (typeof res.result === "string") {
                        self.list = [];
                    }
                    self.isLoading = false;
                });
        },
        handleCommand: function(command, scope, row) {
            var self = this;
            switch (command) {
            case 'download-log':
                window.location.href = "/data-migration/download?logfile=" + row.log;
                break;
            case 'download-export':
                window.location.href = "/data-migration/download?id=" + row._id;
                break;
            case 'resend':
                countlyDataMigration.sendExport(row._id, row.server_token, row.server_address, row.redirect_traffic, function(res) {
                    if (res.result === 'success') {
                        notify({
                            type: 'success',
                            message: self.i18n('data-migration.export-started')
                        });
                    }
                    else {
                        notify({
                            type: 'error',
                            message: self.i18n(res.data.xhr.responseJSON.result)
                        });
                    }
                });
                break;
            case 'delete-export':
                CountlyConfirm(this.i18n('data-migration.delete-export-confirm'), "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyDataMigration.deleteExport(row._id, function(res) {
                        if (res.result === 'success') {
                            self.loadExports();
                            notify({
                                type: 'success',
                                message: self.i18n('data-migration.export-deleted')
                            });
                        }
                        else {
                            notify({
                                type: 'error',
                                message: self.i18n(res.data.xhr.responseJSON.result)
                            });
                        }
                    });
                }, [], { title: this.i18n('management-users.warning'), image: 'delete-exports' });
                break;
            case 'stop-export':
                countlyDataMigration.stopExport(row._id, function(res) {
                    if (res.result === 'success') {
                        self.loadExports();
                        notify({
                            type: 'success',
                            message: self.i18n('data-migration.export-stopped')
                        });
                    }
                    else {
                        notify({
                            type: 'error',
                            message: self.i18n(res.data.xhr.responseJSON.result)
                        });
                    }
                });
                break;
            }
        }
    },
    created: function() {
        this.loadExports(true);
    }
};
</script>
