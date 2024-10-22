export const usersPageElements = {
    PAGE_TITLE: 'header-title',

    TAB_METRICS: 'tab-metrics-title',
    TAB_USERS: 'tab-users-title',
    TAB_CONSENT_HISTORY: 'tab-consent-history-title',
    TAB_EXPORT_PURGE_HISTORY: 'tab-export/purge-history-title'
};

const usersDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-compliance-hub-users-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-compliance-hub-users-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-compliance-hub-users-empty-subtitle',

    EXPORT_AS_BUTTON: 'datatable-compliance-hub-users-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-compliance-hub-users-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_ID_LABEL: 'datatable-compliance-hub-users-label-id',
    COLUMN_NAME_ID_SORTABLE_ICON: 'datatable-compliance-hub-users-sortable-icon-id',
    COLUMN_NAME_DEVICE_LABEL: 'datatable-compliance-hub-users-label-device',
    COLUMN_NAME_DEVICE_SORTABLE_ICON: 'datatable-compliance-hub-users-sortable-icon-device',
    COLUMN_NAME_APP_VERSION_LABEL: 'datatable-compliance-hub-users-label-app-version',
    COLUMN_NAME_APP_VERSION_SORTABLE_ICON: 'datatable-compliance-hub-users-sortable-icon-app-version',
    COLUMN_NAME_CONSENT_LABEL: 'datatable-compliance-hub-users-label-consent',
    COLUMN_NAME_CONSENT_SORTABLE_ICON: 'datatable-compliance-hub-users-sortable-icon-consent',
    COLUMN_NAME_TIME_LABEL: 'datatable-compliance-hub-users-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'datatable-compliance-hub-users-sortable-icon-time',

    //Columns' Rows' Datas Elements 
    ID: 'datatable-users-id-' + index,
    DEVICE: 'datatable-users-device-' + index,
    APP_VERSION: 'datatable-users-app-version-' + index,
    CONSENT_OPT_IN_LABEL: 'datatable-users-consent-opt-in-label-' + index,
    CONSENT_OPT_IN_LIST: 'datatable-users-consent-opt-in-list-' + index,
    CONSENT_OPT_OUT_LABEL: 'datatable-users-consent-opt-out-label-' + index,
    CONSENT_OPT_OUT_LIST: 'datatable-users-consent-opt-out-list-' + index,
    TIME: 'datatable-users-time-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-compliance-hub-users-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-compliance-hub-users-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-compliance-hub-users-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-compliance-hub-users-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-compliance-hub-users-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-compliance-hub-users-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-users-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-users-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-users-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-users-views-last-page-arrow-button'
});

module.exports = {
    usersPageElements,
    usersDataTableElements
};