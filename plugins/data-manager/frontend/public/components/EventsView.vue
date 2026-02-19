<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="currentSecondaryTab === 'validations' ? i18n('data-manager.manage-validations') : currentSecondaryTab === 'segmentation' ? i18n('data-manager.manage-event-segmentation') : i18n('data-manager.manage-events')"
        >
            <template v-slot:header-tabs>
                <cly-dynamic-tabs :no-history=true v-model="currentSecondaryTab" :tabs="secondaryTabs" skin="secondary" :hideSingleTab="false"></cly-dynamic-tabs>
          </template>
          <template v-slot:header-right>
              <div v-if="isDrill">
                  <cly-report-manager-dialog class="bu-mr-2" origin="data-manager"></cly-report-manager-dialog>
              </div>
              <div v-if="currentSecondaryTab !== 'validations'">
                <cly-more-options v-if="showMoreOptions" test-id="create-new-event-more-option" size="small" text="Create new" type="success" icon="el-icon-circle-plus" @command="handleCreateCommand($event, currentSecondaryTab)">
                    <el-dropdown-item v-if="isDrill && canUserCreateTransform && (currentSecondaryTab === 'events' || currentSecondaryTab === 'segmentation') " :data-test-id="'events-page-create-new-' +i18n('data-manager.create-transformation').replaceAll(' ', '-').toLowerCase() + '-button'" command="create-transform">
                        {{i18n('data-manager.create-transformation')}}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isDrill && canUserCreate && (currentSecondaryTab === 'events' )" :data-test-id="'events-page-create-new-' +i18n('data-manager.create-event').replaceAll(' ', '-').toLowerCase() + '-button'" command="create-event">
                        {{i18n('data-manager.create-event')}}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="canUserCreate && (currentSecondaryTab === 'event-groups') " :data-test-id="'events-page-create-new-' +i18n('data-manager.create-group').replaceAll(' ', '-').toLowerCase() + '-button'" command="create-event-group">
                        {{i18n('data-manager.create-group')}}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isDrill && canUserCreateTransform && (currentSecondaryTab === 'transformations') " :data-test-id="'events-page-create-new-' +i18n('data-manager.create-event-transformation').replaceAll(' ', '-').toLowerCase() + '-button'" command="create-event-transform">
                        {{i18n('data-manager.create-event-transformation')}}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isDrill && canUserCreateTransform && (currentSecondaryTab === 'transformations') " :data-test-id="'events-page-create-new-' +i18n('data-manager.create-segment-transformation').replaceAll(' ', '-').toLowerCase() + '-button'" command="create-segment-transform">
                        {{i18n('data-manager.create-segment-transformation')}}
                    </el-dropdown-item>
                </cly-more-options>
              </div>
            <div v-if="isDrill && (canUserUpdate || canUserCreate || isUserGlobalAdmin)" class="bu-ml-2">
                <cly-more-options size="small" @command="handleMetaCommands($event)">
                    <el-dropdown-item v-if="canUserUpdate" command="regnerate">{{i18n('data-manager.regenerate')}}</el-dropdown-item>
                    <el-dropdown-item v-if="canUserCreate" command="export-schema">{{i18n('data-manager.export-schema')}}</el-dropdown-item>
                    <el-dropdown-item v-if="canUserUpdate" command="import-schema">{{i18n('data-manager.import-schema')}}</el-dropdown-item>
                    <el-dropdown-item v-if="isUserGlobalAdmin" :command="{url: '#/manage/configurations/data-manager'}">{{i18n('plugins.configs')}}</el-dropdown-item>
                </cly-more-options>
            </div>
        </template>
        </cly-header>
        <events-drawer @close="closeDrawer" :controls="drawers.events"></events-drawer>
        <event-group-drawer @close="closeDrawer" :controls="drawers.eventgroup"></event-group-drawer>
        <div v-if="isDrill">
            <transform-drawer @close="closeDrawer" :controls="drawers.transform"></transform-drawer>
            <segments-drawer @close="closeDrawer" :controls="drawers.segments"></segments-drawer>
            <regenerate-drawer @close="closeDrawer" :controls="drawers.regenerate"></regenerate-drawer>
            <cly-form-dialog
                class="cly-vue-data-manager__dropzone"
                ref="importSchemaFormDialog"
                title="Import Event Schema"
                name="Import Event Schema"
                @submit="onSaveImport"
                :closeFn="onCloseImport"
                saveButtonLabel="Save"
                :isOpened="importDialogVisible">
                <template v-slot="formDialogScope">
                    <cly-dropzone
                    @vdropzone-removed-file="onFileRemoved"
                    @vdropzone-file-added="onFileAdded"
                    ref="importSchemaDropzone"
                    id="import-schema-dropzone"
                    :useCustomSlot=true
                    :options="dropzoneOptions">
                        <div class="cly-vue-data-manager__dropzone__content">
                            <div class="give-upload">
                                <div style="cursor:default">
                                    <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.3332 0.333252H3.33317C1.8665 0.333252 0.679837 1.53325 0.679837 2.99992L0.666504 18.9999C0.666504 20.4666 1.8665 21.6666 3.33317 21.6666H24.6665C26.1332 21.6666 27.3332 20.4666 27.3332 18.9999V5.66658C27.3332 4.19992 26.1332 2.99992 24.6665 2.99992H13.9998L11.3332 0.333252Z" fill="#A7AEB8"/>
                                    </svg>
                                </div>
                                <div class="bu-mt-3 text-medium color-cool-gray-50">
                                    {{ i18n('data-manager.drag-drop-file') }} <span class="color-blue-100"> {{ i18n('data-manager.click-to-upload') }}</span>
                                </div>
                            </div>
                        </div>
                    </cly-dropzone>
                </template>
            </cly-form-dialog>
        </div>
    </div>
