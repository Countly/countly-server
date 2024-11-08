export const requestStatsPageElements = {
    PAGE_TITLE: 'header-title',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    RECEIVED_REQUEST_BREAKDOWN_BY_TYPE_AS_LABEL: 'received-request-breakdown-by-type-as-label',
    RECEIVED_REQUEST_BREAKDOWN_BY_TYPE_AS_TYPE_SELECT: 'request-breakdown-type-select-input-pseudo-input-label',

    CANCELED_REQUEST_BREAKDOWN_BY_REASON_AS_LABEL: 'canceled-request-breakdown-by-reason-as-label',
    CANCELED_REQUEST_BREAKDOWN_BY_REASON_AS_TYPE_SELECT: 'canceled-request-select-input-pseudo-input-label',

    CANCELED_REQUEST_EMPTY_TABLE_ICON: 'line-options-canceled-empty-logo',
    CANCELED_REQUEST_EMPTY_TABLE_TITLE: 'line-options-canceled-empty-title',
    CANCELED_REQUEST_EMPTY_TABLE_SUBTITLE: 'line-options-canceled-empty-subtitle',

    TAB_SDK_STATS: 'tab-sdk-stats-title',
    TAB_REQUEST_STATS: 'tab-request-stats-title',
    TAB_HEALTH_CHECK: 'tab-health-check-title',
    TAB_SDK_CONFIGURATION: 'tab-sdk-configuration-title'
};

const requestStatsMetricCardElements = {
    REQUESTS_RECEIVED_LABEL: 'metric-card-requests-received-column-label',
    REQUESTS_RECEIVED_NUMBER: 'metric-card-requests-received-column-number',
    REQUESTS_RECEIVED_TREND_ICON: 'cly-radio-trend-icon-requests-received',
    REQUESTS_RECEIVED_PERCENTAGE: 'metric-card-requests-received-description',

    REQUESTS_CANCELED_LABEL: 'metric-card-requests-canceled-column-label',
    REQUESTS_CANCELED_NUMBER: 'metric-card-requests-canceled-column-number',
    REQUESTS_CANCELED_TREND_ICON: 'cly-radio-trend-icon-requests-canceled',
    REQUESTS_CANCELED_PERCENTAGE: 'metric-card-requests-canceled-description',

    REQUESTS_QUEUED_LABEL: 'metric-card-requests-queued-column-label',
    REQUESTS_QUEUED_NUMBER: 'metric-card-requests-queued-column-number',
    REQUESTS_QUEUED_TREND_ICON: 'cly-radio-trend-icon-requests-queued',
    REQUESTS_QUEUED_PERCENTAGE: 'metric-card-requests-queued-description',
};

const requestsEChartElements = {
    EMPTY_TABLE_ICON: 'requests-empty-logo',
    EMPTY_TABLE_TITLE: 'requests-empty-title',
    EMPTY_TABLE_SUBTITLE: 'requests-empty-subtitle',

    SELECT_REQUESTS_CHART_TYPE: 'requests-header-select-input',
    CHART_REQUESTS: 'requests-chart',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-icon',
    CHART_MORE_BUTTON: 'requests-header-cly-chart-more-dropdown-more-option-button',


    RECEIVED_REQUESTS_ICON: 'requests-legend-received-requests-legend-icon',
    RECEIVED_REQUESTS_LABEL: 'requests-legend-received-requests-legend-label',

    CANCELED_REQUESTS_ICON: 'requests-legend-canceled-requests-legend-icon',
    CANCELED_REQUESTS_LABEL: 'requests-legend-canceled-requests-legend-label',

    QUEUED_REQUESTS_ICON: 'requests-legend-queued-requests-legend-icon',
    QUEUED_REQUESTS_LABEL: 'requests-legend-queued-requests-legend-label'
};

const delaysEChartElements = {
    EMPTY_TABLE_ICON: 'delays-empty-logo',
    EMPTY_TABLE_TITLE: 'delays-empty-title',
    EMPTY_TABLE_SUBTITLE: 'delays-empty-subtitle',

    SELECT_DELAYS_CHART_TYPE: 'delays-header-select-input',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-button',
    CHART_MORE_BUTTON: 'delays-header-cly-chart-more-dropdown-more-option-button',

    CHART_DELAYS: 'delays-chart',

    MINIMUM_DELAY_ICON: 'delays-legend-minimum-delay-legend-icon',
    MINIMUM_DELAY_LABEL: 'delays-legend-minimum-delay-legend-label',

    AVERAGE_DELAY_ICON: 'delays-legend-average-delay-legend-icon',
    AVERAGE_DELAY_LABEL: 'delays-legend-average-delay-legend-label',

    MAXIMUM_DELAY_ICON: 'delays-legend-maximum-delay-legend-icon',
    MAXIMUM_DELAY_LABEL: 'delays-legend-maximum-delay-legend-label',
};

const receivedRequestEChartElements = {
    EMPTY_TABLE_ICON: 'received-request-empty-logo',
    EMPTY_TABLE_TITLE: 'received-request-empty-title',
    EMPTY_TABLE_SUBTITLE: 'received-request-empty-subtitle',

    CHART_RECEIVED_REQUESTS: 'received-request-chart',
    CHART_MORE_BUTTON: 'received-request-cly-chart-more-dropdown-more-option-button',

    APM_ICON: 'received-request-apm-legend-icon',
    APM_LABEL: 'received-request-apm-legend-label',

    BEGIN_SESSION_ICON: 'received-request-begin_session-legend-icon',
    BEGIN_SESSION_LABEL: 'received-request-begin_session-legend-label',

    CONSENT_ICON: 'received-request-consent-legend-icon',
    CONSENT_LABEL: 'received-request-consent-legend-label',

    CRASH_ICON: 'received-request-crash-legend-icon',
    CRASH_LABEL: 'received-request-crash-legend-label',

    END_SESSION_ICON: 'received-request-end_session-legend-icon',
    END_SESSION_LABEL: 'received-request-end_session-legend-label',

    EVENTS_ICON: 'received-request-events-legend-icon',
    EVENTS_LABEL: 'received-request-events-legend-label',

    SESSION_DURATION_ICON: 'received-request-session_duration-legend-icon',
    SESSION_DURATION_LABEL: 'received-request-session_duration-legend-label',

    TOKEN_SESSION_ICON: 'received-request-token_session-legend-icon',
    TOKEN_SESSION_LABEL: 'received-request-token_session-legend-label',

    USER_DETAILS_ICON: 'received-request-user_details-legend-icon',
    USER_DETAILS_LABEL: 'received-request-user_details-legend-label'
};

const canceledRequestEChartElements = {
    EMPTY_TABLE_ICON: 'canceled-request-empty-logo',
    EMPTY_TABLE_TITLE: 'canceled-request-empty-title',
    EMPTY_TABLE_SUBTITLE: 'canceled-request-empty-subtitle',

    CHART_CANCELED_REQUESTS: 'canceled-request-chart',
    CHART_MORE_BUTTON: 'canceled-request-cly-chart-more-dropdown-more-option-button',

    //TODO: Data is not being generated with the populator. Need to generate the data 
};

module.exports = {
    requestStatsPageElements,
    requestStatsMetricCardElements,
    requestsEChartElements,
    delaysEChartElements,
    receivedRequestEChartElements,
    canceledRequestEChartElements
};