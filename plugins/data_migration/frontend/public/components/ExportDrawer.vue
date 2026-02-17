<template>
<div class="data-migration__drawer">
  <cly-drawer
      toggle-transition="stdt-fade"
      ref="exportDrawer"
      @close="onClose"
      @submit="onSubmit"
      @open="onOpen"
      :hasCancelButton="true"
      :saveButtonLabel="exportDrawerSaveButtonLabel"
      :title="$props.settings.title"
      name="export-drawer"
      v-bind="$props.controls"
  >
    <template v-slot:default="drawerScope">
      <cly-form-step id="default">
          <div class="cly-vue-drawer-step__section">
            <div class="text-medium text-heading bu-mb-2">
              {{ i18n('data-migration.applications') }}
            </div>
            <validation-provider name="apps" rules="required">
              <el-select
                  class="data-migration__drawer__full-input"
                  v-model="drawerScope.editedObject.apps"
                  multiple
                  :placeholder="'Select Applications'">
                  <el-option
                    v-for="(appItem, index) in apps"
                    :key="index"
                    :value="appItem.value"
                    :label="appItem.label">
                  </el-option>
              </el-select>
            </validation-provider>
          </div>
          <div class="cly-vue-drawer-step__section">
            <div class="text-medium text-heading text-heading">
              <span class="bu-mb-2">
                {{ i18n('data-migration.export-other-path') }}
              </span>
              <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
            </div>
            <validation-provider name="target_path" rules="" v-slot="v">
              <el-input
                :placeholder="i18n('data-migration.enter-your-export-folder')"
                v-model="drawerScope.editedObject.target_path">
              </el-input>
            </validation-provider>
          </div>
          <div class="cly-vue-drawer-step__section">
              <div class="text-medium text-heading bu-mb-2">
                <span>
                  {{ i18n('data-migration.export-type') }}
                </span>
                <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
              </div>
              <div class="bu-is-flex bu-is-flex-direction-column">
                <el-radio-group v-model="drawerScope.editedObject.only_export">
                  <el-radio class="data-migration__drawer__export-radio-item bu-is-flex" :label="0" border>
                    <div class="data-migration__drawer__radio-label">
                      <span>
                        {{ i18n('data-migration.export-type-transfer-label') }}
                      </span>
                    </div>
                  </el-radio>
                  <el-radio class="data-migration__drawer__export-radio-item bu-is-flex bu-mt-3" :label="1" border>
                    <div class="data-migration__drawer__radio-label">
                      <span>
                        {{ i18n('data-migration.export-type-download-label') }}
                      </span>
                    </div>
                  </el-radio>
                  <el-radio class="data-migration__drawer__export-radio-item bu-is-flex bu-mt-3" :label="2" border>
                    <div class="data-migration__drawer__radio-label">
                      <span>
                        {{ i18n('data-migration.export-type-get-export-scripts') }}
                      </span>
                    </div>
                  </el-radio>
                </el-radio-group>
              </div>
          </div>
          <div v-if="drawerScope.editedObject.only_export === 0" class="cly-vue-drawer-step__section">
            <div class="text-medium text-heading text-heading">
              <span class="bu-mb-2">
                {{ i18n('data-migration.server-address') }}
              </span>
              <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
              <div class="text-small data-migration__description">
                {{ i18n('data-migration.server-address-description') }}
              </div>
            </div>
            <validation-provider name="server_address" rules="required" v-slot="v">
              <el-input
                :placeholder="i18n('data-migration.enter-your-server-address')"
                v-model="drawerScope.editedObject.server_address">
              </el-input>
            </validation-provider>
          </div>
          <div v-if="drawerScope.editedObject.only_export === 0" class="cly-vue-drawer-step__section">
            <div class="text-medium text-heading text-heading">
              <span class="bu-mb-2">
                {{ i18n('data-migration.server-token') }}
              </span>
              <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
              <div class="text-small data-migration__description">
                {{ i18n('data-migration.server-token-description') }}
              </div>
            </div>
            <validation-provider name="server_token" rules="required" v-slot="v">
              <el-input
                :placeholder="i18n('data-migration.enter-your-server-token')"
                v-model="drawerScope.editedObject.server_token">
              </el-input>
            </validation-provider>
          </div>
          <div class="cly-vue-drawer-step__section">
            <validation-provider name="aditional_files" v-slot="v">
              <div>
                <el-checkbox v-model="drawerScope.editedObject.aditional_files">
                  {{ i18n('data-migration.export-additional-files') }}
                </el-checkbox>
              </div>
            </validation-provider>
            <validation-provider v-if="drawerScope.editedObject.only_export === 0" class="bu-mt-2" name="redirect_traffic" v-slot="v">
              <div class="bu-mt-4">
                <el-checkbox v-model="drawerScope.editedObject.redirect_traffic">
                  {{ i18n('data-migration.redirect-traffic') }}
                </el-checkbox>
              </div>
            </validation-provider>
          </div>
      </cly-form-step>
    </template>
  </cly-drawer>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyDataMigration from '../store/index.js';

export default {
    mixins: [i18nMixin],
    props: {
        settings: Object,
        controls: Object
    },
    data: function() {
        return {
            apps: [],
            exportDrawerSaveButtonLabel: this.i18n('data-migration.export-data-button')
        };
    },
    methods: {
        onClose: function() {},
        onSubmit: function(submitted) {
            var self = this;
            var API_KEY = countlyGlobal.member.api_key;
            var APP_ID = countlyCommon.ACTIVE_APP_ID;

            var requestData = submitted;
            requestData.api_key = API_KEY;
            requestData.app_id = APP_ID;
            requestData.apps = submitted.apps.join(",");
            requestData.aditional_files = requestData.aditional_files ? 1 : 0;
            requestData.redirect_traffic = requestData.redirect_traffic ? 1 : 0;

            countlyDataMigration.saveExport(requestData, function(res) {
                if (res.result === "success") {
                    if (requestData.only_export === 2) {
                        var data = res.data;
                        var blob = new Blob([data], { type: 'application/x-sh' });
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = 'export_commands.sh';
                        document.body.appendChild(a);
                        a.click();
                        notify({
                            type: 'success',
                            message: self.i18n('data-migration.download-auto')
                        });
                    }
                    else {
                        notify({
                            type: 'success',
                            message: self.i18n('data-migration.export-started')
                        });
                    }
                }
                else {
                    notify({
                        type: 'error',
                        message: self.i18n(res.data.xhr.responseJSON.result)
                    });
                }
            });
        },
        onOpen: function() {}
    },
    created: function() {
        var apps = Object.keys(countlyGlobal.apps);
        for (var i = 0; i < apps.length; i++) {
            this.apps.push({
                label: countlyGlobal.apps[apps[i]].name,
                value: countlyGlobal.apps[apps[i]]._id
            });
        }

        this.apps.sort(function(a, b) {
            const aLabel = a?.label || '';
            const bLabel = b?.label || '';
            const locale = countlyCommon.BROWSER_LANG || 'en';

            if (aLabel && bLabel) {
                return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
            }

            if (!aLabel && bLabel) {
                return 1;
            }

            if (aLabel && !bLabel) {
                return -1;
            }

            return 0;
        });
    }
};
</script>
