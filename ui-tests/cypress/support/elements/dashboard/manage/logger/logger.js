export const loggerPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    PAGE_SUB_TITLE: 'manage-logger-subtitle',

    AUTO_REFRESH_IS_LABEL: 'enable-auto-refresh-auto-refresh-toggle-is-label',
    ENABLED_LABEL: 'enable-auto-refresh-auto-refresh-toggle-enabled-label',
    AUTO_REFRESH_IS_ENABLED_TOOLTIP: 'enable-auto-refresh-auto-refresh-toggle-tooltip',
    STOP_AUTO_REFRESH_BUTTON: 'enable-auto-refresh-auto-refresh-toggle-button',
    ENABLE_AUTO_REFRESH_LABEL: 'enable-auto-refresh-auto-refresh-toggle-disabled-label',
    ENABLE_AUTO_REFRESH_TOOLTIP: 'enable-auto-refresh-auto-refresh-toggle-disabled-tooltip',
    ENABLE_AUTO_REFRESH_TOGGLE: 'enable-auto-refresh-auto-refresh-toggle-el-switch-core',
};

const logsDataTableElements = (index = 0) => ({
    SELECT_FILTER_COMBOBOX: 'select-test-id-select-input',
    EXPORT_AS_BUTTON: 'datatable-logs-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-logs-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'datatable-logs-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-logs-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-logs-empty-subtitle',

    COLUMN_NAME_REQUEST_RECEIVED_LABEL: 'datatable-logs-label-request-received',
    COLUMN_NAME_REQUEST_RECEIVED_SORTABLE_ICON: 'datatable-logs-sortable-icon-request-received',
    COLUMN_NAME_DETAILS_LABEL: 'datatable-logs-label-details',
    COLUMN_NAME_DETAILS_SORTABLE_ICON: 'datatable-logs-sortable-icon-details',
    COLUMN_NAME_INFORMATION_LABEL: 'datatable-logs-label-information',
    COLUMN_NAME_INFORMATION_SORTABLE_ICON: 'datatable-logs-sortable-icon-information',

    //Columns' Rows' Datas Elements 
    REQUEST_RECEIVED: 'datatable-logs-request-received-' + index,
    DETAILS: 'datatable-logger-details-' + index,
    INFORMATION_FILTER: 'datatable-logs-information-filter-' + index,
    INFORMATION_PROBLEMS: 'datatable-logs-information-problems-' + index,
    INFORMATION_DESC: 'datatable-logs-information-p-' + index,

    TAB_DATA: '#tab-data',
    TAB_HEADER: '#tab-header',
    EXPAND_DATA: 'datatable-logs-expand-data',
    EXPAND_HEADER: 'datatable-logs-expand-header',

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'report-manager-manually-created-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'report-manager-manually-created-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'report-manager-manually-created-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'report-manager-manually-created-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'report-manager-manually-created-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'report-manager-manually-created-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'report-manager-manually-created-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'report-manager-manually-created-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'report-manager-manually-created-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'report-manager-manually-created-views-last-page-arrow-button'
});

module.exports = {
    loggerPageElements,
    logsDataTableElements
};