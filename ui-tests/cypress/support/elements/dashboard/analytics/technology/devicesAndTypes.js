export const devicesAndTypesPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_DEVICES: 'tab-devices-title',
    TAB_TYPES: 'tab-type-title',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    TAB_PLATFORMS: 'tab-platforms-title',
    TAB_DEVICES_AND_TYPES: 'tab-devices-and-types-title',
    TAB_RESOLUTIONS: 'tab-resolutions-title',
    TAB_APP_VERSIONS: 'tab-technology-versions-title',
    TAB_CARRIERS: 'tab-technology-carriers-title',
    TAB_DENSITIES: 'tab-technology-densities-title',
};

const devicesMetricCardElements = (index = 0) => {
    return {
        EMPTY_PIE_DEVICES_TOTAL_ICON: 'pie-devices-total-empty-logo',
        EMPTY_PIE_DEVICES_TOTAL_TITLE: 'pie-devices-total-empty-title',
        EMPTY_PIE_DEVICES_TOTAL_SUBTITLE: 'pie-devices-total-empty-subtitle',
        EMPTY_PIE_DEVICES_NEW_ICON: 'pie-devices-new-empty-logo',
        EMPTY_PIE_DEVICES_NEW_TITLE: 'pie-devices-new-empty-title',
        EMPTY_PIE_DEVICES_NEW_SUBTITLE: 'pie-devices-new-empty-subtitle',

        ECHARTS: '.cly-vue-chart',
        DEVICES_NAMES: '.cly-vue-chart-legend__s-series',
        DEVICES_VALUES: '.cly-vue-chart-legend__s-percentage',
        DEVICES_ICONS: '.cly-vue-chart-legend__s-rectangle',

        TOP_PLATFORMS_LABEL: "top-platforms-label",
        TOP_PLATFORMS_TOOLTIP: "top-platforms-tooltip",
        TOP_PLATFORMS_VERSIONS_LABEL: "top-platform-versions-label",
        TOP_PLATFORMS_VERSIONS_TOOLTIP: "top-platform-versions-tooltip",
        TOP_RESOLUTIONS_LABEL: "top-resolutions-label",
        TOP_RESOLUTIONS_TOOLTIP: "top-resolutions-tooltip",

        TOP_PLATFORMS_NAME: 'top-platforms-name-column-0-item-' + index,
        TOP_PLATFORMS_PERCENT: 'top-platforms-percent-column-0-item-' + index,
        TOP_PLATFORMS_PROGRESS_BAR: 'top-platforms-progress-bar-column-0-item-' + index,

        TOP_PLATFORMS_VERSIONS_NAME: 'top-platform-versions-name-column-1-item-' + index,
        TOP_PLATFORMS_VERSIONS_PERCENT: 'top-platform-versions-percent-column-1-item-' + index,
        TOP_PLATFORMS_VERSIONS_PROGRESS_BAR: 'top-platform-versions-progress-bar-column-1-item-' + index,

        TOP_RESOLUTIONS_NAME: 'top-resolutions-name-column-2-item-' + index,
        TOP_RESOLUTIONS_PERCENT: 'top-resolutions-percent-column-2-item-' + index,
        TOP_RESOLUTIONS_PROGRESS_BAR: 'top-resolutions-progress-bar-column-2-item-' + index,
    };
};

const devicesDataTableElements = (index = 0) => {
    return {

        EMPTY_TABLE_ICON: 'devices-empty-logo',
        EMPTY_TABLE_TITLE: 'devices-empty-title',
        EMPTY_TABLE_SUBTITLE: 'devices-empty-subtitle',

        EXPORT_AS_BUTTON: 'devices-export-as-button',
        TABLE_SEARCH_INPUT: 'devices-datatable-search-input',
        TABLE_ROWS: '.el-table__row',

        COLUMN_NAME_DEVICE_LABEL: 'devices-label-device',
        COLUMN_NAME_DEVICE_SORTABLE_ICON: 'devices-sortable-icon-device',
        COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'devices-label-total-sessions',
        COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'devices-sortable-icon-total-sessions',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'devices-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'devices-sortable-icon-total-users',
        COLUMN_NAME_NEW_USERS_LABEL: 'devices-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'devices-sortable-icon-new-users',

        //Columns' Rows' Datas Elements 
        DEVICE: 'datatable-devices-device-' + index,
        TOTAL_SESSIONS: 'datatable-devices-total-sessions-' + index,
        TOTAL_USERS: 'datatable-devices-total-users-' + index,
        NEW_USERS: 'datatable-devices-new-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'devices-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'devices-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'devices-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'devices-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'devices-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'devices-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'devices-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'devices-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'devices-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'devices-views-last-page-arrow-button'
    };
};

const typesMetricCardElements = (index = 0) => {
    return {
        EMPTY_PIE_TYPES_TOTAL_ICON: 'pie-types-total-empty-logo',
        EMPTY_PIE_TYPES_TOTAL_TITLE: 'pie-types-total-empty-title',
        EMPTY_PIE_TYPES_TOTAL_SUBTITLE: 'pie-types-total-empty-subtitle',
        EMPTY_PIE_TYPES_NEW_ICON: 'pie-types-new-empty-logo',
        EMPTY_PIE_TYPES_NEW_TITLE: 'pie-types-new-empty-title',
        EMPTY_PIE_TYPES_NEW_SUBTITLE: 'pie-types-new-empty-subtitle',

        ECHARTS: '.cly-vue-chart',
        TYPES_NAMES: '.cly-vue-chart-legend__s-series',
        TYPES_VALUES: '.cly-vue-chart-legend__s-percentage',
        TYPES_ICONS: '.cly-vue-chart-legend__s-rectangle',
    };
};

const typesDataTableElements = (index = 0) => {
    return {

        EMPTY_TABLE_ICON: 'devices-types-empty-logo',
        EMPTY_TABLE_TITLE: 'devices-types-empty-title',
        EMPTY_TABLE_SUBTITLE: 'devices-types-empty-subtitle',

        EXPORT_AS_BUTTON: 'devices-types-export-as-button',
        TABLE_SEARCH_INPUT: 'devices-types-datatable-search-input',
        TABLE_ROWS: '.el-table__row',

        COLUMN_NAME_DEVICE_TYPE_LABEL: 'devices-types-label-device-type',
        COLUMN_NAME_DEVICE_TYPE_SORTABLE_ICON: 'devices-types-sortable-icon-device-type',
        COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'devices-types-label-total-sessions',
        COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'devices-types-sortable-icon-total-sessions',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'devices-types-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'devices-types-sortable-icon-total-users',
        COLUMN_NAME_NEW_USERS_LABEL: 'devices-types-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'devices-types-sortable-icon-new-users',

        //Columns' Rows' Datas Elements
        DEVICE_TYPE: 'datatable-devices-types-type-' + index,
        TOTAL_SESSIONS: 'datatable-devices-types-total-sessions-' + index,
        TOTAL_USERS: 'datatable-devices-types-total-users-' + index,
        NEW_USERS: 'datatable-devices-types-new-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'devices-types-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'devices-types-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'devices-types-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'devices-types-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'devices-types-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'devices-types-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'devices-types-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'devices-types-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'devices-types-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'devices-types-views-last-page-arrow-button'
    };
};

module.exports = {
    devicesAndTypesPageElements,
    devicesMetricCardElements,
    devicesDataTableElements,
    typesMetricCardElements,
    typesDataTableElements
};