<template>
    <div v-tooltip.left="isDisabled && tooltipMessage">
        <el-dropdown-item :disabled="isDisabled" :command="command">{{label}}</el-dropdown-item>
    </div>
</template>

<script>
import { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateCreate } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

var featureName = 'push';

export default {
    data: function() {
        return {
            command: "CREATE_PUSH_NOTIFICATION",
            label: i18n('push-notification.send-message-to-users'),
            tooltipMessage: i18n('push-notification.send-message-to-users-tooltip')
        };
    },
    computed: {
        activeAppType: function() {
            return this.$store.state.countlyCommon.activeApp.type;
        },
        isDisabled: function() {
            if (this.activeAppType !== 'mobile') {
                return true;
            }
            if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !validateCreate(featureName)) {
                return true;
            }
            return false;
        }
    }
};
</script>
