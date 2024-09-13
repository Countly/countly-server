export const platformsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
    TAB_TABLE_PLATFORMS: 'tab-platforms-table-title',
    TAB_TABLE_VERSIONS: 'tab-versions-table-title',
    PLATFORMS_FOR_LABEL: 'platforms-for-label',
    PLATFORMS_FOR_LABEL_COMBOBOX: 'platforms-for-combobox-select-input-pseudo-input-label',
    PLATFORMS_FOR_TOTAL_SESSIONS_OPTION: 't-total-sessions-el-options',
    PLATFORMS_FOR_TOTAL_USERS_OPTION: 'u-total-users-el-options',
    PLATFORMS_FOR_NEW_USERS_OPTION: 'n-new-users-el-options',
    PLATFORMS_VERSION_DISTRIBUTION_LABEL: 'platforms-version-distribution-label',
};

const platformsMetricCardElements = (index = 0) => ({
    PLATFORMS_FOR_NO_DATA_LABEL: 'platforms-for-no-data-label',
    PLATFORM_NAME: 'metric-card-platform-' + index + '-column-label',
    PLATFORM_NUMBER: 'metric-card-platform-' + index + '-column-number',
    PLATFORM_PERCENTAGE: 'metric-card-platform-' + index + '-description',
    BOUNCE_RATE_PROGRESS_CIRCLE: 'el-progress-metric-card-platform-' + index + '-column',

    VERSION_NO_DATA_LABEL: 'platforms-version-distribution-no-data-label',
    VERSION_NAME: 'metric-card-column-platform-' + index + '-name',
    VERSION_NUMBER: 'metric-card-column-platform-' + index + '-desc',
    VERSION_DIVIDER: 'metric-card-column-platform-' + index + '-divider',
    VERSION_PERCENTAGE: 'metric-card-column-platform-' + index + '-percent',
    VERSION_PROGRESS_BAR: 'metric-card-column-platform-' + index + '-progress-bar',
});

const platformsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'platforms-empty-logo',
    EMPTY_TABLE_TITLE: 'platforms-empty-title',
    EMPTY_TABLE_SUBTITLE: 'platforms-empty-subtitle',

    EXPORT_AS_BUTTON: 'platforms-export-as-button',
    TABLE_SEARCH_INPUT: 'platforms-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_PLATFORMS_LABEL: 'platforms-label-platforms',
    COLUMN_NAME_PLATFORMS_SORTABLE_ICON: 'platforms-sortable-icon-platforms',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'platforms-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'platforms-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'platforms-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'platforms-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'platforms-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'platforms-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    PLATFORMS: 'datatable-platforms-platforms-' + index,
    TOTAL_SESSIONS: 'datatable-platforms-total-sessions-' + index,
    TOTAL_USERS: 'datatable-platforms-total-users-' + index,
    NEW_USERS: 'datatable-platforms-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'platforms-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'platforms-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'platforms-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'platforms-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'platforms-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'platforms-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'platforms-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'platforms-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'platforms-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'platforms-views-last-page-arrow-button'
});

const versionsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'versions-empty-logo',
    EMPTY_TABLE_TITLE: 'versions-empty-title',
    EMPTY_TABLE_SUBTITLE: 'versions-empty-subtitle',

    PLATFORM_SELECT: 'platforms-select-input',
    EXPORT_AS_BUTTON: 'versions-export-as-button',
    TABLE_SEARCH_INPUT: 'versions-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_VERSIONS_LABEL: 'versions-label-versions',
    COLUMN_NAME_VERSIONS_SORTABLE_ICON: 'versions-sortable-icon-versions',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'versions-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'versions-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'versions-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'versions-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'versions-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'versions-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    VERSIONS: 'datatable-versions-versions-' + index,
    TOTAL_SESSIONS: 'datatable-versions-total-sessions-' + index,
    TOTAL_USERS: 'datatable-versions-total-users-' + index,
    NEW_USERS: 'datatable-versions-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'versions-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'versions-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'versions-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'versions-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'versions-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'versions-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'versions-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'versions-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'versions-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'versions-views-last-page-arrow-button'
});

module.exports = {
    platformsPageElements,
    platformsMetricCardElements,
    platformsDataTableElements,
    versionsDataTableElements
};