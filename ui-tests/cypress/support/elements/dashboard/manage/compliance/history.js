export const consentHistoryPageElements = {
    PAGE_TITLE: 'header-title',
    CONSENT_HISTORY_FOR_LABEL: 'consent-history-for-label',
    CONSENT_HISTORY_FILTER_SELECT: 'consent-filter-pseudo-input-label',
    CONSENT_HISTORY_AND_LABEL: 'and-label',
    CONSENT_HISTORY_METRICS_FILTER_SELECT: 'metrics-filter-pseudo-input-label',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    TAB_METRICS: 'tab-metrics-title',
    TAB_USERS: 'tab-users-title',
    TAB_CONSENT_HISTORY: 'tab-consent-history-title',
    TAB_EXPORT_PURGE_HISTORY: 'tab-export/purge-history-title'
};

const consentHistoryDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-compliance-hub-consent-history-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-compliance-hub-consent-history-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-compliance-hub-consent-history-empty-subtitle',

    EXPORT_AS_BUTTON: 'datatable-compliance-hub-consent-history-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-compliance-hub-consent-history-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_ID_LABEL: 'datatable-compliance-hub-consent-history-label-id',
    COLUMN_NAME_ID_SORTABLE_ICON: 'datatable-compliance-hub-consent-history-sortable-icon-id',
    COLUMN_NAME_UID_LABEL: 'datatable-compliance-hub-consent-history-label-uid',
    COLUMN_NAME_UID_SORTABLE_ICON: 'datatable-compliance-hub-consent-history-sortable-icon-uid',
    COLUMN_NAME_CHANGES_LABEL: 'datatable-compliance-hub-consent-history-label-changes',
    COLUMN_NAME_CHANGES_SORTABLE_ICON: 'datatable-compliance-hub-consent-history-sortable-icon-changes',
    COLUMN_NAME_CONSENT_LABEL: 'datatable-compliance-hub-consent-history-label-consent',
    COLUMN_NAME_CONSENT_SORTABLE_ICON: 'datatable-compliance-hub-consent-history-sortable-icon-consent',
    COLUMN_NAME_TIME_LABEL: 'datatable-compliance-hub-consent-history-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'datatable-compliance-hub-consent-history-sortable-icon-time',

    //Columns' Rows' Datas Elements 
    ID: 'datatable-consent-history-id-' + index,
    UID: 'datatable-consent-history-uid-' + index,
    CHANGES_OPT_IN_LABEL: 'datatable-consent-history-changes-opt-in-label-' + index,
    CHANGES_OPT_OUT_LABEL: 'datatable-consent-history-changes-opt-out-label-' + index,
    CONSENT_OPT_IN_LABEL: 'datatable-consent-history-consent-opt-in-' + index,
    CONSENT_OPT_OUT_LABEL: 'datatable-consent-history-consent-opt-out-' + index,
    TIME: 'datatable-consent-history-time-' + index,

    //EXPAND ROW ELEMENTS
    DEVICE_ID_LABEL: 'expand-device-id-label-' + index,
    DEVICE_ID: 'expand-device-id-' + index,
    OPT_IN_LABEL: 'expand-opt-in-label-' + index,
    OPT_IN_LIST: 'expand-opt-in-' + index,
    OPT_OUT_LABEL: 'expand-opt-out-label-' + index,
    OPT_OUT_LIST: 'expand-opt-out-' + index,
    DEVICE_LABEL: 'expand-device-label-' + index,
    DEVICE: 'expand-device-' + index,
    APP_VERSION_LABEL: 'expand-app-version-label-' + index,
    APP_VERSION: 'expand-app-version-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-compliance-hub-consent-history-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-compliance-hub-consent-history-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-compliance-hub-consent-history-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-compliance-hub-consent-history-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-compliance-hub-consent-history-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-compliance-hub-consent-history-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-consent-history-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-consent-history-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-consent-history-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-consent-history-views-last-page-arrow-button'
});

module.exports = {
    consentHistoryPageElements,
    consentHistoryDataTableElements
};