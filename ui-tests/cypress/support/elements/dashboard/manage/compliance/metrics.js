export const metricsPageElements = {
    PAGE_TITLE: 'header-title',
    CONSENT_REQUESTS_FOR_LABEL: 'consent-requests-for-label',
    CONSENT_REQUESTS_FILTER_SELECT: 'consent-requests-for-combobox-pseudo-input-label',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    USER_DATA_EXPORTS_LABEL: 'user-data-exports-title-label',
    USER_DATA_PURGES_LABEL: 'user-data-purges-title-label',

    TAB_METRICS: 'tab-metrics-title',
    TAB_USERS: 'tab-users-title',
    TAB_CONSENT_HISTORY: 'tab-consent-history-title',
    TAB_EXPORT_PURGE_HISTORY: 'tab-export/purge-history-title'
};

export const consentRequestsEChartElements = {
    EMPTY_TABLE_ICON: 'consent-requests-empty-logo',
    EMPTY_TABLE_TITLE: 'consent-requests-empty-title',
    EMPTY_TABLE_SUBTITLE: 'consent-requests-empty-subtitle',

    CHART_CONSENT_REQUESTS: 'consent-requests-chart',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-button',

    OPT_IN_ICON: 'consent-requests-legend-opt-in-icon',
    OPT_IN_LABEL: 'consent-requests-legend-opt-in-label',
    OPT_IN_VALUE: 'consent-requests-legend-opt-in-value',
    OPT_IN_TREND_ICON: 'consent-requests-legend-opt-in-trend-icon',
    OPT_IN_PERCENTAGE: 'consent-requests-legend-opt-in-percentage',

    OPT_OUT_ICON: 'consent-requests-legend-opt-out-icon',
    OPT_OUT_LABEL: 'consent-requests-legend-opt-out-label',
    OPT_OUT_VALUE: 'consent-requests-legend-opt-out-value',
    OPT_OUT_TREND_ICON: 'consent-requests-legend-opt-out-trend-icon',
    OPT_OUT_PERCENTAGE: 'consent-requests-legend-opt-out-percentage'
};

export const userDataExportsEChartElements = {
    EMPTY_TABLE_ICON: 'user-data-exports-empty-logo',
    EMPTY_TABLE_TITLE: 'user-data-exports-empty-title',
    EMPTY_TABLE_SUBTITLE: 'user-data-exports-empty-subtitle',

    CHART_USER_DATA_EXPORTS: 'user-data-exports-chart',

    USER_DATA_EXPORTS_NUMBER: 'user-data-exports-value',
    USER_DATA_EXPORTS_TREND_ICON: 'user-data-exports-arrow-icon',
    USER_DATA_EXPORTS_PERCENTAGE: 'user-data-exports-percentage',
};

export const userDataPurgesEChartElements = {
    EMPTY_TABLE_ICON: 'user-data-purges-empty-logo',
    EMPTY_TABLE_TITLE: 'user-data-purges-empty-title',
    EMPTY_TABLE_SUBTITLE: 'user-data-purges-empty-subtitle',

    CHART_USER_DATA_PURGES: 'user-data-purges-chart',

    USER_DATA_PURGES_NUMBER: 'user-data-purges-value',
    USER_DATA_PURGES_TREND_ICON: 'user-data-purges-arrow-icon',
    USER_DATA_PURGES_PERCENTAGE: 'user-data-purges-percentage',
};

module.exports = {
    metricsPageElements,
    consentRequestsEChartElements,
    userDataExportsEChartElements,
    userDataPurgesEChartElements
};