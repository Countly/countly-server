<template>
    <div class="cly-vue-data-manager" v-bind:class="[componentId]">
        <events-drawer @close="closeDrawer" :controls="drawers.events"></events-drawer>
        <segments-drawer v-if="isDrill" @close="closeDrawer" :controls="drawers.segments"></segments-drawer>
        <cly-header>
            <template v-slot:header-left>
                <div>
                    <cly-back-link link="/manage/data-manager/events/events" title="Back to Manage Events"></cly-back-link>
                    <div class="bu-mt-4">
                        <div class="bu-is-flex bu-is-align-items-center">
                            <h3 class="bu-is-capitalized bu-mr-2">{{unescapeHtml(event.name || event.key)}}</h3>
                            <cly-guide></cly-guide>
                        </div>
                        <div class="bu-mt-4 bu-mr-2">
                            <span v-if="isDrill" class="tag-container">
                                <span v-bind:class="statusClassObject(event.status)" class="bu-tag bu-mt-1">
                                    <span class="blinker"></span>
                                    <span>{{event.status || i18n('data-manager.unplanned') }}</span>
                                </span>
                            </span>
                            <span v-if="event.is_visible === false" class="cly-vue-data-manager__hidden-icon bu-mx-1"><i class="ion-eye-disabled"></i></span>
                            <span v-else class="cly-vue-data-manager__hidden-icon bu-mx-1"><i class="ion-eye"></i></span>
                            <span v-if="eventTransformationMap && eventTransformationMap[event.name || event.key]" class="cly-vue-data-manager__transform-icon bu-mx-1">
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
                            <span v-if="event.audit && event.auditDate" class="bu-mr-2 text-small color-cool-gray-50">
                                <i class="el-icon-time"></i> {{i18n('data-manager.last-modified-on')}} {{event.auditDate}} {{event.auditTime}} by {{event.audit.userName}}
                            </span>
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:header-right>
                <div class="bu-mt-6">
                    <el-button data-test-id="event-detail-page-edit-button" v-if="canUserUpdate" @click="handleEdit" size="small" icon="ion-edit">{{i18n('data-manager.edit-event')}}</el-button>
                    <cly-more-options v-if="canUserDelete" class="bu-ml-2" size="small" @command="handleCommand($event, event.key)">
                        <el-dropdown-item command="delete">{{i18n('common.delete')}}</el-dropdown-item>
                    </cly-more-options>
                </div>
            </template>
        </cly-header>

        <cly-section class="bu-mx-5 cly-vue-data-manager__box-container--boxed">
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column">
                    <div class="bu-mx-5 bu-my-5">
                        <span class="text-medium font-weight-bold text-uppercase">
                            {{i18n('data-manager.events.event-details')}}
                        </span>
                        <table class="bu-mt-5 cly-vue-data-manager__box-container__table text-medium">
                            <colgroup>
                                <col width="25%" />
                                <col width="75%" />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td><span>{{i18n('data-manager.events.key')}}</span>
                                    </td>
                                    <td>{{unescapeHtml(event.key)}}</td>
                                </tr>
                                <tr>
                                    <td><span>{{i18n('data-manager.event-name')}}</span>
                                    </td>
                                    <td>{{unescapeHtml(event.name)}}</td>
                                </tr>
                                <tr>
                                    <td><span>{{i18n('data-manager.description')}}</span>
                                    </td>
                                    <td>{{unescapeHtml(event.description || '-')}}</td>
                                </tr>
                                <tr>
                                    <td><span>{{i18n('data-manager.category')}}</span>
                                    </td>
                                    <td>{{unescapeHtml(categoriesMap[event.category] || i18n('data-manager.uncategorized'))}}</td>
                                </tr>
                                <tr>
                                    <td><span>{{i18n('data-manager.first-triggered')}}</span>
                                    </td>
                                    <td>{{event.last_trigger}}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </cly-section>

        <div v-if="isLoading" v-loading="isLoading" class="bu-mx-5" style="height: 300px;">
            <h4>{{i18n('data-manager.event-segmentation')}}</h4>
        </div>
        <cly-section class="bu-mx-5" v-if="isDrill && segments.length > 0">
            <template v-slot:header>
                <h4>{{i18n('data-manager.event-segmentation')}}</h4>
            </template>
            <cly-datatable-n
            :keyFn="function(row) {return row.name}"
            :hasDynamicCols="false"
            :rows="segments"
            >
                <template v-slot="scope">
                    <el-table-column :label="i18n('data-manager.segment-name')" sortable="custom" prop="name">
                        <template v-slot="rowScope">
                            <div>{{unescapeHtml(rowScope.row.name)}}</div>
                        </template>
                    </el-table-column>
                    <el-table-column :label="i18n('data-manager.description')">
                        <template v-slot="rowScope">
                            <div>{{unescapeHtml(rowScope.row.description)}}</div>
                        </template>
                    </el-table-column>
                    <el-table-column :label="i18n('data-manager.status')" sortable="custom" prop="status">
                        <template v-slot="rowScope">
                            <span v-if="isDrill" class="tag-container">
                                <span v-bind:class="statusClassObject(rowScope.row.status)" class="bu-tag bu-mt-1">
                                    <span class="blinker"></span>
                                    <span>{{rowScope.row.status}}</span>
                                </span>
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="i18n('data-manager.last-modified')" prop="auditTs" sortable="custom">
                        <template v-slot="rowScope">
                            <div v-if="rowScope.row.audit && rowScope.row.audit.ts && rowScope.row.auditDate">
                                <div>{{rowScope.row.auditDate}}</div>
                                <span class="text-small color-cool-gray-50">{{rowScope.row.auditTime}}</span>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="canUserUpdate" type="options" width="90px" align="center">
                        <template v-slot="rowScope">
                            <el-button v-if="rowScope.row.hover" @click="handleEditSegment(rowScope.row)" size="small">Edit</el-button>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-section>
        <cly-confirm-dialog
        @cancel="closeDeleteForm"
        @confirm="submitDeleteForm"
        :before-close="closeDeleteForm"
        ref="deleteConfirmDialog"
        :visible.sync="showDeleteDialog"
        dialogType="danger"
        :saveButtonLabel="i18n('common.delete')"
        :cancelButtonLabel="i18n('common.no-dont-delete')"
        :title="i18n('data-manager.delete-events')" >
            <template slot-scope="scope">
                {{ i18n('data-manager.delete-event-permanently') }}<br/>
                <small class="color-red-100">{{ i18n('data-manager.delete-event-warning') }}</small>
                <ul>
                 <li> {{deleteElement}}</li>
                </ul>
            </template>
        </cly-confirm-dialog>
    </div>
