export const acquisitionPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
}

export const acquisitionEChartElements = {
    ECHARTS: '.echarts',
    EMPTY_PIE_SOURCES_TOTAL_SESSIONS_ICON: 'pie-source-total-sessions-empty-logo',
    EMPTY_PIE_SOURCES_TOTAL_SESSIONS_TITLE: 'pie-source-total-sessions-empty-title',
    EMPTY_PIE_SOURCES_TOTAL_SESSIONS_SUBTITLE: 'pie-source-total-sessions-empty-subtitle',
    EMPTY_PIE_SOURCES_NEW_USERS_ICON: 'pie-sources-new-users-empty-logo',
    EMPTY_PIE_SOURCES_NEW_USERS_TITLE: 'pie-sources-new-users-empty-title',
    EMPTY_PIE_SOURCES_NEW_USERS_SUBTITLE: 'pie-sources-new-users-empty-subtitle',
}

const acquisitionDataTableElements = (index = 0) => {
    return {
        EMPTY_TABLE_ICON: 'datatable-analytics-acquisition-empty-logo',
        EMPTY_TABLE_TITLE: 'datatable-analytics-acquisition-empty-title',
        EMPTY_TABLE_SUBTITLE: 'datatable-analytics-acquisition-empty-subtitle',

        TABLE_ROWS: '.el-table__row',
        EXPORT_AS_BUTTON: 'datatable-analytics-acquisition-export-as-button',
        TABLE_SEARCH_INPUT: 'datatable-analytics-acquisition-datatable-search-input',
        COLUMN_NAME_SOURCE_LABEL: 'datatable-analytics-acquisition-label-source',
        COLUMN_NAME_SOURCE_SORTABLE_ICON: 'datatable-analytics-acquisition-sortable-icon-source',
        COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'datatable-analytics-acquisition-label-total-sessions',
        COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'datatable-analytics-acquisition-total-sessions-sortable-icon-source',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'datatable-analytics-acquisition-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'datatable-analytics-acquisition-total-users-sortable-icon-source',
        COLUMN_NAME_NEW_USERS_LABEL: 'datatable-analytics-acquisition-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'datatable-analytics-acquisition-new-users-sortable-icon-source',

        //Columns' Rows' Datas Elements 
        SOURCE: 'datatable-acquisition-source-' + index,
        TOTAL_SESSIONS: 'datatable-acquisition-total-sessions-' + index,
        TOTAL_USERS: 'datatable-acquisition-total-users-' + index,
        NEW_USERS: 'datatable-acquisition-new-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'datatable-analytics-acquisition-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'datatable-analytics-acquisition-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'datatable-analytics-acquisition-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'datatable-analytics-acquisition-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'datatable-analytics-acquisition-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'datatable-analytics-acquisition-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'datatable-analytics-acquisition-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-analytics-acquisition-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'datatable-analytics-acquisition-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'datatable-analytics-acquisition-last-page-arrow-button'
    };
};

module.exports = {
    acquisitionPageElements,
    acquisitionEChartElements,
    acquisitionDataTableElements
};