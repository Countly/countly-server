<template>
    <div v-bind:class="[componentId]">
        <cly-main>
            <cly-notification
                v-if="!kafkaStatus.available"
                :closable="false"
                class="bu-mb-5"
                :text="i18n('push-notification.no-kafka-warning') + '<br/>' + 'Kafka connection verification failed with following error: <b>' + kafkaStatus.error + '</b>'"/>
            <cly-section>
                <cly-metric-cards :multiline="false">
                    <cly-metric-card
                        :number="totalAppUsers"
                        :label="i18n('push-notification.total-app-users')"
                        test-id="messaging-total-app-users">
                    </cly-metric-card>
                    <cly-metric-card
                        :number="enabledUsers"
                        :label="i18n('push-notification.enabled-users')"
                        test-id="messaging-notification-enabled-users">
                    </cly-metric-card>
                    <cly-metric-card
                        :is-percentage="true"
                        :number="enabledUsersPercentage"
                        :label="i18n('push-notification.enabled-users-percentage')"
                        :tooltip="i18n('push-notification.enabled-users-percentage-description')"
                        test-id="messaging-enabled-users-percentage">
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <div>
                <div class="bu-level-left" style="margin-bottom:32px">
                    <div class="bu-level-item bu-mr-4">
                        <div class="cly-vue-platform-filter-label" data-test-id="messaging-datatable-filter-label">
                            {{i18n('push-notification.results-for')}}
                        </div>
                    </div>
                    <div class="bu-level-item">
                        <cly-select-x
                            placeholder="All Notification Types"
                            test-id="push-notifications-result-for-combobox"
                            mode="multi-check"
                            v-model="selectedNotificationKind"
                            :options="notificationTypes">
                        </cly-select-x>
                    </div>
                </div>
            </div>
            <cly-section>
                <cly-datatable-n test-id="messaging-datatable" :data-source="remoteTableDataSource" v-loading="areRowsLoading || isUserCommandLoading" :force-loading="isLoading" :available-dynamic-cols="optionalTableColumns" :resizable="true" class="is-clickable cly-vue-push-notification-table">
                    <template v-slot:header-left>
                        <cly-multi-select
                            class="bu-ml-3 ratings-tab-view__filter-selector"
                            v-model="activeFilter"
                            :fields="activeFilterFields">
                        </cly-multi-select>
                    </template>
                    <template v-slot="scope">
                        <el-table-column fixed width="400" type="clickable" sortable="custom" prop="name" :label="i18n('push-notification.table-campaign-name')" class="cly-vue-push-notification-table-column">
                            <template slot-scope="scope">
                                <div class="bu-is-flex bu-is-flex-direction-column">
                                    <a v-bind:href="'#/messaging/details/' + scope.row._id" class="bu-is-flex bu-is-align-items-center">
                                        <a class="has-ellipsis" :data-test-id="'datatable-messaging-notification-name-' + scope.$index">{{(scope.row.name)}}</a>
                                    </a>
                                    <span class="cly-vue-push-notification-table-column__second-line">
                                        <span :data-test-id="'datatable-messaging-platform-name-' + scope.$index"> {{getPreviewPlatforms(scope.row.platforms)}} </span>
                                        <span class="blinker cly-vue-push-notification-table-column__separator-blinker" :data-test-id="'datatable-messaging-blinker-' + scope.$index"></span>
                                        <span :data-test-id="'datatable-messaging-created-by-' + scope.$index"> {{i18n('push-notification.created-by')}} {{scope.row.createdBy || '-'}} </span>
                                    </span>
                                </div>
                            </template>
                        </el-table-column>
                        <template v-for="(col,idx) in scope.dynamicCols">
                            <el-table-column
                                width="360"
                                v-if="col.value === 'content'"
                                :key="idx"
                                sortable="custom"
                                :label="col.label">
                                <template v-slot="rowScope">
                                    {{rowScope.row.content}}
                                </template>
                            </el-table-column>
                            <el-table-column
                                width="200"
                                v-if="col.value === 'createdBy'"
                                :key="idx"
                                sortable="custom"
                                :label="col.label">
                                <template v-slot="rowScope">
                                    {{rowScope.row.createdBy}}
                                </template>
                            </el-table-column>
                            <el-table-column
                                width="200"
                                v-if="col.value === 'created'"
                                :key="idx"
                                sortable="custom"
                                :label="col.label">
                                <template v-slot="rowScope">
                                    <div class="bu-is-flex bu-is-flex-direction-column">
                                        <span class="cly-vue-push-notification-table-column__first-line">{{rowScope.row.createdDateTime.date}}</span>
                                        <span class="cly-vue-push-notification-table-column__second-line">{{rowScope.row.createdDateTime.time}}</span>
                                    </div>
                                </template>
                            </el-table-column>
                        </template>
                        <el-table-column width="220" prop="status" :label="i18n('push-notification.table-status')">
                            <template slot-scope="scope">
                                <cly-status-tag :text="statusOptions[scope.row.status] && statusOptions[scope.row.status].label || '' " :color="getStatusBackgroundColor(scope.row.status)" :data-test-id="'datatable-messaging-status-' + scope.$index"> </cly-status-tag>
                            </template>
                        </el-table-column>
                        <el-table-column width="220" sortable="custom" prop="sent" :label="i18n('push-notification.table-sent')" class="cly-vue-push-notification-table-column">
                            <template slot-scope="scope">
                                <span class="cly-vue-push-notification-table-column__numbers-only" :data-test-id="'datatable-messaging-sent-' + scope.$index"> {{formatNumber(scope.row.sent)}} </span>
                            </template>
                        </el-table-column>
                        <el-table-column min-width="200" sortable="custom" prop="actioned" :label="i18n('push-notification.table-actioned')" class="cly-vue-push-notification-table-column">
                            <template slot-scope="scope">
                                <div class="bu-level">
                                    <div class="bu-level-left cly-vue-push-notification-table-column__numbers-only">
                                        <span class="bu-mr-1" :data-test-id="'datatable-messaging-actioned-value-' + scope.$index">{{formatNumber(scope.row.actioned)}}</span>
                                        <span class="bu-mr-1" :data-test-id="'datatable-messaging-actioned-divider-' + scope.$index">|</span>
                                        <span :data-test-id="'datatable-messaging-actioned-percentage-' + scope.$index">{{formatPercentage(scope.row.actioned/scope.row.sent)}} %</span>
                                    </div>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column  min-width="280" sortable="custom" prop="lastDate" :label="i18n('push-notification.table-date-sent')" class="cly-vue-push-notification-table-column">
                            <template slot-scope="scope">
                                <div class="bu-is-flex bu-is-flex-direction-column">
                                    <template v-if="scope.row.lastDate && scope.row.lastDate.date">
                                        <span class="cly-vue-push-notification-table-column__first-line" :data-test-id="'datatable-messaging-date-sent-' + scope.$index">{{scope.row.lastDate.date}}</span>
                                        <span class="cly-vue-push-notification-table-column__second-line" :data-test-id="'datatable-messaging-scheduled-' + scope.$index">{{scope.row.lastDate.time}}</span>
                                    </template>
                                    <template v-else>
                                        <span>-</span>
                                    </template>
                                </div>
                            </template>
                        </el-table-column>

                        <el-table-column type="options">
                            <template slot-scope="scope">
                                <cly-more-options :test-id="'datatable-' + scope.$index" v-if="scope.row.hover" size="small" @command="handleUserCommands($event, scope.row._id, scope.row.notificationType)">
                                    <el-dropdown-item v-if="shouldShowStartUserCommand(scope.row.status)" :command="UserCommandEnum.START" :data-test-id="'datatable-messaging-more-option-start-' + scope.$index">{{i18n('push-notification.start')}} </el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowStopUserCommand(scope.row.status)" :command="UserCommandEnum.STOP" :data-test-id="'datatable-messaging-more-option-stop-' + scope.$index">{{i18n('push-notification.stop')}} </el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowEditUserCommand(scope.row.status)" :command="UserCommandEnum.EDIT" :data-test-id="'datatable-messaging-more-option-edit-' + scope.$index">{{i18n('push-notification.edit')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowEditDraftUserCommand(scope.row.status)" :command="UserCommandEnum.EDIT_DRAFT" :data-test-id="'datatable-messaging-more-option-edit-draft-' + scope.$index">{{i18n('push-notification.edit-draft')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowEditRejectUserCommand(scope.row.status)" :command="UserCommandEnum.EDIT_REJECT" :data-test-id="'datatable-messaging-more-option-edit-reject-' + scope.$index">{{i18n('push-notification.edit')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowDuplicateUserCommand(scope.row.status)" :command="UserCommandEnum.DUPLICATE" :data-test-id="'datatable-messaging-more-option-duplicate-' + scope.$index">{{i18n('push-notification.duplicate')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowDeleteUserCommand(scope.row.status)"  :command="UserCommandEnum.DELETE" :data-test-id="'datatable-messaging-more-option-delete-' + scope.$index">{{i18n('push-notification.delete')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowResendUserCommand(scope.row.status)" :command="UserCommandEnum.RESEND" :data-test-id="'datatable-messaging-more-option-resend-' + scope.$index">{{i18n('push-notification.resend')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowApproveUserCommand(scope.row.status)"  :command="UserCommandEnum.APPROVE" :data-test-id="'datatable-messaging-more-option-approve-' + scope.$index">{{i18n('push-notification.approve')}}</el-dropdown-item>
                                    <el-dropdown-item v-if="shouldShowRejectUserCommand(scope.row.status)" :command="UserCommandEnum.REJECT" :data-test-id="'datatable-messaging-more-option-reject-' + scope.$index">{{i18n('push-notification.reject')}}</el-dropdown-item>
                                </cly-more-options>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import { i18n, i18nMixin, commonFormattersMixin, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { notify, formatPercentage } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyMetricCards from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-card.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyMultiSelect from '../../../../../frontend/express/public/javascripts/components/dropdown/multi-select.vue';
import ClyNotification from '../../../../../frontend/express/public/javascripts/components/helpers/cly-notification.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyStatusTag from '../../../../../frontend/express/public/javascripts/components/helpers/cly-status-tag.vue';

import countlyPushNotification from '../store/index.js';

var featureName = 'push';

var statusFilterOptions = [
    {label: countlyPushNotification.service.ALL_FILTER_OPTION_LABEL, value: countlyPushNotification.service.ALL_FILTER_OPTION_VALUE},
    {label: i18n("push-notification.active"), value: countlyPushNotification.service.StatusEnum.ACTIVE},
    {label: i18n("push-notification.scheduled"), value: countlyPushNotification.service.StatusEnum.SCHEDULED},
    {label: i18n("push-notification.sent"), value: countlyPushNotification.service.StatusEnum.SENT},
    {label: i18n("push-notification.sending"), value: countlyPushNotification.service.StatusEnum.SENDING},
    {label: i18n("push-notification.canceled"), value: countlyPushNotification.service.StatusEnum.CANCELED},
    {label: i18n("push-notification.failed"), value: countlyPushNotification.service.StatusEnum.FAILED},
    {label: i18n("push-notification.stopped"), value: countlyPushNotification.service.StatusEnum.STOPPED},
    {label: i18n("push-notification.draft"), value: countlyPushNotification.service.StatusEnum.DRAFT},
    {label: i18n("push-notification.waiting-for-approval"), value: countlyPushNotification.service.StatusEnum.PENDING_APPROVAL},
    {label: i18n("push-notification.rejected"), value: countlyPushNotification.service.StatusEnum.REJECTED},
];

var platformFilterOptions = [
    {label: i18n("push-notification.platform-filter-all"), value: countlyPushNotification.service.PlatformEnum.ALL},
    {label: i18n("push-notification.platform-filter-android"), value: countlyPushNotification.service.PlatformEnum.ANDROID},
    {label: i18n("push-notification.platform-filter-ios"), value: countlyPushNotification.service.PlatformEnum.IOS}
];

export default {
    mixins: [i18nMixin, commonFormattersMixin, authMixin(featureName)],
    components: {
        ClyMain,
        ClySection,
        ClyDatatableN,
        ClyMetricCards,
        ClyMetricCard,
        ClyMoreOptions,
        ClyMultiSelect,
        ClyNotification,
        ClySelectX,
        ClyStatusTag,
    },
    data: function() {
        return {
            remoteTableDataSource: getServerDataSource(this.$store, "countlyPushNotificationMain", "pushTable"),
            platformFilters: platformFilterOptions,
            platformFilterLabels: {
                oneTime: i18n('push-notification.platform-filter-label-one-time'),
                automatic: i18n('push-notification.platform-filter-label-automatic'),
                transactional: i18n('push-notification.platform-filter-label-transactional')
            },
            statusFilters: statusFilterOptions,
            DEFAULT_ALPHA_COLOR_VALUE_HEX: 50,
            oneTimePeriodFilters: [
                {label: i18n("push-notification.time-chart-period-weekly"), value: countlyPushNotification.service.PeriodEnum.WEEKLY},
                {label: i18n("push-notification.time-chart-period-monthly"), value: countlyPushNotification.service.PeriodEnum.MONTHLY},
            ],
            selectedOneTimePeriodFilter: countlyPushNotification.service.PeriodEnum.WEEKLY,
            automaticPeriodFilters: [{label: i18n("push-notification.time-chart-period-daily"), value: countlyPushNotification.service.PeriodEnum.DAILY}],
            statusOptions: countlyPushNotification.service.statusOptions,
            selectedAutomaticPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
            transactionalPeriodFilters: [{label: i18n("push-notification.time-chart-period-daily"), value: countlyPushNotification.service.PeriodEnum.DAILY}],
            selectedTransactionalPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
            TypeEnum: countlyPushNotification.service.TypeEnum,
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
            StatusEnum: countlyPushNotification.service.StatusEnum,
            optionalTableColumns: [
                {
                    value: "content",
                    label: i18n('push-notification.table-message-content'),
                    default: false
                },
                {
                    value: "createdBy",
                    label: i18n('push-notification.table-created-by'),
                    default: false
                },
                {
                    value: "created",
                    label: i18n('push-notification.table-created'),
                    default: false
                }
            ],
            notificationTypes: [],
            selectedNotificationKind: [],
            platformOptions: []
        };
    },
    watch: {
        selectedNotificationKind: {
            handler(newValue) {
                const apiKinds = this.mapNotificationKinds(newValue);
                this.$store.dispatch('countlyPushNotificationMain/onSetPushNotificationKind', apiKinds);
                this.$store.dispatch('countlyPushNotificationMain/fetchPushTable', true);
            },
            deep: true
        }
    },
    computed: {
        selectedPushNotificationType: function() {
            return this.$store.state.countlyPushNotificationMain.selectedPushNotificationType;
        },
        isDashboardLoading: function() {
            return this.$store.getters['countlyPushNotificationDashboard/isLoading'];
        },
        areRowsLoading: function() {
            return this.$store.state.countlyPushNotificationMain.areRowsLoading;
        },
        isUserCommandLoading: function() {
            return this.$store.getters['countlyPushNotificationMain/isLoading'];
        },
        pushNotificationOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisPushNotificationPeriods
                },
                series: this.yAxisPushNotificationSeries
            };
        },
        kafkaStatus: function() {
            return this.$store.state.countlyPushNotificationDashboard.kafkaStatus;
        },
        totalAppUsers: function() {
            return this.$store.state.countlyPushNotificationDashboard.totalAppUsers;
        },
        enabledUsers: function() {
            return this.$store.state.countlyPushNotificationDashboard.enabledUsers[this.PlatformEnum.ALL];
        },
        enabledUsersPercentage: function() {
            if (!this.totalAppUsers) {
                return 0;
            }
            return parseInt(this.formatPercentage(this.enabledUsers / this.totalAppUsers));
        },
        xAxisPushNotificationPeriods: function() {
            return this.$store.state.countlyPushNotificationDashboard.periods[this.selectedPushNotificationType][this.selectedPeriodFilter];
        },
        yAxisPushNotificationSeries: function() {
            var self = this;
            return this.$store.state.countlyPushNotificationDashboard.series[this.selectedPushNotificationType][this.selectedPeriodFilter].map(function(pushNotificationSerie) {
                return {
                    data: pushNotificationSerie.data[self.selectedPlatformFilter] || [],
                    name: pushNotificationSerie.label
                };
            });
        },
        legend: function() {
            return {
                show: true,
                type: "primary",
                data: [
                    {
                        name: i18n('push-notification.sent-serie-name'),
                        value: this.formatNumber(this.$store.state.countlyPushNotificationDashboard.totalSent[this.selectedPushNotificationType][this.selectedPlatformFilter]),
                        tooltip: i18n('push-notification.sent-serie-description')
                    },
                    {
                        name: i18n('push-notification.actions-performed-serie-name'),
                        value: this.formatNumber(this.$store.state.countlyPushNotificationDashboard.totalActions[this.selectedPushNotificationType][this.selectedPlatformFilter]),
                        tooltip: i18n('push-notification.actions-performed-serie-description')
                    }
                ]
            };
        },
        selectedStatusFilter: {
            get: function() {
                return this.$store.state.countlyPushNotificationMain.statusFilter;
            },
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationMain/onSetStatusFilter", value);
                this.applyFilter();
            }
        },
        isLoading: {
            get: function() {
                return this.$store.getters["countlyPushNotificationMain/isLoadingTable"];
            }
        },
        selectedPlatformFilter: {
            get: function() {
                return this.$store.state.countlyPushNotificationMain.platformFilter;
            },
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationMain/onSetPlatformFilter", value);
            }
        },
        selectedPlatformFilterLabel: function() {
            return this.platformFilterLabel[this.selectedPushNotificationType];
        },
        selectedPeriodFilter: function() {
            if (this.selectedPushNotificationType === countlyPushNotification.service.TypeEnum.ONE_TIME) {
                return this.selectedOneTimePeriodFilter;
            }
            else if (this.selectedPushNotificationType === countlyPushNotification.service.TypeEnum.AUTOMATIC) {
                return this.selectedAutomaticPeriodFilter;
            }
            else {
                return this.selectedTransactionalPeriodFilter;
            }
        },
        hasApproverPermission: function() {
            return countlyPushNotification.service.hasApproverPermission();
        },
        activeFilterFields: function() {
            var self = this;
            var statusOptions = Object.keys(self.statusOptions).map(key => ({label: self.statusOptions[key].label, value: self.statusOptions[key].value}));
            statusOptions.push({label: 'All Status', value: ''});
            const lastElementStatus = statusOptions.pop();
            statusOptions.unshift(lastElementStatus);
            return [
                {
                    label: "Platform",
                    key: "platform",
                    items: this.platformFilters,
                    default: ""
                },
                {
                    label: "Status",
                    key: "status",
                    items: statusOptions,
                    default: ""
                }
            ];
        },
        activeFilter: {
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationMain/onSetPlatformFilter", value.platform);
                this.$store.dispatch("countlyPushNotificationMain/onSetStatusFilter", value.status);
                this.$store.dispatch("countlyPushNotificationMain/onSetActiveFilter", value);
                return this.$store.dispatch('countlyPushNotificationMain/fetchPushTable');
            },
            get: function() {
                return this.$store.state.countlyPushNotificationMain.activeFilter;
            }
        },
    },
    methods: {
        refresh: function() {
            //this.$store.dispatch('countlyPushNotificationMain/fetchPushTable');
        },
        applyFilter: function() {
            this.$store.dispatch('countlyPushNotificationMain/fetchPushTable');
        },
        formatPercentage: function(value, decimalPlaces) {
            return this.formatNumber(formatPercentage(value, decimalPlaces));
        },
        getPreviewPlatforms: function(platforms) {
            return platforms.map(function(item) {
                return countlyPushNotification.service.platformOptions[item].label;
            }).sort().join(', ');
        },
        onApprove: function(id) {
            this.handleUserCommands(this.UserCommandEnum.APPROVE, id);
        },
        handleUserCommands: function(command, pushNotificationId, notificationType) {
            this.$store.dispatch('countlyPushNotificationMain/onUserCommand', {type: command, pushNotificationId: pushNotificationId});
            switch (command) {
            case this.UserCommandEnum.RESEND: {
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.DUPLICATE: {
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.DELETE: {
                this.$store.dispatch('countlyPushNotificationMain/onDelete', pushNotificationId);
                break;
            }
            case this.UserCommandEnum.REJECT: {
                this.$store.dispatch('countlyPushNotificationMain/onReject', pushNotificationId);
                break;
            }
            case this.UserCommandEnum.APPROVE: {
                this.$store.dispatch('countlyPushNotificationMain/onApprove', pushNotificationId);
                break;
            }
            case this.UserCommandEnum.EDIT: {
                this.$store.dispatch('countlyPushNotificationMain/onSetTriggerKind', notificationType);
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.EDIT_DRAFT: {
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.EDIT_REJECT: {
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
                break;
            }
            case this.UserCommandEnum.STOP: {
                this.$store.dispatch('countlyPushNotificationMain/onToggle', {id: pushNotificationId, isActive: false});
                break;
            }
            case this.UserCommandEnum.START: {
                this.$store.dispatch('countlyPushNotificationMain/onToggle', {id: pushNotificationId, isActive: true});
                break;
            }
            case this.UserCommandEnum.CREATE: {
                this.$store.dispatch('countlyPushNotificationMain/onSetIsDrawerOpen', true);
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
            return (status === this.StatusEnum.PENDING_APPROVAL || status === this.StatusEnum.SCHEDULED || status === this.StatusEnum.ACTIVE) && this.canUserUpdate;
        },
        shouldShowStartUserCommand: function(status) {
            if (this.selectedPushNotificationType === this.TypeEnum.ONE_TIME) {
                return false;
            }
            if (!this.canUserUpdate) {
                return false;
            }
            return status === this.StatusEnum.STOPPED
            || status === this.StatusEnum.FAILED;
        },
        shouldShowStopUserCommand: function(status) {
            if (this.selectedPushNotificationType === this.TypeEnum.ONE_TIME) {
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
        mapNotificationKinds(notificationKinds) {
            const kindMapping = {
                plain: "plain",
                auto: ["event", "cohort"],
                rec: "rec",
                multi: "multi",
                api: "api",
                all: ["plain", "event", "cohort", "rec", "multi", "api"]
            };
            const mappedKinds = [];

            if (!notificationKinds.length) {
                return kindMapping.all;
            }

            notificationKinds.forEach(kind => {
                if (kindMapping[kind]) {
                    if (Array.isArray(kindMapping[kind])) {
                        mappedKinds.push(...kindMapping[kind]);
                    }
                    else {
                        mappedKinds.push(kindMapping[kind]);
                    }
                }
            });
            return mappedKinds;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlyPushNotificationMain/fetchPushTable', true);
        this.notificationTypes.push(
            {label: "One-Time Notifications", value: "plain"},
            {label: "Automated Notifications", value: "auto"},
            {label: "Recurring Notifications", value: "rec"},
            {label: "Multiple Notifications", value: "multi"},
            {label: "API Notifications", value: "api"}
        );
    },
};
</script>
