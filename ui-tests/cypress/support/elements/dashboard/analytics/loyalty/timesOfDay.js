export const timesOfDayPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_USER_ACTIVITY: 'tab-user-activity-title',
	TAB_SLIPPING_AWAY: 'tab-slipping-away-title',
	TAB_TIMES_OF_DAY: 'tab-times-of-day-title',
    RESULTS_FOR_LABEL: 'results-for-label',
    RESULTS_FOR_SELECT: 'results-for-select-pseudo-input-label',
    TIME_SELECT: 'results-for-select-pseudo-input-label'
}

export const timesOfDayEChartElements = {
    EMPTY_PAGE_ICON: 'cly-empty-view-empty-logo',
    EMPTY_PAGE_TITLE: 'cly-empty-view-empty-title',
    EMPTY_PAGE_SUBTITLE: 'cly-empty-view-empty-subtitle',

    CHART_SLIPPING_AWAY_CHART: 'times-of-day-chart',
    CHART_MORE_BUTTON: 'cly-chart-header-test-id-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'cly-chart-header-test-id-download-button',
    CHART_MORE_ZOOM_ITEM: 'cly-chart-header-test-id-more-zoom-button',
}

const timesOfDayDataTableElements = (index = 0) => {
    return {
        TABLE_ROWS: '.el-table__row',
        EXPORT_AS_BUTTON: 'times-of-day-export-as-button',
        TABLE_SEARCH_INPUT: 'times-of-day-datatable-search-input',

        COLUMN_NAME_HOURS_LABEL: 'times-of-day-label-hours',
        COLUMN_NAME_HOURS_SORTABLE_ICON: 'times-of-day-sortable-icon-hours',
        COLUMN_NAME_MONDAY_LABEL: 'times-of-day-label-monday',
        COLUMN_NAME_MONDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-monday',
        COLUMN_NAME_TUESDAY_LABEL: 'times-of-day-label-tuesday',
        COLUMN_NAME_TUESDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-tuesday',
        COLUMN_NAME_WEDNESDAY_LABEL: 'times-of-day-label-wednesday',
        COLUMN_NAME_WEDNESDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-wednesday',
        COLUMN_NAME_THURSDAY_LABEL: 'times-of-day-label-thursday',
        COLUMN_NAME_THURSDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-thursday',
        COLUMN_NAME_FRIDAY_LABEL: 'times-of-day-label-friday',
        COLUMN_NAME_FRIDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-friday',
        COLUMN_NAME_SATURDAY_LABEL: 'times-of-day-label-saturday',
        COLUMN_NAME_SATURDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-saturday',
        COLUMN_NAME_SUNDAY_LABEL: 'times-of-day-label-sunday',
        COLUMN_NAME_SUNDAY_SORTABLE_ICON: 'times-of-day-sortable-icon-sunday',

        //Columns' Rows' Datas Elements 
        HOURS: 'datatable-hours-' + index,
        MONDAY: 'datatable-monday-' + index,
        TUESDAY: 'datatable-tuesday-' + index,
        WEDNESDAY: 'datatable-wednesday-' + index,
        THURSDAY: 'datatable-thursday-' + index,
        FRIDAY: 'datatable-friday-' + index,
        SATURDAY: 'datatable-saturday-' + index,
        SUNDAY: 'datatable-sunday-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'times-of-day-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'times-of-day-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'times-of-day-overview-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'times-of-day-overview-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'times-of-day-overview-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'times-of-day-overview-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'times-of-day-overview-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'times-of-day-overview-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'times-of-day-overview-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'times-of-day-overview-last-page-arrow-button'
    };
};

module.exports = {
    timesOfDayPageElements,
    timesOfDayEChartElements,
    timesOfDayDataTableElements
};