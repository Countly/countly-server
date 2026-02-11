<template>
<cly-form-field :label="label">
    <div class="clyd-colors">
        <div class="clyd-colors__item"
            :class="{'clyd-colors__item--selected' : value === idx + 1}"
            :style="{'background-color': item}"
            :key="item"
            @click="commitValue(idx + 1)"
            v-for="(item, idx) in options">
            <div class="clyd-colors__item-frame">
                <i class="ion-checkmark"></i>
            </div>
        </div>
    </div>
</cly-form-field>
</template>

<script>
import { countlyCommon } from '../../../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18n } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    props: {
        value: { default: 1 },
        options: {
            type: Array,
            default: function() {
                return countlyCommon.GRAPH_COLORS;
            }
        },
        label: {required: false, default: function() { return i18n("dashboards.bar-color"); }}
    },
    methods: {
        commitValue: function(v) {
            this.$emit("input", v);
        }
    }
};
</script>
