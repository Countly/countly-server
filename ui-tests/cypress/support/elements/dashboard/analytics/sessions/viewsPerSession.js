export const sessionViewsPerSessionElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    TAB_SESSION_OVERVIEW: 'tab-session-overview-title',
    TAB_SESSION_DURATIONS: 'tab-session-durations-title',
    TAB_SESSION_FREQUENCY: 'tab-session-frequency-title',
    TAB_SESSION_VIEWS_PER_SESSION: 'tab-session-views-per-session-title'
};

export const sessionViewsPerSessionEChartElements = {
    EMPTY_PAGE_ICON: 'chart-views-per-session-empty-logo',
    EMPTY_PAGE_TITLE: 'chart-views-per-session-empty-title',
    EMPTY_PAGE_SUBTITLE: 'chart-views-per-session-empty-subtitle',

    CHART_SESSION_VIEWS_PER_SESSION: 'chart-views-per-session-chart',
    CHART_MORE_BUTTON: 'chart-views-per-session-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'chart-views-per-session-download-button',
    CHART_MORE_ZOOM_ITEM: 'chart-views-per-session-more-zoom-button',

    CHART_VIEWS_PER_SESSION_ICON: 'chart-views-per-session-views-per-session-legend-icon',
    CHART_VIEWS_PER_SESSION_LABEL: 'chart-views-per-session-views-per-session-legend-label',
};

const sessionViewsPerSessionDataTableElements = (index = 0) => ({

    EMPTY_TABLE_ICON: 'datatable-views-per-session-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-views-per-session-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-views-per-session-empty-subtitle',

    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'datatable-views-per-session-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-views-per-session-datatable-search-input',

    COLUMN_NAME_VIEWS_PER_SESSION_LABEL: 'datatable-views-per-session-label-views-per-session',
    COLUMN_NAME_VIEWS_PER_SESSION_SORTABLE_ICON: 'datatable-views-per-session-sortable-icon-views-per-session',
    COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL: 'datatable-views-per-session-label-number-of-sessions',
    COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON: 'datatable-views-per-session-sortable-icon-number-of-sessions',
    COLUMN_NAME_PERCENT_LABEL: 'datatable-views-per-session-label-percent',
    COLUMN_NAME_PERCENT_SORTABLE_ICON: 'datatable-views-per-session-sortable-icon-percent',

    //Columns' Rows' Datas Elements 
    VIEWS_PER_SESSION: 'datatable-views-per-session-' + index,
    NUMBER_OF_SESSIONS: 'datatable-views-per-session-number-of-sessions-' + index,
    PERCENT_VALUE: 'datatable-views-per-session-percent-' + index,
    PERCENT_PROGRESS_BAR: 'datatable-views-per-session-progress-bar-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-views-per-session-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-views-per-session-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-views-per-session-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-sviews-per-session-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-views-per-session-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-views-per-session-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-views-per-session-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-views-per-session-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-views-per-session-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-views-per-session-last-page-arrow-button'
});

module.exports = {
    sessionViewsPerSessionElements,
    sessionViewsPerSessionEChartElements,
    sessionViewsPerSessionDataTableElements
};