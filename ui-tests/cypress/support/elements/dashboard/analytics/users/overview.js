export const usersOverviewPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    EMPTY_PAGE_ICON: 'user-analytics-overview-empty-logo',
    EMPTY_PAGE_TITLE: 'user-analytics-overview-empty-title',
    EMPTY_PAGE_SUBTITLE: 'user-analytics-overview-empty-subtitle',

    //EChart component
    CHART_USERS_OVERVIEW: 'user-analytics-overview-chart',
    CHART_TYPE_SELECT: 'user-analytics-overview-header-select-input',
    CHART_ANNOTATION_BUTTON: 'chart-type-annotation-button',
    CHART_ANNOTATION_ADD_NOTE_ITEM: 'chart-type-annotation-item-add-note',
    CHART_ANNOTATION_MANAGE_NOTES_ITEM: 'chart-type-annotation-item-manage-notes',
    CHART_ANNOTATION_HIDE_NOTES_ITEM: 'chart-type-annotation-item-hide-notes',
    CHART_MORE_BUTTON: 'user-analytics-overview-header-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'user-analytics-overview-header-download-button',
    CHART_MORE_ZOOM_ITEM: 'user-analytics-overview-header-more-zoom-button',

    CHART_TOTAL_USERS_ICON: 'user-analytics-overview-legend-total-users-icon',
    CHART_TOTAL_USERS_LABEL: 'user-analytics-overview-legend-total-users-label',
    CHART_TOTAL_USERS_TOOLTIP: 'user-analytics-overview-legend-total-users-tooltip',
    CHART_TOTAL_USERS_VALUE: 'user-analytics-overview-legend-total-users-value',
    CHART_TOTAL_USERS_TREND_ICON: 'user-analytics-overview-legend-total-users-trend-icon',
    CHART_TOTAL_USERS_PERCENTAGE: 'user-analytics-overview-legend-total-users-percentage',

    CHART_NEW_USERS_ICON: 'user-analytics-overview-legend-new-users-icon',
    CHART_NEW_USERS_LABEL: 'user-analytics-overview-legend-new-users-label',
    CHART_NEW_USERS_TOOLTIP: 'user-analytics-overview-legend-new-users-tooltip',
    CHART_NEW_USERS_VALUE: 'user-analytics-overview-legend-new-users-value',
    CHART_NEW_USERS_TREND_ICON: 'user-analytics-overview-legend-new-users-trend-icon',
    CHART_NEW_USERS_PERCENTAGE: 'user-analytics-overview-legend-new-users-percentage',

    CHART_RETURNING_USERS_ICON: 'user-analytics-overview-legend-returning-users-icon',
    CHART_RETURNING_USERS_LABEL: 'user-analytics-overview-legend-returning-users-label',
    CHART_RETURNING_USERS_TOOLTIP: 'user-analytics-overview-legend-returning-users-tooltip',
    CHART_RETURNING_USERS_VALUE: 'user-analytics-overview-legend-returning-users-value',
    CHART_RETURNING_USERS_TREND_ICON: 'user-analytics-overview-legend-returning-users-trend-icon',
    CHART_RETURNING_USERS_PERCENTAGE: 'user-analytics-overview-legend-returning-users-percentage',
};

const usersOverviewDataTableElements = (index = 0) => {
    return {
        TABLE_ROWS: '.el-table__row',
        EXPORT_AS_BUTTON: 'user-analytics-overview-export-as-button',
        TABLE_SEARCH_INPUT: 'user-analytics-overview-datatable-search-input',

        COLUMN_NAME_DATE_LABEL: 'user-analytics-overview-label-date',
        COLUMN_NAME_DATE_SORTABLE_ICON: 'user-analytics-overview-sortable-icon-date',
        COLUMN_NAME_TOTAL_USERS_LABEL: 'user-analytics-overview-label-total-users',
        COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'user-analytics-overview-sortable-icon-total-users',
        COLUMN_NAME_NEW_USERS_LABEL: 'user-analytics-overview-label-new-users',
        COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'user-analytics-overview-sortable-icon-new-users',
        COLUMN_NAME_RETURNING_USERS_LABEL: 'user-analytics-overview-label-returning-users',
        COLUMN_NAME_RETURNING_USERS_SORTABLE_ICON: 'user-analytics-overview-sortable-icon-returning-users',

        //Columns' Rows' Datas Elements 
        DATE: 'datatable-user-analytics-overview-date-' + index,
        TOTAL_USERS: 'datatable-user-analytics-overview-total-users-' + index,
        NEW_USERS: 'datatable-user-analytics-overview-new-users-' + index,
        RETURNING_USERS: 'datatable-user-analytics-overview-returning-users-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'user-analytics-overview-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'user-analytics-overview-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'user-analytics-overview-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'user-analytics-overview-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'user-analytics-overview-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'user-analytics-overview-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'user-analytics-overview-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'user-analytics-overview-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'user-analytics-overview-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'user-analytics-overview-last-page-arrow-button'
    };
};

module.exports = {
    usersOverviewPageElements,
    usersOverviewDataTableElements
};