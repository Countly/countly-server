<template>
    <el-card class="box-card cly-vue-push-notification-details-summary-card">
        <el-select
            v-model="selectedPeriod"
            size="mini"
            class="bu-mb-4 bu-mt-2"
            adaptive-length
            :options="periodOptions"
            @change="fetchMessageStats">
            <el-option
                v-for="item in periodOptions"
                :label="i18n(item.label)"
                :key="item.value"
                :value="item.value"
            />
            <template v-slot:prefix><i class='cly-icon-date cly-icon-prefix-icon'></i></template>
        </el-select>

        <cly-chart-bar
            class="bu-p-3"
            xAxisLabelOverflow="unset"
            :option="chartOpts"
            :show-download="false"
            :show-toggle="false"
            :show-zoom="false"
            :height="300"
        />
    </el-card>
</template>

<script>
import moment from 'moment';
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyChartBar from '../../../../../../frontend/express/public/javascripts/components/echart/cly-chart-bar.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyChartBar,
    },
    data: function() {
        return {
            selectedPeriod: "30days",
            periodOptions: [
                { label: "30 days", value: "30days" },
                { label: "24 weeks", value: "24weeks" },
                { label: "12 months", value: "12months" }
            ]
        };
    },
    mounted: function() {
        this.fetchMessageStats();
    },
    computed: {
        chartOpts: function() {
            return {
                xAxis: {
                    axisLabel: {
                        formatter: function(date) {
                            return moment(date).format("DD MMM");
                        }
                    }
                },
                tooltip: {
                    axisPointer: {
                        label: {
                            formatter: function(date) {
                                return moment(date.value).format("LL");
                            }
                        }
                    }
                },
                series: [
                    {
                        name: "Sent Messages",
                        type: "bar",
                        data: this.$store.state.countlyPushNotificationDetails.messageStats.sent,
                    },
                    {
                        name: "Actioned Messages",
                        type: "bar",
                        data: this.$store.state.countlyPushNotificationDetails.messageStats.action,
                    }
                ]
            };
        }
    },
    methods: {
        fetchMessageStats: function() {
            this.$store.dispatch("countlyPushNotificationDetails/fetchMessageStats", {
                messageId: this.$store.state.countlyPushNotificationDetails.pushNotification._id,
                period: this.selectedPeriod
            });
        }
    }
};
</script>
