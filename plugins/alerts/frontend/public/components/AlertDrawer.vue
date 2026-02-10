<template>
    <div id="alert-drawer-container">
        <cly-drawer
            test-id="alert-drawer"
            @submit="onSubmit"
            @close="onClose"
            @copy="onCopy"
            :size="6"
            :title="title"
            :saveButtonLabel="saveButtonLabel"
            v-bind="$props.controls"
            ref="drawerData">
            <template v-slot:default="drawerScope">
                <cly-form-step id="alert-drawer-main" ref="formStep">
                    <cly-form-field name="alertName" :label="i18n('alert.Alert_Name')" rules="required" test-id="alert-name">
                        <el-input
                            test-id="alert-name-input"
                            v-model="drawerScope.editedObject.alertName"
                            class="bu-is-flex"
                            :placeholder="i18n('alert.enter-alert-name')">
                        </el-input>
                    </cly-form-field>

                    <cly-form-field name="apps" :label="i18n('alert.For_Applications')" rules="required" test-id="application">
                        <cly-app-select
                            test-id="application-select"
                            width="610"
                            :showSearch="true"
                            :showAppImage="true"
                            :placeholder="i18n('alerts.select-an-application')"
                            :auth='{"feature": "alerts", "permission": drawerScope.editedObject._id ? "u": "c"}'
                            class="bu-is-flex"
                            @change="appSelected"
                            v-model="drawerScope.editedObject.selectedApps"
                            :allowAll="true">
                        </cly-app-select>
                    </cly-form-field>

                    <cly-form-field name="dataType" :label="i18n('alert.Data_type')" rules="required" test-id="data-type">
                        <cly-select-x
                            test-id="data-type-select"
                            width="610"
                            :disabled="drawerScope.editedObject.selectedApps === 'all'"
                            v-tooltip="{ content: drawerScope.editedObject.selectedApps === 'all' ? i18n('alerts.application-tooltip') : '' }"
                            :showSearch="true"
                            class="bu-is-flex data-points-all-apps"
                            @change="dataTypeSelected"
                            :options="alertDataTypeOptions"
                            :placeholder="i18n('alerts.select-data-type')"
                            v-model="drawerScope.editedObject.alertDataType">
                            <template v-slot:option-prefix="scope">
                                <i :class="`${dataTypeIcons(scope.value)} bu-ml-1 bu-mr-1`"></i>
                            </template>
                            <template v-slot:label-prefix="scope">
                                <i
                                    v-if="drawerScope.editedObject.alertDataType"
                                    :class="`${dataTypeIcons(scope.options[0].value)} bu-ml-1 bu-mr-1`">
                                </i>
                            </template>
                        </cly-select-x>
                    </cly-form-field>

                    <cly-form-field
                        name="dataSubType2"
                        :class="subType2Padding(drawerScope.editedObject)"
                        :label="subType2Label(drawerScope.editedObject)"
                        v-if="subType2Label(drawerScope.editedObject)"
                        rules="required"
                        test-id="data-sub-type">
                        <cly-select-x
                            test-id="data-sub-type-select"
                            :placeholder="drawerScope.editedObject.alertDataType === 'events' ? i18n('alerts.select-event') : 'Select'"
                            :searchable="false"
                            v-model="drawerScope.editedObject.alertDataSubType2"
                            class="bu-is-flex"
                            :options="alertDataSubType2Options"
                            @change="setFilterKeyOptions">
                        </cly-select-x>
                    </cly-form-field>

                    <el-button
                        type="text"
                        class="bu-mb-3 color-blue-100"
                        @click="handleAddFilterButton"
                        v-if="!filterButton && showFilterButton(drawerScope.editedObject)"
                        data-test-id="add-filter-button">
                        {{ i18n('alerts.add-filter') }}
                    </el-button>

                    <div v-if="filterButton" class="bu-pb-3">
                        <div class="text-smallish font-weight-bold bu-mt-4 bu-mb-2" v-if="filterButton" data-test-id="filter-label">
                            {{ i18n('alerts.filter') }}
                        </div>

                        <div class="bu-is-flex" v-if="drawerScope.editedObject.alertDataType === 'events'" data-test-id="alert-data-filter-key-events-label">
                            <div class="bu-is-flex-grow-1">
                                <cly-select-x
                                    test-id="alert-data-filter-key-event-select"
                                    v-model="alertDataFilterKey"
                                    class="bu-is-flex"
                                    :options="alertDataFilterKeyOptions" />
                            </div>
                            <span class="bu-mx-3" style="line-height: 30px" data-test-id="is-label">is</span>
                            <div class="bu-is-flex-grow-1">
                                <el-input
                                    test-id="alert-data-filter-value-input"
                                    v-model="alertDataFilterValue"
                                    class="bu-is-flex"
                                    :placeholder="i18n('alerts.segment-value')" />
                            </div>
                            <div class="cly-icon-button cly-icon-button--gray" @click="handleFilterClosing" data-test-id="filter-close-icon">
                                <i class="el-icon-close"></i>
                            </div>
                        </div>

                        <div class="bu-is-flex bu-mb-3" v-else-if="drawerScope.editedObject.alertDataType === 'rating'" data-test-id="alert-data-filter-key-rating-label">
                            <div class="bu-is-flex-grow-1">
                                <el-input
                                    test-id="alert-data-filter-key-rating-input"
                                    v-model="alertDataFilterKey"
                                    class="bu-is-flex filter-key-input"
                                    :disabled="true" />
                            </div>
                            <span class="bu-mx-2" style="line-height: 30px" data-test-id="is-label">is</span>
                            <div class="bu-is-flex-grow-1">
                                <cly-select-x
                                    test-id="alert-data-filter-key-rating-select"
                                    width="286"
                                    :collapse-tags="false"
                                    v-if="Array.isArray(alertDataFilterValue)"
                                    v-model="alertDataFilterValue"
                                    class="bu-is-flex"
                                    :options="alertDataFilterValueOptions"
                                    mode="multi-check" />
                            </div>
                            <div class="cly-icon-button cly-icon-button--gray" @click="handleFilterClosing" data-test-id="filter-close-icon">
                                <i class="el-icon-close"></i>
                            </div>
                        </div>

                        <div class="bu-is-flex bu-my-3" v-else-if="drawerScope.editedObject.alertDataType === 'nps'" data-test-id="alert-data-filter-key-nps-label">
                            <div class="bu-is-flex-grow-1">
                                <el-input
                                    test-id="alert-data-filter-key-nps-input"
                                    v-model="alertDataFilterKey"
                                    :disabled="true"
                                    class="bu-is-flex filter-key-input"
                                    :options="alertDataFilterKeyOptions" />
                            </div>
                            <span class="bu-mx-3" style="line-height: 30px" data-test-id="is-label">is</span>
                            <div class="bu-is-flex-grow-1">
                                <cly-select-x
                                    width="282"
                                    test-id="alert-data-filter-key-nps-select"
                                    v-model="alertDataFilterValue"
                                    class="bu-is-flex"
                                    :options="alertDataFilterValueOptions"
                                    mode="single-list" />
                            </div>
                            <div class="cly-icon-button cly-icon-button--gray" @click="handleFilterClosing" data-test-id="nps-close-icon">
                                <i class="el-icon-close"></i>
                            </div>
                        </div>

                        <div class="bu-is-flex bu-my-3" v-else-if="drawerScope.editedObject.alertDataType === 'crashes'" data-test-id="alert-data-filter-key-crashes-label">
                            <div class="bu-is-flex-grow-1">
                                <el-input
                                    test-id="alert-data-filter-key-crashes-input"
                                    v-model="alertDataFilterKey"
                                    :disabled="true"
                                    class="bu-is-flex filter-key-input"
                                    :options="alertDataFilterKeyOptions" />
                            </div>
                            <span class="bu-mx-3" style="line-height: 30px" data-test-id="is-label">is</span>
                            <div class="bu-is-flex-grow-1">
                                <cly-select-x
                                    :collapse-tags="false"
                                    test-id="alert-data-filter-key-crashes-select"
                                    v-if="Array.isArray(alertDataFilterValue)"
                                    v-model="alertDataFilterValue"
                                    class="bu-is-flex"
                                    :options="alertDataFilterValueOptions"
                                    mode="multi-check" />
                            </div>
                            <div class="cly-icon-button cly-icon-button--gray" @click="handleFilterClosing" data-test-id="filter-close-icon">
                                <i class="el-icon-close"></i>
                            </div>
                        </div>
                    </div>

                    <div class="cly-vue-alert-drawer__line"></div>

                    <div class="text-medium text-heading bu-has-background-white" style="font-size:13px; margin-top: 32px" data-test-id="trigger-label">
                        {{ i18n('alert.Alert_Trigger') }}
                    </div>

                    <validation-observer v-slot="validObserver">
                        <div :key="drawerScope.editedObject.alertDataType" v-if="drawerScope.editedObject.alertDataType" class="cly-vue-alert-drawer__card alert-trigger">
                            <div class="bu-px-4" v-if="showSubType1">
                                <span class="groupcard-text mediumtextNormal-20px" v-if="isCompareTypeSelectAvailable" data-test-id="trigger-send-alert-if-label">
                                    Send alert if
                                </span>
                                <span class="groupcard-text mediumtextNormal-14px" data-test-id="send-alert-if-there-is-a-label" v-else>
                                    Send alert if there is a
                                </span>

                                <cly-form-field rules="required" style="display:inline-block">
                                    <cly-select-x
                                        width="auto"
                                        :arrow="false"
                                        ref="alertDataSubTypeSelect"
                                        :style="{width: calculateWidth(drawerScope.editedObject.alertDataSubType) + 'px', fontWeight: '600'}"
                                        data-test-id="trigger-metric-select"
                                        :class="{
                                            'alert-drawer-trigger-select-and-input metric': true,
                                            'alert-drawer-trigger-select-active': !!drawerScope.editedObject.alertDataSubType
                                        }"
                                        v-model="drawerScope.editedObject.alertDataSubType"
                                        :options="alertDataSubTypeOptions"
                                        placeholder="metric">
                                    </cly-select-x>
                                </cly-form-field>

                                <span class="groupcard-text mediumtextNormal-14px" v-if="isCompareTypeSelectAvailable" data-test-id="trigger-is-label">
                                    is
                                </span>

                                <cly-form-field rules="required" style="display:inline-block" v-if="isCompareTypeSelectAvailable">
                                    <cly-select-x
                                        test-id="trigger-variable-select"
                                        width="auto"
                                        :arrow="false"
                                        ref="alertDataSubTypeSelect"
                                        :style="{width: calculateWidth(drawerScope.editedObject.compareType) + 'px', fontWeight: '600'}"
                                        :class="{
                                            'alert-drawer-trigger-select-and-input variable': true,
                                            'alert-drawer-trigger-select-active': !!drawerScope.editedObject.compareType
                                        }"
                                        v-model="drawerScope.editedObject.compareType"
                                        :options="alertDataVariableOptions"
                                        placeholder="variable">
                                    </cly-select-x>
                                </cly-form-field>

                                <span class="groupcard-text mediumtextNormal-14px" v-if="isCompareTypeSelectAvailable" data-test-id="trigger-by-label">
                                    {{ drawerScope.editedObject.compareType === "more" || drawerScope.editedObject.compareType === "less" ? "than" : "by" }}
                                </span>

                                <cly-form-field rules="required" style="display:inline-block" v-if="isCompareTypeSelectAvailable">
                                    <input
                                        data-test-id="trigger-value-input"
                                        @input="handleChange($event.target)"
                                        class="alert-drawer-trigger-select-and-input alert-drawer-trigger-input no-spinner"
                                        placeholder="value"
                                        type="number"
                                        v-model="drawerScope.editedObject.compareValue"
                                        @keypress="isNumberKeyPressEvent($event)" />
                                </cly-form-field>

                                <span class="groupcard-text mediumtextNormal-14px" v-if="isCompareTypeSelectAvailable" data-test-id="trigger-percentage-label">
                                    {{ drawerScope.editedObject.compareType === "more" || drawerScope.editedObject.compareType === "less" ? "" : "%" }}
                                </span>

                                <span class="groupcard-text mediumtextNormal-14px"
                                    v-if="(isPeriodSelectAvailable || drawerScope.editedObject.alertDataSubType === 't')" data-test-id="trigger-in-the-last-label">
                                    in the last
                                </span>

                                <cly-form-field v-if="isPeriodSelectAvailable && drawerScope.editedObject.alertDataSubType !== 't'" rules="required" style="display:inline-block">
                                    <cly-select-x
                                        width="auto"
                                        test-id="trigger-time-select"
                                        :arrow="false"
                                        ref="alertDataSubTypeSelect"
                                        :style="{width: calculateWidth(drawerScope.editedObject.period) + 'px'}"
                                        :class="{
                                            'alert-drawer-trigger-select-and-input time': true,
                                            'alert-drawer-trigger-select-active': !!drawerScope.editedObject.period
                                        }"
                                        v-model="drawerScope.editedObject.period"
                                        v-tooltip="{ content: periodTooltipReminder }"
                                        :options="alertTimeOptions"
                                        placeholder="time">
                                    </cly-select-x>
                                </cly-form-field>

                                <cly-form-field name="alertInterval" :rules="alertIntervalValidationRules" style="display:inline-block" v-if="drawerScope.editedObject.alertDataSubType === 't'">
                                    <input
                                        @input="handleChange($event.target)"
                                        class="alert-drawer-trigger-select-and-input alert-drawer-trigger-input"
                                        placeholder="value"
                                        type="number"
                                        min="1"
                                        @keypress="isNumberKeyPressEvent($event)"
                                        v-model="drawerScope.editedObject.compareValue2" />
                                </cly-form-field>

                                <span class="groupcard-text mediumtextNormal-14px" v-if="drawerScope.editedObject.alertDataSubType === 't'">
                                    minutes
                                </span>
                                <span class="groupcard-text mediumtextNormal-14px" data-test-id="trigger-dot-label">.</span>
                            </div>
                        </div>

                        <div v-else class="bu-py-4 cly-vue-alert-drawer__card alert-trigger">
                            <span class="groupcard-text mediumtextNormal-20px" data-test-id="trigger-send-alert-if-label">
                                Send alert if
                            </span>
                            <cly-select-x
                                test-id="trigger-metric-select"
                                :arrow="false"
                                width="auto"
                                class="alert-drawer-trigger-select-and-input metric"
                                placeholder="metric">
                            </cly-select-x>
                            <span class="groupcard-text mediumtextNormal-14px" data-test-id="trigger-is-label">
                                is
                            </span>
                            <cly-select-x
                                test-id="trigger-variable-select"
                                :arrow="false"
                                width="auto"
                                class="alert-drawer-trigger-select-and-input variable"
                                placeholder="variable">
                            </cly-select-x>
                            <span class="groupcard-text mediumtextNormal-14px" data-test-id="trigger-by-label">
                                by
                            </span>
                            <input
                                data-test-id="trigger-value-input"
                                @input="handleChange($event.target)"
                                class="alert-drawer-trigger-select-and-input alert-drawer-trigger-input"
                                placeholder="value"
                                type="text"
                                @keypress="isNumberKeyPressEvent($event)" />
                            <span class="groupcard-text mediumtextNormal-14px" data-test-id="trigger-in-the-last-label">
                                in the last
                            </span>
                            <cly-select-x
                                test-id="trigger-time-select"
                                :arrow="false"
                                width="auto"
                                class="alert-drawer-trigger-select-and-input time"
                                placeholder="time">
                            </cly-select-x>
                            <span class="groupcard-text mediumtextNormal-14px" data-test-id="trigger-dot-label">.</span>
                        </div>

                        <div v-if="validObserver.errors.alertInterval && validObserver.errors.alertInterval.length > 0" class="text-small color-red-100 bu-pt-1">
                            <div v-for="alert in validObserver.errors.alertInterval" :key="alert">{{ alert }}</div>
                        </div>
                    </validation-observer>

                    <div class="bu-pt-2 bu-pb-3" v-if="drawerScope.editedObject.alertDataSubType === 'new survey response'">
                        <span>
                            <i class="cly-is cly-is-information-circle color-cool-gray-40 alert-drawer-inline-icon" style="line-height:16px;"></i>
                            <div class="text-small color-cool-gray-50 alert-drawer-inline-icon">
                                {{ i18n('alerts.common-icon-info') }}
                            </div>
                        </span>
                    </div>

                    <div class="bu-pt-2 bu-pb-3" v-if="drawerScope.editedObject.alertDataSubType === 'new rating response'">
                        <span>
                            <i class="cly-is cly-is-information-circle color-cool-gray-40 alert-drawer-inline-icon" style="line-height:16px;"></i>
                            <div class="text-small color-cool-gray-50 alert-drawer-inline-icon">
                                {{ i18n('alerts.common-icon-info') }}
                            </div>
                        </span>
                    </div>

                    <div class="bu-pt-2 bu-pb-3" v-if="drawerScope.editedObject.alertDataSubType === 'new NPS response'">
                        <span>
                            <i class="cly-is cly-is-information-circle color-cool-gray-40 alert-drawer-inline-icon" style="line-height:16px;"></i>
                            <div class="text-small color-cool-gray-50 alert-drawer-inline-icon">
                                {{ i18n('alerts.common-icon-info') }}
                            </div>
                        </span>
                    </div>

                    <div class="bu-pt-2 bu-pb-3" v-if="drawerScope.editedObject.alertDataSubType === 'new crash/error'">
                        <span>
                            <i class="cly-is cly-is-information-circle color-cool-gray-40 alert-drawer-inline-icon" style="line-height:16px;"></i>
                            <div class="text-small color-cool-gray-50 alert-drawer-inline-icon">
                                {{ i18n('alerts.crashes-icon') }}
                            </div>
                        </span>
                    </div>

                    <div class="cly-vue-alert-drawer__line"></div>

                    <cly-form-field class="bu-pb-0">
                        <div class="text-big text-heading bu-mb-2 cly-alert-email-header" data-test-id="email-notification-label">
                            {{ i18n('alert.email-header') }}
                        </div>

                        <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned bu-mt-0">
                            <el-radio
                                :test-id="'email-notification-' + item.value.toLowerCase()"
                                v-model="selectedRadioButton"
                                :label="item.value"
                                :key="idx"
                                v-for="(item, idx) in filteredEmailOptions"
                                class="is-autosized"
                                border>
                                {{ item.label }}
                            </el-radio>
                        </div>
                    </cly-form-field>

                    <cly-form-field
                        test-id="enter-email-address"
                        v-if="selectedRadioButton === 'specificAddress'"
                        class="first-two-button-element"
                        name="alertValues"
                        rules="required">
                        <cly-select-email
                            test-id="email-address-select"
                            placeholder="Enter email address"
                            v-model="drawerScope.editedObject.alertValues"
                            :collapse-tags="false"
                            :showError="false">
                        </cly-select-email>
                    </cly-form-field>

                    <cly-form-field
                        test-id="choose-users"
                        v-if="selectedRadioButton === 'toGroup'"
                        class="first-two-button-element"
                        name="allGroups"
                        rules="required">
                        <el-select
                            test-id="choose-users"
                            :key="elSelectKey"
                            multiple
                            :collapse-tags="false"
                            v-model="drawerScope.editedObject.allGroups"
                            style="width: 100%;">
                            <el-option
                                v-for="(item) in allGroups"
                                :value="item.value"
                                :label="item.name"
                                :key="item.value">
                            </el-option>
                        </el-select>
                    </cly-form-field>

                    <cly-form-field
                        class="bu-pt-2 bu-pb-3"
                        test-id="do-not-send"
                        v-if="selectedRadioButton === 'dontSend'"
                        name="alertBy"
                        v-model="drawerScope.editedObject.alertBy='hook'">
                        <div>
                            <span>
                                <i class="cly-is cly-is-information-circle color-cool-gray-40 alert-drawer-inline-icon" style="line-height:16px;"></i>
                                <div class="text-small color-cool-gray-50 alert-drawer-inline-icon" data-test-id="set-the-user-group-permissions-tooltip">
                                    {{ i18n('alerts.email-icon1') }}
                                    <div class="text-small color-cool-gray-50 alert-drawer-inline-icon">
                                        <a class="bu-is-underlined" href="#/manage/hooks" target="_blank">Hooks</a>
                                        {{ i18n('alerts.email-icon2') }}
                                    </div>
                                </div>
                            </span>
                        </div>
                    </cly-form-field>
                </cly-form-step>
            </template>
        </cly-drawer>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import countlyAlerts from '../store/index.js';
