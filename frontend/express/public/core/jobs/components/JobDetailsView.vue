<template>
    <div v-bind:class="[componentId]">
        <cly-header :title="job_name">
            <template v-slot:header-top>
                <cly-back-link :title="i18n('jobs.back-to-jobs-list')"></cly-back-link>
            </template>
        </cly-header>

        <cly-main>
            <!-- Wait until jobDetails is loaded -->
            <template v-if="jobDetails">
                <!-- Job Configuration Header -->
                <h5 class="bu-is-size-5 bu-mb-4 bu-mt-5">
                    {{ i18n('jobs.job-configuration') }}
                </h5>

                <!-- Job Overview Section -->
                <cly-section class="bu-pt-3">
                    <div class="bu-columns">
                        <div class="bu-column">

                            <div class="bu-box bu-has-shadow-sm bu-p-5">
                                <!-- Base Configuration -->
                                <div class="bu-mb-4">
                                    <h5 class="bu-is-size-5 bu-mb-3">
                                        {{ i18n('jobs.base-configuration') }}
                                    </h5>
                                    <div class="bu-field bu-mb-3 bu-is-flex">
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.default-schedule') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1 bu-is-flex bu-is-align-items-center">
                                            <span class="bu-tag bu-is-info bu-is-light bu-mr-2">
                                                {{ jobDetails.config && jobDetails.config.defaultConfig && jobDetails.config.defaultConfig.schedule && jobDetails.config.defaultConfig.schedule.value
                                                    ? jobDetails.config.defaultConfig.schedule.value
                                                    : i18n('common.never') }}
                                            </span>
                                            <p class="bu-has-text-grey bu-is-italic" v-if="jobDetails.config && jobDetails.config.scheduleLabel">
                                                {{ jobDetails.config.scheduleLabel }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Configuration Overrides -->
                                <div
                                    class="bu-mb-4"
                                    v-if="hasOverrides"
                                >
                                    <h5 class="bu-is-size-5 bu-mb-3">
                                        {{ i18n('jobs.active-overrides') }}
                                    </h5>
                                    <div
                                        class="bu-field bu-mb-3 bu-is-flex"
                                        v-if="jobDetails.config && jobDetails.config.scheduleOverride"
                                    >
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.schedule-override') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1 bu-is-flex bu-is-align-items-center">
                                            <span class="bu-tag bu-is-warning bu-is-light bu-mr-2">
                                                {{ jobDetails.config.scheduleOverride }}
                                            </span>
                                            <p class="bu-has-text-grey bu-is-italic" v-if="jobDetails.config && jobDetails.config.scheduleOverrideLabel">
                                                {{ jobDetails.config.scheduleOverrideLabel }}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        class="bu-field bu-mb-3"
                                        v-if="jobDetails.config && jobDetails.config.retryOverride"
                                    >
                                        <div class="bu-is-flex">
                                            <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.retry-override') }}:</label>
                                            <div class="bu-control bu-is-flex-grow-1">
                                                <div class="bu-notification bu-is-light bu-is-info bu-p-3 bu-mt-2">
                                                    <div class="bu-mb-2 bu-is-flex bu-is-align-items-center">
                                                        <strong class="bu-mr-2">{{ i18n('jobs.attempts') }}:</strong>
                                                        <span class="bu-tag bu-is-info bu-is-light">{{ jobDetails.config.retryOverride.attempts }}</span>
                                                    </div>
                                                    <div class="bu-is-flex bu-is-align-items-center">
                                                        <strong class="bu-mr-2">{{ i18n('jobs.delay') }}:</strong>
                                                        <span class="bu-tag bu-is-info bu-is-light">{{ jobDetails.config.retryOverride.delay }}ms</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Current State -->
                                <div class="bu-mb-4">
                                    <h5 class="bu-is-size-5 bu-mb-3">
                                        {{ i18n('jobs.current-state') }}
                                    </h5>
                                    <div class="bu-field bu-mb-3 bu-is-flex">
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.last-status') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1">
                                            <cly-status-tag
                                                :text="jobDetails.config && jobDetails.config.enabled !== false
                                                    ? (jobDetails.currentState && jobDetails.currentState.status ? jobDetails.currentState.status : i18n('common.unknown'))
                                                    : i18n('jobs.disable').toUpperCase()"
                                                :color="getStatusColor(jobDetails)"
                                            >
                                            </cly-status-tag>
                                        </div>
                                    </div>
                                    <div class="bu-field bu-mb-3 bu-is-flex">
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.last-run') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1">
                                            <span class="bu-tag bu-is-light">
                                                {{ jobDetails.currentState && jobDetails.currentState.lastRun ? formatDateTime(jobDetails.currentState.lastRun) : i18n('common.never') }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="bu-field bu-mb-3 bu-is-flex">
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.next-run') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1">
                                            <span class="bu-tag bu-is-light">
                                                {{ jobDetails.currentState && jobDetails.currentState.nextRun ? formatDateTime(jobDetails.currentState.nextRun) : i18n('common.not-scheduled') }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="bu-field bu-mb-3 bu-is-flex">
                                        <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.last-run-duration') }}:</label>
                                        <div class="bu-control bu-is-flex-grow-1">
                                            <span class="bu-tag bu-is-light">
                                                {{ jobDetails.currentState && jobDetails.currentState.lastRunDuration ? jobDetails.currentState.lastRunDuration + 's' : '-' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="bu-mb-4" v-if="jobDetails.currentState && jobDetails.currentState.failReason">
                                    <h5 class="bu-is-size-5 bu-mb-3">
                                        {{ i18n('jobs.last-failure') }}
                                    </h5>
                                    <div class="bu-field bu-mb-3">
                                        <div class="bu-is-flex">
                                            <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.fail-at') }}:</label>
                                            <div class="bu-control bu-is-flex-grow-1">
                                                <span class="bu-tag bu-is-light">
                                                    {{ jobDetails.currentState && jobDetails.currentState.failedAt ? formatDateTime(jobDetails.currentState.failedAt) : i18n('common.never') }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="bu-field bu-mb-3">
                                        <div class="bu-is-flex">
                                            <label class="bu-label bu-mr-2 bu-is-flex-grow-0 bu-is-flex-shrink-0 bu-is-flex bu-is-align-items-center" style="width: 160px;">{{ i18n('jobs.fail-reason') }}:</label>
                                            <div class="bu-control bu-is-flex-grow-1">
                                                <pre
                                                    class="bu-p-3 bu-has-background-white-ter bu-is-family-code"
                                                >{{ jobDetails.currentState.failReason }}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </cly-section>

                <h5 class="bu-is-size-5 bu-mb-4 bu-mt-5">
                    {{ i18n('jobs.manual-job-history') }}
                </h5>

                <cly-section class="bu-pt-3">
                    <div class="bu-box bu-has-shadow-sm bu-p-0">
                        <cly-datatable-n
                            :rows="manualJobRuns"
                            :columns="jobRunColumns"
                            :force-loading="isLoading"
                            class="jobs-history-table"
                        >
                            <template v-slot="scope">
                                <!-- Column: lastRunAt -->
                                <el-table-column
                                    prop="lastRunAt"
                                    :label="i18n('jobs.run-time')"
                                    sortable="custom"
                                    width="180"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <span>
                                            {{ formatDateTime(scope.row.lastRunAt) }}
                                        </span>
                                    </template>
                                </el-table-column>

                                <!-- Column: status -->
                                <el-table-column
                                    prop="status"
                                    :label="i18n('jobs.status')"
                                    sortable="custom"
                                    width="150"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <div class="bu-is-flex bu-is-align-items-center">
                                            <cly-status-tag
                                                :text="scope.row.status"
                                                :color="getRunStatusColor(scope.row)"
                                            >
                                            </cly-status-tag>
                                            <el-tooltip
                                                v-if="scope.row.failReason"
                                                :content="scope.row.failReason"
                                                placement="top"
                                            >
                                                <i
                                                    class="ion-alert-circled bu-ml-2"
                                                    style="color: #d23f00"
                                                ></i>
                                            </el-tooltip>
                                        </div>
                                    </template>
                                </el-table-column>

                                <!-- Column: duration -->
                                <el-table-column
                                    prop="duration"
                                    :label="i18n('jobs.duration')"
                                    sortable="custom"
                                    width="120"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <span class="bu-tag bu-is-info bu-is-light" v-if="scope.row.duration">
                                            {{ scope.row.duration }}s
                                        </span>
                                        <span class="bu-has-text-grey" v-else>-</span>
                                    </template>
                                </el-table-column>

                                <!-- Column: result -->
                                <el-table-column
                                    prop="result"
                                    :label="i18n('jobs.result')"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <pre
                                            v-if="scope.row.dataAsString && scope.row.dataAsString !== '{}'"
                                            class="bu-p-3 bu-has-background-grey-lighter bu-is-family-code bu-has-radius bu-has-shadow-inner"
                                            style="max-height: 200px; overflow: auto;"
                                        >{{ scope.row.dataAsString }}</pre>
                                        <span class="bu-has-text-grey" v-else>{{ i18n('common.no-data') }}</span>
                                    </template>
                                </el-table-column>
                            </template>
                        </cly-datatable-n>
                    </div>
                </cly-section>

                <h5 class="bu-is-size-5 bu-mb-4 bu-mt-5" v-if="jobHistories && jobHistories.length > 0">
                    {{ i18n('jobs.fail-history') }}
                </h5>

                <cly-section class="bu-pt-3" v-if="jobHistories && jobHistories.length > 0">
                    <div class="bu-box bu-has-shadow-sm bu-p-0">
                        <cly-datatable-n
                            :rows="jobHistories"
                            :columns="jobRunColumns"
                            :force-loading="isLoading"
                            class="jobs-history-table"
                        >
                            <template v-slot="scope">
                                <!-- Column: lastRunAt -->
                                <el-table-column
                                    prop="lastRunAt"
                                    :label="i18n('jobs.run-time')"
                                    sortable="custom"
                                    width="180"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <span>
                                            {{ formatDateTime(scope.row.lastRunAt) }}
                                        </span>
                                    </template>
                                </el-table-column>

                                <!-- Column: status -->
                                <el-table-column
                                    prop="type"
                                    :label="i18n('jobs.type')"
                                    sortable="custom"
                                    width="150"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <div class="bu-is-flex bu-is-align-items-center">
                                            <span>
                                                {{ getJobTypeLabel(scope.row.type) }}
                                            </span>
                                        </div>
                                    </template>
                                </el-table-column>

                                <!-- Column: duration -->
                                <el-table-column
                                    prop="duration"
                                    :label="i18n('jobs.duration')"
                                    sortable="custom"
                                    width="120"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <span class="bu-tag bu-is-info bu-is-light" v-if="scope.row.duration">
                                            {{ scope.row.duration }}s
                                        </span>
                                        <span class="bu-has-text-grey" v-else>-</span>
                                    </template>
                                </el-table-column>

                                <!-- Column: result -->
                                <el-table-column
                                    prop="failReason"
                                    :label="i18n('jobs.fail-reason')"
                                    header-align="left"
                                >
                                    <template v-slot="scope">
                                        <pre
                                            v-if="scope.row.failReason && scope.row.failReason.length > 0"
                                            class="bu-p-3 bu-has-background-white-ter bu-is-family-code"
                                            style="max-height: 200px; overflow: auto;"
                                        >{{ scope.row.failReason }}</pre>
                                        <span class="bu-has-text-grey" v-else>{{ i18n('common.no-data') }}</span>
                                    </template>
                                </el-table-column>
                            </template>
                        </cly-datatable-n>
                    </div>
                </cly-section>
            </template>
        </cly-main>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import moment from 'moment';

// Component Registration
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyBackLink from '../../../javascripts/components/helpers/cly-back-link.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyStatusTag from '../../../javascripts/components/helpers/cly-status-tag.vue';

const CV = countlyVue;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyBackLink,
        ClyDatatableN,
        ClyStatusTag
    },
    mixins: [
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
            job_name: this.$route.params.jobName,
            jobDetails: null,
            manualJobRuns: [],
            jobHistories: [],
            isLoading: false,
            // columns for the manual run history table
            jobRunColumns: [
                { prop: "lastRunAt", label: CV.i18n('jobs.run-time'), sortable: true },
                { prop: "status", label: CV.i18n('jobs.status'), sortable: true },
                { prop: "duration", label: CV.i18n('jobs.duration'), sortable: true },
                { prop: "result", label: CV.i18n('jobs.result') }
            ],
            // columns for the failed run history table
            jobHistoryColumns: [
                { prop: "lastRunAt", label: CV.i18n('jobs.run-time'), sortable: true },
                { prop: "type", label: CV.i18n('jobs.type'), sortable: true },
                { prop: "duration", label: CV.i18n('jobs.duration'), sortable: true },
                { prop: "failReason", label: CV.i18n('jobs.fail-reason'), sortable: true },
            ]
        };
    },
    computed: {
        /**
         * Check if there are any scheduleOverride or retryOverride in the config
         * @returns {boolean} True if overrides exist
         */
        hasOverrides: function() {
            return this.jobDetails &&
                (this.jobDetails.config?.scheduleOverride ||
                    this.jobDetails.config?.retryOverride);
        }
    },
    methods: {
        /**
         * Fetches jobDetails + normal docs from /jobs/o?name=<jobName>
         */
        fetchJobDetails: function() {
            var self = this;
            self.isLoading = true;

            CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/jobs/o",
                headers: { 'Countly-Token': countlyGlobal.auth_token },
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "name": self.job_name,
                    "iDisplayStart": 0,
                    "iDisplayLength": 50
                },
                dataType: "json",
                success: function(response) {
                    // jobDetails => the main scheduled doc + overrides
                    self.jobDetails = response.jobDetails;

                    // aaData => the array of normal run docs
                    self.manualJobRuns = (response.aaData || []).map(function(run) {
                        return {
                            lastRunAt: run.lastRunAt,
                            status: run.status,
                            duration: run.duration,
                            result: run.result,
                            failReason: run.failReason,
                            dataAsString: run.dataAsString
                        };
                    });

                    self.jobHistories = response.jobHistories;

                    self.isLoading = false;
                },
                error: function() {
                    self.isLoading = false;
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("jobs.details-fetch-error"),
                        type: "error"
                    });
                }
            });
        },
        formatDateTime: function(date) {
            return date ? moment(date).format('D MMM, YYYY HH:mm:ss') : '-';
        },
        calculateDuration: function(run) {
            // (optional) if you want dynamic calculations
            if (!run.lastRunAt || !run.lastFinishedAt) {
                return '-';
            }
            return ((new Date(run.lastFinishedAt) - new Date(run.lastRunAt)) / 1000).toFixed(2);
        },
        /**
         * Map jobDetails.currentState.status to a color
         * @param {Object} jobDetails The job details object
         * @returns {string} Color code for the status
         */
        getStatusColor: function(jobDetails) {
            if (!jobDetails.config?.enabled) {
                return "gray";
            }
            switch (jobDetails.currentState.status) {
            case "RUNNING": return "blue";
            case "FAILED": return "red";
            case "COMPLETED": return "green";
            case "PENDING": return "yellow";
            default: return "yellow";
            }
        },
        /**
         * Map each run's status to a color
         * @param {Object} run The job run object
         * @returns {string} Color code for the status
         */
        getRunStatusColor: function(run) {
            // Handle both string and object status
            // Use _originalLastRunStatus if available
            var status = run._originalLastRunStatus || run.status;

            // Convert to uppercase for consistent comparison with backend values
            if (typeof status === 'string') {
                status = status.toUpperCase();
            }

            // Backend uses "COMPLETED", "FAILED", "RUNNING", "SCHEDULED" (see getJobStatus in api.js)
            // But also "success", "failed", "pending" (see getRunStatus in api.js)
            switch (status) {
            case "SUCCESS":
            case "COMPLETED": return "green";
            case "RUNNING": return "blue";
            case "FAILED": return "red";
            case "PENDING":
            case "SCHEDULED": return "yellow";
            default: return "gray";
            }
        },
        getJobTypeLabel: function(inpJobType) {
            var jobTypeMap = {
                single: CV.i18n("jobs.type-scheduled"),
                normal: CV.i18n("jobs.type-manual"),
            };

            return jobTypeMap[inpJobType];
        },
    },
    mounted: function() {
        // On load, fetch data
        this.fetchJobDetails();
    }
};
</script>
