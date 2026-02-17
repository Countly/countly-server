<template>
    <cly-drawer
        class="cly-vue-report-drawer"
        test-id="reports-drawer"
        @submit="onSubmit"
        @close="onClose"
        @copy="onCopy"
        :title="title"
        :saveButtonLabel="saveButtonLabel"
        v-bind="$props.controls">
        <template v-slot:default="drawerScope">
            <cly-form-step id="reports-drawer-main">

            <cly-form-field name="title" :label="i18n('reports.report_name')" rules="required" test-id="email-report-name">
                <el-input v-model="drawerScope.editedObject.title" :placeholder="i18n('reports.report-name')" test-id="email-report-name-input"></el-input>
            </cly-form-field>

            <cly-form-field name="email" :label="i18n('reports.email-to-receive')" rules="required" test-id="email-to-receive">
                <cly-select-email :collapse-tags="false" v-model="drawerScope.editedObject.emails" test-id="email-to-receive-input"></cly-select-email>
            </cly-form-field>

            <cly-form-field class="bu-py-4 report-type-block">
                <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned">
                    <div class="text-big text-heading bu-mb-3">
                        {{i18n('reports.report-type')}} <span class="ion-help-circled color-cool-gray-50" v-tooltip.top-center="i18n('reports.type-tips')"/>
                    </div>
                </div>
                <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned report-types-block">
                    <el-radio
                        v-on:change="reportTypeChange"
                        class="is-autosized "
                        :test-id="`report-type-${item.value}`"
                        v-model="drawerScope.editedObject.report_type"
                        :label="item.value"
                        :key="idx"
                        v-for="(item, idx) in reportTypeOptions"
                        border
                        >
                        {{item.label}}
                        <div class="text-small">
                            {{item.description}}
                        </div>
                    </el-radio>
                </div>
            </cly-form-field>

            <cly-form-field name="apps" :label="i18n('reports.select-apps')" rules="required" v-if="showApps" test-id="select-apps">
                <cly-app-select
                    :auth='{"feature": "reports", "permission":  drawerScope.editedObject._id ? "u": "c"}'
                    class="bu-is-flex"
                    test-id="select-apps-combobox"
                    :placeholder="i18n('reports.Select_apps')"
                    v-on:change="appsChange"
                    :collapse-tags="false"
                    :multiple="true"
                    v-model="drawerScope.editedObject.apps"
                    multiple>
                </cly-app-select>
            </cly-form-field>

            <cly-form-field name="metrics" :label="i18n('reports.include-metrics')" rules="required" v-if="showMetrics" test-id="select-data">
                <cly-select-x
                    :collapse-tags="false"
                    :placeholder="i18n('reports.Select_metrics')"
                    mode="multi-check"
                    v-model="metricsArray"
                    class="bu-is-flex"
                    test-id="select-metrics-combobox"
                    :options="metricOptions">
                </cly-select-x>
            </cly-form-field>

            <cly-form-field name="select_dashboards" :label="i18n('dashboards.select_dashboards')" rules="required" v-if="showDashboards" test-id="select-dashboards">
                <cly-select-x
                    :placeholder="i18n('dashboards.select')"
                    mode="single-list"
                    v-model="drawerScope.editedObject.dashboards"
                    class="bu-is-flex"
                    test-id="select-dashboards-combobox"
                    :options="dashboardsOptions">
                </cly-select-x>
            </cly-form-field>

            <div class="bu-py-4" v-if="metricsArray && metricsArray.indexOf('events') > -1">
                <div class="text-small bu-pb-1 title text-heading">
                    {{i18n('reports.select-events')}}
                </div>
                <validation-provider name="events" rules="required" v-slot="v">
                    <cly-select-x
                       :placeholder="i18n('reports.select-events')"
                       mode="multi-check"
                       v-model="drawerScope.editedObject.selectedEvents"
                       :maxInputWidth="300"
                       :collapse-tags="true"
                       :class="{'is-error': v.errors.length > 0, 'bu-is-flex':true}"
                       test-id="select-events-combobox"
                       :options="eventOptions">
                    </cly-select-x>
                </validation-provider>
            </div>

            <cly-form-field name="frequency" class="frequency-block" :label="i18n('reports.frequency')" rules="required" test-id="select-frequency">
                <div class="cly-vue-report-drawer__report_description bu-mb-4 text-small  color-cool-gray-50" data-test-id="select-frequency-description-label">
                    {{i18n('reports.frequency-desc')}}
                </div>
                <el-radio
                    v-on:change="reportFrequencyChange"
                    class="is-autosized"
                    test-id="select-frequency-combobox"
                    v-model="drawerScope.editedObject.frequency"
                    :label="item.value"
                    :key="idx"
                    v-for="(item, idx) in frequencyOptions"
                border>
                        <span class="text-medium">{{item.label}}</span>
                        <span class="text-small color-cool-gray-50">{{item.description}}</span>
                </el-radio>
            </cly-form-field>

            <cly-form-field name="select-date-range" :label="i18n('dashboards.select-report-date-range')" rules="required" v-if="showDashboards">
                <cly-select-x
                    :placeholder="i18n('dashboards.select-date-range')"
                    test-id="select-date-range"
                    mode="single-list"
                    v-model="drawerScope.editedObject.date_range"
                    class="bu-is-flex"
                    :options="reportDateRangesOptions">
                </cly-select-x>
            </cly-form-field>

            <cly-form-field name="dayOfWeek" :label="i18n('reports.dow')" rules="required" v-if="drawerScope.editedObject.frequency === 'weekly'">
                <cly-select-x
                    :placeholder="i18n('reports.Select-dow')"
                    mode="single-list"
                    v-model="drawerScope.editedObject.day"
                    class="bu-is-flex"
                    :options="dayOfWeekOptions">
                </cly-select-x>
            </cly-form-field>

            <cly-form-field name="select-time" :label="i18n('reports.select-time')" rules="required">
                <div class="cly-vue-report-drawer__report_description bu-mb-2 text-small  color-cool-gray-50">
                    {{i18n('reports.time-desc')}}
                </div>
                <cly-select-x
                    test-id="select-time-combobox"
                    :placeholder="i18n('reports.Select-time')"
                    mode="single-list"
                    v-model="drawerScope.editedObject.hour"
                    class="bu-is-flex"
                    :options="timeListOptions">
                </cly-select-x>
            </cly-form-field>

            <cly-form-field name="timezone" :label="i18n('reports.timezone')" rules="required">
                <div class="cly-vue-report-drawer__report_description bu-mb-2 text-small  color-cool-gray-50">
                    {{i18n('reports.timezone-desc')}}
                </div>
                <cly-select-x
                    :placeholder="i18n('reports.Select-timezone')"
                    mode="single-list"
                    v-model="drawerScope.editedObject.timezone"
                    class="bu-is-flex"
                    test-id="select-timezone-combobox"
                    :options="timezoneOptions">
                </cly-select-x>
            </cly-form-field>

            <cly-form-field name="pdf">
                <el-checkbox v-model="drawerScope.editedObject.sendPdf">{{i18n('reports.send-pdf')}}</el-checkbox>
            </cly-form-field>

            <pre v-if="0">
                {{drawerScope.editedObject}}
            </pre>
            </cly-form-step>
        </template>
    </cly-drawer>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { dataMixin, registerData } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { reportsState } from '../store/index.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { getEventsForApps } from '../../../../../frontend/express/public/javascripts/countly/countly.event.js';

