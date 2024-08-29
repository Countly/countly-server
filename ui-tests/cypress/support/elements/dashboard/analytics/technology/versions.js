export const versionsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    APP_VERSIONS_FOR_LABEL: 'app-versions-for-label',
    APP_VERSIONS_FOR_COMBOBOX: 'app-versions-for-select-input-pseudo-input-label',
    AS_LABEL: 'as-label',
    AS_VALUE_COMBOBOX: 'as-value-select-input-pseudo-input-label',

    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
};

const versionsEGraphElements = (index = 0) => {
    return {
        EMPTY_EGRAPH_ICON: 'app-versions-empty-logo',
        EMPTY_EGRAPH_TITLE: 'app-versions-empty-title',
        EMPTY_EGRAPH_SUBTITLE: 'app-versions-empty-subtitle',

        ECHARTS: '.cly-vue-chart',
        VERSIONS_NAMES: '.cly-vue-chart-legend__s-title',
        VERSIONS_ICONS: '.cly-vue-chart-legend__s-rectangle',
    };
};

const versionsDataTableElements = (index = 0) => {
    return {

        EMPTY_TABLE_ICON: 'app-versions-empty-logo',
        EMPTY_TABLE_TITLE: 'app-versions-empty-title',
        EMPTY_TABLE_SUBTITLE: 'app-versions-empty-subtitle',

        EXPORT_AS_BUTTON: 'app-versions-export-as-button',
        TABLE_SEARCH_INPUT: 'app-versions-datatable-search-input',
        TABLE_ROWS: '.el-table__row',

        COLUMN_NAME_APP_VERSION_LABEL: 'app-versions-label-app-version',
        COLUMN_NAME_APP_VERSION_SORTABLE_ICON: 'app-versions-sortable-icon-app-version',
        COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'app-versions-label-total-sessions',
        COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'app-versions-sortable-icon-total-sessions',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'app-versions-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'app-versions-sortable-icon-total-users',
        COLUMN_NAME_NEW_USERS_LABEL: 'app-versions-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'app-versions-sortable-icon-new-users',

        //Columns' Rows' Datas Elements
        APP_VERSION: 'datatable-app-versions-app-version-' + index,
        TOTAL_SESSIONS: 'datatable-app-versions-total-sessions-' + index,
        TOTAL_USERS: 'datatable-app-versions-total-users-' + index,
        NEW_USERS: 'datatable-app-versions-new-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'app-versions-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'app-versions-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'app-versions-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'app-versions-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'app-versions-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'app-versions-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'app-versions-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'app-versions-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'app-versions-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'app-versions-views-last-page-arrow-button'
    };
};

module.exports = {
    versionsPageElements,
    versionsEGraphElements,
    versionsDataTableElements
};