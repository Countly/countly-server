export const crashPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_CRASH_GROUPS: 'tab-crash-groups-label',
    TAB_CRASH_STATISTICS: 'tab-crash-statistics-label',
};

export const crashGroupsPageElements = {
    AUTO_REFRESH_IS_LABEL: 'crash-groups-auto-refresh-toggle-is-label',
    ENABLED_LABEL: 'crash-groups-auto-refresh-toggle-enabled-label',
    AUTO_REFRESH_IS_ENABLED_TOOLTIP: 'crash-groups-auto-refresh-toggle-tooltip',
    STOP_AUTO_REFRESH_BUTTON: 'crash-groups-auto-refresh-toggle-button',
    ENABLE_AUTO_REFRESH_TOGGLE: 'crash-groups-auto-refresh-toggle-el-switch-core',
};

const crashGroupsDataTableElements = (index = 0) => ({
    EDIT_COLUMNS_BUTTON: 'crash-groups-edit-columns-button',
    EXPORT_AS_BUTTON: 'crash-groups-export-as-button',
    DATATABLE_SEARCH_INPUT: 'crash-groups-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'crash-groups-empty-logo',
    EMPTY_TABLE_TITLE: 'crash-groups-empty-title',
    EMPTY_TABLE_SUBTITLE: 'crash-groups-empty-subtitle',

    COLUMN_NAME_CRASH_GROUP_LABEL: 'crash-groups-label-crash-group',
    COLUMN_NAME_PLATFORM_LABEL: 'crash-groups-label-platform',
    COLUMN_NAME_PLATFORM_SORTABLE_ICON: 'crash-groups-sortable-icon-platform',
    COLUMN_NAME_OCCURRENCES_LABEL: 'crash-groups-label-occurrences',
    COLUMN_NAME_OCCURRENCES_SORTABLE_ICON: 'crash-groups-sortable-icon-occurrences',
    COLUMN_NAME_LAST_OCCURRENCES_LABEL: 'crash-groups-label-last-occurrence',
    COLUMN_NAME_LAST_OCCURRENCES_SORTABLE_ICON: 'crash-groups-sortable-icon-last-occurrence',
    COLUMN_NAME_AFFECTED_USERS_LABEL: 'crash-groups-label-affected-users',
    COLUMN_NAME_AFFECTED_USERS_SORTABLE_ICON: 'crash-groups-sortable-icon-affected-users',
    COLUMN_NAME_LATEST_APP_VERSION_LABEL: 'crash-groups-label-latest-app-version',
    COLUMN_NAME_LATEST_APP_VERSION_SORTABLE_ICON: 'crash-groups-sortable-icon-latest-app-version',

    //Columns' Rows' Datas Elements 
    CRASH_GROUP: 'datatable-crash-groups-group-title-' + index,
    CRASH_GROUP_BADGE_TYPE_1: 'datatable-crash-groups-badge-type-0-col-' + index,
    CRASH_GROUP_BADGE_TYPE_2: 'datatable-crash-groups-badge-type-1-col-' + index,
    CRASH_GROUP_BADGE_TYPE_3: 'datatable-crash-groups-badge-type-2-col-' + index,
    CRASH_GROUP_BADGE_TYPE_4: 'datatable-crash-groups-badge-type-3-col-' + index,
    PLATFORM: 'datatable-crash-groups-platform-' + index,
    OCCURRENCES: 'datatable-crash-groups-occurences-' + index,
    LAST_OCCURANCES: 'datatable-crash-groups-last-occurrence-' + index,
    AFFECTED_USERS: 'datatable-crash-groups-affected-users-' + index,
    LATEST_APP_VERSION: 'datatable-crash-groups-latest-app-version-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'crash-groups-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'crash-groups-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'crash-groups-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'crash-groups-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'crash-groups-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'crash-groups-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'crash-groups-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'crash-groups-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'crash-groups-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'crash-groups-views-last-page-arrow-button'
});