export default {
    mixins: [
        i18nMixin,
        dataMixin({
            "externalDataTypeOptions": "/reports/data-type",
        }),
    ],
    props: {
        controls: { type: Object }
    },
    data: function() {
        var appsSelectorOption = [];
        for (var id in countlyGlobal.apps) {
            appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
        }
        var metricOptions = [
            {label: this.i18n( "reports.analytics" ), value: "analytics"},
            {label: this.i18n( "reports.events" ), value: "events"},
            {label: this.i18n( "reports.revenue" ), value: "revenue"},
            {label: this.i18n( "reports.crash" ), value: "crash"},
        ];
        if (countlyGlobal.plugins.indexOf("star-rating") > -1) {
            metricOptions.push({label: this.i18n( "reports.star-rating" ), value: "star-rating"});
        }
        if (countlyGlobal.plugins.indexOf("performance-monitoring") > -1) {
            metricOptions.push({label: this.i18n( "sidebar.performance-monitoring" ), value: "performance"});
        }
        var frequencyOptions = [
            {label: this.i18n( "reports.daily" ), value: "daily", description: this.i18n( "reports.daily-desc" )},
            {label: this.i18n( "reports.weekly" ), value: "weekly", description: this.i18n( "reports.weekly-desc" )},
            {label: this.i18n( "reports.monthly" ), value: "monthly", description: this.i18n( "reports.monthly-desc" )},
        ];
        var dayOfWeekOptions = [
            {label: this.i18n( "reports.monday" ), value: 1},
            {label: this.i18n( "reports.tuesday" ), value: 2},
            {label: this.i18n( "reports.wednesday" ), value: 3},
            {label: this.i18n( "reports.thursday" ), value: 4},
            {label: this.i18n( "reports.friday" ), value: 5},
            {label: this.i18n( "reports.saturday" ), value: 6},
            {label: this.i18n( "reports.sunday" ), value: 7},
        ];
        var zones = [];
        for (var country in countlyGlobal.timezones) {
            countlyGlobal.timezones[country].z.forEach(function(item) {
                for (var zone in item) {
                    zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone});
                }
            });
        }
        var timeListOptions = [];
        for (var i = 0; i < 24; i++) {
            var v = (i > 9 ? i : "0" + i) + ":00";
            timeListOptions.push({ value: i, label: v});
        }
        return {
            title: "",
            saveButtonLabel: "",
            appsSelectorOption: appsSelectorOption,
            metricOptions: metricOptions,
            eventOptions: [],
            frequencyOptions: frequencyOptions,
            dayOfWeekOptions: dayOfWeekOptions,
            timeListOptions: timeListOptions,
            timezoneOptions: zones,
            showApps: true,
            showMetrics: true,
            showDashboards: false,
            reportDateRangesOptions: [],
            metricsArray: [],
        };
    },
    computed: {
        reportTypeOptions: function() {
            var options = [
                {label: this.i18n( "reports.core" ), value: 'core'},
            ];
            if (this.externalDataTypeOptions) {
                options = options.concat(this.externalDataTypeOptions);
            }
            return options;
        },
        dashboardsOptions: function() {
            var dashboardsList = this.$store.getters["countlyDashboards/all"];
            var dashboardsOptions = [];
            for (var i = 0; i < dashboardsList.length; i++) {
                dashboardsOptions.push({ value: dashboardsList[i]._id, label: dashboardsList[i].name });
            }
            registerData("/reports/dashboards-option", dashboardsOptions);
            return dashboardsOptions;
        },
    },
    methods: {
        reportTypeChange: function(type) {
            if (type === 'dashboards') {
                this.showApps = false;
                this.showMetrics = false;
                this.showDashboards = true;
                this.metricsArray = [];
            }
            else {
                this.showApps = true;
                this.showMetrics = true;
                this.showDashboards = false;
            }
        },
        reportFrequencyChange: function(reportFrequency) {
            var dashboardRangesDict = this.$store.getters["countlyDashboards/reportDateRangeDict"];
            var reportDateRanges = dashboardRangesDict[reportFrequency] || [];
            this.reportDateRangesOptions = reportDateRanges.map(function(r) {
                return {value: r.value, label: r.name};
            });
        },
        emailInputFilter: function(val) {
            var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
            var regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
            var match = val.match(regex);
            if (match) {
                this.emailOptions = [{value: val, label: val}];
            }
            else {
                this.emailOptions = [];
            }
        },
        appsChange: function(apps) {
            var self = this;
            getEventsForApps(apps, function(eventData) {
                var eventOptions = eventData.map(function(e) {
                    return {value: e.value, label: e.name};
                });
                self.eventOptions = eventOptions;
            });
            this.$children[0].editedObject.selectedEvents = [];
        },
        onSubmit: function(doc) {
            doc.metrics = {};
            this.metricsArray.forEach(function(m) {
                doc.metrics[m] = true;
            });
            delete doc.hover;
            delete doc.user;
            this.$store.dispatch("countlyReports/saveReport", doc);
        },
        onClose: function($event) {
            this.$emit("close", $event);
        },
        onCopy: function(newState) {
            var self = this;
            this.metricsArray = [];
            this.reportTypeChange(newState.report_type);
            if (newState._id !== null) {
                this.reportFrequencyChange(newState.frequency);
                this.title = this.i18n( "reports.edit_report_title" );
                this.saveButtonLabel = this.i18n( "reports.Save_Changes" );
                for (var k in newState.metrics) {
                    this.metricsArray.push(k);
                }
                getEventsForApps(newState.apps, function(eventData) {
                    var eventOptions = eventData.map(function(e) {
                        return {value: e.value, label: e.name};
                    });
                    self.eventOptions = eventOptions;
                });
                return;
            }
            this.title = this.i18n( "reports.create_new_report_title" );
            this.saveButtonLabel = this.i18n( "reports.Create_New_Report" );
        },
    },
    mounted: function() {
        if (reportsState.createDashboard) {
            this.reportTypeChange('dashboards');
        }
    }
};
</script>
