<template>
<div class="populator-template populator-template__behavior">
    <div v-if="isOpen">
        <cly-populator-section-detail :title="i18n('populator-template.general')" class="bu-mb-4" key="general-behavior">
            <div class="populator-template__behavior--main-container">
                <span class="text-smallish bu-has-text-weight-medium session-running-header">{{i18n('populator-template.time-between-runs')}}</span>
                <div class="bu-is-flex bu-is-align-items-center bu-mt-2">
                    <validation-provider name="probability" rules="required|integer|min_value:0" v-slot="v">
                        <el-input class="bu-mr-2 populator-template__behavior--session-input-container" :class="{'is-error': v.errors.length > 0}" v-model="behavior.runningSession[0]">
                            <template slot="suffix">
                                <span class="text-medium color-cool-gray-50">{{i18n('populator-template.hour')}}</span>
                            </template>
                        </el-input>
                    </validation-provider>
                    -
                    <validation-provider name="probability" rules="required|integer|min_value:0" v-slot="v">
                        <el-input class="bu-ml-2 populator-template__behavior--session-input-container" :class="{'is-error': v.errors.length > 0}" v-model="behavior.runningSession[1]">
                            <template slot="suffix">
                                <span class="text-medium color-cool-gray-50">{{i18n('populator-template.hour')}}</span>
                            </template>
                        </el-input>
                    </validation-provider>
                </div>
                <div v-if="behavior.generalConditions.length" v-for="(item, index) in behavior.generalConditions">
                    <div class="populator-template__behavior--general-conditions bu-is-flex bu-is-align-items-baseline bu-is-justify-content-start bu-mt-4">
                    <div class="condition-label text-smallish bu-has-text-weight-medium bu-ml-1 bu-mt-5">{{ item.conditionType === 1 ? i18n('populator-template.condition-is', item.selectedKey, item.selectedValue) : i18n('populator-template.condition-is-not', item.selectedKey, item.selectedValue) }}</div>
                        <div class="bu-is-align-items-center bu-mt-2 bu-is-flex bu-ml-4">
                            <validation-provider name="hour" rules="required|integer|min_value:0" v-slot="v">
                                <el-input class="populator-template__behavior--session-input-container bu-mr-2" v-model="item.values[0]" :class="{'is-error': v.errors.length > 0}">
                                    <template slot="suffix">
                                        <span class="text-medium color-cool-gray-50">{{i18n('populator-template.hour')}}</span>
                                    </template>
                                </el-input>
                            </validation-provider>
                            -
                            <validation-provider name="hour" rules="required|integer|min_value:0" v-slot="v">
                                <el-input class="populator-template__behavior--session-input-container bu-ml-2" v-model="item.values[1]" :class="{'is-error': v.errors.length > 0}">
                                    <template slot="suffix">
                                        <span class="text-medium color-cool-gray-50">{{i18n('populator-template.hour')}}</span>
                                    </template>
                                </el-input>
                            </validation-provider>
                            <div class="override-buttons">
                                <i class="el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveConditionValue(behaviourSectionEnum.GENERAL, index)"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="divider bu-mt-5">
                <div class="bu-mt-3 bu-is-flex bu-is-justify-content-center">
                <cly-populator-condition-selector
                    :disabled="isConditionDisabled"
                    :condition-properties="parentData.users.map(item => item.keys)"
                    @selected-key-change="onConditionSelectedKeyChange"
                    :condition-property-values="conditionPropertyValues"
                    :type="behaviourSectionEnum.GENERAL"
                    @save-condition="saveCondition"
                    v-model="behavior.generalConditions">
                </cly-populator-condition-selector>
                </div>
            </div>
        </cly-populator-section-detail>
        <cly-populator-section-detail :title="i18n('populator-template.sequence-probabilities')" class="bu-mt-4" key="sequence-behavior">
            <div v-if="behavior.sequences.length" class="populator-template__behavior--sequences-container">
                <div class="bu-is-flex bu-mt-4">
                    <div class="sequence-text">
                        <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.sequences')}}</span>
                    </div>
                    <div>
                        <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                        <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                    </div>
                </div>
                <div class="bu-mt-2" v-for="(sequence, sequenceIndex) in behavior.sequences">
                    <div class="bu-is-flex bu-is-align-items-center">
                        <span class="text-smallish bu-is-capitalized sequence-text" :class="{'color-cool-gray-50': sequence.disabled}">
                            {{ sequence.key === 'random' ? i18n('populator-template.random-sequence') : i18n('populator-template.sequence-incremental', sequenceIndex + 1) }}
                        </span>
                        <validation-provider name="probability_sequence_value" rules="required|integer|min_value:0|max_value:100" v-slot="v">
                            <el-input v-model="sequence.probability" :disabled="sequence.disabled" class="sequence-probability" :class="{'is-error': v.errors.length > 0}">
                                <template slot="suffix">
                                    <span class="text-medium color-cool-gray-50">%</span>
                                </template>
                            </el-input>
                        </validation-provider>
                    </div>
                </div>
            </div>
            <div v-if="behavior.sequenceConditions.length" class="populator-template__behavior--sequence-conditions">
                <hr class="divider bu-my-5">
                <div v-for="(item, index) in behavior.sequenceConditions" :class="{'bu-mb-6' : index !== (behavior.sequenceConditions.length - 1)}">
                    <div class="bu-is-flex bu-is-justify-content-end bu-is-align-items-center">
                        <div class="text-smallish bu-has-text-weight-medium condition-label">{{ item.conditionType === 1 ? i18n('populator-template.condition-is', item.selectedKey, item.selectedValue) : i18n('populator-template.condition-is-not', item.selectedKey, item.selectedValue) }}</div>
                        <div>
                            <el-button type="text" @click="onDeleteCondition(index)" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template--btn-delete delete-condition el-button--text"> {{i18n('populator-template.delete-condition')}} </el-button>
                        </div>
                    </div>
                    <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-end condition-values">
                        <div class="bu-mt-2" v-for="(value, valueIndex) in item.values">
                            <div class="bu-is-flex bu-is-align-items-center">
                                <span class="text-smallish bu-is-capitalized sequence-condition-label" :class="{'color-cool-gray-50': value.disabled}">
                                    {{ value.key === 'random' ? i18n('populator-template.random-sequence') : i18n('populator-template.sequence-incremental', valueIndex + 1) }}
                                </span>
                                <validation-provider name="probability_sequence_condition" rules="required|integer|min_value:0|max_value:100" v-slot="v">
                                    <el-input v-model="value.probability" :disabled="value.disabled" class="sequence-condition-probability" :class="{'is-error': v.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="text-medium color-cool-gray-50">%</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <hr class="divider bu-my-5">
            <div class="bu-is-flex bu-is-justify-content-center">
                <cly-populator-condition-selector
                    :disabled="isConditionDisabled"
                    :condition-properties="parentData.users.map(item => item.keys)"
                    @selected-key-change="onConditionSelectedKeyChange"
                    :type="behaviourSectionEnum.SEQUENCE"
                    @save-condition="saveCondition"
                    :condition-property-values="conditionPropertyValues"
                    v-model="behavior.sequenceConditions">
                </cly-populator-condition-selector>
            </div>
        </cly-populator-section-detail>
    </div>
