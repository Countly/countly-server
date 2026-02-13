<template>
<div v-bind:class="[componentId]">
    <cly-blank>
        <template v-slot:icon>
            <img :src="'dashboards/images/no-widget.svg'">
        </template>
        <template v-slot:title>
            <h3 class="bu-mt-4">{{ i18nM('common.emtpy-view-title') }}</h3>
        </template>
        <template v-slot:subTitle>
            <p class="text-medium color-cool-gray-50 bu-m-0 bu-mt-4 bu-has-text-centered">
                {{ i18nM('common.no-dashboard-text') }}
            </p>
            <div class="bu-has-text-centered bu-mt-5">
                <el-button type="text" size="small" @click="addDashboard">
                    <span class="bu-has-text-weight-medium">{{ i18nM('common.create-dashboard') }}</span>
                </el-button>
            </div>
        </template>
    </cly-blank>
    <dashboards-drawer :controls="drawers.dashboards"></dashboards-drawer>
</div>
</template>

<script>
import { mixins, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import DashboardMixin from '../mixins/DashboardMixin.js';
import DashboardDrawer from './DashboardDrawer.vue';
import ClyBlank from '../../../../../frontend/express/public/javascripts/components/helpers/cly-blank.vue';

export default {
    mixins: [i18nMixin, mixins.hasDrawers("dashboards"), DashboardMixin],
    components: {
        "dashboards-drawer": DashboardDrawer,
        ClyBlank
    }
};
</script>