import jQuery from 'jquery';
import _ from 'underscore';
import * as VeeValidate from 'vee-validate';

var groupsModelRef = null;
var groupsModelPromise = import('../../../../groups/frontend/public/store/index.js')
    .then(function(mod) { groupsModelRef = mod.default; return mod.default; })
    .catch(function() { return null; });

VeeValidate.extend('alert_interval', function(inpValue, args) {
    var min = parseInt(args[0] || 0, 10);
    var max = parseInt(args[1] || 60, 10);
    var valid = parseInt(inpValue, 10) >= min && inpValue <= max;

    if (valid) {
        return { valid: valid };
    }

    return 'Alert interval has to be between ' + min + ' and ' + max;
});

export default {
    mixins: [
        countlyVue.mixins.i18n,
        dataMixin({
            externalDataTypeOptions: "/alerts/data-type",
            externalAlertDefine: "/alerts/data-define",
        }),
    ],
    props: {
        placeholder: { type: String, default: "Select" },
        controls: {
            type: Object,
        },
    },
    data: function() {
        return {
            selectedRadioButton: "specificAddress",
            newVariable: null,
            allGroups: [],
            allUserGroups: [],
            title: "",
            saveButtonLabel: "",
            apps: [""],
            allowAll: false,
            filterButton: false,
            showSubType1: true,
            showSubType2: false,
            showCondition: true,
            showConditionValue: true,
            alertDataSubType2Options: [],
            alertDataFilterKeyOptions: [],
            alertDataFilterValueOptions: [],
            alertDataFilterObject: null,
            alertDataFilterKey: null,
            alertDataFilterValue: null,
            eventTargets: [],
            metricTargets: [],
            defaultAlertDefine: {
                events: {
                    target: [
                        { value: "count", label: jQuery.i18n.map["alert.count"] || "count" },
                        { value: "sum", label: jQuery.i18n.map["alert.sum"] || "sum" },
                        { value: "duration", label: jQuery.i18n.map["alert.duration"] || "duration" },
                        { value: "average sum", label: jQuery.i18n.map["alert.average-sum"] || "average sum" },
                        { value: "average duration", label: jQuery.i18n.map["alert.average-duration"] || "average duration" },
                    ],
                },
                views: {
                    target: [
                        { value: "bounce rate", label: jQuery.i18n.map["alert.bounce-rate"] || "bounce rate" },
                        { value: "# of page views", label: jQuery.i18n.map["alert.page-views"] || "# of page views" },
                    ],
                },
                sessions: {
                    target: [
                        { value: "average session duration", label: jQuery.i18n.map["alert.average-session-duration"] || "average session duration" },
                        { value: "# of sessions", label: jQuery.i18n.map["alert.sessions-count"] || "# of sessions" },
                    ],
                },
                users: {
                    target: [
                        { value: "# of users", label: jQuery.i18n.map["alert.users-count"] || "# of users" },
                        { value: "# of new users", label: jQuery.i18n.map["alert.new-users-count"] || "# of new users" },
                    ],
                },
                crashes: {
                    target: [
                        { value: "# of crashes/errors", label: jQuery.i18n.map["alert.crashes-count"] || "# of crashes/errors" },
                        { value: "non-fatal crashes/errors per session", label: jQuery.i18n.map["alert.non-fatal-crashes"] || "non-fatal crashes/errors per session" },
                        { value: "fatal crashes/errors per session", label: jQuery.i18n.map["alert.fatal-crashes"] || "fatal crashes/errors per session" },
                        { value: "new crash/error", label: jQuery.i18n.map["alert.new-crash"] || "new crash/error" },
                    ],
                },
                survey: {
                    target: [
                        { value: "# of survey responses", label: jQuery.i18n.map["alert.survey-responses-count"] || "# of survey responses" },
                        { value: "new survey response", label: jQuery.i18n.map["alert.new-survey-response"] || "new survey response" },
                    ],
                },
                nps: {
                    target: [
                        { value: "# of responses", label: jQuery.i18n.map["alert.nps-responses-count"] || "# of responses" },
                        { value: "new NPS response", label: jQuery.i18n.map["alert.new-nps-response"] || "new NPS response" },
                    ],
                },
                rating: {
                    target: [
                        { value: "# of responses", label: jQuery.i18n.map["alert.rating-responses-count"] || "# of responses" },
                        { value: "new rating response", label: jQuery.i18n.map["alert.new-rating-response"] || "new rating response" },
                    ],
                },
                dataPoints: {
                    target: [
                        { value: "total data points", label: jQuery.i18n.map["alert.total-data-points"] || "total data points" },
                    ],
                },
                onlineUsers: {
                    target: [
                        { value: "t", label: jQuery.i18n.map["alert.online-users-count"] || "# of online users" },
                        { value: "o", label: jQuery.i18n.map["alert.overall-record"] || "overall record" },
                        { value: "m", label: jQuery.i18n.map["alert.30day-record"] || "30-day record" },
                    ],
                },
                cohorts: {
                    target: [
                        { value: "# of users in the cohort", label: jQuery.i18n.map["alert.cohort-users-count"] || "# of users in the cohort" },
                    ],
                },
                profile_groups: {
                    target: [
                        { value: "# of users in the profile group", label: jQuery.i18n.map["alert.profile-group-users-count"] || "# of users in the profile group" },
                    ],
                },
                revenue: {
                    target: [
                        { value: "total revenue", label: jQuery.i18n.map["alert.total-revenue"] || "total revenue" },
                        { value: "average revenue per user", label: jQuery.i18n.map["alert.average-revenue-per-user"] || "average revenue per user" },
                        { value: "average revenue per paying user", label: jQuery.i18n.map["alert.average-revenue-per-paying-user"] || "average revenue per paying user" },
                        { value: "# of paying users", label: jQuery.i18n.map["alert.paying-users-count"] || "# of paying users" },
                    ],
                },
            },
            emailOptions: [
                { label: jQuery.i18n.map["alert.email-to-specific-address"], value: "specificAddress" },
                { label: jQuery.i18n.map["alert.email-to-group"], value: "toGroup" },
                { label: jQuery.i18n.map["alert.email-to-dont-send"], value: "dontSend" },
            ],
            defaultAlertVariable: {
                condition: [
                    { label: "decreased", value: "decreased" },
                    { label: "increased", value: "increased" },
                    { label: "more", value: "more" },
                ],
            },
            onlineUsersAlertVariable: {
                condition: [
                    { label: "more", value: "more" },
                    { label: "less", value: "less" },
                ],
            },
            defaultAlertTime: {
                time: [
                    { label: "month", value: "monthly" },
                    { label: "day", value: "daily" },
                    { label: "hour", value: "hourly" },
                ],
            },
        };
    },
    watch: {
        selectedRadioButton(newValue) {
            if (newValue === "specificAddress") {
                this.$refs.drawerData.editedObject.allGroups = [];
                this.$refs.drawerData.editedObject.alertBy = "email";
            }
            if (newValue === "toGroup") {
                this.$refs.drawerData.editedObject.alertValues = [];
                this.$refs.drawerData.editedObject.alertBy = "email";
            }
            if (newValue === "dontSend") {
                this.$refs.drawerData.editedObject.alertValues = [];
                this.$refs.drawerData.editedObject.allGroups = [];
            }
        },
    },
    computed: {
        isCompareTypeSelectAvailable: function() {
            const disabledMetrics = [
                "new survey response",
                "new NPS response",
                "new rating response",
                "new crash/error",
                "o",
                "m",
            ];
            if (this.$refs.drawerData.editedObject.alertDataType === "crashes" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) {
                return false;
            }
            if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                return false;
            }
            return true;
        },
        isPeriodSelectAvailable: function() {
            const disabledMetrics = [
                "new survey response",
                "new NPS response",
                "new rating response",
                "new crash/error",
                "o",
                "m",
            ];
            if (this.$refs.drawerData.editedObject.alertDataType === "crashes" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) {
                return false;
            }
            if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                return false;
            }
            return true;
        },
        alertTimeOptions() {
            if (
                (this.$refs.drawerData.editedObject.alertDataType === "rating" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) ||
                (this.$refs.drawerData.editedObject.alertDataType === "events" && (this.alertDataFilterValue)) ||
                (this.$refs.drawerData.editedObject.alertDataType === "nps" && ((typeof this.alertDataFilterValue) === "string")) ||
                (this.$refs.drawerData.editedObject.alertDataType === "events" && this.filterButton)
            ) {
                return this.defaultAlertTime.time.filter((periodItem) => periodItem.value !== "hourly");
            }
            else {
                return this.defaultAlertTime.time;
            }
        },
        alertDataTypeOptions: function() {
            var alertDataTypeOptions = [
                { label: jQuery.i18n.map["alert.Crash"], value: "crashes" },
                { label: jQuery.i18n.map["alert.Cohorts"], value: "cohorts" },
                { label: jQuery.i18n.map["alert.Data-points"], value: "dataPoints" },
                { label: jQuery.i18n.map["alert.Event"], value: "events" },
                { label: jQuery.i18n.map["alert.NPS"], value: "nps" },
                { label: jQuery.i18n.map["alert.Online-users"], value: "onlineUsers" },
                { label: jQuery.i18n.map["alert.Profile-groups"], value: "profile_groups" },
                { label: jQuery.i18n.map["alert.Rating"], value: "rating" },
                { label: jQuery.i18n.map["alert.Revenue"], value: "revenue" },
                { label: jQuery.i18n.map["alert.Session"], value: "sessions" },
                { label: jQuery.i18n.map["alert.Survey"], value: "survey" },
                { label: jQuery.i18n.map["alert.User"], value: "users" },
                { label: jQuery.i18n.map["alert.View"], value: "views" },
            ];

            if (!countlyGlobal.plugins.includes("concurrent_users")) {
                alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "onlineUsers");
            }
            if (!countlyGlobal.plugins.includes("surveys")) {
                alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "survey" && value !== "nps");
            }
            if (!countlyGlobal.plugins.includes("revenue")) {
                alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "revenue");
            }
            if (!countlyGlobal.plugins.includes("cohorts")) {
                alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "cohorts" && value !== "profile_groups");
            }
            if (!countlyGlobal.plugins.includes("users")) {
                alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "users");
            }
            return alertDataTypeOptions;
        },
        alertDefine: function() {
            var allOptions = JSON.parse(JSON.stringify(this.defaultAlertDefine));
            this.externalAlertDefine.forEach(function(define) {
                allOptions = Object.assign(allOptions, define);
            });
            return allOptions;
        },
        alertDataSubTypeOptions: function() {
            var alertDataSubTypeOptions;
            if (this.$refs.drawerData.editedObject.alertDataType) {
                alertDataSubTypeOptions = this.alertDefine[this.$refs.drawerData.editedObject.alertDataType].target;
            }
            return alertDataSubTypeOptions;
        },
        alertDataVariableOptions: function() {
            var alertDataVariableOptions;
            if (this.$refs.drawerData.editedObject.alertDataType === "onlineUsers") {
                alertDataVariableOptions = this.onlineUsersAlertVariable.condition;
            }
            else {
                alertDataVariableOptions = this.defaultAlertVariable.condition;
            }
            return alertDataVariableOptions;
        },
        elSelectKey: function() {
            var key = this.allGroups.map(function(g) {
                return g.name;
            }).join(",");
            return key;
        },
        periodTooltipReminder: function() {
            if (this.$refs.drawerData.editedObject.period === "hourly") {
                return jQuery.i18n.map["alerts.period-select-reminder-hourly"];
            }
            else if (this.$refs.drawerData.editedObject.period === "daily") {
                return jQuery.i18n.map["alerts.period-select-reminder-daily"];
            }
            else {
                return;
            }
        },
        filteredEmailOptions: function() {
            if (!countlyGlobal.plugins.includes("groups")) {
                return this.emailOptions.filter((option) => option.value !== "toGroup");
            }
            return this.emailOptions;
        },
        alertIntervalValidationRules: function() {
            var rule = 'required';

            if (this.$refs.drawerData.editedObject.alertDataType === 'onlineUsers') {
                var countlyPlugins = window.countlyPlugins || {};
                var concurrentUserConfig = (countlyPlugins.getConfigsData && countlyPlugins.getConfigsData().concurrent_users) || {};
                var concurrentAlertIntervalMin = concurrentUserConfig.alert_interval || 3;
                var concurrentAlertIntervalMax = Math.min(concurrentAlertIntervalMin + 60, 90);

                rule += '|alert_interval:' + concurrentAlertIntervalMin + ',' + concurrentAlertIntervalMax;
            }

            return rule;
        },
    },
    mounted: function() {
        var self = this;
        if (countlyGlobal.plugins.includes("groups")) {
            groupsModelPromise.then(function(groupsModel) {
                if (!groupsModel) return;
                groupsModel.initialize().then(function() {
                    var groups = _.sortBy(groupsModel.data(), "name");
                    var userGroups = groups.map(function(g) {
                        return {
                            name: g.name,
                            value: g._id,
                            users: g.users,
                        };
                    });
                    self.allGroups = userGroups;
                });
            });
        }
    },
    methods: {
        i18n: i18n,
        subType2Label: function(obj) {
            switch (obj.alertDataType) {
            case "events":
                return "Event";
            case "views":
                return "View";
            case "cohorts":
                return "Cohort";
            case "profile_groups":
                return "Profile Group";
            case "survey":
                return "Widget Name";
            case "nps":
                return "Widget Name";
            case "rating":
                return "Widget Name";
            }
        },
        showFilterButton: function(obj) {
            switch (obj.alertDataType) {
            case "events":
                return true;
            case "crashes":
                return true;
            case "nps":
                return true;
            case "rating":
                return true;
            }
        },
        getMetrics: function() {
            const formData = this.$refs.drawerData.editedObject;
            this.alertDataSubType2Options = [];
            if (formData.selectedApps === 'all') {
                formData.alertDataType = 'dataPoints';
                formData.alertDataSubType = 'total data points';
            }
            if (!formData.selectedApps) {
                return;
            }
            if (formData.alertDataType === "views") {
                countlyAlerts.getViewForApp(formData.selectedApps, (viewList) => {
                    this.alertDataSubType2Options = viewList.map((v) => {
                        return { value: v.value, label: countlyCommon.unescapeHtml(v.name) };
                    });
                });
            }
            if (formData.alertDataType === "events") {
                countlyAlerts.getEventsForApp(formData.selectedApps, ({ events, segments }) => {
                    this.alertDataSubType2Options = events.map((e) => {
                        return { value: e.value, label: countlyCommon.unescapeHtml(e.name) };
                    });
                    this.alertDataFilterObject = segments;
                });
            }
            if (formData.alertDataType === "cohorts") {
                countlyAlerts.getCohortsForApp(formData.selectedApps, (data) => {
                    var filtered = data.filter(function(c) {
                        return c.type !== "manual";
                    });
                    this.alertDataSubType2Options = filtered.map((c) => {
                        return { value: c._id, label: countlyCommon.unescapeHtml(c.name) };
                    });
                });
            }
            if (formData.alertDataType === "profile_groups") {
                countlyAlerts.getCohortsForApp(formData.selectedApps, (data) => {
                    var filtered = data.filter(function(c) {
                        return c.type === "manual";
                    });
                    this.alertDataSubType2Options = filtered.map((c) => {
                        return { value: c._id, label: countlyCommon.unescapeHtml(c.name) };
                    });
                });
            }
            if (formData.alertDataType === "survey") {
                countlyAlerts.getSurveysForApp(formData.selectedApps, (data) => {
                    this.alertDataSubType2Options = data.filter(s => s.status).map((s) => {
                        return { value: s._id, label: countlyCommon.unescapeHtml(s.name) };
                    });
                });
            }
            if (formData.alertDataType === "nps") {
                countlyAlerts.getNPSForApp(formData.selectedApps, (data) => {
                    this.alertDataSubType2Options = data.filter(n => n.status).map((n) => {
                        return { value: n._id, label: countlyCommon.unescapeHtml(n.name) };
                    });
                });
            }
            if (formData.alertDataType === "rating") {
                countlyAlerts.getRatingForApp(formData.selectedApps, (data) => {
                    this.alertDataSubType2Options = data.filter(r => r.is_active === 'true').map((r) => {
                        return { value: r._id, label: countlyCommon.unescapeHtml(r.popup_header_text) };
                    });
                });
            }
        },
        appSelected: function() {
            this.resetAlertCondition();
            this.getMetrics();
        },
        dataTypeSelected: function(val) {
            this.resetAlertCondition(1);
            this.resetAlertConditionShow();
            this.resetFilterCondition();
            this.getMetrics();
            if (val === "crashes" || val === "rating" || val === "nps") {
                this.setFilterValueOptions();
            }

            var validDataTypesForSubType2 = ["events", "views", "cohorts", "profile_groups", "survey", "nps", "rating"];
            if (validDataTypesForSubType2.includes(val)) {
                this.showSubType2 = true;
            }
            else {
                this.showSubType2 = false;
            }

            if (val === "dataPoint" && countlyGlobal.member.global_admin === true) {
                this.allowAll = true;
            }
            if (val === "onlineUsers") {
                this.showSubType2 = false;
                this.showCondition = false;
                this.showConditionValue = false;
            }
        },
        setFilterKeyOptions: function() {
            const formData = this.$refs.drawerData.editedObject;
            if (!formData.selectedApps) {
                return;
            }
            if (formData.alertDataType === "events") {
                if (formData.alertDataSubType2 && this.alertDataFilterObject) {
                    const options = this.alertDataFilterObject[formData.alertDataSubType2];
                    if (Array.isArray(options)) {
                        this.alertDataFilterKeyOptions = options.filter((a) => a).map((a) => ({ label: a, value: a }));
                    }
                }
            }
        },
        setFilterValueOptions: function() {
            const formData = this.$refs.drawerData.editedObject;
            if (!formData.selectedApps) {
                return;
            }
            if (formData.alertDataType === "crashes") {
                this.alertDataFilterValue = [];
                this.alertDataFilterKey = "App Version";
                countlyAlerts.getCrashesForFilter(formData.selectedApps, (data) => {
                    const app_version = Object.keys(data);
                    if (Array.isArray(app_version)) {
                        this.alertDataFilterValueOptions = app_version.filter((a) => a).map((a) => ({
                            label: a.replace(/:/g, "."),
                            value: a,
                        }));
                    }
                });
            }
            if (formData.alertDataType === "rating") {
                this.alertDataFilterValue = [];
                this.alertDataFilterKey = "Rating";
                this.alertDataFilterValueOptions = [
                    { label: "1", value: "1" },
                    { label: "2", value: "2" },
                    { label: "3", value: "3" },
                    { label: "4", value: "4" },
                    { label: "5", value: "5" },
                ];
            }
            if (formData.alertDataType === "nps") {
                this.alertDataFilterValue = "";
                this.alertDataFilterKey = "NPS scale";
                this.alertDataFilterValueOptions = [
                    { label: "detractor", value: "detractor" },
                    { label: "passive", value: "passive" },
                    { label: "promoter", value: "promoter" },
                ];
            }
        },
        subType2Padding: function(obj) {
            if (this.showFilterButton(obj) && !this.showFilter) {
                return "bu-pb-2";
            }
        },
        dataTypeIcons: function(dataType) {
            switch (dataType) {
            case "crashes":
                return "cly-io-16 cly-is cly-is-crashes";
            case "cohorts":
                return "cly-io-16 cly-io cly-io-cohorts";
            case "dataPoints":
                return "cly-io-16 cly-is cly-is-punchcard";
            case "events":
                return "cly-io-16 cly-is cly-is-calendar";
            case "nps":
                return "cly-io-16 cly-is cly-is-emoji-happy";
            case "onlineUsers":
                return "cly-io-16 cly-is cly-is-user-circle";
            case "profile_groups":
                return "cly-io-16 cly-is cly-is-user-group";
            case "rating":
                return "cly-io-16 cly-is cly-is-star";
            case "revenue":
                return "cly-io-16 cly-is cly-is-currency-dollar";
            case "sessions":
                return "cly-io-16 cly-is cly-is-clock";
            case "survey":
                return "cly-io-16 cly-is cly-is-clipboard-list";
            case "users":
                return "cly-io-16 cly-is cly-is-users";
            case "views":
                return "cly-io-16 cly-is cly-is-eye";
            }
        },
        handleFilterClosing: function() {
            this.filterButton = false;
            this.resetFilterCondition();
        },
        handleAddFilterButton: function() {
            this.filterButton = true;
            this.setFilterKeyOptions();
            this.setFilterValueOptions();
        },
        resetAlertCondition: function(startFrom = 0) {
            const allFields = [
                "alertDataType",
                "alertDataSubType",
                "alertDataSubType2",
                "compareType",
                "compareValue",
                "period",
                "filterKey",
                "filterValue",
            ];
            const fieldsToReset = allFields.slice(startFrom);
            fieldsToReset.forEach((field) => (this.$refs.drawerData.editedObject[field] = null));

            const inputs = this.$refs.drawerData.$el.querySelectorAll("input");
            inputs.forEach((input) => {
                this.resetColor(input);
            });

            const selects = this.$refs.drawerData.$el.querySelectorAll("select");
            selects.forEach((select) => {
                this.resetColor(select);
            });
        },
        resetAlertConditionShow: function() {
            this.showSubType1 = true;
            this.showSubType2 = false;
            this.showCondition = true;
            this.showConditionValue = true;
            this.filterButton = false;
        },
        resetFilterCondition: function() {
            this.alertDataFilterKeyOptions = [];
            this.alertDataFilterValueOptions = [];
            this.alertDataFilterKey = null;
            this.alertDataFilterValue = null;
        },
        onSubmit: function(settings) {
            settings.selectedApps = [settings.selectedApps];
            if (settings._id) {
                var rows = this.$store.getters["countlyAlerts/table/all"];
                for (var i = 0; i < rows.length; i++) {
                    if (
                        rows[i]._id === settings._id &&
                        (rows[i].alertDataType === "onlineUsers" || settings.alertDataType === "onlineUsers") &&
                        rows[i].alertDataType !== settings.alertDataType
                    ) {
                        if (rows[i].alertDataType !== "onlineUsers") {
                            this.$store.dispatch("countlyAlerts/deleteAlert", rows[i]._id);
                        }
                        else {
                            this.$store.dispatch("countlyAlerts/deleteOnlineUsersAlert", rows[i]);
                        }
                        settings._id = null;
                    }
                }
            }
            const validFilter = (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length) ||
                (!Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue);
            if (validFilter) {
                settings.filterKey = this.alertDataFilterKey;
                settings.filterValue = this.alertDataFilterValue;
            }
            else {
                settings.filterKey = null;
                settings.filterValue = null;
            }

            var target = settings.alertDataSubType;
            var subTarget;
            if (settings.alertDataSubType2) {
                var found = this.alertDataSubType2Options.find(({ value }) => value === settings.alertDataSubType2);
                if (found) {
                    subTarget = found.label;
                }
            }

            var describePeriod;
            switch (settings.period) {
            case "hourly":
                describePeriod = "hour";
                break;
            case "daily":
                describePeriod = "day";
                break;
            case "monthly":
                describePeriod = "month";
                break;
            }

            if (!this.isCompareTypeSelectAvailable) {
                settings.compareType = null;
                settings.compareValue = null;
                settings.period = null;
            }

            if (settings.period) {
                if (subTarget) {
                    if (settings.compareType === "more") {
                        settings.compareDescribe = subTarget + " " + target + " is increased more than " + settings.compareValue + " in the last " + describePeriod;
                    }
                    else {
                        settings.compareDescribe = subTarget + " " + target + " " + settings.compareType + " by " + settings.compareValue + " % in the last " + describePeriod;
                    }
                }
                else if (settings.alertDataType === "onlineUsers") {
                    if (target === "# of online users") {
                        settings.compareDescribe = target + " is " + settings.compareType + " than " + settings.compareValue + " in the last" + describePeriod;
                    }
                    else {
                        if (settings.compareType === "more") {
                            settings.compareDescribe = target + " is increased more than " + settings.compareValue + " in the last " + describePeriod;
                        }
                        else {
                            settings.compareDescribe = target + " " + settings.compareType + " by " + settings.compareValue + " % in the last " + describePeriod;
                        }
                    }
                }
                else {
                    if (settings.compareType === "more") {
                        settings.compareDescribe = target + " is increased more than " + settings.compareValue + " in the last " + describePeriod;
                    }
                    else {
                        settings.compareDescribe = target + " " + settings.compareType + " by " + settings.compareValue + " % in the last " + describePeriod;
                    }
                }
            }
            else {
                settings.compareDescribe = target;
            }

            if (settings.alertDataType === "onlineUsers") {
                var config = {
                    app: settings.selectedApps[0],
                    app_name: countlyGlobal.apps[settings.selectedApps[0]].name,
                    name: settings.alertName,
                    type: settings.alertDataSubType,
                    def: settings.compareType,
                    users: parseInt(settings.compareValue, 10),
                    minutes: parseInt(settings.compareValue2, 10),
                    email: settings.alertValues,
                    alertBy: settings.alertBy,
                    allGroups: settings.allGroups,
                    enabled: true,
                };
                if (settings._id) {
                    config._id = settings._id;
                }
                if (config.type === "t") {
                    config.condition_title = jQuery.i18n.prop("concurrent-users.condition-title", config.def, config.users, config.minutes);
                }
                else if (config.type === "o") {
                    config.condition_title = jQuery.i18n.map["concurrent-users.alert-type.overall-title"];
                }
                else if (config.type === "m") {
                    config.condition_title = jQuery.i18n.map["concurrent-users.alert-type.monthly-title"];
                }

                this.$store.dispatch("countlyAlerts/saveOnlineUsersAlert", config);
                this.resetAlertConditionShow();
                return;
            }

            this.$store.dispatch("countlyAlerts/saveAlert", settings).then(() => {
                if (!settings._id) {
                    CountlyHelpers.notify({
                        message: i18n('alerts.create-alert-success'),
                        title: 'Success',
                        type: 'success'
                    });
                }
                else {
                    CountlyHelpers.notify({
                        message: i18n('alerts.update-alert-success'),
                        title: 'Success',
                        type: 'success'
                    });
                }
            }).catch(() => {
                if (!settings._id) {
                    CountlyHelpers.notify({
                        message: i18n('alerts.create-alert-fail'),
                        type: 'error',
                        width: 'large',
                    });
                }
                else {
                    CountlyHelpers.notify({
                        message: i18n('alerts.update-alert-fail'),
                        type: 'error',
                        width: 'large',
                    });
                }
            });
            this.resetAlertConditionShow();
        },
        onClose: function($event) {
            this.$emit("close", $event);
        },
        onCopy: function(newState) {
            this.showSubType1 = true;
            this.showSubType2 = false;
            this.showCondition = false;
            this.showConditionValue = false;
            newState.selectedApps = newState.selectedApps[0];
            newState.alertName = countlyCommon.unescapeHtml(newState.alertName);
            newState.alertValues = newState.alertValues.map((email) => countlyCommon.unescapeHtml(email));
            this.getMetrics();
            this.setFilterKeyOptions();
            this.setFilterValueOptions();
            if (newState._id !== null) {
                this.title = jQuery.i18n.map["alert.Edit_Your_Alert"];
                this.saveButtonLabel = jQuery.i18n.map["alert.save-alert"];
                this.filterButton = Array.isArray(newState.filterValue) ? !!newState.filterValue.length : !!newState.filterValue;
                this.alertDataFilterKey = countlyCommon.unescapeHtml(newState.filterKey);
                this.alertDataFilterValue = countlyCommon.unescapeHtml(newState.filterValue);

                if (newState.alertBy === "email") {
                    if (newState.allGroups?.length) {
                        this.selectedRadioButton = "toGroup";
                    }
                    if (newState.alertValues?.length) {
                        this.selectedRadioButton = "specificAddress";
                    }
                }
                else if (newState.alertBy === "hook") {
                    this.selectedRadioButton = "dontSend";
                }

                return;
            }
            else {
                this.resetAlertConditionShow();
            }
            this.title = jQuery.i18n.map["alert.Create_New_Alert"];
            this.saveButtonLabel = jQuery.i18n.map["alert.save"];
        },
        isNumberKeyPressEvent(evt) {
            evt = (evt) ? evt : window.event;
            var charCode = (evt.which) ? evt.which : evt.keyCode;
            if ((charCode > 31 && (charCode < 48 || charCode > 57)) && charCode !== 46) {
                evt.preventDefault();
            }
            else {
                return true;
            }
        },
        calculateWidth(value) {
            if (!value) {
                return;
            }
            var tmpEl = document.createElement("span");
            tmpEl.textContent = value;
            tmpEl.style.cssText = `
                visibility: hidden;
                position: fixed;
                font-size: 13px;
                font-family: Arial, sans-serif !important;
                box-sizing: border-box;
                font-weight: 600;
                padding: 10px
            `;
            document.body.appendChild(tmpEl);
            var tempSelectWidth = tmpEl.getBoundingClientRect().width;
            tmpEl.remove();
            return tempSelectWidth;
        },
        handleChange(element) {
            this.changeColor(element);
            if (element.nodeName !== "SELECT") {
                return;
            }
        },
        changeColor(element) {
            element.style.backgroundColor = "#E1EFFF";
            element.style.color = "#333C48";
            element.style.fontWeight = "600";
        },
        resetColor(element) {
            element.style.backgroundColor = "";
            element.style.color = "";
        },
    },
};
</script>