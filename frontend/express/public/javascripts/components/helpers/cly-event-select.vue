<template>
    <div class="cly-event-select">
        <cly-select-x
            v-if="!isLoading"
            :test-id="testId"
            pop-class="cly-event-select"
            all-placeholder="All Events"
            search-placeholder="Search in Events"
            placeholder="Select Event"
            :disabled="disabled"
            :hide-default-tabs="true"
            :options="availableEvents"
            :hide-all-options-tab="true"
            :single-option-settings="singleOptionSettings"
            :adaptive-length="adaptiveLength"
            :arrow="arrow"
            :width="width"
            v-bind="$attrs"
            v-on="$listeners">
            <template v-slot:header="selectScope">
                <h4 class="color-cool-gray-100 bu-mb-2" v-if="hasTitle">{{title}}</h4>
                <el-radio-group
                    :value="selectScope.activeTabId"
                    @input="selectScope.updateTab"
                    size="small">
                    <el-radio-button :test-id="testId + '-tab-' + idx" v-for="(tab, idx) in selectScope.tabs" :key="tab.name" :label="tab.name">{{tab.label}}</el-radio-button>
                </el-radio-group>
            </template>
        </cly-select-x>
        <div v-else class="cly-event-select__loading el-loading-spinner">
            <i class="el-icon-loading bu-mr-2"></i>
            <p class="el-loading-text">Loading...</p>
        </div>
    </div>
</template>

<script>
import countlyGlobal from '../../countly/countly.global.js';
import countlyCommon from '../../countly/countly.common.js';
import { getEventsForApps, refreshEvents, getEvents } from '../../countly/countly.event.js';
import $ from 'jquery';

