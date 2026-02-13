<template>
    <div>
        <div class="cly-vue-drawer-step__section">
            <div class="text-medium text-heading">
            Internal action
            </div>
            <cly-select-x
               placeholder="Select an Internal Action"
               mode="single-list"
               v-model="value.eventType"
               :class="{'cly-vue-hook-drawer__is-full-line':true}"
               :options="internalEventOptions">
            </cly-select-x>

        </div>
        <div class="cly-vue-drawer-step__section" v-if="value.eventType === '/cohort/enter' || value.eventType === '/cohort/exit'">
            <div class="text-medium text-heading">
                Cohort
            </div>
            <validation-provider name="trigger-internal-cohort" rules="required">
            <cly-select-x
               placeholder="Select a Cohort"
               mode="single-list"
               v-model="value.cohortID"
               :class="{'cly-vue-hook-drawer__is-full-line':true}"
               :options="cohortOptions">
            </cly-select-x>
            </validation-provider>
        </div>
        <div class="cly-vue-drawer-step__section" v-if="value.eventType === '/profile-group/enter' || value.eventType === '/profile-group/exit'">
            <div class="text-medium text-heading">
                Profile group
            </div>
            <validation-provider name="trigger-internal-cohort" rules="required">
            <cly-select-x
               placeholder="Select a Profile group"
               mode="single-list"
               v-model="value.cohortID"
               :class="{'cly-vue-hook-drawer__is-full-line':true}"
               :options="groupOptions">
            </cly-select-x>
            </validation-provider>
        </div>
        <div class="cly-vue-drawer-step__section" v-if="value.eventType === '/hooks/trigger'">
            <div class="text-medium text-heading">
              Hook
            </div>
            <validation-provider name="trigger-internal-hook" rules="required">
            <cly-select-x
               placeholder="Select a Hook"
               mode="single-list"
               v-model="value.hookID"
               :class="{'cly-vue-hook-drawer__is-full-line':true}"
               :options="hookOptions">
            </cly-select-x>
            </validation-provider>
        </div>
        <div class="cly-vue-drawer-step__section" v-if="value.eventType === '/alerts/trigger'">
            <div class="text-medium text-heading">
              Alert
            </div>
            <validation-provider name="trigger-internal-alert" rules="required">
            <cly-select-x
               placeholder="Select a Alert"
               mode="single-list"
               v-model="value.alertID"
               :class="{'cly-vue-hook-drawer__is-full-line':true}"
               :options="alertOptions">
            </cly-select-x>
            </validation-provider>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import jQuery from 'jquery';
import ClySelectX from '../../../../../../frontend/express/public/javascripts/components/input/select-x.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClySelectX,
    },
    data: function() {
        return {
            internalEventOptions: [
                {value: "/cohort/enter", label: "/cohort/enter"},
                {value: "/cohort/exit", label: "/cohort/exit"},
                {value: "/profile-group/enter", label: "/profile-group/enter"},
                {value: "/profile-group/exit", label: "/profile-group/exit"},
                {value: "/i/app_users/create", label: "/i/app_users/create"},
                {value: "/i/app_users/update", label: "/i/app_users/update"},
                {value: "/i/app_users/delete", label: "/i/app_users/delete"},
                {value: "/i/apps/create", label: "/i/apps/create"},
                {value: "/i/apps/update", label: "/i/apps/update"},
                {value: "/i/apps/delete", label: "/i/apps/delete"},
                {value: "/i/users/create", label: "/i/users/create"},
                {value: "/i/users/update", label: "/i/users/update"},
                {value: "/i/users/delete", label: "/i/users/delete"},
                {value: "/master", label: "/master"},
                {value: "/systemlogs", label: "/systemlogs"},
                {value: "/crashes/new", label: "/crashes/new"},
                {value: "/hooks/trigger", label: "/hooks/trigger"},
                {value: "/i/remote-config/add-parameter", label: "/i/remote-config/add-parameter"},
                {value: "/i/remote-config/update-parameter", label: "/i/remote-config/update-parameter"},
                {value: "/i/remote-config/remove-parameter", label: "/i/remote-config/remove-parameter"},
                {value: "/i/remote-config/add-condition", label: "/i/remote-config/add-condition"},
                {value: "/i/remote-config/update-condition", label: "/i/remote-config/update-condition"},
                {value: "/i/remote-config/remove-condition", label: "/i/remote-config/remove-condition"},
                {value: "/alerts/trigger", label: "/alerts/trigger"}
            ],
            cohortOptions: [],
            groupOptions: [],
            hookOptions: [],
            alertOptions: []
        };
    },
    computed: {
        selectedApp: function() {
            return this.$props.app;
        }
    },
    props: {
        value: {
            type: Object
        },
        app: {
            type: String,
        }
    },
    mounted: function() {
        this.getCohortOptioins();
        this.getHookOptions();
        this.getAlertOptions();
    },
    watch: {
        selectedApp: function() {
            this.getCohortOptioins();
            this.getHookOptions();
            this.getAlertOptions();
        }
    },
    methods: {
        getCohortOptioins: function() {
            var apps = [this.$props.app];
            var data = {
                "app_id": apps[0],
                "method": "get_cohorts",
                "display_loader": false
            };
            var self = this;
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: data,
                dataType: "json",
                success: function(cohorts) {
                    var cohortItems = [];
                    var groupsItems = [];
                    cohorts.forEach(function(c) {
                        if (c.type === 'manual') {
                            groupsItems.push({ value: c._id, label: c.name});
                        }
                        else {
                            cohortItems.push({ value: c._id, label: c.name});
                        }
                    });
                    self.cohortOptions = Object.assign([], cohortItems);
                    self.groupOptions = Object.assign([], groupsItems);
                }
            });
        },
        getHookOptions: function() {
            var self = this;
            var apps = [this.$props.app];
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/hook/list',
                data: {app_id: this.$props.app},
                dataType: "json",
                success: function(data) {
                    var hookList = [];
                    data.hooksList.forEach(function(hook) {
                        if (hook.apps.indexOf(apps[0]) > -1) {
                            hookList.push({value: hook._id, label: hook.name});
                        }
                    });
                    self.hookOptions = hookList;
                }
            });
        },
        getAlertOptions: function() {
            var self = this;
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/alert/list',
                data: {app_id: this.$props.app},
                dataType: "json",
                success: function(data) {
                    if (self.alertOptions.length === 0) {
                        self.alertOptions = data.alertsList.map(({ _id, alertName }) => ({ value: _id, label: alertName }));
                    }
                    else {
                        self.alertOptions = self.alertOptions.concat(data.alertsList.map(({ _id, alertName }) => ({ value: _id, label: alertName })));
                    }
                }
            });
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                dataType: "json",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: "concurrent_alerts",
                    preventGlobalAbort: true,
                },
                success: function(data) {
                    self.alertOptions = self.alertOptions.concat(data.map(item => ({ value: item._id, label: item.name })));
                }
            });
        },
    }
};
</script>
