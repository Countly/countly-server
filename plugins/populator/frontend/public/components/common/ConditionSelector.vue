<template>
<div>
    <el-popover
        placement="bottom"
        width="288"
        popper-class="populator-condition-selector__popover"
        transition="stdt-fade"
        trigger="click">
        <template v-slot:default>
            <div class="bu-p-5">
                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n('populator-template.property')}}</div>
                <el-select v-model="selectedProperty" @change="onSelectedKeyChange" style="width: 100%" :placeholder="i18n('populator.template.select-a-user-property')">
                    <el-option
                        v-for="item in conditionProperties"
                        :key="item"
                        :label="item"
                        :value="item">
                    </el-option>
                </el-select>
                <cly-populator-number-selector class="bu-my-4" v-model="conditionType" :items="items"></cly-populator-number-selector>
                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n('populator-template.property-value')}}</div>
                <el-select v-model="selectedValue" style="width: 100%" :placeholder="i18n('populator.template.select-a-user-property-value')">
                    <el-option
                        v-for="item in conditionPropertyValueItems"
                        :key="item"
                        :label="item"
                        :value="item">
                    </el-option>
                </el-select>
                <div class="bu-mt-5 bu-is-flex bu-is-justify-content-flex-end">
                    <el-button class="el-button el-button--secondary el-button--small" @click="close">{{i18n('common.cancel')}}</el-button>
                    <el-button class="el-button el-button--success el-button--small" :disabled="selectedValue.length ? false : true" @click="save">{{i18n('common.add')}}</el-button>
                </div>
            </div>
        </template>
        <template v-slot:reference>
            <el-button :disabled="disabled" type="text" slot="reference" @click="onAddCondition" id="addConditionBtn" class="text-smallish font-weight-bold color-blue-100">
                <i class="fa fa-plus-circle bu-mr-1"></i>{{i18n('populator-template.add-condition')}}
            </el-button>
        </template>
    </el-popover>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import NumberSelector from './NumberSelector.vue';

export default {
    components: {
        'cly-populator-number-selector': NumberSelector
    },
    mixins: [i18nMixin],
    props: {
        value: {
            type: [Object, Array],
            default: function() {
                return {};
            }
        },
        conditionProperties: {
            type: Array,
            default: function() {
                return [];
            },
        },
        conditionPropertyValues: {
            type: Array,
            default: function() {
                return [];
            },
        },
        disabled: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: '',
            required: false
        }
    },
    data: function() {
        return {
            items: [
                { value: 1, text: "is equal to" },
                { value: -1, text: "is not equal to" }
            ],
            conditionType: 1,
            selectedValue: '',
            selectedProperty: '',
            conditionPropertyValueItems: []
        };
    },
    watch: {
        conditionPropertyValues: {
            handler: function(newValue) {
                this.conditionPropertyValueItems = newValue;
                this.conditionPropertyValueItems = this.conditionPropertyValueItems.map(item => (item === '' ? null : item));
                if (this.conditionPropertyValueItems.length && this.conditionPropertyValueItems.indexOf(null) !== -1) {
                    const filteredArr = this.conditionPropertyValueItems.filter((item) => item !== null);
                    this.conditionPropertyValueItems = ['Empty/Unset', ...filteredArr];
                }
            },
            deep: true
        }
    },
    methods: {
        close: function() {
            document.querySelector('[data-test-id="populator-template-form-header-title"]').click();
        },
        save: function() {
            if (this.value.length && this.value.filter(item => item.selectedKey === this.selectedProperty && item.selectedValue === this.selectedValue && item.conditionType === this.conditionType).length) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("populator-template.condition-already-exists"),
                    type: "warning",
                });
                return;
            }
            let conditions = this.value.length ? this.value : [];
            const isBehaviorSection = this.$parent.$parent.behavior ? true : false;
            if (isBehaviorSection) {
                this.$emit('save-condition', this.type, this.selectedProperty, this.selectedValue, this.conditionType);
            }
            else {
                conditions.push({
                    selectedKey: this.selectedProperty,
                    selectedValue: this.selectedValue,
                    conditionType: this.conditionType,
                    values: [{key: "", probability: 0}]
                });
                this.$emit('input', conditions);
            }

            this.close();
        },
        onAddCondition: function() {
            if (this.conditionProperties.length === 1) {
                this.selectedProperty = this.conditionProperties[0];
            }
            else {
                this.selectedProperty = '';
                this.conditionPropertyValueItems = [];
            }
            this.$emit('selected-key-change', this.selectedProperty);
            this.selectedValue = '';
        },
        onSelectedKeyChange: function() {
            this.$emit('selected-key-change', this.selectedProperty);
            this.selectedValue = "";
        }
    }
};
</script>
