<template>
    <el-card class="box-card cly-vue-push-notification-details-summary-card">
        <table class="el-table">
            <thead>
                <tr>
                    <th>{{i18n('push-notification-details.scheduled-to')}}</th>
                    <th>{{i18n('push-notification-details.status')}}</th>
                    <th>{{i18n('push-notification-details.total')}}</th>
                    <th>{{i18n('push-notification-details.sent')}}</th>
                    <th>{{i18n('push-notification-details.failed')}}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="schedule in schedules">
                    <td>{{schedule.scheduledTo}}</td>
                    <td>{{schedule.status}}</td>
                    <td>{{schedule.result.total}}</td>
                    <td>{{schedule.result.sent}}</td>
                    <td>{{schedule.result.failed}}</td>
                </tr>
            </tbody>
        </table>
    </el-card>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
        };
    },
    computed: {
        schedules: function() {
            var pushNotification = this.$store.state.countlyPushNotificationDetails.pushNotification;
            return (pushNotification && pushNotification.schedules) ? pushNotification.schedules : [];
        }
    },
    methods: {
    }
};
</script>
