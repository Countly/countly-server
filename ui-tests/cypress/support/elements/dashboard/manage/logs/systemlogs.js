export const systemLogsPageElements = {
    PAGE_TITLE: 'header-title',
    TAB_SERVER_LOGS: 'tab-server-logs-title',
    TAB_AUDIT_LOGS: 'tab-audit-logs-title',
};

const systemLogsDataTableElements = (index = 0) => ({
    TABLE_ROWS: '.el-table__row',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    ACTION_TYPE_SELECT: 'action-select',
    USER_SELECT: 'user-select',
    EXPORT_AS_BUTTON: 'datatable-audit-logs-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-audit-logs-datatable-search-input',

    COLUMN_NAME_TIME_LABEL: 'datatable-audit-logs-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'datatable-audit-logs-sortable-icon-time',
    COLUMN_NAME_USER_LABEL: 'datatable-audit-logs-label-user',
    COLUMN_NAME_USER_SORTABLE_ICON: 'datatable-audit-logs-sortable-icon-user',
    COLUMN_NAME_IP_ADDRESS_LABEL: 'datatable-audit-logs-label-ip-address',
    COLUMN_NAME_IP_ADDRESS_SORTABLE_ICON: 'datatable-audit-logs-sortable-icon-ip-address',
    COLUMN_NAME_ACTION_LABEL: 'datatable-audit-logs-label-action',

    //Columns' Rows' Datas Elements 
    TIME: 'datatable-audit-logs-time-' + index,
    USER: 'datatable-audit-logs-user-' + index,
    IP_ADDRESS: 'datatable-audit-logs-ip-' + index,
    CREATED_BY: 'datatable-created-by-' + index,
    ACTION_NAME: 'datatable-audit-logs-action-action-name-' + index,
    ACTION_ID: 'datatable-audit-logs-action-id-' + index,
    ACTION_APP_NAME: 'datatable-audit-logs-action-app-name-' + index,
    EXPAND_ROW: 'datatable-audit-logs-expand-row-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-audit-logs-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-audit-logs-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-audit-logs-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-audit-logs-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-audit-logs-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-audit-logs-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-audit-logs-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-audit-logs-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-audit-logs-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-audit-logs-last-page-arrow-button'
});

module.exports = {
    systemLogsPageElements,
    systemLogsDataTableElements
};