const crashStatisticsMetricCardElements = (index = 0) => ({
    AFFECTED_USERS_LABEL: 'metric-card-affected-user-column-label',
    AFFECTED_USERS_TOOLTIP: 'metric-card-affected-user-column-tooltip',
    AFFECTED_USERS_NUMBER_LABEL: 'metric-card-affected-user-column-number',
    AFFECTED_USERS_DESCRIPTION_LABEL: 'metric-card-affected-user-description',
    AFFECTED_USERS_DESCRIPTION_PROGRESS_CIRCLE: 'el-progress-metric-card-affected-user-column',

    RESOLUTION_STATUS_LABEL: 'metric-card-resolution-status-column-label',
    RESOLUTION_STATUS_TOOLTIP: 'metric-card-resolution-status-column-tooltip',
    RESOLUTION_STATUS_NUMBER_LABEL: 'metric-card-resolution-status-column-number',
    RESOLUTION_STATUS_DESCRIPTION_LABEL: 'metric-card-resolution-status-description',
    RESOLUTION_STATUS_DESCRIPTION_PROGRESS_CIRCLE: 'el-progress-metric-card-resolution-status-column',

    CRASH_FATALITY_LABEL: 'metric-card-crash-fatality-column-label',
    CRASH_FATALITY_TOOLTIP: 'metric-card-crash-fatality-column-tooltip',
    CRASH_FATALITY_NUMBER_LABEL: 'metric-card-crash-fatality-column-number',
    CRASH_FATALITY_DESCRIPTION_LABEL: 'metric-card-crash-fatality-description',
    CRASH_FATALITY_DESCRIPTION_PROGRESS_CIRCLE: 'el-progress-metric-card-crash-fatality-column',

    TOP_PLATFORMS_LABEL: 'crash-statistics-top-platforms-label',
    TOP_PLATFORMS_TOOLTIP: 'crash-statistics-top-platforms-tooltip',

    TOP_PLATFORM_NAME: 'crash-statistics-top-platforms-platform-' + index,
    TOP_PLATFORM_USER_PERCENTAGE: 'crash-statistics-top-platforms-platform-users-percentage-' + index,
    TOP_PLATFORM_PROGRESS_BAR: 'crash-statistics-top-platforms-platform-' + index + '-progress-bar',

    NEW_CRASHES_LABEL: 'crash-statistics-new-crashes-title',
    NEW_CRASHES_TOOLTIP: 'crash-statistics-new-crashes-tooltip',
    NEW_CRASHES_NUMBER_LABEL: 'crash-statistics-new-crashes-value',

    REOCCURRED_CRASHES_LABEL: 'crash-statistics-reoccured-crashes-title',
    REOCCURRED_CRASHES_TOOLTIP: 'crash-statistics-reoccured-crashes-tooltip',
    REOCCURRED_CRASHES_NUMBER_LABEL: 'crash-statistics-reoccured-crashes-value',

    REVENUE_LOSS_LABEL: 'crash-statistics-revenue-loss-title',
    REVENUE_LOSS_TOOLTIP: 'crash-statistics-revenue-loss-tooltip',
    REVENUE_LOSS_NUMBER_LABEL: 'crash-statistics-revenue-loss-value'
});

