<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('plugins.title')"
        >
            <template v-slot:header-right>
                <component v-if="value.component" v-bind:is="value.component" :key="id" v-for="(value, id) in components" @update-row="updateRow($event)"></component>
            </template>
        </cly-header>
        <cly-main>
            <cly-section data-test-id="table-plugins">
                <cly-datatable-n test-id="datatable-features" :force-loading="isLoading" :rows="pluginsData" :tracked-fields="localTableTrackedFields" :default-sort="{prop: 'name', order: 'ascending'}" :row-class-name="tableRowClassName">
                    <template v-slot="scope">
                        <el-table-column type="switch" fixed="left" width="70" prop="enabled">
                            <template v-slot="rowScope">
                                <el-switch :value="rowScope.row.enabled"
                                    @input="onToggle(scope, rowScope.row)" :test-id="'datatable-features-toggle-' + rowScope.$index">
                                </el-switch>
                            </template>
                        </el-table-column>
                        <el-table-column sortable prop="name" column-key="name" :label="i18n('plugins.name')" width="200">
                            <template slot-scope="rowScope">
                                <a :href="rowScope.row.homepage" target="_blank" :data-test-id="'datatable-features-feature-name-' + rowScope.$index">{{ rowScope.row.name }}</a>
                            </template>
                        </el-table-column>
                        <el-table-column prop="desc" column-key="description" :label="i18n('plugins.description')">
                            <template v-slot="rowScope">
                                <div style="white-space: normal;" v-html="rowScope.row.description" :data-test-id="'datatable-features-description-' + rowScope.$index">
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="deps" :label="i18n('plugins.dependents')" width="200">
                            <template v-slot="scope">
                                <div :data-test-id="'datatable-deps-' + scope.$index">
                                  {{ scope.row.deps }}
                                </div>
                            </template>
                        </el-table-column>
                    </template>
                    <template v-slot:header-left>
                        <el-radio-group v-model="filterValue" @change="filter" plain size="small">
                            <el-radio-button test-id="all-features-radio-button" label="all">{{i18n('plugins.all')}}</el-radio-button>
                            <el-radio-button test-id="enabled-features-radio-button" label="enabled">{{i18n('plugins.enabled')}}</el-radio-button>
                            <el-radio-button test-id="disabled-features-radio-button" label="disabled">{{i18n('plugins.disabled')}}</el-radio-button>
                        </el-radio-group>
                    </template>
                    <template v-slot:bottomline="scope">
                        <cly-diff-helper v-if="!loading" :diff="scope.diff" @discard="scope.unpatch()" @save="updateStatus(scope)" :isModal="true">
                            <template v-slot:main>
                                <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                    <span class="selected-count-blue bu-pl-1 text-medium">
                                        <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{scope.diff.length}}</span>
                                        <span v-if="scope.diff.length>1" class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made") }}</span>
                                        <span v-else class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made-single") }}</span>
                                        <span v-if="scope.diff.length>1" class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep") }}</span>
                                        <span v-else class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep-single") }}</span>
                                    </span>
                                    <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                    <el-button skin="red" class="bu-mr-2" size="small" type="default" @click="updateStatus(scope)">
                                        <i class="cly-io-16 cly-io cly-io-save-disc" style="font-size: larger;"></i>
                                        <span class="bu-ml-1">
                                            {{ i18n('dashboards.save-changes') }}
                                        </span>
                                    </el-button>
                                    <el-button class="x-button" @click="scope.unpatch()">
                                        <i class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                                    </el-button>
                                </div>
                            </template>
                        </cly-diff-helper>
                    </template>
                </cly-datatable-n>
            </cly-section>
            <cly-confirm-dialog @cancel="closeConfirmDialog" @confirm="submitConfirmDialog" :before-close="closeConfirmDialog" ref="deleteConfirmDialog" :visible.sync="dialog.showDialog" dialogType="danger" :saveButtonLabel="dialog.saveButtonLabel" :cancelButtonLabel="dialog.cancelButtonLabel" :title="dialog.title" >
                <template slot-scope="scope">
                    <div v-html="dialog.text"></div>
                </template>
            </cly-confirm-dialog>
        </cly-main>
    </div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import * as countlyPlugins from '../store/index.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import jQuery from 'jquery';
