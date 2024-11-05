export const userActivityPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_USER_ACTIVITY: 'tab-user-activity-title',
    TAB_SLIPPING_AWAY: 'tab-slipping-away-title',
    TAB_TIMES_OF_DAY: 'tab-times-of-day-title',
};

export const userActivityEChartElements = {
    EMPTY_PAGE_ICON: 'user-activity-empty-logo',
    EMPTY_PAGE_TITLE: 'user-activity-empty-title',
    EMPTY_PAGE_SUBTITLE: 'user-activity-empty-subtitle',

    CHART_USER_ACTIVITY: 'user-activity-chart',
    CHART_MORE_BUTTON: 'user-activity-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'user-activity-download-button',
    CHART_MORE_ZOOM_ITEM: 'user-activity-more-zoom-button',

    CHART_ALL_USERS_ICON: 'user-activity-all-users-legend-icon',
    CHART_ALL_USERS_LABEL: 'user-activity-all-users-legend-label',
    CHART_ACTIVE_USERS_SEVEN_DAYS_ICON: 'user-activity-active-users-(7-days)-legend-icon',
    CHART_ACTIVE_USERS_SEVEN_DAYS_LABEL: 'user-activity-active-users-(7-days)-legend-label',
    CHART_ACTIVE_USERS_THIRTY_DAYS_ICON: 'user-activity-active-users-(30-days)-legend-icon',
    CHART_ACTIVE_USERS_THIRTY_DAYS_LABEL: 'user-activity-active-users-(30-days)-legend-label',
};

const userActivityDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'user-activity-empty-logo',
    EMPTY_TABLE_TITLE: 'user-activity-empty-title',
    EMPTY_TABLE_SUBTITLE: 'user-activity-empty-subtitle',
    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'user-activity-export-as-button',
    TABLE_SEARCH_INPUT: 'user-activity-datatable-search-input',

    COLUMN_NAME_SESSION_COUNT_LABEL: 'user-activity-label-session-count-(all-time)',
    COLUMN_NAME_SESSION_COUNT_SORTABLE_ICON: 'user-activity-sortable-icon-session-count-(all-time)',
    COLUMN_NAME_ALL_USERS_LABEL: 'user-activity-label-all-users',
    COLUMN_NAME_ALL_USERS_SORTABLE_ICON: 'user-activity-sortable-icon-all-users',
    COLUMN_NAME_ACTIVE_USERS_THIRTY_DAYS_LABEL: 'user-activity-label-active-users-(30-days)',
    COLUMN_NAME_ACTIVE_USERS_THIRTY_DAYS_SORTABLE_ICON: 'user-activity-sortable-icon-active-users-(30-days)',
    COLUMN_NAME_ACTIVE_USERS_SEVEN_DAYS_LABEL: 'user-activity-label-active-users-(7-days)',
    COLUMN_NAME_ACTIVE_USERS_SEVEN_DAYS_SORTABLE_ICON: 'user-activity-sortable-icon-active-users-(7-days)',

    //Columns' Rows' Datas Elements 
    SESSION_COUNT: 'datatable-user-activity-session-count-' + index,
    ALL_USERS_VALUE: 'datatable-user-activity-all-users-value-' + index,
    ALL_USERS_DIVIDER: 'datatable-user-activity-all-users-divider-' + index,
    ALL_USERS_PERCENTAGE: 'datatable-user-activity-all-users-percentage-' + index,
    ALL_USERS_PROGRESS_BAR: 'datatable-user-activity-all-users-progress-bar-' + index,
    ACTIVE_USERS_THIRTY_DAYS_VALUE: 'datatable-user-activity-active-users-thirty-days-value-' + index,
    ACTIVE_USERS_THIRTY_DAYS_DIVIDER: 'datatable-user-activity-active-users-thirty-days-divider-' + index,
    ACTIVE_USERS_THIRTY_DAYS_PERCENTAGE: 'datatable-user-activity-active-users-thirty-days-percentage-' + index,
    ACTIVE_USERS_THIRTY_DAYS_PROGRESS_BAR: 'datatable-user-activity-active-users-thirty-days-progress-bar-' + index,
    ACTIVE_USERS_SEVEN_DAYS_VALUE: 'datatable-user-activity-active-users-seven-days-value-' + index,
    ACTIVE_USERS_SEVEN_DAYS_DIVIDER: 'datatable-user-activity-active-users-seven-days-divider-' + index,
    ACTIVE_USERS_SEVEN_DAYS_PERCENTAGE: 'datatable-user-activity-active-users-seven-days-percentage-' + index,
    ACTIVE_USERS_SEVEN_DAYS_PROGRESS_BAR: 'datatable-user-activity-active-users-seven-days-progress-bar-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'user-activity-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'user-activity-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'user-activity-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'user-activity-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'user-activity-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'user-activity-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'user-activity-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'user-activity-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'user-activity-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'user-activity-last-page-arrow-button'
});

module.exports = {
    userActivityPageElements,
    userActivityEChartElements,
    userActivityDataTableElements
};