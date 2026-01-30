<template>
    <div class="chart-type-toggle-wrapper" :data-test-id="testId + '-chart-type-toggle-wrapper'">
        <el-select v-model="selSwitch" class="chart-type-toggle-wrapper__select" :test-id="testId">
            <div class="chart-type-toggle-wrapper__title" :data-test-id="testId + '-chart-type-toggle-wrapper-title'">
                <span class="text-smaller font-weight-bold bu-is-uppercase" :data-test-id="testId + '-chart-type-label'">{{$i18n("common.chart-type")}}</span>
            </div>
            <el-option value="line" label="Line" :data-test-id="testId + '-chart-type-toggle-wrapper-el-option-line'">
                <i class="ion-ios-pulse-strong bu-mr-2"></i>
                <span class="chart-type-toggle-wrapper__type" :data-test-id="testId + '-chart-type-toggle-wrapper-el-option-line-text'">Line Chart</span>
            </el-option>
            <el-option value="bar" label="Bar" :data-test-id="testId + '-chart-type-toggle-wrapper-el-option-bar'">
                <i class="ion-stats-bars bu-mr-3"></i>
                <span class="chart-type-toggle-wrapper__type" :data-test-id="testId + '-chart-type-toggle-wrapper-el-option-bar-text'">Bar</span>
            </el-option>
        </el-select>
    </div>
</template>

<script>
export default {
    props: {
        chartType: {
            type: String,
            default: 'line'
        },
        testId: {
            required: false,
            default: 'test-id'
        }
    },
    data: function() {
        return {
            selSwitchOption: this.chartType
        };
    },
    computed: {
        selSwitch: {
            get: function() {
                return this.selSwitchOption;
            },
            set: function(v) {
                this.$emit("series-toggle", v);
                this.selSwitchOption = v;
            }
        }
    }
};
</script>
