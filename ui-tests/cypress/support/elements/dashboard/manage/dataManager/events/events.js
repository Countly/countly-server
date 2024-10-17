export const eventsPageElements = {
    PAGE_TITLE: 'header-title',
    TAB_EVENTS: 'tab-events-title',
    TAB_EVENT_GROUPS: 'tab-event-groups-title',
    FILTER_PARAMETERS_SELECT: 'event-category-filters-pseudo-input-label',
};

const eventsDataTableElements = (index = 0) => ({
    EDIT_COLUMNS_BUTTON: 'events-edit-columns-button',
    EXPORT_AS_BUTTON: 'events-export-as-button',
    DATATABLE_SEARCH_INPUT: 'events-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    EMPTY_TABLE_ICON: 'events-empty-logo',
    EMPTY_TABLE_TITLE: 'events-empty-title',
    EMPTY_TABLE_SUBTITLE: 'events-empty-subtitle',

    SELECT_ALL_EVENTS_CHECKBOX: 'events-select-all-checkbox', //TODO: data test id is missing
    COLUMN_NAME_EVENT_NAME_LABEL: 'events-label-event-name',
    COLUMN_NAME_EVENT_NAME_SORTABLE_ICON: 'events-sortable-icon-event-name',
    COLUMN_NAME_DESCRIPTION_LABEL: 'events-label-description',
    COLUMN_NAME_DESCRIPTION_SORTABLE_ICON: 'events-sortable-icon-description',
    COLUMN_NAME_CATEGORY_LABEL: 'events-label-category',
    COLUMN_NAME_CATEGORY_SORTABLE_ICON: 'events-sortable-icon-category',
    COLUMN_NAME_COUNT_LABEL: 'events-label-count',
    COLUMN_NAME_COUNT_SORTABLE_ICON: 'events-sortable-icon-count',
    COLUMN_NAME_LAST_MODIFIED_LABEL: 'events-label-last-modıfıed',
    COLUMN_NAME_LAST_MODIFIED_SORTABLE_ICON: 'events-sortable-icon-last-modıfıed',

    //Columns' Rows' Datas Elements 
    SELECT_EVENT_CHECKBOX: 'datatable-manage-events-events-select-event-checkbox-' + index, //TODO: data test id is missing
    EVENT_NAME: 'datatable-manage-events-events-event-name-' + index,
    EVENT_NAME_ION_EYE: 'datatable-manage-events-events-ion-eye-' + index,
    DESCRIPTION: 'datatable-manage-events-events-description-' + index,
    CATEGORY: 'datatable-manage-events-events-category-' + index,
    COUNT: 'datatable-manage-events-events-count-' + index,
    LAST_MODIFIED: 'datatable-manage-events-events-last-modified-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'events-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'events-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'events-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'events-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'events-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'events-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'events-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'events-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'events-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'events-views-last-page-arrow-button'
});

module.exports = {
    eventsPageElements,
    eventsDataTableElements
};