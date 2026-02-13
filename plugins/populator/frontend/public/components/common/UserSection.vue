<template>
<div class="bu-mt-3 populator-template populator-template__users">
    <slot name="default"></slot>
    <div class="text-big bu-has-text-weight-medium bu-mt-5 bu-mb-4">{{i18n("populator.custom-user-props")}}</div>
    <cly-populator-section-detail class="bu-mb-4 populator-template__users--property-section" :title="i18n('populator-template.property-details')" entity="Property" @remove="() => onRemoveUserProperty(index)" :key="index" v-for="(user, index) in users">
        <div class="bu-is-flex bu-is-justify-content-space-between bu-mt-2">
            <div class="bu-mr-2">
              <div>
                <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.user-prop-name')}}</span>
                <cly-tooltip-icon :tooltip="i18n('populator-template.user-prop-name-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
              </div>
              <div class="bu-mt-2">
                <validation-provider name="name" rules="required" v-slot="v">
                    <el-input class="input" v-model="user.key" :class="{'is-error': v.errors.length > 0}" :placeholder="i18n('populator-template.user-property-name-placeholder')"></el-input>
                </validation-provider>
              </div>
            </div>
            <div class="bu-mr-2">
                <div>
                  <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.values')}}</span>
                  <cly-tooltip-icon :tooltip="i18n('populator-template.values-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                </div>
                <div class="bu-mt-2" v-for="(value, index) in user.values">
                  <el-input class="input" v-model="value.key" :placeholder="i18n('populator-template.empty-unset')"></el-input>
                </div>
            </div>
            <div>
                <div>
                    <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                    <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                </div>
                <div>
                    <div class="bu-is-flex" v-for="(value, valueIndex) in user.values">
                        <div class="bu-mt-2">
                            <validation-provider name="probability" v-slot="v" rules="required|integer|min_value:0|max_value:100">
                                <el-input class="input" v-model="value.probability" :class="{'is-error': v.errors.length > 0}">
                                  <template slot="suffix">
                                    <span class="text-medium color-cool-gray-50">%</span>
                                  </template>
                                </el-input>
                            </validation-provider>
                        </div>
                        <div class="override-buttons">
                            <i class="el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveValue(index, valueIndex)"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="bu-is-flex bu-is-justify-content-center bu-mt-4 bu-mb-3 btn-another-value-wrapper override-buttons">
            <el-button type="text" class="text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddAnotherValue(index)">{{i18n('populator-template.add-another-value')}}</el-button>
        </div>
        <hr class="divider">
        <div v-for="(condition, conditionIndex) in user.conditions" class="populator-template__users--condition">
            <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-baseline">
                <div class="bu-mr-5"></div>
                <div class="text-smallish bu-has-text-weight-medium bu-ml-1 bu-mb-4 condition-label">{{ condition.conditionType === 1 ? i18n('populator-template.condition-is', condition.selectedKey, condition.selectedValue) : i18n('populator-template.condition-is-not', condition.selectedKey, condition.selectedValue) }}</div>
                <el-button type="text" @click="onDeleteCondition(index, conditionIndex)" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template--btn-delete el-button--text"> {{i18n('populator-template.delete-condition')}} </el-button>
            </div>
            <div class="bu-is-flex bu-is-justify-content-flex-end">
                <div class="bu-mr-2">
                    <span class="text-smallish bu-has-text-weight-medium">{{ i18n('populator-template.values') }}</span>
                    <cly-tooltip-icon :tooltip="i18n('populator-template.condition-value-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                    <div class="bu-mt-2" v-for="(value, valueIndex) in condition.values">
                        <el-input class="input" v-model="value.key" :placeholder="i18n('populator-template.empty-unset')"></el-input>
                    </div>
                </div>
                <div>
                    <div>
                        <span class="text-smallish bu-has-text-weight-medium">{{i18n('populator-template.probability')}}</span>
                        <cly-tooltip-icon :tooltip="i18n('populator-template.probability-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                    </div>
                    <div>
                        <div class="bu-is-flex" v-for="(value, valueIndex) in condition.values">
                            <div class="bu-mt-2">
                                <validation-provider name="probability" v-slot="v" rules="required|integer|min_value:0|max_value:100">
                                    <el-input class="input" v-model="value.probability" :class="{'is-error': v.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="text-medium color-cool-gray-50">%</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </div>
                            <div class="override-buttons">
                                <i class="el-icon-close bu-has-text-weight-bold color-cool-gray-50 close-button" @click="onRemoveConditionValue(index, valueIndex, conditionIndex)"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bu-is-flex bu-is-justify-content-center bu-mt-4 bu-mb-3 btn-another-value-wrapper override-buttons">
                <el-button type="text" class="text-smallish font-weight-bold color-blue-100 btn-another-value" @click="onAddAnotherConditionValue(index, conditionIndex)">{{i18n('populator-template.add-another-value')}}</el-button>
            </div>
            <hr class="divider">
        </div>
        <div class="bu-mt-3 bu-is-flex bu-is-justify-content-center">
            <cly-populator-condition-selector
                :disabled="users.length > 1 ? false : true"
                :condition-properties="users[index].conditions && users[index].conditions.length ? [users[index].conditions[0].selectedKey] : users.filter(item=>item.key !== user.key && item.key.length).map(item => item.key)"
                @selected-key-change="onConditionSelectedKeyChange"
                :condition-property-values="conditionPropertyValues"
                v-model="user.conditions">
            </cly-populator-condition-selector>
        </div>
    </cly-populator-section-detail>
    <el-button class="populator-template-drawer__btn-add bg-light-blue-100 text-smallish font-weight-bold color-blue-100 el-button--text" @click="onAddUserProperty()">{{ i18n("populator.add-custom-prop") }}</el-button>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import ClyTooltipIcon from '../../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import SectionDetail from './SectionDetail.vue';