import _ from 'underscore';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            scope: {},
            highlightedRows: {},
            curRow: {},
            curDependents: [],
            components: {},
            defaultSort: {prop: 1, order: "asc"},
            loading: false,
            tryCount: 0,
            pluginsData: [],
            localTableTrackedFields: ['enabled'],
            filterValue: "all",
            changes: {},
            dialog: {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""},
            isLoading: true,
        };
    },
    beforeCreate: function() {
        var self = this;
        return jQuery.when(countlyPlugins.initialize()).then(
            function() {
                try {
                    self.pluginsData = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                }
                catch (ex) {
                    self.pluginsData = [];
                }
                for (var i = 0; i < self.pluginsData.length; i++) {
                    self.formatRow(self.pluginsData[i]);
                }
                self.isLoading = false;
            }
        );
    },
    mounted: function() {
        this.loadComponents();
    },
    methods: {
        refresh: function() {
            var self = this;
            return jQuery.when(countlyPlugins.initialize()).then(
                function() {
                    try {
                        var plugins = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                        self.pluginsData = plugins.filter(function(row) {
                            self.formatRow(row);
                            if (self.filterValue === "enabled") {
                                return row.enabled;
                            }
                            else if (self.filterValue === "disabled") {
                                return !row.enabled;
                            }
                            return true;
                        });
                    }
                    catch (ex) {
                        self.pluginsData = [];
                    }
                }
            );
        },
        updateRow: function(code) {
            this.highlightedRows[code] = true;
            this.refresh();
        },
        loadComponents: function() {
            var cc = dataMixin({
                'pluginComponents': '/plugins/header'
            });
            cc = cc.data();
            var allComponents = cc.pluginComponents;
            for (var i = 0; i < allComponents.length; i++) {
                if (allComponents[i]._id && allComponents[i].component) {
                    this.components[allComponents[i]._id] = allComponents[i];
                }
            }
            this.components = Object.assign({}, this.components);
        },
        tableRowClassName: function(ob) {
            if (this.highlightedRows[ob.row.code]) {
                return "plugin-highlighted-row";
            }
        },
        formatRow: function(row) {
            row._id = row.code;
            row.name = jQuery.i18n.map[row.code + ".plugin-title"] || jQuery.i18n.map[row.code + ".title"] || row.title;
            row.desc = jQuery.i18n.map[row.code + ".plugin-description"] || jQuery.i18n.map[row.code + ".description"] || row.description;
            row.deps = Object.keys(row.dependents).map(function(item) {
                return countlyPlugins.getTitle(item);
            }).join(", ");
        },
        updateStatus: function(scope) {
            this.scope = scope;
            var diff = scope.diff;
            this.changes = {};
            var self = this;
            diff.forEach(function(item) {
                self.changes[item.key] = item.newValue;
            });
            this.dialog = {
                type: "save",
                showDialog: true,
                saveButtonLabel: i18n('plugins.yes-i-want-to-apply-changes'),
                cancelButtonLabel: i18n('common.no-dont-continue'),
                title: i18n('plugins-apply-changes-to-plugins'),
                text: i18n('plugins.confirm')
            };
        },
        checkProcess: function() {
            this.tryCount++;
            var self = this;
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/plugins-check?app_id=" + countlyCommon.ACTIVE_APP_ID,
                data: { t: this.tryCount },
                success: function(state) {
                    if (state.result === "completed") {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.success"], jQuery.i18n.map["plugins.applying"], jQuery.i18n.map["plugins.finish"], 3000, false, 'green', true);
                    }
                    else if (state.result === "failed") {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.errors"], jQuery.i18n.map["plugins.errors-msg"], '', 3000, false, 'warning', true);
                    }
                    else {
                        setTimeout(self.checkProcess, 10000);
                    }
                },
                error: function() {
                    setTimeout(self.checkProcess, 10000);
                }
            });
        },
        togglePlugin: function(plugins) {
            this.loading = true;
            var self = this;
            this.$loading({
                lock: true,
                background: 'rgba(0, 0, 0, 0.7)'
            });

            countlyPlugins.toggle(plugins, function(res) {
                if (res.result === "started") {
                    self.showPluginProcessMessage(jQuery.i18n.map["plugins.success"], jQuery.i18n.map["plugins.applying"], jQuery.i18n.map["plugins.finish"], 3000, false, 'green', true);
                }
                else {
                    self.showPluginProcessMessage(jQuery.i18n.map["plugins.error"], res, jQuery.i18n.map["plugins.retry"], 5000, false, 'error', true);
                }
            });
        },
        showPluginProcessMessage: function(title, message, info, delay, sticky, type, reload) {
            notify({clearAll: true, type: type, title: title, message: message, info: info, delay: delay, sticky: sticky});
            if (reload) {
                setTimeout(function() {
                    window.location.reload(true);
                }, 5000);
            }
        },
        submitConfirmDialog: function() {
            if (this.dialog.type === "save") {
                var msg = { title: jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info: jQuery.i18n.map["plugins.hold-on"], sticky: true };
                notify(msg);
                this.togglePlugin(this.changes);
            }
            else if (this.dialog.type === "check") {
                for (var i = 0; i < this.pluginsData.length; i++) {
                    if (this.curDependents.indexOf(this.pluginsData[i].code) !== -1) {
                        this.scope.patch(this.pluginsData[i], {enabled: !this.curRow.enabled});
                    }
                }
            }
            this.dialog = {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""};
        },
        closeConfirmDialog: function() {
            if (this.dialog.type === "check") {
                this.scope.unpatch(this.curRow);
            }
            this.dialog = {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""};
        },
        filter: function(type) {
            this.filterValue = type;
            try {
                var self = this;
                var plugins = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                this.pluginsData = plugins.filter(function(row) {
                    self.formatRow(row);
                    if (type === "enabled") {
                        return row.enabled;
                    }
                    else if (type === "disabled") {
                        return !row.enabled;
                    }
                    return true;
                });
            }
            catch (ex) {
                this.pluginsData = [];
            }
        },
        onToggle: function(scope, row) {
            this.scope = scope;
            this.curRow = row;
            scope.patch(row, {enabled: !row.enabled});
            var plugin = row.code;
            var plugins = [];
            var changes = {};
            var i;
            for (i = 0; i < scope.diff.length; i++) {
                changes[scope.diff[i].key] = scope.diff[i].newValue;
            }
            for (i = 0; i < this.pluginsData.length; i++) {
                if (changes[this.pluginsData[i].code]) {
                    plugins.push(this.pluginsData[i].code);
                }
                else if (typeof changes[this.pluginsData[i].code] === "undefined" && this.pluginsData[i].enabled) {
                    plugins.push(this.pluginsData[i].code);
                }
            }
            if (!row.enabled) {
                plugins.push(row.code);
            }

            var enabledDescendants = _.intersection(countlyPlugins.getRelativePlugins(plugin, "down"), plugins),
                disabledAncestors = _.difference(countlyPlugins.getRelativePlugins(plugin, "up"), plugins, ["___CLY_ROOT___"]);

            if (row.enabled && enabledDescendants.length > 0) {
                this.curDependents = enabledDescendants;
                this.dialog = {
                    type: "check",
                    showDialog: true,
                    saveButtonLabel: i18n('plugins.yes-i-want-to-continue'),
                    cancelButtonLabel: i18n('common.no-dont-continue'),
                    title: i18n('plugins.indirect-status-change'),
                    text: i18n("plugins.disable-descendants", countlyPlugins.getTitle(plugin), enabledDescendants.map(function(item) {
                        return countlyPlugins.getTitle(item);
                    }).join(", "))
                };
            }
            else if (!row.enabled && disabledAncestors.length > 0) {
                this.curDependents = disabledAncestors;
                this.dialog = {
                    type: "check",
                    showDialog: true,
                    saveButtonLabel: i18n('plugins.yes-i-want-to-continue'),
                    cancelButtonLabel: i18n('common.no-dont-continue'),
                    title: i18n('plugins.indirect-status-change'),
                    text: i18n("plugins.enable-ancestors", countlyPlugins.getTitle(plugin), disabledAncestors.map(function(item) {
                        return countlyPlugins.getTitle(item);
                    }).join(", "))
                };
            }
        }
    }
};
</script>
