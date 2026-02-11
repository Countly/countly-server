<template>
    <push-notification-drawer v-if="shouldDisplay" :queryFilter="queryFilter" :from="from" :controls="controls" :type="type"></push-notification-drawer>
</template>

<script>
import PushNotificationDrawer from './PushNotificationDrawer.vue';
import countlyPushNotification from '../store/index.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateCreate } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

var featureName = 'push';

export default {
    props: {
        type: {
            type: String,
            default: function() {
                return countlyPushNotification.service.TypeEnum.ONE_TIME;
            }
        },
        controls: {
            type: Object
        },
        from: {
            type: String,
            default: null,
        },
        queryFilter: {
            type: Object,
            default: null,
        },
    },
    data: function() {
        return {};
    },
    computed: {
        activeAppType: function() {
            return this.$store.state.countlyCommon.activeApp.type;
        },
        shouldDisplay: function() {
            if (this.activeAppType !== 'mobile') {
                return false;
            }
            if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !validateCreate(featureName)) {
                return false;
            }
            return true;
        }
    },
    components: {
        'push-notification-drawer': PushNotificationDrawer
    }
};
</script>
