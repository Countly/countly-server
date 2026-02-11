<template>
    <div v-bind:class="[componentId]">
        <cly-header
            class="cly-vue-push-notification-details-header"
            :title="pushNotification.name || '-'"
        >
            <template v-slot:header-top>
                <cly-back-link link="/messaging" :title="i18n('push-notification-details.back-to')"></cly-back-link>
            </template>
            <template v-slot:header-right>
                <template>
                    <el-button v-if="shouldShowRejectUserCommand(pushNotification.status)" @click="onReject(pushNotification._id)" class="bu-mr-2"> <i class="ion-close-circled" ></i> {{i18n('push-notification.reject')}} </el-button>
                    <el-button v-if="shouldShowApproveUserCommand(pushNotification.status)" @click="onApprove(pushNotification._id)" class="bu-mr-2 bu-ml-0"> <i class="ion-checkmark-circled" ></i> {{i18n('push-notification.approve')}} </el-button>
                </template>
                <cly-more-options size="small" @command="handleUserCommands($event, pushNotification._id)">
                    <el-dropdown-item v-if="shouldShowStartUserCommand(pushNotification.status)" :command="UserCommandEnum.START">{{i18n('push-notification.start')}} </el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowStopUserCommand(pushNotification.status)" :command="UserCommandEnum.STOP">{{i18n('push-notification.stop')}} </el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowEditUserCommand(pushNotification.status)" :command="UserCommandEnum.EDIT">{{i18n('push-notification.edit')}}</el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowEditDraftUserCommand(pushNotification.status)" :command="UserCommandEnum.EDIT_DRAFT">{{i18n('push-notification.edit-draft')}}</el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowEditRejectUserCommand(pushNotification.status)" :command="UserCommandEnum.EDIT_REJECT">{{i18n('push-notification.edit')}}</el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowDuplicateUserCommand(pushNotification.status)" :command="UserCommandEnum.DUPLICATE">{{i18n('push-notification.duplicate')}}</el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowDeleteUserCommand(pushNotification.status)"  :command="UserCommandEnum.DELETE">{{i18n('push-notification.delete')}}</el-dropdown-item>
                    <el-dropdown-item v-if="shouldShowResendUserCommand(pushNotification.status)" :command="UserCommandEnum.RESEND">{{i18n('push-notification.resend')}}</el-dropdown-item>
                </cly-more-options>
            </template>
            <template v-slot:header-bottom>
                <div class="bu-level-item cly-vue-push-notification-details-sub-header">
                    <cly-status-tag size="small" :text="statusOptions[pushNotification.status] && statusOptions[pushNotification.status].label || '' " :color="getStatusBackgroundColor(pushNotification.status)"></cly-status-tag>
                </div>
                <div class="bu-level-item cly-vue-push-notification-details-sub-header">
                    <div class="text-medium color-cool-gray-50"><i class="far fa-clock bu-pr-1"></i></div>
                    <span class="cly-vue-push-notification-details-sub-header-title"> {{i18n('push-notification-details.created-by',pushNotification.createdAt,pushNotification.createdBy)}}</span>
                </div>
                <div class="bu-level-item cly-vue-push-notification-details-sub-header">
                    <div class="text-medium color-cool-gray-50" style="padding-right: 5.33px;"><i class="ion-pricetag"></i></div>
                    <span class="cly-vue-push-notification-details-sub-header-title"> {{i18n('push-notification-details.message-id')}} {{pushNotification._id}} </span>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <div>
                <div class="bu-level-left" style="margin-bottom:32px">
                    <div class="bu-level-item bu-mr-1">
                        <div class="cly-vue-platform-filter-label">
                            {{i18n('push-notification-details.results-for')}}
                        </div>
                    </div>
                    <div class="bu-level-item bu-mr-1">
                        <el-select :arrow="false" :adaptiveLength="true" v-model="selectedPlatformFilter" :disabled="!platformFilterOptions.length">
                            <el-option v-for="item in platformFilterOptions" :key="item.value" :value="item.value" :label="item.label"></el-option>
                        </el-select>
                    </div>
                    <div class="bu-level-item bu-mr-1">
                        <div class="cly-vue-platform-filter-label">
                            {{i18n('push-notification-details.and-label')}}
                        </div>
                    </div>
                    <div class="bu-level-item bu-mr-1">
                        <el-select  :placeholder="i18n('push-notification.all-localizations')" :arrow="false" :adaptiveLength="true" v-model="selectedLocaleFilter" :disabled="!localeFilterOptions.length">
                            <el-option v-for="item in localeFilterOptions" :key="item.value" :value="item.value" :label="item.label"></el-option>
                        </el-select>
                    </div>
                </div>
            </div>
            <cly-section>
                <div class="bu-is-flex cly-vue-push-notification-details-chart-bars">
                    <div class="bu-is-flex bu-is-flex-direction-column cly-vue-push-notification-details-chart-bars__item cly-vue-push-notification-details-chart-bars__border-right">
                        <cly-chart-bar :option="pushNotificationChartBars.targetedUsers" :loading="isLoading" :legend="chartBarLegend" :showZoom=false :showToggle=false :showDownload=false ></cly-chart-bar>
                        <div class="cly-vue-push-notification-details-chart-bars__item-legend cly-vue-push-notification-details-chart-bars__border-right">
                            <div class="bu-my-4 bu-ml-6">
                                <div class="text-medium"> {{i18n('push-notification.users-targeted')}}  <cly-tooltip-icon :tooltip="i18n('push-notification.users-targeted-description')" icon="ion ion-help-circled" class="bu-ml-1"> </cly-tooltip-icon> </div>
                                <div class="cly-vue-push-notification-details-chart-bars__item-legend-percentage"> {{targetedUsers}}% </div>
                                <div class="text-medium">{{selectedDashboard.total || 0}} {{i18n('push-notification.users')}}</div>
                            </div>
                        </div>
                    </div>
                    <div class="bu-is-flex bu-is-flex-direction-column cly-vue-push-notification-details-chart-bars__item cly-vue-push-notification-details-chart-bars__border-right">
                        <cly-chart-bar :option="pushNotificationChartBars.sentPushNotifications" :loading="isLoading" :legend="chartBarLegend" :showZoom=false :showToggle=false :showDownload=false ></cly-chart-bar>
                        <div class="cly-vue-push-notification-details-chart-bars__item-legend cly-vue-push-notification-details-chart-bars__border-right">
                            <div class="bu-my-4 bu-ml-6">
                                <div class="text-medium"> {{i18n('push-notification.sent-notifications')}}  <cly-tooltip-icon :tooltip="i18n('push-notification.sent-notifications-description')" icon="ion ion-help-circled" class="bu-ml-1"> </cly-tooltip-icon> </div>
                                <div class="cly-vue-push-notification-details-chart-bars__item-legend-percentage"> {{sentPushNotifications}}% </div>
                                <div class="text-medium">{{selectedDashboard.sent || 0}} {{i18n('push-notification.users')}}<span v-if="shouldShowGoToSentUrl" @click="onGoToSent"><i class="cly-icon-btn cly-icon-arrow_forward-circled"></i></span>  </div>
                            </div>
                        </div>
                    </div>
                    <div class="bu-is-flex bu-is-flex-direction-column cly-vue-push-notification-details-chart-bars__item cly-vue-push-notification-details-chart-bars__border-right">
                        <cly-chart-bar :option="pushNotificationChartBars.clickedPushNotifications" :loading="isLoading" :legend="chartBarLegend" :showZoom=false :showToggle=false :showDownload=false ></cly-chart-bar>
                        <div class="cly-vue-push-notification-details-chart-bars__item-legend cly-vue-push-notification-details-chart-bars__border-right">
                            <div class="bu-my-4 bu-ml-6">
                                <div class="text-medium"> {{i18n('push-notification.clicked-notifications')}} <cly-tooltip-icon :tooltip="i18n('push-notification.clicked-notifications-description')" icon="ion ion-help-circled" class="bu-ml-1"> </cly-tooltip-icon> </div>
                                <div class="cly-vue-push-notification-details-chart-bars__item-legend-percentage"> {{clickedPushNotifications}}% </div>
                                <div class="text-medium"> {{selectedDashboard.actioned || 0}} {{i18n('push-notification.users')}}<span v-if="shouldShowGoToActionedUrl" @click="onGoToActioned"><i class="cly-icon-btn cly-icon-arrow_forward-circled"></i></span> </div>
                            </div>
                        </div>
                    </div>
                    <div class="bu-is-flex bu-is-flex-direction-column cly-vue-push-notification-details-chart-bars__item">
                        <cly-chart-bar :option="pushNotificationChartBars.failedPushNotifications" :loading="isLoading" :legend="chartBarLegend" :showZoom=false :showToggle=false :showDownload=false ></cly-chart-bar>
                        <div class="cly-vue-push-notification-details-chart-bars__item-legend">
                            <div class="bu-my-4 bu-ml-6 bu-is-flex bu-is-flex-direction-column">
                                <div class="text-medium bu-is-flex bu-is-justify-content-space-between">
                                    <div>
                                        {{i18n('push-notification.failed')}}
                                        <cly-tooltip-icon :tooltip="i18n('push-notification.failed-description')" icon="ion ion-help-circled" class="bu-ml-1"></cly-tooltip-icon>
                                    </div>
                                    <div>
                                        <a href="#" @click.prevent="downloadLogs" class="text-smallish bu-mr-4 font-weight-bold bu-is-underlined">{{i18n('push-notification.download-logs')}}</a>
                                    </div>
                                </div>
                                <div class="cly-vue-push-notification-details-chart-bars__item-legend-percentage"> {{failedPushNotifications}}% </div>
                                <div class="text-medium"> {{selectedDashboard.failed || 0}} {{i18n('push-notification.users')}}<span v-if="shouldShowGoToErroredUrl" @click="onGoToErrored"><i class="cly-icon-btn cly-icon-arrow_forward-circled"></i></span> </div>
                            </div>
                        </div>
                    </div>
                </div>
            </cly-section>
            <div class="cly-vue-push-notification-details-summary" v-loading="isLoading">
                <div style="width: calc(100% - 72px); display: flex; align-items: end;">
                    <div style="width: 83.133333%; padding-right: 24px; padding-top: 48px">
                        <div class="bu-py-3" style="display: flex; align-items: baseline;">
                            <h3>{{i18n('push-notification-details.summary-header')}}</h3>
                            <cly-tooltip-icon :tooltip="i18n('push-notification-details.summary-header-description')" icon="ion ion-help-circled" style="margin-left:8px"> </cly-tooltip-icon>
                        </div>
                        <div>
                            <cly-dynamic-tabs :custom-icon="customIcon" v-model="currentSummaryTab" skin="secondary" :tabs="summaryTabs"></cly-dynamic-tabs>
                        </div>
                    </div>
                    <div style="width: 16.166667%; padding-right: 24px">
                        <mobile-message-preview
                            :title="message.title"
                            :subtitle="pushNotification.settings[this.PlatformEnum.IOS].subtitle"
                            :content="message.content"
                            :platforms="pushNotification.platforms"
                            :media="previewMessageMedia"
                            :buttons="message.buttons.map(function(item){return item.label})"
                            @select="onMobileMessagePlatformChange"
                            class="cly-vue-push-notification-details-summary__message-preview">
                        </mobile-message-preview>
                    </div>
                </div>
            </div>
        </cly-main>
        <push-notification-drawer @onClose="onDrawerClose" :controls="drawers.pushNotificationDrawer" :type="pushNotification.type" :userCommand="userCommand.type" :id="userCommand.pushNotificationId" :isOpened="isDrawerOpen"></push-notification-drawer>
    </div>
