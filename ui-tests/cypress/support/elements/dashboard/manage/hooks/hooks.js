export const hooksPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_VIEW_GUIDE_BUTTON: 'view-guide-button',
    NEW_HOOK_BUTTON: 'new-hook-button',

    ALL_HOOKS_RADIO_BUTTON: 'all-hooks-radio-button',
    ENABLED_HOOKS_RADIO_BUTTON: 'enabled-hooks-radio-button',
    DISABLED_HOOKS_RADIO_BUTTON: 'disabled-hooks-radio-button',
    APPLICATION_SELECT_BOX: 'cly-select-x-test-id'
};

const hooksDataTableElements = (index = 0) => ({
    TABLE_ROWS: '.el-table__row',
    EDIT_COLOMNS_BUTTON: 'datatable-hooks-edit-columns-button',
    EXPORT_AS_BUTTON: 'datatable-hooks-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-hooks-datatable-search-input',

    EMPTY_TABLE_ICON: 'datatable-hooks-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-hooks-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-hooks-empty-subtitle',

    COLUMN_NAME_HOOK_NAME_LABEL: 'datatable-hooks-label-hook-name',
    COLUMN_NAME_FEATURE_NAME_SORTABLE_ICON: 'datatable-hooks-sortable-icon-hook-name',
    COLUMN_NAME_TRIGGER_ACTIONS_LABEL: 'datatable-hooks-label-trigger-->-actions',
    COLUMN_NAME_TRIGGER_COUNT_LABEL: 'datatable-hooks-label-trigger-count',
    COLUMN_NAME_TRIGGER_COUNT_SORTABLE_ICON: 'datatable-hooks-sortable-icon-trigger-count',
    COLUMN_NAME_LAST_TRIGGERED_LABEL: 'datatable-hooks-label-last-triggered',
    COLUMN_NAME_LAST_TRIGGERED_SORTABLE_ICON: 'datatable-hooks-sortable-icon-last-triggered',
    COLUMN_NAME_CREATE_BY_LABEL: 'datatable-hooks-label-create-by',
    COLUMN_NAME_CREATE_BY_SORTABLE_ICON: 'datatable-hooks-sortable-icon-create-by',

    //Columns' Rows' Datas Elements 
    STATUS: 'datatable-hooks-status-' + index + '-el-switch-wrapper',
    HOOK_NAME: 'datatable-hooks-hook-name-' + index,
    HOOK_DESCRIPTION: 'datatable-hooks-hook-description-' + index,
    TRIGGER_ACTIONS: 'datatable-hooks-trigger-action-' + index,
    TRIGGER_COUNT: 'datatable-hooks-trigger-count-' + index,
    LAST_TRIGGERED: 'datatable-hooks-last-triggered-' + index,
    CREATE_BY: 'datatable-hooks-created-by-' + index,
    CREATE_DATE: 'datatable-hooks-created-date-' + index,
    MORE_BUTTON: 'datatable-hooks-' + index + '-more-option-button',

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-hooks-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-hooks-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-hooks-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-hooks-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-hooks-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-hooks-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-hooks-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-hooks-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-hooks-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-hooks-last-page-arrow-button'
});

module.exports = {
    hooksPageElements,
    hooksDataTableElements
};