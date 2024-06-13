export const sessionFrequencyPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    TAB_SESSION_OVERVIEW: 'tab-session-overview-title',
    TAB_SESSION_DURATIONS: 'tab-session-durations-title',
    TAB_SESSION_FREQUENCY: 'tab-session-frequency-title',
    TAB_SESSION_VIEWS_PER_SESSION: 'tab-session-views-per-session-title'
}

export const sessionFrequencyEChartElements = {
    EMPTY_PAGE_ICON: 'chart-session-frequency-empty-logo',
    EMPTY_PAGE_TITLE: 'chart-session-frequency-empty-title',
    EMPTY_PAGE_SUBTITLE: 'chart-session-frequency-empty-subtitle',

    CHART_SESSION_FREQUENCY: 'chart-session-frequency-chart',
    CHART_MORE_BUTTON: 'chart-session-frequency-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'chart-session-frequency-download-button',
    CHART_MORE_ZOOM_ITEM: 'chart-session-frequency-more-zoom-button',

    CHART_SESSION_FREQUENCY_ICON: 'chart-session-frequency-session-frequency-legend-icon',
    CHART_SESSION_FREQUENCY_LABEL: 'chart-session-frequency-session-frequency-legend-label',
}

const sessionFrequencyDataTableElements = (index = 0) => {
    return {
        EMPTY_TABLE_ICON: 'datatable-session-frequency-empty-logo',
        EMPTY_TABLE_TITLE: 'datatable-session-frequency-empty-title',
        EMPTY_TABLE_SUBTITLE: 'datatable-session-frequency-empty-subtitle',

        TABLE_ROWS: '.el-table__row',
        EXPORT_AS_BUTTON: 'datatable-session-frequency-export-as-button',
        TABLE_SEARCH_INPUT: 'datatable-session-frequency-datatable-search-input',

        COLUMN_NAME_TIME_SINCE_LAST_SESSION_LABEL: 'datatable-session-frequency-label-time-since-last-session',
        COLUMN_NAME_TIME_SINCE_LAST_SESSION_SORTABLE_ICON: 'datatable-session-frequency-sortable-icon-time-since-last-session',
        COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL: 'datatable-session-frequency-label-number-of-sessions',
        COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON: 'datatable-session-frequency-sortable-icon-number-of-sessions',
        COLUMN_NAME_PERCENT_LABEL: 'datatable-session-frequency-label-percent',
        COLUMN_NAME_PERCENT_SORTABLE_ICON: 'datatable-session-frequency-sortable-icon-percent',

        //Columns' Rows' Datas Elements 
        TIME_SINCE_LAST_SESSION: 'datatable-session-frequency-time-since-last-session-' + index,
        NUMBER_OF_SESSIONS: 'datatable-session-frequency-number-of-sessions-' + index,
        PERCENT_VALUE: 'datatable-session-frequency-percent-' + index,
        PERCENT_PROGRESS_BAR: 'datatable-session-frequency-progress-bar-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'datatable-session-frequency-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'datatable-session-frequency-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'datatable-session-frequency-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'datatable-session-frequency-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'datatable-session-frequency-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'datatable-session-frequency-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'datatable-session-frequency-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-session-frequency-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'datatable-session-frequency-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'datatable-session-frequency-last-page-arrow-button'
    };
};

module.exports = {
    sessionFrequencyPageElements,
    sessionFrequencyEChartElements,
    sessionFrequencyDataTableElements
};