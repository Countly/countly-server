<template>
    <div>
        <slot :showDialog="showDialog" name="trigger">
            <el-button data-test-id="last-queries-button" @click="showDialog" :disabled="disabled" type="default" size="small">
                <div v-show="unread > 0" class="cly-bullet cly-bullet--orange bu-mr-1"></div>
                Last queries
                <span class="bu-tag is-curved">{{runningCount}}</span>
            </el-button>
        </slot>
        <cly-dialog
            title="Recent reports"
            width="1120px"
            autoCentered
            :visible.sync="isDialogVisible">
            <cly-report-manager-table maxHeight="400px" @view-task="onViewTask" :disableAutoNavigationToTask="disableAutoNavigationToTask" report-type="auto" :fixed-origin="origin" compact></cly-report-manager-table>
        </cly-dialog>
    </div>
</template>

<script>
import { i18nMixin, ajax } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import UnreadPin from './UnreadPin.vue';
import ClyReportManagerTable from './ClyReportManagerTable.vue';

export default {
    components: {
        "unread-pin": UnreadPin,
        ClyReportManagerTable
    },
    mixins: [i18nMixin],
    props: {
        origin: {
            type: String,
            default: null
        },
        disabled: {
            type: Boolean,
            default: false
        },
        disableRunningCount: {
            type: Boolean,
            default: false
        },
        disableAutoNavigationToTask: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        remoteOpId: function() {
            return this.$store.state.countlyTaskManager.opId;
        },
        unread: function() {
            var unread = this.$store.getters["countlyTaskManager/unreadStats"];
            if (unread[countlyCommon.ACTIVE_APP_ID]) {
                if (this.origin) {
                    return unread[countlyCommon.ACTIVE_APP_ID][this.origin] || 0;
                }
                return unread[countlyCommon.ACTIVE_APP_ID]._total || 0;
            }
            return 0;
        }
    },
    data: function() {
        return {
            isDialogVisible: false,
            runningCount: 0,
            fetchingCount: false
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        remoteOpId: function() {
            this.refresh();
        },
        disabled: function(newVal) {
            if (newVal) {
                this.isDialogVisible = false;
            }
        }
    },
    methods: {
        refresh: function() {
            this.fetchRunningCount();
        },
        fetchRunningCount: function() {
            if (!this.disableRunningCount && !this.fetchingCount) {
                var q = {
                        status: {$in: ["running", "rerunning"]},
                        manually_create: {$ne: true}
                    },
                    self = this;

                if (this.origin) {
                    q.type = this.origin;
                }
                this.fetchingCount = true;
                ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/tasks/count?app_id=" + countlyCommon.ACTIVE_APP_ID,
                    data: {
                        query: JSON.stringify(q)
                    }
                }, {disableAutoCatch: false})
                    .then(function(resp) {
                        self.runningCount = (resp && resp[0] && resp[0].c) || 0;
                    })
                    .catch(function() {})
                    .finally(function() {
                        self.fetchingCount = false;
                    });
            }
        },
        showDialog: function() {
            if (!this.disabled) {
                this.isDialogVisible = true;
            }
        },
        onViewTask: function(payload) {
            this.$emit("view-task", payload);
            this.isDialogVisible = false;
        }
    }
};
</script>
