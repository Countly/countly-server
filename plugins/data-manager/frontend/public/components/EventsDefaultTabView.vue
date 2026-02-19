<template>
    <div class="cly-vue-data-manager__events">
        <cly-main>
            <cly-notification v-if="limits && limits.show" class="cly-vue-data-manager__alerts bu-mx-5 bu-mb-5" :text="limits.message" color="light-warning">
            </cly-notification>
            <cly-datatable-n
            ref="eventsDefaultTable"
            test-id="datatable-events"
            :searchPlaceholder="i18n('data-manager.event-search-placeholder')"
            :rows="events"
            :keyFn="function(row) {return row.key ||row.e || row.name}"
            :indent=0
            :force-loading="isLoading"
            :tracked-fields="trackedFields"
            @select-all="handleAllChange"
            @select="handleCurrentChange"
            :available-dynamic-cols="dynamicEventCols"
            :persist-key="eventsTablePersistKey"
            :default-sort="{prop: 'lastModifiedts', order: 'descending'}">

                <template v-slot:header-left>
                    <cly-multi-select
                    test-id="event-category-filters"
                     ref="eventCategoryFilters"
                     v-bind:arrow="true"
                     :selectXWidth="336"
                     v-model="filter"
                     :fields="filterFields">
                        <template v-slot:action>
                            <div class="bu-level-item bu-is-clickable text-small color-red-100 bu-pl-1">
                                <a @click="manageCategories">Manage</a>
                            </div>
                        </template>
                    </cly-multi-select>
                </template>

                <template v-slot="scope">
                    <el-table-column v-if="canUserUpdate || canUserDelete" fixed="left" type="selection" :reserve-selection="true" width="55" prop="isSelected">
                    </el-table-column>

                    <el-table-column fixed="left" min-width="330" sortable="custom" prop="name" :label="i18n('data-manager.event-name')">
                        <template v-slot="rowScope">
                            <!-- <div @click="onRowClick(rowScope.row)" class="cly-vue-data-manager__clickable bu-is-clickable color-dark-blue-100">{{rowScope.row.name || rowScope.row.key || rowScope.row.e}}</div> -->
                            <a v-bind:href="'#/manage/data-manager/events/events/' + JSON.stringify(rowScope.row.key)" @click="onRowClick(rowScope.row)" class="cly-vue-data-manager__clickable bu-is-clickable color-dark-blue-100">
                                <div :data-test-id="'datatable-manage-events-events-event-name-' + rowScope.$index">{{unescapeHtml(rowScope.row.name || rowScope.row.key || rowScope.row.e)}}</div>
                            </a>
                            <div v-if="rowScope.row.audit && rowScope.row.audit.userName" :data-test-id="'datatable-manage-events-last-modified-by-label-' + rowScope.$index" class="text-small color-cool-gray-50">Last modified by {{rowScope.row.audit.userName}}</div>
                            <div>
                                <span v-if="isDrill" class="tag-container">
                                    <span v-bind:class="statusClassObject(rowScope.row.status)" class="bu-tag bu-mt-1">
                                        <span class="blinker"></span>
                                        <span :data-test-id="'datatable-manage-events-events-status-' + rowScope.$index">{{rowScope.row.status}}</span>
                                    </span>
                                </span>
                                <span v-if="rowScope.row.is_visible === false" :data-test-id="'datatable-manage-events-events-icon-eye-hidden-' + rowScope.$index" class="cly-vue-data-manager__hidden-icon">
                                    <i class="ion-eye-disabled"></i>
                                </span>
                                <span v-else class="cly-vue-data-manager__hidden-icon"><i class="ion-eye" :data-test-id="'datatable-manage-events-events-icon-eye-visible-' + rowScope.$index"></i></span>
                                <span v-if="eventTransformationMap && eventTransformationMap[rowScope.row.key]" class="cly-vue-data-manager__transform-icon">
                                    <svg width="12px" height="10px" viewBox="0 0 12 10" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                            <g id="transformations" transform="translate(-320.000000, -295.000000)" fill="#444444" fill-rule="nonzero">
                                                <g id="Group-9" transform="translate(320.000000, 292.000000)">
                                                    <g id="merge_type-24px" transform="translate(46.500000, 8.000000) rotate(90.000000) translate(-46.500000, -8.000000) translate(38.500000, -38.500000)">
                                                        <path fill="#fff" d="M11.3333333,92.6066667 L12.2733333,91.6666667 L10,89.3933333 L9.06,90.3333333 L11.3333333,92.6066667 Z M5,84.3333333 L7.33333333,84.3333333 L7.33333333,88.06 L3.72666667,91.6666667 L4.66666667,92.6066667 L8.66666667,88.6066667 L8.66666667,84.3333333 L11,84.3333333 L8,81.3333333 L5,84.3333333 Z" id="Shape"></path>
                                                    </g>
                                                </g>
                                            </g>
                                        </g>
                                    </svg>
                                </span>
                            </div>
                        </template>
                    </el-table-column>

                    <template v-for="(col,idx) in scope.dynamicCols" :prop="col.value">

                        <el-table-column v-if="col.value === 'category'"
                            min-width="250" sortable="custom" prop="categoryName" :label="i18n('data-manager.category')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-manage-events-events-category-name-' + rowScope.$index">{{unescapeHtml(rowScope.row.categoryName)}}</div>
                            </template>
                        </el-table-column>

                        <el-table-column v-else-if="col.value === 'lastModifiedts'"
                            prop="lastModifiedts" sortable="custom" min-width="275" :label="i18n('data-manager.last-modified')">
                            <template v-slot="rowScope">
                                <div v-if="rowScope.row && rowScope.row.lastModifiedts">
                                    <div :data-test-id="'datatable-manage-events-events-last-mod-date-' + rowScope.$index">{{rowScope.row.lastModifiedDate || i18n('data-manager.empty-placeholder') }}</div>
                                    <span class="text-small color-cool-gray-50" :data-test-id="'datatable-manage-events-events-last-mod-time-' + rowScope.$index">{{rowScope.row.lastModifiedTime}}</span>
                                </div>
                                <div :data-test-id="'datatable-manage-events-events-last-mod-date-' + rowScope.$index" v-else>
                                    {{ i18n('data-manager.empty-placeholder') }}
                                </div>
                            </template>
                        </el-table-column>

                        <el-table-column v-else-if="col.value === 'lts' && isDrill" sortable="custom" min-width="250" prop="lts" :label="i18n('data-manager.last-triggered')">
                            <template v-slot="rowScope">
                                <div v-if="rowScope.row && rowScope.row.lts">
                                    <div>{{rowScope.row.lastTriggerDate || i18n('data-manager.empty-placeholder') }}</div>
                                </div>
                                <div v-else :data-test-id="'datatable-manage-events-events-last-triggered-value-' + rowScope.$index">
                                    {{ i18n('data-manager.empty-placeholder') }}
                                </div>
                            </template>
                        </el-table-column>

                        <el-table-column v-else-if="col.value === 'totalCount' " sortable="custom" min-width="250" prop="totalCount" label="Count">
                            <template v-slot="rowScope">
                                    <div :data-test-id="'datatable-manage-events-events-count-' + rowScope.$index">{{rowScope.row.totalCountFormatted || i18n('data-manager.empty-placeholder') }}</div>
                            </template>
                        </el-table-column>

                        <el-table-column v-else-if="col.value === 'description' " sortable="custom" min-width="250" prop="description" :label="i18n('data-manager.description')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-manage-events-events-description-' + rowScope.$index">{{unescapeHtml(rowScope.row.description || i18n('data-manager.empty-placeholder'))}}</div>
                            </template>
                        </el-table-column>

                        <el-table-column v-else v-bind:sortable="col.sort ? 'custom' : false" :key="idx" min-width="300" :prop="col.value" :label="col.label">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-manage-events-events-value-' + rowScope.$index">{{unescapeHtml(rowScope.row[col.value] || i18n('data-manager.empty-placeholder'))}}</div>
                            </template>
                        </el-table-column>
                    </template>

                    <el-table-column type="options" align="center">
                        <template v-slot="rowScope">
                            <cly-more-options test-id="more-button" v-if="(canUserUpdate || canUserDelete) && rowScope.row.hover" size="small" @command="handleCommand($event, scope, rowScope.row)">
                                <el-dropdown-item v-if="canUserUpdate" command="edit" :data-test-id="'datatable-manage-events-events-edit-button-' + rowScope.$index">{{i18n('common.edit')}}</el-dropdown-item>
                                <el-dropdown-item v-if="canUserDelete" command="delete" :data-test-id="'datatable-manage-events-events-delete-button-' + rowScope.$index">{{i18n('common.delete')}}</el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>

                </template>
                <template v-slot:bottomline="scope">
                    <cly-diff-helper v-if="canUserUpdate || canUserDelete" :diff="scope.diff" @discard="scope.unpatch()" :isModal=true>
                        <template v-slot:main>
                            <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                <span class="selected-count-blue bu-pl-1 text-medium"></span>
                                    <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{scope.diff.length}}</span><span class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{i18n('common.selected')}}</span>
                                </span>
                                <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                <cly-more-options class="bu-mr-3" size="small" :text="i18n('data-manager.change-category')" type="default" icon="cly-io cly-io-hashtag bu-mr-2" :widthSameAsTrigger="true" :showArrows=true @command="handleChangeCategory($event, scope.diff)">
                                    <el-dropdown-item command=null><i class="cly-io cly-io-hashtag"></i>{{ i18n('data-manager.uncategorized') }}</el-dropdown-item>
                                    <el-dropdown-item :command="cat._id" :key="idx" v-for="(cat, idx) in categories"><i class="cly-io cly-io-hashtag"></i>{{cat.name}}</el-dropdown-item>
                                </cly-more-options>

                                <cly-more-options v-if="isDrill" class="bu-mr-3" size="small" text="Change Status" type="default" icon="cly-io cly-io-refresh bu-mr-2" :widthSameAsTrigger="true" :showArrows=true @command="handleChangeStatus($event, scope.diff)" >
                                    <el-dropdown-item command="live" icon="cly-io cly-io-play">{{ i18n('data-manager.live') }}</el-dropdown-item>
                                    <el-dropdown-item command="approved" icon="cly-io cly-io-badge-check">{{ i18n('data-manager.approved') }}</el-dropdown-item>
                                    <el-dropdown-item command="unplanned" icon="cly-io cly-io-clock">{{ i18n('data-manager.unplanned') }}</el-dropdown-item>
                                    <el-dropdown-item command="created" icon="cly-io cly-io-plus-circle">{{ i18n('data-manager.created') }}</el-dropdown-item>
                                    <el-dropdown-item command="blocked" icon="cly-io cly-io-x-circle">{{ i18n('data-manager.blocked') }}</el-dropdown-item>
                                </cly-more-options>
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
                                <el-button class="x-button" @click="unpatchSelectedEvents">
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
        :title="i18n('data-manager.delete-events')">
            <template slot-scope="scope">
                <div data-test-id="delete-event-popup-delete-event-permanently-question-label">{{i18n('data-manager.delete-event-permanently')}}<br/></div>
                <small data-test-id="delete-popup-delete-event-warning-label" class="color-red-100">{{ i18n('data-manager.delete-event-warning') }}</small>
                <ul>
                 <li v-for="ev in deleteQueue" data-test-id="delete-event-popup-event-key"> {{ev.key || ev.e || ev.name}}</li>
                </ul>
            </template>
        </cly-confirm-dialog>
        <cly-form-dialog
            name="Manage Categories"
            :title="i18n('data-manager.manage-categories')"
            @submit="onSaveCategories"
            :closeFn="onCloseCategories"
            saveButtonLabel="Save"
            :isOpened="categoryDialogVisible"
            v-bind="categories">
            <template v-slot="formDialogScope">
                <data-manager-manage-category
                    :max-categories="100"
                    :deletedCategories="deletedCategories"
                    v-model="categories">
                </data-manager-manage-category>
            </template>
        </cly-form-dialog>
    </div>
