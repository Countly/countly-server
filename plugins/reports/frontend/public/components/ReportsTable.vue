<template>
    <div>
        <cly-empty-view
            v-if="rawTableRows.length === 0 && initialized"
            :title="i18n('reports.empty-title')"
            :subTitle="i18n('reports.empty-subtitle')"
            :actionTitle="i18n('reports.empty-action-button-title')"
            :hasAction="canUserCreate"
            :actionFunc="createReport"
        />
        <cly-section v-else>
            <cly-datatable-n
                :force-loading="!initialized"
                class="cly-vue-reports-table"
                test-id="datatable-reports"
                :tracked-fields="localTableTrackedFields"
                :rows="tableRows"
                :resizable="false">
                <template v-slot="scope">
                    <el-table-column type="switch" fixed="left" width="88" prop="enabled">
                        <template v-slot="rowScope">
                            <el-switch
                                :test-id="'datatable-reports-toggle-' + rowScope.$index"
                                :value="rowScope.row.enabled"
                                class="bu-ml-4 bu-mr-2"
                                :disabled="!rowScope.row._canUpdate"
                                @input="scope.patch(rowScope.row, {enabled: !rowScope.row.enabled})">
                            </el-switch>
                        </template>
                    </el-table-column>

                    <el-table-column fixed :label="i18n('report.report-title')" min-width="200" sortable="true">
                        <template slot-scope="scope">
                            <div v-html="scope.row.title" :data-test-id="'datatable-reports-report-name-' + scope.$index"></div>
                        </template>
                    </el-table-column>

                    <el-table-column min-width="230" :label="i18n('reports.emails')" sortable="true">
                        <template slot-scope="scope">
                            <div class="email-column" v-html="scope.row.emails.join(' ')" :data-test-id="'datatable-reports-emails-' + scope.$index"></div>
                        </template>
                    </el-table-column>

                    <el-table-column min-width="230" sortable="true" prop="dataColumn" :label="i18n('reports.metrics')">
                        <template v-slot="scope">
                            <div :data-test-id="'datatable-reports-data-' + scope.$index">
                                {{ scope.row.dataColumn }}
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column min-width="130" sortable="true" :label="i18n('reports.frequency')">
                        <template slot-scope="scope">
                            <span class="text-medium color-cool-gray-50" :data-test-id="'datatable-reports-frequency-' + scope.$index">
                                {{ i18n("reports." + scope.row.frequency) }}
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column min-width="250" :label="i18n('reports.time')" sortable="true">
                        <template slot-scope="scope">
                            <div class="bu-is-flex">
                                <div class="bu-is-flex-grow-1">
                                    <div class="is-created-by-col" :data-test-id="'datatable-reports-time-' + scope.$index">
                                        {{ scope.row.timeColumn }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column type="options" test-id="more-button-area">
                        <template v-slot="rowScope">
                            <cly-more-options
                                :test-id="'datatable-reports-' + rowScope.$index"
                                v-if="rowScope.row.hover"
                                size="small"
                                @command="handleReportEditCommand($event, rowScope)">
                                <el-dropdown-item
                                    v-if="rowScope.row._canUpdate"
                                    icon="el-icon-document-copy"
                                    command="edit-comment"
                                    :data-test-id="'edit-report-button-' + rowScope.$index">
                                    Edit
                                </el-dropdown-item>
                                <el-dropdown-item
                                    icon="el-icon-position"
                                    command="send-comment"
                                    :data-test-id="'send-now-report-button-' + rowScope.$index">
                                    Send Now
                                </el-dropdown-item>
                                <form name="previewemailform" method="post" target="_blank" :data-test-id="'previewemailform-report-button-' + rowScope.$index">
                                    <input type="hidden" name="auth_token">
                                </form>
                                <el-dropdown-item
                                    icon="el-icon-chat-dot-square"
                                    command="preview-comment"
                                    :data-test-id="'preview-report-button-' + rowScope.$index">
                                    Preview
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="rowScope.row._canDelete"
                                    icon="el-icon-delete"
                                    command="delete-comment"
                                    :data-test-id="'delete-report-button-' + rowScope.$index">
                                    Delete
                                </el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
                <template v-slot:bottomline="scope">
                    <cly-diff-helper :diff="scope.diff" @discard="scope.unpatch()" @save="updateStatus(scope)">
                    </cly-diff-helper>
                </template>
            </cly-datatable-n>
        </cly-section>
    </div>
</template>

<script>
import { i18nMixin, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { send } from '../store/index.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';

var FEATURE_NAME = "reports";

export default {
    mixins: [authMixin(FEATURE_NAME), i18nMixin],
    props: {
        callCreateReportDrawer: { type: Function, default: function() {} },
    },
    data: function() {
        return {
            localTableTrackedFields: ['enabled'],
            isAdmin: countlyGlobal.member.global_admin,
            deleteElement: null,
        };
    },
    computed: {
        tableRows: function() {
            return this.$store.getters["countlyReports/table/all"];
        },
        initialized: function() {
            return this.$store.getters["countlyReports/table/getInitialized"];
        },
        rawTableRows: function() {
            return this.$store.getters["countlyReports/table/all"];
        },
    },
    methods: {
        createReport: function() {
            this.callCreateReportDrawer();
        },
        handleReportEditCommand: function(command, scope) {
            switch (command) {
            case "edit-comment":
                var data = Object.assign({}, scope.row);
                if (data.title) {
                    data.title = countlyCommon.unescapeHtml(data.title);
                }
                delete data.operation;
                delete data.triggerEffectColumn;
                delete data.nameDescColumn;
                this.$parent.$parent.openDrawer("home", data);
                break;
            case "delete-comment":
                var self = this;
                this.deleteElement = scope.row;
                var deleteMessage = this.i18n("reports.confirm", "<b>" + this.deleteElement.title + "</b>");
                CountlyConfirm(deleteMessage, "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    self.$store.dispatch("countlyReports/deleteReport", self.deleteElement);
                });
                break;
            case "send-comment":
                send(scope.row._id).then(function(sendResult) {
                    if (sendResult && sendResult.result === "Success") {
                        notify({
                            message: this.i18n("reports.sent"),
                        });
                    }
                    else {
                        if (sendResult && sendResult.result) {
                            notify({
                                message: sendResult.result,
                                type: "error",
                            });
                        }
                        else {
                            notify({
                                message: (sendResult && sendResult.result) || this.i18n("reports.comment-error"),
                                type: "warning",
                            });
                        }
                    }
                });
                break;
            case "preview-comment":
                document.forms.previewemailform.action = '/i/reports/preview?args=' + JSON.stringify({_id: scope.row._id}) + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
                document.forms.previewemailform.querySelectorAll('input[type=hidden]')[0].value = countlyGlobal.auth_token;
                document.forms.previewemailform.submit();
                break;
            default:
                return;
            }
        },
        updateStatus: function(scope) {
            var diff = scope.diff;
            var status = {};
            diff.forEach(function(item) {
                status[item.key] = item.newValue;
            });
            var self = this;
            this.$store.dispatch("countlyReports/table/updateStatus", status).then(function() {
                return self.$store.dispatch("countlyReports/table/fetchAll");
            });
        },
        refresh: function() {},
    },
};
</script>
