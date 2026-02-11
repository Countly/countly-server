<template>
<div
    class="bu-is-flex bu-is-align-items-center bu-my-2"
    @mousedown.stop
>
    <div
        v-if="customText"
        class="clyd-legend-app bu-is-flex-shrink-1"
        style="min-width: 0;"
    >
        <div class="bu-is-flex">
            <span class="bu-ml-1 text-small has-ellipsis bu-is-flex-shrink-1">{{ unescapeHtml(customText) }}</span>
        </div>
    </div>
    <i
        v-if="customText"
        class="fas fa-circle color-cool-gray-50 bu-mx-2"
        style="font-size: 4px;"
    />
    <clyd-legend-period
        v-if="showPeriod"
        :custom-period="customPeriod"
    />
    <div
        v-if="reportInfo"
        v-html="reportInfo.formatted"
        class="text-small has-ellipsis bu-is-flex-shrink-1"
    />
    <div
        v-if="reportInfo && (reportInfo.status=='rerunning' || reportInfo.status=='running')"
        class="text-small has-ellipsis bu-is-flex-shrink-1 bu-ml-1"
    >
        <i class="fa fa-circle text-danger blink bu-mr-1" />
        {{ i18n('taskmanager.recalculating') }}
    </div>
</div>
</template>

<script>
import { mixins } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [mixins.customDashboards.apps],
    props: {
        customPeriod: {
            type: [Array, String, Object, Boolean],
        },
        customText: {
            type: String,
        },
        reportInfo: {
            type: Object
        },
        showPeriod: {
            type: Boolean,
            default: true
        }
    }
};
</script>
