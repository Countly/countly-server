<template>
    <el-card class="box-card cly-vue-push-notification-details-summary-card">
        <div class="bu-p-1">
            <template v-if="pushNotification.type === TypeEnum.ONE_TIME || pushNotification.type === TypeEnum.AUTOMATIC || pushNotification.type === TypeEnum.RECURRING  || pushNotification.type === TypeEnum.MULTIPLE">
                <div class="cly-vue-push-notification-details-summary__header bu-mt-1 bu-mb-4" >
                    {{i18n('push-notification-details.targeting-sub-header')}}
                </div>
                <div class="bu-pb-4">
                    <template v-if="pushNotification.type === TypeEnum.ONE_TIME || pushNotification.type === TypeEnum.RECURRING || pushNotification.type === TypeEnum.MULTIPLE">
                        <template v-if="pushNotification[pushNotification.type].targeting === TargetingEnum.ALL">
                            <details-tab-row :label="i18n('push-notification-details.targeted-users')">
                                {{targetingOptions[pushNotification[pushNotification.type].targeting].label}}
                            </details-tab-row>
                        </template>
                        <template v-else>
                            <details-tab-row :label="i18n('push-notification-details.targeted-users')">
                                <div class="bu-is-flex bu-is-flex-direction-column">
                                    <template v-if="cohorts.length">
                                        <div class="bu-level" v-for="cohortName in previewCohorts">
                                            {{cohortName}}
                                        </div>
                                    </template>
                                    <template v-else> <span>-</span> </template>
                                </div>
                            </details-tab-row>
                            <details-tab-row :label="i18n('push-notification-details.geolocation')">
                                <div class="bu-is-flex bu-is-flex-direction-column">
                                    <template v-if="locations.length">
                                        <div class="bu-level" v-for="locationName in previewLocations">
                                            {{locationName}}
                                        </div>
                                    </template>
                                    <template v-else><span>-</span></template>
                                </div>
                            </details-tab-row>
                        </template>
                        <details-tab-row
                            v-if="pushNotification.type === TypeEnum.ONE_TIME || pushNotification.type === TypeEnum.RECURRING"
                            :label="i18n('push-notification-details.when-to-determine')"
                            :value="audienceSelectionOptions[pushNotification[pushNotification.type].audienceSelection].label">
                        </details-tab-row>
                    </template>
                    <template v-if="pushNotification.type === TypeEnum.AUTOMATIC">
                        <details-tab-row :label="i18n('push-notification.trigger-type')" :value="triggerOptions[pushNotification.automatic.trigger].label"> </details-tab-row>
                        <details-tab-row v-if="pushNotification.automatic.trigger === TriggerEnum.EVENT" :label="i18n('push-notification.events')">
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <div class="bu-level" v-for="eventName in pushNotification.automatic.events">
                                    {{eventName}}
                                </div>
                            </div>
                        </details-tab-row>
                        <details-tab-row v-else :label="i18n('push-notification.cohorts')">
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <div class="bu-level" v-for="cohortName in previewCohorts">
                                    {{cohortName}}
                                </div>
                            </div>
                        </details-tab-row>
                        <details-tab-row :label="i18n('push-notification.geolocations')">
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <template v-if="locations.length">
                                    <div class="bu-level" v-for="locationName in locations">
                                        {{locationName}}
                                    </div>
                                </template>
                                <template><span>-</span></template>
                            </div>
                        </details-tab-row>
                        <details-tab-row v-if="pushNotification.automatic.trigger !== TriggerEnum.EVENT" :label="i18n('push-notification.behavior-trigger-not-met')" :value="triggerNotMetOptions[pushNotification.automatic.triggerNotMet].label"></details-tab-row>
                    </template>
                </div>
            </template>
            <div class="cly-vue-push-notification-details-summary__header bu-mt-1 bu-mb-4">
                {{i18n('push-notification-details.delivery-sub-header')}}
            </div>
            <div>
                <template v-if="pushNotification.type === TypeEnum.ONE_TIME">
                    <details-tab-row :label="i18n('push-notification.delivery-type')" :value="startDateOptions[pushNotification.delivery.type].label"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-details.scheduled-for')" :value="formatDateAndTime(pushNotification.delivery.startDate)"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-details.expiration-time')" :value="i18n('push-notification-details.message-expires-after', pushNotification.expiration.days, pushNotification.expiration.hours)"> </details-tab-row>
                </template>
                <template v-if="pushNotification.type === TypeEnum.AUTOMATIC || pushNotification.type === TypeEnum.TRANSACTIONAL">
                    <details-tab-row :label="i18n('push-notification.delivery-timeframe')" :value="startDateOptions[pushNotification.delivery.type].label"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification.start-date')" :value="formatDateAndTime(pushNotification.delivery.startDate)"></details-tab-row>
                    <details-tab-row v-if="pushNotification.type === TypeEnum.AUTOMATIC && pushNotification.delivery.endDate" :label="i18n('push-notification.end-date')" :value="formatDateAndTime(pushNotification.delivery.endDate)"></details-tab-row>
                    <details-tab-row v-if="pushNotification.type === TypeEnum.AUTOMATIC" :label="i18n('push-notification.delivery-method')" :value="deliveryMethodOptions[pushNotification.automatic.deliveryMethod].label"></details-tab-row>
                    <details-tab-row v-if="pushNotification.type === TypeEnum.AUTOMATIC" :label="i18n('push-notification.capping')">
                        <template v-if="pushNotification.automatic.capping">
                            {{i18n('push-notification.maximum-messages',pushNotification.automatic.maximumMessagesPerUser)}} <br />
                            {{i18n('push-notification.minimum-days-and-hours',pushNotification.automatic.minimumTimeBetweenMessages.days,pushNotification.automatic.minimumTimeBetweenMessages.hours)}}
                        </template>
                        <template v-else>
                            {{i18n('push-notification.no-capping')}} <br />
                        </template>
                    </details-tab-row>
                </template>
                <template v-if="pushNotification.type === TypeEnum.RECURRING">
                    <details-tab-row :label="i18n('push-notification-drawer.rec-push-start-date')" :value="formatDateAndTime(pushNotification.delivery.startDate)"> </details-tab-row>
                    <details-tab-row v-if="pushNotification.delivery.endDate" :label="i18n('push-notification.end-date')" :value="formatDateAndTime(pushNotification.delivery.endDate)"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-drawer.notification-frequency')" :value="pushNotification.delivery.repetition.bucket"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-drawer.repetition-for-every')" :value="pushNotification.delivery.repetition.every"> </details-tab-row>
                    <details-tab-row v-if="pushNotification.delivery.repetition.on.length" :label="i18n('push-notification-drawer.repeat-on')" :value="pushNotification.delivery.repetition.on"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-drawer.repeat-at')" :value="formatDateTime(pushNotification.delivery.repetition.at, 'HH:mm a')"></details-tab-row>
                    <details-tab-row v-if="pushNotification.delivery.prev || pushNotification.delivery.last" :label="i18n('push-notification.next-delivery-dates')" :value="calculateDeliveryDates(pushNotification.delivery.prev, pushNotification.delivery.last)"></details-tab-row>
                </template>
                <template v-if="pushNotification.type === TypeEnum.MULTIPLE">
                    <details-tab-row :label="i18n('push-notification.delivery-dates')" :value="formatDateAndTime(pushNotification.delivery.multipleDates, 'HH:mm a', true)"></details-tab-row>
                    <details-tab-row :label="i18n('push-notification.delivery-type')" :value="startDateOptions[pushNotification.delivery.type].label"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-details.scheduled-for')" :value="formatDateAndTime(pushNotification.delivery.startDate)"> </details-tab-row>
                    <details-tab-row :label="i18n('push-notification-details.expiration-time')" :value="i18n('push-notification-details.message-expires-after', pushNotification.expiration.days, pushNotification.expiration.hours)"></details-tab-row>
                    <details-tab-row v-if="pushNotification.delivery.prev || pushNotification.delivery.last" :label="i18n('push-notification.next-delivery-dates')" :value="calculateDeliveryDates(pushNotification.delivery.prev, pushNotification.delivery.last)"></details-tab-row>
                </template>
            </div>
        </div>
    </el-card>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyPushNotification from '../../store/index.js';
