<template>
    <div>
        <cly-main>
            <cly-datatable-n
            ref="eventGroupsTable"
            test-id="datatable-event-groups"
            :rows="eventGroups"
            :indent=0
            :tracked-fields="trackedFields"
            :force-loading="isLoading"
            @select-all="handleAllChange"
            @select="handleCurrentChange"
            :persist-key="eventsGroupTablePersistKey">
            <template v-slot:header-left>
                <el-select v-model="selectedFilter" test-id="event-group">
                    <el-option
                        :key="item.value"
                        :value="item.value"
                        :label="item.label"
                        v-for="item in eventGroupFilters">
                    </el-option>
                </el-select>
            </template>
                <el-table-column v-if="canUserUpdate || canUserDelete" fixed="left" type="selection" :reserve-selection="true" width="55">
                </el-table-column>

                <el-table-column fixed="left" sortable="custom" prop="name" :label="i18n('data-manager.event-group-name')" min-width="330px">
                    <template v-slot="rowScope">
                        <a v-bind:href="'#/manage/data-manager/events/event-groups/' + rowScope.row._id" @click="onRowClick(rowScope.row)" class="cly-vue-data-manager__clickable bu-is-clickable color-dark-blue-100">
                            {{unescapeHtml(rowScope.row.name)}}
                        </a>
                        <div class="text-small color-cool-gray-50" v-if="rowScope.row.source_events">{{rowScope.row.source_events.length || 0}} Events</div>
                        <span v-if="rowScope.row.status === false" class="cly-vue-data-manager__hidden-icon"><i class="ion-eye-disabled"></i></span>
                        <span v-else class="cly-vue-data-manager__hidden-icon"><i class="ion-eye"></i></span>
                    </template>
                </el-table-column>

                <el-table-column sortable="custom"  prop="description" :label="i18n('data-manager.event-group-description')" min-width="330px">
                    <template v-slot="rowScope">
                        <div>{{unescapeHtml(rowScope.row.description || i18n('data-manager.empty-placeholder'))}}</div>
                    </template>
                </el-table-column>

                <el-table-column type="options" align="center">
                    <template v-slot="rowScope">
                        <cly-more-options v-if="(canUserUpdate || canUserDelete) && rowScope.row.hover" size="small" @command="handleCommand($event, rowScope.row)">
                            <el-dropdown-item v-if="canUserUpdate" command="edit">{{i18n('common.edit')}}</el-dropdown-item>
                            <el-dropdown-item v-if="canUserDelete" command="delete">{{i18n('common.delete')}}</el-dropdown-item>
                        </cly-more-options>
                    </template>
                </el-table-column>
                <template v-slot:bottomline="scope">
                    <cly-diff-helper v-if="canUserUpdate || canUserDelete" class="action-bar" :diff="scope.diff" @discard="scope.unpatch()" :isModal=true>
                        <template v-slot:main>
                            <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                <span class="selected-count-blue bu-pl-1 text-medium">
                                    <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{scope.diff.length}}</span><span class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{i18n('common.selected')}}</span>
                                </span>
                                <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                <cly-more-options size="small" :text=" i18n('data-manager.change-visibility') " type="default" icon="cly-io cly-io-eye bu-mr-2" :widthSameAsTrigger="true" :showArrows=true @command="handleChangeVisibility($event, scope.diff)">
                                    <el-dropdown-item command="visible"><i class="cly-io cly-io-eye"></i>{{ i18n('data-manager.visible') }}</el-dropdown-item>
                                    <el-dropdown-item command="hidden"><i class="cly-io cly-io-eye-off"></i>{{ i18n('data-manager.hidden') }}</el-dropdown-item>
                                </cly-more-options>
                                <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                <el-button v-if="canUserDelete" class="bu-mr-3" size="small" type="default" @click="handleDelete(scope.diff)">
                                    <i class="cly-io-16 cly-io cly-io-trash" style="color:red"></i>
                                    <span class="ml-1" style="color: red">
                                        {{ i18n('common.delete') }}
                                    </span>
                                </el-button>
                                <el-button class="x-button" @click="unpatchSelectedEventGroups">
                                    <i class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                                </el-button>
                            </div>
                        </template>
                    </cly-diff-helper>
                </template>
            </cly-datatable-n>
        </cly-main>
        <cly-confirm-dialog
        @cancel="closeDeleteForm"
        @confirm="submitDeleteForm"
        :before-close="closeDeleteForm"
        ref="deleteConfirmDialog"
        :visible.sync="showDeleteDialog"
        dialogType="danger"
        :saveButtonLabel="i18n('common.delete')"
        :cancelButtonLabel="i18n('common.no-dont-delete')"
        :title="i18n('data-manager.delete-event-group')" >
            <template slot-scope="scope">
                {{i18n('data-manager.delete-event-group-permanently')}}<br/>
                <small class="color-red-100">{{i18n('data-manager.delete-event-warning')}}</small>
                <ul>
                 <li v-if="deleteElement">{{deleteElement.name}}</li>
                </ul>
            </template>
        </cly-confirm-dialog>
    </div>
