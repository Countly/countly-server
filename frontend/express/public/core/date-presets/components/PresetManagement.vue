<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('management.preset')"
        >
            <cly-back-link slot="header-top" link="/" :title="i18n('management.preset.back-to-home')"></cly-back-link>
            <template v-slot:header-right>
                <el-button type="success" icon="el-icon-circle-plus" @click="createNewPreset" data-test-id="new-date-preset-button">{{i18n('management.preset.create-button')}}</el-button>
            </template>
        </cly-header>

        <cly-main>
            <cly-datatable-n
                test-id="datatable-date-presets"
                :rows="rows"
                :resizable="true"
                :force-loading="isLoading"
                :hide-top="true"
                :hide-bottom="true"
                :sortable="true"
                :default-sort="{prop: 'sort_order', order: 'ascending'}"
                :display-mode="'list'"
                @drag-start="onDragStart"
                @drag-end="reorderPresets"
            >
                <template v-slot="scope">
                    <el-table-column prop="drag-icon" width="32" class-name="drag-icon">
                        <template v-slot="rowScope">
                            <img class="drag-icon" v-if="rowScope.row.hover" :src="'images/drill/drag-icon.svg'" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="name" :label="i18n('management.preset.column.name')">
                        <template v-slot="rowScope">
                            <div class="bu-is-flex">
                                <span class="has-ellipsis bu-has-text-weight-medium" :data-test-id="'datatable-date-presets-name-' + rowScope.$index">{{ unescapeHtml(rowScope.row.name) }}</span>
                                <cly-check
                                    :data-test-id="'datatable-date-presets-star-icon-' + rowScope.$index"
                                    class="bu-pl-1"
                                    element-loading-spinner="el-icon-loading"
                                    @input="toggleFav(scope, rowScope.row)"
                                    :value="rowScope.row.fav"
                                    skin="star">
                                </cly-check>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="range_label" :label="i18n('management.preset.column.range')">
                        <template v-slot="rowScope">
                            <span class="has-ellipsis" :data-test-id="'datatable-date-presets-range-' + rowScope.$index">{{ rowScope.row.range_label }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="owner_name" :label="i18n('management.preset.column.owner')">
                        <template v-slot="rowScope">
                            <span class="has-ellipsis" :data-test-id="'datatable-date-presets-owner-' + rowScope.$index">{{ rowScope.row.owner_name }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="share_with" :formatter="sharingOption" :label="i18n('management.preset.column.visibility')">
                        <template v-slot="rowScope">
                            <span class="has-ellipsis" :data-test-id="'datatable-date-presets-visibility-' + rowScope.$index">{{ rowScope.row.share_with }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column type="options" width="90">
                        <template v-slot="rowScope">
                            <cly-more-options v-if="rowScope.row.hover" size="small" @command="handleCommand($event, rowScope.row)" :test-id="'datatable-date-presets-' + rowScope.$index">
                                <el-dropdown-item v-if="hasWritePermissions(rowScope.row)" :data-test-id="'datatable-more-button-edit-select-' + rowScope.$index" command="edit">{{ i18n('common.edit') }}</el-dropdown-item>
                                <el-dropdown-item v-if="hasWritePermissions(rowScope.row)" :data-test-id="'datatable-more-button-duplicate-select-' + rowScope.$index" command="duplicate">{{ i18n('common.duplicate') }}</el-dropdown-item>
                                <el-dropdown-item v-if="hasWritePermissions(rowScope.row)" :data-test-id="'datatable-more-button-delete-select-' + rowScope.$index" command="delete">{{ i18n('common.delete') }}</el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-main>

        <preset-drawer :controls="drawers['preset']" @refresh-presets="refresh"></preset-drawer>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyPresets from '../store/index.js';
import { sharingOptions, AUTHENTIC_GLOBAL_ADMIN } from './PresetDrawer.vue';

import PresetDrawer from './PresetDrawer.vue';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyBackLink from '../../../javascripts/components/helpers/cly-back-link.vue';
import ClyCheck from '../../../javascripts/components/input/check.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';

var CV = countlyVue;

export default {
    components: {
        PresetDrawer,
        ClyHeader,
        ClyMain,
        ClyDatatableN,
        ClyBackLink,
        ClyCheck,
        ClyMoreOptions
    },
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.hasDrawers("preset")
    ],
    data: function() {
        return {
            sharingOptions: sharingOptions
        };
    },
    computed: {
        rows: function() {
            return this.$store.getters["countlyPresets/presets"] || [];
        },
        isLoading: function() {
            return this.$store.getters["countlyPresets/isLoading"];
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch("countlyPresets/getAll");
        },
        createNewPreset: function() {
            var emptyPreset = countlyPresets.factory.getEmpty();
            emptyPreset.__action = "create";
            this.openDrawer("preset", emptyPreset);
        },
        toggleFav: function(scope, row) {
            var self = this;
            row.fav = !row.fav;
            if (row.fav) {
                row.sort_order = 0;
            }
            this.$store.dispatch("countlyPresets/update", row).then(function() {
                self.refresh();
            });
        },
        handleCommand: function(command, presetObj) {
            var preset_id = presetObj._id;
            var self = this;
            if (command === "delete") {
                CountlyHelpers.confirm(
                    CV.i18n("management.preset.delete-preset-confirm", presetObj.name || CV.i18n("management.preset.delete-preset-confirm-generic")),
                    "red",
                    function(result) {
                        if (!result) {
                            return;
                        }
                        self.$store.dispatch("countlyPresets/delete", preset_id).then(function() {
                            self.refresh();
                        });
                    },
                    [CV.i18n("common.cancel"), CV.i18n("common.delete")],
                    {title: CV.i18n("management.preset.delete-preset"), showClose: false, alignCenter: true}
                );
            }
            else if (command === "edit") {
                this.$store.dispatch("countlyPresets/getById", preset_id).then(function(preset) {
                    preset.__action = "edit";
                    self.openDrawer("preset", preset);
                });
            }
            else if (command === "duplicate") {
                this.$store.dispatch("countlyPresets/getById", preset_id).then(function(preset) {
                    preset.__action = "duplicate";
                    self.openDrawer("preset", preset);
                });
            }
        },
        sharingOption: function(preset) {
            var option = this.sharingOptions.find(function(opt) {
                return opt.value === preset.share_with;
            });

            return option ? option.name : "";
        },
        hasWritePermissions: function(preset) {
            return preset.is_owner || AUTHENTIC_GLOBAL_ADMIN || (preset.shared_email_edit && preset.shared_email_edit.length > 0) || (preset.shared_user_groups_edit && preset.shared_user_groups_edit.length > 0);
        },
        reorderPresets: function({oldIndex, newIndex}) {
            var self = this;
            var preset = this.rows[oldIndex];
            preset.sort_order = newIndex;
            this.$store.dispatch("countlyPresets/update", preset).then(function() {
                self.refresh();
            });
        },
        onDragStart: function() {
            // We don't need to do anything here
        }
    },
    created: function() {
        this.refresh();
    }
};
</script>
