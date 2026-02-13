<template>
<div>
    <cly-datatable-n
        class="cly-vue-hook-table is-clickable hook-error-table"
        :rows="tableRows"
        :resizable="false"
        :force-loading="!detailLogsInitialized">
        <template v-slot="scope">
            <el-table-column type="expand" class="hook-log-column">
                <template v-slot="props">
                    <div class="bu-is-flex bu-is-flex-direction-column hook-logs-card">
                        <div class="bu-level bu-mb-5">
                            <div class="bu-level-left text-medium font-weight-bold">{{i18n("hooks.stacktrace")}}</div>
                            <div class="bu-level-right is-clickable" style="text-decoration: underline;cursor: pointer;"
                                @click="downloadLog(props.row.e, props.row.timestamp)">{{i18n("hooks.download-stacktrace")}}</div>
                        </div>
                        <pre class="bu-is-flex bu-flex-wrap">
                            <span class="hook-log-lines-bar">{{props.row._lines}}</span>
                            <code class="hook-log-code">{{props.row.e}}</code>
                        </pre>
                    </div>
                </template>
            </el-table-column>

            <el-table-column :label="i18n('hooks.time')" sortable="true">
                <template slot-scope="scope" sortable="true">
                    <div>{{scope.row.timestamp_string}}</div>
                </template>
            </el-table-column>
            <el-table-column align="left" :label="i18n('hooks.action-step')" sortable="true">
                <template slot-scope="scope" sortable="true">
                    <div>
                        {{scope.row.effectStep}}
                    </div>
                </template>
            </el-table-column>

            <el-table-column :label="i18n('hooks.trigger-data')" width="352" sortable="true" class="params-column">
                <template slot-scope="scope" sortable="true">
                    <div>
                        <pre class='code-pre-line'>{{scope.row._originalInput}} </pre>
                    </div>
                </template>
            </el-table-column>

            <el-table-column :label="i18n('hooks.action-data')" width="352" sortable="true">
                <template slot-scope="scope" sortable="true">
                    <div>
                        <pre class='code-pre-line'>{{scope.row.params}} </pre>
                    </div>
                </template>
            </el-table-column>

        </template>

    </cly-datatable-n>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyDatatableN,
    },
    computed: {
        tableRows: function() {
            var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
            hookDetail.error_logs = hookDetail.error_logs && hookDetail.error_logs.reverse();
            return hookDetail.error_logs || [];
        },
        detailLogsInitialized: function() {
            var result = this.$store.getters["countlyHooks/getDetailLogsInitialized"];
            return result;
        },
        hookDetail: function() {
            var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
            return hookDetail;
        }
    },
    data: function() {
        return {
        };
    },
    methods: {
        refresh: function() {
        },
        downloadLog: function(text, timestamp) {
            var element = document.createElement('a');
            var fileName = 'HookError-' + this.hookDetail._id + '-' + timestamp + '.txt';
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', fileName);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        }
    }
};
</script>
