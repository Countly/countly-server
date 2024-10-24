export const reportManagerPageElements = {
    PAGE_TITLE: 'header-title',
    TAB_MANUALLY_CREATED: 'tab-manually-created-title',
    TAB_AUTOMATICALLY_CREATED: 'tab-automatically-created-title',
    MANUALLY_TABLE_REMIND_LABEL: 'manually-table-remind-label',
    AUTOMATICALLY_TABLE_REMIND_LABEL: 'automatically-table-remind-label',
    FILTER_PARAMETERS_SELECT: 'cly-input-dropdown-trigger-pseudo-input-label',
};

const manuallyCreatedDataTableElements = (index = 0) => ({
    EXPORT_AS_BUTTON: 'datatable-report-manager-manually-created-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-report-manager-manually-created-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'datatable-report-manager-manually-created-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-report-manager-manually-created-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-report-manager-manually-created-empty-subtitle',

    COLUMN_NAME_NAME_AND_DESCRIPTION_LABEL: 'datatable-report-manager-manually-created-label-name-and-description',
    COLUMN_NAME_DATA_LABEL: 'datatable-report-manager-manually-created-label-data',
    COLUMN_NAME_STATUS_LABEL: 'datatable-report-manager-manually-created-label-status',
    COLUMN_NAME_ORIGIN_LABEL: 'datatable-report-manager-manually-created-label-origin',
    COLUMN_NAME_TYPE_LABEL: 'datatable-report-manager-manually-created-label-type',
    COLUMN_NAME_PERIOD_LABEL: 'datatable-report-manager-manually-created-label-period',
    COLUMN_NAME_VISIBILITY_LABEL: 'datatable-report-manager-manually-created-label-visibility',
    COLUMN_NAME_LAST_UPDATED_LABEL: 'datatable-report-manager-manually-created-label-last-updated',
    COLUMN_NAME_LAST_UPDATED_SORTABLE_ICON: 'datatable-report-manager-manually-created-sortable-icon-last-updated',

    //Columns' Rows' Datas Elements 
    NAME_AND_DESCRIPTION: 'datatable-report-manager-manually-created-expand-' + index,
    DATA: 'datatable-report-manager-manually-created-data-' + index,
    STATUS: 'datatable-report-manager-manually-created-status-' + index,
    ORIGIN: 'datatable-report-manager-manually-created-origin-' + index,
    TYPE: 'datatable-report-manager-manually-created-type-' + index,
    PERIOD: 'datatable-report-manager-manually-created-period-' + index,
    VISIBILITY: 'datatable-report-manager-manually-created-visibility-' + index,
    LAST_UPDATED: 'datatable-report-manager-manually-created-last-updated-' + index,

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

const automaticallyCreatedDataTableElements = (index = 0) => ({
    EXPORT_AS_BUTTON: 'datatable-report-manager-automatically-created-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-report-manager-automatically-created-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'datatable-report-manager-automatically-created-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-report-manager-automatically-created-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-report-manager-automatically-created-empty-subtitle',

    COLUMN_NAME_NAME_AND_DESCRIPTION_LABEL: 'datatable-report-manager-automatically-created-label-name-and-description',
    COLUMN_NAME_DATA_LABEL: 'datatable-report-manager-automatically-created-label-data',
    COLUMN_NAME_STATUS_LABEL: 'datatable-report-manager-automatically-created-label-status',
    COLUMN_NAME_ORIGIN_LABEL: 'datatable-report-manager-automatically-created-label-origin',
    COLUMN_NAME_LAST_UPDATED_LABEL: 'datatable-report-manager-automatically-created-label-last-updated',
    COLUMN_NAME_LAST_UPDATED_SORTABLE_ICON: 'datatable-report-manager-automatically-created-sortable-icon-last-updated',
    COLUMN_NAME_DURATION_LABEL: 'datatable-report-manager-automatically-created-label-duration',

    //Columns' Rows' Datas Elements 
    NAME_AND_DESCRIPTION: 'datatable-report-manager-automatically-created-expand-' + index,
    DATA: 'datatable-report-manager-automatically-created-data-' + index,
    STATUS: 'datatable-report-manager-automatically-created-status-' + index,
    ORIGIN: 'datatable-report-manager-automatically-created-origin-' + index,
    LAST_UPDATED: 'datatable-report-manager-automatically-created-last-updated-' + index,
    DURATION: 'datatable-report-manager-automatically-created-duration-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'report-manager-automatically-created-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'report-manager-automatically-created-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'report-manager-automatically-created-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'report-manager-automatically-created-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'report-manager-automatically-created-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'report-manager-automatically-created-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'report-manager-automatically-created-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'report-manager-automatically-created-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'report-manager-automatically-created-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'report-manager-automatically-created-views-last-page-arrow-button'
});

module.exports = {
    reportManagerPageElements,
    manuallyCreatedDataTableElements,
    automaticallyCreatedDataTableElements
};