import ConditionSelector from './ConditionSelector.vue';

export default {
    components: {
        ClyTooltipIcon,
        'cly-populator-section-detail': SectionDetail,
        'cly-populator-condition-selector': ConditionSelector
    },
    mixins: [i18nMixin],
    props: {
        value: {
            type: [Object, Array],
            default: function() {
                return [];
            }
        },
        parentData: {
            type: [Object, Array],
        }
    },
    data: function() {
        return {
            users: [],
            conditionPropertyValues: []
        };
    },
    created() {
        this.users = this.value;
    },
    watch: {
        users: {
            handler: function(newValue) {
                this.onUserPropertiesChange(newValue);
            },
            deep: true
        }
    },
    methods: {
        onUserPropertiesChange: function(newValue) {
            this.$emit('input', newValue);
        },
        onRemoveUserProperty: function(index) {
            try {
                const checkedConditionList = this.checkRemoveValue(this.users[index].key);
                if (checkedConditionList.length) {
                    notify({
                        title: i18n("common.error"),
                        message: i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                        type: "warning",
                        sticky: true
                    });
                    return;
                }
                this.users.splice(index, 1);
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        onAddUserProperty: function() {
            this.users.push({
                "key": "",
                "values": [{key: "", probability: 0}],
            });
        },
        onAddAnotherValue: function(index) {
            this.users[index].values.push({key: "", probability: 0});
        },
        checkRemoveValue: function(key, value) {
            let usedProperties = [];
            this.users.forEach(function(item) {
                if (item.conditions && item.conditions.length) {
                    item.conditions.forEach(function(condition) {
                        if (condition.selectedKey === key && (value === undefined || condition.selectedValue === value)) {
                            usedProperties.push("user");
                        }
                    });
                }
            });
            this.parentData.generalConditions.forEach(function(item) {
                if (item.selectedKey === key && (value === undefined || item.selectedValue === value)) {
                    usedProperties.push("behavior");
                }
            });
            this.parentData.sequenceConditions.forEach(function(item) {
                if (item.selectedKey === key && (value === undefined || item.selectedValue === value)) {
                    usedProperties.push("behavior");
                }
            });

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
        onRemoveValue: function(index, valueIndex) {
            const checkedConditionList = this.checkRemoveValue(this.users[index].key, this.users[index].values[valueIndex].key);
            if (checkedConditionList.length) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                    type: "warning",
                    sticky: true
                });
                return;
            }
            if (this.users[index].values.length === 1) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.warning-while-removing-condition"),
                    type: "warning"
                });
                return;
            }
            try {
                this.users[index].values.splice(valueIndex, 1);
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-removing-value"),
                    type: "error"
                });
            }
        },
        onDeleteCondition: function(index, conditionIndex) {
            this.users[index].conditions.splice(conditionIndex, 1);
        },
        onRemoveConditionValue: function(index, valueIndex, conditionIndex) {
            try {
                if (this.users[index].conditions[conditionIndex].values.length === 1) {
                    this.users[index].conditions.splice(conditionIndex, 1);
                }
                else {
                    this.users[index].conditions[conditionIndex].values.splice(valueIndex, 1);
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
        onAddAnotherConditionValue: function(index, conditionIndex) {
            try {
                this.users[index].conditions[conditionIndex].values.push({key: "", probability: 0});
            }
            catch (error) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.error-while-adding-condition"),
                    type: "error"
                });
            }
        },
        onConditionSelectedKeyChange: function(selectedConditionProp) {
            const item = this.users.find(user => user.key === selectedConditionProp);
            if (item) {
                this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
            }
        }
    }
};
</script>