</template>

<script>
import { i18n, i18nMixin, mixins, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { tabsMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead, validateCreate } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import EventsDrawer from './EventsDrawer.vue';
import EventGroupDrawer from './EventGroupDrawer.vue';
import EventsDefaultTabView from './EventsDefaultTabView.vue';
import EventsGroupsTabView from './EventsGroupsTabView.vue';

var FEATURE_NAME = "data_manager";
var SUB_FEATURE_TRANSFORMATIONS = FEATURE_NAME + '_transformations';

var EXTENDED_VIEWS = (window.countlyDataManager && window.countlyDataManager.extended && window.countlyDataManager.extended.views) || {};
var COMPONENTS = EXTENDED_VIEWS.components || {};

export default {
    mixins: [
        authMixin(FEATURE_NAME),
        mixins.hasDrawers(["events", "transform", "segments", "eventgroup", "regenerate"]),
        tabsMixin({
            "externalTabs": "/manage/data-manager/events"
        }),
        i18nMixin
    ],
    data: function() {
        var localTabs = [];
        if (validateRead(FEATURE_NAME)) {
            localTabs.push(
                {
                    title: this.i18n('data-manager.events'),
                    priority: 1,
                    name: "events",
                    component: EventsDefaultTabView,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events/events"
                }
            );
            localTabs.push({
                priority: 3,
                title: i18n('data-manager.event-groups'),
                name: "event-groups",
                component: EventsGroupsTabView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events/event-groups"
            });
        }
        return {
            isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
            currentSecondaryTab: (this.$route.params && this.$route.params.secondaryTab) || "events",
            importDialogVisible: false,
            dropzoneOptions: {
                url: '/',
                autoProcessQueue: false,
                addRemoveLinks: true,
                acceptedFiles: 'text/csv',
                dictDefaultMessage: 'a<br/> b',
                maxFiles: 1,
                dictRemoveFile: this.i18n('surveys.generic.remove-file'),
                previewTemplate: '<div class="cly-vue-data-manager__dropzone__preview bu-level bu-mx-4 bu-mt-3">\
                                  <div class="dz-filename bu-ml-2"><span data-dz-name></span></div></div>'
            },
            localTabs: localTabs
        };
    },
    computed: {
        secondaryTabs: function() {
            var allTabs = this.localTabs.concat(this.externalTabs);

            allTabs.sort(function(a, b) {
                return a.priority - b.priority;
            });

            return allTabs;
        },
        canUserCreateTransform: function() {
            return validateCreate(SUB_FEATURE_TRANSFORMATIONS);
        },
        showMoreOptions: function() {
            return (
                (this.isDrill && this.canUserCreateTransform && (this.currentSecondaryTab === 'events' || this.currentSecondaryTab === 'segmentation')) ||
                (this.isDrill && this.canUserCreate && this.currentSecondaryTab === 'events') ||
                (this.canUserCreate && this.currentSecondaryTab === 'event-groups') ||
                (this.isDrill && this.canUserCreateTransform && this.currentSecondaryTab === 'transformations')
            );
        }
    },
    components: {
        'events-drawer': EventsDrawer,
        'transform-drawer': COMPONENTS.TransformDrawer,
        'segments-drawer': COMPONENTS.SegmentsDrawer,
        'event-group-drawer': EventGroupDrawer,
        'regenerate-drawer': COMPONENTS.RegenerateDrawer
    },
    methods: {
        initialize: function() {
            this.$store.dispatch('countlyDataManager/loadEventsData');
            this.$store.dispatch('countlyDataManager/loadEventGroups');
            this.$store.dispatch('countlyDataManager/loadCategories');
            this.$store.dispatch('countlyDataManager/fetchLimits');
            if (this.isDrill) {
                this.$store.dispatch('countlyDataManager/loadTransformations');
                this.$store.dispatch('countlyDataManager/loadSegmentsMap');
                this.$store.dispatch('countlyDataManager/loadValidations');
                this.$store.dispatch('countlyDataManager/loadInternalEvents');
                if (countlyGlobal.plugins.indexOf("views") > -1) {
                    this.$store.dispatch('countlyDataManager/loadViews');
                }
            }
        },
        handleCreateCommand: function(event, tab) {
            if (event === 'create-transform') {
                var transformType = tab;
                var actionType = 'merge';
                if (tab === 'events') {
                    transformType = 'event';
                }
                if (tab === 'segmentation') {
                    transformType = 'segment';
                    actionType = 'rename';
                }
                this.openDrawer("transform", { tab: tab, transformType: transformType, actionType: actionType });
            }
            else if (event === 'create-event') {
                this.openDrawer("events", { segments: [], isEditMode: false });
            }
            else if (event === 'create-event-group') {
                this.openDrawer("eventgroup", { isEditMode: false, display_map: {}, status: true });
            }
            else if (event === 'create-event-transform') {
                this.openDrawer("transform", { tab: tab, transformType: 'event', actionType: 'merge' });
            }
            else if (event === 'create-segment-transform') {
                this.openDrawer("transform", { tab: tab, transformType: 'segment', actionType: 'merge' });
            }
        },
        handleMetaCommands: function(event) {
            if (event === 'regnerate') {
                this.openDrawer("regenerate", {
                    selectedDateRange: '30days'
                });
            }
            else if (event === 'export-schema') {
                this.$store.dispatch('countlyDataManager/exportSchema');
            }
            else if (event === 'import-schema') {
                this.importDialogVisible = true;
            }
        },
        onSaveImport: function() {
            var self = this;
            var dropzone = this.$refs.importSchemaDropzone;
            var files = dropzone.getAcceptedFiles();
            this.$store.dispatch('countlyDataManager/importSchema', files[0])
                .then(function() {
                    self.initialize();
                });
        },
        onCloseImport: function() {
            this.importDialogVisible = false;
            this.$refs.importSchemaDropzone.removeAllFiles();
        },
        onFileAdded: function() {
            // this.importDisabled = false;
            // this.$refs.importDropzone.disable();
        },
        onFileRemoved: function() {
            // this.importDisabled = true;
            // this.$refs.importDropzone.enable();
        }
    },
    created: function() {
        this.initialize();
    },
    mounted: function() {
        var self = this;
        this.$root.$on('dm-open-edit-segmentation-drawer', function(data) {
            self.openDrawer("segments", data);
        });
        this.$root.$on('dm-open-edit-event-drawer', function(data) {
            data = JSON.parse(JSON.stringify(data));
            if (self.isDrill) {
                var segments = [];
                if (data.segments) {
                    data.segments
                        .forEach(function(segment) {
                            if (segment) {
                                try {
                                    var sg = data.sg[segment];
                                    sg.name = countlyCommon.unescapeHtml(segment);
                                    segments.push(sg);
                                }
                                catch (e) {
                                    // supress create mode
                                }
                            }
                        });
                }
                data.segments = segments;
            }
            else {
                data.segments = data.segments.map(function(seg) {
                    return {
                        name: countlyCommon.unescapeHtml(seg)
                    };
                });
            }
            data.isEditMode = true;
            data.is_visible = data.is_visible === undefined ? true : data.is_visible;
            data.description = countlyCommon.unescapeHtml(data.description);
            data.e = countlyCommon.unescapeHtml(data.e);
            if (data.key) {
                data.key = countlyCommon.unescapeHtml(data.key);
            }
            data.categoryName = countlyCommon.unescapeHtml(data.categoryName);
            data.name = countlyCommon.unescapeHtml(data.name);
            if (data.sg) {
                Object.keys(data.sg).forEach(function(key) {
                    var decodedKey = countlyCommon.unescapeHtml(key);
                    if (data.sg[key].name) {
                        data.sg[key].name = countlyCommon.unescapeHtml(data.sg[key].name);
                    }
                    if (decodedKey !== key) {
                        data.sg[decodedKey] = data.sg[key];
                        delete data.sg[key];
                    }
                });
            }
            self.openDrawer("events", data);
        });
        this.$root.$on('dm-open-edit-transform-drawer', function(doc) {
            doc = JSON.parse(JSON.stringify(doc));
            doc.transformType = doc.actionType.split('_')[0].toLowerCase();
            if (doc.actionType.split('_')[1] !== "MERGE") {
                doc.transformTarget = doc.transformTarget[0];
            }
            if (doc.actionType === 'EVENT_MERGE' && doc.isRegexMerge === true) {
                doc.actionType = 'merge-regex';
                doc.eventTransformTargetRegex = doc.transformTarget[0];
            }
            else {
                doc.actionType = doc.actionType.split('_')[1].toLowerCase();
            }
            doc.isExistingEvent = doc.isExistingEvent ? 'true' : 'false';
            doc.name = countlyCommon.unescapeHtml(doc.name);
            doc.transformResult = countlyCommon.unescapeHtml(doc.transformResult);
            if (doc.actionType === 'value') {
                doc.actionType = 'change-value';
            }
            doc.isEditMode = true;
            if (doc.parentEvent) {
                doc.parentEvent = countlyCommon.unescapeHtml(doc.parentEvent);
                doc.selectedParentEvent = doc.parentEvent;
            }
            if (!doc.targetRegex) {
                doc.targetRegex = false;
            }
            if (!doc.isRegex) {
                doc.isRegex = false;
            }
            if (!doc.isRegexMerge) {
                doc.isRegexMerge = false;
            }

            self.openDrawer("transform", doc);
        });
        this.$root.$on('dm-open-edit-event-group-drawer', function(data) {
            if (!data.display_map) {
                data.display_map = {};
            }
            if (data.status === undefined) {
                data.status = true;
            }
            self.openDrawer("eventgroup", data);
        });
    },
    destroyed: function() {
        this.$root.$off('dm-open-edit-segmentation-drawer');
        this.$root.$off('dm-open-edit-event-drawer');
        this.$root.$off('dm-open-edit-transform-drawer');
        this.$root.$off('dm-open-edit-event-group-drawer');
    }
};
</script>
