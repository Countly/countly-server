<template>
<el-select
    :adaptive-length="true"
    v-bind="$attrs"
    :value="val"
    @input="onChange">
    <el-option
        v-for="bucket in allBuckets"
        :key="bucket.value"
        :label="bucket.label"
        :value="bucket.value">
    </el-option>
</el-select>
</template>

<script>
import { i18nM, i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        widgetId: {type: String, required: true},
        value: {type: String, required: true, default: ""}
    },
    data: function() {
        return {
            allBuckets: [
                {
                    value: "daily",
                    label: i18nM("drill.daily")
                },
                {
                    value: "weekly",
                    label: i18nM("drill.weekly")
                },
                {
                    value: "monthly",
                    label: i18nM("drill.monthly")
                }
            ]
        };
    },
    computed: {
        val: function() {
            return this.value;
        }
    },
    methods: {
        onChange: function(b) {
            var self = this;
            this.$store.dispatch("countlyDashboards/widgets/update", {id: this.widgetId, settings: {"bucket": b}}).then(function() {
                self.$store.dispatch("countlyDashboards/widgets/get", self.widgetId);
            });

            this.$emit("input", b);
        }
    }
};
</script>
