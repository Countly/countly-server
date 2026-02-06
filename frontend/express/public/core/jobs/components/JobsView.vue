<template>
    <div v-bind:class="[componentId]">
        <cly-header :title="i18n('sidebar.management.jobs')">
        </cly-header>

        <cly-main>
            <cly-section data-test-id="table-jobs">
                <!--
                    cly-datatable-n uses :data-source="remoteTableDataSource"
                    which is tied to our ServerDataTable in views.js.
                    We define columns using el-table-column inside <template v-slot="scope">.
                -->
                <cly-datatable-n
                    test-id="datatable-jobs"
                    :data-source="remoteTableDataSource"
                    v-on:row-click="goTo"
                    :isClickable="true"
                    :default-sort="{ prop: 'name', order: 'ascending' }"
                    :persist-key="jobsTablePersistKey"
                    class="jobs-table"
                >
                    <template v-slot="scope">
                        <!-- Job Name Column -->
                        <el-table-column
                            prop="name"
                            :label="i18n('jobs.job-name')"
                            sortable="custom"
                            type="clickable"
                        >
                            <template v-slot="scope">
                                <span :data-test-id="'datatable-jobs-name-' + scope.$index">
                                    {{ scope.row.name }}
                                </span>
                            </template>
                        </el-table-column>

                        <!-- Job Status Column -->
                        <el-table-column
                            prop="status"
                            :label="i18n('jobs.job-status')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <span :data-test-id="'datatable-jobs-status-' + scope.$index">
                                    <cly-status-tag
                                        :text="scope.row.config.enabled ? scope.row.status : 'DISABLED'"
                                        :color="getColor(scope.row)"
                                    ></cly-status-tag>
                                </span>
                            </template>
                        </el-table-column>

                        <!-- Job Schedule (Cron) Column -->
                        <el-table-column
                            prop="scheduleLabel"
                            :label="i18n('jobs.job-schedule')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <p :data-test-id="'datatable-jobs-schedule-' + scope.$index">
                                    {{ scope.row.scheduleLabel }}
                                </p>
                                <p
                                    :data-test-id="'datatable-jobs-schedule-detail-' + scope.$index"
                                    class="bu-has-text-grey bu-is-size-7"
                                >
                                    <template v-if="scope.row.scheduleOverridden">
                                        <el-tooltip
                                        :content= "'Default: ' + scope.row.schedule + (scope.row.configuredSchedule ? ' | Override: ' + scope.row.configuredSchedule : '')"
                                        placement="top">
                                            <i class="ion-alert-circled bu-ml-2""></i>
                                        <span class="bu-has-text-weight-bold">{{ i18n('jobs.override') }}:</span>
                                        </el-tooltip>
                                        {{scope.row.configuredSchedule}}
                                    </template>
                                    <template v-else>
                                        {{ scope.row.schedule }}
                                    </template>
                                </p>
                            </template>
                        </el-table-column>

                        <!-- Next Run Column -->
                        <el-table-column
                            prop="nextRunAt"
                            :label="i18n('jobs.job-next-run')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <p :data-test-id="'datatable-jobs-next-run-date-' + scope.$index">
                                    {{ scope.row.nextRunDate }}
                                </p>
                                <p
                                    :data-test-id="'datatable-jobs-next-run-time-' + scope.$index"
                                    class="bu-has-text-grey bu-is-size-7"
                                >
                                    {{ scope.row.nextRunTime }}
                                </p>
                            </template>
                        </el-table-column>

                        <!-- Last Run Column -->
                        <el-table-column
                            prop="lastFinishedAt"
                            :label="i18n('jobs.job-last-run')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <p
                                    v-html="scope.row.lastRun"
                                    :data-test-id="'datatable-jobs-last-run-' + scope.$index"
                                ></p>
                            </template>
                        </el-table-column>

                        <!-- Last Run Status Column -->
                        <el-table-column
                            prop="lastRunStatus"
                            :label="i18n('jobs.last-run-status')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <span :data-test-id="'datatable-jobs-last-run-status-' + scope.$index">
                                    <cly-status-tag
                                        :text="scope.row.lastRunStatus"
                                        :color="getRunStatusColor(scope.row)"
                                    >
                                    </cly-status-tag>
                                </span>

                                <!-- Show error tooltip if the last run failed and there's a failReason -->
                                <el-tooltip
                                    v-if="scope.row.lastRunStatus === 'failed' && scope.row.failReason"
                                    :content="scope.row.failReason"
                                    placement="top"
                                >
                                    <i class="ion-alert-circled bu-ml-2" style="color: #D23F00;"></i>
                                </el-tooltip>
                            </template>
                        </el-table-column>

                        <!-- Total Column (if needed) -->
                        <el-table-column
                            prop="total"
                            :label="i18n('jobs.job-total-runs')"
                            sortable="custom"
                        >
                            <template v-slot="scope">
                                <p class="bu-is-family-code" :data-test-id="'datatable-jobs-total-' + scope.$index">
                                    {{ scope.row.total }}
                                </p>
                            </template>
                        </el-table-column>

                        <!-- Action Buttons Column -->
                        <el-table-column
                            align="center"
                            type="options"
                            header-align="center"
                            width="100"
                        >
                            <template v-slot="scope">

                                <cly-more-options
                                    v-if="canSuspendJob"
                                    @command="handleCommand($event, scope.row)"
                                    placement="bottom-end"
                                    :test-id="'datatable-jobs-' + scope.$index"
                                >
                                    <el-dropdown-item
                                        command="enable"
                                        v-if="!scope.row.config.enabled"
                                    >
                                        {{ i18n('jobs.enable') }}
                                    </el-dropdown-item>
                                    <el-dropdown-item
                                        command="disable"
                                        v-if="scope.row.config.enabled"
                                    >
                                        {{ i18n('jobs.disable') }}
                                    </el-dropdown-item>
                                    <el-dropdown-item command="schedule">
                                        {{ i18n('jobs.change-schedule') }}
                                    </el-dropdown-item>
                                    <el-dropdown-item command="runNow">
                                        {{ i18n('jobs.run-now') }}
                                    </el-dropdown-item>
                                </cly-more-options>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>

                <!-- Schedule dialog moved outside of the table structure -->
                <cly-form-dialog
                    :title="scheduleDialogTitle"
                    name="job-schedule-dialog"
                    class="cly-vue-jobs-dialog"
                    v-bind="formDialogs.jobSchedule"
                    :saveButtonLabel="i18n('common.save')"
                    @submit="saveSchedule"
                    center
                >
                    <template v-slot="formDialogScope">
                        <cly-form-step id="jobs-schedule-configuration">
                            <cly-form-field v-slot="validation" name="jobs-schedule" :label="i18n('jobs.schedule')" rules="required|validCron">
                                <div class="bu-mb-2 bu-is-size-7 bu-has-text-grey">
                                    {{ i18n('jobs.schedule-hint') }}
                                </div>
                                <el-input v-model="selectedJobConfig.schedule" :placeholder="selectedJobConfig.defaultSchedule"></el-input>
                                <div v-if="validation.errors.length > 0" class="text-small color-red-100 bu-pt-1">
                                    {{i18n('jobs.schedule-error')}}
                                </div>
                                <div v-else class="text-small bu-pt-1">
                                    {{parseCron(selectedJobConfig.schedule)}}
                                </div>
                            </cly-form-field>
                        </cly-form-step>
                    </template>
                </cly-form-dialog>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import app from '../../../javascripts/countly/countly.template.js';
