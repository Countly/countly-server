export default {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
};

export const sessionDurationsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_SESSION_OVERVIEW: 'tab-session-overview-title',
    TAB_SESSION_DURATIONS: 'tab-session-durations-title',
    TAB_SESSION_FREQUENCY: 'tab-session-frequency-title',
    TAB_SESSION_VIEWS_PER_SESSION: 'tab-session-views-per-session-title'
};

export const sessionDurationsEChartElements = {
    EMPTY_PAGE_ICON: 'chart-session-durations-empty-logo',
    EMPTY_PAGE_TITLE: 'chart-session-durations-empty-title',
    EMPTY_PAGE_SUBTITLE: 'chart-session-durations-empty-subtitle',

    CHART_SESSION_DURATIONS: 'chart-session-durations-chart',
    CHART_MORE_BUTTON: 'chart-session-durations-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'chart-session-durations-download-button',
    CHART_MORE_ZOOM_ITEM: 'chart-session-durations-more-zoom-button',

    CHART_SESSION_DURATIONS_ICON: 'chart-session-durations-session-durations-legend-icon',
    CHART_SESSION_DURATIONS_LABEL: 'chart-session-durations-session-durations-legend-label',
};

const sessionDurationsDataTableElements = (index = 0) => ({

    EMPTY_TABLE_ICON: 'datatable-session-durations-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-session-durations-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-session-durations-empty-subtitle',

    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'datatable-session-durations-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-session-durations-datatable-search-input',

    COLUMN_NAME_SESSION_DURATION_LABEL: 'datatable-session-durations-label-session-duration',
    COLUMN_NAME_SESSION_DURATION_SORTABLE_ICON: 'datatable-session-durations-sortable-icon-session-duration',
    COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL: 'datatable-session-durations-label-number-of-sessions',
    COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON: 'datatable-session-durations-sortable-icon-number-of-sessions',
    COLUMN_NAME_PERCENT_LABEL: 'datatable-session-durations-label-percent',
    COLUMN_NAME_PERCENT_SORTABLE_ICON: 'datatable-session-durations-sortable-icon-percent',

    //Columns' Rows' Datas Elements 
    SESSION_DURATION: 'datatable-session-durations-session-duration-' + index,
    NUMBER_OF_SESSIONS: 'datatable-session-durations-session-duration-' + index,
    PERCENT_VALUE: 'datatable-session-durations-percent-' + index,
    PERCENT_PROGRESS_BAR: 'datatable-session-durations-progress-bar-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-session-durations-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-session-durations-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-session-durations-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-session-durations-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-session-durations-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-session-durations-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-session-durations-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-session-durations-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-session-durations-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-session-durations-last-page-arrow-button'
});

module.exports = {
    sessionDurationsPageElements,
    sessionDurationsEChartElements,
    sessionDurationsDataTableElements
};