</template>

<script>
import { i18nMixin, authMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';

var FEATURE_NAME = "data_manager";

export default {
    mixins: [
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        i18nMixin
    ],
    data: function() {
        return {
            eventsGroupTablePersistKey: "dm_event_groups_table_" + countlyCommon.ACTIVE_APP_ID,
            selectedFilter: 'all',
            trackedFields: ['isSelected'],
            eventGroupFilters: [
                {value: 'all', label: 'All Event Groups'},
                {value: true, label: 'Visible'},
                {value: false, label: 'Hidden'},
            ],
            showDeleteDialog: false,
            deleteElement: null,
        };
    },
    computed: {
        isLoading: {
            get: function() {
                return this.$store.getters["countlyDataManager/isLoading"];
            },
            cache: false
        },
        eventGroups: function() {
            var self = this;
            var eventGroup = this.$store.getters["countlyDataManager/eventGroups"];
            if (Array.isArray(eventGroup)) {
                return eventGroup
                    .filter(function(m) {
                        if (self.selectedFilter !== 'all') {
                            return m.status === self.selectedFilter;
                        }
                        else {
                            return true;
                        }
                    })
                    .map(function(m) {
                        m.isSelected = false;
                        delete m.hover;
                        return m;
                    });
            }
            else {
                return [];
            }
        },
    },
    methods: {
        onRowClick: function(params) {
            app.navigate("#/manage/data-manager/events/event-groups/" + params._id, true);
        },
        handleCurrentChange: function(selection, row) {
            var self = this;
            if (Array.isArray(selection)) {
                var isSelected = selection.filter(function(e) {
                    if (e.e === row.e) {
                        return true;
                    }
                }).length;
                self.$refs.eventGroupsTable.patch(row, { isSelected: !!isSelected });
            }
        },
        handleAllChange: function(selection, force = false) {
            var self = this;
            if (selection.length) {
                selection.forEach(function(row) {
                    self.$refs.eventGroupsTable.patch(row, { isSelected: true });
                });
            }
            else {
                this.eventGroups.forEach(function(row) {
                    self.$refs.eventGroupsTable.patch(row, { isSelected: false });
                });
                if (force) {
                    this.$refs.eventGroupsTable.$refs.elTable.clearSelection();
                }
            }
        },
        handleCommand: function(ev, eventGroup) {
            eventGroup.isEditMode = true;
            if (ev === 'edit') {
                this.$root.$emit('dm-open-edit-event-group-drawer', eventGroup);
            }
            else if (ev === 'delete') {
                this.deleteElement = eventGroup;
                this.showDeleteDialog = true;
            }
        },
        closeDeleteForm: function() {
            this.deleteElement = null;
            this.showDeleteDialog = false;
        },
        submitDeleteForm: function() {
            this.$store.dispatch("countlyDataManager/deleteEventGroups", [this.deleteElement._id]);
            this.showDeleteDialog = false;
            this.deleteElement = null;
            app.navigate("#/manage/data-manager/events/event-groups", true);
        },
        handleChangeVisibility: function(command, rows) {
            var isVisible = command === 'visible';
            var events = [];
            rows.forEach(function(row) {
                events.push(row.key);
            });
            this.$store.dispatch('countlyDataManager/changeEventGroupsVisibility', { events: events, isVisible: isVisible });
            this.unpatchSelectedEventGroups();
        },
        handleDelete: function(rows) {
            this.deleteQueue = rows;
            this.showDeleteDialog = true;
            var events = [];
            rows.forEach(function(row) {
                events.push(row.key);
            });
            this.$store.dispatch('countlyDataManager/deleteEventGroups', events);
        },
        unpatchSelectedEventGroups: function() {
            this.handleAllChange([], true);
        }
    }
};
</script>
