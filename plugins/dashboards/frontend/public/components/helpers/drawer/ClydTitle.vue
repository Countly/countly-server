<template>
<div class="bu-mt-4">
    <el-checkbox v-model="checkbox">
        <span class="text-smallish">{{ i18nM("dashboards.custom-widget-title") }}</span>
    </el-checkbox>

    <cly-form-field
        v-if="checkbox"
        name="title"
        :rules="checkbox ? 'required' : ''">
        <el-input
            v-bind="$attrs"
            v-model="title"
            :placeholder="i18n('placeholder.dashboards.enter-widget-title')">
        </el-input>
    </cly-form-field>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField
    },
    props: {
        value: {
            type: String,
            default: ""
        }
    },
    data: function() {
        return {
            titleCheckbox: null
        };
    },
    computed: {
        title: {
            get: function() {
                return this.value;
            },
            set: function(t) {
                this.$emit("input", t);
            }
        },
        checkbox: {
            get: function() {
                if (this.titleCheckbox !== null) {
                    return this.titleCheckbox;
                }

                if (this.value && this.value.length) {
                    return true;
                }

                return false;
            },
            set: function(v) {
                if (v === false && this.value && this.value.length) {
                    this.$emit("input", "");
                }

                this.titleCheckbox = v;
            }
        }
    }
};
</script>
