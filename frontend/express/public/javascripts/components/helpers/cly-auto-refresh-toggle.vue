<template>
    <div class="cly-vue-auto-refresh-toggle">
        <div v-if="autoRefresh" class="bu-level-item">
            <span class="cly-vue-auto-refresh-toggle__refresh--enabled" :data-test-id="testId + '-auto-refresh-toggle-is-label'">{{$i18n('auto-refresh.is')}}</span>
            <span class="cly-vue-auto-refresh-toggle__refresh--enabled-color" :data-test-id="testId + '-auto-refresh-toggle-enabled-label'">{{$i18n('auto-refresh.enabled')}}</span>
            <span v-tooltip.top-left="getRefreshTooltip()" class="bu-ml-1 bu-mr-2 cly-vue-auto-refresh-toggle__tooltip ion-help-circled" :data-test-id="testId + '-auto-refresh-toggle-tooltip'"></span>
            <el-button @click="stopAutoRefresh()"><i class="bu-ml-2 fa fa-stop-circle" :data-test-id="testId + '-auto-refresh-toggle-button'"></i> {{$i18n('auto-refresh.stop')}}</el-button>
        </div>
        <div class="bu-level-item" :class="{ 'bu-is-hidden': autoRefresh }">
            <el-switch v-model="autoRefresh" :test-id="testId + '-auto-refresh-toggle'"></el-switch>
            <span class="cly-vue-auto-refresh-toggle__refresh--disabled" :data-test-id="testId + '-auto-refresh-toggle-disabled-label'">{{$i18n('auto-refresh.enable')}}</span>
            <span v-tooltip.left="getRefreshTooltip()" class="bu-ml-2 cly-vue-auto-refresh-toggle__tooltip ion-help-circled" :data-test-id="testId + '-auto-refresh-toggle-disabled-tooltip'"></span>
        </div>
    </div>
</template>

<script>
import countlyCommon from '../../countly/countly.common.js';

export default {
    data: function() {
        return {
            autoRefresh: false
        };
    },
    props: {
        feature: { required: true, type: String },
        defaultValue: { required: false, default: false, type: Boolean },
        testId: { required: false, default: 'cly-test-id', type: String }
    },
    methods: {
        getRefreshTooltip: function() {
            return this.$i18n('auto-refresh.help');
        },
        stopAutoRefresh: function() {
            this.autoRefresh = false;
        }
    },
    watch: {
        autoRefresh: function(newValue) {
            localStorage.setItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID, newValue);
        }
    },
    mounted: function() {
        var autoRefreshState = localStorage.getItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID);
        if (autoRefreshState) {
            this.autoRefresh = autoRefreshState === "true";
        }
        else {
            localStorage.setItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID, this.defaultValue);
            this.autoRefresh = this.defaultValue;
        }
    }
};
</script>
