<template>
    <div v-if="isDatabaseDebugEnabled">
        <cly-sub-section class="bu-is-flex bu-is-align-items-center bu-mb-3" :data-test-id="testId + '-wrapper'">
            <span class="text-medium font-weight-bold bu-mr-2 text-uppercase" :data-test-id="testId + '-label'">
                {{$i18n('drill.database-engine')}}
            </span>
            <el-select
                :value="dbOverride"
                @input="onSelectionChange"
                :disabled="disabled"
                size="small"
                :style="{width: width}"
                :test-id="testId + '-select'">
                <el-option
                    v-for="option in displayOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                    :test-id="testId + '-option-' + option.value">
                </el-option>
            </el-select>
        </cly-sub-section>
        <cly-sub-section class="bu-is-flex bu-is-align-items-center bu-mb-5" :data-test-id="testId + '-comparison-wrapper'">
            <span class="text-medium font-weight-bold bu-pr-4 text-uppercase" :data-test-id="testId + '-comparison-label'">
                {{$i18n('drill.comparison-mode')}}
            </span>
            <el-checkbox
                :value="comparisonMode"
                @input="onComparisonModeChange"
                :disabled="disabled"
                v-tooltip="'Run queries on all available adapters and log comparison data for analysis'"
                :test-id="testId + '-comparison-checkbox'">
                {{$i18n('drill.enable-comparison')}}
            </el-checkbox>
        </cly-sub-section>
    </div>
</template>

<script>
import countlyCommon from '../../countly/countly.common.js';
import countlyGlobal from '../../countly/countly.global.js';

export default {
    props: {
        options: {
            type: Array,
            default: null
        },
        width: {
            type: String,
            default: '240px'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        testId: {
            type: String,
            default: 'database-engine-debug-panel'
        }
    },
    data: function() {
        return {
            dbOverride: this.getStoredValue('db_override', 'config'),
            comparisonMode: this.getStoredValue('comparison_mode', false)
        };
    },
    computed: {
        isDatabaseDebugEnabled: function() {
            return countlyGlobal && countlyGlobal.database_debug === true;
        },
        displayOptions: function() {
            return this.options || [
                { value: "config", label: this.$i18n("drill.db-use-config") },
                { value: "mongodb", label: "MongoDB" },
                { value: "clickhouse", label: "ClickHouse" }
            ];
        }
    },
    methods: {
        getStoredValue: function(key, defaultValue) {
            const storageKey = `database_debug_${key}_${countlyCommon.ACTIVE_APP_ID}`;
            const storedValue = localStorage.getItem(storageKey);

            if (storedValue !== null) {
                if (key === 'comparison_mode') {
                    return storedValue === 'true';
                }
                return storedValue;
            }

            return defaultValue;
        },
        setStoredValue: function(key, value) {
            const storageKey = `database_debug_${key}_${countlyCommon.ACTIVE_APP_ID}`;
            localStorage.setItem(storageKey, value);
        },
        onSelectionChange: function(dbOverride) {
            this.dbOverride = dbOverride;
            this.setStoredValue('db_override', dbOverride);
            this.$emit('refresh-data', true);
        },
        onComparisonModeChange: function(comparisonMode) {
            this.comparisonMode = comparisonMode;
            this.setStoredValue('comparison_mode', comparisonMode);
        }
    }
};
</script>
