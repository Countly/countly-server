<template>
<div v-bind:class="[componentId]" class="populator-wrapper">
    <cly-tabs v-model="currentTab">
        <el-tab-pane name="data-populator" v-if="canUserCreate" :label="i18n('populator.plugin-title')">
            <cly-header
                test-id="data-populator-header-title"
                :title="i18n('populator.plugin-title')"
                :tooltip="{description: i18n('populator.plugin-description')}"
            >
            </cly-header>
            <cly-main>
                <cly-dynamic-tabs v-model="currentPopulateTab" skin="secondary" :tabs="populateTabs"></cly-dynamic-tabs>
                <div>
                    <cly-section v-if="currentPopulateTab === 'pop-with-temp'" class="bu-mt-5 populator-wrapper__main-page-form">
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2 populator-input-area">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-template-data-template-label">{{ i18n('populator.data-template') }}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator.data-template-tooltip')" data-test-id="populate-with-template-data-template-tooltip"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-select-x test-id="data-populator-template-select" class="main-page-inputs" v-model="selectedTemplate" :options="templates.map(template => ({value: template._id,label: template.name}))" :placeholder="i18n('populator.select-template')"></cly-select-x>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2 populator-input-area">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-template-data-range-label">{{ i18n('populator.date-range') }}</span>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-date-picker-g class="populator-wrapper__date-picker main-page-inputs" test-id="populate-with-template-date-range"></cly-date-picker-g>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2 populator-input-area">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-template-number-of-runs-label">{{ i18n('populator.number-of-runs') }}</span>
                                <cly-tooltip-icon data-test-id="populate-with-template-number-of-runs-tooltip" :tooltip="i18n('populator.number-of-runs-tooltip')"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-populator-number-selector test-id="populate-with-template-select-number-of-runs" :items="numberOfRuns" v-model="selectedRunCount"></cly-populator-number-selector>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2 populator-input-area">
                                <el-switch v-model="isOpen" test-id="save-environment"></el-switch>
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-template-save-environment-label">{{ i18n('populator.save-environment') }}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator.environment-tooltip')" data-test-id="populate-with-template-save-environment-tooltip"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <el-input class="populator-wrapper__save-field" v-model="environmentName" :placeholder="i18n('populator.save-as-environment')" test-id="populate-with-template-save-environment-input"></el-input>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2 populator-input-area">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-template-include-features-label">{{ i18n('populator.include-features') }}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator.include-features-tooltip')" data-test-id="populate-with-template-include-features-tooltip"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-select-x class="main-page-inputs" v-model="selectedFeatures" :options="availableFeatures" :placeholder="i18n('populator.select-features')" mode="multi-check" test-id="populate-with-template-features-select"></cly-select-x>                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-level-right">
                            <el-button type="success" :disabled="!selectedTemplate.length || (isOpen && !environmentName.length)" @click="openDialog()" data-test-id="populate-with-template-generate-demo-data-button">{{ i18n('populator.start') }}</el-button>
                        </cly-sub-section>
                    </cly-section>

                    <cly-section v-else-if="currentPopulateTab === 'pop-with-env'" class="bu-mt-5 populator-wrapper__main-page-form">
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-environment-environment-label">{{ i18n('populator.environment') }}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator.environment-tooltip')" data-test-id="populate-with-environment-environment-tooltip"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-select-x test-id="populate-with-environment-environment-select" class="selected-environment-input" v-model="selectedEnvironment" :options="environments.map(item => ({value: item._id, label: item.name}))" :placeholder="i18n('populator.select-environment')"></cly-select-x>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-environment-data-range-label">{{ i18n('populator.date-range') }}</span>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-date-picker-g class="populator-wrapper__date-picker main-page-inputs" test-id="populate-with-environment-data-range"></cly-date-picker-g>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-columns bu-is-vcentered">
                            <div class="bu-column bu-is-2">
                                <span class="text-medium font-weight-bold text-uppercase" data-test-id="populate-with-environment-number-of-runs-label">{{ i18n('populator.number-of-runs') }}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator.number-of-runs-tooltip')" icon="ion ion-help-circled" data-test-id="populate-with-environment-number-of-runs-tooltip"></cly-tooltip-icon>
                            </div>
                            <div class="bu-column main-page-container">
                                <cly-populator-number-selector :items="numberOfRuns" v-model="selectedRunCount" test-id="populate-with-environment-select-number-of-runs"></cly-populator-number-selector>
                            </div>
                        </cly-sub-section>
                        <cly-sub-section class="bu-level-right">
                            <el-button type="success" :disabled="!selectedEnvironment.length" @click="openDialog()" data-test-id="populate-with-environment-generate-demo-data-button">{{ i18n('populator.start') }}</el-button>
                        </cly-sub-section>
                    </cly-section>
                </div>
                <el-dialog class="populator-start-modal-wrapper" :close-on-press-escape="false" :show-close="false" :close-on-click-modal="false" :visible.sync="generateDataModal.showDialog"  width="429px" :before-close="closeGenerateDataModal">
                    <img src="../assets/images/generate-data-modal.png" style="width: 100%;" data-test-id="generating-data-image">
                    <div class="populator-start-modal-wrapper__modal-progress-container">
                        <cly-progress-bar  :percentage="percentage" :color="progressBarColor" :height:=8 class="bu-mt-1 populator-start-modal-wrapper__proggress-bar" data-test-id="generating-data-progress-bar"></cly-progress-bar>
                        <span class="text-small font-weight-bold" data-test-id="generating-data-progress-bar-width">{{progressBarWidth}}</span>
                        <h3 class="populator-start-modal-wrapper__generate-data-header" data-test-id="generating-data-title">{{ i18n('populator.generating-data') }}</h3>
                        <span class="text-medium color-cool-gray-50 populator-start-modal-wrapper__generate-data-bulk" data-test-id="generating-data-sub-title">{{ i18n('populator.bulk') }}</span>
                        <el-button type="default" class="text-smallish font-weight-bold populator-start-modal-wrapper__stop-button" @click="stopPopulate()" data-test-id="populate-stop-button">{{i18n('populator.stop')}}</el-button>
                    </div>
                </el-dialog>
                <el-dialog class="populator-stop-modal-wrapper" :visible.sync="finishedGenerateModal.showDialog" width="30%" :show-close="false">
                    <div class="populator-stop-modal-wrapper__modal-progress-container">
                        <i class="el-icon-success populator-stop-modal-wrapper__success-icon" data-test-id="finished-success-icon"></i>
                        <h3 class="populator-stop-modal-wrapper__finished-confirm-header" data-test-id="finished-confirm-title">{{ i18n('populator.finished-confirm-title') }}</h3>
                        <span class="text-medium populator-stop-modal-wrapper__finished-confirm-sub-title" data-test-id="finished-confirm-sub-title">{{ i18n('populator.finished-confirm-sub-title') }}</span>
                        <el-button type="success" class="bu-mt-6" @click="redirectHomePage()" data-test-id="go-to-homepage-button">{{i18n('populator.go-to-homepage')}}</el-button>
                        <el-button type="default" class="bu-mt-4 bu-mb-4" @click="continuePopulate()" data-test-id="stay-in-data-populator-button">{{i18n('populator.cancel')}}</el-button>
                    </div>
                </el-dialog>
            </cly-main>
        </el-tab-pane>
        <el-tab-pane name="templates" :label="i18n('populator.templates-tab-title')">
            <cly-header
                test-id="templates-header-title"
                :title="i18n('populator.templates-tab-title')"
                :tooltip="{description: i18n('populator.templates-tooltip')}">
                <template v-slot:header-right>
                    <el-button type="success" v-if="canUserCreate" icon="el-icon-circle-plus" @click="newTemplate" data-test-id="create-new-template-button">{{i18n("populator.create-new-template")}}</el-button>
                </template>
            </cly-header>
            <cly-main>
                <cly-datatable-n
                test-id="datatable-templates"
                :force-loading="isLoading"
                :rows="templates"
                class="populator-wrapper__table"
                searchPlaceholder="Search in Templates"
                :hasExport="false">
                    <template v-slot="scope">
                        <el-table-column prop="name" :label="i18n('populator.template')" sortable>
                            <div slot-scope="rowScope" class="has-ellipsis" v-tooltip="decodeHtml(rowScope.row.name)">
                                <a v-if="rowScope.row.hasEnvironment" class="color-dark-blue-100" @click="onRowClick(rowScope.row)" :data-test-id="'datatable-templates-template-' + rowScope.$index">{{ decodeHtml(rowScope.row.name) }}</a>
                                <span v-else :data-test-id="'datatable-templates-template-' + rowScope.$index">{{ decodeHtml(rowScope.row.name) }}</span>
                            </div>
                        </el-table-column>
                        <el-table-column prop="userCount" label-class-name="bu-has-text-right" :label="i18n('populator.number-of-users')" sortable>
                                <div slot-scope="rowScope" class="bu-has-text-right" :data-test-id="'datatable-templates-number-of-users-' + rowScope.$index">
                                    {{ rowScope.row.userCount }}
                                </div>
                        </el-table-column>
                        <el-table-column prop="eventCount" width="180" label-class-name="bu-has-text-right" :label="i18n('populator.number-of-events')" sortable>
                                <div slot-scope="rowScope" class="bu-has-text-right" :data-test-id="'datatable-templates-number-of-events-' + rowScope.$index">
                                    {{ rowScope.row.eventCount }}
                                </div>
                        </el-table-column>
                        <el-table-column prop="viewCount" label-class-name="bu-has-text-right" :label="i18n('populator.number-of-views')" sortable>
                                <div slot-scope="rowScope" class="bu-has-text-right" :data-test-id="'datatable-templates-views-' + rowScope.$index">
                                    {{ rowScope.row.viewCount }}
                                </div>
                        </el-table-column>
                        <el-table-column prop="sequenceCount" label-class-name="bu-has-text-right" :label="i18n('populator.number-of-sequences')" sortable>
                                <div slot-scope="rowScope" class="bu-has-text-right" :data-test-id="'datatable-templates-sequences-' + rowScope.$index">
                                    {{ rowScope.row.sequenceCount }}
                                </div>
                        </el-table-column>
                        <el-table-column prop="generatedOn" :label="i18n('populator.generated-on')" sortable>
                                <div slot-scope="rowScope" :data-test-id="'datatable-templates-generated-on-' + rowScope.$index">
                                    {{ rowScope.row.generatedOn }}
                                </div>
                        </el-table-column>
                        <el-table-column type="options">
                            <template v-slot="col">
                                <cly-more-options :test-id="'datatable-templates-' + col.$index" v-if="col.row.hover && (canUserCreate || canUserUpdate || canUserDelete)" size="small" @command="handleDrawerActions($event, col.row)">
                                    <el-dropdown-item command="edit" v-if="col.row.buttonShow && canUserUpdate" :test-id="'datatable-templates-edit-button-' + col.$index">{{ i18n('populator.edit') }}</el-dropdown-item>
                                    <el-dropdown-item command="delete" v-if="col.row.buttonShow && canUserDelete" :test-id="'datatable-templates-delete-button-' + col.$index">{{ i18n('populator.delete') }}</el-dropdown-item>
                                    <el-dropdown-item v-if="canUserCreate" command="duplicate" :test-id="'datatable-templates-duplicate-button-' + col.$index">{{ i18n('populator.duplicate') }}</el-dropdown-item>
                                </cly-more-options>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-main>
        </el-tab-pane>
    </cly-tabs>
    <cly-confirm-dialog class="populator-wrapper__start-dialog" :show-close="false" @cancel="closeConfirmDialog" @confirm="submitConfirmDialog" :before-close="closeConfirmDialog" ref="deleteConfirmDialog" :visible.sync="dialog.showDialog" dialogType="success" :saveButtonLabel="dialog.saveButtonLabel" :cancelButtonLabel="dialog.cancelButtonLabel" :saveButtonVisibility="dialog.saveButtonVisibility" :title="dialog.title" >
        <template slot-scope="scope">
            <div v-html="dialog.text"></div>
        </template>
    </cly-confirm-dialog>
    <cly-populator-template-drawer ref="populatorTemplateDrawer" @refresh-table="refresh" @closeHandler="refreshTable" :titleDescription="titleDescription" :controls="drawers.populatorTemplate"></cly-populator-template-drawer>