const crashStatisticsEChartElements = {
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    CRASH_FILTERS_LABEL: 'crashes-crash-filters-label',
    FILTER_PARAMETERS_SELECT: 'cly-multi-select-test-id-pseudo-input-label',

    CHART_TYPE_SELECT_COMBOBOX: 'cly-chart-line-default-test-id-header-select-icon',
    CHART_ANNOTATION_BUTTON: 'chart-type-annotation-icon',
    CHART_MORE_BUTTON: 'cly-chart-line-default-test-id-header-cly-chart-more-dropdown-more-option-button',

    TOTAL_OCCURENCES_LABEL: 'cly-section-total-occurences-title',
    TOTAL_OCCURENCES_TOOLTIP: 'cly-section-total-occurences-tooltip',
    TOTAL_OCCURENCES_NUMBER_LABEL: 'cly-section-total-occurences-value',
    TOTAL_OCCURENCES_TREND_ICON: 'cly-section-total-occurences-arrow',
    TOTAL_OCCURENCES_CHANGE_VALUE_LABEL: 'cly-section-total-occurences-change-value',
    TOTAL_OCCURENCES_GRAPH: 'total-occurrences-graph',

    UNIQUE_CRASHES_LABEL: 'cly-section-unique-crashes-title',
    UNIQUE_CRASHES_TOOLTIP: 'cly-section-unique-crashes-tooltip',
    UNIQUE_CRASHES_NUMBER_LABEL: 'cly-section-unique-crashes-value',
    UNIQUE_CRASHES_TREND_ICON: 'cly-section-unique-crashes-arrow',
    UNIQUE_CRASHES_CHANGE_VALUE_LABEL: 'cly-section-unique-crashes-change-value',
    UNIQUE_CRASHES_GRAPH: 'unique-crashes-graph',

    CRASHES_OR_SESSIONS_LABEL: 'cly-section-crashes-or-sessions-title',
    CRASHES_OR_SESSIONS_TOOLTIP: 'cly-section-crashes-or-sessions-tooltip',
    CRASHES_OR_SESSIONS_NUMBER_LABEL: 'cly-section-crashes-or-sessions-value',
    CRASHES_OR_SESSIONS_TREND_ICON: 'cly-section-crashes-or-sessions-arrow',
    CRASHES_OR_SESSIONS_CHANGE_VALUE_LABEL: 'cly-section-crashes-or-sessions-change-value',
    CRASHES_OR_SESSIONS_GRAPH: 'crashes-per-session-graph',

    CRASH_FREE_USERS_LABEL: 'cly-section-crash-free-users-title',
    CRASH_FREE_USERS_TOOLTIP: 'cly-section-crash-free-users-tooltip',
    CRASH_FREE_USERS_NUMBER_LABEL: 'cly-section-crash-free-users-value',
    CRASH_FREE_USERS_TREND_ICON: 'cly-section-crash-free-users-arrow',
    CRASH_FREE_USERS_CHANGE_VALUE_LABEL: 'cly-section-crash-free-users-change-value',
    CRASH_FREE_USERS_GRAPH: 'crashfree-users-graph',

    CRASH_FREE_SESSIONS_LABEL: 'cly-section-crash-free-sessions-title',
    CRASH_FREE_SESSIONS_TOOLTIP: 'cly-section-crash-free-sessions-tooltip',
    CRASH_FREE_SESSIONS_NUMBER_LABEL: 'cly-section-crash-free-sessions-value',
    CRASH_FREE_SESSIONS_TREND_ICON: 'cly-section-crash-free-sessions-arrow',
    CRASH_FREE_SESSIONS_CHANGE_VALUE_LABEL: 'cly-section-crash-free-sessions-change-value',
    CRASH_FREE_SESSIONS_GRAPH: 'crashfree-sessions-graph',

    CHART_TYPE_COMBOBOX: 'cly-chart-line-default-test-id-header-select-input',
    ANNOTATION_BUTTON: 'chart-type-annotation-button',
    MORE_OPTION_BUTTON: 'cly-chart-line-default-test-id-header-cly-chart-more-dropdown-more-option-button',

    CHART_PREVIOUS_TOTAL_OCCURENCES_ICON: 'cly-chart-line-default-test-id-legend-previous-total-occurences-legend-icon',
    CHART_PREVIOUS_TOTAL_OCCURENCES_LABEL: 'cly-chart-line-default-test-id-legend-previous-total-occurences-legend-label',
    CHART_TOTAL_OCCURENCES_ICON: 'cly-chart-line-default-test-id-legend-total-occurences-legend-icon',
    CHART_TOTAL_OCCURENCES_LABEL: 'cly-chart-line-default-test-id-legend-total-occurences-legend-label'
};

module.exports = {
    crashPageElements,
    crashGroupsPageElements,
    crashGroupsDataTableElements,
    crashStatisticsMetricCardElements,
    crashStatisticsEChartElements
};