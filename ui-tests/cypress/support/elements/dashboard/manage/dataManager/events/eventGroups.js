export const eventsGroupsPageElements = {
    PAGE_TITLE: 'header-title',
    TAB_EVENTS: 'tab-events-title',
    TAB_EVENT_GROUPS: 'tab-event-groups-title',
    EVENT_GROUP_SELECT: 'event-group-select-input'
};

const eventsGroupsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-event-groups-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-event-groups-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-event-groups-empty-subtitle',

    EXPORT_AS_BUTTON: 'datatable-event-groups-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-event-groups-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    SELECT_ALL_EVENTS_CHECKBOX: 'datatable-event-groups-select-all-checkbox', //TODO: data test id is missing
    COLUMN_NAME_EVENT_GROUP_NAME_LABEL: 'datatable-event-groups-label-event-group-name',
    COLUMN_NAME_EVENT_GROUP_NAME_SORTABLE_ICON: 'datatable-event-groups-sortable-icon-event-group-name',
    COLUMN_NAME_EVENT_GROUP_DESCRIPTION_LABEL: 'datatable-event-groups-label-event-group-description',
    COLUMN_NAME_EVENT_GROUP_DESCRIPTION_SORTABLE_ICON: 'datatable-event-groups-sortable-icon-event-group-description',

    //Columns' Rows' Datas Elements
    //TODO: data test id will be added
    SELECT_EVENT_GROUP_CHECKBOX: 'datatable-manage-events-event-groups-select-event-group-checkbox-' + index, 
    EVENT_GROUP_NAME: 'datatable-manage-events-event-groups-event-group-name-' + index,
    EVENT_GROUP_DESCRIPTION: 'datatable-manage-events-event-groups-event-group-description-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-event-groups-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-event-groups-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-event-groups-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-event-groups-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-event-groups-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-event-groups-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-event-groups-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-event-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-event-groups-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-event-groups-last-page-arrow-button'
});

module.exports = {
    eventsGroupsPageElements,
    eventsGroupsDataTableElements
};