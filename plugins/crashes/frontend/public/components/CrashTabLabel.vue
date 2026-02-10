<template>
    <div class="color-cool-gray-100">
        <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between">
            <div class="text-medium" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-title`">
                <span>{{title}}</span>
                <cly-tooltip-icon v-if="tooltip" class="bu-ml-1" :tooltip="tooltip" placement="top-center" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-tooltip`"></cly-tooltip-icon>
            </div>
        </div>
        <div class="bu-is-flex bu-is-align-items-center">
            <h2 v-if="data && data.isEstimate" v-tooltip="i18n('common.estimation')" class="is-estimate" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-value`">
                ~{{ data && data.total && !isNaN(data.total) && getShortNumber(data.total) || data && data.total}}
            </h2>
            <h2 v-else :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-value`">
                {{ data && data.total && !isNaN(data.total) && getShortNumber(data.total) || data && data.total}}
            </h2>
            <div v-if="colorClass == 'up'" :class="'cly-trend-up ' + negatedClass">
                <i class="cly-trend-up-icon ion-android-arrow-up bu-ml-2" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-arrow`"></i><span :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-change-value`">{{data && data.change}}</span>
            </div>
            <div v-if="colorClass == 'down'" :class="'cly-trend-down ' + negatedClass">
                <i class="cly-trend-down-icon ion-android-arrow-down bu-ml-2" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-arrow`"></i><span :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-change-value`">{{data && data.change}}</span>
            </div>
            <div v-if="colorClass == 'neutral'" class="cly-trend-neutral">
                <i class="cly-trend-neutral-icon ion-minus-round bu-ml-2" :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-arrow`"></i><span :data-test-id="`cly-section-${title.toLowerCase().replaceAll(/\s/g, '-').replace('/', 'or')}-change-value`">{{data && data.change}}</span>
            </div>
        </div>
    </div>
</template>

<script>
import { i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin, commonFormattersMixin],
    props: {
        title: {type: String},
        tooltip: {type: String},
        data: {type: Object},
        negateTrend: {type: Boolean, default: false}
    },
    computed: {
        colorClass: function() {
            if (typeof this.$props.data !== "undefined" && this.$props.data.trend === "n") {
                return "neutral";
            }
            else {
                return (typeof this.$props.data !== "undefined" && (this.$props.data.trend === "u") ? "up" : "down");
            }
        },
        negatedClass: function() {
            return (this.$props.negateTrend === true) ? "negated" : "";
        }
    }
};
</script>
