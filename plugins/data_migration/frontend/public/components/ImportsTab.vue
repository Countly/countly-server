<template>
<div>
  <cly-datatable-n :force-loading="isLoading" class="bu-mx-5" :rows="list" :persist-key="importsTablePersistKey">
      <template v-slot="scope">
          <el-table-column sortable="true" prop="app_list" :label="i18n('data-migration.applications')">
              <template v-slot="rowScope">
                <span class="text-medium">
                  <div>
                    {{ rowScope.row.app_list }}
                  </div>
                  <cly-status-tag
                    :text="rowScope.row.status_text.substr(0, 1).toUpperCase() + rowScope.row.status_text.substr(1, rowScope.row.status_text.length - 1)"
                    :color="rowScope.row.status_text === 'finished' ? 'green' : rowScope.row.status_text === 'progress' ? 'blue' : 'red'">
                  </cly-status-tag>
                </span>
              </template>
          </el-table-column>
          <el-table-column sortable="true" prop="status_text" :label="i18n('data-migration.table.step')">
            <template v-slot="rowScope">
              <div class="bu-py-6">
                <span class="text-medium">
                  {{ rowScope.row.status_text }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column sortable="true" prop="last_update" :label="i18n('data-migration.table.last-update')">
            <template v-slot="rowScope">
                <span class="text-medium">
                  {{ rowScope.row.last_update }}
                </span>
            </template>
          </el-table-column>
          <el-table-column width="100">
            <template v-slot="rowScope">
              <cly-more-options v-if="rowScope.row.hover" size="small" @command="handleCommand($event, scope, rowScope.row)">
                <el-dropdown-item command="download-log">{{i18n('data-migration.download-log')}}</el-dropdown-item>
                <el-dropdown-item v-if="canUserDelete && rowScope.row.status !== 'progress'" command="delete-export">{{i18n('data-migration.delete-export')}}</el-dropdown-item>
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
            importsTablePersistKey: 'imports_table_' + countlyCommon.ACTIVE_APP_ID,
            isLoading: false
        };
    },
    methods: {
        refresh: function(force) {
            this.loadImports(force);
        },
        loadImports: function(forceLoading) {
            if (forceLoading) {
                this.isLoading = true;
            }
            var self = this;
            countlyDataMigration.loadImportList()
                .then(function(res) {
                    if (typeof res.result === "object") {
                        var finalArr = [];
                        for (var key in res.result) {
                            var element = res.result[key];
                            finalArr.push(element);
                        }
                        self.list = finalArr;
                    }
                    else if (typeof res.result === "string") {
                        self.list = [];
                    }
                    self.isLoading = false;
                });
        },
        handleCommand: function(command, scope, row) {
            switch (command) {
            case 'download-log':
                window.location.href = "/data-migration/download?logfile=" + row.log;
                break;
            case 'delete-export':
                var self = this;
                CountlyConfirm(this.i18n('data-migration.delete-export-confirm'), "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyDataMigration.deleteImport(row.key, function(res) {
                        if (res.result === 'success') {
                            self.loadImports();
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
            }
        }
    },
    created: function() {
        this.loadImports(true);
    }
};
</script>
