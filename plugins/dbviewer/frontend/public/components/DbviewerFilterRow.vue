<template>
<div
    class="bu-columns bu-is-gapless bu-is-mobile dbviewer-filter"
>
    <div class="bu-column bu-is-12">
        <div
            class="bu-columns bu-is-gapless bu-is-mobile dbviewer-filter__conjuction"
            v-if="showConjunction"
        >
            <div class="bu-column bu-is-12">
                <el-radio-group v-model="local.conjunction" @change="onConjunctionChange" :disabled="disabled" size="mini">
                    <el-radio-button label="AND">AND</el-radio-button>
                    <el-radio-button label="OR">OR</el-radio-button>
                </el-radio-group>
            </div>
        </div>
        <div v-else-if="!isFirstRow" class="bu-pt-2"></div>

        <div
            class="bu-columns bu-is-gapless bu-is-mobile bu-is-align-items-center bu-is-flex dbviewer-filter__row"
        >
            <!-- Field -->
            <div class="bu-column bu-is-4">
                <validation-provider :rules="'required'" v-slot="validation">
                    <el-select
                        v-model="local.field"
                        placeholder="Select Field"
                        size="small"
                        :disabled="disabled"
                        :class="{'is-error': validation.errors.length > 0}"
                        @change="onFieldChange"
                        :popper-append-to-body="false"
                    >
                        <el-option
                            v-for="field in fields"
                            :key="field.value"
                            :label="field.label"
                            :value="field.value"
                        />
                    </el-select>
                </validation-provider>
            </div>

            <!-- Operator -->
            <div class="bu-column bu-is-2">
                <validation-provider :rules="'required'" v-slot="validation">
                    <el-select
                        v-model="local.operator"
                        placeholder="Select"
                        size="small"
                        :disabled="disabled || !local.field"
                        :class="{'is-error': validation.errors.length > 0}"
                        @change="onOperatorChange"
                        :popper-append-to-body="false"
                    >
                        <el-option
                            v-for="operator in defaultOperators"
                            :key="operator.value"
                            :label="operator.label"
                            :value="operator.value"
                        />
                    </el-select>
                </validation-provider>
            </div>

            <!-- Value -->
            <div class="bu-column bu-is-5">
                <validation-provider :rules="needsValue ? 'required' : ''" v-slot="validation">
                    <el-input
                        v-model="local.value"
                        placeholder="Enter value"
                        size="small"
                        type="textarea"
                        :rows="1"
                        :disabled="disabled || !local.operator"
                        :class="{'is-error': validation.errors.length > 0}"
                        :title="(disabled || !local.operator) ? 'Please select your field and operator first' : ''"
                        @change="onValueChange"
                    />
                </validation-provider>
            </div>

            <!-- Delete -->
            <div
                class="bu-column bu-is-1 bu-is-flex bu-is-align-items-center bu-is-justify-content-center"
                v-if="allowDeleteFirstRow || !isFirstRow"
            >
                <el-button
                    type="text"
                    class="dbviewer-filter__delete"
                    @click="deleteRow"
                    :disabled="disabled"
                >
                    <i class="el-icon-close"></i>
                </el-button>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
export default {
    mixins: [i18nMixin],
    props: {
        allowDeleteFirstRow: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        fields: { type: Array, required: true },
        isFirstRow: { type: Boolean, default: false },
        isLastRow: { type: Boolean, default: false },
        row: { type: Object, required: true }
    },
    data() {
        return {
            suppressEmit: false,
            local: {
                field: this.row.field || '',
                operator: this.row.operator || '',
                value: this.row.value || '',
                conjunction: this.row.conjunction || 'AND'
            },
            defaultOperators: [
                { label: '=', value: '=' },
                { label: '!=', value: '!=' },
                { label: '>', value: '>' },
                { label: '>=', value: '>=' },
                { label: '<', value: '<' },
                { label: '<=', value: '<=' },
            ]
        };
    },
    computed: {
        showConjunction() {
            return !this.isFirstRow;
        },
        needsValue() {
            return this.local.operator;
        }
    },
    watch: {
        row: {
            deep: true,
            handler(r) {
                this.suppressEmit = true;
                this.local.field = r.field || '';
                this.local.operator = r.operator || '';
                this.local.value = r.value || '';
                this.local.conjunction = r.conjunction || 'AND';
                this.$nextTick(() => {
                    this.suppressEmit = false;
                });
            }
        }
    },
    methods: {
        emitPatch() {
            if (this.suppressEmit) {
                return;
            }
            this.$emit('update-row', { id: this.row.id, ...this.local });
        },
        onFieldChange() {
            this.local.operator = '';
            this.local.value = '';
            this.emitPatch();
        },
        onValueChange() {
            this.emitPatch();
        },
        onOperatorChange() {
            if (!this.needsValue) {
                this.local.value = '';
            }
            this.emitPatch();
        },
        onValueInput(val) {
            this.local.value = val;
            this.emitPatch();
        },
        onConjunctionChange(val) {
            this.local.conjunction = val;
            this.emitPatch();
        },
        deleteRow() {
            this.$emit('delete-row', this.row.id);
        }
    }
};
</script>
