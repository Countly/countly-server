<template>
<div class="populator-template populator-template__views">
    <cly-populator-section-detail  v-if="isOpen" class="bu-mb-3 populator-template__views--property-section" :title="i18n('populator-template.view-details')" entity="View" @remove="() => onRemoveView(index)" :key="index" v-for="(view, index) in views">
        <div class="bu-mt-2">
            <div>
              <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.view-name')}}</span>
              <cly-tooltip-icon :tooltip="i18n('populator-template.view-name-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
            </div>
            <div class="bu-mt-2">
              <validation-provider name="name" rules="required" v-slot="v">
                  <el-input style="width: 100%;" :placeholder="i18n('populator-template.enter-your-view-name')" class="input" v-model="view.key" :class="{'is-error': v.errors.length > 0}"></el-input>
              </validation-provider>
            </div>
            <div class="populator-template__views--segmentation-section">
                <div class="bu-container populator-template__views--duration-and-sum-container">
                    <div class="bu-columns bu-p-3">
                        <div class="left-container bu-level-left bu column bu-is-6">
                            <el-checkbox v-model="view.duration.isActive">
                                <span class="text-smallish">{{ i18n('populator.duration-help-title') }}</span>
                            </el-checkbox>
                            <span class="duration-text">{{ i18n('populator.duration-help-subtitle') }}</span>
                        </div>
                        <div class="right-container bu-level-right bu-column bu-is-5 bu-is-align-items-start"">
                            <el-input :disabled="!view.duration.isActive" v-model="view.duration.minDurationTime" class="bu-is-shadowless duration-input"></el-input>
                            <span class="bu-p-1">-</span>
                            <el-input :disabled="!view.duration.isActive" class="bu-is-shadowless duration-input" v-model="view.duration.maxDurationTime"></el-input>
                        </div>
                    </div>
                </div>
                <hr class="divider bu-mt-5">
                <div class="bu-mt-4" v-if="view.segmentations.length">
                    <span class="text-small text-uppercase populator-template-drawer__text-custom-detail">{{i18n('populator-template.segment-details')}}</span>
                    <div class="bu-mb-4" v-for="(segment, segmentIndex) in view.segmentations">
                        <div>
                            <div class="bu-is-flex bu-is-justify-content-space-between bu-mt-4">
                                <div class="bu-mr-2">
                                <div>
                                    <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.segment-name')}}</span>
                                    <cly-tooltip-icon :tooltip="i18n('populator-template.segment-name-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                </div>
                                <div class="bu-mt-2">
                                    <validation-provider name="name" rules="required" v-slot="v">
                                        <el-input class="input" v-model="segment.key" :class="{'is-error': v.errors.length > 0}"></el-input>
                                    </validation-provider>
                                </div>
                                </div>
                                <div class="bu-mr-2">
                                    <div>
                                    <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.segment-values')}}</span>
                                    <cly-tooltip-icon :tooltip="i18n('populator-template.segment-values-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                    </div>
                                    <div class="bu-mt-2" v-for="(value, valIndex) in segment.values">
                                    <el-input class="input" v-model="value.key" :placeholder="i18n('populator-template.empty-unset')"></el-input>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                                        <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                    </div>
                                    <div v-for="(value, valueIndex) in segment.values">
                                        <div class="bu-is-flex">
                                            <div class="bu-mt-2">
                                                <validation-provider name="probability" rules="required|integer|min_value:0|max_value:100" v-slot="v">
                                                    <el-input class="input" v-model="value.probability" :class="{'is-error': v.errors.length > 0}">
                                                        <template slot="suffix">
                                                            <span class="text-medium color-cool-gray-50">%</span>
                                                        </template>
                                                    </el-input>
                                                </validation-provider>
                                            </div>
                                            <div class="override-buttons">
                                                <i class="el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveSegment(index, segmentIndex, valueIndex)"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bu-is-flex bu-is-justify-content-center bu-mt-4 bu-mb-3 btn-another-value-wrapper override-buttons">
                            <el-button type="text" class="bu-p-0 text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddAnotherValue(index, segmentIndex)">{{i18n('populator-template.add-another-value')}}</el-button>
                        </div>
                        <hr class="divider">
                        <div v-for="(condition, conditionIndex) in segment.conditions" class="populator-template__views--condition">
                            <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-baseline">
                                <div class="bu-mr-5"></div>
                                <div class="text-smallish bu-has-text-weight-medium bu-ml-1 bu-mb-4 condition-label">{{ condition.conditionType === 1 ? i18n('populator-template.condition-is', condition.selectedKey, condition.selectedValue) : i18n('populator-template.condition-is-not', condition.selectedKey, condition.selectedValue) }}</div>
                                <el-button type="text" @click="onDeleteCondition(index, segmentIndex, conditionIndex)" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template--btn-delete el-button--text"> {{i18n('populator-template.delete-condition')}} </el-button>
                            </div>
                            <div class="bu-is-flex bu-is-justify-content-flex-end">
                                <div class="bu-mr-2">
                                    <span class="text-smallish bu-has-text-weight-medium">{{ i18n('populator-template.values') }}</span>
                                    <cly-tooltip-icon :tooltip="i18n('populator-template.condition-value-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                    <div class="bu-mt-2" v-for="(segmentValue, segmentValueIndex) in condition.values">
                                        <el-input class="input" v-model="segmentValue.key" :placeholder="i18n('populator-template.empty-unset')"></el-input>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                                        <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                    </div>
                                    <div>
                                        <div class="bu-is-flex" v-for="(segmentValue, segmentValueIndex) in condition.values">
                                            <div class="bu-mt-2">
                                                <validation-provider name="probability" rules="required|integer|min_value:0|max_value:100" v-slot="v">
                                                    <el-input class="input" v-model="segmentValue.probability" :class="{'is-error': v.errors.length > 0}">
                                                        <template slot="suffix">
                                                            <span class="text-medium color-cool-gray-50">%</span>
                                                        </template>
                                                    </el-input>
                                                </validation-provider>
                                            </div>
                                            <div class="override-buttons">
                                                <i class="el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveConditionValue(index, segmentIndex, segmentValueIndex, conditionIndex)"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bu-is-flex bu-is-justify-content-center bu-mt-4 bu-mb-3 btn-another-value-wrapper override-buttons">
                                <el-button type="text" class=" bu-p-0 text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddAnotherConditionValue(index, segmentIndex, conditionIndex)">{{i18n('populator-template.add-another-value')}}</el-button>
                            </div>
                            <hr class="divider">
                        </div>
                        <div class="bu-mt-3 bu-is-flex bu-is-justify-content-center" v-if="!segment.condition">
                            <cly-populator-condition-selector
                                :disabled="views[index].segmentations.length > 1 ? false : true"
                                :condition-properties="views[index].segmentations[segmentIndex].conditions && views[index].segmentations[segmentIndex].conditions.length && views[index].segmentations[segmentIndex].conditions[0] ? [views[index].segmentations[segmentIndex].conditions[0].selectedKey] : views[index].segmentations.filter(item=>item.key !== segment.key && item.key.length).map(item => item.key)"
                                :condition-property-values="conditionPropertyValues"
                                @selected-key-change="(param) => onConditionSelectedKeyChange(param, index)"
                                v-model="segment.conditions">
                            </cly-populator-condition-selector>
                        </div>
                        <hr class="divider">
                    </div>
                </div>
                <div class="bu-my-2 btn-another-value-wrapper override-buttons">
                    <el-button type="text" class="bu-p-0 text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddViewSegmentation(index)">{{i18n('populator.add-segmentation')}}</el-button>
                </div>
            </div>
        </div>
    </cly-populator-section-detail>
    <el-button :disabled="!isOpen" class="populator-template-drawer__btn-add bg-light-blue-100 text-smallish font-weight-bold color-blue-100 el-button--text" @click="onAddView()">{{ i18n("populator-template.add-view") }}</el-button>
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
        }
    },
    data: function() {
        return {
            views: [],
            conditionPropertyValues: []
        };
    },
    watch: {
        views: {
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
        onAddView: function() {
            this.views.push({
                "key": "",
                "duration": { isActive: false, minDurationTime: 0, maxDurationTime: 0 },
                "segmentations": []
            });
        },
        checkRemoveValue: function(key, value, index) {
            let usedProperties = [];
            if (this.value[index] && this.value[index].segmentations) {
                this.value[index].segmentations.forEach(function(item) {
                    if (item.conditions && item.conditions.length) {
                        item.conditions.forEach(function(condition) {
                            if (condition.selectedKey === key && (value === undefined || condition.selectedValue === value)) {
                                usedProperties.push("views");
                            }
                        });
                    }
                });
            }

            // check if it is used in sequence section
            else if (index === undefined && value === undefined) {
                for (const item of this.parentData) {
                    const steps = item.steps;
                    for (const step of steps) {
                        if (step.key === 'views' && step.value === key) {
                            usedProperties.push('sequence');
                            break;
                        }
                    }
                }
            }
            if (usedProperties.length) {
                const occurrenceCount = usedProperties.reduce((acc, item) => {
                    acc[item] = (acc[item] || 0) + 1;
                    return acc;
                }, {});

                const checkedConditionResult = Object.entries(occurrenceCount).map(([k, v]) => `${v} times in "${k}"`);
                return checkedConditionResult;
            }
            return "";
        },
        onRemoveView: function(index) {
            const checkedConditionList = this.checkRemoveValue(this.views[index].key);
            if (checkedConditionList.length) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                    type: "warning",
                    sticky: true
                });
                return;
            }
            this.views.splice(index, 1);
        },
        onAddViewSegmentation: function(index) {
            this.views[index].segmentations.push({
                "key": "",
                "values": [{key: "", probability: 0}],
            });
        },
        onRemoveSegment: function(index, segmentIndex, valueIndex) {
            try {
                const checkedConditionList = this.checkRemoveValue(this.views[index].segmentations[segmentIndex].key, this.views[index].segmentations[segmentIndex].values[valueIndex].key, index);
                if (checkedConditionList.length) {
                    notify({
                        title: i18n("common.error"),
                        message: i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                        type: "warning",
                        sticky: true
                    });
                    return;
                }
                if (this.views[index].segmentations[segmentIndex].values.length === 1) {
                    this.views[index].segmentations.splice(segmentIndex, 1);
                    return;
                }
                this.views[index].segmentations[segmentIndex].values.splice(valueIndex, 1);
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        onAddAnotherValue: function(index, valueIndex) {
            try {
                this.views[index].segmentations[valueIndex].values.push({key: "", probability: 0});
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-adding-condition"),
                    type: "error"
                });
            }
        },
        onAddAnotherConditionValue: function(index, segmentIndex, conditionIndex) {
            this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.push({key: "", probability: 0});
        },
        onRemoveConditionValue: function(index, segmentIndex, valueIndex, conditionIndex) {
            try {
                if (this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.length === 1) {
                    this.views[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
                }
                else {
                    this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.splice(valueIndex, 1);
                }
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        onDeleteCondition: function(index, segmentIndex, conditionIndex) {
            this.views[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
        },
        onConditionSelectedKeyChange: function(selectedConditionProp, index) {
            const item = this.views[index].segmentations.find(segment => segment.key === selectedConditionProp);
            if (item) {
                this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
            }
        }
    },
    created() {
        this.views = this.value;
        if (this.parentData && this.parentData.length) {
            this.parentData.forEach((item) => {
                item.steps.forEach((step) => {
                    if (step.key === "views" && step.disabled) {
                        this.$parent.isSectionActive = false;
                    }
                });
            });
        }
    }
};
</script>
