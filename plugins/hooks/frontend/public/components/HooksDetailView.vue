<template>
<div v-bind:class="[componentId]">
   <cly-header v-if="hookDetail">
      <cly-back-link slot="header-top" :title="i18n('hooks.back-to-hooks')" link="/manage/hooks"></cly-back-link>
      <template v-slot:header-left class="bu-pt-2">
        <div>
          <h3>{{hookDetail.name}}</h3>
          <div class="bu-mt-4">
            <i class="text-medium el-icon-time"></i> <span class="text-medium color-cool-gray-50">Created at {{hookDetail.created_at_string}} by<span style="font-weight: 500;"> {{hookDetail.createdByUser}}</span></span>

          </div>
        </div>
      </template>
      <template v-slot:header-right>
        <div>
          <div class="is-option-button" v-if="hookDetail._canUpdate || hookDetail._canDelete">
            <cly-more-options size="small" @command="handleHookEditCommand($event, hookDetail)">
               <el-dropdown-item icon="el-icon-document-copy" v-if="hookDetail._canUpdate" command="edit-comment">
                   Edit
               </el-dropdown-item>
               <el-dropdown-item icon="el-icon-delete" v-if="hookDetail._canDelete" command="delete-comment">
                   Delete
               </el-dropdown-item>
           </cly-more-options>
         </div>
        </div>
      </template>
    </cly-header>
    <cly-main>
      <div class="hook-detail-card" v-loading="!detailLogsInitialized">
        <div class="bu-mx-5 white-bg bu-my-4  bu-pt-1  bu-pb-4 ">
          <div class="text-medium color-cool-gray-100 text-heading">{{i18n('hooks.detail-title')}}</div>
          <div class="bu-mt-5">
            <div class="bu-columns">
              <div class="bu-column bu-pb-1 bu-is-2 text-medium bu-has-text-weight-medium">
                {{i18n('hooks.trigger-count')}}
                <span class="cly-vue-tooltip-icon ion ion-help-circled" style="margin-left:5.5px; font-size:15px;" v-tooltip.top-center="i18n('hooks.trigger-count-tips')">
                </span>
              </div>
              <div class="bu-column bu-pb-1 ">{{hookDetail.triggerCount}}</div>
            </div>
            <div class="bu-columns">
              <div class="bu-column bu-pb-1 bu-is-2 text-medium bu-has-text-weight-medium">{{i18n('hooks.trigger-time')}}</div>
              <div class="bu-column bu-pb-1 ">{{hookDetail.lastTriggerTimestampString}}</div>
            </div>
            <div class="bu-columns cly-vue-hook-table">
              <div class="bu-column bu-pb-1  bu-is-2 text-medium bu-has-text-weight-medium">{{i18n('hooks.trigger-and-effect')}}
                <span class="cly-vue-tooltip-icon ion ion-help-circled" style="margin-left:5.5px; font-size:15px;" v-tooltip.top-center="i18n('hooks.trigger-action-tips')">
                </span>
              </div>
              <div class="bu-column bu-pb-1 " v-html="hookDetail.triggerEffectDom"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="text-medium bu-my-4 bu-has-text-weight-medium color-cool-gray-100"> Last 10 Failed Triggers</div>
      <cly-section>
        <error-table-view></error-table-view>
      </cly-section>
      <drawer @close="closeDrawer" :controls="drawers.detail"></drawer>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin, authMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import moment from 'moment';
import jQuery from 'jquery';
import DetailErrorsTableView from './DetailErrorsTableView.vue';
import HookDrawer from './HookDrawer.vue';

var FEATURE_NAME = "hooks";

export default {
    mixins: [
        i18nMixin,
        mixins.hasDrawers("detail"),
        authMixin(FEATURE_NAME),
    ],
    components: {
        "error-table-view": DetailErrorsTableView,
        "drawer": HookDrawer,
    },
    data: function() {
        return {
            deleteElement: null,
        };
    },
    computed: {
        hookDetail: function() {
            var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
            hookDetail.created_at_string = moment(hookDetail.created_at).fromNow();
            hookDetail.lastTriggerTimestampString = hookDetail.lastTriggerTimestamp && moment(hookDetail.lastTriggerTimestamp).fromNow() || "-";
            return hookDetail;
        },
        detailLogsInitialized: function() {
            return this.$store.getters["countlyHooks/getDetailLogsInitialized"];
        }
    },
    methods: {
        handleHookEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = Object.assign({}, scope);
                delete data.operation;
                delete data.triggerEffectColumn;
                delete data.triggerEffectDom;
                delete data.error_logs;
                this.$store.dispatch("countlyHooks/resetTestResult");
                this.openDrawer("detail", data);
            }
            else if (command === "delete-comment") {
                var self = this;
                this.deleteElement = scope;
                var deleteMessage = i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                CountlyConfirm(deleteMessage, "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    self.$store.dispatch("countlyHooks/deleteHook", self.deleteElement._id);
                }, [jQuery.i18n.map['common.no-dont-delete'], jQuery.i18n.map['common.delete']], {title: jQuery.i18n.map['hooks.delete-confirm-title']});
            }
        },
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyHooks/initializeDetail", this.$route.params.id, {root: true});
    }
};
</script>
