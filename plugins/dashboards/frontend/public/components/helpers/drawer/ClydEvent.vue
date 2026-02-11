<template>
<cly-form-field
    name="events"
    rules="required"
    :label="i18nM(multiple ? 'dashboards.events': 'dashboards.event')">
    <cly-select-x
        class="cly-is-fullwidth"
        :auto-commit="true"
        :hide-all-options-tab="true"
        :key="rerender"
        :max-items="multipleLimit"
        :mode="multiple ? 'multi-check' : 'single-list'"
        :options="allEvents"
        :placeholder="placeholderText"
        :width="500"
        v-model="selectedEvents"
        v-on="allListeners">
    </cly-select-x>
</cly-form-field>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        appIds: {
            type: Array,
            default: function() {
                return [];
            }
        },
        multipleLimit: {
            type: Number,
            default: 3
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
            store: null,
            rerender: "_id_" + this.multiple + "_" + this.appIds
        };
    },
    computed: {
        placeholderText: function() {
            if (this.placeholder) {
                return this.placeholder;
            }

            if (this.multiple) {
                return this.i18n("placeholder.dashboards.select-event-multi", this.multipleLimit);
            }
            else {
                return this.i18n("placeholder.dashboards.select-event-single");
            }
        },
        allEvents: function() {
            var appIds = this.appIds;
            return this.$store.getters["countlyDashboards/allEvents"](appIds);
        },
        selectedEvents: {
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
        appIds: {
            immediate: true,
            handler: function(newVal, oldVal) {
                var appIds = newVal;

                if (this.$store && Array.isArray(appIds) && appIds.length) {
                    this.$store.dispatch("countlyDashboards/getEvents", {appIds: appIds});
                }

                this.rerender = "_id_" + this.multiple + "_" + this.appIds;
                if (oldVal) {
                    this.$emit("input", []);
                }
            }
        },
        multiple: {
            handler: function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    this.rerender = "_id_" + this.multiple + "_" + this.appIds;
                    this.$emit("input", []);
                }
            }
        }
    }
};
</script>
