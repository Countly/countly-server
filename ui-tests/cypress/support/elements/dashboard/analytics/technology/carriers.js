export const carriersPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
}

const carriersEGraphElements = (index = 0) => {
    return {
        EMPTY_PIE_NEW_ICON: 'pie-new-empty-logo',
        EMPTY_PIE_NEW_TITLE: 'pie-new-empty-title',
        EMPTY_PIE_NEW_SUBTITLE: 'pie-new-empty-subtitle',
        EMPTY_PIE_TOTAL_ICON: 'pie-total-empty-logo',
        EMPTY_PIE_TOTAL_TITLE: 'pie-total-empty-title',
        EMPTY_PIE_TOTAL_SUBTITLE: 'pie-total-empty-subtitle',

        ECHARTS: '.cly-vue-chart',
        CARRIERS_NAMES: '.cly-vue-chart-legend__s-title',
        CARRIERS_VALUES: '.cly-vue-chart-legend__s-percentage',
        CARRIERS_ICONS: '.cly-vue-chart-legend__s-rectangle',
    };
};

const carriersDataTableElements = (index = 0) => {
    return {

        EMPTY_TABLE_ICON: 'carriers-empty-logo',
        EMPTY_TABLE_TITLE: 'carriers-empty-title',
        EMPTY_TABLE_SUBTITLE: 'carriers-empty-subtitle',

        EXPORT_AS_BUTTON: 'carriers-export-as-button',
        TABLE_SEARCH_INPUT: 'carriers-datatable-search-input',
        TABLE_ROWS: '.el-table__row',

        COLUMN_NAME_CARRIER_LABEL: 'carriers-label-carrier',
        COLUMN_NAME_CARRIER_SORTABLE_ICON: 'carriers-sortable-icon-carrier',
        COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'carriers-label-total-sessions',
        COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'carriers-sortable-icon-total-sessions',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'carriers-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'carriers-sortable-icon-total-users',
        COLUMN_NAME_NEW_USERS_LABEL: 'carriers-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'carriers-sortable-icon-new-users',

        //Columns' Rows' Datas Elements
        CARRIER: 'datatable-carriers-carrier-' + index,
        TOTAL_SESSIONS: 'datatable-carriers-total-sessions-' + index,
        TOTAL_USERS: 'datatable-carriers-total-users-' + index,
        NEW_USERS: 'datatable-carriers-new-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'carriers-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'carriers-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'carriers-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'carriers-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'carriers-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'carriers-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'carriers-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'carriers-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'carriers-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'carriers-views-last-page-arrow-button'
    };
}

module.exports = {
    carriersPageElements,
    carriersEGraphElements,
    carriersDataTableElements
};