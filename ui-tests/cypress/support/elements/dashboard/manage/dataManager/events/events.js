export const eventsPageElements = {
    PAGE_TITLE: 'header-title',
    TAB_EVENTS: 'tab-events-title',
    TAB_EVENT_GROUPS: 'tab-event-groups-title',
    FILTER_PARAMETERS_SELECT: 'event-category-filters-pseudo-input-label',
};

const eventsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-events-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-events-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-events-empty-subtitle',

    EDIT_COLUMNS_BUTTON: 'datatable-events-edit-columns-button',
    EXPORT_AS_BUTTON: 'datatable-events-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-events-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    SELECT_ALL_EVENTS_CHECKBOX: 'datatable-events-select-all-checkbox', //TODO: data test id is missing
    COLUMN_NAME_EVENT_NAME_LABEL: 'datatable-events-label-event-name',
    COLUMN_NAME_EVENT_NAME_SORTABLE_ICON: 'datatable-events-sortable-icon-event-name',
    COLUMN_NAME_DESCRIPTION_LABEL: 'datatable-events-label-description',
    COLUMN_NAME_DESCRIPTION_SORTABLE_ICON: 'datatable-events-sortable-icon-description',
    COLUMN_NAME_CATEGORY_LABEL: 'datatable-events-label-category',
    COLUMN_NAME_CATEGORY_SORTABLE_ICON: 'datatable-events-sortable-icon-category',
    COLUMN_NAME_COUNT_LABEL: 'datatable-events-label-count',
    COLUMN_NAME_COUNT_SORTABLE_ICON: 'datatable-events-sortable-icon-count',
    COLUMN_NAME_LAST_MODIFIED_LABEL: 'datatable-events-label-last-modified',
    COLUMN_NAME_LAST_MODIFIED_SORTABLE_ICON: 'datatable-events-sortable-icon-last-modified',

    //Columns' Rows' Datas Elements 
    SELECT_EVENT_CHECKBOX: 'datatable-manage-events-events-select-event-checkbox-' + index, //TODO: data test id is missing
    EVENT_NAME: 'datatable-manage-events-events-event-name-' + index,
    EVENT_NAME_ION_EYE: 'datatable-manage-events-events-ion-eye-' + index,
    DESCRIPTION: 'datatable-manage-events-events-description-' + index,
    CATEGORY: 'datatable-manage-events-events-category-' + index,
    COUNT: 'datatable-manage-events-events-count-' + index,
    LAST_MODIFIED: 'datatable-manage-events-events-last-modified-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-events-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-events-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-events-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-events-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-events-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-events-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-events-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-events-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-events-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-events-views-last-page-arrow-button'
});

module.exports = {
    eventsPageElements,
    eventsDataTableElements
};