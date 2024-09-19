export const eventsOverviewPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_VIEW_GUIDE_BUTTON: 'view-guide-button',
    PAGE_SUB_TITLE: 'events-overview-subheading-event-metrics-label',
    PAGE_SUB_TITLE_TOOLTIP: 'events-overview-subheading-event-metrics-tooltip',
    EXPORT_BUTTON: 'cly-datatable-n-test-id-export-as-button',
    DATATABLE_SEARCH_BUTTON: 'cly-datatable-n-test-id-datatable-search-input',
    EMPTY_TABLE_ICON: 'cly-datatable-n-test-id-empty-logo',
    EMPTY_TABLE_TITLE: 'cly-datatable-n-test-id-empty-title',
    EMPTY_TABLE_SUBTITLE: 'cly-datatable-n-test-id-empty-subtitle',
    MONITOR_EVENTS_LABEL: 'events-overview-subheading-monitor-events-label',
    MONITOR_EVENTS_TOOLTIP: 'events-overview-subheading-monitor-events-tooltip',
    CONFIGURE_EVENTS_BUTTON: 'events-overview-configure-events-button',
    TIME_PERIOD_LABEL: 'events-overview-time-period-label',
    FILTER_DATE_PICKER: 'events-overview-time-period-pseudo-input-label'
};

const eventsOverviewTotalMetricCardElements = {
    TOTAL_EVENT_COUNT_LABEL: 'metric-card-events-overview-total-event-count-column-label',
    TOTAL_EVENT_COUNT_TOOLTIP: 'metric-card-events-overview-total-event-count-column-tooltip',
    TOTAL_EVENT_COUNT_NUMBER: 'metric-card-events-overview-total-event-count-column-number',
    TOTAL_EVENT_COUNT_TREND_ICON: 'events-overview-total-event-count-trend-icon',
    TOTAL_EVENT_COUNT_PERCENTAGE: 'events-overview-total-event-count-desc',

    EVENTS_PER_USER_LABEL: 'metric-card-events-overview-events-per-user-column-label',
    EVENTS_PER_USER_TOOLTIP: 'metric-card-events-overview-events-per-user-column-tooltip',
    EVENTS_PER_USER_NUMBER: 'metric-card-events-overview-events-per-user-column-number',
    EVENTS_PER_USER_TREND_ICON: 'events-overview-events-per-user-trend-icon',
    EVENTS_PER_USER_PERCENTAGE: 'events-overview-events-per-user-desc',

    EVENTS_PER_SESSION_LABEL: 'metric-card-events-overview-events-per-session-column-label',
    EVENTS_PER_SESSION_TOOLTIP: 'metric-card-events-overview-events-per-session-column-tooltip',
    EVENTS_PER_SESSION_NUMBER: 'metric-card-events-overview-events-per-session-column-number',
    EVENTS_PER_SESSION_TREND_ICON: 'events-overview-events-per-session-trend-icon',
    EVENTS_PER_SESSION_PERCENTAGE: 'events-overview-events-per-session-desc'
};

const eventsOverviewTopMetricCardElements = (index = 0) => ({
    EVENT_NAME_LABEL: 'events-overview-top-event-' + index + '-name-label',
    EVENT_NUMBER: 'events-overview-top-event-' + index + '-value-label',
    EVENT_TREND_ICON: 'events-overview-top-event-' + index + '-trend-icon',
    EVENT_PERCENTAGE: 'events-overview-top-event-' + index + '-trend-value-label',
    EVENT_PERCENTAGE_OF_TOTAL: 'events-overview-top-event-' + index + '-percentage-of-total-label',
    EVENT_PROGRESS_BAR: 'events-overview-top-event-' + index + '-progress-bar',
    DEF: 'DEF',
});

const eventsOverviewDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'events-overview-empty-logo',
    EMPTY_TABLE_TITLE: 'events-overview-empty-title',
    EMPTY_TABLE_SUBTITLE: 'events-overview-empty-subtitle',

    EXPORT_AS_BUTTON: 'events-overview-export-as-button',
    TABLE_SEARCH_INPUT: 'events-overview-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_EVENT_LABEL: 'events-overview-label-event',
    COLUMN_NAME_EVENT_SORTABLE_ICON: 'events-overview-sortable-icon-event',
    COLUMN_NAME_COUNT_LABEL: 'events-overview-label-count',
    COLUMN_NAME_COUNT_SORTABLE_ICON: 'events-overview-sortable-icon-count',
    COLUMN_NAME_SUM_LABEL: 'events-overview-label-sum',
    COLUMN_NAME_SUM_SORTABLE_ICON: 'events-overview-sortable-icon-sum',
    COLUMN_NAME_DURATION_LABEL: 'events-overview-label-duration',
    COLUMN_NAME_DURATION_SORTABLE_ICON: 'events-overview-sortable-icon-duration',

    //Columns' Rows' Datas Elements 
    EVENT: 'datatable-event-metrics-event-' + index,
    COUNT: 'datatable-event-metrics-count-' + index,
    SUM: 'datatable-event-metrics-sum-' + index,
    DURATION: 'datatable-event-metrics-duration-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'events-overview-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'events-overview-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'events-overview-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'events-overview-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'events-overview-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'events-overview-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'events-overview-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'events-overview-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'events-overview-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'events-overview-views-last-page-arrow-button'
});

const eventsOverviewMonitorEventsMetricCardElements = (index = 0) => ({
    EMPTY_MONITOR_EVENTS_TABLE_ICON: 'events-overview-monitor-events-empty-logo',
    EMPTY_MONITOR_EVENTS_TABLE_TITLE: 'events-overview-monitor-events-empty-title',
    EMPTY_MONITOR_EVENTS_TABLE_SUBTITLE: 'events-overview-monitor-events-empty-subtitle',
    CONFIGURE_EVENTS_LINK_BUTTON: 'events-overview-configure-events-link-button',
    MONITOR_EVENT_NAME_LABEL: 'events-overview-monitor-events-event-' + index + '-name-label',
    MONITOR_EVENT_NUMBER: 'events-overview-monitor-events-event-' + index + '-value-label',
    MONITOR_EVENT_PROPERTY_NAME_LABEL: 'events-overview-monitor-events-event-' + index + '-property-label',
    MONITOR_EVENT_TREND_ICON: 'events-overview-monitor-events-' + index + '-trend-icon',
    MONITOR_EVENT_PERCENTAGE: 'events-overview-monitor-events-' + index + '-trend-value-label',
    MONITOR_EVENT_GRAPH: 'events-overview-monitor-events-event-' + index + '-graph'
});

module.exports = {
    eventsOverviewPageElements,
    eventsOverviewTotalMetricCardElements,
    eventsOverviewTopMetricCardElements,
    eventsOverviewDataTableElements,
    eventsOverviewMonitorEventsMetricCardElements
};