export default {
    props: {
        blacklistedEvents: {
            type: Array,
            default: function() {
                return [];
            }
        },
        width: { type: [Number, Object, String], default: 'fit-content' },
        adaptiveLength: { type: Boolean, default: true },
        arrow: { type: Boolean, default: false },
        title: { type: String, require: false },
        selectedApp: { type: String, required: false, default: '' },
        disabled: { type: Boolean, default: false },
        testId: { type: String, default: "event-select-test-id" }
    },
    data: function() {
        return {
            singleOptionSettings: {
                autoPick: true,
                hideList: true
            },
            availableEvents: [],
            isLoading: false
        };
    },
    computed: {
        hasTitle: function() {
            return !!this.title;
        }
    },
    methods: {
        prepareAvailableEvents: function() {
            var self = this;
            var preparedEventList = [
                {
                    "label": this.$i18n('sidebar.analytics.sessions'),
                    "name": "[CLY]_session",
                    "options": [{ label: this.$i18n('sidebar.analytics.sessions'), value: '[CLY]_session' }]
                },
                {
                    "label": this.$i18n('sidebar.events'),
                    "name": "event",
                    "options": []
                }
            ];

            if (countlyGlobal.plugins.indexOf('views') !== -1) {
                preparedEventList.push({
                    "label": this.$i18n('internal-events.[CLY]_view'),
                    "name": "[CLY]_view",
                    "options": [{ label: this.$i18n('internal-events.[CLY]_view'), value: '[CLY]_view' }]
                });
            }

            var feedbackOptions = [];
            if (countlyGlobal.plugins.indexOf('star-rating') !== -1) {
                feedbackOptions.push({ label: this.$i18n('internal-events.[CLY]_star_rating'), value: '[CLY]_star_rating' });
            }

            if (countlyGlobal.plugins.indexOf('surveys') !== -1) {
                feedbackOptions.push({ label: this.$i18n('internal-events.[CLY]_nps'), value: '[CLY]_nps' });
                feedbackOptions.push({ label: this.$i18n('internal-events.[CLY]_survey'), value: '[CLY]_survey' });
            }

            if (feedbackOptions.length > 0) {
                preparedEventList.push({
                    "label": this.$i18n("sidebar.feedback"),
                    "name": "feedback",
                    "options": feedbackOptions
                });
            }

            var llmEvents = [];
            llmEvents.push(
                { "label": this.$i18n('internal-events.[CLY]_llm_interaction'), "value": "[CLY]_llm_interaction" },
                { "label": this.$i18n('internal-events.[CLY]_llm_interaction_feedback'), "value": "[CLY]_llm_interaction_feedback" },
                { "label": this.$i18n('internal-events.[CLY]_llm_tool_used'), "value": "[CLY]_llm_tool_used" },
                { "label": this.$i18n('internal-events.[CLY]_llm_tool_usage_parameter'), "value": "[CLY]_llm_tool_usage_parameter" }
            );

            if (llmEvents.length > 0) {
                preparedEventList.push({
                    "label": this.$i18n("llm.events"),
                    "name": "llm",
                    "options": llmEvents
                });
            }

            if (countlyGlobal.plugins.indexOf('compliance-hub') !== -1) {
                preparedEventList.push({
                    "label": this.$i18n('internal-events.[CLY]_consent'),
                    "name": "[CLY]_consent",
                    "options": [{ label: this.$i18n('internal-events.[CLY]_consent'), value: '[CLY]_consent' }]
                });
            }

            if (countlyGlobal.plugins.indexOf('crashes') !== -1) {
                preparedEventList.push({
                    "label": this.$i18n('internal-events.[CLY]_crash'),
                    "name": "[CLY]_crash",
                    "options": [{ label: this.$i18n('internal-events.[CLY]_crash'), value: '[CLY]_crash' }]
                });
            }

            if (countlyGlobal.plugins.indexOf('push') !== -1) {
                preparedEventList.push({
                    "label": 'Push Actioned',
                    "name": "[CLY]_push_action",
                    "options": [{ label: this.$i18n('internal-events.[CLY]_push_action'), value: '[CLY]_push_action' }]
                });
            }

            if (countlyGlobal.plugins.indexOf('journey_engine') !== -1) {
                preparedEventList.push({
                    "label": this.$i18n('internal-events.[CLY]_journey_engine'),
                    "name": "Journey",
                    "options": [
                        { label: this.$i18n('internal-events.[CLY]_journey_engine_start'), value: '[CLY]_journey_engine_start' },
                        { label: this.$i18n('internal-events.[CLY]_journey_engine_end'), value: '[CLY]_journey_engine_end' },
                        { label: this.$i18n('internal-events.[CLY]_content_shown'), value: '[CLY]_content_shown' },
                        { label: this.$i18n('internal-events.[CLY]_content_interacted'), value: '[CLY]_content_interacted' }
                    ]
                });
            }

            return new Promise((resolve) => {
                if (this.selectedApp) {
                    self.isLoading = true;
                    getEventsForApps([this.selectedApp], function(eData) {
                        preparedEventList[1].options = eData.map(function(e) {
                            return { label: countlyCommon.unescapeHtml(e.name), value: e.value };
                        });
                    });
                    preparedEventList = preparedEventList.filter(function(evt) {
                        return !(self.blacklistedEvents.includes(evt.name));
                    });
                    self.isLoading = false;
                    resolve(preparedEventList);
                }
                else {
                    self.isLoading = true;
                    $.when(refreshEvents()).then(function() {
                        const events = getEvents();
                        preparedEventList[1].options = events.map(function(event) {
                            return { label: countlyCommon.unescapeHtml(event.name), value: event.key };
                        });
                        preparedEventList = preparedEventList.filter(function(evt) {
                            return !(self.blacklistedEvents.includes(evt.name));
                        });
                        self.isLoading = false;
                        resolve(preparedEventList);
                    }, function() {
                        const events = getEvents();
                        preparedEventList[1].options = events.map(function(event) {
                            return { label: countlyCommon.unescapeHtml(event.name), value: event.key };
                        });
                        preparedEventList = preparedEventList.filter(function(evt) {
                            return !(self.blacklistedEvents.includes(evt.name));
                        });
                        self.isLoading = false;
                        resolve(preparedEventList);
                    });
                }
            });
        }
    },
    created: async function() {
        this.availableEvents = await this.prepareAvailableEvents();
    }
};
</script>