import DetailsTabRow from './DetailsTabRow.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            DAY_TO_MS_RATIO: 86400 * 1000,
            TypeEnum: countlyPushNotification.service.TypeEnum,
            TargetingEnum: countlyPushNotification.service.TargetingEnum,
            TriggerEnum: countlyPushNotification.service.TriggerEnum,
            startDateOptions: countlyPushNotification.service.startDateOptions,
            targetingOptions: countlyPushNotification.service.targetingOptions,
            audienceSelectionOptions: countlyPushNotification.service.audienceSelectionOptions,
            triggerOptions: countlyPushNotification.service.triggerOptions,
            triggerNotMetOptions: countlyPushNotification.service.triggerNotMetOptions,
            deliveryMethodOptions: countlyPushNotification.service.deliveryMethodOptions,
            cohorts: [],
            locations: [],
            isFetchLocationsLoading: false,
            isFetchCohortsLoading: false,
        };
    },
    computed: {
        pushNotification: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification;
        },
        previewCohorts: function() {
            return this.cohorts.map(function(cohortItem) {
                return cohortItem.name;
            });
        },
        previewLocations: function() {
            return this.locations.map(function(locationItem) {
                return locationItem.name;
            });
        }
    },
    methods: {
        convertDaysInMsToDays: function(daysInMs) {
            return daysInMs / this.DAY_TO_MS_RATIO;
        },
        formatDateAndTime: function(date, isMultiple) {
            if (isMultiple) {
                const dates = date.map(function(eachDate) {
                    return countlyPushNotification.helper.formatDateTime(eachDate, 'MMMM Do YYYY h:mm a').toString();
                });
                return dates.join(", ");
            }
            return countlyPushNotification.helper.formatDateTime(date, 'MMMM Do, YYYY, h:mm a');
        },
        formatDateTime: function(dateTime, format) {
            return countlyPushNotification.helper.formatDateTime(dateTime, format);
        },
        formatRepetitionDays: function(repetitionDays) {
            const days = this.weeklyRepetitionOptions.map(option => option.label);
            const selectedDays = repetitionDays.map(day => days[day - 1]);
            return selectedDays.join(', ');
        },
        calculateDeliveryDates: function(prev, last) {
            var nextDeliveryDates = [];
            if (prev && prev > Date.now()) {
                nextDeliveryDates.push(this.formatDateTime(prev, 'DD MMMM YYYY'));
            }
            if (last && last > Date.now() && last !== prev) {
                nextDeliveryDates.push(this.formatDateTime(last, 'DD MMMM YYYY'));
            }
            return nextDeliveryDates.join(', ');
        },
        setCohorts: function(cohorts) {
            this.cohorts = cohorts;
        },
        setLocations: function(locations) {
            this.locations = locations;
        },
        fetchCohorts: function() {
            var self = this;
            if (this.pushNotification.type === this.TypeEnum.TRANSACTIONAL) {
                return;
            }
            this.isFetchCohortsLoading = true;
            var cohortsList = [];
            if (this.pushNotification.type === this.TypeEnum.ONE_TIME) {
                cohortsList = this.pushNotification.cohorts;
            }
            if (this.pushNotification.type === this.TypeEnum.AUTOMATIC) {
                cohortsList = this.pushNotification.automatic.cohorts;
            }
            countlyPushNotification.service.fetchCohorts(cohortsList, false)
                .then(function(cohorts) {
                    self.setCohorts(cohorts);
                }).catch(function(error) {
                    console.error(error);
                    self.setCohorts([]);
                }).finally(function() {
                    self.isFetchCohortsLoading = false;
                });
        },
        fetchLocations: function() {
            var self = this;
            if (this.pushNotification.type === this.TypeEnum.TRANSACTIONAL) {
                return;
            }
            this.isFetchLocationsLoading = true;
            countlyPushNotification.service.fetchLocations(this.pushNotification.locations, false)
                .then(function(locations) {
                    self.setLocations(locations);
                }).catch(function(error) {
                    console.error(error);
                    self.setLocations([]);
                }).finally(function() {
                    self.isFetchLocationsLoading = false;
                });
        },
    },
    mounted: function() {
        this.fetchCohorts();
        this.fetchLocations();
    },
    components: {
        'details-tab-row': DetailsTabRow
    }
};
</script>
