export const slippingAwayPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TAB_USER_ACTIVITY: 'tab-user-activity-title',
    TAB_SLIPPING_AWAY: 'tab-slipping-away-title',
    TAB_TIMES_OF_DAY: 'tab-times-of-day-title'
};

export const slippingAwayEChartElements = {
    EMPTY_PAGE_ICON: 'slipping-away-empty-logo',
    EMPTY_PAGE_TITLE: 'slipping-away-empty-title',
    EMPTY_PAGE_SUBTITLE: 'slipping-away-empty-subtitle',
    CHART_SLIPPING_AWAY_CHART: 'slipping-away-chart',
    CHART_MORE_BUTTON: 'slipping-away-cly-chart-more-dropdown-more-option-button',
    CHART_MORE_DOWNLOAD_ITEM: 'slipping-away-download-button',
    CHART_MORE_ZOOM_ITEM: 'slipping-away-more-zoom-button',
    CHART_CHART_DESC_ICON: 'slipping-away-users-who-haven\'t-had-a-session-for-more-than-legend-icon',
    CHART_CHART_DESC_LABEL: 'slipping-away-users-who-haven\'t-had-a-session-for-more-than-legend-label',
};

const slippingAwayDataTableElements = (index = 0) => {
    return {
        TABLE_ROWS: '.el-table__row',
        EXPORT_AS_BUTTON: 'slipping-away-export-as-button',
        TABLE_SEARCH_INPUT: 'slipping-away-datatable-search-input',

        COLUMN_NAME_NO_SESSION_IN_LABEL: 'slipping-away-label-no-sessions-in-(days)',
        COLUMN_NAME_NO_SESSION_IN_SORTABLE_ICON: 'slipping-away-sortable-icon-no-sessions-in-(days)',
        COLUMN_NAME_SLIPPING_AWAY_USER_COUNT_LABEL: 'slipping-away-label-slipping-away-user-count',
        COLUMN_NAME_SLIPPING_AWAY_USER_COUNT_SORTABLE_ICON: 'slipping-away-sortable-icon-slipping-away-user-count',
        COLUMN_NAME_PERCENTAGE_LABEL: 'slipping-away-label-percentage',
        COLUMN_NAME_PERCENTAGE_SORTABLE_ICON: 'slipping-away-sortable-icon-percentage',

        //Columns' Rows' Datas Elements 
        NO_SESSION_IN: 'datatable-no-sessions-in-' + index,
        SLIPPING_AWAY_USER_COUNT: 'datatable-slipping-away-user-count-' + index,
        PERCENTAGE_VALUE: 'datatable-percentage-' + index,
        PERCENTAGE_PROGRESS_BAR: 'datatable-percentage-progress-bar-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'slipping-away--items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'slipping-away-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'slipping-away-overview-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'slipping-away-overview-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'slipping-away-overview-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'slipping-away-overview-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'slipping-away-overview-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'slipping-away-overview-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'slipping-away-overview-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'slipping-away-overview-last-page-arrow-button'
    };
};

module.exports = {
    slippingAwayPageElements,
    slippingAwayEChartElements,
    slippingAwayDataTableElements
};