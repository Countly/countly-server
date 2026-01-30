<template>
    <i v-if="tooltip" :class="'cly-vue-tooltip-icon ' + icon + ' ' + tooltipClass" v-tooltip="tooltipConf"></i>
</template>

<script>
import countlyCommon from '../../countly/countly.common.js';

export default {
    props: {
        icon: {
            type: String,
            default: 'ion ion-help-circled'
        },
        tooltip: {
            type: String,
            default: ''
        },
        placement: {
            type: String,
            default: 'auto'
        },
        tooltipClass: {
            type: String,
            default: ''
        }
    },
    computed: {
        tooltipConf: function() {
            return {
                content: countlyCommon.unescapeHtml(this.tooltip),
                placement: this.placement
            };
        }
    }
};
</script>