</template>

<script>
import { i18n, i18nMixin, authMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { validateCreate, validateDelete } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { refreshEvents } from '../../../../../frontend/express/public/javascripts/countly/countly.event.js';
import ManageCategory from './ManageCategory.vue';

var FEATURE_NAME = "data_manager";

var statusClassObject = function(status) {
    if (!status) {
        status = "unplanned";
    }
    var classObject = {};
    classObject['tag--' + status] = true;
    return classObject;
};

export default {
    mixins: [
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        i18nMixin
    ],
    components: {
        'data-manager-manage-category': ManageCategory
    },
    data: function() {
        return {
            isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
            eventsTablePersistKey: "dm_events_table_" + countlyCommon.ACTIVE_APP_ID,
            trackedFields: ['isSelected'],
            filter: {
                category: "all",
                status: "all",
                visibility: "all",
            },
            categoryDialogVisible: false,
            showDeleteDialog: false,
            deleteQueue: null,
            deletedCategories: [],
            baseColumns: [
                {
                    label: i18n('data-manager.description'),
                    value: 'description',
                    default: true,
                    sort: false
                },
                {
                    label: "Category",
                    value: 'category',
                    default: true,
                    sort: 'custom'
                },
                {
                    label: "Count",
                    value: 'totalCount',
                    default: true,
                    sort: 'custom'
                },
                {
                    label: i18n("data-manager.last-modified"),
                    value: 'lastModifiedts',
                    default: true,
                    sort: 'custom'
                },
                {
                    label: 'Event key',
                    value: 'e',
                    default: false,
                    sort: 'custom'
                },
            ]
        };
    },
    computed: {
        hasCreateRight: function() {
            return validateCreate(FEATURE_NAME);
        },
        hasDeleteRight: function() {
            return validateDelete(FEATURE_NAME);
        },
        isLoading: {
            get: function() {
                return this.$store.getters["countlyDataManager/isLoading"];
            },
            cache: false
        },
        dynamicEventCols: function() {
            var cols = this.baseColumns;
            var colMap = {};
            var ltsAdded = false;
            cols.forEach(function(col) {
                if (col.value === 'lts') {
                    ltsAdded = true;
                }
            });
            if (this.isDrill && !ltsAdded) {
                cols.push({
                    label: i18n("data-manager.last-triggered"),
                    value: 'lts',
                    default: true,
                    sort: 'custom'
                });
            }
            this.events.forEach(function(ev) {
                for (var key in ev) {
                    if (key.indexOf('[CLY_input]_') === 0) {
                        var col = key.substr(12);
                        if (!colMap[key]) {
                            colMap[key] = true;
                            cols.push(
                                {
                                    label: col,
                                    value: key,
                                    default: false
                                });
                        }
                    }
                }
            });
            return cols;
        },
        categories: function() {
            return this.$store.getters["countlyDataManager/categories"];
        },
        limits: function() {
            var eventLimit = {};
            var limits = this.$store.getters["countlyDataManager/limits"];
            if (this.events.length >= limits.event_limit) {
                eventLimit.message = i18n("events.max-event-key-limit", limits.event_limit);
                eventLimit.show = true;
            }
            return eventLimit;
        },
        categoriesMap: function() {
            return this.$store.getters["countlyDataManager/categoriesMap"];
        },
        eventTransformationMap: function() {
            if (this.isDrill) {
                return this.$store.getters["countlyDataManager/eventTransformationMap"];
            }
            else {
                return null;
            }
        },
        events: function() {
            var self = this;
            var isEventCountAvailable = this.$store.getters["countlyDataManager/isEventCountAvailable"];
            var eventCount = this.$store.getters["countlyDataManager/eventCount"];
            return this.$store.getters["countlyDataManager/events"]
                .filter(function(e) {
                    var isCategoryFilter = true;
                    var isStatusFilter = true;
                    var isVisiblityFilter = true;
                    var defaultUnexpectedFilter = true;
                    if (self.filter.category !== "all") {
                        isCategoryFilter = self.categoriesMap[e.category] === self.filter.category;
                    }
                    if (self.filter.status !== "all") {
                        isStatusFilter = e.status === self.filter.status;
                    }
                    if (self.filter.visibility !== "all") {
                        var visibility = self.filter.visibility === 'true';
                        var currentVisibility = e.is_visible !== false;
                        isVisiblityFilter = currentVisibility === visibility;
                    }
                    if (!e.status || e.status === "unplanned") {
                        defaultUnexpectedFilter = true;
                        e.status = 'unplanned';
                        if (!self.isDrill) {
                            defaultUnexpectedFilter = true;
                        }
                    }
                    return defaultUnexpectedFilter && isCategoryFilter && isStatusFilter && isVisiblityFilter;
                })
                .map(function(e) {
                    if (e.isSelected === undefined) {
                        e.isSelected = false;
                    }
                    e.categoryName = self.categoriesMap[e.category] || i18n('data-manager.uncategorized');
                    e.lastModifiedts = e.audit && e.audit.ts ? e.audit.ts * 1000 : null;
                    e.lastModifiedDate = e.audit && e.audit.ts ? window.moment(e.audit.ts * 1000).format("MMM DD,YYYY") : null;
                    e.lastModifiedTime = e.audit && e.audit.ts ? window.moment(e.audit.ts * 1000).format("H:mm:ss") : null;
                    if (e.lts) {
                        e.lastTriggerDate = window.moment(e.lts).format("MMM DD,YYYY");
                    }
                    if (!e.e) {
                        e.e = e.key;
                    }
                    if (!e.name) {
                        e.name = e.key;
                    }
                    if (!e.description) {
                        e.description = '';
                    }
                    if (isEventCountAvailable) {
                        e.totalCount = eventCount[e.key] || 0;
                        e.totalCountFormatted = countlyCommon.formatNumber(e.totalCount);
                    }
                    return e;
                });
        },
        filterFields: function() {
            if (this.isDrill) {
                return [{
                    label: "Category",
                    key: "category",
                    options: [
                        {value: "all", label: "All Categories"},
                    ].concat(this.categories.map(function(c) {
                        return {value: c.name, label: countlyCommon.unescapeHtml(c.name)};
                    })),
                    default: "all",
                    action: true
                },
                {
                    label: "Status",
                    key: "status",
                    options: [
                        {value: "all", label: "All Statuses"},
                        {value: "unplanned", label: "Unplanned"},
                        {
                            label: i18n("data-manager.created"),
                            value: 'created'
                        },
                        {
                            label: i18n("data-manager.approved"),
                            value: 'approved'
                        },
                        {
                            label: i18n("data-manager.live"),
                            value: 'live'
                        },
                        {
                            label: i18n("data-manager.blocked"),
                            value: 'blocked'
                        }
                    ],
                    default: "all",
                    action: false
                },
                {
                    label: "Visibility",
                    key: "visibility",
                    options: [
                        {value: "all", label: "All Visibilities"},
                        {value: "true", label: "Visible"},
                        {value: "false", label: "Hidden"},
                    ],
                    default: "all",
                    action: false
                }];
            }
            else {
                return [{
                    label: "Category",
                    key: "category",
                    options: [
                        {value: "all", label: "All Categories"},
                    ].concat(this.categories.map(function(c) {
                        return {value: c.name, label: countlyCommon.unescapeHtml(c.name)};
                    })),
                    default: "all",
                    action: true
                }, {
                    label: "Visibility",
                    key: "visibility",
                    options: [
                        {value: "all", label: "All Visibilities"},
                        {value: "true", label: "Visible"},
                        {value: "false", label: "Hidden"},
                    ],
                    default: "all",
                    action: false
                }];
            }
        }
    },
    methods: {
        handleCommand: function(event, scope, row) {
            if (event === 'edit') {
                this.$root.$emit('dm-open-edit-event-drawer', row);
            }
            else if (event === 'delete') {
                this.handleDelete([row]);
            }
        },
        handleCurrentChange: function(selection, row) {
            var self = this;
            if (Array.isArray(selection)) {
                var isSelected = selection.filter(function(e) {
                    if (e.e === row.e) {
                        return true;
                    }
                }).length;
                self.$refs.eventsDefaultTable.patch(row, { isSelected: !!isSelected });
            }
        },
        handleChangeCategory: function(cat, rows) {
            this.$store.dispatch("countlyDataManager/changeCategory", {
                category: cat,
                events: rows.map(function(ev) {
                    return countlyCommon.unescapeHtml(ev.key);
                })
            });
            this.unpatchSelectedEvents();
        },
        handleAllChange: function(selection, force = false) {
            var self = this;
            if (selection.length) {
                selection.forEach(function(row) {
                    self.$refs.eventsDefaultTable.patch(row, { isSelected: true });
                });
            }
            else {
                this.events.forEach(function(row) {
                    self.$refs.eventsDefaultTable.patch(row, { isSelected: false });
                });
                if (force) {
                    this.$refs.eventsDefaultTable.$refs.elTable.clearSelection();
                }
            }
        },
        handleChangeVisibility: function(command, rows) {
            var isVisible = command === 'visible';
            var events = [];
            rows.forEach(function(row) {
                events.push(row.key);
            });
            this.$store.dispatch('countlyDataManager/changeVisibility', { events: events, isVisible: isVisible }).then(function() {
                refreshEvents();
            });
            this.unpatchSelectedEvents();
        },
        handleChangeStatus: function(command, rows) {
            var events = [];
            rows.forEach(function(row) {
                events.push(row.key);
            });
            this.$store.dispatch('countlyDataManager/updateEventStatus', { events: events, status: command });
            this.unpatchSelectedEvents();
        },
        onRowClick: function(params) {
            app.navigate("#/manage/data-manager/events/events/" + JSON.stringify(params.key), true);
        },
        manageCategories: function() {
            this.$refs.eventCategoryFilters.close(true);
            this.categoryDialogVisible = true;
        },
        onSaveCategories: function() {
            var editedCategories = this.categories.filter(function(e) {
                return (e.edited && e._id);
            });
            var newCatgories = this.categories.filter(function(e) {
                return !e._id;
            }).map(function(e) {
                return e.name;
            });
            if (newCatgories.length) {
                this.$store.dispatch('countlyDataManager/saveCategories', newCatgories);
            }
            if (editedCategories.length) {
                this.$store
                    .dispatch('countlyDataManager/editCategories', editedCategories)
                    .then(function(res) {
                        if (res === 'Error') {
                            notify({
                                title: i18n("common.error"),
                                message: 'Categories Update Failed',
                                type: "error"
                            });
                        }
                        else {
                            notify({
                                title: i18n("common.success"),
                                message: 'Categories updated!'
                            });
                        }
                    });
            }
            if (this.deletedCategories && this.deletedCategories.length) {
                this.$store.dispatch('countlyDataManager/deleteCategories', this.deletedCategories.map(function(cat) {
                    return cat._id;
                }));
            }
        },
        onCloseCategories: function() {
            if (this.categoryDialogVisible) {
                this.$store.dispatch('countlyDataManager/loadCategories');
                this.deletedCategories = [];
                this.categoryDialogVisible = false;
            }
        },
        handleDelete: function(rows) {
            this.deleteQueue = rows;
            this.showDeleteDialog = true;
        },
        closeDeleteForm: function() {
            this.deleteQueue = null;
            this.showDeleteDialog = false;
        },
        submitDeleteForm: function() {
            var rows = this.deleteQueue;
            var events = [];
            rows.forEach(function(row) {
                var delKey = row.key || row.e || row.name;
                events.push(delKey);
            });
            this.unpatchSelectedEvents();
            this.$store.dispatch('countlyDataManager/deleteEvents', events).then(function() {
                refreshEvents();
            });
            this.deleteQueue = null;
            this.showDeleteDialog = false;
        },
        unpatchSelectedEvents: function() {
            this.handleAllChange([], true);
        },
        statusClassObject: statusClassObject,
    },
};
</script>
