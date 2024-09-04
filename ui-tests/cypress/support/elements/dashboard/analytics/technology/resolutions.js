export const resolutionsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
};

const resolutionsEGraphElements = (index = 0) => ({
    EMPTY_PIE_TOTAL_ICON: 'pie-total-empty-logo',
    EMPTY_PIE_TOTAL_TITLE: 'pie-total-empty-title',
    EMPTY_PIE_TOTAL_SUBTITLE: 'pie-total-empty-subtitle',
    EMPTY_PIE_NEW_ICON: 'pie-new-empty-logo',
    EMPTY_PIE_NEW_TITLE: 'pie-new-empty-title',
    EMPTY_PIE_NEW_SUBTITLE: 'pie-new-empty-subtitle',

    ECHARTS: '.cly-vue-chart',
    RESOLUTIONS_NAMES: '.cly-vue-chart-legend__s-title',
    RESOLUTIONS_VALUES: '.cly-vue-chart-legend__s-percentage',
    RESOLUTIONS_ICONS: '.cly-vue-chart-legend__s-rectangle',
});

const resolutionsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'resolutions-empty-logo',
    EMPTY_TABLE_TITLE: 'resolutions-empty-title',
    EMPTY_TABLE_SUBTITLE: 'resolutions-empty-subtitle',

    EXPORT_AS_BUTTON: 'resolutions-export-as-button',
    TABLE_SEARCH_INPUT: 'resolutions-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_RESOLUTION_LABEL: 'resolutions-label-resolution',
    COLUMN_NAME_RESOLUTIONS_SORTABLE_ICON: 'resolutions-sortable-icon-resolution',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'resolutions-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'resolutions-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'resolutions-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'resolutions-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'resolutions-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'resolutions-sortable-icon-new-users',

    //Columns' Rows' Datas Elements
    RESOLUTION: 'datatable-resolutions-resolution-' + index,
    TOTAL_SESSIONS: 'datatable-resolutions-total-sessions-' + index,
    TOTAL_USERS: 'datatable-resolutions-total-users-' + index,
    NEW_USERS: 'datatable-resolutions-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'resolutions-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'resolutions-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'resolutions-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'resolutions-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'resolutions-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'resolutions-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'resolutions-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'resolutions-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'resolutions-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'resolutions-views-last-page-arrow-button'
});

module.exports = {
    resolutionsPageElements,
    resolutionsEGraphElements,
    resolutionsDataTableElements
};