import moment from 'moment';
import cronstrue from 'cronstrue';

// Import cly-* components
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyStatusTag from '../../../javascripts/components/helpers/cly-status-tag.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyFormDialog from '../../../javascripts/components/dialog/cly-form-dialog.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';

const CV = countlyVue;

/**
 * Helper function to map the job status to a color tag
 * @param {Object} row The job row object
 * @returns {string} Color code for the status
 */
const getColor = function(row) {
    // row is the merged job object
    // Use _originalStatus if available, otherwise fall back to status
    var status = row._originalStatus || row.status;
    if (status) {
        status = status.toUpperCase(); // Convert to uppercase for consistent comparison
    }

    // Use _originalLastRunStatus if available, otherwise fall back to lastRunStatus
    var lastRunStatus = row._originalLastRunStatus || row.lastRunStatus;
    if (lastRunStatus) {
        lastRunStatus = lastRunStatus.toUpperCase(); // Convert to uppercase for consistent comparison
    }

    // Check if job is disabled via config.enabled
    if (!row.config || !row.config.enabled) {
        return "gray";
    }

    // Backend uses "COMPLETED", "FAILED", "RUNNING", "SCHEDULED" (see getJobStatus in api.js)
    // But also "success", "failed", "pending" (see getRunStatus in api.js)
    switch (status) {
    case "RUNNING": return "blue";
    case "COMPLETED": return "green";
    case "SUCCESS": return "green";
    case "SCHEDULED":
    case "PENDING": return "yellow";
    case "SUSPENDED": return "gray";
    case "CANCELLED": return "red";
    }

    // If status doesn't match, check lastRunStatus
    if (lastRunStatus === "FAILED") {
        return "red";
    }

    return "gray";
};

