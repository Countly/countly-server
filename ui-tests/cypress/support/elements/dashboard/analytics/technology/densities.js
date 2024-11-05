export const densitiesPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
    TAB_TABLE_DENSITIES: 'tab-densities-table-title',
    TAB_TABLE_VERSIONS: 'tab-versions-table-title',
    DENSITIES_FOR_LABEL: 'densities-for-label',
    DENSITIES_FOR_COMBOBOX: 'densities-for-select-input-pseudo-input-label',
    DENSITIES_FOR_TOTAL_SESSIONS_OPTION: 't-total-sessions-el-options',
    DENSITIES_FOR_TOTAL_USERS_OPTION: 'u-total-users-el-options',
    DENSITIES_FOR_NEW_USERS_OPTION: 'n-new-users-el-options',
    DENSITIES_DISTRIBUTION_LABEL: 'density-distribution-label',
    DENSITIES_DISTRIBUTION_NO_DATA_LABEL: 'destiny-distribution-no-data-label',
};

const densitiesMetricCardElements = (index = 0) => ({
    DENSITIES_FOR_NO_DATA_LABEL: 'density-for-no-data-label',
    DESTINY_NAME: 'metric-card-density-' + index + '-column-label',
    DESTINY_NUMBER: 'metric-card-density-' + index + '-column-number',
    DESTINY_PERCENTAGE: 'metric-card-density-' + index + '-description',
    BOUNCE_RATE_PROGRESS_CIRCLE: 'el-progress-metric-card-density-' + index + '-column',

    VERSION_NO_DATA_LABEL: 'density-distribution-no-data-label',
    VERSION_NAME: 'metric-card-column-density-items-' + index + '-name',
    VERSION_NUMBER: 'metric-card-column-density-items-' + index + '-desc',
    VERSION_DIVIDER: 'metric-card-column-density-items-' + index + '-divider',
    VERSION_PERCENTAGE: 'metric-card-column-density-items-' + index + '-percent',
    VERSION_PROGRESS_BAR: 'metric-card-column-density-items-' + index + '-progress-bar',
});

const densitiesDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'densities-empty-logo',
    EMPTY_TABLE_TITLE: 'densities-empty-title',
    EMPTY_TABLE_SUBTITLE: 'densities-empty-subtitle',

    EXPORT_AS_BUTTON: 'densities-export-as-button',
    TABLE_SEARCH_INPUT: 'densities-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_DENSITY_LABEL: 'densities-label-density',
    COLUMN_NAME_DENSITY_SORTABLE_ICON: 'densities-sortable-icon-density',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'densities-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'densities-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'densities-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'densities-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'densities-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'densities-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    DENSITY: 'datatable-densities-density-' + index,
    TOTAL_SESSIONS: 'datatable-densities-total-sessions-' + index,
    TOTAL_USERS: 'datatable-densities-total-users-' + index,
    NEW_USERS: 'datatable-densities-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'densities-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'densities-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'densities-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'densities-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'densities-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'densities-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'densities-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'densities-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'densities-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'densities-views-last-page-arrow-button'
});

const versionsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'density-versions-empty-logo',
    EMPTY_TABLE_TITLE: 'density-versions-empty-title',
    EMPTY_TABLE_SUBTITLE: 'density-versions-empty-subtitle',

    DESTINY_SELECT: 'density-select-input',
    EXPORT_AS_BUTTON: 'density-versions-export-as-button',
    TABLE_SEARCH_INPUT: 'density-versions-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_DENSITY_VERSION_LABEL: 'density-versions-label-density-version',
    COLUMN_NAME_DENSITY_VERSION_SORTABLE_ICON: 'density-versions-sortable-icon-density-version',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'density-versions-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'density-versions-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'density-versions-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'density-versions-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'density-versions-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'density-versions-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    DENSITY_VERSION: 'datatable-density-versions-version-' + index,
    TOTAL_SESSIONS: 'datatable-density-versions-total-sessions-' + index,
    TOTAL_USERS: 'datatable-density-versions-total-users-' + index,
    NEW_USERS: 'datatable-density-versions-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'density-versions-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'density-versions-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'density-versions-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'density-versions-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'density-versions-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'density-versions-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'density-versions-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'density-versions-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'density-versions-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'density-versions-views-last-page-arrow-button'
});

module.exports = {
    densitiesPageElements,
    densitiesMetricCardElements,
    densitiesDataTableElements,
    versionsDataTableElements
};