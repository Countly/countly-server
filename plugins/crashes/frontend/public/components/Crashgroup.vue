<template>
    <div>
        <cly-header style="align-items: flex-start !important;">
            <template v-slot:header-top>
                <cly-back-link></cly-back-link>
            </template>
            <template v-slot:header-left>
                <div class="bu-is-flex bu-is-flex-direction-column">
                    <div class="bu-is-flex bu-is-align-items-center">
                        <h2 class="crashes-crashgroup-header__name bu-mr-2" v-html="crashgroupName"></h2>
                        <cly-guide></cly-guide>
                    </div>
                    <div class="bu-mt-4 bu-is-flex">
                        <crash-badge :type="badge.type" v-html="badge.content" v-for="badge in badges"></crash-badge>
                    </div>
                </div>
            </template>
            <template v-slot:header-right>
                <div class="bu-level-item">
                    <cly-dropdown class="bu-ml-2 crash-mark-as" ref="markDropdown" v-if="canUserUpdate">
                        <template v-slot:trigger="dropdown">
                            <cly-input-dropdown-trigger class="crash-mark-as__button text-button color-cool-gray-100"
                                selected-options="Mark As" :focused="dropdown.focused" :opened="dropdown.visible"
                                :disabled="beingMarked">
                            </cly-input-dropdown-trigger>
                        </template>
                        <div class="crash-mark-as__dropdown">
                            <li @click="markAs('resolved')" class="el-dropdown-menu__item" size="small"
                                v-if="!crashgroup.is_resolved">{{i18n("crashes.resolved")}}</li>
                            <li @click="markAs('resolving')" class="el-dropdown-menu__item" size="small"
                                v-if="!crashgroup.is_resolving">{{i18n("crashes.resolving")}}</li>
                            <li @click="markAs('unresolved')" class="el-dropdown-menu__item" size="small"
                                v-if="crashgroup.is_resolved || crashgroup.is_resolving">{{i18n("crashes.unresolved")}}</li>
                            <li @click="markAs('hidden')" class="el-dropdown-menu__item" size="small"
                                v-if="!crashgroup.is_hidden">{{i18n("crashes.hidden")}}</li>
                            <li @click="markAs('shown')" class="el-dropdown-menu__item" size="small"
                                v-if="crashgroup.is_hidden">{{i18n("crashes.shown")}}</li>
                        </div>
                    </cly-dropdown>
                    <cly-more-options @command="handleCrashgroupCommand($event)" class="bu-ml-2">
                        <component v-for="item in externalActionDropdownItems" :is="item.component"></component>
                        <el-dropdown-item command="view-user-list" v-if="userProfilesEnabled">{{i18n("userdata.list")}}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="canUserDelete" command="delete">{{i18n("crashes.action-delete")}}
                        </el-dropdown-item>
                    </cly-more-options>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <div v-loading="isLoading" v-if="isLoading" class="bu-mt-6"></div>
            <div v-else>
                <cly-section class="crashgroup-common-metrics" v-if="!!commonMetrics">
                    <div class="crashgroup-common-metrics__tiles-container bu-columns bu-is-gapless bu-is-mobile">
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth" :tooltip="i18n('crashes.help-platform')"
                            v-loading="commonMetrics.platform == undefined">
                            <template v-slot:title>Platform</template>
                            <template v-slot:value>{{commonMetrics.platform}}</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth" :tooltip="i18n('crashes.help-reports')"
                            v-loading="commonMetrics.occurrences == undefined">
                            <template v-slot:title>Occurrences</template>
                            <template v-slot:value>{{getShortNumber(commonMetrics.occurrences)}}</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth" :tooltip="i18n('crashes.help-affected')"
                            v-loading="commonMetrics.affectedUsers == undefined">
                            <template v-slot:title>Affected Users</template>
                            <template v-slot:value>{{getShortNumber(commonMetrics.affectedUsers)}}</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth" :tooltip="i18n('crashes.help-frequency')"
                            v-loading="commonMetrics.crashFrequency == undefined">
                            <template v-slot:title>Crash Frequency</template>
                            <template v-slot:value>{{commonMetrics.crashFrequency ? commonMetrics.crashFrequency.toFixed(2) : 0}}</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth"
                            :tooltip="i18n('crashes.help-latest-version')"
                            v-loading="commonMetrics.latestAppVersion == undefined">
                            <template v-slot:title>Latest App Version</template>
                            <template v-slot:value>{{commonMetrics.latestAppVersion}}</template>
                        </cly-crashes-dashboard-tile>
                    </div>
                </cly-section>
                <cly-section id="crash-tabs" v-if="!!(crashgroup && (crashgroup.error || crashgroupUnsymbolicatedStacktrace))">
                    <el-tabs class="crashgroup-detail-tabs" v-model="currentTab" type="card" style="border-radius: 4px;">
                        <el-tab-pane :label="i18n('crashes.stacktrace')" name="stacktrace">
                            <crash-stacktrace :code="(!showSymbolicated && crashgroupUnsymbolicatedStacktrace) ? crashgroupUnsymbolicatedStacktrace : crashgroup.error">
                                <template v-slot:header-left v-if="symbolicationEnabled">
                                    <div v-if="crashgroupUnsymbolicatedStacktrace">
                                        <el-switch v-model="showSymbolicated"></el-switch>
                                        <span class="text-small bu-ml-3">{{showSymbolicated ?
                                            i18n('crash_symbolication.symbolicate') :
                                            i18n('crash_symbolication.symbolicated')}}</span>
                                    </div>
                                </template>
                                <template v-slot:header-right>
                                    <cly-more-options @command="handleCrashgroupStacktraceCommand($event)">
                                        <el-dropdown-item v-if="symbolicationEnabled && !!crashgroup._symbol_id" command="symbolicate">
                                            <span>
                                                {{!crashgroupUnsymbolicatedStacktrace ? i18n("crash_symbolication.symbolicate_error") : i18n("crash_symbolication.resymbolicate")}}
                                            </span>
                                        </el-dropdown-item>
                                        <el-dropdown-item v-if="symbolicationEnabled && !crashgroup._symbol_id" :command="{url: '#/crash/symbols/'}">
                                            {{i18n("crash_symbolication.should-upload")}}
                                        </el-dropdown-item>
                                        <el-dropdown-item v-if="!!crashgroup.binary_images" :command="{url: '#/crashes/' + crashgroup._id + '/binary-images/' + crashgroup.lrid}">
                                            {{i18n("crashes.show-binary-images")}}
                                        </el-dropdown-item>
                                        <el-dropdown-item :command="{url: '/o/crashes/download_stacktrace?auth_token=' + authToken +'&app_id=' + appId + '&crash_id=' + crashgroup.lrid, download: true}">
                                            {{i18n("crashes.download-stacktrace")}}
                                        </el-dropdown-item>
                                    </cly-more-options>
                                </template>
                            </crash-stacktrace>
                        </el-tab-pane>
                        <el-tab-pane :label="i18n('crashes.all-threads')" name="threads" v-if="crashgroup.threads">
                            <el-collapse v-model="activeThreadPanels">
                                <el-collapse-item
                                    v-for="(thread, idx) in crashgroup.threads"
                                    :title="thread.name"
                                    :name="idx"
                                    :icon="{position: 'right', direction: 'down'}">
                                    <template v-slot:title>
                                        <div class="bu-px-4 bu-py-2">
                                            {{thread.name}}
                                            <span v-if="thread.crashed" class="bu-tag text-uppercase crash-badge crash-badge--negative">{{i18n("crashes.crashed")}}</span>
                                        </div>
                                    </template>
                                    <div class="bu-px-4">
                                        <pre class="crashgroup-thread-content"><code>{{thread.error.trim()}}</code></pre>
                                    </div>
                                </el-collapse-item>
                            </el-collapse>
                        </el-tab-pane>
                        <el-tab-pane name="comments">
                            <span slot="label">
                                {{i18n("crashes.comments")}} <span class="bu-tag"
                                    style="background-color: #A7AEB8; font-size: 13px; font-weight: 500;">{{comments.length}}</span>
                            </span>
                            <div class="bu-mx-5 bu-is-flex bu-is-flex-direction-column bu-is-align-items-center"
                                v-if="comments.length === 0">
                                <img class="bu-mb-2" style="margin-top: 32px; height: 76px;"
                                    src="../assets/images/no-comments.svg" />
                                <div class="bu-mb-1">
                                    <h4>{{i18n("crashes.no-comments-yet")}}</h4>
                                </div>
                                <div class="text-small color-cool-gray-50">{{i18n("crashes.no-comments-yet-long")}}</div>
                            </div>
                            <el-card class="bu-mx-5 bu-p-4" shadow="never" :body-style="{padding: '0px'}"
                                v-for="comment in comments">
                                <div class="bu-is-flex bu-is-flex-direction-column">
                                    <div
                                        class="bu-is-flex bu-is-flex-direction-row bu-is-justify-content-space-between bu-mb-4">
                                        <div class="bu-is-flex bu-is-flex-direction-column">
                                            <div class="text-medium">{{comment.author}}</div>
                                            <div class="text-small color-cool-gray-50" v-html="formatTimeAgo(comment.time)">
                                            </div>
                                        </div>
                                        <div>
                                            <cly-more-options @command="handleCommentCommand($event, comment)"
                                                v-if="commentIsMine(comment)">
                                                <el-dropdown-item command="edit-comment">{{i18n("crashes.edit")}}
                                                </el-dropdown-item>
                                                <el-dropdown-item command="delete-comment">{{i18n("crashes.action-delete")}}
                                                </el-dropdown-item>
                                            </cly-more-options>
                                        </div>
                                    </div>
                                    <div class="text-medium">
                                        {{comment.text}}
                                    </div>
                                </div>
                                <div>
                                </div>
                            </el-card>
                            <div class="bu-m-5 comment-box" style="margin-top: 38px !important;">
                                <el-input v-if="canUserCreate" type="textarea" autosize placeholder="Enter your comment"
                                    v-model="commentInput"></el-input>
                                <div class="bu-level bu-mt-3" style="margin-top: 16px !important;">
                                    <div class="bu-left">
                                    </div>
                                    <div class="bu-right">
                                        <div v-if="!!commentBeingEdited">
                                            <el-button size="small" type="primary" @click="stopEditingComment">
                                                {{i18n("crashes.cancel")}}</el-button>
                                            <el-button size="small" v-if="canUserUpdate" type="primary"
                                                @click="saveComment">{{i18n("common.save")}}</el-button>
                                        </div>
                                        <div v-else-if="!!commentInput  || comments.length === 0">
                                            <el-button class="icon-button" v-if="canUserCreate" type="success" size="small"
                                                @click="saveComment">{{i18n("crashes.add_comment")}}</el-button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </cly-section>
                <cly-section class="crashgroup-mobile-diagnostics" :title="i18n('crashes.crash-metrics')"
                    v-if="!!mobileMetrics">
                    <div class="crashgroup-mobile-diagnostics__tiles-container bu-columns bu-is-gapless bu-is-mobile">
                        <cly-crashes-dashboard-tile columnWidth="is-one-fifth" v-for="diagnosticKey in diagnosticsOrder">
                            <div
                                class="crashgroup-mobile-diagnostics__tile-content bu-column bu-columns bu-py-0 bu-my-0 bu-mx-1 bu-is-flex-direction-column bu-is-justify-content-space-between">
                                <div class="text-medium text-uppercase">{{diagnosticKey}} <cly-tooltip-icon
                                        icon="ion-help-circled" :tooltip="mobileDiagnostics[diagnosticKey].tooltip">
                                    </cly-tooltip-icon>
                                </div>
                                <div>
                                    <div class="bu-is-flex bu-is-align-items-baseline">
                                        <h2>{{(mobileDiagnostics[diagnosticKey].average ? mobileDiagnostics[diagnosticKey].average.toFixed(2) : 0) + ("unit" in
                                            mobileDiagnostics[diagnosticKey] ? "" : "%")}}</h2>
                                        <h4 class="bu-ml-2" v-if="'unit' in mobileDiagnostics[diagnosticKey]">
                                            {{mobileDiagnostics[diagnosticKey].unit}}</h4>
                                    </div>
                                    <div class="text-small color-cool-gray-50">{{i18n('crashes.average')}}</div>
                                </div>
                                <div style="padding-top: 16px;"
                                    class="bu-columns bu-m-0 bu-is-justify-content-space-between">
                                    <div>
                                        {{mobileDiagnostics[diagnosticKey].min ? mobileDiagnostics[diagnosticKey].min.toFixed(2) : 0}}
                                        <div class="text-small color-cool-gray-50">{{i18n('crashes.minimum')}}</div>
                                    </div>
                                    <div>
                                        {{mobileDiagnostics[diagnosticKey].max ? mobileDiagnostics[diagnosticKey].max.toFixed(2) : 0}}
                                        <div class="text-small color-cool-gray-50">{{i18n('crashes.maximum')}}</div>
                                    </div>
                                </div>
                            </div>
                        </cly-crashes-dashboard-tile>
                    </div>
                </cly-section>
                <cly-section class="crashgroup-mobile-metrics" v-if="!!mobileMetrics">
                    <div class="crashgroup-mobile-metrics__tiles-container bu-columns bu-is-gapless bu-is-mobile">
                        <cly-crashes-dashboard-tile columnWidth="3" :tooltip="i18n('crashes.help-root')" showDonut
                            :donutPercentage="mobileMetrics.rootedPercent || 0">
                            <template v-slot:title>{{i18n('crashes.root')}}</template>
                            <template v-slot:value>{{mobileMetrics.rootedPercent ? mobileMetrics.rootedPercent.toFixed(2) : 0}}%</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="3" :tooltip="i18n('crashes.help-online')" showDonut
                            :donutPercentage="mobileMetrics.onlinePercent || 0">
                            <template v-slot:title>{{i18n('crashes.online')}}</template>
                            <template v-slot:value>{{mobileMetrics.onlinePercent ? mobileMetrics.onlinePercent.toFixed(2) : 0}}%</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile columnWidth="3" :tooltip="i18n('crashes.help-muted')" showDonut
                            :donutPercentage="mobileMetrics.mutedPercent || 0">
                            <template v-slot:title>{{i18n('crashes.muted')}}</template>
                            <template v-slot:value>{{mobileMetrics.mutedPercent ? mobileMetrics.mutedPercent.toFixed(2) : 0}}%</template>
                        </cly-crashes-dashboard-tile>
                        <cly-crashes-dashboard-tile class="has-ellipsis" columnWidth="3"
                            :tooltip="i18n('crashes.help-background')" showDonut
                            :donutPercentage="mobileMetrics.backgroundPercent || 0">
                            <template v-slot:title>{{i18n('crashes.background')}}</template>
                            <template v-slot:value>{{mobileMetrics.backgroundPercent ? mobileMetrics.backgroundPercent.toFixed(2) : 0}}%</template>
                        </cly-crashes-dashboard-tile>
                    </div>
                </cly-section>
                <cly-section>
                    <template v-slot:header>
                        <span class="bu-mr-2">{{i18n('crashes.crash-occurences-by', crashgroup.nonfatal ?
                            i18n('crashes.nonfatal') : i18n('crashes.fatal'))}}</span>
                        <el-select v-model="chartBy" @change="handleChartByChange">
                            <el-option v-for="item in chartByOptions"  :key="item.value" :label="item.label"
                                :value="item.value"></el-option>
                        </el-select>
                        <cly-date-picker
                        timestampFormat="ms"
                        :display-shortcuts="true"
                        v-model="pickerDate"
                        label-mode-prop="absolute"
                        :allow-presets="false"
                        @change="handleDatePickerChange"
                        class="bu-ml-2"
                    >
                    </cly-date-picker>
                    </template>
                    <p class="text-small color-cool-gray-50 bu-pl-3">{{i18n('crashes.crash-occurences-description')}}</p>
                    <cly-chart-bar  v-loading="isLoadingGraph" :force-loading="isLoadingGraph" :option="chartData()" :legend="{show: true}" ></cly-chart-bar>
                </cly-section>
                <cly-section :title="i18n('crashes.crash-occurences')" class="recent-crash-occurences">
                    <p class="text-small color-cool-gray-50 bu-pl-3">{{i18n('crashes.recent-crash-occurances-description',currentLimit)}}</p>
                    <cly-datatable-n :force-loading="isLoading" :rows="crashes" :exportFormat="formatExportFunction" ref="tableData" @row-click="handleRowClick" row-class-name="bu-is-clickable" :defaultSort="{}">
                        <template v-slot:header-left="filterScope">
                            <cly-multi-select v-model="userFilter" :fields="userFilterFields"></cly-multi-select>
                        </template>
                        <template v-slot="scope">
                            <el-table-column type="expand">
                                <template slot-scope="props">
                                    <el-card class="bu-mb-5" shadow="never" :body-style="{padding: '0px'}">
                                        <div class="bu-columns bu-is-gapless bu-is-mobile">
                                            <cly-crashes-dashboard-tile :columnWidth="props.row.custom ? 3 : 4">
                                                <div class="bu-p-5 bu-is-align-self-flex-start">
                                                    <div class="text-medium text-uppercase font-weight-bold">
                                                        {{i18n('crashes.build_info')}}</div>
                                                    <pre class="crash-pre">{{crashMetric(props.row, "build_info")}}</pre>
                                                </div>
                                            </cly-crashes-dashboard-tile>
                                            <cly-crashes-dashboard-tile :columnWidth="props.row.custom ? 3 : 4">
                                                <div class="bu-p-5 bu-is-align-self-flex-start">
                                                    <div class="text-medium text-uppercase font-weight-bold">
                                                        {{i18n('crashes.device')}}</div>
                                                    <pre class="crash-pre">{{crashMetric(props.row, "device")}}</pre>
                                                </div>
                                            </cly-crashes-dashboard-tile>
                                            <cly-crashes-dashboard-tile :columnWidth="props.row.custom ? 3 : 4">
                                                <div class="bu-p-5 bu-is-align-self-flex-start">
                                                    <div class="text-medium text-uppercase font-weight-bold">
                                                        {{i18n('crashes.state')}}</div>
                                                    <pre class="crash-pre">{{crashMetric(props.row, "device_state")}}</pre>
                                                </div>
                                            </cly-crashes-dashboard-tile>
                                            <cly-crashes-dashboard-tile columnWidth="4" v-if="props.row.custom">
                                                <div class="bu-p-5 bu-is-align-self-flex-start">
                                                    <div class="text-medium text-uppercase font-weight-bold">
                                                        {{i18n('crashes.custom')}}</div>
                                                    <pre class="crash-pre">{{crashMetric(props.row, "custom")}}</pre>
                                                </div>
                                            </cly-crashes-dashboard-tile>
                                        </div>
                                    </el-card>
                                    <el-card class="bu-mb-5" shadow="never" :body-style="{padding: '0px'}">
                                        <crash-stacktrace :code="(!showSymbolicated && props.row.olderror) ? props.row.olderror : props.row.error">
                                            <template v-slot:header-left>
                                                <div>
                                                    <span class="text-medium bu-mr-3 text-uppercase font-weight-bold">
                                                        {{i18n("crashes.stacktrace")}}
                                                    </span>
                                                </div>
                                                <div v-if="!!props.row.symbolicated">
                                                    <el-switch v-model="showSymbolicated"></el-switch>
                                                    <span class="text-small bu-ml-3">{{showSymbolicated ?
                                                        i18n('crash_symbolication.symbolicate') :
                                                        i18n('crash_symbolication.symbolicated')}}</span>
                                                </div>
                                            </template>
                                            <template v-slot:header-right>
                                                <cly-more-options @command="handleCrashStacktraceCommand($event, props.row)">
                                                    <el-dropdown-item v-if="!!props.row.binary_images" :command="{url: '#/crashes/' + crashgroup._id + '/binary-images/' + props.row._id}">
                                                        {{i18n('crashes.show-binary-images')}}
                                                    </el-dropdown-item>
                                                    <el-dropdown-item :command="{url: '/o/crashes/download_stacktrace?auth_token=' + authToken +'&app_id=' + appId + '&crash_id=' + props.row._id, download: true}">
                                                        {{i18n('crashes.download-stacktrace')}}
                                                    </el-dropdown-item>
                                                </cly-more-options>
                                            </template>
                                        </crash-stacktrace>
                                    </el-card>
                                    <el-card class="bu-mb-5" shadow="never" :body-style="{padding: '0px'}"
                                        v-if="eventLogsEnabled">
                                        <div class="bu-p-5 bu-is-align-self-flex-start">
                                            <div class="bu-level bu-is-mobile">
                                                <div class="bu-level-left">
                                                    <div class="text-medium text-uppercase font-weight-bold">
                                                        {{i18n('crashes-event-logs.title')}}</div>
                                                </div>
                                                <div class="bu-level-right">
                                                    <el-button type="primary"
                                                        :loading="isEventLogBeingGeneratedFor(props.row._id)"
                                                        @click="generateEventLogs(props.row._id)">
                                                        {{!props.row.eventlog ? i18n('crashes-event-logs.generate') :
                                                        i18n('crashes-event-logs.regenerate')}}
                                                    </el-button>
                                                </div>
                                            </div>
                                            <pre class="crash-pre">{{crashEventLog(props.row._id)}}</pre>
                                        </div>
                                    </el-card>
                                    <el-card class="bu-mb-5" shadow="never" :body-style="{padding: '0px'}"
                                        v-if="!!props.row.logs">
                                        <div class="bu-p-5 bu-is-align-self-flex-start">
                                            <div class="text-medium text-uppercase font-weight-bold">
                                                {{i18n('crashes.sdk-logs')}}</div>
                                            <pre class="crash-pre">{{props.row.logs}}</pre>
                                        </div>
                                    </el-card>
                                </template>
                            </el-table-column>
                            <el-table-column prop="ts" :label="i18n('crashes.crashed')" sortable>
                                <template slot-scope="col">
                                    <span v-html="formatTimeAgo(col.row.ts)"></span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="os" :label="i18n('crashes.os_version')">
                                <template slot-scope="col">
                                    {{col.row.os}} {{col.row.os_version}}
                                </template>
                            </el-table-column>
                            <el-table-column prop="device" :label="i18n('crashes.device')" sortable></el-table-column>
                            <el-table-column prop="app_version" :label="i18n('crashes.app_version')" sortable sort-by="app_version_for_sort">
                            </el-table-column>
                            <el-table-column v-if="hasUserPermission" :label="i18n('crashes.user')">
                                <template slot-scope="col">
                                    {{col.row.user && col.row.user.name || col.row.uid}}
                                    <a class="crash-user-profile-link" :href="'/#/users/' + col.row.uid"><i
                                            class="fas fa-arrow-circle-right"></i></a>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>
            </div>
        </cly-main>
        <component v-for="item in externalDialogs" :is="item.component"></component>
        <el-dialog
            :visible.sync="symbolicationErrorDialog.show"
            :title="i18n('crash_symbolication.symbolication-failed')"
            width="400px">
            <div class="bu-is-flex-direction-column">
                <cly-notification
                    :closable="false"
                    color="light-destructive"
                    :text="symbolicationErrorDialog.msg" />
            </div>
        </el-dialog>
    </div>
