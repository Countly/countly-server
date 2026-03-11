export const sdkStatsPageElements = {
    PAGE_TITLE: 'header-title',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    STATS_FOR_LABEL: 'sdk-stats-for-label',
    STATS_FOR_SELECT: 'sdk-stats-for-combobox-select-input-pseudo-input-label',

    SDK_VERSION_DISTRIBUTION_LABEL: 'sdk-version-distribution-label',

    SDK_VERSION_ADOPTION_FOR_LABEL: 'stats-sdk-version-adoption-for-label',
    SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_SELECT: 'stats-sdk-version-adoption-for-select-input',
    SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_AS_LABEL: 'stats-sdk-version-adoption-for-as-label',
    SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_AS_TYPE_SELECT: 'stats-sdk-version-adoption-for-as-combobox-select-input-pseudo-input-label',

    TAB_SDK_STATS: 'tab-sdk-stats-title',
    TAB_REQUEST_STATS: 'tab-request-stats-title',
    TAB_HEALTH_CHECK: 'tab-health-check-title',
    TAB_SDK_CONFIGURATION: 'tab-sdk-behavior-settings-title',

    TAB_SDK_S: 'tab-sdks-title',
    TAB_SDK_VERSIONS: 'tab-sdk-versions-title',
};

const sdkStatsMetricCardElements = (index = 0) => ({
    STATS_FOR_TABLE_NO_DATA_LABEL: 'sdk-stats-for-table-no-data-label',

    SDK_NAME: 'metric-card-sdk-stats-' + index + '-column-label',
    SDK_VALUE: 'metric-card-sdk-stats-' + index + '-column-number',
    SDK_PERCENTAGE: 'metric-card-sdk-stats-' + index + '-description',
    SDK_PROGRESS_CIRCLE: 'el-progress-metric-card-sdk-stats-' + index + '-column',

    SDK_VERSION_DISTRIBUTION_TABLE_NO_DATA_LABEL: 'sdk-version-distribution-table-no-data-label',

    VERSION_NAME: 'metric-card-column-sdk-version-distribution-' + index + '-name',
    VERSION_VALUE: 'metric-card-column-sdk-version-distribution-' + index + '-value',
    VERSION_DIVIDER: 'metric-card-column-sdk-version-distribution-' + index + '-divider',
    VERSION_PERCENTAGE: 'metric-card-column-sdk-version-distribution-' + index + '-percent',
    VERSION_PROGRESS_BAR: 'metric-card-column-sdk-version-distribution-' + index + '-progress-bar',
});

export const sdkStatsEChartElements = {
    EMPTY_TABLE_ICON: 'sdk-version-table-empty-logo',
    EMPTY_TABLE_TITLE: 'sdk-version-table-empty-title',
    EMPTY_TABLE_SUBTITLE: 'sdk-version-table-empty-subtitle',

    CHART_SDK_VERSION: 'sdk-version-table-chart',
    CHART_MORE_BUTTON: 'sdk-version-table-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'sdk-version-table-cly-chart-more-dropdown-download-option-button',
    CHART_MORE_ZOOM_ITEM: 'sdk-version-table-cly-chart-more-dropdown-zoom-option-button',

    VERSION_ICONS: '.cly-vue-chart-legend__s-rectangle',
    VERSION_NUMBERS: '.cly-vue-chart-legend__s-title',
};

const sdkStatsSdksDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-sdks-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-sdks-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-sdks-empty-subtitle',

    EXPORT_AS_BUTTON: 'datatable-sdks-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-sdks-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_SDK_LABEL: 'datatable-sdks-label-sdk',
    COLUMN_NAME_SDK_SORTABLE_ICON: 'datatable-sdks-sortable-icon-sdk',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'datatable-sdks-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'datatable-sdks-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'datatable-sdks-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'datatable-sdks-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'datatable-sdks-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'datatable-sdks-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    SDK: 'datatable-sdks-sdk-' + index,
    TOTAL_SESSIONS: 'datatable-sdks-total-sessions-' + index,
    TOTAL_USERS: 'datatable-sdks-total-users-' + index,
    NEW_USERS: 'datatable-sdks-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-sdks-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-sdks-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-sdks-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-sdks-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-sdks-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-sdks-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-sdks-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-sdks-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-sdks-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-sdks-views-last-page-arrow-button'
});

const sdkStatsSdkVersionsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-sdk-versions-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-sdk-versions-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-sdk-versions-empty-subtitle',

    VERSION_SELECT: 'sdk-version-select-input',
    EXPORT_AS_BUTTON: 'datatable-sdk-versions-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-sdk-versions-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_PLATFORM_VERSION_LABEL: 'datatable-sdk-versions-label-platform-version',
    COLUMN_NAME_PLATFORM_VERSION_SORTABLE_ICON: 'datatable-sdk-versions-sortable-icon-platform-version',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'datatable-sdk-versions-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'datatable-sdk-versions-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'datatable-sdk-versions-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'datatable-sdk-versions-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'datatable-sdk-versions-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'datatable-sdk-versions-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    PLATFORM_VERSION: 'datatable-sdks-sdk-versions-platform-version-' + index,
    TOTAL_SESSIONS: 'datatable-sdk-versions-total-sessions-' + index,
    TOTAL_USERS: 'datatable-sdk-versions-total-users-' + index,
    NEW_USERS: 'datatable-sdk-versions-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-sdk-versions-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-sdk-versions-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-sdk-versions-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-sdk-versions-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-sdk-versions-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-sdk-versions-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-sdk-versions-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-sdk-versions-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-sdk-versions-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-sdk-versions-views-last-page-arrow-button'
});

module.exports = {
    sdkStatsPageElements,
    sdkStatsMetricCardElements,
    sdkStatsEChartElements,
    sdkStatsSdksDataTableElements,
    sdkStatsSdkVersionsDataTableElements
};