/**
 * Helper to update row display fields (like nextRunDate, nextRunTime, lastRun)
 * @param {Object} row The job row object to update
 * @returns {void}
 */
const updateScheduleRow = function(row) {
    // Store original values for sorting
    if (row.name !== undefined) {
        row._sortName = String(row.name);
    }

    if (row.status !== undefined) {
        // Store the original status value for color determination and sorting
        row._originalStatus = row.status;
        row._sortStatus = String(row.status);
    }

    // Add sortBy properties for date fields to ensure correct sorting
    if (row.nextRunAt) {
        var nextRunMoment = moment(row.nextRunAt);
        row.nextRunDate = nextRunMoment.format('YYYY-MM-DD');
        row.nextRunTime = nextRunMoment.format('HH:mm:ss');

        // Store original value for sorting
        row._sortNextRunAt = new Date(row.nextRunAt).getTime();
    }
    else {
        row.nextRunDate = '';
        row.nextRunTime = '';
    }

    if (row.lastFinishedAt) {
        var lastFinishedMoment = moment(row.lastFinishedAt);
        row.lastRun = lastFinishedMoment.fromNow();

        // Store original value for sorting
        row._sortLastFinishedAt = new Date(row.lastFinishedAt).getTime();
    }
    else {
        row.lastRun = '';
    }

    if (row.scheduleLabel !== undefined) {
        row._sortScheduleLabel = String(row.scheduleLabel);
    }

    if (row.lastRunStatus !== undefined) {
        // Store the original lastRunStatus value for color determination and sorting
        row._originalLastRunStatus = row.lastRunStatus;
        row._sortLastRunStatus = String(row.lastRunStatus);
    }

    if (row.total !== undefined) {
        row._sortTotal = Number(row.total);
    }

    // If the row has .config.defaultConfig.schedule.value, use it as its "default schedule"
    if (row.config && row.config.defaultConfig && row.config.defaultConfig.schedule) {
        row.schedule = row.config.defaultConfig.schedule.value;
        row.configuredSchedule = row.config.schedule;
        row.scheduleOverridden = row.configuredSchedule && (row.configuredSchedule !== row.schedule);
    }
};

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatatableN,
        ClyStatusTag,
        ClyMoreOptions,
        ClyFormDialog,
        ClyFormStep,
        ClyFormField
    },
    data: function() {
        var self = this;

        // Create a local vuex store for the server data table
        var tableStore = countlyVue.vuex.getLocalStore(
            countlyVue.vuex.ServerDataTable("jobsTable", {
                // columns: ['name', "schedule", "next", "finished", "status", "total"],
                columns: ["name", "status", "scheduleLabel", "nextRunAt", "lastFinishedAt", "lastRunStatus", "total"],

                onRequest: function() {
                    // Called before making the request
                    self.loaded = false;
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/jobs/o", // no ?name= param => list mode
                        headers: { 'Countly-Token': countlyGlobal.auth_token },
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            iDisplayStart: 0,
                            iDisplayLength: 50
                        }
                    };
                },
                onReady: function(context, rows) {
                    // Called when request completes successfully
                    self.loaded = true;

                    // rows.aaData is an array: [ { job: {...}, config: {...} }, ... ]
                    // We merge job + config into a single row object
                    var processedRows = [];
                    for (var i = 0; i < rows.length; i++) {
                        var mergedJob = rows[i].job; // from "job"
                        var config = rows[i].config; // from "config"

                        mergedJob.enabled = config.enabled;
                        mergedJob.config = config;

                        // Do any schedule display updates, etc.
                        updateScheduleRow(mergedJob);

                        processedRows.push(mergedJob);
                    }
                    return processedRows;
                }
            })
        );

        return {
            loaded: true,
            saving: false,
            scheduleDialogVisible: false,
            selectedJobConfig: {
                name: '',
                schedule: '',
                defaultSchedule: '',
                scheduleLabel: '',
                enabled: true
            },
            tableStore: tableStore,
            remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "jobsTable"),
            jobsTablePersistKey: "cly-jobs-table"
        };
    },
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.hasFormDialogs("jobSchedule")
    ],
    computed: {
        /**
         * Whether the current user can enable/disable jobs
         * @returns {boolean} True if user has admin rights
         */
        canSuspendJob: function() {
            return countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID];
        },
        scheduleDialogTitle: function() {
            return '"' + this.selectedJobConfig.name + '" ' + CV.i18n('jobs.schedule-configuration');
        },
    },
    methods: {
        parseCron: function(inpStr) {
            try {
                return cronstrue.toString(inpStr);
            }
            catch (_) {
                return inpStr;
            }
        },
        formatDateTime: function(date) {
            return date ? moment(date).format('D MMM, YYYY HH:mm:ss') : '-';
        },
        getStatusColor: function(details) {
            // Not strictly used in the listing, but you can keep it for reference
            if (!details.config.enabled) {
                return 'gray';
            }
            if (details.currentState.status === 'RUNNING') {
                return 'blue';
            }
            if (details.currentState.status === 'FAILED') {
                return 'red';
            }
            if (details.currentState.status === 'COMPLETED') {
                return 'green';
            }
            if (details.currentState.status === 'PENDING') {
                return 'yellow';
            }
            return 'yellow';
        },
        getRunStatusColor(status) {
            // For run status
            // Use _originalLastRunStatus if available
            var statusValue = status && status._originalLastRunStatus ? status._originalLastRunStatus : status;

            // Convert to uppercase for consistent comparison with backend values
            if (typeof statusValue === 'string') {
                statusValue = statusValue.toUpperCase();
            }

            // Backend uses "COMPLETED", "FAILED", "RUNNING", "SCHEDULED" (see getJobStatus in api.js)
            // But also "success", "failed", "pending" (see getRunStatus in api.js)
            switch (statusValue) {
            case "SUCCESS":
            case "COMPLETED": return 'green';
            case "RUNNING": return 'blue';
            case "FAILED": return 'red';
            case "PENDING":
            case "SCHEDULED": return 'yellow';
            default: return 'gray';
            }
        },
        refresh: function(force) {
            if (this.loaded || force) {
                this.loaded = false;
                this.tableStore.dispatch("fetchJobsTable");
            }
        },
        /**
         * Navigates to job details page
         * @param {Object} row The job row to navigate to
         * @returns {void}
         */
        goTo: function(row) {
            app.navigate("#/manage/jobs/" + row.name, true);
        },
        getColor: getColor,
        /**
         * Called from the row's more options, e.g. "enable", "disable", "schedule", "runNow"
         * @param {string} command The command to execute
         * @param {Object} row The job row
         * @returns {void}
         */
        handleCommand: function(command, row) {
            if (row.name) {
                var self = this;
                if (command === 'schedule') {
                    // Show the schedule dialog
                    this.selectedJobConfig = {
                        name: row.name,
                        schedule: row.configuredSchedule || row.schedule,
                        defaultSchedule: row.schedule,
                        enabled: row.enabled
                    };
                    this.openFormDialog('jobSchedule', this.selectedJobConfig);
                    return;
                }

                // For enable, disable, runNow, etc. => /jobs/i
                var data = {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    jobName: row.name,
                    action: command
                };

                CV.$.ajax({
                    type: "GET", // or POST if your server expects that
                    url: countlyCommon.API_URL + "/jobs/i",
                    data: data,
                    headers: { 'Countly-Token': countlyGlobal.auth_token },
                    success: function(res) {
                        if (res.result === "Success") {
                            self.refresh(true);
                            CountlyHelpers.notify({
                                type: "ok",
                                message: CV.i18n("jobs.command." + command + "-success", row.name)
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: "error",
                                message: res.result
                            });
                        }
                    },
                    error: function(err) {
                        CountlyHelpers.notify({
                            type: "error",
                            message: err.responseJSON?.result || "Error"
                        });
                    }
                });
            }
        },
        /**
         * Called when user clicks "Save" on the schedule dialog
         */
        saveSchedule: function() {
            var self = this;
            self.saving = true;

            CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/jobs/i",
                headers: { 'Countly-Token': countlyGlobal.auth_token },
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    jobName: self.selectedJobConfig.name,
                    action: 'updateSchedule',
                    schedule: this.selectedJobConfig.schedule
                },
                success: function() {
                    self.saving = false;
                    self.closeFormDialog('jobSchedule');
                    self.refresh(true);
                    CountlyHelpers.notify({
                        type: "ok",
                        message: CV.i18n("jobs.command.schedule-success", self.selectedJobConfig.name),
                    });
                },
                error: function(err) {
                    self.saving = false;
                    self.closeFormDialog('jobSchedule');
                    CountlyHelpers.notify({
                        type: "error",
                        message: err.responseJSON?.result || "Error"
                    });
                }
            });
        },
    }
};
</script>
