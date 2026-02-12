<template>
<div class="populator-template populator-template__sequences">
    <div v-if="isOpen">
        <cly-populator-section-detail :title="i18n('populator-template.sequence-incremental', index + 1)" entity="Sequence" @remove="() => onRemoveSequence(index)" class="bu-mb-4" :key="index" v-for="(sequence, index) in sequences">
            <div class="populator-template__sequences--container">
                <div class="bu-is-flex bu-mb-2">
                    <div>
                        <span class="text-smallish bu-has-text-weight-medium" id="populator-template-step">{{i18n('populator-template.steps')}}</span>
                    </div>
                    <div class="probability-header">
                        <div>
                            <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                            <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                        </div>
                    </div>
                    <div></div>
                </div>
                <div class="populator-template__sequences--draggable-fields">
                    <draggable
                        :move="checkMove"
                        v-model="sequence.steps"
                        @change="onDragChange()"
                        >
                    <div
                        class="text-medium cly-vue-listbox__item"
                        :key="stepIndex"
                        v-for="(item, stepIndex) in sequence.steps" :class="{ draggable: !item.fixed }">
                        <div class="bu-is-flex" v-if="!(sequence.steps.length > 1 && stepIndex === sequence.steps.length - 1)">
                            <div v-if="item.key !== 'session'" class="drag-handler"><img :src="'/images/icons/drag-icon.svg'" /></div>
                            <div class="bu-is-flex bu-is-align-items-center bu-mb-2">
                                <div class="step-field has-ellipsis" :style="[item.key === 'session' ? {'width': '140px'} : {}]">
                                    <span class="text-smallish bu-is-capitalized" :class="{'color-cool-gray-50': item.disabled}" v-tooltip="(item.key.length + item.value.length) > 15 ? (item.key + ' - ' + item.value) : null"> {{item.key}}  -  {{item.value}} </span>
                                </div>
                                <div class="bu-is-flex probability-field">
                                    <div>
                                        <validation-provider v-if="item.key !== 'session'"  name="probability" rules="required|integer|min_value:0|max_value:100" v-slot="v">
                                            <el-input class="input" :disabled="item.disabled" v-model="item.probability" :class="{'is-error': v.errors.length > 0}">
                                                <template slot="suffix">
                                                    <span class="text-medium color-cool-gray-50">%</span>
                                                </template>
                                            </el-input>
                                        </validation-provider>
                                    </div>
                                    <div v-if="item.key !== 'session'">
                                        <div class="override-buttons" v-if="!item.disabled">
                                            <i class="bu-mt-2 el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveStep(index, stepIndex)"></i>
                                        </div>
                                        <div v-else class="override-buttons" style="cursor: not-allowed">
                                            <i class="bu-mt-2 el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="vertical-hr" v-if="sequence.steps.length > 1 && stepIndex === 0"></div>
                    </div>
                    </draggable>
                </div>
            </div>
            <div class="bu-mt-2 bu-ml-4 override-buttons">
                <el-popover
                        placement="bottom"
                        width="288"
                        popper-class="populator-condition-selector__popover"
                        trigger="click">
                        <template v-slot:default>
                            <div class="bu-p-5">
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n('populator-template.property')}}</div>
                                <el-select v-model="selectedProperty" class="bu-mb-4" style="width: 100%" :placeholder="i18n('populator.template.select-a-step-property')">
                                    <el-option
                                        v-for="item in sequenceStepProperties.filter(x=>!x.disabled)"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value">
                                    </el-option>
                                </el-select>
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n('populator-template.property-value')}}</div>
                                <el-select v-model="selectedValue" style="width: 100%" :placeholder="i18n('populator.template.select-a-step-property-value', selectedProperty ? selectedProperty : 'property')">
                                    <el-option
                                        v-for="item in sequenceStepValues[selectedProperty]"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.name">
                                    </el-option>
                                </el-select>
                                <div class="bu-mt-5 bu-is-flex bu-is-justify-content-flex-end">
                                    <el-button class="el-button el-button--secondary el-button--small" @click="onClose">{{i18n('common.cancel')}}</el-button>
                                    <el-button class="el-button el-button--success el-button--small" :disabled="selectedValue.length ? false : true" @click="onSaveStep(index)">{{i18n('common.add')}}</el-button>
                                </div>
                            </div>
                        </template>
                        <template v-slot:reference>
                            <el-button type="text" v-tooltip="!linkedSectionActivity ? i18n('populator-template.add-step-tooltip') : ''" :disabled="!linkedSectionActivity" class="bu-p-0 text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddStep()">{{i18n('populator-template.add-step')}}</el-button>
                        </template>
                    </el-popover>
            </div>
            <div class="bu-ml-4">
                <div class="vertical-hr bu-mt-4 bu-mb-2" v-if="sequence.steps && sequence.steps.length > 1"></div>
            </div>
            <div class="text-smallish bu-is-capitalized bu-ml-4 bu-mb-2" v-if="sequence.steps && sequence.steps.length > 1"> {{sequence.steps[sequence.steps.length - 1].key + " " +sequence.steps[sequence.steps.length - 1].value}}</div>
        </cly-populator-section-detail>
    </div>
    <el-button class="bu-mb-2 populator-template-drawer__btn-add bg-light-blue-100 text-smallish font-weight-bold color-blue-100 el-button--text" :disabled="!isOpen" @click="onAddSequence">{{i18n('populator-template.add-sequence')}}</el-button>
