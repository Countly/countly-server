export const healthCheckPageElements = {
    PAGE_TITLE: 'header-title',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    HEALTH_CHECK_BREAKDOWN_BY_STATUS_AS_LABEL: 'health-check-breakdown-by-status-as-label',
    HEALTH_CHECK_BREAKDOWN_BY_STATUS_AS_TYPE_SELECT: 'health-check-breakdown-by-status-as-select-input-pseudo-input-label',

    HEALTH_CHECK_BREAKDOWN_BY_ERRORS_AS_LABEL: 'health-check-breakdown-by-errors-as-label',
    HEALTH_CHECK_BREAKDOWN_BY_ERRORS_AS_TYPE_SELECT: 'health-check-breakdown-by-errors-as-select-input-pseudo-input-label',

    TAB_SDK_STATS: 'tab-sdk-stats-title',
    TAB_REQUEST_STATS: 'tab-request-stats-title',
    TAB_HEALTH_CHECK: 'tab-health-check-title',
    TAB_SDK_CONFIGURATION: 'tab-sdk-behavior-settings-title'
};

const healthCheckMetricCardElements = {
    HEALTH_CHECK_RECEIVED_LABEL: 'metric-card-health-checks-received-column-label',
    HEALTH_CHECK_RECEIVED_RECEIVED_NUMBER: 'metric-card-health-checks-received-column-number',
    HEALTH_CHECK_RECEIVED_RECEIVED_TREND_ICON: 'cly-radio-trend-icon-health-checks-received',
    HEALTH_CHECK_RECEIVED_RECEIVED_PERCENTAGE: 'metric-card-health-checks-received-description',

    SDK_ERROR_LOGS_LABEL: 'metric-card-sdk-error-logs-column-label',
    SDK_ERROR_LOGS_NUMBER: 'metric-card-sdk-error-logs-column-number',
    SDK_ERROR_LOGS_TREND_ICON: 'cly-radio-trend-icon-sdk-error-logs',
    SDK_ERROR_LOGS_PERCENTAGE: 'metric-card-sdk-error-logs-description',

    SDK_WARN_LOGS_LABEL: 'metric-card-sdk-warn-logs-column-label',
    SDK_WARN_LOGS_NUMBER: 'metric-card-sdk-warn-logs-column-number',
    SDK_WARN_LOGS_TREND_ICON: 'cly-radio-trend-icon-sdk-warn-logs',
    SDK_WARN_LOGS_PERCENTAGE: 'metric-card-sdk-warn-logs-description'
};

const hcsEChartElements = {
    EMPTY_TABLE_ICON: 'hcs-empty-logo',
    EMPTY_TABLE_TITLE: 'hcs-empty-title',
    EMPTY_TABLE_SUBTITLE: 'hcs-empty-subtitle',

    SELECT_HCS_CHART_TYPE: 'hcs-header-select-input',
    CHART_HCS: 'hcs-chart',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-icon',
    CHART_MORE_BUTTON: 'hcs-header-cly-chart-more-dropdown-more-option-button',

    RECEIVED_HEALTH_CHECKS_ICON: 'hcs-legend-received-health-checks-legend-icon',
    RECEIVED_HEALTH_CHECKS_LABEL: 'hcs-legend-received-health-checks-legend-label',

    ERROR_LOGS_ICON: 'hcs-legend-error-logs-legend-icon',
    ERROR_LOGS_LABEL: 'hcs-legend-error-logs-legend-label',

    WARNING_LOGS_ICON: 'hcs-legend-warning-logs-legend-icon',
    WARNING_LOGS_LABEL: 'hcs-legend-warning-logs-legend-label'
};

const statusCodesEChartElements = {
    EMPTY_TABLE_ICON: 'status-codes-empty-logo',
    EMPTY_TABLE_TITLE: 'status-codes-empty-title',
    EMPTY_TABLE_SUBTITLE: 'status-codes-empty-subtitle',

    CHART_STATUS_CODES: 'status-codes-chart',
    CHART_MORE_BUTTON: 'status-codes-cly-chart-more-dropdown-more-option-button',

    STATUS_CODE_MIN_1_ICON: 'status-codes--1-legend-icon',
    STATUS_CODE_MIN_1_LABEL: 'status-codes--1-legend-label'
};

const errorMessagesEChartElements = {
    EMPTY_TABLE_ICON: 'error-messages-empty-logo',
    EMPTY_TABLE_TITLE: 'error-messages-empty-title',
    EMPTY_TABLE_SUBTITLE: 'error-messages-empty-subtitle',

    CHART_ERROR_MESSAGES: 'error-messages-chart',
    CHART_MORE_BUTTON: 'error-messages-cly-chart-more-dropdown-more-option-button',

    APP_DOES_NOT_EXIST_ICON: 'line-options-error-messages-app-does-not-exist-legend-icon',
    APP_DOES_NOT_EXIST_LABEL: 'line-options-error-messages-app-does-not-exist-legend-label'
};

module.exports = {
    healthCheckPageElements,
    healthCheckMetricCardElements,
    hcsEChartElements,
    statusCodesEChartElements,
    errorMessagesEChartElements
};