export const analyticsSessionOverviewPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    TAB_SESSION_OVERVIEW: 'tab-session-overview-title',
    TAB_SESSION_DURATIONS: 'tab-session-durations-title',
    TAB_SESSION_FREQUENCY: 'tab-session-frequency-title',
    TAB_SESSION_VIEWS_PER_SESSION: 'tab-session-views-per-session-title'
};

export const analyticsSessionOverviewEChartElements = {
    EMPTY_PAGE_ICON: 'analytics-session-overview-empty-logo',
    EMPTY_PAGE_TITLE: 'analytics-session-overview-empty-title',
    EMPTY_PAGE_SUBTITLE: 'analytics-session-overview-empty-subtitle',

    CHART_SESSION_OVERVIEW: 'analytics-session-overview-chart',
    CHART_TYPE_SELECT: 'analytics-session-overview-header-select-input',
    CHART_ANNOTATION_BUTTON: 'chart-type-annotation-button',
    CHART_ANNOTATION_ADD_NOTE_ITEM: 'chart-type-annotation-item-add-note',
    CHART_ANNOTATION_MANAGE_NOTES_ITEM: 'chart-type-annotation-item-manage-notes',
    CHART_ANNOTATION_HIDE_NOTES_ITEM: 'chart-type-annotation-item-hide-notes',
    CHART_MORE_BUTTON: 'analytics-session-overview-header-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'analytics-session-overview-header-download-button',
    CHART_MORE_ZOOM_ITEM: 'analytics-session-overview-header-more-zoom-button',

    CHART_TOTAL_SESSIONS_ICON: 'analytics-session-overview-legend-total-sessions-icon',
    CHART_TOTAL_SESSIONS_LABEL: 'analytics-session-overview-legend-total-sessions-label',
    CHART_TOTAL_SESSIONS_TOOLTIP: 'analytics-session-overview-legend-total-sessions-tooltip',
    CHART_TOTAL_SESSIONS_VALUE: 'analytics-session-overview-legend-total-sessions-value',
    CHART_TOTAL_SESSIONS_TREND_ICON: 'analytics-session-overview-legend-total-sessions-trend-icon',
    CHART_TOTAL_SESSIONS_PERCENTAGE: 'analytics-session-overview-legend-total-sessions-percentage',

    CHART_NEW_SESSIONS_ICON: 'analytics-session-overview-legend-new-sessions-icon',
    CHART_NEW_SESSIONS_LABEL: 'analytics-session-overview-legend-new-sessions-label',
    CHART_NEW_SESSIONS_TOOLTIP: 'analytics-session-overview-legend-new-sessions-tooltip',
    CHART_NEW_SESSIONS_VALUE: 'analytics-session-overview-legend-new-sessions-value',
    CHART_NEW_SESSIONS_TREND_ICON: 'analytics-session-overview-legend-new-sessions-trend-icon',
    CHART_NEW_SESSIONS_PERCENTAGE: 'analytics-session-overview-legend-new-sessions-percentage',

    CHART_UNIQUE_SESSIONS_ICON: 'analytics-session-overview-legend-unique-sessions-icon',
    CHART_UNIQUE_SESSIONS_LABEL: 'analytics-session-overview-legend-unique-sessions-label',
    CHART_UNIQUE_SESSIONS_TOOLTIP: 'analytics-session-overview-legend-unique-sessions-tooltip',
    CHART_UNIQUE_SESSIONS_VALUE: 'analytics-session-overview-legend-unique-sessions-value',
};

const analyticsSessionOverviewDataTableElements = (index = 0) => ({

    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'analytics-session-overview-export-as-button',
    TABLE_SEARCH_INPUT: 'analytics-session-overview-datatable-search-input',

    COLUMN_NAME_DATE_LABEL: 'analytics-session-overview-label-date',
    COLUMN_NAME_DATE_SORTABLE_ICON: 'analytics-session-overview-sortable-icon-date',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'analytics-session-overview-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'analytics-session-overview-sortable-icon-total-sessions',
    COLUMN_NAME_NEW_SESSIONS_LABEL: 'analytics-session-overview-label-new-sessions',
    COLUMN_NAME_NEW_SESSIONS_SORTABLE_ICON: 'analytics-session-overview-sortable-icon-new-sessions',
    COLUMN_NAME_UNIQUE_SESSIONS_LABEL: 'analytics-session-overview-label-unique-sessions',
    COLUMN_NAME_UNIQUE_SESSIONS_SORTABLE_ICON: 'analytics-session-overview-sortable-icon-unique-sessions',

    //Columns' Rows' Datas Elements 
    DATE: 'datatable-analytics-session-overview-date-' + index,
    TOTAL_SESSIONS: 'datatable-analytics-session-overview-total-sessions-' + index,
    NEW_SESSIONS: 'datatable-analytics-session-overview-new-sessions-' + index,
    UNIQUE_SESSIONS: 'datatable-analytics-session-overview-unique-sessions-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'analytics-session-overview-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'analytics-session-overview-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'analytics-session-overview-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'analytics-session-overview-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'analytics-session-overview-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'analytics-session-overview-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'analytics-session-overview-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'analytics-session-overview-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'analytics-session-overview-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'analytics-session-overview-last-page-arrow-button'
});

module.exports = {
    analyticsSessionOverviewPageElements,
    analyticsSessionOverviewEChartElements,
    analyticsSessionOverviewDataTableElements
};