</div>
</template>

<script>
import { i18n, i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { isPluginEnabled, notify, appIdsToNames } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyPopulator from '../store/index.js';
import PopulatorTemplateDrawer from './PopulatorTemplateDrawer.vue';
import moment from 'moment';
import Vue from 'vue';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClyProgressBar from '../../../../../frontend/express/public/javascripts/components/progress/progress-bar.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyConfirmDialog from '../../../../../frontend/express/public/javascripts/components/dialog/cly-confirm-dialog.vue';

var FEATURE_NAME = 'populator';

export default {
    mixins: [
        i18nMixin,
        mixins.hasDrawers("populatorTemplate"),
        authMixin(FEATURE_NAME)
    ],
    components: {
        'cly-populator-template-drawer': PopulatorTemplateDrawer,
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDynamicTabs,
        ClyTooltipIcon,
        ClySelectX,
        ClyDatePickerG,
        ClyProgressBar,
        ClyDatatableN,
        ClyMoreOptions,
        ClyConfirmDialog
    },
    data: function() {
        return {
            currentTab: "data-populator",
            dialog: {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: '', params: {}},
            selectedTemplate: '',
            selectedFeatures: [],
            generateDataModal: {showDialog: false},
            percentage: 0,
            templates: [],
            progressBarColor: '#0166D6',
            progressBar: null,
            progressBarWidth: '0 / 0',
            finishedGenerateModal: {showDialog: false},
            description: i18n('populator.warning3'),
            titleDescription: {header: '', button: ''},
            currentPopulateTab: 'pop-with-temp',
            environmentName: '',
            isOpen: 'false',
            numberOfRuns: [
                {value: 10, text: 10},
                {value: 50, text: 50},
                {value: 100, text: 100},
            ],
            selectedRunCount: 10,

            isLoading: false,
            environments: [],
            selectedEnvironment: '',
            selectedTemplateInformation: {},
        };
    },
    computed: {
        populateTabs: function() {
            return [
                {
                    title: this.i18n('populator.pop-with-temp'),
                    name: "pop-with-temp",
                },
                {
                    title: this.i18n('populator.pop-with-env'),
                    name: "pop-with-env",
                }
            ];
        },
        availableFeatures: function() {
            var plugins = [
                {value: "ab-testing", label: i18n("ab-testing.title")},
                {value: "cohorts", label: i18n("cohorts.cohorts")},
                {value: "crashes", label: i18n(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" ? "web.crashes.title" : "crashes.title")},
                {value: "funnels", label: i18n("funnels.plugin-title")},
                {value: "performance-monitoring", label: i18n("performance-monitoring.title")},
                {value: "star-rating", label: i18n("star-rating.plugin-title")},
                {value: "surveys", label: i18n("surveys.nps.plugin-title")},
            ];
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
                plugins.push({value: "push", label: i18n("push-notification.title")});
            }
            return plugins.filter(function(plugin) {
                return isPluginEnabled(plugin.value);
            }).sort(function(a, b) {
                return a.label.localeCompare(b.label);
            });
        }
    },
    methods: {
        refreshTable: function(res) {
            if (res.result) {
                this.refresh(true);
            }
        },
        newTemplate: function() {
            this.titleDescription = {header: i18n('populator.create-new-template'), button: i18n('populator.create-template')};
            this.openDrawer("populatorTemplate", {
                name: '',
                uniqueUserCount: 100,
                platformType: ["Mobile"],
                sectionsActivity: {"events": false, "views": false, "sequences": false, "behavior": false},
                users: [],
                events: [],
                views: [],
                sequences: [],
                behavior: {}
            });
        },
        refresh: function(isRefresh, fromDrawer = false) {
            if (isRefresh) {
                this.getTemplateList(fromDrawer);
            }
        },
        unescapeCondition: function(prmConditions) {
            let conditions = prmConditions;
            conditions.forEach(function(condition) {
                condition.selectedKey = countlyCommon.unescapeHtml(condition.selectedKey);
                condition.selectedValue = countlyCommon.unescapeHtml(condition.selectedValue);
                condition.values.forEach(function(value) {
                    value.key = countlyCommon.unescapeHtml(value.key);
                });
            });
            return conditions;
        },
        unescapSegmentations: function(prmSegmentations) {
            var self = this;
            let segmentations = prmSegmentations;
            segmentations.forEach(function(segmentation) {
                segmentation.key = countlyCommon.unescapeHtml(segmentation.key);
                if (segmentation.values) {
                    segmentation.values.forEach(function(value) {
                        value.key = countlyCommon.unescapeHtml(value.key);
                    });
                }
                if (segmentation.conditions) {
                    segmentation.conditions = self.unescapeCondition(segmentation.conditions);
                }
            });
            return segmentations;
        },
        decodeHtmlEntities: function(obj) {
            var self = this;
            if (typeof obj === 'undefined' || obj === null) {
                return;
            }
            if (obj.users) {
                obj.users.forEach(function(user) {
                    user.key = countlyCommon.unescapeHtml(user.key);
                    if (user.values) {
                        user.values.forEach(function(value) {
                            value.key = countlyCommon.unescapeHtml(value.key);
                        });
                    }
                    if (user.conditions) {
                        user.conditions = self.unescapeCondition(user.conditions);
                    }
                });
            }
            if (obj.events) {
                obj.events.forEach(function(event) {
                    event.key = countlyCommon.unescapeHtml(event.key);
                    if (event.segmentations && event.segmentations.length) {
                        event.segmentations = self.unescapSegmentations(event.segmentations);
                    }
                });
            }
            if (obj.views) {
                obj.views.forEach(function(view) {
                    view.key = countlyCommon.unescapeHtml(view.key);
                    if (view.segmentations && view.segmentations.length) {
                        view.segmentation = self.unescapSegmentations(view.segmentations);
                    }
                });
            }
            if (obj.sequences) {
                obj.sequences.forEach(function(sequence) {
                    sequence.steps.forEach(function(step) {
                        step.value = countlyCommon.unescapeHtml(step.value);
                    });
                });
            }
            if (obj.behavior && obj.behavior.generalConditions) {
                obj.behavior.generalConditions = self.unescapeCondition(obj.behavior.generalConditions);
            }
            if (obj.behavior && obj.behavior.sequenceConditions) {
                obj.behavior.sequenceConditions = self.unescapeCondition(obj.behavior.sequenceConditions);
            }
            return obj;
        },
        handleDrawerActions: function(command, template) {
            switch (command) {
            case "edit":
                this.titleDescription = {header: i18n('populator.drawer-title-edit'), button: i18n('populator.drawer-save-template')};
                if (template.events && template.events.length) {
                    Vue.set(this.$refs.populatorTemplateDrawer.sectionActivity, 'events', true);
                }
                if (template.views && template.views.length) {
                    Vue.set(this.$refs.populatorTemplateDrawer.sectionActivity, 'views', true);
                }
                template = this.decodeHtmlEntities(template);
                this.openDrawer("populatorTemplate", template);
                break;
            case "duplicate":
                template = this.decodeHtmlEntities(template);
                template.is_duplicate = true;
                this.titleDescription = {header: i18n('populator.drawer-title-duplicate'), button: i18n('populator.duplicate')};
                this.openDrawer("populatorTemplate", template);
                break;
            case "delete":
                this.dialog = {
                    type: "deleteTemplate",
                    showDialog: true,
                    saveButtonLabel: i18n('common.yes'),
                    cancelButtonLabel: i18n('common.no'),
                    title: i18n('populator.delete-template-header'),
                    text: i18n('populator.delete-template-description', template.name),
                    params: {templateId: template._id}
                };
                break;
            default:
                break;
            }
        },
        submitConfirmDialog: function() {
            var self = this;
            if (this.dialog.type === "deleteTemplate") {
                countlyPopulator.removeTemplate(this.dialog.params.templateId, function(res) {
                    if (res.result) {
                        notify({
                            type: "ok",
                            title: i18n("common.success"),
                            message: i18n('populator-success-delete-template'),
                            sticky: false,
                            clearAll: true
                        });
                        self.refresh(true);
                    }
                    else {
                        notify({
                            type: "error",
                            title: i18n("common.error"),
                            message: i18n('populator.failed-to-remove-template', self.dialog.params.templateId),
                            sticky: false,
                            clearAll: true
                        });
                    }
                    self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                });
            }
            else {
                if (this.isOpen) {
                    countlyPopulator.checkEnvironment(this.environmentName, function(res) {
                        if (res.errorMsg) {
                            notify({type: "error", title: i18n("common.error"), message: res.errorMsg, sticky: false, clearAll: true});
                            self.dialog.showDialog = false;
                            return;
                        }
                        else {
                            self.startPopulate();
                            self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                        }
                    });
                }
                else {
                    this.startPopulate();
                    this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                }
            }
        },
        closeConfirmDialog: function() {
            this.environmentName = '';
            this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
            this.description = i18n('populator.warning3');
        },
        redirectHomePage: function() {
            this.generateDataModal = { showDialog: false };
            var self = this;
            countlyPopulator.stopGenerating(false, function() {
                window.clearInterval(self.progressBar);
                self.generateDataModal = { showDialog: false };
                self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
            });
            window.location.href = '#/home';
            window.location.reload();
        },
        continuePopulate: function() {
            this.finishedGenerateModal = { showDialog: false };
            this.description = i18n('populator.warning3');
        },
        moveProgressBar: function(template) {
            var self = this;
            self.percentage = 0;
            self.progressBar = setInterval(function() {
                if (countlyPopulator.isGenerating()) {
                    self.percentage = countlyPopulator.getCompletedRequestCount() / (template.uniqueUserCount) * 100;
                    self.progressBarWidth = countlyPopulator.getCompletedRequestCount() + " / " + template.uniqueUserCount;
                }
                else {
                    self.percentage = 100;
                    countlyPopulator.stopGenerating(true);
                    window.clearInterval(self.progressBar);
                    self.generateDataModal = { showDialog: false };
                    self.finishedGenerateModal = {showDialog: true};
                    self.description = i18n('populator.warning3');
                    self.environmentName = '';
                    self.getTemplateList();
                    if (self.isOpen) {
                        self.isOpen = false;
                    }
                }
            }, 1000);
        },
        startPopulate: function() {
            var self = this;
            self.percentage = 0;
            this.generateDataModal = { showDialog: true };

            countlyPopulator.setStartTime(countlyCommon.periodObj.start / 1000);
            countlyPopulator.setEndTime(countlyCommon.periodObj.end / 1000);

            if (this.currentPopulateTab === 'pop-with-env') {
                const { templateId, name } = this.environments.filter(x=>x._id === self.selectedEnvironment)[0];
                countlyPopulator.getEnvironment(templateId, self.selectedEnvironment, function(env) {
                    if (env && env.aaData && env.aaData.length) {
                        env = env.aaData.map(environmentName => {
                            return { ...environmentName, name: name };
                        });
                        countlyPopulator.generateUsers(self.selectedRunCount, self.selectedTemplateInformation, env);
                        self.moveProgressBar(self.selectedTemplateInformation);
                    }
                    else {
                        notify({
                            type: "error",
                            title: i18n("common.error"),
                            message: i18n('populator.no-data-fetch-environment'),
                            sticky: false,
                            clearAll: true
                        });
                    }
                });
            }
            else {
                countlyPopulator.setSelectedTemplate(self.selectedTemplate);
                countlyPopulator.setSelectedFeatures(this.selectedFeatures);
                this.selectedTemplateInformation.saveEnvironment = this.isOpen;
                this.selectedTemplateInformation.environmentName = this.environmentName;
                countlyPopulator.generateUsers(self.selectedRunCount, this.selectedTemplateInformation);
                this.moveProgressBar(this.selectedTemplateInformation);
            }
        },
        stopPopulate: function() {
            this.finishedGenerateModal = { showDialog: false };
            this.generateDataModal = { showDialog: false };
            this.description = i18n('populator.warning3');
            var self = this;
            countlyPopulator.stopGenerating(true, function() {
                window.clearInterval(self.progressBar);
                self.generateDataModal = { showDialog: false };
                self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                if (self.isOpen) {
                    self.isOpen = false;
                    self.getTemplateList();
                }
                self.environmentName = '';
            });
        },
        openDialog: function() {
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].salt || countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].checksum_salt) {
                notify({type: 'error', message: i18n("populator.error-salt"), sticky: true});
                return;
            }
            var self = this;
            let selectedTemplateId = this.selectedTemplate;
            if (this.currentPopulateTab === 'pop-with-env') {
                const environment = this.environments.filter(x=>x._id === self.selectedEnvironment)[0];
                selectedTemplateId = environment.templateId;
            }
            countlyPopulator.getTemplate(selectedTemplateId, function(template) {
                self.selectedTemplateInformation = template;
                const averageTimeBetweenRuns = parseInt(template.behavior.runningSession.reduce((acc, val) => acc + parseInt(val, 10), 0) / template.behavior.runningSession.length, 0) + 1;
                const selectedDayCount = parseInt((countlyCommon.periodObj.end / 1000 - countlyCommon.periodObj.start / 1000) / 3600, 10);

                self.description = i18n('populator.warning4');
                self.dialog = {
                    type: "check",
                    showDialog: false,
                    saveButtonLabel: i18n('populator.yes-populate-data'),
                    cancelButtonLabel: i18n('populator.no-populate-data'),
                    title: i18n('populator.warning1', appIdsToNames([countlyCommon.ACTIVE_APP_ID])),
                    text: i18n('populator.warning2')
                };

                if (averageTimeBetweenRuns * self.selectedRunCount > selectedDayCount) {
                    self.dialog = {
                        type: "check",
                        showDialog: false,
                        saveButtonVisibility: false,
                        title: i18n('populator.warning-generate-users-header'),
                        text: i18n('populator.warning-generate-users')
                    };
                }

                if (self.isOpen) {
                    countlyPopulator.checkEnvironment(self.environmentName, function(res) {
                        if (res.errorMsg) {
                            notify({type: "error", title: i18n("common.error"), message: res.errorMsg, sticky: false, clearAll: true});
                            self.environmentName = '';
                            self.isOpen = false;
                        }
                        else {
                            self.dialog.showDialog = true;
                        }
                    });
                }
                else {
                    self.dialog.showDialog = true;
                }
            });
        },
        closeGenerateDataModal: function() {
            this.generateDataModal = { showDialog: false };
            this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
            this.getTemplateList();
        },
        getTemplateList: function(force) {
            var self = this;
            self.isLoading = force;
            self.templates = [];
            countlyPopulator.getEnvironments(function(environments) {
                if (environments && environments.length) {
                    environments.map(env => {
                        env.name = self.decodeHtml(env.name);
                    });
                }
                self.environments = environments;

                countlyPopulator.getTemplates(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type, function(templates) {
                    templates.forEach(function(item) {
                        if (self.environments.filter(x => x.templateId === item._id).length) {
                            item.hasEnvironment = true;
                        }
                        else {
                            item.hasEnvironment = false;
                        }
                        self.templates.push({
                            _id: item._id,
                            name: self.decodeHtml(item.name),
                            buttonShow: !item.isDefault,
                            isDefault: item.isDefault === true ? i18n('populator.template-type-default') : i18n('populator.template-type-custom'),
                            userCount: (item.users !== undefined ? Object.keys(item.users).length : 0),
                            eventCount: (item.events !== undefined ? Object.keys(item.events).length : 0),
                            viewCount: (item.views !== undefined ? Object.keys(item.views).length : 0),
                            sequenceCount: (item.sequences !== undefined ? Object.keys(item.sequences).length : 0),
                            generatedOn: (item.generatedOn !== undefined ? moment(new Date(item.generatedOn)).format("DD MMM YYYY") : '?'),
                            generatedOnTs: item.generatedOn ? item.generatedOn : undefined,
                            uniqueUserCount: item.uniqueUserCount,
                            platformType: item.platformType || [],
                            users: item.users || [],
                            events: item.events || [],
                            views: item.views || [],
                            sequences: item.sequences || [],
                            behavior: item.behavior,
                            hasEnvironment: item.hasEnvironment,
                            lastEditedBy: (item.lastEditedBy !== undefined ? item.lastEditedBy : '-'),
                        });
                    });
                    self.isLoading = false;
                });
            });
        },
        onRowClick: function(params) {
            app.navigate("/manage/populate/environment/" + params._id, true);
        },
        decodeHtml: function(str) {
            return countlyCommon.unescapeHtml(str);
        },
    },
    watch: {
        selectedTemplate: function() {
            this.isOpen = false;
            this.environmentName = '';
        },
        environmentName: function(newVal) {
            if (newVal.length) {
                this.isOpen = true;
            }
            else {
                this.isOpen = false;
            }
        }
    },
    beforeCreate: function() {
    },
    created: function() {
        this.getTemplateList(true);
        if (!this.canUserCreate) {
            this.currentTab = "templates";
        }
    },
};
</script>