</template>

<script>
import { i18nMixin, mixins, authMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { refreshEvents } from '../../../../../frontend/express/public/javascripts/countly/countly.event.js';
import EventsDrawer from './EventsDrawer.vue';

var FEATURE_NAME = "data_manager";

var EXTENDED_VIEWS = (window.countlyDataManager && window.countlyDataManager.extended && window.countlyDataManager.extended.views) || {};
var COMPONENTS = EXTENDED_VIEWS.components || {};

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
        mixins.hasDrawers(["events", "segments"]),
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        i18nMixin
    ],
    components: {
        'events-drawer': EventsDrawer,
        'segments-drawer': COMPONENTS.SegmentsDrawer
    },
    data: function() {
        return {
            isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
            eventId: this.$route.params.eventId,
            showDeleteDialog: false,
            deleteElement: null,
        };
    },
    computed: {
        event: function() {
            var eventId = this.eventId;
            var event = {};
            var events = this.$store.getters["countlyDataManager/events"];
            if (!(events && events.length)) {
                return [];
            }
            events.forEach(function(ev) {
                var key = ev.key || ev.e;
                if (key === eventId) {
                    event = ev;
                }
            });
            if (event.is_visible !== false) {
                event.is_visible = true;
            }
            if (!event.status) {
                event.status = 'unplanned';
            }
            if (event.audit && event.audit.ts) {
                event.auditDate = window.moment(event.audit.ts * 1000).format("MMM DD,YYYY");
                event.auditTime = window.moment(event.audit.ts * 1000).format("H:mm:ss");
            }
            return event;
        },
        segments: function() {
            var self = this;
            var segments = [];
            var segmentsMap = this.$store.getters["countlyDataManager/segmentsMap"];
            if (segmentsMap) {
                segmentsMap.forEach(function(sgMap) {
                    if (sgMap._id === self.event.key) {
                        return segments = sgMap.sg;
                    }
                });
            }
            return segments.map(function(seg) {
                if (!seg.status) {
                    seg.status = 'unplanned';
                }
                if (seg.audit && seg.audit.ts) {
                    seg.auditTs = seg.audit.ts;
                    seg.auditDate = window.moment(seg.audit.ts * 1000).format("MMM DD,YYYY");
                    seg.auditTime = window.moment(seg.audit.ts * 1000).format("H:mm:ss");
                }
                return seg;
            });
        },
        isLoading: function() {
            return this.$store.getters["countlyDataManager/segmentsMapLoading"];
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
        }
    },
    methods: {
        handleCommand: function(ev, event) {
            if (ev === 'delete') {
                this.deleteElement = event;
                this.showDeleteDialog = true;
            }
        },
        closeDeleteForm: function() {
            this.deleteElement = null;
            this.showDeleteDialog = false;
        },
        submitDeleteForm: function() {
            this.$store.dispatch('countlyDataManager/deleteEvents', [this.deleteElement]).then(function() {
                refreshEvents();
            });
            this.showDeleteDialog = false;
            app.navigate("#/manage/data-manager/events/events", true);
        },
        initialize: function() {
            this.$store.dispatch('countlyDataManager/loadCategories');
            this.$store.dispatch('countlyDataManager/loadEventsData');
            if (this.isDrill) {
                this.$store.dispatch('countlyDataManager/loadTransformations');
                this.$store.dispatch('countlyDataManager/loadSegmentsMap');
            }
        },
        handleEdit: function() {
            var event = JSON.parse(JSON.stringify(this.event));
            event.segments = this.segments;
            event.isEditMode = true;
            this.openDrawer("events", event);
        },
        handleEditSegment: function(seg) {
            this.openDrawer("segments", seg);
        },
        statusClassObject: statusClassObject,
    },
    created: function() {
        this.initialize();
    }
};
</script>
