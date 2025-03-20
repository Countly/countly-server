export const remoteConfigElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_GUIDE_BUTTON: 'view-guide-button',
    ADD_PARAMETER_BUTTON: 'add-parameter-button',
};

const remoteConfigDataTableElements = (index = 0) => ({
    EXPORT_AS_BUTTON: 'remote-config-export-as-button',
    DATATABLE_SEARCH_INPUT: 'remote-config-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'remote-config-empty-logo',
    EMPTY_TABLE_TITLE: 'remote-config-empty-title',
    EMPTY_TABLE_SUBTITLE: 'remote-config-empty-subtitle',

    COLUMN_NAME_PARAMETER_LABEL: 'remote-config-label-parameter',
    COLUMN_NAME_PARAMETER_SORTABLE_ICON: 'remote-config-sortable-icon-parameter',
    COLUMN_NAME_STATUS_LABEL: 'remote-config-label-status',
    COLUMN_NAME_DESCRIPTION_LABEL: 'remote-config-label-description',
    COLUMN_NAME_CREATED_LABEL: 'remote-config-label-created',
    COLUMN_NAME_CREATED_SORTABLE_ICON: 'remote-config-sortable-icon-created',
    COLUMN_NAME_AB_TESTING_STATUS_LABEL: 'remote-config-label-a/b-testing-status',

    //Columns' Rows' Datas Elements 
    EXPAND: 'datatable-remote-config-expand-' + index,
    PARAMETER: 'datatable-remote-config-parameter-' + index,
    STATUS: 'datatable-remote-config-status-' + index,
    EXPIRATION_DATE: 'datatable-remote-config-expire-date-' + index,
    DESCRIPTION: 'datatable-remote-config-description-' + index,
    CREATED_DATE: 'datatable-remote-config-created-date-' + index,
    CREATED_TIME: 'datatable-remote-config-created-time-' + index,
    AB_TESTING_STATUS: 'datatable-remote-config-ab-status-' + index,
    ENABLE_BUTTON: 'datatable-remote-config-button-enable-' + index,
    DISABLE_BUTTON: 'datatable-remote-config-button-disable-' + index,
    MORE_BUTTON: 'datatable-remote-config-' + index + '-more-option-button',
    EDIT_BUTTON: 'datatable-remote-config-button-edit-' + index,
    DELETE_BUTTON: 'datatable-remote-config-button-delete-' + index,

    HASH_LABEL: 'datatable-remote-config-' + index + '-hash-label',
    CONDITION_LABEL: 'datatable-remote-config-' + index + '-condition-label',
    PERCENTAGE_LABEL: 'datatable-remote-config-' + index + '-percentage-label',
    ORDER_LABEL: 'datatable-remote-config-' + index + '-order-label',
    DEFAULT_VALUE_LABEL: 'datatable-remote-config-' + index + '-default-value-label',
    PARAMETER_VALUE: 'datatable-remote-config-' + index + '-value',
    PERCENTAGE: 'datatable-remote-config-' + index + '-percentage',

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'remote-config-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'remote-config-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'remote-config-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'remote-config-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'remote-config-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'remote-config-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'remote-config-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'remote-config-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'remote-config-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'remote-config-views-last-page-arrow-button'
});

module.exports = {
    remoteConfigElements,
    remoteConfigDataTableElements
};