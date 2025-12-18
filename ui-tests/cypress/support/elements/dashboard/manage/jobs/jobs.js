export const jobsPageElements = {
    PAGE_TITLE: 'header-title',
    TABLE_JOBS: 'table-jobs'
};

const jobsDataTableElements = (index = 0) => ({
    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'datatable-jobs-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-jobs-datatable-search-input',

    EMPTY_TABLE_ICON: 'datatable-jobs-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-jobs-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-jobs-empty-subtitle',

    COLUMN_NAME_NAME_LABEL: 'datatable-jobs-label-name',
    COLUMN_NAME_NAME_SORTABLE_ICON: 'datatable-jobs-sortable-icon-name',
    COLUMN_NAME_STATUS_LABEL: 'datatable-jobs-label-status',
    COLUMN_NAME_STATUS_SORTABLE_ICON: 'datatable-jobs-sortable-icon-status',
    COLUMN_NAME_SCHEDULE_LABEL: 'datatable-jobs-label-schedule',
    COLUMN_NAME_SCHEDULE_SORTABLE_ICON: 'datatable-jobs-sortable-icon-schedule',
    COLUMN_NAME_NEXT_RUN_LABEL: 'datatable-jobs-label-next-run',
    COLUMN_NAME_NEXT_RUN_SORTABLE_ICON: 'datatable-jobs-sortable-icon-next-run',
    COLUMN_NAME_LAST_RUN_LABEL: 'datatable-jobs-label-last-run',
    COLUMN_NAME_LAST_RUN_SORTABLE_ICON: 'datatable-jobs-sortable-icon-last-run',
    COLUMN_NAME_TOTAL_RUNS_LABEL: 'datatable-jobs-label-total-runs',
    COLUMN_NAME_TOTAL_RUNS_SORTABLE_ICON: 'datatable-jobs-sortable-icon-total-runs',

    //Columns' Rows' Datas Elements 
    NAME: 'datatable-jobs-name-' + index,
    STATUS: 'datatable-jobs-status-' + index,
    SCHEDULE: 'datatable-jobs-schedule-' + index,
    SCHEDULE_TIME: 'datatable-jobs-schedule-detail-' + index,
    NEXT_RUN: 'datatable-jobs-next-run-date-' + index,
    NEXT_RUN_TIME: 'datatable-jobs-next-run-time-' + index,
    LAST_RUN: 'datatable-jobs-last-run-' + index,
    TOTAL: 'datatable-jobs-total-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-jobs-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-jobs-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-jobs-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-jobs-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-jobs-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-jobs-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-jobs-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-jobs-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-jobs-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-jobs-last-page-arrow-button'
});

module.exports = {
    jobsPageElements,
    jobsDataTableElements
};