</template>

<script>
import { i18n, i18nMixin, mixins, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify, formatPercentage, goTo } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import moment from 'moment';
import PushNotificationDrawer from './PushNotificationDrawer.vue';
import MobileMessagePreview from './common/MobileMessagePreview.vue';
import DetailsMessageTab from './common/DetailsMessageTab.vue';
import DetailsTargetingTab from './common/DetailsTargetingTab.vue';
import DetailsErrorsTab from './common/DetailsErrorsTab.vue';
import DetailsStatsTab from './common/DetailsStatsTab.vue';
import SchedulesTab from './common/SchedulesTab.vue';

import countlyPushNotification from '../store/index.js';

var featureName = 'push';

export default {
    mixins: [i18nMixin, mixins.hasDrawers("pushNotificationDrawer"), authMixin(featureName)],
    data: function() {
        return {
            StatusEnum: countlyPushNotification.service.StatusEnum,
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            TypeEnum: countlyPushNotification.service.TypeEnum,
            statusOptions: countlyPushNotification.service.statusOptions,
            currentSummaryTab: "message",
            UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
            summaryTabs: [
                {
                    title: i18n('push-notification-details.message-tab'),
                    name: "message",
                    component: DetailsMessageTab
                },
                {
                    title: i18n('push-notification-details.targeting-tab'),
                    name: "targeting",
                    component: DetailsTargetingTab
                },
                {
                    title: i18n('push-notification-details.errors-tab'),
                    name: "errors",
                    component: DetailsErrorsTab
                },
                {
                    title: i18n('push-notification-details.stats-tab'),
                    name: "stats",
                    component: DetailsStatsTab
                },
                {
                    title: i18n('push-notification-details.schedules-tab'),
                    name: "schedules",
                    component: SchedulesTab
                }
            ],
            usersTargetedOptionsXAxis: {
                type: "category",
                data: [0],
                show: false
            },
            usersTargetedOptionsYAxis: {
                type: "value",
                max: 100,
                show: false,
            },
            barWidth: 150,
            barGrid: {
                right: "80%",
                left: 0,
            },
        };
    },
    computed: {
        pushNotification: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification;
        },
        platformFilterOptions: function() {
            return this.$store.state.countlyPushNotificationDetails.platformFilterOptions;
        },
        localeFilterOptions: function() {
            if (this.pushNotification.dashboard[this.selectedPlatformFilter]) {
                return Object.keys(this.pushNotification.dashboard[this.selectedPlatformFilter].locales).map(function(localeKey) {
                    return countlyPushNotification.mapper.incoming.mapLocalizationByKey(localeKey);
                });
            }
            return [];
        },
        selectedMessageLocaleFilter: function() {
            return this.$store.state.countlyPushNotificationDetails.messageLocaleFilter;
        },
        message: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification.message[this.selectedMessageLocaleFilter];
        },
        selectedDashboard: function() {
            var selectedDashboardFilter = this.pushNotification.dashboard[this.selectedPlatformFilter];
            if (this.selectedLocaleFilter) {
                return selectedDashboardFilter.locales[this.selectedLocaleFilter];
            }
            if (!selectedDashboardFilter) {
                return {};
            }
            return selectedDashboardFilter;
        },
        targetedUsers: function() {
            if (!this.selectedDashboard.total) {
                return 0;
            }
            return formatPercentage((this.selectedDashboard.sent + this.selectedDashboard.failed) / this.selectedDashboard.total);
        },
        sentPushNotifications: function() {
            if (!this.selectedDashboard.sent) {
                return 0;
            }
            return formatPercentage(this.selectedDashboard.sent / this.selectedDashboard.total);
        },
        clickedPushNotifications: function() {
            if (!this.selectedDashboard.actioned) {
                return 0;
            }
            return formatPercentage(this.selectedDashboard.actioned / this.selectedDashboard.sent);
        },
        failedPushNotifications: function() {
            if (!this.selectedDashboard.failed) {
                return 0;
            }
            return formatPercentage(this.selectedDashboard.failed / this.selectedDashboard.total);
        },
        pushNotificationChartBars: function() {
            return {
                targetedUsers: this.getDetailsBaseChartOptions(this.targetedUsers),
                sentPushNotifications: this.getDetailsBaseChartOptions(this.sentPushNotifications),
                clickedPushNotifications: this.getDetailsBaseChartOptions(this.clickedPushNotifications),
                failedPushNotifications: this.getDetailsBaseChartOptions(this.failedPushNotifications)
            };
        },
        chartBarLegend: function() {
            return {
                show: false
            };
        },
        isLoading: function() {
            return this.$store.getters['countlyPushNotificationDetails/isLoading'];
        },
        hasApproverPermission: function() {
            return countlyPushNotification.service.hasApproverPermission();
        },
        previewMessageMedia: function() {
            var result = {};
            result[this.PlatformEnum.ALL] = {url: this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.ALL].mediaMime };
            result[this.PlatformEnum.IOS] = {url: this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.IOS].mediaMime };
            result[this.PlatformEnum.ANDROID] = {url: this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaMime};
            return result;
        },
        isDrawerOpen: function() {
            return this.$store.state.countlyPushNotificationDetails.isDrawerOpen;
        },
        userCommand: function() {
            return this.$store.state.countlyPushNotificationDetails.userCommand;
        },
        selectedLocaleFilter: {
            get: function() {
                return this.$store.state.countlyPushNotificationDetails.localeFilter;
            },
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationDetails/onSetLocaleFilter", value);
            }
        },
        selectedPlatformFilter: {
            get: function() {
                return this.$store.state.countlyPushNotificationDetails.platformFilter;
            },
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationDetails/onSetPlatformFilter", value);
                this.$store.dispatch("countlyPushNotificationDetails/onSetLocaleFilter", null);
            }
        },
        shouldShowGoToSentUrl: function() {
            return this.pushNotification.type === this.TypeEnum.ONE_TIME && this.selectedDashboard.sent > 0 && !this.pushNotification.demo;
        },
        shouldShowGoToErroredUrl: function() {
            return this.pushNotification.type === this.TypeEnum.ONE_TIME && this.selectedDashboard.failed > 0 && !this.pushNotification.demo;
        },
        shouldShowGoToActionedUrl: function() {
            return this.pushNotification.type === this.TypeEnum.ONE_TIME && this.selectedDashboard.actioned > 0 && !this.pushNotification.demo;
        },
        dashboardTokens: function() {
            return this.$store.state.countlyPushNotificationDashboard.tokens;
        },
        errorCount: function() {
            const globalError = this.$store.state.countlyPushNotificationDetails.pushNotification.error;
            if (globalError) {
                const allErrors = this.$store.state.countlyPushNotificationDetails.pushNotification.errors;
                const copyErrors = allErrors.concat([]);
                copyErrors.unshift(this.globalError);
                return copyErrors.length;
            }
            return this.$store.state.countlyPushNotificationDetails.pushNotification.errors.length || 0;
        },
        customIcon: function() {
            const implementedTab = this.errorCount ? "errors" : null;
            return {
                implementedTab: implementedTab,
                iconTemplate: '<div class=\'cly-vue-push-notification-details-tab-icon \'> ' + this.errorCount + ' </div>'
            };
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
        onApprove: function(id) {
            this.handleUserCommands(this.UserCommandEnum.APPROVE, id);
        },
        onReject: function(id) {
            this.handleUserCommands(this.UserCommandEnum.REJECT, id);
        },
        handleUserCommands: function(command, pushNotificationId) {
            this.$store.dispatch('countlyPushNotificationDetails/onUserCommand', {type: command, pushNotificationId: pushNotificationId});
            switch (command) {
            case this.UserCommandEnum.RESEND: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.DUPLICATE: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.DELETE: {
                this.$store.dispatch('countlyPushNotificationDetails/onDelete', pushNotificationId)
                    .then(function() {
                        window.location.hash = "#/messaging";
                    });
                break;
            }
            case this.UserCommandEnum.REJECT: {
                this.$store.dispatch('countlyPushNotificationDetails/onReject', pushNotificationId);
                break;
            }
            case this.UserCommandEnum.APPROVE: {
                this.$store.dispatch('countlyPushNotificationDetails/onApprove', pushNotificationId);
                break;
            }
            case this.UserCommandEnum.EDIT: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.EDIT_DRAFT: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.EDIT_REJECT: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.STOP: {
                this.$store.dispatch('countlyPushNotificationDetails/onToggle', {id: pushNotificationId, isActive: false});
                break;
            }
            case this.UserCommandEnum.START: {
                this.$store.dispatch('countlyPushNotificationDetails/onToggle', {id: pushNotificationId, isActive: true});
                break;
            }
            case this.UserCommandEnum.CREATE: {
                this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', true);
                break;
            }
            default: {
                throw new Error("Unknown user command:" + command);
            }
            }
        },
        shouldShowDuplicateUserCommand: function() {
            return this.canUserCreate;
        },
        shouldShowDeleteUserCommand: function() {
            return this.canUserDelete;
        },
        shouldShowResendUserCommand: function(status) {
            return (status === this.StatusEnum.STOPPED || status === this.StatusEnum.FAILED) && this.canUserCreate;
        },
        shouldShowEditDraftUserCommand: function(status) {
            return status === this.StatusEnum.DRAFT && this.canUserUpdate;
        },
        shouldShowEditRejectUserCommand: function(status) {
            return status === this.StatusEnum.REJECT && this.canUserUpdate;
        },
        shouldShowApproveUserCommand: function(status) {
            return status === this.StatusEnum.PENDING_APPROVAL && this.hasApproverPermission;
        },
        shouldShowRejectUserCommand: function(status) {
            return status === this.StatusEnum.PENDING_APPROVAL && this.hasApproverPermission;
        },
        shouldShowEditUserCommand: function(status) {
            return (status === this.StatusEnum.PENDING_APPROVAL || status === this.StatusEnum.SCHEDULED) && this.canUserUpdate;
        },
        shouldShowStartUserCommand: function(status) {
            if (this.pushNotification.type === this.TypeEnum.ONE_TIME) {
                return false;
            }
            if (!this.canUserUpdate) {
                return false;
            }
            return status === this.StatusEnum.STOPPED
            || status === this.StatusEnum.FAILED;
        },
        shouldShowStopUserCommand: function(status) {
            if (this.pushNotification.type === this.TypeEnum.ONE_TIME) {
                return false;
            }
            if (!this.canUserUpdate) {
                return false;
            }
            return status === this.StatusEnum.SCHEDULED || status === this.StatusEnum.SENDING;
        },
        getStatusBackgroundColor: function(status) {
            switch (status) {
            case this.StatusEnum.ACTIVE: {
                return "green";
            }
            case this.StatusEnum.PENDING_APPROVAL: {
                return "yellow";
            }
            case this.StatusEnum.DRAFT: {
                return "yellow";
            }
            case this.StatusEnum.SCHEDULED: {
                return "yellow";
            }
            case this.StatusEnum.SENDING: {
                return "blue";
            }
            case this.StatusEnum.SENT: {
                return "green";
            }
            case this.StatusEnum.STOPPED: {
                return "red";
            }
            case this.StatusEnum.FAILED: {
                return "red";
            }
            case this.StatusEnum.REJECT: {
                return "yellow";
            }
            default: {
                return "#FFFFFF";
            }
            }
        },
        formatTimeAgoText: function(date) {
            return countlyCommon.formatTimeAgoText(date).text;
        },
        getDetailsBaseChartOptions: function(seriesData) {
            return {
                xAxis: this.usersTargetedOptionsXAxis,
                yAxis: this.usersTargetedOptionsYAxis,
                series: [{data: [seriesData]}, this.getRemainingStackBar(seriesData)],
                tooltip: {show: false},
                stack: 'total',
                grid: this.barGrid,
                barWidth: this.barWidth
            };
        },
        getRemainingStackBar: function(value) {
            return {data: [100 - value], itemStyle: {color: "#E2E4E8"}, silent: true};
        },
        onDrawerClose: function() {
            this.$store.dispatch('countlyPushNotificationDetails/onSetIsDrawerOpen', false);
        },
        onGoToSent: function() {
            var queryData = {message: {$in: [this.pushNotification._id]}};
            goTo({
                url: '/users/qfilter/' + JSON.stringify(queryData),
                from: "#/" + countlyCommon.ACTIVE_APP_ID + "/messaging/details/" + this.pushNotification._id,
                title: i18n("push-notification.back-to-push-notification-details")
            });
        },
        onGoToActioned: function() {
            var queryData = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                event: "[CLY]_push_action",
                method: "segmentation_users",
                period: "month",
                bucket: "daily",
                projectionKey: "",
                queryObject: JSON.stringify({
                    "sg.i": {"$in": [this.pushNotification._id]}
                })
            };
            goTo({
                url: '/users/request/' + JSON.stringify(queryData),
                from: "#/" + countlyCommon.ACTIVE_APP_ID + "/messaging/details/" + this.pushNotification._id,
                title: i18n("push-notification.back-to-push-notification-details")
            });
        },
        onGoToErrored: function() {
            var self = this;
            var queryData = {message: {"$nin": [this.pushNotification._id]}};
            var $in = [];
            if (this.pushNotification.user) {
                Object.assign(queryData, JSON.parse(this.pushNotification.user));
            }
            if (this.pushNotification.locations && this.pushNotification.locations.length) {
                queryData.geo = {"$in": this.pushNotification.locations};
            }
            if (this.pushNotification.cohorts && this.pushNotification.cohorts.length) {
                queryData.chr = {"$in": this.pushNotification.cohorts};
            }
            var platformIndex = 2;
            Object.keys(this.dashboardTokens).forEach(function(tokenName) {
                if (self.pushNotification.platforms.some(function(platformName) {
                    if (platformName === self.PlatformEnum.ANDROID) {
                        return 'a' === tokenName.charAt(platformIndex);
                    }
                    if (platformName === self.PlatformEnum.IOS) {
                        return 'i' === tokenName.charAt(platformIndex);
                    }
                })) {
                    $in.push(tokenName);
                }
            });
            if ($in.length) {
                queryData.push = {};
                queryData.push.$in = $in;
            }
            goTo({
                url: '/users/qfilter/' + JSON.stringify(queryData),
                from: "#/" + countlyCommon.ACTIVE_APP_ID + "/messaging/details/" + this.pushNotification._id,
                title: i18n("push-notification.back-to-push-notification-details")
            });
        },
        onMobileMessagePlatformChange: function(value) {
            this.$store.dispatch('countlyPushNotificationDetails/onSetMobileMessagePlatform', value);
        },
        downloadLogs: function() {
            try {
                const rows = [];
                rows.push([i18n('push-notification.users-targeted'), i18n('push-notification.sent-notifications'), i18n('push-notification.clicked-notifications'), i18n('push-notification.failed')]);
                rows.push([(this.targetedUsers + "%" + " " + (this.selectedDashboard.total || 0) + " " + i18n('push-notification.users')), (this.sentPushNotifications + "%" + " " + (this.selectedDashboard.sent || 0) + " " + i18n('push-notification.users')), (this.clickedPushNotifications + "%" + " " + (this.selectedDashboard.actioned || 0) + " " + i18n('push-notification.users')), (this.failedPushNotifications + "%" + " " + (this.selectedDashboard.failed || 0) + " " + i18n('push-notification.users'))]);
                let csvContent = "data:text/csv;charset=utf-8,";
                rows.forEach((rowArray) => {
                    const row = rowArray.join(",");
                    csvContent += row + "\r\n";
                });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "Push_Notification_Detail_Metrics_" + moment().format("DD-MMM-YYYY") + ".csv");
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                notify({message: "Downloaded successfully!", type: 'success', sticky: false});
            }
            catch (error) {
                notify({message: error.message, type: 'error', sticky: false});
            }
        }
    },
    components: {
        "mobile-message-preview": MobileMessagePreview,
        "push-notification-drawer": PushNotificationDrawer
    },
    mounted: function() {
        if (this.$route.params.id) {
            this.$store.dispatch('countlyPushNotificationDetails/fetchById', this.$route.params.id);
            this.$store.dispatch('countlyPushNotificationDashboard/fetchDashboard');
        }
    }
};
</script>
