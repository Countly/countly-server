<template>
    <div>
        <cly-header :title="i18n('errorlogs.title')" />
        <cly-main>
            <cly-section>
                <div class="routename-errorlogs__dropdown-frame">
                    <el-select
                        v-model="selectLog"
                        class="bu-m-3"
                        @change="changeLog"
                    >
                        <el-option
                            v-for="item in logList"
                            :key="item.value"
                            :value="item.value"
                            :label="item.name"
                        />
                    </el-select>
                </div>
                <div class="bu-p-5">
                    <el-link
                        class="bu-is-underlined bu-is-pulled-right bu-ml-4"
                        data-test-id="clear-log-button"
                        @click="clear"
                    >
                        {{ i18n('errorlogs.clear') }}
                    </el-link>
                    <form
                        name="errorlogsform"
                        method="post"
                        :action="downloadLink"
                        target="_blank"
                    >
                        <input
                            type="hidden"
                            name="auth_token"
                            :value="authToken"
                        >
                    </form>
                    <a @click="download">
                        <el-link
                            class="bu-is-underlined bu-is-pulled-right"
                            data-test-id="download-link-button"
                        >
                            {{ i18n('errorlogs.download') }}
                        </el-link>
                    </a>
                </div>
                <div
                    data-test-id="table-logs"
                    class="routename-errorlogs__scroll-down"
                >
                    <pre class="bu-px-5 bu-pb-4">{{ cachedLog.data }}</pre>
                </div>
            </cly-section>
        </cly-main>
    </div>
</template>
<script>
import jQuery from 'jquery';
import { i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, alert as CountlyAlert } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyErrorLogs from '../store/index.js';

export default {
    mixins: [i18nMixin, autoRefreshMixin],
    props: {
        query: {
            default: "api"
        }
    },
    data: function() {
        return {
            selectLog: this.query || "api",
            downloadLink: countlyGlobal.path + "/o/errorlogs?download=true&log=" + (this.query || "api"),
            logList: [{name: jQuery.i18n.map["errorlogs.api-log"] || "Api Log", value: "api"}],
            authToken: countlyGlobal.auth_token,
            cachedLog: {}
        };
    },
    created: function() {
        var self = this;
        return Promise.all([countlyErrorLogs.initialize(), countlyErrorLogs.getLogByName(this.query || "api")])
            .then(function() {
                self.logList = countlyErrorLogs.getLogNameList();
                self.cachedLog = countlyErrorLogs.getLogCached();
            });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                return Promise.resolve(countlyErrorLogs.getLogByName(this.selectLog))
                    .then(function() {
                        self.cachedLog = countlyErrorLogs.getLogCached();
                    });
            }
        },
        changeLog: function(value) {
            this.downloadLink = countlyGlobal.path + "/o/errorlogs?download=true&log=" + value;
            app.navigate("#/manage/logs/errorlogs/" + value);
            this.refresh(true);
        },
        clear: function() {
            var self = this;
            CountlyConfirm(jQuery.i18n.map["errorlogs.confirm-delete-" + self.selectLog] || jQuery.i18n.map["errorlogs.confirm-delete"], "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                Promise.resolve(countlyErrorLogs.del(self.selectLog)).then(function(resData) {
                    if (resData.result === "Success") {
                        Promise.resolve(countlyErrorLogs.initialize()).then(function() {
                            countlyErrorLogs.getLogByName(self.selectLog, function() {
                                self.refresh(true);
                            });
                        });
                    }
                    else {
                        CountlyAlert(resData.result, "red");
                    }
                });
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["common.yes-clear-it"]], {title: jQuery.i18n.map["errorlogs.confirm-delete-" + self.selectLog + "-title"] || jQuery.i18n.map["errorlogs.confirm-delete-title"], image: "clear-api-logs"});
        },
        download: function() {
            document.forms.errorlogsform.submit();
            return false;
        }
    }
};
</script>
