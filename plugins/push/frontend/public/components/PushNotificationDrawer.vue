<template>
<cly-drawer
    class="cly-vue-push-notification-drawer"
    @submit="onSubmit"
    @close="onClose"
    @open="onOpen"
    ref="drawer"
    :set-step-callback-fn="onStepClick"
    :title="title"
    :requires-async-submit="true"
    :saveButtonLabel="saveButtonLabel"
    v-bind="controls">
    <template v-slot:sidecars="drawerScope">
        <cly-content id="mainSidecar" role="sidecar" :always-active="true" style="display: flex;justify-content: center;align-items: center; height:100%">
            <mobile-message-preview
                v-if="(drawerScope.currentStepId === 'step4' ||  drawerScope.currentStepId === 'step5') && pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                :title="pushNotificationUnderEdit.message[activeLocalization].title"
                :subtitle="pushNotificationUnderEdit.settings[PlatformEnum.IOS].subtitle"
                :content="pushNotificationUnderEdit.message[activeLocalization].content"
                :platforms="pushNotificationUnderEdit.platforms"
                :media="previewMessageMedia"
                :buttons="pushNotificationUnderEdit.message[activeLocalization].buttons.map(function(item){return item.label})">
            </mobile-message-preview>
        </cly-content>
    </template>
    <template v-slot:controls-left="controlsLeft">
        <el-button size="small" @click="onDraft" type="default" :disabled="!isDraftButtonEnabled">{{i18n('push-notification.save-as-draft')}}</el-button>
    </template>
    <template v-slot:default="drawerScope">
            <cly-form-step id="step1" :name="i18n('push-notification-drawer.step-one')">
                <form>
                    <div class="cly-vue-push-notification-drawer__section">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.notification-name')}}</div>
                        <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.notification-name-description')}}</div>
                        <validation-provider v-slot="validation">
                            <form>
                                <el-input
                                    autocomplete="off"
                                    v-model="pushNotificationUnderEdit.name"
                                    :placeholder="i18n('push-notification-drawer.campaign-name')"
                                    :class="{'is-error': validation.errors.length > 0}">
                                </el-input>
                            </form>
                        </validation-provider>
                        <div class="bu-mt-5">
                            <div>
                                <span class="text-medium font-weight-bold">{{ i18n('push-notification-drawer.notification-type') }}</span>
                                <cly-tooltip-icon
                                    style="margin-bottom: 1px"
                                    :tooltip="i18n('push-notification-drawer.notification-type-tooltip')"
                                    icon="ion ion-help-circled">
                                </cly-tooltip-icon>
                            </div>
                            <div class="bu-mt-2" v-for="campaign in campaignTypes">
                                <line-radio-button-with-description
                                    :label="campaign.label"
                                    v-model="campaignType"
                                    :description="campaign.description"
                                    :title="campaign.label"
                                    :disabled="isEditMode()"
                                    border>
                                </line-radio-button-with-description>
                            </div>
                        </div>
                    </div>
                </form>
            </cly-form-step>
            <cly-form-step id="step2" :name="i18n('push-notification-drawer.step-two')" v-loading="isLoading">
                <form>
                <div class="cly-vue-push-notification-drawer__section">
                    <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__checkbox-group-header">{{i18n('push-notification.platforms')}}</div>
                    <validation-provider v-slot="validation" rules="required" name="platforms">
                        <el-checkbox-group :value="pushNotificationUnderEdit.platforms">
                            <el-checkbox
                                type="checkbox"
                                :label="PlatformEnum.ANDROID"
                                @change="onPlatformChange(PlatformEnum.ANDROID)"
                                :class="{'cly-vue-push-notification-drawer__checkbox-is-error':validation.errors.length > 0}">
                                {{i18n('push-notification.android')}}
                            </el-checkbox>
                            <el-checkbox
                                type="checkbox"
                                @change="onPlatformChange(PlatformEnum.IOS)"
                                :label="PlatformEnum.IOS"
                                :class="{'cly-vue-push-notification-drawer__checkbox-is-error':validation.errors.length > 0}">
                                {{i18n('push-notification.ios')}}
                            </el-checkbox>
                        </el-checkbox-group>
                    </validation-provider>
                </div>
                <template v-if="type === TypeEnum.ONE_TIME || type ===  TypeEnum.RECURRING || type === TypeEnum.MULTIPLE">
                    <div  class="cly-vue-drawer-step__section" v-if="typeof pushNotificationUnderEdit.isEe !== 'undefined' && pushNotificationUnderEdit.isEe">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                            {{i18n('push-notification.targeting')}}
                            <cly-tooltip-icon
                                :tooltip="i18n('push-notification.targeting-tooltip')"
                                icon="ion ion-help-circled">
                            </cly-tooltip-icon>
                        </div>
                        <div class="bu-level bu-is-flex-wrap-wrap">
                            <large-radio-button-with-description
                                :label="TargetingEnum.ALL"
                                :tooltip="i18n('push-notification-drawer.all-push-enabled-users-tooltip')"
                                v-model="pushNotificationUnderEdit[type].targeting"
                                :description="i18n('push-notification.push-enabled-users')"
                                :title="i18n('push-notification.all-push-enabled-users')">
                                <div v-if="pushNotificationUnderEdit[type].audienceSelection === AudienceSelectionEnum.NOW" class="bu-is-flex bu-is-justify-content-flex-start bu-is-align-items-baseline">
                                    <span class="cly-vue-push-notification-large-radio-button-with-description__content-header bu-mr-2">{{totalEnabledUsers}}</span>
                                </div>
                            </large-radio-button-with-description>
                            <large-radio-button-with-description
                                :label="TargetingEnum.SEGMENTED"
                                v-model="pushNotificationUnderEdit[type].targeting"
                                :title="i18n('push-notification.use-segmentation')"
                                :description="i18n('push-notification.use-segmentation-description')">
                            </large-radio-button-with-description>
                        </div>
                    </div>
                    <div v-if="pushNotificationUnderEdit[type].targeting === TargetingEnum.SEGMENTED && pushNotificationUnderEdit.isCohorts">
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.send-to-users-in-cohorts')}}</div>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.send-to-users-in-cohorts-description')}}</div>
                            <validation-provider vid="cohort" v-slot="validation" :rules="{required:areCohortsAndLocationsRequired}" :detectInput="true">
                                <el-select
                                    v-model="pushNotificationUnderEdit.cohorts"
                                    multiple
                                    isFullWidth
                                    filterable
                                    reserve-keyword
                                    :placeholder="i18n('push-notification.select-cohort')"
                                    :loading="isFetchCohortsLoading"
                                    :class="{'is-error': validation.errors.length > 0}"
                                    style="width:100%">
                                    <el-option
                                        v-for="item in cohortOptions"
                                        :key="item._id"
                                        :label="item.name"
                                        :value="item._id">
                                    </el-option>
                                </el-select>
                            </validation-provider>
                        </div>
                        <div class="cly-vue-drawer-step__section" v-if="pushNotificationUnderEdit.isGeo">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.send-to-users-in-locations')}}</div>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.send-to-users-in-locations-description')}}</div>
                            <validation-provider vid="location" v-slot="validation" :rules="{required:areCohortsAndLocationsRequired}" :detectInput="true">
                                <el-select
                                    v-model="pushNotificationUnderEdit.locations"
                                    multiple
                                    isFullWidth
                                    filterable
                                    reserve-keyword
                                    :loading="isFetchLocationsLoading"
                                    :placeholder="i18n('push-notification.select-location')"
                                    :class="{'is-error': validation.errors.length > 0}"
                                    style="width:100%">
                                    <el-option
                                        v-for="item in locationOptions"
                                        :key="item._id"
                                        :label="item.name"
                                        :value="item._id">
                                    </el-option>
                                </el-select>
                            </validation-provider>
                        </div>
                    </div>
                    <!-- TODO: THIS IS COMPLICATING A LOT OF THINGS, SO WE ARE COMMENTING IT OUT FOR NOW UNTIL WE DECIDE IF WE WANT TO KEEP IT OR NOT
                    <div v-if="type === TypeEnum.ONE_TIME" class="cly-vue-drawer-step__section">
                        <div class="bu-mb-2 cly-vue-push-notification-drawer__line-radio-button-group-header">
                            {{i18n('push-notification.when-to-determine-users')}}
                            <cly-tooltip-icon :tooltip="i18n('push-notification.when-to-determine-users-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                        </div>
                        <div class="bu-is-flex bu-is-flex-direction-column">
                            <line-radio-button-with-description
                                :label="AudienceSelectionEnum.NOW"
                                v-model="pushNotificationUnderEdit[type].audienceSelection"
                                :title="i18n('push-notification.determine-users-now')">
                            </line-radio-button-with-description>
                            <line-radio-button-with-description
                                :label="AudienceSelectionEnum.BEFORE"
                                v-model="pushNotificationUnderEdit[type].audienceSelection"
                                :title="i18n('push-notification.determine-users-before')">
                            </line-radio-button-with-description>
                        </div>
                    </div> -->
                </template>
                <template v-else-if="type === TypeEnum.AUTOMATIC">
                    <div class="cly-vue-drawer-step__section" v-if="pushNotificationUnderEdit.isGeo">
                        <div class="bu-is-flex bu-is-align-items-center">
                            <el-switch v-model="isLocationSet" class="bu-mr-1"></el-switch>
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                                {{i18n('push-notification.geolocations')}}
                            </div>
                        </div>
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.send-to-users-in-locations')}}</div>
                        <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.send-to-users-in-locations-description')}}</div>
                        <validation-provider v-slot="validation" :rules="{required:isLocationSet}">
                            <el-select
                                v-model="pushNotificationUnderEdit.locations"
                                multiple
                                isFullWidth
                                filterable
                                reserve-keyword
                                :disabled="!isLocationSet"
                                :placeholder="i18n('push-notification.select-location')"
                                :loading="isFetchLocationsLoading"
                                :class="{'is-error': validation.errors.length > 0}"
                                style="width:100%">
                                <el-option
                                    v-for="item in locationOptions"
                                    :key="item._id"
                                    :label="item.name"
                                    :value="item._id">
                                </el-option>
                            </el-select>
                        </validation-provider>
                    </div>
                    <div class="cly-vue-drawer-step__section">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                            {{i18n('push-notification.triggers')}}
                            <!-- <cly-tooltip-icon :tooltip="i18n('push-notification.triggers-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon> -->
                        </div>
                        <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.triggers-description')}}</div>
                        <div class="bu-is-flex bu-is-flex-direction-column">
                            <el-radio
                                class="is-autosized is-multiline bu-mt-2 bu-ml-0"
                                v-model="pushNotificationUnderEdit.automatic.trigger"
                                :label="TriggerEnum.COHORT_ENTRY"
                                border>
                                <div class="cly-vue-push-notification-line-radio-button-with-description__title">{{i18n('push-notification.cohorts-entry')}}</div>
                                <div class="text-small bu-has-text-grey bu-mt-1">{{i18n('push-notification.cohorts-entry-description')}}</div>
                            </el-radio>
                            <el-radio
                                class="is-autosized is-multiline bu-mt-2 bu-ml-0"
                                v-model="pushNotificationUnderEdit.automatic.trigger"
                                :label="TriggerEnum.COHORT_EXIT"
                                border>
                                <div class="cly-vue-push-notification-line-radio-button-with-description__title">{{i18n('push-notification.cohorts-exit')}}</div>
                                <div class="text-small bu-has-text-grey bu-mt-1">{{i18n('push-notification.cohorts-exit-description')}}</div>
                            </el-radio>
                            <el-radio
                                class="is-autosized is-multiline bu-mt-2 bu-ml-0"
                                v-model="pushNotificationUnderEdit.automatic.trigger"
                                :label="TriggerEnum.EVENT"
                                border>
                                <div class="cly-vue-push-notification-line-radio-button-with-description__title">{{i18n('push-notification.performed-events')}}</div>
                                <div class="text-small bu-has-text-grey bu-mt-1">{{i18n('push-notification.performed-events-description')}}</div>
                            </el-radio>
                        </div>
                    </div>
                    <template v-if="pushNotificationUnderEdit.automatic.trigger === TriggerEnum.EVENT">
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.select-event-to-set-trigger')}}</div>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.select-event-to-set-trigger-description')}}</div>
                            <validation-provider v-slot="validation" rules="required" :detectInput="true">
                                <el-select
                                    v-model="pushNotificationUnderEdit.automatic.events"
                                    multiple
                                    filterable
                                    isFullWidth
                                    reserve-keyword
                                    :collapse-tags="false"
                                    :placeholder="i18n('push-notification.select-event')"
                                    :loading="isFetchEventsLoading"
                                    :class="{'is-error': validation.errors.length > 0}"
                                    style="width:100%">
                                    <el-option
                                        v-for="item in eventOptions"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value">
                                    </el-option>
                                </el-select>
                            </validation-provider>
                        </div>
                    </template>
                    <template v-else>
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.select-cohort-to-set-trigger')}}</div>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.select-cohort-to-set-trigger-description')}}</div>
                            <validation-provider v-slot="validation" rules="required" :detectInput="true">
                                <el-select
                                    v-model="pushNotificationUnderEdit.automatic.cohorts"
                                    multiple
                                    isFullWidth
                                    filterable
                                    reserve-keyword
                                    :collapse-tags="false"
                                    :placeholder="i18n('push-notification.select-cohort')"
                                    :loading="isFetchCohortsLoading"
                                    :class="{'is-error': validation.errors.length > 0}"
                                    style="width:100%">
                                    <el-option
                                        v-for="item in cohortOptions"
                                        :key="item._id"
                                        :label="item.name"
                                        :value="item._id">
                                    </el-option>
                                </el-select>
                            </validation-provider>
                        </div>
                    </template>
                    <template v-if="pushNotificationUnderEdit.automatic.trigger !== TriggerEnum.EVENT">
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-mb-2 cly-vue-push-notification-drawer__line-radio-button-group-header">
                                {{i18n('push-notification.behavior-trigger-not-met')}}
                            </div>
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <line-radio-button-with-description
                                    :label="TriggerNotMetEnum.SEND_ANYWAY"
                                    v-model="pushNotificationUnderEdit.automatic.triggerNotMet"
                                    :title="i18n('push-notification.send-anyway')">
                                </line-radio-button-with-description>
                                <line-radio-button-with-description
                                    :label="TriggerNotMetEnum.CANCEL_ON_EXIT"
                                    v-model="pushNotificationUnderEdit.automatic.triggerNotMet"
                                    :title="i18n('push-notification.cancel-when-user-exits-cohort')">
                                </line-radio-button-with-description>
                            </div>
                        </div>
                    </template>
                </template>
                <template v-else-if="type === TypeEnum.RECURRING">
                    <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                        {{i18n('push-notification.targeting')}}
                        <cly-tooltip-icon
                            :tooltip="i18n('push-notification.targeting-tooltip')"
                            icon="ion ion-help-circled">
                        </cly-tooltip-icon>
                    </div>
                    <div class="bu-level bu-is-flex-wrap-wrap">
                        <large-radio-button-with-description
                            :label="TargetingEnum.ALL"
                            :tooltip="i18n('push-notification-drawer.all-push-enabled-users-tooltip')"
                            v-model="pushNotificationUnderEdit[TypeEnum.RECURRING].targeting"
                            :description="i18n('push-notification.push-enabled-users')"
                            :title="i18n('push-notification.all-push-enabled-users')">
                            <div v-if="pushNotificationUnderEdit[TypeEnum.RECURRING].audienceSelection === AudienceSelectionEnum.NOW" class="bu-is-flex bu-is-justify-content-flex-start bu-is-align-items-baseline">
                                <span class="cly-vue-push-notification-large-radio-button-with-description__content-header bu-mr-2">{{totalEnabledUsers}}</span>
                            </div>
                        </large-radio-button-with-description>
                        <large-radio-button-with-description
                            :label="TargetingEnum.SEGMENTED"
                            v-model="pushNotificationUnderEdit[TypeEnum.RECURRING].targeting"
                            :title="i18n('push-notification.use-segmentation')"
                            :description="i18n('push-notification.use-segmentation-description')">
                        </large-radio-button-with-description>
                    </div>
                </template>
                </form>
            </cly-form-step>
            <cly-form-step id="step3" :name="i18n('push-notification-drawer.step-three')">
                <form>
                    <div class="cly-vue-drawer-step__section">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                            <template v-if="type === TypeEnum.ONE_TIME || type === TypeEnum.RECURRING || type === TypeEnum.MULTIPLE">
                                <span class="text-big font-weight-bold">{{i18n('push-notification.delivery')}}</span>
                            </template>
                            <template v-else>{{i18n('push-notification.set-start-date')}}</template>
                            <cly-tooltip-icon :tooltip="i18n('push-notification.set-start-date-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            <span v-if="type === TypeEnum.MULTIPLE" class="text-smallish color-cool-gray-50 bu-is-block bu-mt-2">{{i18n('push-notification.delivery-date-description')}}</span>
                        </div>
                        <div class="bu-level bu-is-flex-wrap-wrap" v-if="type === TypeEnum.ONE_TIME || type === TypeEnum.AUTOMATIC || type === TypeEnum.TRANSACTIONAL">
                            <large-radio-button-with-description
                                :label="SendEnum.NOW"
                                v-model="pushNotificationUnderEdit.delivery.type"
                                :title="i18n('push-notification.send-now')"
                                :description="i18n('push-notification.send-now-description')">
                            </large-radio-button-with-description>
                            <large-radio-button-with-description
                                :label="SendEnum.LATER"
                                v-model="pushNotificationUnderEdit.delivery.type"
                                :title="i18n('push-notification.schedule-for-later')">
                                <cly-date-picker
                                    :offset-correction="false"
                                    v-bind:disabled="pushNotificationUnderEdit.delivery.type === SendEnum.NOW"
                                    v-model="startDate"
                                    timestampFormat="ms"
                                    type="date"
                                    :select-time="true"
                                    :is-future="true">
                                </cly-date-picker>
                            </large-radio-button-with-description>
                        </div>
                    </div>
                    <div v-if="type === TypeEnum.AUTOMATIC" class="cly-vue-drawer-step__section">
                        <div class="bu-is-flex bu-is-flex-direction-column bu-pb-5">
                            <div class="bu-is-flex bu-is-align-items-center">
                                <el-switch v-model="isEndDateSet" class="bu-mr-2"></el-switch>
                                <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                                    {{i18n('push-notification.set-end-date')}}
                                    <cly-tooltip-icon :tooltip="i18n('push-notification.set-end-date-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                                </div>
                            </div>
                            <div style="width:200px">
                                <cly-date-picker
                                    :offset-correction="false"
                                    class="bu-ml-6"
                                    v-bind:disabled="!isEndDateSet"
                                    v-model="endDate"
                                    timestampFormat="ms"
                                    type="date"
                                    width="200"
                                    :select-time="true"
                                    :is-future="true">
                                </cly-date-picker>
                            </div>
                        </div>
                        <div class="bu-is-flex bu-is-flex-direction-column">
                            <div class="bu-is-flex bu-is-align-items-center">
                                <el-switch v-model="isUsersTimezoneSet" class="bu-mr-2"></el-switch>
                                <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                                    {{i18n('push-notification.delivery-time')}}
                                    <cly-tooltip-icon :tooltip="i18n('push-notification.delivery-time-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                                </div>
                            </div>
                            <div style="width:200px">
                                <cly-time-picker
                                    class="bu-ml-6"
                                    v-bind:disabled="!isUsersTimezoneSet"
                                    v-model="usersTimezone">
                                </cly-time-picker>
                            </div>
                        </div>
                        <div v-if="isUsersTimezoneSet" class="cly-vue-drawer-step__section bu-mt-5">
                            <div class="bu-mb-2 cly-vue-push-notification-drawer__line-radio-button-group-header">
                                {{i18n('push-notification.what-if-past-scheduled')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.what-if-past-scheduled-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.SKIP"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.do-not-send-message')">
                                </line-radio-button-with-description>
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.NEXT_DAY"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.deliver-next-day')">
                                </line-radio-button-with-description>
                            </div>
                        </div>
                    </div>
                    <template v-if="type === TypeEnum.MULTIPLE">
                        <div v-for="(_, index) in pushNotificationUnderEdit.delivery.multipleDates" class="bu-is-flex bu-mt-2">
                            <cly-date-picker
                                :offset-correction="false"
                                v-model="pushNotificationUnderEdit.delivery.multipleDates[index]"
                                timestampFormat="ms"
                                type="date"
                                width="200"
                                :select-time="true"
                                :is-future="true">
                            </cly-date-picker>
                            <div class="cly-icon-button cly-icon-button--gray cly-vue-qb-icon" @click="removeDate(index)">
                                <i class="el-icon-close"></i>
                            </div>
                        </div>
                        <div class="cly-text-button bu-mt-3 bu-ml-3 bu-mb-5" @click="addDate()">
                        + {{i18n('push-notification.add-more')}}
                        </div>
                    </template>
                    <template v-if="(type === TypeEnum.ONE_TIME && pushNotificationUnderEdit.delivery.type === SendEnum.LATER) || (type === TypeEnum.MULTIPLE)">
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                                {{i18n('push-notification.timezone')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.timezone-description')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-level bu-is-flex-wrap-wrap bu-mt-2">
                                <large-radio-button-with-description
                                    :label="TimezoneEnum.SAME"
                                    size="large"
                                    v-model="pushNotificationUnderEdit.timezone"
                                    :title="i18n('push-notification.deliver-to-all-users-same-time')"
                                    :description="i18n('push-notification.deliver-to-all-users-same-time-description')">
                                </large-radio-button-with-description>
                                <large-radio-button-with-description
                                    :label="TimezoneEnum.DEVICE"
                                    size="large"
                                    v-model="pushNotificationUnderEdit.timezone"
                                    :title="i18n('push-notification.deliver-to-all-users-device-time')"
                                    :description="i18n('push-notification.deliver-to-all-users-device-time-description')">
                                </large-radio-button-with-description>
                            </div>
                        </div>
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-mb-2 cly-vue-push-notification-drawer__line-radio-button-group-header">
                                {{i18n('push-notification.what-if-past-scheduled')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.what-if-past-scheduled-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.SKIP"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.do-not-send-message')">
                                </line-radio-button-with-description>
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.NEXT_DAY"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.deliver-next-day')">
                                </line-radio-button-with-description>
                            </div>
                        </div>
                    </template>
                    <div class="cly-vue-drawer-step__section" v-if="type === TypeEnum.AUTOMATIC">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-big font-weight-bold">{{i18n('push-notification.delivery-method')}}</div>
                        <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.delivery-method-description')}}</div>
                        <div class="bu-level bu-is-flex-wrap-wrap">
                            <large-radio-button-with-description
                                :label="DeliveryMethodEnum.IMMEDIATELY"
                                v-model="pushNotificationUnderEdit.automatic.deliveryMethod"
                                :title="i18n('push-notification.immediately')"
                                :description="i18n('push-notification.immediately-description')">
                            </large-radio-button-with-description>
                            <large-radio-button-with-description
                                :label="DeliveryMethodEnum.DELAYED"
                                v-model="pushNotificationUnderEdit.automatic.deliveryMethod"
                                :title="i18n('push-notification.delayed')">
                                <validation-provider v-slot="validation" rules="required|integer" class="bu-mr-1">
                                    <el-input
                                        :disabled="pushNotificationUnderEdit.automatic.deliveryMethod !== DeliveryMethodEnum.DELAYED"
                                        v-model="pushNotificationUnderEdit.automatic.delayed.days"
                                        controls-position="right"
                                        :class="{'is-error': validation.errors.length > 0}"
                                        :min="0"
                                        style="min-width:100px">
                                        <template slot="suffix">
                                            <span class="bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.days')}}</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                                <validation-provider v-slot="validation" rules="required|integer|min_value:0|max_value:23|min:1|max:2" class="bu-ml-1">
                                    <el-input
                                        :disabled="pushNotificationUnderEdit.automatic.deliveryMethod !== DeliveryMethodEnum.DELAYED"
                                        v-model="pushNotificationUnderEdit.automatic.delayed.hours"
                                        controls-position="right"
                                        :min="0"
                                        :max="23"
                                        style="min-width:100px"
                                        :class="{'is-error': validation.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.hours')}}</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </large-radio-button-with-description>
                        </div>
                    </div>
                    <template v-if="type === TypeEnum.AUTOMATIC">
                        <div class="cly-vue-drawer-step__section">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header">
                                {{i18n('push-notification.capping')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.capping-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-level bu-is-flex-wrap-wrap">
                                <large-radio-button-with-description
                                    :label="false"
                                    v-model="pushNotificationUnderEdit.automatic.capping"
                                    :title="i18n('push-notification.no-capping')"
                                    :description="i18n('push-notification.no-capping-description')">
                                </large-radio-button-with-description>
                                <large-radio-button-with-description
                                    :label="true"
                                    v-model="pushNotificationUnderEdit.automatic.capping"
                                    :title="i18n('push-notification.capped')"
                                    :description="i18n('push-notification.capped-description')">
                                </large-radio-button-with-description>
                            </div>
                        </div>
                        <div class="cly-vue-drawer-step__section" v-if="pushNotificationUnderEdit.automatic.capping">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                                {{i18n('push-notification.maximum-messages-per-user')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.maximum-messages-per-user-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-level">
                                <validation-provider v-slot="validation" rules="required|integer">
                                    <el-input v-model="pushNotificationUnderEdit.automatic.maximumMessagesPerUser" placeholder="0" :min="1" style="width:200px" :class="{'is-error': validation.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.messages')}}</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </div>
                        </div>
                        <div class="cly-vue-drawer-step__section" v-if="pushNotificationUnderEdit.automatic.capping">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                                {{i18n('push-notification.minimum-time-between-messages')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.minimum-time-between-messages-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-is-flex is-justify-content-flex-start">
                                <validation-provider v-slot="validation" rules="required|integer" class="bu-mr-1">
                                    <el-input v-model="pushNotificationUnderEdit.automatic.minimumTimeBetweenMessages.days" controls-position="right" :min="0" style="width:100px" :class="{'is-error': validation.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.days')}}</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                                <validation-provider v-slot="validation" rules="required|integer|min_value:0|max_value:23|min:1|max:2" class="bu-ml-1">
                                    <el-input v-model="pushNotificationUnderEdit.automatic.minimumTimeBetweenMessages.hours" controls-position="right" :min="0" :max="23" style="width:100px" :class="{'is-error': validation.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.hours')}}</span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </div>
                        </div>
                    </template>
                    <template v-if="type === TypeEnum.RECURRING">
                        <div class="bu-is-flex bu-is-flex-direction-column">
                            <span class="text-medium font-weight-bold">{{i18n('push-notification-drawer.rec-push-start-date')}}</span>
                            <div class="cly-vue-push-notification-drawer__date-picker-wrapper bu-mt-2">
                                <cly-date-picker
                                    :offset-correction="false"
                                    v-model="startDate"
                                    timestampFormat="ms"
                                    type="date"
                                    width="200"
                                    :select-time="true"
                                    :is-future="true">
                                </cly-date-picker>
                            </div>
                        </div>
                        <div class="bu-is-flex bu-is-flex-direction-column bu-pb-5 bu-mt-5">
                            <div class="bu-is-flex bu-is-align-items-center">
                                <el-switch v-model="isEndDateSet" class="bu-mr-2"></el-switch>
                                <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-medium font-weight-bold">
                                    <span class="text-medium font-weight-bold">{{i18n('push-notification.set-end-date')}}</span>
                                </div>
                            </div>
                            <div class="cly-vue-push-notification-drawer__date-picker-wrapper">
                                <cly-date-picker
                                    :offset-correction="false"
                                    class="bu-ml-6"
                                    v-bind:disabled="!isEndDateSet"
                                    v-model="endDate"
                                    timestampFormat="ms"
                                    type="date"
                                    width="200"
                                    :select-time="true"
                                    :is-future="true">
                                </cly-date-picker>
                            </div>
                        </div>
                        <div class="bu-mt-5">
                            <span class="text-big font-weight-bold">{{i18n('push-notification-drawer.notification-frequency')}}</span>
                            <div class="cly-vue-push-notification-drawer__radio-button-group bu-mt-3">
                                <el-radio-group class="bu-ml-1" size="medium" @change="onSelectedBucket" v-model="pushNotificationUnderEdit.delivery.repetition.bucket">
                                    <el-radio-button
                                        :label="bucketType"
                                        :key="bucketType"
                                        v-for="bucketType in bucketList">
                                        {{i18n('push-notification.' + bucketType)}}
                                    </el-radio-button>
                                </el-radio-group>
                            </div>
                        </div>
                        <div class="bu-mt-6">
                            <span class="text-medium font-weight-bold">{{i18n('push-notification-drawer.repetition-for-every')}}</span>
                            <cly-tooltip-icon :tooltip="i18n('push-notification-drawer.repetition-for-every-tooltip', i18n('push-notification-drawer.repetitions-' + pushNotificationUnderEdit.delivery.repetition.bucket))" icon="ion ion-help-circled"></cly-tooltip-icon>
                            <div class="cly-vue-push-notification-drawer__radio-button-group bu-mt-2">
                                <validation-provider v-slot="validation" rules="required|integer" class="bu-mr-1">
                                    <el-input v-model="pushNotificationUnderEdit.delivery.repetition.every" :min="0" style="width:120px" :class="{'is-error': validation.errors.length > 0}">
                                        <template slot="suffix">
                                            <span class="bu-mr-3 bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">
                                                {{pushNotificationUnderEdit.delivery.repetition.every === '0' || pushNotificationUnderEdit.delivery.repetition.every === '1' ? i18n('push-notification-drawer.repetition-' + pushNotificationUnderEdit.delivery.repetition.bucket) : i18n('push-notification-drawer.repetitions-' + pushNotificationUnderEdit.delivery.repetition.bucket)}}
                                            </span>
                                        </template>
                                    </el-input>
                                </validation-provider>
                            </div>
                        </div>
                        <div class="bu-mt-5" v-if="pushNotificationUnderEdit.delivery.repetition.bucket === 'weekly' || pushNotificationUnderEdit.delivery.repetition.bucket === 'monthly'">
                            <span class="text-medium font-weight-bold">{{i18n('push-notification-drawer.repeat-on')}}</span>
                            <div class="cly-vue-push-notification-drawer__radio-button-group bu-mt-2">
                                <validation-provider v-slot="validation" rules="required" class="bu-ml-1">
                                    <cly-select-x
                                        class="cly-vue-push-notification-drawer__repetition-weekly-select"
                                        mode="multi-check"
                                        :collapse-tags="false"
                                        v-model="pushNotificationUnderEdit.delivery.repetition.on"
                                        :options="pushNotificationUnderEdit.delivery.repetition.bucket === 'weekly' ? weeklyRepetitionOptions : monthlyRepetitionOptions">
                                    </cly-select-x>
                                </validation-provider>
                            </div>
                        </div>
                        <div class="bu-mt-5">
                            <span class="text-medium font-weight-bold">{{i18n('push-notification-drawer.repeat-at')}}</span>
                            <cly-tooltip-icon :tooltip="i18n('push-notification-drawer.repeat-at-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                            <div class="cly-vue-push-notification-drawer__radio-button-group bu-mt-2">
                                <cly-time-picker
                                    style="width:100px"
                                    v-model="pushNotificationUnderEdit.delivery.repetition.at">
                                </cly-time-picker>
                            </div>
                        </div>
                        <div class="cly-vue-drawer-step__section bu-mt-5">
                            <div class="bu-mb-2 cly-vue-push-notification-drawer__line-radio-button-group-header">
                                {{i18n('push-notification.what-if-past-scheduled')}}
                                <cly-tooltip-icon :tooltip="i18n('push-notification.what-if-past-scheduled-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            </div>
                            <div class="bu-is-flex bu-is-flex-direction-column">
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.SKIP"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.do-not-send-message')">
                                </line-radio-button-with-description>
                                <line-radio-button-with-description
                                    :label="PastScheduleEnum.NEXT_DAY"
                                    v-model="pushNotificationUnderEdit[type].pastSchedule"
                                    :title="i18n('push-notification.deliver-next-day')">
                                </line-radio-button-with-description>
                            </div>
                        </div>
                    </template>
                    <div class="cly-vue-drawer-step__section" v-if="type === TypeEnum.ONE_TIME || type === TypeEnum.AUTOMATIC || type === TypeEnum.TRANSACTIONAL || type === TypeEnum.MULTIPLE">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__radio-group-header text-big font-weight-bold">
                            {{i18n('push-notification.expiration-time')}}
                            <cly-tooltip-icon :tooltip="i18n('push-notification.expiration-time-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.expiration-time-description')}}</div>
                        </div>
                        <div class="bu-is-flex is-justify-content-flex-start">
                            <validation-provider v-slot="validation" rules="required|integer" class="bu-mr-1">
                                <el-input v-model="pushNotificationUnderEdit.expiration.days" :min="0" style="width:100px" :class="{'is-error': validation.errors.length > 0}">
                                    <template slot="suffix">
                                        <span class="bu-mr-3 bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.days')}}</span>
                                    </template>
                                </el-input>
                            </validation-provider>
                            <validation-provider v-slot="validation" rules="required|integer|min_value:0|max_value:23" class="bu-ml-1">
                                <el-input v-model="pushNotificationUnderEdit.expiration.hours" :min="0" style="width:100px" :class="{'is-error': validation.errors.length > 0}">
                                    <template slot="suffix">
                                        <span class="bu-mr-3 bu-is-flex bu-is-align-items-center cly-vue-push-notification-drawer__input-suffix">{{i18n('push-notification.hours')}}</span>
                                    </template>
                                </el-input>
                            </validation-provider>
                        </div>
                    </div>
                    <div class="cly-vue-drawer-step__section" v-if="type === TypeEnum.AUTOMATIC">
                        <cly-notification
                            :closable="false"
                            class="bu-mt-3"
                            :text="i18n('push-notification.auto-trigger-delay-warning')" />
                    </div>
                </form>
            </cly-form-step>
            <cly-form-step id="step4" :name="i18n('push-notification-drawer.step-four')" class="bu-container">
                <form>
                <div class="cly-vue-drawer-step__section">
                    <div class="bu-is-flex bu-is-align-items-center">
                        <div class="bu-py-1 bu-my-1 bu-mr-2 cly-vue-push-notification-drawer__checkbox-label">{{i18n('push-notification.notification-format')}}</div>
                        <el-select :value="pushNotificationUnderEdit.messageType" @change="onMessageTypeChange">
                            <el-option v-for="item in messageTypeFilterOptions" :key="item.value" :value="item.value" :label="item.label"></el-option>
                        </el-select>
                    </div>
                </div>
                <template v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT">
                    <div class="cly-vue-drawer-step__section">
                        <div class="cly-vue-push-notification-drawer__radio-group-header bu-mb-4">
                            {{i18n('push-notification.compose-message')}}
                            <cly-tooltip-icon :tooltip="i18n('push-notification.compose-message-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                        </div>
                        <div>
                            <div class="cly-vue-push-notification-drawer__checkbox-text" v-if="isEstimationLoading">
                                <i class="fa fa-spin fa-spinner" style="font-size: 16px;margin-right: 6px;"></i> {{i18n('push-notification.allow-to-set-different-content')}}
                            </div>
                            <el-checkbox :value="multipleLocalizations" @change="onMultipleLocalizationChange" v-else>
                                <div class="cly-vue-push-notification-drawer__checkbox-text">{{i18n('push-notification.allow-to-set-different-content')}}</div>
                            </el-checkbox>
                        </div>
                        <div class="bu-mt-4 bu-is-flex bu-is-justify-content-stretch">
                            <div class="cly-vue-push-notification-drawer__subsection-left " v-if="multipleLocalizations">
                                <div v-for="localization in localizationOptions"
                                    v-bind:class="['bu-is-flex','bu-is-align-items-center','cly-vue-push-notification-drawer__subsection-left-row',activeLocalization === localization.value?'cly-vue-push-notification-drawer__subsection-left-row-active':null]">
                                    <el-checkbox
                                        class="bu-ml-2"
                                        v-tooltip.top-left="isDefaultLocalizationActive? i18n('push-notification.default-message-is-required') : null"
                                        :checked="isLocalizationSelected(localization)"
                                        :disabled="isDefaultLocalization(localization)"
                                        :key="localization.value"
                                        @change="onLocalizationChange(localization)">
                                        <li @click="onLocalizationSelect(localization)" class="cly-vue-push-notification-drawer__subsection-left-list-item bu-pr-3 bu-py-2">
                                            {{localization.label}}
                                        </li>
                                    </el-checkbox>
                                </div>
                            </div>
                            <div v-bind:class="['bu-is-flex-grow-1', multipleLocalizations?'cly-vue-push-notification-drawer__subsection-right':'cly-vue-push-notification-drawer__subsection-border']">
                                <div class="cly-vue-drawer-step__section">
                                    <div class="cly-vue-drawer-step__line bu-pt-0 cly-vue-drawer-step__line--aligned">
                                        <div class="cly-vue-push-notification-drawer__input-label">
                                            {{i18n('push-notification.message-title')}}
                                        </div>
                                        <div v-if="typeof pushNotificationUnderEdit.isEe !== 'undefined' && pushNotificationUnderEdit.isEe">
                                            <el-button type="text" @click="onAddUserProperty('title')" class="bu-px-0 cly-text-button" size="small">{{i18n('push-notification.add-variable')}}</el-button>
                                        </div>
                                    </div>
                                    <message-editor-with-emoji-picker
                                        ref="title"
                                        :isOpen="isAddUserPropertyPopoverOpen.title"
                                        container="title"
                                        id="input-element-title"
                                        :isDefaultLocalizationActive="isDefaultLocalizationActive"
                                        :userProperty="pushNotificationUnderEdit.message[activeLocalization].properties.title[selectedUserPropertyId]"
                                        :options="userPropertiesOptions"
                                        @change="onTitleChange"
                                        @delete="onRemoveUserProperty"
                                        @click="onUserPropertyClick"
                                        @select="onSelectUserProperty"
                                        @input="onInputUserProperty"
                                        @fallback="onInputFallbackUserProperty"
                                        @uppercase="onCheckUppercaseUserProperty"
                                        @remove="onRemoveUserProperty"
                                        @close="closeAddUserPropertyPopover">
                                    </message-editor-with-emoji-picker>
                                </div>
                                <div class="cly-vue-drawer-step__section">
                                    <div class="cly-vue-drawer-step__line bu-pt-0 cly-vue-drawer-step__line--aligned">
                                        <div class="cly-vue-push-notification-drawer__input-label">
                                            {{i18n('push-notification.message-content')}}
                                        </div>
                                        <div v-if="typeof pushNotificationUnderEdit.isEe !== 'undefined' && pushNotificationUnderEdit.isEe">
                                            <el-button type="text" @click="onAddUserProperty('content')" class="bu-px-0 cly-text-button" size="small">{{i18n('push-notification.add-variable')}}</el-button>
                                        </div>
                                    </div>
                                    <message-editor-with-emoji-picker
                                        ref="content"
                                        :isOpen="isAddUserPropertyPopoverOpen.content"
                                        container="content"
                                        id="input-element-content"
                                        :isRequired="true"
                                        type="textarea"
                                        :placeholder="i18n('push-notification.clear-and-shorter-messages')"
                                        :isDefaultLocalizationActive="isDefaultLocalizationActive"
                                        :userProperty="pushNotificationUnderEdit.message[activeLocalization].properties.content[selectedUserPropertyId]"
                                        :options="userPropertiesOptions"
                                        @change="onContentChange"
                                        @delete="onRemoveUserProperty"
                                        @click="onUserPropertyClick"
                                        @select="onSelectUserProperty"
                                        @input="onInputUserProperty"
                                        @fallback="onInputFallbackUserProperty"
                                        @uppercase="onCheckUppercaseUserProperty"
                                        @remove="onRemoveUserProperty"
                                        @close="closeAddUserPropertyPopover">
                                    </message-editor-with-emoji-picker>
                                </div>
                                <div class="cly-vue-drawer-step__section">
                                    <div class="cly-vue-push-notification-drawer__input-label bu-mb-2">
                                        {{i18n('push-notification.buttons')}}
                                        <cly-tooltip-icon :tooltip="i18n('push-notification.buttons-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                                    </div>
                                    <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned"
                                        v-for="(button,index) in pushNotificationUnderEdit.message[activeLocalization].buttons">
                                        <validation-provider v-slot="validation" rules="required" style="width:35%;" class="bu-pr-1">
                                            <el-input
                                                autocomplete="off"
                                                v-model="pushNotificationUnderEdit.message[activeLocalization].buttons[index].label"
                                                :placeholder="i18n('push-notification.enter-button-text')"
                                                :class="{'is-error': validation.errors.length > 0}">
                                            </el-input>
                                        </validation-provider>
                                        <validation-provider v-slot="validation" :rules="{required:true, regex:urlRegex}" style="width:60%;" class="bu-pl-1 bu-pr-1">
                                            <el-input
                                                autocomplete="off"
                                                v-model="pushNotificationUnderEdit.message[activeLocalization].buttons[index].url"
                                                :placeholder="i18n('push-notification.enter-button-url')"
                                                :class="{'is-error': validation.errors.length > 0}">
                                            </el-input>
                                        </validation-provider>
                                        <div class="bu-ml-1 cly-icon-button cly-icon-button--gray" @click="removeButton(index)">
                                            <i class="el-icon-close"></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="cly-vue-drawer-step__section bu-pb-1">
                                    <el-button type="text" :disabled="isAddButtonDisabled" @click="addButton" class="bu-px-0 cly-text-button" size="small">
                                        {{addButtonLabel}}
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-drawer-step__section">
                        <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">
                            {{i18n('push-notification.media-url')}}
                            <cly-tooltip-icon :tooltip="i18n('push-notification.media-url-platform-description')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.media-url-description')}}</div>
                            <validation-provider v-slot="validation" ref="allMediaURLValidationProvider" :rules="{push_notification_message_media_url:PlatformEnum.ALL}" mode="passive">
                                <el-input
                                    autocomplete="off"
                                    :value="pushNotificationUnderEdit.settings.all.mediaURL"
                                    @input="onAllMediaURLInput"
                                    :placeholder="i18n('push-notification.enter-media-url')"
                                    :class="{'is-error':validation.errors.length > 0}">
                                </el-input>
                            </validation-provider>
                        </div>
                    </div>
                </template>
                <div class="cly-vue-drawer-step__section">
                    <div class=" cly-vue-push-notification-drawer__radio-group-header">
                        {{i18n('push-notification.platform-settings')}}
                    </div>
                    <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.platform-settings-description')}}</div>
                    <el-collapse v-if="shouldDisplayIOSSettings" v-model="expandedPlatformSettings" class="cly-vue-push-notification-accordion-with-left-side-arrow ">
                        <el-collapse-item  :name="PlatformEnum.IOS">
                            <span class="collapse-title" slot="title"> IOS</span>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.ios.soundFilename"
                                :toggle="settings.ios.isSoundFilenameEnabled"
                                rules="required"
                                @onChange="function(value){onSettingChange(PlatformEnum.IOS,'soundFilename',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isSoundFilenameEnabled',value)}"
                                :label="i18n('push-notification.sound-file-name')"
                                :placeholder="i18n('push-notification.enter-sound-file-name')"
                                :description="i18n('push-notification.sound-file-name-description')">
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :toggle="settings.ios.isMediaURLEnabled"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isMediaURLEnabled',value)}"
                                :label="i18n('push-notification.media-url')"
                                :placeholder="i18n('push-notification.enter-media-url')"
                                :description="i18n('push-notification.media-url-platform-description')">
                                <validation-provider v-slot="validation" ref="iosMediaURLValidationProvider" :rules="{required:true,push_notification_message_media_url:PlatformEnum.IOS}" mode="passive">
                                    <el-input
                                        autocomplete="off"
                                        :value="pushNotificationUnderEdit.settings.ios.mediaURL"
                                        @input="onIOSMediaURLInput"
                                        :placeholder="i18n('push-notification.enter-media-url')"
                                        :class="{'is-error':validation.errors.length > 0}">
                                    </el-input>
                                </validation-provider>
                            </message-setting-element>
                            <message-setting-element
                                :input="pushNotificationUnderEdit.settings.ios.badgeNumber"
                                :toggle="settings.ios.isBadgeNumberEnabled"
                                rules="required|integer"
                                @onChange="function(value){onSettingChange(PlatformEnum.IOS,'badgeNumber',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isBadgeNumberEnabled',value)}"
                                :label="i18n('push-notification.add-badge-number')"
                                :placeholder="i18n('push-notification.enter-badge-number')"
                                :description="i18n('push-notification.add-badge-number-description')">
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.ios.subtitle"
                                :toggle="settings.ios.isSubtitleEnabled"
                                rules="required"
                                @onChange="function(value){onSettingChange(PlatformEnum.IOS,'subtitle',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isSubtitleEnabled',value)}"
                                :label="i18n('push-notification.subtitle')"
                                :placeholder="i18n('push-notification.enter-your-subtitle')"
                                :description="i18n('push-notification.subtitle-description')">
                            </message-setting-element>
                            <message-setting-element
                                :toggle="settings.ios.isContentAvailableSet"
                                rules="required"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isContentAvailableSet',value)}"
                                :label="i18n('push-notification.set-content-available')"
                                :description="i18n('push-notification.set-content-available-description')">
                                <span></span>
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.ios.onClickURL"
                                :toggle="settings.ios.isOnClickURLEnabled"
                                :rules="{required:true, regex:urlRegex}"
                                @onChange="function(value){onSettingChange(PlatformEnum.IOS,'onClickURL',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isOnClickURLEnabled',value)}"
                                :label="i18n('push-notification.on-click-url')"
                                :placeholder="i18n('push-notification.enter-on-click-url')"
                                :description="i18n('push-notification.on-click-url-description')">
                            </message-setting-element>
                            <message-setting-element
                                :toggle="settings.ios.isJsonEnabled"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isJsonEnabled',value)}"
                                :label="i18n('push-notification.send-json')"
                                :description="i18n('push-notification.send-json-description')">
                                <validation-provider rules="json|required" v-slot="validation">
                                    <el-input
                                        autocomplete="off"
                                        v-model="pushNotificationUnderEdit.settings.ios.json"
                                        type="textarea"
                                        @input="function(value){onSettingChange(PlatformEnum.IOS,'json',value)}"
                                        :placeholder="i18n('push-notification.enter-json-data')"
                                        :class="{'is-error': validation.errors.length > 0}">
                                    </el-input>
                                </validation-provider>
                            </message-setting-element>
                            <message-setting-element
                                :toggle="settings.ios.isUserDataEnabled"
                                rules="required"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.IOS,'isUserDataEnabled',value)}"
                                :label="i18n('push-notification.send-user-data')"
                                :description="i18n('push-notification.send-user-data-description')">
                                <validation-provider rules="required" v-slot="validation">
                                    <cly-select-x
                                        search-placeholder="Search in Properties"
                                        v-model="pushNotificationUnderEdit.settings.ios.userData"
                                        :placeholder="i18n('push-notification.select-user-data')"
                                        :width="320"
                                        mode="multi-check-sortable"
                                        :hide-all-options-tab="false"
                                        :options="userPropertiesOptions"
                                        :class="{'is-error': validation.errors.length > 0}">
                                    </cly-select-x>
                                </validation-provider>
                            </message-setting-element>
                        </el-collapse-item>
                    </el-collapse>
                    <el-collapse v-if="shouldDisplayAndroidSettings" v-model="expandedPlatformSettings" class="cly-vue-push-notification-accordion-with-left-side-arrow">
                        <el-collapse-item :name="PlatformEnum.ANDROID">
                            <span class="collapse-title" slot="title"> Android</span>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.android.soundFilename"
                                :toggle="settings.android.isSoundFilenameEnabled"
                                rules="required"
                                @onChange="function(value){onSettingChange(PlatformEnum.ANDROID,'soundFilename',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isSoundFilenameEnabled',value)}"
                                :label="i18n('push-notification.sound-file-name')"
                                :placeholder="i18n('push-notification.enter-sound-file-name')"
                                :description="i18n('push-notification.sound-file-name-description')">
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :toggle="settings.android.isMediaURLEnabled"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isMediaURLEnabled',value)}"
                                :label="i18n('push-notification.media-url')"
                                :placeholder="i18n('push-notification.enter-media-url')"
                                :description="i18n('push-notification.media-url-platform-description')">
                                <validation-provider v-slot="validation" ref="androidMediaURLValidationProvider" :rules="{required:true,push_notification_message_media_url:PlatformEnum.ANDROID}" mode="passive">
                                    <el-input
                                        autocomplete="off"
                                        :value="pushNotificationUnderEdit.settings.android.mediaURL"
                                        @input="onAndroidMediaURLInput"
                                        :placeholder="i18n('push-notification.enter-media-url')"
                                        :class="{'is-error':validation.errors.length > 0}">
                                    </el-input>
                                </validation-provider>
                            </message-setting-element>
                            <message-setting-element
                                :input="pushNotificationUnderEdit.settings.android.badgeNumber"
                                :toggle="settings.android.isBadgeNumberEnabled"
                                rules="required|integer"
                                @onChange="function(value){onSettingChange(PlatformEnum.ANDROID,'badgeNumber',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isBadgeNumberEnabled',value)}"
                                :label="i18n('push-notification.add-badge-number')"
                                :placeholder="i18n('push-notification.enter-badge-number')"
                                :description="i18n('push-notification.add-badge-number-description')">
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.android.icon"
                                :toggle="settings.android.isIconEnabled"
                                rules="required"
                                @onChange="function(value){onSettingChange(PlatformEnum.ANDROID,'icon',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isIconEnabled',value)}"
                                :label="i18n('push-notification.icon')"
                                :placeholder="i18n('push-notification.enter-icon')"
                                :description="i18n('push-notification.icon-description')">
                            </message-setting-element>
                            <message-setting-element
                                v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT"
                                :input="pushNotificationUnderEdit.settings.android.onClickURL"
                                :toggle="settings.android.isOnClickURLEnabled"
                                :rules="{required:true, regex:urlRegex}"
                                @onChange="function(value){onSettingChange(PlatformEnum.ANDROID,'onClickURL',value)}"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isOnClickURLEnabled',value)}"
                                :label="i18n('push-notification.on-click-url')"
                                :placeholder="i18n('push-notification.enter-on-click-url')"
                                :description="i18n('push-notification.on-click-url-description')">
                            </message-setting-element>
                            <message-setting-element
                                :toggle="settings.android.isJsonEnabled"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isJsonEnabled',value)}"
                                :label="i18n('push-notification.send-json')"
                                :description="i18n('push-notification.send-json-description')">
                                <validation-provider rules="json|required" v-slot="validation">
                                    <el-input
                                        autocomplete="off"
                                        v-model="pushNotificationUnderEdit.settings.android.json"
                                        type="textarea"
                                        @input="function(value){onSettingChange(PlatformEnum.ANDROID,'json',value)}"
                                        :placeholder="i18n('push-notification.enter-json-data')"
                                        :class="{'is-error': validation.errors.length > 0}">
                                    </el-input>
                                </validation-provider>
                            </message-setting-element>
                            <message-setting-element
                                :toggle="settings.android.isUserDataEnabled"
                                rules="required"
                                @onToggle="function(value){onSettingToggle(PlatformEnum.ANDROID,'isUserDataEnabled',value)}"
                                :label="i18n('push-notification.send-user-data')"
                                :description="i18n('push-notification.send-user-data-description')">
                                <validation-provider rules="required" v-slot="validation">
                                    <cly-select-x
                                        search-placeholder="Search in Properties"
                                        v-model="pushNotificationUnderEdit.settings.android.userData"
                                        :placeholder="i18n('push-notification.select-user-data')"
                                        :width="320"
                                        mode="multi-check-sortable"
                                        :hide-all-options-tab="false"
                                        :options="userPropertiesOptions"
                                        :class="{'is-error': validation.errors.length > 0}">
                                    </cly-select-x>
                                </validation-provider>
                            </message-setting-element>
                        </el-collapse-item>
                    </el-collapse>
                </div>
                </form>
            </cly-form-step>
            <cly-form-step id="step5" :name="i18n('push-notification-drawer.step-five')" >
                <div class="cly-vue-drawer-step__section">
                    <div class="cly-vue-push-notification-drawer__review-header bu-mb-4">
                        {{i18n('push-notification.review-message')}}
                        <cly-tooltip-icon :tooltip="i18n('push-notification.review-message-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon>
                    </div>
                    <div class="cly-vue-push-notification-drawer__review-section-group-header bu-my-4">
                        {{i18n('push-notification.message-content')}}
                    </div>
                    <div class="bu-is-flex bu-is-align-items-center bu-my-4" v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT">
                        <div class="bu-mr-2 cly-vue-push-notification-drawer__checkbox-label">
                            {{i18n('push-notification-details.localization-filter-label')}}
                        </div>
                        <el-select v-model="selectedLocalizationFilter">
                            <el-option
                                v-for="item in selectedLocalizationFilterOptions"
                                :key="item.value"
                                :value="item.value"
                                :label="item.label">
                            </el-option>
                        </el-select>
                    </div>
                    <div class="cly-vue-push-notification-drawer__section-group bu-is-flex bu-is-flex-direction-column bu-py-3">
                        <template v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.CONTENT">
                            <review-section-row :label="i18n('push-notification.message-name')" :value="pushNotificationUnderEdit.name"></review-section-row>
                            <review-section-row :label="i18n('push-notification.platforms')" :value="previewPlatforms.join(', ')"></review-section-row>
                            <review-section-row :label="i18n('push-notification.review-title')">
                                <div>
                                    <template v-for="(component) in previewMessageTitle">
                                        <keep-alive>
                                            <component v-bind:is="component.name" :value="component.value"></component>
                                        </keep-alive>
                                    </template>
                                </div>
                            </review-section-row>
                            <review-section-row :label="i18n('push-notification.content')">
                                <div>
                                    <template v-for="(component) in previewMessageContent">
                                        <keep-alive>
                                            <component v-bind:is="component.name" :value="component.value"></component>
                                        </keep-alive>
                                    </template>
                                </div>
                            </review-section-row>
                            <template v-for="(button,index) in pushNotificationUnderEdit.message[selectedLocalizationFilter].buttons">
                                <review-section-row :label="i18n('push-notification.button-text')" :value="button.label"></review-section-row>
                                <review-section-row :label="i18n('push-notification.button-url')" :value="button.url"></review-section-row>
                            </template>
                            <review-section-row
                                v-if="hasAllPlatformMediaOnly"
                                :label="i18n('push-notification.media-url')"
                                :value="pushNotificationUnderEdit.settings[PlatformEnum.ALL].mediaURL">
                            </review-section-row>
                            <template v-else>
                                <review-section-row :label="i18n('push-notification.ios-media-url')" :value="previewIOSMediaURL"></review-section-row>
                                <review-section-row :label="i18n('push-notification.android-media-url')" :value="previewAndroidMediaURL"></review-section-row>
                            </template>
                        </template>
                        <template v-if="pushNotificationUnderEdit.messageType === MessageTypeEnum.SILENT">
                            <review-section-row :label="i18n('push-notification.ios-badge-number')" :value="pushNotificationUnderEdit.settings[PlatformEnum.IOS].badgeNumber"></review-section-row>
                            <review-section-row :label="i18n('push-notification.ios-json-data')" :value="prettifyJSON(pushNotificationUnderEdit.settings[PlatformEnum.IOS].json)" :usePre="true"></review-section-row>
                            <review-section-row :label="i18n('push-notification.ios-user-data')" :value="pushNotificationUnderEdit.settings[PlatformEnum.IOS].userData.join(', ')"></review-section-row>
                            <review-section-row :label="i18n('push-notification.android-badge-number')" :value="pushNotificationUnderEdit.settings[PlatformEnum.ANDROID].badgeNumber"></review-section-row>
                            <review-section-row :label="i18n('push-notification.android-json-data')" :value="prettifyJSON(pushNotificationUnderEdit.settings[PlatformEnum.ANDROID].json)" :usePre="true"></review-section-row>
                            <review-section-row :label="i18n('push-notification.android-user-data')" :value="pushNotificationUnderEdit.settings[PlatformEnum.ANDROID].userData.join(', ')"></review-section-row>
                        </template>
                    </div>
                </div>
                </div>
                <template v-if="type === TypeEnum.ONE_TIME | type === TypeEnum.AUTOMATIC || type === TypeEnum.RECURRING || type === TypeEnum.MULTIPLE ">
                    <div class="cly-vue-drawer-step__section">
                        <div class="cly-vue-push-notification-drawer__review-section-group-header bu-mb-2">
                            {{i18n('push-notification.targeting')}}
                        </div>
                        <div class="cly-vue-push-notification-drawer__section-group cly-vue-drawer-step__section bu-is-flex bu-is-flex-direction-column">
                            <template v-if="type === TypeEnum.ONE_TIME">
                                <review-section-row label="Targeted users">
                                    <template v-if="pushNotificationUnderEdit[TypeEnum.ONE_TIME].targeting === TargetingEnum.ALL">
                                        {{targetingOptions[pushNotificationUnderEdit.oneTime.targeting].label}}
                                    </template>
                                    <template v-else>
                                        {{previewCohorts(pushNotificationUnderEdit.cohorts).join(', ')}}
                                    </template>
                                </review-section-row>
                                <review-section-row v-if="shouldDisplayNumberOfUsers" :label="i18n('push-notification.current-number-of-users')">
                                    <template v-if="isEstimationLoading"><i class="fa fa-spin fa-spinner"></i></template>
                                    <template v-else>{{currentNumberOfUsers}}</template>
                                </review-section-row>
                                <review-section-row v-if="pushNotificationUnderEdit[TypeEnum.ONE_TIME].targeting === TargetingEnum.SEGMENTED" :label="i18n('push-notification.geolocations')" :value="previewLocations.join(', ')"></review-section-row>
                                <review-section-row
                                    v-if="type === TypeEnum.ONE_TIME"
                                    :label="i18n('push-notification.when-to-determine')"
                                    :value="audienceSelectionOptions[pushNotificationUnderEdit[TypeEnum.ONE_TIME].audienceSelection].label">
                                </review-section-row>
                            </template>
                            <template v-if="type === TypeEnum.RECURRING">
                                <review-section-row label="Targeted users">
                                    <template v-if="pushNotificationUnderEdit[TypeEnum.RECURRING].targeting === TargetingEnum.ALL">
                                        {{targetingOptions[pushNotificationUnderEdit[TypeEnum.RECURRING].targeting].label}}
                                    </template>
                                    <template v-else>
                                        {{previewCohorts(pushNotificationUnderEdit.cohorts).join(', ')}}
                                    </template>
                                </review-section-row>
                                <review-section-row v-if="shouldDisplayNumberOfUsers" :label="i18n('push-notification.current-number-of-users')">
                                    <template v-if="isEstimationLoading"><i class="fa fa-spin fa-spinner"></i></template>
                                    <template v-else>{{currentNumberOfUsers}}</template>
                                </review-section-row>
                                <review-section-row v-if="pushNotificationUnderEdit[TypeEnum.RECURRING].targeting === TargetingEnum.SEGMENTED" :label="i18n('push-notification.geolocations')" :value="previewLocations.join(', ')"></review-section-row>
                                <review-section-row
                                    v-if="type === TypeEnum.RECURRING"
                                    :label="i18n('push-notification.when-to-determine')"
                                    :value="audienceSelectionOptions[pushNotificationUnderEdit[TypeEnum.RECURRING].audienceSelection].label">
                                </review-section-row>
                            </template>
                            <template v-if="type === TypeEnum.MULTIPLE">
                                <review-section-row label="Targeted users">
                                    <template v-if="pushNotificationUnderEdit[TypeEnum.MULTIPLE].targeting === TargetingEnum.ALL">
                                        {{targetingOptions[pushNotificationUnderEdit.multi.targeting].label}}
                                    </template>
                                    <template v-else>
                                        {{previewCohorts(pushNotificationUnderEdit.cohorts).join(', ')}}
                                    </template>
                                </review-section-row>
                                <review-section-row v-if="shouldDisplayNumberOfUsers" :label="i18n('push-notification.current-number-of-users')">
                                    <template v-if="isEstimationLoading"><i class="fa fa-spin fa-spinner"></i></template>
                                    <template v-else>{{currentNumberOfUsers}}</template>
                                </review-section-row>
                                <review-section-row v-if="pushNotificationUnderEdit[TypeEnum.MULTIPLE].targeting === TargetingEnum.SEGMENTED" :label="i18n('push-notification.geolocations')" :value="previewLocations.join(', ')"></review-section-row>
                                <review-section-row
                                    v-if="type === TypeEnum.MULTIPLE"
                                    :label="i18n('push-notification.when-to-determine')"
                                    :value="audienceSelectionOptions[pushNotificationUnderEdit[TypeEnum.MULTIPLE].audienceSelection].label">
                                </review-section-row>
                            </template>
                            <template v-if="type === TypeEnum.AUTOMATIC">
                                <review-section-row :label="i18n('push-notification.trigger-type')" :value="triggerOptions[pushNotificationUnderEdit.automatic.trigger].label"></review-section-row>
                                <review-section-row v-if="pushNotificationUnderEdit.automatic.trigger === TriggerEnum.EVENT" :label="i18n('push-notification.events')" :value="pushNotificationUnderEdit.automatic.events.join(', ')"></review-section-row>
                                <review-section-row v-else :label="i18n('push-notification.cohorts')" :value="previewCohorts(pushNotificationUnderEdit.automatic.cohorts).join(', ')"></review-section-row>
                                <review-section-row v-if="isLocationSet" :label="i18n('push-notification.geolocations')" :value="previewLocations.join(', ')"></review-section-row>
                                <review-section-row v-else :label="i18n('push-notification.behavior-trigger-not-met')" :value="triggerNotMetOptions[pushNotificationUnderEdit.automatic.triggerNotMet].label"></review-section-row>
                            </template>
                        </div>
                    </div>
                </template>
                <div class="cly-vue-push-notification-drawer__section bu-pt-2">
                    <div class="cly-vue-push-notification-drawer__review-section-group-header bu-mb-2">
                        {{i18n('push-notification.delivery')}}
                    </div>
                    <div class="cly-vue-push-notification-drawer__section-group cly-vue-drawer-step__section bu-is-flex bu-is-flex-direction-column">
                        <template v-if="type === TypeEnum.ONE_TIME || type === TypeEnum.MULTIPLE ">
                            <review-section-row v-if="type === TypeEnum.MULTIPLE" :label="i18n('push-notification.delivery-times')" :value="formatDeliveryDates(pushNotificationUnderEdit.delivery.multipleDates)"></review-section-row>
                            <review-section-row :label="i18n('push-notification.delivery-type')" :value="startDateOptions[pushNotificationUnderEdit.delivery.type].label"></review-section-row>
                            <review-section-row :label="i18n('push-notification.scheduled-for')" :value="formatDateTime(pushNotificationUnderEdit.delivery.startDate)"></review-section-row>
                            <review-section-row :label="i18n('push-notification.expiration-time')" :value="i18n('push-notification.message-will-expire-after', pushNotificationUnderEdit.expiration.days, pushNotificationUnderEdit.expiration.hours)"></review-section-row>
                        </template>
                        <template v-if="type === TypeEnum.AUTOMATIC || type === TypeEnum.TRANSACTIONAL">
                            <review-section-row :label="i18n('push-notification.delivery-timeframe')" :value="startDateOptions[pushNotificationUnderEdit.delivery.type].label"></review-section-row>
                            <review-section-row :label="i18n('push-notification.start-date')" :value="formatDateTime(pushNotificationUnderEdit.delivery.startDate)"></review-section-row>
                            <review-section-row v-if="type === TypeEnum.AUTOMATIC && isEndDateSet" :label="i18n('push-notification.end-date')" :value="formatDateTime(pushNotificationUnderEdit.delivery.endDate)"></review-section-row>
                            <review-section-row v-if="type === TypeEnum.AUTOMATIC" :label="i18n('push-notification.delivery-method')" :value="deliveryMethodOptions[pushNotificationUnderEdit.automatic.deliveryMethod].label"></review-section-row>
                            <review-section-row v-if="type === TypeEnum.AUTOMATIC" :label="i18n('push-notification.capping')">
                                <template v-if="pushNotificationUnderEdit.automatic.capping">
                                    {{i18n('push-notification.maximum-messages', pushNotificationUnderEdit.automatic.maximumMessagesPerUser)}} <br />
                                    {{i18n('push-notification.minimum-days-and-hours', pushNotificationUnderEdit.automatic.minimumTimeBetweenMessages.days, pushNotificationUnderEdit.automatic.minimumTimeBetweenMessages.hours)}}
                                </template>
                                <template v-else>
                                    {{i18n('push-notification.no-capping')}}
                                </template>
                            </review-section-row>
                        </template>
                        <template v-if="type === TypeEnum.RECURRING">
                            <review-section-row :label="i18n('push-notification.start-date')" :value="formatDateTime(pushNotificationUnderEdit.delivery.startDate)"></review-section-row>
                            <review-section-row v-if="isEndDateSet" :label="i18n('push-notification.end-date')" :value="formatDateTime(pushNotificationUnderEdit.delivery.endDate)"></review-section-row>
                            <review-section-row :label="i18n('push-notification-drawer.notification-frequency')" :value="pushNotificationUnderEdit.delivery.repetition.bucket"></review-section-row>
                            <review-section-row v-if="pushNotificationUnderEdit.delivery.repetition.on.length" :label="i18n('push-notification-drawer.repeat-on')" :value="formatRepetitionDays(pushNotificationUnderEdit.delivery.repetition.on)"></review-section-row>
                            <review-section-row :label="i18n('push-notification-drawer.repeat-at')" :value="formatDateTime(pushNotificationUnderEdit.delivery.repetition.at, 'HH:mm a')"></review-section-row>
                        </template>
                    </div>
                </div>
                <div class="cly-vue-push-notification-drawer__section">
                    <div class="cly-vue-push-notification-drawer__review-section-group-header bu-mb-4">
                        {{i18n('push-notification.confirmation')}}
                    </div>
                    <div class="cly-vue-push-notification-drawer__section-group bu-mb-3 bu-py-3">
                        <div class="bu-level bu-is-flex-wrap-wrap">
                            <div class="bu-level bu-is-flex-direction-column bu-is-align-items-flex-start">
                                <div class="cly-vue-push-notification-drawer__review-section-group-subheader bu-mb-3">
                                    {{i18n('push-notification.testing')}}
                                    <!-- <cly-tooltip-icon :tooltip="i18n('push-notification.testing-tooltip')" icon="ion ion-help-circled"> </cly-tooltip-icon> -->
                                </div>
                                <div class="cly-vue-push-notification-review-section-row__value">{{i18n('push-notification.you-can-send-the-test-message')}}</div>
                            </div>
                            <el-button type="default" @click="onSendToTestUsers" v-loading="isLoading">
                                <div class="ion ion-android-send"></div>{{i18n('push-notification.send-to-test-users')}}
                            </el-button>
                        </div>
                    </div>
                    <div class="cly-vue-push-notification-drawer__section-group bu-mb-3 bu-py-3">
                        <div class="bu-levelbu-is-flex-direction-column bu-is-align-items-flex-start">
                            <div class="cly-vue-push-notification-drawer__review-section-group-subheader bu-mb-3">
                                {{i18n('push-notification.debugging')}}
                            </div>
                            <div class="bu-is-flex bu-is-align-items-center">
                                <el-checkbox v-model="pushNotificationUnderEdit.saveResults"></el-checkbox>
                                <div class="cly-vue-push-notification-review-section-row__value bu-ml-1">
                                    {{i18n('push-notification.save-push-results')}}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-push-notification-drawer__section-group bu-py-3">
                        <div class="bu-levelbu-is-flex-direction-column bu-is-align-items-flex-start">
                            <div class="cly-vue-push-notification-drawer__review-section-group-subheader bu-mb-3">
                                {{i18n('push-notification.confirmation-uppercase')}}
                                <!-- <cly-tooltip-icon :tooltip="i18n('push-notification.confirmation-uppercase-description')" icon="ion ion-help-circled"> </cly-tooltip-icon> -->
                            </div>
                            <div class="bu-is-flex bu-is-align-items-center">
                                <validation-provider v-slot="validation" :rules="{required: {allowFalse: false}}">
                                    <el-checkbox v-model="isConfirmed" :class="{'cly-vue-push-notification-drawer__checkbox-is-error':validation.errors.length > 0}"></el-checkbox>
                                </validation-provider>
                                <div class="cly-vue-push-notification-review-section-row__value bu-ml-1">
                                    {{i18n('push-notification.i-am-ready-to-send')}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </cly-form-step>
    </template>
</cly-drawer>
</template>

<script>
import { i18n, i18nMixin, templateUtil } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import moment from 'moment';
import MessageSettingElement from './common/MessageSettingElement.vue';
import LargeRadioButtonWithDescription from './common/LargeRadioButtonWithDescription.vue';
import LineRadioButtonWithDescription from './common/LineRadioButtonWithDescription.vue';
import ReviewSectionRow from './common/ReviewSectionRow.vue';
import MobileMessagePreview from './common/MobileMessagePreview.vue';
import MessageEditorWithEmojiPicker from './common/MessageEditorWithEmojiPicker.vue';
import AddUserPropertyPopover from './common/AddUserPropertyPopover.vue';
import UserPropertyPreview from './common/UserPropertyPreview.vue';
import UserPropertyTextPreview from './common/UserPropertyTextPreview.vue';
import ClyDrawer from '../../../../../frontend/express/public/javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../../../frontend/express/public/javascripts/components/form/cly-form-step.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyDatePicker from '../../../../../frontend/express/public/javascripts/components/date/date-picker.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyNotification from '../../../../../frontend/express/public/javascripts/components/helpers/cly-notification.vue';

import countlyPushNotification from '../store/index.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
// Accessed at call time (not module load time) because legacy scripts set it after ESM modules parse

var InitialEnabledUsers = {
    ios: 0,
    android: 0,
    all: 0,
};

var InitialPushNotificationDrawerSettingsState = {
    ios: {
        isSubtitleEnabled: false,
        isMediaURLEnabled: false,
        isSoundFilenameEnabled: true,
        isBadgeNumberEnabled: false,
        isOnClickURLEnabled: false,
        isJsonEnabled: false,
        isUserDataEnabled: false,
        isContentAvailableSet: false,
    },
    android: {
        isMediaURLEnabled: false,
        isSoundFilenameEnabled: true,
        isBadgeNumberEnabled: false,
        isIconEnabled: false,
        isOnClickURLEnabled: false,
        isJsonEnabled: false,
        isUserDataEnabled: false,
    },
    all: {
        isMediaURLEnabled: false,
    }
};

export default {
    template: templateUtil.stage("/push/templates/push-notification-drawer.html"),
    mixins: [i18nMixin],
    props: {
        id: {
            type: String,
            default: null,
            required: false,
        },
        userCommand: {
            type: String,
            default: function() { return countlyPushNotification.service.UserCommandEnum.CREATE; },
        },
        controls: {
            type: Object
        },
        from: {
            type: String,
            default: null
        },
        queryFilter: {
            type: Object,
            default: null,
        },
    },
    data: function() {
        return {
            isFetchCohortsLoading: false,
            isFetchEventsLoading: false,
            isFetchLocationsLoading: false,
            isLoading: false,
            isEstimationLoading: false,
            localizationOptions: [],
            userPropertiesOptions: [],
            cohortOptions: [],
            locationOptions: [],
            eventOptions: [],
            enabledUsers: JSON.parse(JSON.stringify(InitialEnabledUsers)),
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            TargetingEnum: countlyPushNotification.service.TargetingEnum,
            TypeEnum: countlyPushNotification.service.TypeEnum,
            MessageTypeEnum: countlyPushNotification.service.MessageTypeEnum,
            AudienceSelectionEnum: countlyPushNotification.service.AudienceSelectionEnum,
            SendEnum: countlyPushNotification.service.SendEnum,
            DeliveryMethodEnum: countlyPushNotification.service.DeliveryMethodEnum,
            TimezoneEnum: countlyPushNotification.service.TimezoneEnum,
            PastScheduleEnum: countlyPushNotification.service.PastScheduleEnum,
            TriggerEnum: countlyPushNotification.service.TriggerEnum,
            TriggerNotMetEnum: countlyPushNotification.service.TriggerNotMetEnum,
            MediaTypeEnum: countlyPushNotification.service.MediaTypeEnum,
            UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
            UserPropertyTypeEnum: countlyPushNotification.service.UserPropertyTypeEnum,
            TriggerTypeEnum: countlyPushNotification.service.TriggerTypeEnum,
            messageTypeFilterOptions: [
                {label: i18n("push-notification.content-message"), value: countlyPushNotification.service.MessageTypeEnum.CONTENT},
                {label: i18n("push-notification.silent-message"), value: countlyPushNotification.service.MessageTypeEnum.SILENT}
            ],
            startDateOptions: countlyPushNotification.service.startDateOptions,
            targetingOptions: countlyPushNotification.service.targetingOptions,
            bucketList: countlyPushNotification.service.bucketList,
            weeklyRepetitionOptions: countlyPushNotification.service.weeklyRepetitionOptions,
            monthlyRepetitionOptions: countlyPushNotification.service.monthlyRepetitionOptions(),
            audienceSelectionOptions: countlyPushNotification.service.audienceSelectionOptions,
            triggerOptions: countlyPushNotification.service.triggerOptions,
            triggerNotMetOptions: countlyPushNotification.service.triggerNotMetOptions,
            deliveryMethodOptions: countlyPushNotification.service.deliveryMethodOptions,
            activeLocalization: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
            selectedLocalizationFilter: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
            isConfirmed: false,
            expandedPlatformSettings: [],
            settings: this.getInitialPushNotificationDrawerSettingsState(),
            userPropertiesIdCounter: 0,
            selectedUserPropertyId: null,
            isAddUserPropertyPopoverOpen: {
                title: false,
                content: false
            },
            isUsersTimezoneSet: false,
            isEndDateSet: false,
            isLocationSet: false,
            multipleLocalizations: false,
            urlRegex: new RegExp('([A-Za-z][A-Za-z0-9+\\-.]*):(?:(//)(?:((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:]|%[0-9A-Fa-f]{2})*)@)?((?:\\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&\'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\\-._~!$&\'()*+,;=]|%[0-9A-Fa-f]{2})*))(?::([0-9]*))?((?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|/((?:(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?)|((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|)(?:\\?((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?(?:\\#((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?'),
            pushNotificationUnderEdit: null,
            campaignTypes: countlyPushNotification.service.CampaignTypes,
            currentNumberOfUsers: 0,
            today: Date.now(),
            appConfig: {},
            title: '',
            type: countlyPushNotification.service.TypeEnum.ONE_TIME,
            campaignType: "One-Time",
            campaignTypeMapper: {"One-Time": "oneTime", "Automated": "automatic", "Recurring": "rec", "Multiple Days": "multi", "API": "transactional"}
        };
    },
    watch: {
        type: function(val) {
            if (val) {
                this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type, this.pushNotificationUnderEdit)));
                this.updatePlatformsBasedOnAppConfig();
            }
        },
        'campaignType': {
            handler: function(newVal) {
                if (typeof this.campaignTypeMapper[newVal] !== "undefined") {
                    this.type = this.campaignTypeMapper[newVal];
                }
                else if (typeof this.campaignTypeMapper[newVal] === "undefined") {
                    this.type = newVal;
                }
            },
            deep: true
        }
    },
    computed: {
        startDate: {
            get: function() {
                if (this.pushNotificationUnderEdit.delivery.startDate) {
                    return this.pushNotificationUnderEdit.delivery.startDate;
                }
                return this.today;
            },
            set: function(value) {
                this.pushNotificationUnderEdit.delivery.startDate = value;
            }
        },
        endDate: {
            get: function() {
                if (this.pushNotificationUnderEdit.delivery.endDate) {
                    return this.pushNotificationUnderEdit.delivery.endDate;
                }
                return this.today;
            },
            set: function(value) {
                this.pushNotificationUnderEdit.delivery.endDate = value;
            }
        },
        usersTimezone: {
            get: function() {
                if (this.pushNotificationUnderEdit.automatic.usersTimezone) {
                    return this.pushNotificationUnderEdit.automatic.usersTimezone;
                }
                return this.today;
            },
            set: function(value) {
                this.pushNotificationUnderEdit.automatic.usersTimezone = value;
            }
        },
        saveButtonLabel: function() {
            if (!countlyPushNotification.service.isPushNotificationApproverPluginEnabled()) {
                return i18n('push-notification.save');
            }
            if (countlyPushNotification.service.hasApproverBypassPermission()) {
                return i18n('push-notification.save');
            }
            return i18n('push-notification.send-for-approval');
        },
        addButtonLabel: function() {
            if (this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.length === 0) {
                return i18n('push-notification.add-first-button');
            }
            return i18n('push-notification.add-second-button');
        },
        isDraftButtonEnabled: function() {
            return this.userCommand === this.UserCommandEnum.EDIT_DRAFT ||
            this.userCommand === this.UserCommandEnum.CREATE ||
            this.userCommand === this.UserCommandEnum.DUPLICATE;
        },
        isDefaultLocalizationActive: function() {
            return this.activeLocalization === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
        },
        isAddButtonDisabled: function() {
            return this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.length === 2;
        },
        selectedLocalizationFilterOptions: function() {
            return this.pushNotificationUnderEdit.localizations;
        },
        selectedLocalizationMessage: function() {
            return this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter];
        },
        totalEnabledUsers: function() {
            var self = this;
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.ANDROID;
            }) &&
            this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.IOS;
            })) {
                return this.enabledUsers[this.PlatformEnum.ALL];
            }
            if (this.pushNotificationUnderEdit.platforms.some(function(selectedPlatform) {
                return selectedPlatform === self.PlatformEnum.ANDROID;
            })) {
                return this.enabledUsers[this.PlatformEnum.ANDROID];
            }
            if (this.pushNotificationUnderEdit.platforms.some(function(selectedPlatform) {
                return selectedPlatform === self.PlatformEnum.IOS;
            })) {
                return this.enabledUsers[this.PlatformEnum.IOS];
            }
            return 0;
        },
        selectedMessageLocale: function() {
            return this.pushNotificationUnderEdit.message[this.activeLocalization];
        },
        areCohortsAndLocationsRequired: function() {
            return !this.pushNotificationUnderEdit.cohorts.length && !this.pushNotificationUnderEdit.locations.length;
        },
        hasAllPlatformMediaOnly: function() {
            return (!this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL &&
            !this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL) ||
            (!this.settings[this.PlatformEnum.IOS].isMediaURLEnabled &&
            !this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled);
        },
        previewIOSMediaURL: function() {
            var result = "";
            if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL) {
                result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL;
            }
            if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL && this.settings[this.PlatformEnum.IOS].isMediaURLEnabled) {
                result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL;
            }
            return result;
        },
        previewAndroidMediaURL: function() {
            var result = "";
            if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL) {
                result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL;
            }
            if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL && this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled) {
                result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL;
            }
            return result;
        },
        previewMessageMedia: function() {
            var result = {};
            result[this.PlatformEnum.ALL] = {url: this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL, type: this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaMime };
            result[this.PlatformEnum.IOS] = {url: this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL, type: this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaMime };
            result[this.PlatformEnum.ANDROID] = {url: this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL, type: this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaMime};
            return result;
        },
        previewMessageTitle: function() {
            return countlyPushNotification.helper.getPreviewMessageComponentsList(this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter].title);
        },
        previewMessageContent: function() {
            return countlyPushNotification.helper.getPreviewMessageComponentsList(this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter].content);
        },
        shouldDisplayIOSSettings: function() {
            return this.shouldDisplayPlatformSettings(this.PlatformEnum.IOS);
        },
        shouldDisplayAndroidSettings: function() {
            return this.shouldDisplayPlatformSettings(this.PlatformEnum.ANDROID);
        },
        shouldDisplayNumberOfUsers: function() {
            if (this.pushNotificationUnderEdit.type === this.TypeEnum.ONE_TIME || this.type === this.TypeEnum.ONE_TIME) {
                return this.pushNotificationUnderEdit[this.TypeEnum.ONE_TIME].audienceSelection === this.AudienceSelectionEnum.NOW;
            }
            return true;
        },
        previewPlatforms: function() {
            return this.pushNotificationUnderEdit.platforms.map(function(selectedPlatform) {
                return countlyPushNotification.service.platformOptions[selectedPlatform].label;
            });
        },
        previewLocations: function() {
            var self = this;
            return this.locationOptions.reduce(function(allLocations, currentLocation) {
                if (self.pushNotificationUnderEdit.locations.some(function(selectedLocationId) {
                    return currentLocation._id === selectedLocationId;
                })) {
                    allLocations.push(currentLocation.name);
                }
                return allLocations;
            }, []);
        },
    },
    methods: {
        getInitialPushNotificationDrawerSettingsState: function() {
            const _InitialPushNotificationDrawerSettingsState = JSON.parse(JSON.stringify(InitialPushNotificationDrawerSettingsState));
            const settings = window.countlyPlugins.getConfigsData();
            if (settings.push && settings.push.default_content_available) {
                _InitialPushNotificationDrawerSettingsState.ios.isContentAvailableSet = true;
            }
            return _InitialPushNotificationDrawerSettingsState;
        },
        previewCohorts: function(cohorts) {
            var selectedCohorts = this.cohortOptions.filter(function(cohort) {
                return cohorts.some(function(selectedCohortId) {
                    return cohort._id === selectedCohortId;
                });
            });
            return selectedCohorts.map(function(cohort) {
                return cohort.name.replace(/&quot;/g, '\\"');
            });
        },
        formatDateTime: function(dateTime, format) {
            return countlyPushNotification.helper.formatDateTime(dateTime, format);
        },
        formatRepetitionDays: function(repetitionDays) {
            const days = this.weeklyRepetitionOptions.map(option => option.label);
            const selectedDays = repetitionDays.map(day => days[day - 1]);
            return selectedDays.join(', ');
        },
        setUserPropertyOptions: function(propertyList) {
            var allPropertyOptions = [];
            if (this.type === this.TypeEnum.AUTOMATIC && this.pushNotificationUnderEdit.automatic.trigger === this.TriggerEnum.EVENT) {
                allPropertyOptions.push({label: i18n('push-notification.event-properties'), name: "eventProperties", options: countlyPushNotification.helper.getEventPropertyOptions(propertyList)});
            }
            allPropertyOptions.push({label: i18n('push-notification.user-properties'), name: "userProperties", options: countlyPushNotification.helper.getUserPropertyOptions(propertyList)});
            allPropertyOptions.push({label: i18n('push-notification.custom-properties'), name: "customProperties", options: countlyPushNotification.helper.getCustomPropertyOptions(propertyList)});
            this.userPropertiesOptions = allPropertyOptions;
        },
        fetchUserPropertyOptions: function() {
            var self = this;
            countlyPushNotification.service.fetchUserProperties().then(function(result) {
                self.setUserPropertyOptions(result);
            });
        },
        isDeliveryNextStepFromInfoStep: function(nextStep, currentStep) {
            return nextStep === 2 && currentStep === 1;
        },
        isReviewNextStepFromContentStep: function(nextStep, currentStep) {
            return nextStep === 4 && currentStep === 3;
        },
        isContentNextStepFromInfoStep: function(nextStep, currentStep) {
            return nextStep === 3 && currentStep === 1;
        },
        isContentNextStepFromAnyPreviousStep: function(nextStep, currentStep) {
            return nextStep === 3 && currentStep < 3;
        },
        isEditMode: function() {
            return this.userCommand === this.UserCommandEnum.DUPLICATE ||
            this.userCommand === this.UserCommandEnum.EDIT_DRAFT ||
            this.userCommand === this.UserCommandEnum.EDIT ||
            this.userCommand === this.UserCommandEnum.RESEND;
        },
        shouldEstimate: function(nextStep, currentStep) {
            return this.isDeliveryNextStepFromInfoStep(nextStep, currentStep) || this.isContentNextStepFromInfoStep(nextStep, currentStep);
        },
        shouldValidateContentOnEnter: function(nextStep, currentStep) {
            return (this.isContentNextStepFromAnyPreviousStep(nextStep, currentStep) && this.isEditMode());
        },
        shouldValidateContentBeforeExit: function(nextStep, currentStep) {
            return this.isReviewNextStepFromContentStep(nextStep, currentStep) && this.pushNotificationUnderEdit.messageType === this.MessageTypeEnum.CONTENT;
        },
        validateContentOnEnterIfNecessary: function(nextStep, currentStep) {
            if (this.shouldValidateContentOnEnter(nextStep, currentStep) && this.$refs.content) {
                this.$refs.content.validate();
            }
        },
        fetchUserPropertyOptionsOnContentEnter: function(nextStep, currentStep) {
            if (this.isContentNextStepFromAnyPreviousStep(nextStep, currentStep)) {
                this.fetchUserPropertyOptions();
            }
        },
        validateDeliveryDates: function(nextStep, currentStep) {
            if (currentStep === 2 && nextStep === 3 && this.isEndDateSet && this.pushNotificationUnderEdit.delivery.endDate && this.pushNotificationUnderEdit.delivery.startDate) {
                return new Date(this.pushNotificationUnderEdit.delivery.endDate) >= new Date(this.pushNotificationUnderEdit.delivery.startDate);
            }
            return true;
        },
        validateStartDates: function(nextStep, currentStep) {
            if (currentStep === 2 && nextStep === 3 && this.type !== this.campaignTypeMapper.API) {
                var startDate = new Date();
                var today = new Date();
                var validDate = new Date(today.getTime() + (15 * 60 * 60 * 1000));
                if (this.type === "rec") {
                    startDate = new Date(this.pushNotificationUnderEdit.delivery.startDate);
                }
                else if (this.type === "oneTime") {
                    if (this.pushNotificationUnderEdit.timezone === "device") {
                        startDate = new Date(this.pushNotificationUnderEdit.delivery.startDate);
                    }
                    else {
                        return true;
                    }
                }
                else if (this.type === "multi") {
                    if (this.pushNotificationUnderEdit.timezone === "device") {
                        var multipleDates = this.pushNotificationUnderEdit.delivery.multipleDates;
                        for (var i = 0; i < multipleDates.length; i++) {
                            var inputDate = new Date(multipleDates[i]);
                            if (inputDate.getTime() < validDate.getTime()) {
                                return false;
                            }
                        }
                        return true;
                    }
                    else {
                        return true;
                    }
                }
                else if (this.type === "automatic") {
                    if (this.pushNotificationUnderEdit.automatic.deliveryMethod === "immediately" && this.pushNotificationUnderEdit.delivery.type === "later") {
                        startDate = new Date(this.pushNotificationUnderEdit.delivery.startDate);
                    }
                    else {
                        return true;
                    }
                }
                if (startDate < validDate) {
                    return false;
                }
                else {
                    return true;
                }
            }
            return true;
        },
        onStepClick: function(nextStep, currentStep) {
            this.validateContentOnEnterIfNecessary(nextStep, currentStep);
            this.fetchUserPropertyOptionsOnContentEnter(nextStep, currentStep);
            if (!this.validateDeliveryDates(nextStep, currentStep)) {
                notify({ message: i18n('push-notification-drawer.date-validation'), type: "error"});
                return;
            }
            if (this.shouldEstimate(nextStep, currentStep)) {
                this.estimate();
            }
            if (this.shouldValidateContentBeforeExit(nextStep, currentStep)) {
                return this.$refs.content.validate();
            }
            return Promise.resolve(true);
        },
        setId: function(id) {
            this.pushNotificationUnderEdit._id = id;
        },
        setCurrentNumberOfUsers: function(value) {
            this.currentNumberOfUsers = value;
        },
        updateEnabledNumberOfUsers: function(value) {
            var self = this;
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.ANDROID;
            }) &&
            this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.IOS;
            })) {
                this.enabledUsers[this.PlatformEnum.ALL] = value;
                return;
            }
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.ANDROID;
            })) {
                this.enabledUsers[this.PlatformEnum.ANDROID] = value;
                this.enabledUsers[this.PlatformEnum.IOS] = 0;
                return;
            }
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.IOS;
            })) {
                this.enabledUsers[this.PlatformEnum.IOS] = value;
                this.enabledUsers[this.PlatformEnum.ANDROID] = 0;
                return;
            }
        },
        setLocalizationOptions: function(localizations) {
            this.localizationOptions = localizations;
        },
        setIsLoading: function(value) {
            this.isLoading = value;
        },
        setEstimationLoading: function(value) {
            this.isEstimationLoading = value;
        },
        getQueryFilter: function() {
            if (!this.queryFilter) {
                return {};
            }
            return this.queryFilter;
        },
        estimate: function() {
            var self = this;
            return new Promise(function(resolve) {
                if (!self.pushNotificationUnderEdit.platforms.length) {
                    resolve(false);
                    return;
                }
                self.setEstimationLoading(true);
                var options = {};
                options.isLocationSet = self.isLocationSet;
                options.from = self.from;
                options.queryFilter = self.getQueryFilter();
                var preparePushNotificationModel = Object.assign({}, self.pushNotificationUnderEdit);
                preparePushNotificationModel.type = self.type;
                countlyPushNotification.service.estimate(preparePushNotificationModel, options).then(function(response) {
                    if (response._id) {
                        self.setId(response._id);
                    }
                    self.setLocalizationOptions(response.localizations);
                    self.setCurrentNumberOfUsers(response.total);
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.ONE_TIME || self.type === self.TypeEnum.ONE_TIME) {
                        if (self.pushNotificationUnderEdit[self.TypeEnum.ONE_TIME].targeting === self.TargetingEnum.ALL) {
                            self.updateEnabledNumberOfUsers(response.total);
                        }
                    }
                    if (self.type === self.TypeEnum.ONE_TIME && self.pushNotificationUnderEdit[self.TypeEnum.ONE_TIME].audienceSelection === self.AudienceSelectionEnum.BEFORE) {
                        resolve(true);
                        return;
                    }
                    if (response.total === 0) {
                        resolve(false);
                        notify({ message: 'No users were found from selected configuration.', type: "error"});
                        return;
                    }
                    resolve(true);
                }).catch(function(error) {
                    console.error(error);
                    self.setLocalizationOptions([]);
                    self.setCurrentNumberOfUsers(0);
                    self.updateEnabledNumberOfUsers(0);
                    notify({ message: error.message, type: "error"});
                    resolve(false);
                }).finally(function() {
                    self.setEstimationLoading(false);
                });
            });
        },
        getBaseOptions: function() {
            var options = {};
            options.localizations = this.localizationOptions;
            options.settings = this.settings;
            options.isUsersTimezoneSet = this.isUsersTimezoneSet;
            options.isEndDateSet = this.isEndDateSet;
            options.isLocationSet = this.isLocationSet;
            options.from = this.from;
            options.queryFilter = this.getQueryFilter();
            return options;
        },
        save: function(options) {
            if (!options) {
                options = {};
            }
            options = Object.assign(options, this.getBaseOptions());
            var model = Object.assign({}, this.pushNotificationUnderEdit);
            model.type = this.type;
            return countlyPushNotification.service.save(model, options);
        },
        sendToTestUsers: function(options) {
            if (!options) {
                options = {};
            }
            options = Object.assign(options, this.getBaseOptions());
            var model = Object.assign({}, this.pushNotificationUnderEdit);
            model.type = this.type;
            return countlyPushNotification.service.sendToTestUsers(model, options);
        },
        update: function(options) {
            if (!options) {
                options = {};
            }
            options = Object.assign(options, this.getBaseOptions());
            var model = Object.assign({}, this.pushNotificationUnderEdit);
            model.type = this.type;
            return countlyPushNotification.service.update(model, options);
        },
        resend: function(options) {
            if (!options) {
                options = {};
            }
            options = Object.assign(options, this.getBaseOptions());
            var model = Object.assign({}, this.pushNotificationUnderEdit);
            model.type = this.type;
            return countlyPushNotification.service.resend(model, options);
        },
        saveDraft: function() {
            var options = {};
            options.isDraft = true;
            options.isActive = false;
            return this.save(options);
        },
        updateDraft: function() {
            var options = {};
            options.isDraft = true;
            options.isActive = false;
            return this.update(options);
        },
        saveFromDraft: function() {
            var options = {};
            options.isDraft = true;
            options.isActive = true;
            return this.update(options);
        },
        onDraft: function() {
            var self = this;
            var promiseMethod = null;
            if (this.userCommand === this.UserCommandEnum.EDIT_DRAFT) {
                promiseMethod = this.updateDraft;
            }
            if (this.userCommand === this.UserCommandEnum.CREATE) {
                promiseMethod = this.saveDraft;
            }
            if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                promiseMethod = this.saveDraft;
            }
            if (!promiseMethod) {
                throw new Error('Invalid user command:' + this.userCommand);
            }
            promiseMethod().then(function() {
                self.$refs.drawer.doClose();
                notify({message: i18n('push-notification.was-successfully-saved')});
                self.$emit('save');
            }).catch(function(error) {
                console.error(error);
                notify({message: error.message, type: "error"});
            });
        },
        onSubmit: function(_, done) {
            var self = this;
            var promiseMethod = null;
            if (this.userCommand === this.UserCommandEnum.EDIT_DRAFT) {
                promiseMethod = this.saveFromDraft;
            }
            if (this.userCommand === this.UserCommandEnum.EDIT) {
                promiseMethod = this.update;
            }
            if (this.userCommand === this.UserCommandEnum.EDIT_REJECT) {
                promiseMethod = this.saveFromDraft;
            }
            if (this.userCommand === this.UserCommandEnum.CREATE) {
                promiseMethod = this.save;
            }
            if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                promiseMethod = this.save;
            }
            if (this.userCommand === this.UserCommandEnum.RESEND) {
                promiseMethod = this.resend;
            }
            if (!promiseMethod) {
                throw new Error('Invalid user command:' + this.userCommand);
            }
            promiseMethod().then(function() {
                done();
                notify({ message: i18n('push-notification.was-successfully-saved')});
                self.$emit('save');
            }).catch(function(error) {
                console.error(error);
                notify({ message: error.message, type: "error"});
                done(true);
            });
        },
        onSendToTestUsers: function() {
            var self = this;
            this.isLoading = true;
            this.sendToTestUsers().then(function(results) {
                console.log("view", results);
                let successfull = results.filter(push => !push.error);
                let failed = results.filter(push => push.error);
                if (!failed.length) {
                    notify({
                        message: i18n('push-notification.was-successfully-sent-to-test-users')
                    });
                }
                else {
                    notify({
                        message: i18n('push-notification.some-messages-failed-to-send-test-users')
                            + "(failed: " + failed.length + ", successful: " + successfull.length + ")",
                    });
                    console.warning("some messages were failed", results);
                }
            }).catch(function(error) {
                console.error(error);
                notify({ message: error.message, type: "error"});
            }).finally(function() {
                self.isLoading = false;
            });
        },
        resetState: function() {
            this.activeLocalization = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            this.selectedLocalizationFilter = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            this.isUsersTimezoneSet = false;
            this.isEndDateSet = false;
            this.isLocationSet = false;
            this.isConfirmed = false;
            this.multipleLocalizations = false;
            this.expandedPlatformSettings = [];
            this.campaignType = "One-Time";
            this.isAddUserPropertyPopoverOpen = {
                title: false,
                content: false
            };
            this.settings = this.getInitialPushNotificationDrawerSettingsState();
            this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type)));
        },
        onClose: function() {
            this.resetState();
            this.$emit('onClose');
        },
        hasPlatformConfig: function(platform) {
            if (platform === this.PlatformEnum.ANDROID) {
                return (this.appConfig[platform] && this.appConfig[platform]._id) || (this.appConfig[this.PlatformEnum.HUAWEI] && this.appConfig[this.PlatformEnum.HUAWEI]._id);
            }
            return this.appConfig[platform] && this.appConfig[platform]._id;
        },
        getPlatformLabel: function(platform) {
            if (platform === this.PlatformEnum.ANDROID) {
                return i18n('push-notification.android');
            }
            if (platform === this.PlatformEnum.IOS) {
                return i18n('push-notification.ios');
            }
            return platform;
        },
        hasAnyFilters: function() {
            return this.pushNotificationUnderEdit.user || this.pushNotificationUnderEdit.drill;
        },
        estimateIfNecessary: function() {
            if (this.pushNotificationUnderEdit.type === this.TypeEnum.ONE_TIME || this.type === this.TypeEnum.ONE_TIME) {
                if (this.from) {
                    this.estimate();
                    return;
                }
                if (this.hasAnyFilters()) {
                    this.estimate();
                    return;
                }
            }
        },
        onPlatformChange: function(platform) {
            if (!this.isPlatformSelected(platform)) {
                if (this.hasPlatformConfig(platform)) {
                    this.pushNotificationUnderEdit.platforms.push(platform);
                    this.estimateIfNecessary();
                    return;
                }
                notify({type: 'error', message: 'No push credentials found for ' + this.getPlatformLabel(platform) + ' platform' });
            }
            else {
                this.pushNotificationUnderEdit.platforms = this.pushNotificationUnderEdit.platforms.filter(function(item) {
                    return item !== platform;
                });
                this.estimateIfNecessary();
            }
        },
        isPlatformSelected: function(platform) {
            return this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === platform;
            });
        },
        updatePlatformsBasedOnAppConfig: function() {
            if (this.hasPlatformConfig(this.PlatformEnum.ANDROID)) {
                this.pushNotificationUnderEdit.platforms.push(this.PlatformEnum.ANDROID);
            }
            if (this.hasPlatformConfig(this.PlatformEnum.IOS)) {
                this.pushNotificationUnderEdit.platforms.push(this.PlatformEnum.IOS);
            }
        },
        isQueryFilterEmpty: function() {
            return this.queryFilter && this.queryFilter.queryObject && Object.keys(this.queryFilter.queryObject).length === 0;
        },
        onOpen: function() {
            const selectedTriggerKindMapper = {"oneTime": "One-Time", "automatic": "Automated", "rec": "Recurring", "multi": "Multiple Days", "transactional": "API"};
            if (this.id) {
                this.fetchPushNotificationById();
                if (this.$store.state.countlyPushNotificationMain && this.$store.state.countlyPushNotificationMain.selectedTriggerKind) {
                    this.campaignType = this.$store.state.countlyPushNotificationMain.selectedTriggerKind;
                }
                else if (this.$store.state.countlyPushNotificationDetails && this.$store.state.countlyPushNotificationDetails.pushNotification.type) {
                    this.campaignType = selectedTriggerKindMapper[this.$store.state.countlyPushNotificationDetails.pushNotification.type];
                }
                this.title = i18n('push-notification.update-notification');
                return;
            }
            else {
                this.title = i18n('push-notification.create-new-notification');
            }
            this.updatePlatformsBasedOnAppConfig();
            this.estimateIfNecessary();

            if (this.$store.state.countlyPushNotificationDashboard) {
                this.setEnabledUsers(this.$store.state.countlyPushNotificationDashboard.enabledUsers);
            }
            else {
                var self = this;
                countlyPushNotification.service.fetchDashboard()
                    .then(function(response) {
                        self.setEnabledUsers(response.enabledUsers);
                    })
                    .catch(function(error) {
                        console.error(error);
                    });
            }
        },
        addButton: function() {
            this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.push({label: "", url: ""});
        },
        removeButton: function(index) {
            var filteredButtons = this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.filter(function(buttonItem, buttonIndex) {
                return buttonIndex !== index;
            });
            this.pushNotificationUnderEdit.message[this.activeLocalization].buttons = filteredButtons;
        },
        removeAllNonDefaultSelectedLocalizations: function() {
            this.pushNotificationUnderEdit.localizations = this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                return selectedLocalization.value === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            });
        },
        deleteAllNonDefaultLocalizationMessages: function() {
            var self = this;
            Object.keys(this.pushNotificationUnderEdit.message).forEach(function(key) {
                if (key && key !== countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE) {
                    self.$delete(self.pushNotificationUnderEdit.message, key);
                }
            });
        },
        expandPlatformSettingsIfSilentMessage: function() {
            if (this.pushNotificationUnderEdit.messageType === this.MessageTypeEnum.SILENT) {
                this.expandedPlatformSettings = [].concat(this.pushNotificationUnderEdit.platforms);
            }
        },
        onMessageTypeChange: function(value) {
            this.pushNotificationUnderEdit.messageType = value;
            this.expandPlatformSettingsIfSilentMessage();
        },
        onMultipleLocalizationChange: function(isChecked) {
            this.multipleLocalizations = isChecked;
            if (!isChecked) {
                this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                this.resetMessageInHTMLToActiveLocalization();
                this.deleteAllNonDefaultLocalizationMessages();
                this.removeAllNonDefaultSelectedLocalizations();
            }
        },
        isDefaultLocalization: function(item) {
            return item.value === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
        },
        isLocalizationSelected: function(item) {
            return this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                return item.value === selectedLocalization.value;
            }).length > 0;
        },
        addEmptyLocalizationMessageIfNotFound: function(localization) {
            var value = localization.value;
            if (!this.pushNotificationUnderEdit.message[value]) {
                this.$set(this.pushNotificationUnderEdit.message, value, {
                    title: "",
                    content: "",
                    buttons: [],
                    properties: {
                        title: {},
                        content: {}
                    }
                });
            }
        },
        addLocalizationIfNotSelected: function(item) {
            if (!this.isLocalizationSelected(item)) {
                this.pushNotificationUnderEdit.localizations.push(item);
            }
        },
        setActiveLocalization: function(value) {
            this.activeLocalization = value;
        },
        removeLocalization: function(item) {
            this.pushNotificationUnderEdit.localizations = this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                return item.value !== selectedLocalization.value;
            });
        },
        resetMessageInHTMLToActiveLocalization: function() {
            this.$refs.title.reset(
                this.pushNotificationUnderEdit.message[this.activeLocalization].title,
                Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.title)
            );
            this.$refs.content.reset(
                this.pushNotificationUnderEdit.message[this.activeLocalization].content,
                Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.content)
            );
        },
        onLocalizationChange: function(localization) {
            if (!this.isLocalizationSelected(localization)) {
                this.addEmptyLocalizationMessageIfNotFound(localization);
                this.addLocalizationIfNotSelected(localization);
                this.setActiveLocalization(localization.value);
                this.resetMessageInHTMLToActiveLocalization();
            }
            else {
                this.removeLocalization(localization);
                this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                this.resetMessageInHTMLToActiveLocalization();
            }
        },
        onLocalizationSelect: function(localization) {
            this.addEmptyLocalizationMessageIfNotFound(localization);
            this.setActiveLocalization(localization.value);
            this.resetMessageInHTMLToActiveLocalization();
        },
        onSettingChange: function(platform, property, value) {
            this.pushNotificationUnderEdit.settings[platform][property] = value;
        },
        onSettingToggle: function(platform, property, value) {
            this.settings[platform][property] = value;
        },
        prettifyJSON: function(value) {
            return countlyPushNotification.helper.prettifyJSON(value, 2);
        },
        onTitleChange: function(value) {
            this.pushNotificationUnderEdit.message[this.activeLocalization].title = value;
        },
        onContentChange: function(value) {
            this.pushNotificationUnderEdit.message[this.activeLocalization].content = value;
        },
        setSelectedUserPropertyId: function(id) {
            this.selectedUserPropertyId = id;
        },
        openAddUserPropertyPopover: function(container) {
            this.isAddUserPropertyPopoverOpen[container] = true;
        },
        closeAddUserPropertyPopover: function(container) {
            this.isAddUserPropertyPopoverOpen[container] = false;
        },
        addUserPropertyInHTML: function(id, container) {
            this.$refs[container].addEmptyUserProperty(id);
        },
        removeUserPropertyInHTML: function(id, container) {
            this.$refs[container].removeUserProperty(id);
        },
        setUserPropertyInHTML: function(id, container, previewValue, value, type) {
            this.$refs[container].setUserPropertyValue(id, previewValue, value, type);
        },
        setUserPropertyFallbackInHTML: function(id, container, previewValue, fallback) {
            this.$refs[container].setUserPropertyFallbackValue(id, previewValue, fallback);
        },
        isAnyAddUserPropertyPopoverOpen: function() {
            return this.isAddUserPropertyPopoverOpen.title || this.isAddUserPropertyPopoverOpen.content;
        },
        onAddUserProperty: function(container) {
            if (!this.isAnyAddUserPropertyPopoverOpen()) {
                var propertyIndex = this.userPropertiesIdCounter;
                this.userPropertiesIdCounter = this.userPropertiesIdCounter + 1;
                this.$set(this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container], propertyIndex, {
                    id: propertyIndex,
                    value: "",
                    type: this.UserPropertyTypeEnum.USER,
                    label: "Select property|",
                    fallback: "",
                    isUppercase: false
                });
                this.setSelectedUserPropertyId(propertyIndex);
                this.addUserPropertyInHTML(propertyIndex, container);
            }
        },
        onRemoveUserProperty: function(payload) {
            var id = payload.id;
            var container = payload.container;
            this.closeAddUserPropertyPopover(payload.container);
            this.$delete(this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container], id);
            this.removeUserPropertyInHTML(id, container);
        },
        onSelectUserProperty: function(payload) {
            var id = payload.id;
            var container = payload.container;
            var value = payload.value;
            var label = payload.label;
            var type = payload.type;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].value = value;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label = label;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].type = type;
            var currentFallbackValue = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback;
            var previewValue = label + "|" + currentFallbackValue;
            this.setUserPropertyInHTML(id, container, previewValue, value, type);
        },
        onInputUserProperty: function(payload) {
            var id = payload.id;
            var container = payload.container;
            var value = payload.value;
            var label = payload.value;
            var type = this.UserPropertyTypeEnum.API;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].value = value;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label = label;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].type = type;
            var currentFallbackValue = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback;
            var previewValue = "{" + value + "}|" + currentFallbackValue;
            this.setUserPropertyInHTML(id, container, previewValue, value, type);
        },
        onInputFallbackUserProperty: function(payload) {
            var id = payload.id;
            var container = payload.container;
            var fallback = payload.value;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback = fallback;
            var currentLabel = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label;
            var previewValue = currentLabel + "|" + fallback;
            this.setUserPropertyFallbackInHTML(id, container, previewValue, fallback);
        },
        onCheckUppercaseUserProperty: function(payload) {
            var id = payload.id;
            var container = payload.container;
            var isUppercase = payload.value;
            this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].isUppercase = isUppercase;
        },
        onUserPropertyClick: function(payload) {
            if (!this.isAnyAddUserPropertyPopoverOpen()) {
                this.setSelectedUserPropertyId(payload.id);
                this.openAddUserPropertyPopover(payload.container);
            }
        },
        resetAllMediaURLIfNecessary: function() {
            if (this.pushNotificationUnderEdit.settings.android.mediaURL && this.pushNotificationUnderEdit.settings.ios.mediaURL) {
                this.pushNotificationUnderEdit.settings.all.mediaURL = "";
            }
        },
        onAllMediaURLInput: function(value) {
            var self = this;
            this.pushNotificationUnderEdit.settings.all.mediaURL = value;
            this.$refs.allMediaURLValidationProvider.validate(value).then(function(result) {
                self.afterMediaURLValidate(self.PlatformEnum.ALL, result.valid);
            });
        },
        onAndroidMediaURLInput: function(value) {
            var self = this;
            this.pushNotificationUnderEdit.settings.android.mediaURL = value;
            this.$refs.androidMediaURLValidationProvider.validate(value).then(function(result) {
                self.afterMediaURLValidate(self.PlatformEnum.ANDROID, result.valid);
            });
            this.resetAllMediaURLIfNecessary();
        },
        onIOSMediaURLInput: function(value) {
            var self = this;
            this.pushNotificationUnderEdit.settings.ios.mediaURL = value;
            this.$refs.iosMediaURLValidationProvider.validate(value).then(function(result) {
                self.afterMediaURLValidate(self.PlatformEnum.IOS, result.valid);
            });
            this.resetAllMediaURLIfNecessary();
        },
        onSelectedBucket: function() {
            this.pushNotificationUnderEdit.delivery.repetition.on = [];
        },
        afterMediaURLValidate: function(platform, isValid) {
            if (isValid) {
                this.fetchMediaMetadata(platform, this.pushNotificationUnderEdit.settings[platform].mediaURL);
            }
        },
        setMediaMime: function(platform, mime) {
            this.pushNotificationUnderEdit.settings[platform].mediaMime = mime;
        },
        fetchMediaMetadata: function(platform, url) {
            var self = this;
            countlyPushNotification.service.fetchMediaMetadata(url).then(function(mediaMetadata) {
                self.setMediaMime(platform, mediaMetadata.mime);
            }).catch(function() {
                self.setMediaMime(platform, "");
            });
        },
        setCohortOptions: function(cohorts) {
            this.cohortOptions = cohorts;
        },
        fetchCohorts: function() {
            var self = this;
            this.isFetchCohortsLoading = true;
            countlyPushNotification.service.fetchCohorts()
                .then(function(cohorts) {
                    self.setCohortOptions(cohorts);
                }).catch(function(error) {
                    console.error(error);
                    self.setCohortOptions([]);
                }).finally(function() {
                    self.isFetchCohortsLoading = false;
                });
        },
        setLocationOptions: function(locations) {
            this.locationOptions = locations;
        },
        fetchLocations: function() {
            var self = this;
            this.isFetchLocationsLoading = true;
            countlyPushNotification.service.fetchLocations()
                .then(function(locations) {
                    self.setLocationOptions(locations);
                }).catch(function(error) {
                    console.error(error);
                    self.setLocationOptions([]);
                }).finally(function() {
                    self.isFetchLocationsLoading = false;
                });
        },
        setEventOptions: function(events) {
            this.eventOptions = events;
        },
        fetchEvents: function() {
            var self = this;
            this.isFetchEventsLoading = true;
            countlyPushNotification.service.fetchEvents()
                .then(function(events) {
                    self.setEventOptions(events);
                }).catch(function(error) {
                    console.error(error);
                    self.setEventOptions([]);
                }).finally(function() {
                    self.isFetchEventsLoading = false;
                });
        },
        setEnabledUsers: function(enabledUsers) {
            this.enabledUsers = enabledUsers;
        },
        setPushNotificationUnderEdit: function(value) {
            this.pushNotificationUnderEdit = value;
        },
        updateIosPlatformSettingsStateIfFound: function() {
            var self = this;
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.IOS;
            })) {
                this.settings[this.PlatformEnum.IOS].isMediaURLEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL);
                this.settings[this.PlatformEnum.IOS].isSoundFilenameEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].soundFilename);
                this.settings[this.PlatformEnum.IOS].isBadgeNumberEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].badgeNumber);
                this.settings[this.PlatformEnum.IOS].isOnClickURLEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].onClickURL);
                this.settings[this.PlatformEnum.IOS].isJsonEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].json);
                this.settings[this.PlatformEnum.IOS].isUserDataEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].userData.length);
                this.settings[this.PlatformEnum.IOS].isSubtitleEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].subtitle);
                this.settings[this.PlatformEnum.IOS].isContentAvailableSet = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].setContentAvailable);
            }
        },
        updateAndroidPlatformSettingsStateIfFound: function() {
            var self = this;
            if (this.pushNotificationUnderEdit.platforms.some(function(item) {
                return item === self.PlatformEnum.ANDROID;
            })) {
                this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL);
                this.settings[this.PlatformEnum.ANDROID].isSoundFilenameEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].soundFilename);
                this.settings[this.PlatformEnum.ANDROID].isBadgeNumberEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].badgeNumber);
                this.settings[this.PlatformEnum.ANDROID].isOnClickURLEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].onClickURL);
                this.settings[this.PlatformEnum.ANDROID].isJsonEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].json);
                this.settings[this.PlatformEnum.ANDROID].isUserDataEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].userData.length);
                this.settings[this.PlatformEnum.ANDROID].isIconEnabled = Boolean(this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].icon);
            }
        },
        updateSettingsState: function() {
            this.updateIosPlatformSettingsStateIfFound();
            this.updateAndroidPlatformSettingsStateIfFound();
        },
        resetDelivery: function() {
            this.pushNotificationUnderEdit.delivery.startDate = Date.now();
            this.pushNotificationUnderEdit.delivery.endDate = null;
            this.pushNotificationUnderEdit.delivery.type = this.SendEnum.NOW;
        },
        updateOneTimeOptions: function() {
            if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                this.resetDelivery();
            }
        },
        updateAutomaticOptions: function() {
            if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                this.resetDelivery();
                this.pushNotificationUnderEdit.automatic.usersTimezone = null;
            }
            if (this.pushNotificationUnderEdit.automatic.usersTimezone) {
                this.isUsersTimezoneSet = true;
            }
            if (this.pushNotificationUnderEdit.delivery.endDate) {
                this.isEndDateSet = true;
            }
        },
        updateRecurringOptions: function() {
            if (this.pushNotificationUnderEdit.delivery.endDate) {
                this.isEndDateSet = true;
            }
        },
        updateTransactionalOptions: function() {
            if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                this.resetDelivery();
            }
        },
        fetchPushNotificationById: function() {
            var self = this;
            this.setIsLoading(true);
            countlyPushNotification.service.fetchById(this.id)
                .then(function(response) {
                    self.setPushNotificationUnderEdit(response);
                    if (self.userCommand === self.UserCommandEnum.DUPLICATE) {
                        self.setId(null);
                    }
                    self.resetMessageInHTMLToActiveLocalization();
                    self.updateSettingsState();
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.AUTOMATIC) {
                        self.updateAutomaticOptions();
                    }
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.ONE_TIME) {
                        self.updateOneTimeOptions();
                    }
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.TRANSACTIONAL) {
                        self.updateTransactionalOptions();
                    }
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.RECURRING) {
                        self.updateRecurringOptions();
                    }
                    if (self.pushNotificationUnderEdit.type === self.TypeEnum.ONE_TIME) {
                        if (self.hasAnyFilters()) {
                            self.estimate();
                            return;
                        }
                        self.setEnabledUsers(self.$store.state.countlyPushNotificationDashboard.enabledUsers);
                    }
                })
                .catch(function(error) {
                    console.error(error);
                    var initialModel = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(self.type)));
                    initialModel.type = self.type;
                    self.setPushNotificationUnderEdit(initialModel);
                })
                .finally(function() {
                    self.setIsLoading(false);
                });
        },
        shouldDisplayPlatformSettings: function(platform) {
            return this.pushNotificationUnderEdit.platforms.filter(function(selectedPlatform) {
                return selectedPlatform === platform;
            }).length > 0;
        },
        setAppConfig: function(value) {
            this.appConfig = value;
        },
        getAppConfig: function() {
            var appConfig = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins || {};
            try {
                this.setAppConfig(countlyPushNotification.mapper.incoming.mapAppLevelConfig(appConfig.push));
            }
            catch (error) {
                console.error(error);
            }
        },
        removeDate: function(index) {
            if (this.pushNotificationUnderEdit.delivery.multipleDates.length < 2) {
                notify({message: i18n('push-notification.cannot-remove-last-date'), type: "error"});
                return;
            }
            this.pushNotificationUnderEdit.delivery.multipleDates.splice(index, 1);
        },
        addDate: function() {
            this.pushNotificationUnderEdit.delivery.multipleDates.push(new Date().getTime());
        },
        formatDeliveryDates: function(values) {
            const dates = values.map((timestamp) => moment(timestamp).format('MM/DD/YYYY h:mm:ss A'));
            return dates.join(', ');
        }
    },
    beforeMount: function() {
        this.type = countlyPushNotification.service.TypeEnum.ONE_TIME;
        this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type)));
    },
    mounted: function() {
        this.fetchCohorts();
        this.fetchLocations();
        this.fetchEvents();
        this.getAppConfig();
        this.TypeEnum = countlyPushNotification.service.TypeEnum;
    },
    components: {
        "message-setting-element": MessageSettingElement,
        "mobile-message-preview": MobileMessagePreview,
        "message-editor-with-emoji-picker": MessageEditorWithEmojiPicker,
        "add-user-property-popover": AddUserPropertyPopover,
        "large-radio-button-with-description": LargeRadioButtonWithDescription,
        "line-radio-button-with-description": LineRadioButtonWithDescription,
        "review-section-row": ReviewSectionRow,
        'user-property-preview': UserPropertyPreview,
        'user-property-text-preview': UserPropertyTextPreview,
        ClyDrawer,
        ClyFormStep,
        ClyTooltipIcon,
        ClyDatePicker,
        ClySelectX,
        ClyNotification,
    },
};
</script>
