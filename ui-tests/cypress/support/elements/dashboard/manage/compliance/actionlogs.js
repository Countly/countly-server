export const actionLogsPageElements = {
    PAGE_TITLE: 'header-title',
    EXPORT_PURGE_HISTORY_FOR_LABEL: 'export-purge-history-for-label',
    EXPORT_PURGE_HISTORY_FILTER_SELECT: 'metrics-filter-pseudo-input-label',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    
    TAB_METRICS: 'tab-metrics-title',
    TAB_USERS: 'tab-export-purge-history-title',
    TAB_CONSENT_HISTORY: 'tab-consent-history-title',
    TAB_EXPORT_PURGE_HISTORY: 'tab-export/purge-history-title'
};

const actionLogsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-compliance-hub-export-purge-history-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-compliance-hub-export-purge-history-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-compliance-hub-export-purge-history-empty-subtitle',

    EXPORT_AS_BUTTON: 'datatable-compliance-hub-export-purge-history-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-compliance-hub-export-purge-history-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_USER_LABEL: 'datatable-compliance-hub-export-purge-history-label-user',
    COLUMN_NAME_USER_SORTABLE_ICON: 'datatable-compliance-hub-export-purge-history-sortable-icon-user',
    COLUMN_NAME_IP_ADDRESS_LABEL: 'datatable-compliance-hub-export-purge-history-label-ip-address',
    COLUMN_NAME_IP_ADDRESS_SORTABLE_ICON: 'datatable-compliance-hub-export-purge-history-sortable-icon-ip-address',
    COLUMN_NAME_ACTION_LABEL: 'datatable-compliance-hub-export-purge-history-label-action',
    COLUMN_NAME_ACTION_SORTABLE_ICON: 'datatable-compliance-hub-export-purge-history-sortable-icon-action',
    COLUMN_NAME_TIME_LABEL: 'datatable-compliance-hub-export-purge-history-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'datatable-compliance-hub-export-purge-history-sortable-icon-time',

    //Columns' Rows' Datas Elements 
    USER: 'datatable-export-purge-history-user-' + index,
    IP_ADDRESS: 'datatable-export-purge-history-ip-address-' + index,
    ACTION: 'datatable-export-purge-history-action-' + index,
    TIME: 'datatable-export-purge-history-time-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-compliance-hub-export-purge-history-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-compliance-hub-export-purge-history-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-compliance-hub-export-purge-history-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-compliance-hub-export-purge-history-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-compliance-hub-export-purge-history-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-compliance-hub-export-purge-history-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-export-purge-history-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-export-purge-history-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-export-purge-history-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-compliance-hub-export-purge-history-views-last-page-arrow-button'
});

module.exports = {
    actionLogsPageElements,
    actionLogsDataTableElements
};