</div>
</template>

<script>
import { i18nMixin, i18n } from "../../../../../../frontend/express/public/javascripts/countly/vue/core.js";
import { notify } from "../../../../../../frontend/express/public/javascripts/countly/countly.helpers.js";
import ClyTooltipIcon from "../../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue";
import SectionDetail from "./SectionDetail.vue";
import ConditionSelector from "./ConditionSelector.vue";

export default {
    components: {
        ClyTooltipIcon,
        'cly-populator-section-detail': SectionDetail,
        'cly-populator-condition-selector': ConditionSelector
    },
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
        deletedIndex: {
            type: String,
        },
        sectionActivity: {
            type: [Boolean, Object]
        }
    },
    watch: {
        "sectionActivity": {
            deep: true,
            handler: function(newValue) {
                if (!newValue) { // if disabled sequences section
                    this.behavior.sequences.forEach((item, index) => {
                        if (item.key !== "random") {
                            this.behavior.sequences[index].disabled = true;
                        }
                    });
                    this.behavior.sequenceConditions.forEach((item, index) => {
                        item.values.forEach((valueItem, valueIndex) => {
                            if (valueItem.key !== "random") {
                                this.behavior.sequenceConditions[index].values[valueIndex].disabled = true;
                            }
                        });
                    });
                }
                else { // if enabled sequences section
                    this.behavior.sequences.forEach((item, index) => {
                        if (item.key !== "random") {
                            delete this.behavior.sequences[index].disabled;
                        }
                    });
                    this.behavior.sequenceConditions.forEach((item, index) => {
                        item.values.forEach((valueItem, valueIndex) => {
                            if (valueItem.key !== "random") {
                                delete this.behavior.sequenceConditions[index].values[valueIndex].disabled;
                            }
                        });
                    });
                }
            }
        },
        behavior: {
            handler: function(newValue) {
                this.$emit('input', newValue);
            },
            deep: true,
        },
        deletedIndex: function(newValue) {
            if (!newValue || !newValue.length) {
                return;
            }
            const index = parseInt(newValue.split("_")[0], 10);
            this.behavior.sequences.splice(index, 1);
            this.behavior.sequenceConditions.forEach((item) => {
                item.values.splice(index, 1);
            });
            if (!this.behavior.sequences.length) {
                const indexToRemove = this.behavior.sequences.findIndex(item => item.key === "random");
                if (indexToRemove !== -1) {
                    this.behavior.sequences.splice(indexToRemove, 1);
                    this.behavior.sequenceConditions.forEach((item) => {
                        item.values.splice(indexToRemove, 1);
                    });
                }
            }
            // re-indexing the sequences after deletion
            this.behavior.sequences.filter(x=>x.key !== 'random').forEach((sequence, idx) => {
                sequence.key = "Sequence_" + (idx + 1);
            });
            this.behavior.sequenceConditions.forEach((item) => {
                item.values.filter(x=>x.key !== 'random').forEach((sequence, idx) => {
                    sequence.key = "Sequence_" + (idx + 1);
                });
            });
        },
        "parentData": {
            deep: true,
            handler: function(newValue) {
                const usersUndefinedOrEmpty = typeof newValue.users === 'undefined' || newValue.users.length === 0;

                if (usersUndefinedOrEmpty) {
                    this.isConditionDisabled = true;
                }
                else {
                    this.isConditionDisabled = false;
                }
                if (newValue.sequences && newValue.sequences.length) {
                    // adding a new sequence
                    if (newValue.sequences.length > this.behavior.sequences.filter(obj => obj.key !== 'random').length) {
                        const indexToRemove = this.behavior.sequences.findIndex(item => item.key === "random");
                        if (indexToRemove !== -1) {
                            this.behavior.sequences.splice(indexToRemove, 1);
                            this.behavior.sequenceConditions.forEach((item) => {
                                item.values.splice(indexToRemove, 1);
                            });
                        }
                        this.behavior.sequences.push({key: 'Sequence_' + (this.behavior.sequences.length + 1), probability: 0});
                        if (this.behavior.sequenceConditions.length) {
                            this.behavior.sequenceConditions.forEach((item) => {
                                item.values.push({key: 'Sequence_' + this.behavior.sequences.length, probability: 0});
                            });
                        }
                    }
                    if (!this.behavior.sequences.find(item => item.key === 'random')) {
                        this.behavior.sequences.push({key: 'random', probability: 0});
                    }
                    if (this.behavior.sequenceConditions.length) {
                        this.behavior.sequenceConditions.forEach((item) => {
                            if (!item.values.find(valueItem => valueItem.key === 'random')) {
                                item.values.push({key: 'random', probability: 0});
                            }
                        });
                    }
                }
            },
        }
    },
    data: function() {
        return {
            behavior: {},
            behaviourSectionEnum: {
                GENERAL: "general",
                SEQUENCE: "sequence"
            },
            conditionPropertyValues: [],
            isConditionDisabled: false,
        };
    },
    methods: {
        onConditionSelectedKeyChange: function(selectedConditionProp) {
            const item = this.parentData.users.find(user => user.keys === selectedConditionProp);
            if (item) {
                this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
            }
        },
        onRemoveConditionValue: function(type, index) {
            if (type === this.behaviourSectionEnum.GENERAL) {
                this.behavior.generalConditions.splice(index, 1);
            }
            else {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        saveCondition: function(type, selectedProperty, selectedValue, conditionType) {
            if (type === this.behaviourSectionEnum.GENERAL) {
                this.behavior.generalConditions.push({
                    selectedKey: selectedProperty,
                    selectedValue: selectedValue,
                    conditionType: conditionType,
                    values: [0, 0]
                });
            }
            else if (type === this.behaviourSectionEnum.SEQUENCE) {
                this.behavior.sequenceConditions.push({
                    selectedKey: selectedProperty,
                    selectedValue: selectedValue,
                    conditionType: conditionType,
                    values: JSON.parse(JSON.stringify(this.behavior.sequences)) // deep cloning to prevent the reference
                });
            }
            else {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-adding-condition"),
                    type: "error"
                });
            }
        },
        onDeleteCondition: function(index) {
            this.behavior.sequenceConditions.splice(index, 1);
        }
    },
    created: function() {
        if (this.value && Object.keys(this.value).length) {
            this.behavior = this.value;
        }
        else {
            this.behavior = {
                "runningSession": [null, null],
                "generalConditions": [],
                "sequences": [{key: "random", probability: 100}],
                "sequenceConditions": []
            };
        }
    },
};
</script>