</div>
</template>

<script>
import { i18nMixin, i18n } from "../../../../../../frontend/express/public/javascripts/countly/vue/core.js";
import { notify } from "../../../../../../frontend/express/public/javascripts/countly/countly.helpers.js";

export default {
    mixins: [i18nMixin],
    props: {
        isOpen: {
            type: Boolean,
            default: false
        },
        value: {
            type: [Object, Array],
        },
        parentData: {
            type: [Object, Array],
        },
        sectionActivity: {
            type: Object
        }
    },
    data: function() {
        return {
            sequences: [],
            selectedProperty: '',
            selectedValue: '',
            sequenceStepProperties: [
                {name: "Event", value: "events"},
                {name: "View", value: "views"}
            ],
            sequenceStepValues: {},
            linkedSectionActivity: false
        };
    },
    watch: {
        "parentData": {
            deep: true,
            handler: function(newValue) {
                const eventsHasValue = this.sectionActivity.events && newValue.events && newValue.events.length && newValue.events.filter(x => x.name).length;
                const viewsHasValue = this.sectionActivity.views && newValue.views && newValue.views.length && newValue.views.filter(x => x.name).length;
                if (newValue && eventsHasValue || viewsHasValue) {
                    this.linkedSectionActivity = true;
                }
                else {
                    this.linkedSectionActivity = false;
                }
                this.sequenceStepValues = newValue;
            }
        },
        "sectionActivity": {
            deep: true,
            handler: function(newValue) {
                if (!newValue.events && !newValue.views) { // if both events and views are disabled
                    this.linkedSectionActivity = false;
                    this.sequences.forEach((sequence) => {
                        sequence.steps = sequence.steps.map(step => {
                            if (step.key === "events" || step.key === "views") {
                                step.disabled = true;
                            }
                            return step;
                        });
                    });

                    this.sequenceStepProperties.map((item) => {
                        item.disabled = true;
                    });
                }
                if (newValue.events) {
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "events") {
                            delete item.disabled;
                        }
                    });
                }
                if (newValue.views) {
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "views") {
                            delete item.disabled;
                        }
                    });
                }
            }
        },
        "sectionActivity.events": {
            deep: true,
            handler: function(newValue) {
                if (!newValue) { // if disabled events section
                    this.sequences.forEach((sequence) => {
                        sequence.steps = sequence.steps.map(step => {
                            if (step.key === "events") {
                                step.disabled = true;
                            }
                            return step;
                        });
                    });
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "events") {
                            item.disabled = true;
                        }
                    });
                }
                if (newValue && this.parentData.events.length) {
                    this.linkedSectionActivity = true;
                    this.sequences.forEach((sequence) => {
                        sequence.steps = sequence.steps.map(step => {
                            if (step.key === "events") {
                                delete step.disabled;
                            }
                            return step;
                        });
                    });
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "events") {
                            delete item.disabled;
                        }
                    });
                }
            }
        },
        "sectionActivity.views": {
            deep: true,
            handler: function(newValue) {
                if (!newValue) { // if disabled views section
                    this.sequences.forEach((sequence) => {
                        sequence.steps = sequence.steps.map(step => {
                            if (step.key === "views") {
                                step.disabled = true;
                            }
                            return step;
                        });
                    });
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "views") {
                            item.disabled = true;
                        }
                    });
                }
                if (newValue && this.parentData.views.length) {
                    this.linkedSectionActivity = true;
                    this.sequences.forEach((sequence) => {
                        sequence.steps = sequence.steps.map(step => {
                            if (step.key === "views") {
                                delete step.disabled;
                            }
                            return step;
                        });
                    });
                    this.sequenceStepProperties.map((item) => {
                        if (item.value === "views") {
                            delete item.disabled;
                        }
                    });
                }
            }
        },
        sequences: {
            handler: function(newValue) {
                if (!newValue.length) {
                    this.$parent.isSectionActive = false;
                }
                this.$emit('input', newValue);
            },
            deep: true
        }
    },
    methods: {
        onAddSequence: function() {
            this.sequences.push({steps: [{"key": "session", value: "start", "probability": 100, "fixed": true}, {"key": "session", value: "end", "probability": 100, "fixed": true}]});
        },
        onRemoveSequence(index) {
            this.sequences.splice(index, 1);
            this.$emit('deleted-index', index);
        },
        onRemoveStep: function(index, stepIndex) {
            if (this.sequences[index].steps.length === 3 && this.sequences[index].steps.find(x => x.key === "session" && x.value === "end")) {
                this.sequences[index].steps = this.sequences[index].steps.filter(x => !(x.key === "session" && x.value === "end"));
            }
            if (this.sequences[index].steps.length === 1) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.warning-while-removing-condition"),
                    type: "warning"
                });
                return;
            }
            try {
                this.sequences[index].steps.splice(stepIndex, 1);
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        onAddStep: function() {
            this.selectedProperty = '';
            this.selectedValue = '';
        },
        onDragChange: function() {
        },
        onSaveStep: function(index) {
            this.sequences[index].steps = this.sequences[index].steps.filter(x => x.key !== "session");
            this.sequences[index].steps.push({key: this.selectedProperty, value: this.selectedValue, probability: 0});
            this.sequences[index].steps.unshift({key: "session", value: "start", probability: 100, fixed: true});
            this.sequences[index].steps.push({key: "session", value: "end", probability: 100, fixed: true});
            this.onClose();
        },
        onClose: function() {
            document.getElementById('populator-template-step').click();
        },
        checkMove: function(e) {
            return this.isDraggable(e.draggedContext);
        },
        isDraggable: function(context) {
            const { index, futureIndex } = context;
            return !(this.sequences[0].steps[index].fixed || this.sequences[0].steps[futureIndex].fixed);
        }
    },
    created: function() {
        if (this.value && Object.keys(this.value).length) {
            this.sequences = this.value;
            this.linkedSectionActivity = true;
        }
        else {
            this.$parent.isSectionActive = false;
            this.linkedSectionActivity = false;
        }
        this.sequenceStepValues = this.parentData;
        if (this.parentData && this.parentData.behavior && this.parentData.behavior.sequences && this.parentData.behavior.sequences.length) {
            this.parentData.behavior.sequences.forEach((item) => {
                if (item && item.disabled) {
                    this.$parent.isSectionActive = false;
                }
            });
        }
    }
};
</script>
