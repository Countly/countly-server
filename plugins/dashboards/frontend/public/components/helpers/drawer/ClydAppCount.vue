<template>
<cly-form-field :label="i18nM('dashboards.app-count')">
    <el-radio-group v-model="count" style="width: 100%;">
        <el-radio
            border
            class="is-autosized-vstack"
            label="single"
            key="single">
            <div>
                {{i18nM('dashboards.single-app')}}
            </div>
            <div class="text-small color-cool-gray-50">
                {{i18nM('dashboards.single-app-description')}}
            </div>
        </el-radio>
        <el-radio
            border
            class="is-autosized-vstack"
            label="multiple"
            key="multiple">
            <div>
                {{i18nM('dashboards.multiple-apps')}}
            </div>
            <div class="text-small color-cool-gray-50">
                {{i18nM('dashboards.multiple-apps-description')}}
            </div>
        </el-radio>
    </el-radio-group>
</cly-form-field>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        value: {
            type: String,
            default: 'single',
            required: true,
        }
    },
    computed: {
        count: {
            get: function() {
                return this.value;
            },
            set: function(v) {
                this.$emit("input", v);
            }
        }
    }
};
</script>
