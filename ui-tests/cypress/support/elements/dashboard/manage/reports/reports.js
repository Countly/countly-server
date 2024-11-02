export const reportsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    CREATE_NEW_REPORT_BUTTON: 'create-new-report-button',
}

const reportsDataTableElements = (index = 0) => ({
    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'datatable-reports-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-reports-datatable-search-input',

    EMPTY_TABLE_ICON: 'cly-empty-view-empty-view-icon',
    EMPTY_TABLE_TITLE: 'cly-empty-view-empty-view-title',
    EMPTY_TABLE_SUBTITLE: 'cly-empty-view-empty-view-subtitle',
    EMPTY_TABLE_CREATE_NEW_REPORT_LINK_BUTTON: 'cly-empty-view-empty-view-action-button',

    COLUMN_NAME_REPORT_NAME_LABEL: 'datatable-reports-label-report-name',
    COLUMN_NAME_REPORT_NAME_SORTABLE_ICON: 'datatable-reports-label-report-name',
    COLUMN_NAME_EMAILS_LABEL: 'datatable-reports-label-emails',
    COLUMN_NAME_EMAILS_SORTABLE_ICON: 'datatable-reports-label-emails',
    COLUMN_NAME_DATA_LABEL: 'datatable-reports-label-data',
    COLUMN_NAME_DATA_SORTABLE_ICON: 'datatable-reports-label-data',
    COLUMN_NAME_FREQUENCY_LABEL: 'datatable-reports-label-frequency',
    COLUMN_NAME_FREQUENCY_SORTABLE_ICON: 'datatable-reports-label-frequency',
    COLUMN_NAME_TIME_LABEL: 'datatable-reports-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'datatable-reports-label-time',

    //Columns' Rows' Datas Elements 
    STATUS: 'datatable-reports-toggle-' + index + '-el-switch-wrapper',
    REPORT_NAME: 'datatable-reports-report-name-' + index,
    EMAILS: 'datatable-reports-emails-' + index,
    DATA: 'datatable-reports-data-' + index,
    FREQUENCY: 'datatable-reports-frequency-' + index,
    TIME: 'datatable-reports-time-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-reports-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-reports-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-reports-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-reports-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-reports-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-reports-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-reports-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-reports-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-reports-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-reports-last-page-arrow-button'
});

module.exports = {
    reportsPageElements,
    reportsDataTableElements
};