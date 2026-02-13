<template>
<cly-form-field
    name="apps"
    test-id="source-apps"
    rules="required"
    :label="i18nM('dashboards.source-apps')">
    <cly-app-select
        :key="rerender"
        test-id="source-apps-select"
        style="width: 100%;"
        v-bind="$attrs"
        v-on="allListeners"
        v-model="selectedApps"
        :collapse-tags="false"
        :multiple="multiple"
        :multiple-limit="multipleLimit"
        :placeholder="placeholderText">
    </cly-app-select>
</cly-form-field>
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
        multipleLimit: {
            type: Number,
            default: 4
        },
        placeholder: {
            type: String
        },
        value: {
            type: Array,
            required: true,
            default: function() {
                return [];
            }
        },
        multiple: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            rerender: "_id_" + this.multiple
        };
    },
    computed: {
        placeholderText: function() {
            if (this.placeholder) {
                return this.placeholder;
            }

            if (this.multiple) {
                return this.i18n("placeholder.dashboards.select-applications-multi", this.multipleLimit);
            }
            else {
                return this.i18n("placeholder.dashboards.select-applications-single");
            }
        },
        selectedApps: {
            get: function() {
                if (!this.multiple) {
                    return this.value && this.value[0] || "";
                }

                return this.value;
            },
            set: function(item) {
                var i = item;
                if (!this.multiple) {
                    i = [item];
                }

                this.$emit("input", i);
            }
        },
        allListeners: function() {
            return Object.assign({},
                this.$listeners,
                {
                    input: function() {}
                }
            );
        }
    },
    watch: {
        multiple: {
            handler: function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    this.rerender = "_id_" + this.multiple;
                    this.$emit("input", []);
                }
            }
        }
    }
};
</script>
