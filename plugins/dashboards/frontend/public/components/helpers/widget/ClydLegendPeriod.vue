<template>
<div class="text-small clyd-legend-period has-ellipsis bu-is-flex-shrink-1 bu-mr-1" :class="{'clyd-legend-period--custom': customPeriod ? true: false}" data-test-id="widget-period">{{period}}</div>
</template>

<script>
import { countlyCommon } from '../../../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18n } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    props: {
        customPeriod: {
            type: [Array, String, Object, Boolean],
        }
    },
    computed: {
        period: function() {
            var globalPeriod = this.$store.getters["countlyCommon/period"];

            if (this.customPeriod) {
                return this.formatPeriodString(this.customPeriod);
            }
            else {
                return this.formatPeriodString(globalPeriod);
            }
        }
    },
    methods: {
        formatPeriodString: function(period) {
            if (Object.prototype.hasOwnProperty.call(period, "period")) {
                period = countlyCommon.getPeriodRange(period, Date.now());
            }
            if (Array.isArray(period)) {
                if ((period[0] + '').length === 10) {
                    period[0] = period[0] * 1000;
                }
                if ((period[1] + '').length === 10) {
                    period[1] = period[1] * 1000;
                }
                var effectiveRange = [window.moment(period[0]), window.moment(period[1])];
                if (effectiveRange[0].isSame(effectiveRange[1])) {
                    return effectiveRange[0].format("lll");
                }
                else if (effectiveRange[1] - effectiveRange[0] > 86400000) {
                    return effectiveRange[0].format("ll") + " - " + effectiveRange[1].format("ll");
                }
                else {
                    return effectiveRange[0].format("lll") + " - " + effectiveRange[1].format("lll");
                }
            }
            else {
                if (period === "0days") {
                    return i18n("common.all-time");
                }
                var periodNames = countlyCommon.convertToTimePeriodObj(period);
                return periodNames.longName;
            }
        }
    }
};
</script>