</template>

<script>
import jQuery from 'jquery';
import { i18nMixin, authMixin, i18n as cvI18n, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { confirm as CountlyConfirm, alert as CountlyAlert, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyCrashes from '../store/index.js';
import CrashStacktrace from './CrashStacktrace.vue';
import CrashBadge from './CrashBadge.vue';

var FEATURE_NAME = 'crashes';

export default {
    components: {"crash-stacktrace": CrashStacktrace, "crash-badge": CrashBadge},
    mixins: [
        i18nMixin,
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        dataMixin({
            externalActionDropdownItems: "crashes/external/actionDropdownItems",
            externalDialogs: "crashes/external/dialogs",
            externalActions: "crashes/external/actionDropdownItems/actions"
        })
    ],
    props: {
        groupId: {type: String, default: ''}
    },
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            authToken: countlyGlobal.auth_token,
            chartBy: "os_version",
            diagnosticsOrder: ["ram", "disk", "battery", "running", "sessions"],
            eventLogsEnabled: countlyGlobal.plugins.includes("crashes-event-logs"),
            eventLogsBeingGenerated: [],
            currentTab: "stacktrace",
            commentInput: "",
            commentBeingEdited: undefined,
            commentStatus: undefined,
            symbolicationEnabled: countlyGlobal.plugins.includes("crash_symbolication"),
            crashesBeingSymbolicated: [],
            beingMarked: false,
            pickerDate: '7days',
            userProfilesEnabled: countlyGlobal.plugins.includes("users"),
            hasUserPermission: validateRead('users'),
            showSymbolicated: false,
            activeThreadPanels: [],
            symbolicationErrorDialog: {
                show: false,
                msg: '',
            },
        };
    },
    computed: {
        currentLimit: function() {
            return countlyGlobal.crashes_report_limit || 100;
        },
        crashgroup: function() {
            return this.$store.getters["countlyCrashes/crashgroup/crashgroup"];
        },
        crashgroupName: function() {
            return this.$store.getters["countlyCrashes/crashgroup/crashgroupName"];
        },
        crashgroupUnsymbolicatedStacktrace: function() {
            return this.$store.getters["countlyCrashes/crashgroup/crashgroupUnsymbolicatedStacktrace"];
        },
        comments: function() {
            return ("comments" in this.crashgroup) ? this.crashgroup.comments : [];
        },
        commonMetrics: function() {
            return this.$store.getters["countlyCrashes/crashgroup/commonMetrics"];
        },
        mobileDiagnostics: function() {
            return this.$store.getters["countlyCrashes/crashgroup/mobileDiagnostics"];
        },
        mobileMetrics: function() {
            return this.$store.getters["countlyCrashes/crashgroup/mobileMetrics"];
        },
        chartByOptions: function() {
            return this.$store.getters["countlyCrashes/crashgroup/chartByOptions"];
        },
        crashes: function() {
            return this.$store.getters["countlyCrashes/crashgroup/crashes"];
        },
        badges: function() {
            return countlyCrashes.generateBadges(this.$store.getters["countlyCrashes/crashgroup/crashgroup"]);
        },
        userFilter: {
            set: function(newValue) {
                return this.$store.dispatch("countlyCrashes/crashgroup/setUserFilter", newValue);
            },
            get: function() {
                return this.$store.getters["countlyCrashes/crashgroup/userFilter"];
            }
        },
        userFilterFields: function() {
            var platforms = [{value: "all", label: "All Platforms"}];
            this.$store.getters["countlyCrashes/crashgroup/platforms"].forEach(function(platform) {
                platforms.push({value: platform, label: platform});
            });

            var appVersions = [{value: "all", label: "All Versions"}];
            this.$store.getters["countlyCrashes/crashgroup/appVersions"].forEach(function(appVersion) {
                appVersions.push({value: appVersion, label: appVersion.replace(/:/g, ".")});
            });

            return [
                {
                    label: "Platforms",
                    key: "platform",
                    options: platforms,
                    default: "all"
                },
                {
                    label: "Versions",
                    key: "version",
                    items: appVersions,
                    default: "all"
                },
            ];
        },
        isLoading: function() {
            return this.$store.getters['countlyCrashes/crashgroup/isLoading'];
        },
        isLoadingGraph: function() {
            return this.$store.getters['countlyCrashes/crashgroup/isGraphLoading'];
        }
    },
    methods: {
        refresh: function() {
            return this.$store.dispatch("countlyCrashes/crashgroup/refresh");
        },
        chartData: function() {
            return this.$store.getters["countlyCrashes/crashgroup/chartData"](this.$data.chartBy);
        },
        handleCommentCommand: function(command, comment) {
            if (command === "edit-comment") {
                this.$data.commentInput = comment.text;
                this.$data.commentBeingEdited = comment;
            }
            else if (command === "delete-comment") {
                this.$store.dispatch("countlyCrashes/crashgroup/deleteComment", comment._id);
            }
        },
        stopEditingComment: function() {
            this.$data.commentInput = "";
            this.$data.commentBeingEdited = undefined;
        },
        saveComment: function() {
            var self = this;
            if (typeof this.$data.commentBeingEdited !== "undefined") {
                this.$store.dispatch("countlyCrashes/crashgroup/editComment", {comment_id: this.$data.commentBeingEdited._id, text: this.$data.commentInput})
                    .then(function() {
                        self.$data.commentBeingEdited = undefined;
                        self.$data.commentInput = "";
                    });
            }
            else {
                this.$store.dispatch("countlyCrashes/crashgroup/addComment", this.$data.commentInput)
                    .then(function() {
                        self.$data.commentInput = "";
                    });
            }
        },
        handleRowClick: function(row) {
            var noTextSelected = window.getSelection().toString().length === 0;
            var targetIsOK = !event.target.closest('a');

            if (noTextSelected && targetIsOK) {
                this.$refs.tableData.$refs.elTable.toggleRowExpansion(row);
            }
        },
        generateEventLogs: function(cid) {
            var self = this;
            if (this.$data.eventLogsEnabled) {
                if (!this.$data.eventLogsBeingGenerated.includes(cid)) {
                    this.$data.eventLogsBeingGenerated.push(cid);
                    this.$store.dispatch("countlyCrashes/crashgroup/generateEventLogs", [cid])
                        .then(function() {
                            self.$forceUpdate();
                        })
                        .finally(function() {
                            self.$data.eventLogsBeingGenerated = self.$data.eventLogsBeingGenerated.filter(function(ecid) {
                                return cid !== ecid;
                            });
                        });
                }
            }
        },
        isEventLogBeingGeneratedFor: function(cid) {
            return this.$data.eventLogsBeingGenerated.includes(cid);
        },
        symbolicateCrash: function(crash) {
            var self = this;

            if (!this.symbolicationEnabled) {
                return;
            }

            if (crash === "group") {
                crash = {
                    _id: this.crashgroup._id,
                    os: this.crashgroup.os,
                    native_cpp: this.crashgroup.native_cpp,
                    app_version: this.crashgroup.latest_version,
                    symbol_id: this.crashgroup._symbol_id
                };
            }

            if (this.crashesBeingSymbolicated.indexOf(crash._id) === -1) {
                this.crashesBeingSymbolicated.push(crash._id);
                this.$store.dispatch("countlyCrashes/crashgroup/symbolicate", crash)
                    .then(function() {
                        notify({
                            title: cvI18n("crash_symbolication.symbolication-processed"),
                            message: cvI18n("crash_symbolication.symbolication-processed")
                        });
                        self.refresh();
                    })
                    .catch(function(err) {
                        if (err.responseJSON) {
                            self.symbolicationErrorDialog.msg = err.responseJSON.result;
                        }
                        else {
                            self.symbolicationErrorDialog.msg = err.statusText;
                        }
                        self.symbolicationErrorDialog.show = true;
                    })
                    .finally(function() {
                        self.crashesBeingSymbolicated = self.crashesBeingSymbolicated.filter(function(cid) {
                            return cid !== crash._id;
                        });
                    });
            }
        },
        isCrashBeingSymbolicated: function(cid) {
            return this.crashesBeingSymbolicated.indexOf(cid) !== -1;
        },
        crashMetric: function(crash, metric) {
            var crashMetrics;

            if (metric === "build_info") {
                crashMetrics = "App Version: " + crash.app_version;
                if (crash.os === "iOS") {
                    crashMetrics += "\nApp Build ID: " + crash.app_build;
                }
            }
            else if (metric === "device") {
                crashMetrics = crash.os;
                if (crash.os_version) {
                    crashMetrics += " " + crash.os_version;
                }

                if (crash.manufacture) {
                    crashMetrics += "\n" + crash.manufacture + " ";
                }
                else {
                    crashMetrics += "\n";
                }

                if (crash.device) {
                    crashMetrics += (window.countlyDeviceList && window.countlyDeviceList[crash.device]) || crash.device;
                }

                if (crash.cpu) {
                    crashMetrics += " (" + crash.cpu + ")";
                }

                if (crash.opengl) {
                    crashMetrics += "\nOpenGL Version: " + crash.opengl;
                }

                if (crash.resolution) {
                    crashMetrics += "\nResolution: " + crash.resolution;
                }

                if ("root" in crash) {
                    crashMetrics += "\nRooted / Jailbroken: " + (crash.root ? "yes" : "no");
                }
            }
            else if (metric === "device_state") {
                crashMetrics = "";

                if ("ram_current" in crash) {
                    crashMetrics = "RAM: " + crash.ram_current + "/" + crash.ram_total + " MB\n";
                }

                if ("disk_current" in crash) {
                    crashMetrics += "Disk: " + crash.disk_current + "/" + crash.disk_total + " MB\n";
                }

                if ("bat_current" in crash) {
                    crashMetrics += "Battery: " + crash.bat_current + "%\n";
                }

                if ("run" in crash) {
                    crashMetrics += "Run time: " + countlyCommon.timeString(crash.run / 60) + "\n";
                }

                if ("session" in crash) {
                    crashMetrics += "Sessions: " + crash.session + "\n";
                }

                crashMetrics += "Online: " + (crash.online ? "yes" : "no") + "\n";
                crashMetrics += "Background: " + (crash.background ? "yes" : "no") + "\n";
                crashMetrics += "Muted: " + (crash.muted ? "yes" : "no");
            }
            else if (metric === "custom") {
                crashMetrics = Object.keys(crash.custom).map(function(customKey) {
                    return customKey + ": " + crash.custom[customKey];
                }).join("\n");
            }

            return crashMetrics;
        },
        crashEventLog: function(cid) {
            return this.$store.getters["countlyCrashes/crashgroup/crashEventLog"](cid);
        },
        commentIsMine: function(comment) {
            return comment.author_id === countlyGlobal.member._id || countlyGlobal.member.global_admin;
        },
        markAs: function(state) {
            var self = this;
            var ajaxPromise;

            this.$refs.markDropdown.doClose();

            if (this.beingMarked) {
                return;
            }

            if (state === "resolved") {
                this.beingMarked = true;
                ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markResolved");
            }
            else if (state === "resolving") {
                this.beingMarked = true;
                ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markResolving");
            }
            else if (state === "unresolved") {
                this.beingMarked = true;
                ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markUnresolved");
            }
            else if (state === "hidden") {
                this.beingMarked = true;
                ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/hide");
            }
            else if (state === "shown") {
                this.beingMarked = true;
                ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/show");
            }

            if (typeof ajaxPromise !== "undefined") {
                ajaxPromise.finally(function() {
                    self.beingMarked = false;

                    notify({
                        title: jQuery.i18n.map["configs.changed"],
                        message: jQuery.i18n.map["configs.saved"]
                    });
                });
            }
        },
        handleCrashgroupCommand: function(command) {
            var self = this;

            if (command === "view-user-list") {
                var params = {
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: "crashes",
                    group: this.crashgroup._id,
                    userlist: true
                };

                window.location.hash = "/users/request/" + JSON.stringify(params);
            }
            else if (command === "delete") {
                CountlyConfirm(jQuery.i18n.prop("crashes.confirm-delete", 1), "red", function(result) {
                    if (result) {
                        self.$store.dispatch("countlyCrashes/crashgroup/delete")
                            .then(function(data) {
                                if (!data) {
                                    CountlyAlert(jQuery.i18n.map["crashes.try-later"], "red");
                                }
                                else {
                                    window.history.back();
                                }
                            });
                    }
                });
            }
            else {
                var action = this.externalActions.find(item => {
                    return item.name === 'create-issue';
                });
                if (action) {
                    action.handler(this);
                }
            }
        },
        handleChartByChange: function(value) {
            this.$store.dispatch("countlyCrashes/crashgroup/fetchBarData", {value: value, period: this.pickerDate});
        },
        handleDatePickerChange: function(value) {
            this.pickerDate = value.value;
            this.$store.dispatch("countlyCrashes/crashgroup/fetchBarData", {value: this.chartBy, period: this.pickerDate});
        },
        handleCrashgroupStacktraceCommand: function(command) {
            if (command === "symbolicate") {
                this.symbolicateCrash('group');
            }
        },
        handleCrashStacktraceCommand: function(command, crash) {
            if (command === "symbolicate") {
                this.symbolicateCrash(crash);
            }
        },
        formatExportFunction: function() {
            var tableData = this.crashes;
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[cvI18n('crashes.crashed').toUpperCase()] = countlyCommon.formatTimeAgoText(tableData[i].ts).text;
                item[cvI18n('crashes.os_version').toUpperCase()] = tableData[i].os + tableData[i].os_version;
                item[cvI18n('crashes.device').toUpperCase()] = tableData[i].device;
                item[cvI18n('crashes.app_version').toUpperCase()] = tableData[i].app_version;
                item[cvI18n('crashes.user').toUpperCase()] = tableData[i].user && tableData[i].user.name || tableData[i].uid;
                item[cvI18n('crashes.detail').toUpperCase()] = tableData[i].name;

                table.push(item);
            }
            return table;
        },
    },
    beforeCreate: function() {
        return this.$store.dispatch("countlyCrashes/crashgroup/initialize", this.$route.params.groupId);
    },
    mounted: function() {
        if (this.symbolicationEnabled) {
            this.showSymbolicated = true;
        }
    }
};
</script>
