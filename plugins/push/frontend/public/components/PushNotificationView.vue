<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('push-notification.title')"
            :tooltip="{description: i18n('push-notification.description')}"
        >
            <template v-slot:header-right v-if="canUserCreate">
                <div class="bu-level-item">
                    <el-button @click="onCreatePushNotification" type="success" size="small" icon="el-icon-circle-plus" data-test-id="create-new-messsage-button">{{i18n('push-notification.create-button')}}</el-button>
                </div>
            </template>
            <template v-slot:header-tabs>
                <cly-dynamic-tabs class="push-notification__main-tabs" v-model="selectedPushNotificationTab" skin="secondary" :tabs="pushNotificationTabs">
                    <template v-slot:tables="scope">
                        <span>{{scope.tab.title}}</span>
                    </template>
                </cly-dynamic-tabs>
            </template>
        </cly-header>
        <push-notification-drawer ref="pushNotificationDrawer" @onClose="onDrawerClose" @save="onSave" :controls="drawers.pushNotificationDrawer" :type="selectedPushNotificationTab" :userCommand="userCommand.type" :id="userCommand.pushNotificationId" :isOpened="isDrawerOpen"></push-notification-drawer>
    </div>
</template>

<script>
import { i18n, i18nMixin, mixins, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import PushNotificationDrawer from './PushNotificationDrawer.vue';
import PushNotificationTabView from './PushNotificationTabView.vue';
import countlyPushNotification from '../store/index.js';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';

var featureName = 'push';

export default {
    mixins: [i18nMixin, mixins.hasDrawers("pushNotificationDrawer"), authMixin(featureName)],
    data: function() {
        return {
            pushNotificationTabs: [
                {title: i18n('push-notification.one-time'), name: countlyPushNotification.service.TypeEnum.ONE_TIME, component: PushNotificationTabView},
                {title: i18n('push-notification.automated'), name: countlyPushNotification.service.TypeEnum.AUTOMATIC, component: PushNotificationTabView},
                {title: i18n('push-notification.transactional'), name: countlyPushNotification.service.TypeEnum.TRANSACTIONAL, component: PushNotificationTabView}
            ],
            UserCommandEnum: countlyPushNotification.service.UserCommandEnum
        };
    },
    computed: {
        selectedPushNotificationTab: {
            get: function() {
                return this.$store.state.countlyPushNotificationMain.selectedPushNotificationType;
            },
            set: function(value) {
                this.$store.dispatch('countlyPushNotificationMain/onSetPushNotificationType', value);
                this.$store.dispatch('countlyPushNotificationMain/fetchPushTable', true);
            }
        },
        isDrawerOpen: function() {
            return this.$store.state.countlyPushNotificationMain.isDrawerOpen;
        },
        userCommand: function() {
            return this.$store.state.countlyPushNotificationMain.userCommand;
        }
    },
    watch: {
        isDrawerOpen: function(value) {
            if (value) {
                this.openDrawer("pushNotificationDrawer", {});
            }
        }
    },
    methods: {
        onCreatePushNotification: function() {
            this.$store.dispatch('countlyPushNotificationMain/onUserCommand', {type: this.UserCommandEnum.CREATE, pushNotificationId: null});
            this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
        },
        onDrawerClose: function() {
            this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', false);
        },
        onSave: function() {
            this.$store.dispatch('countlyPushNotificationMain/fetchAll', true);
        },
        refresh: function() {
            this.$store.dispatch('countlyPushNotificationDashboard/fetchDashboard', true);
        }
    },
    mounted: function() {
        this.$store.dispatch('countlyPushNotificationDashboard/fetchDashboard');
    },
    components: {
        "push-notification-drawer": PushNotificationDrawer,
        ClyHeader,
        ClyDynamicTabs,
    }
};
</script>
