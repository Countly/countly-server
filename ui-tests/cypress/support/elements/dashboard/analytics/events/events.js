export const eventsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_VIEW_GUIDE_BUTTON: 'view-guide-button',
    TAB_EVENT_STATS: 'tab-event-stats-title',
    TAB_COMPARE_EVENTS: 'tab-compare-events-title',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    //COMPARE EVENTS
    SELECT_EVENTS_COMBOBOX: 'select-events-to-compare-el-select-input',
    SELECT_EVENTS_COMBOBOX_INPUT: 'select-events-to-compare-select-input',
    COMPARE_BUTTON: 'events-compare-button',
    RESULTS_BY_LABEL: 'compare-events-results-by-label',
    COUNT_BUTTON: 'compare-events-results-by-button-select-input-pseudo-input-label'
};

const eventStatsListBoxElements = (eventName = 'Bill Payment') => ({
    LIST_BOX_SEARCH_INPUT: 'cly-listbox-search-input',
    LIST_BOX: 'all-events-scroll',
    LIST_BOX_NO_MATCH_FOUND_LABEL: 'cly-listbox-no-match-found-label',
    LIST_BOX_ITEM: 'all-events-item-' + eventName.toLowerCase().replaceAll(/\s+/g, '-'),
});

const eventStatsEChartElements = {
    EMPTY_CHART_ICON: 'all-events-chart-time-empty-logo',
    EMPTY_CHART_TITLE: 'all-events-chart-time-empty-title',
    EMPTY_CHART_SUBTITLE: 'all-events-chart-time-empty-subtitle',
    EVENT_TITLE: 'event-title',
    SEGMENTATION_BY_LABEL: 'segmentation-by-label',
    SEGMENTATION_SELECT: 'segmentation-select',
    PERIOD_LABEL: 'period_label',
    CHART: 'all-events-chart-time-chart',
    CHART_TYPE_SELECT: 'all-events-chart-time-header-select-input',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-button',
    CHART_MORE_BUTTON: 'all-events-chart-time-header-cly-chart-more-dropdown-more-option-button',
    CHART_COUNT_ICON: 'all-events-chart-time-legend-count-icon',
    CHART_COUNT_LABEL: 'all-events-chart-time-legend-count-label',
    CHART_COUNT_VALUE: 'all-events-chart-time-legend-count-value',
    CHART_COUNT_TREND_ICON: 'all-events-chart-time-legend-count-trend-icon',
    CHART_COUNT_PERCENTAGE: 'all-events-chart-time-legend-count-percentage',
};

const eventStatsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'all-events-datatable-empty-logo',
    EMPTY_TABLE_TITLE: 'all-events-datatable-empty-title',
    EMPTY_TABLE_SUBTITLE: 'all-events-datatable-empty-subtitle',

    EXPORT_AS_BUTTON: 'all-events-datatable-export-as-button',
    TABLE_SEARCH_INPUT: 'all-events-datatable-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_DATE_LABEL: 'all-events-datatable-label-date',
    COLUMN_NAME_DATE_SORTABLE_ICON: 'all-events-datatable-sortable-icon-date',
    COLUMN_NAME_COUNT_LABEL: 'all-events-datatable-label-count',
    COLUMN_NAME_COUNT_SORTABLE_ICON: 'all-events-datatable-sortable-icon-count',

    //Columns' Rows' Datas Elements 
    DATE: 'datatable-all-events-date-' + index,
    COUNT: 'datatable-all-events-count-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'all-events-datatable-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'all-events-datatable-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'all-events-datatable-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'all-events-datatable-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'all-events-datatable-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'all-events-datatable-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'all-events-datatable-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'all-events-datatable-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'all-events-datatable-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'all-events-datatable-views-last-page-arrow-button'
});

const compareEventsEChartElements = (eventName = 'Credit Card Application') => ({
    EMPTY_CHART_ICON: 'compare-events-chart-time-empty-logo',
    EMPTY_CHART_TITLE: 'compare-events-chart-time-empty-title',
    EMPTY_CHART_SUBTITLE: 'compare-events-chart-time-empty-subtitle',

    CHART: 'compare-events-chart-time-chart',
    CHART_TYPE_SELECT: 'compare-events-chart-time-header-select-input',
    CHART_TYPE_ANNOTATION_BUTTON: 'chart-type-annotation-button',
    CHART_MORE_BUTTON: 'compare-events-chart-time-header-cly-chart-more-dropdown-more-option-button',
    CHART_EVENT_ICON: 'compare-events-chart-time-legend-' + eventName.toLowerCase().replaceAll(/\s+/g, '-') + '-legend-icon',
    CHART_EVENT_LABEL: 'compare-events-chart-time-legend-' + eventName.toLowerCase().replaceAll(/\s+/g, '-') + '-legend-label',
    CHART_PREVIOUS_PERIOD_ICON: 'compare-events-chart-time-legend-previous-period-legend-icon',
    CHART_PREVIOUS_PERIOD_LABEL: 'compare-events-chart-time-legend-previous-period-legend-label',
});

const compareEventsDataTableElements = (index = 0) => ({
    EMPTY_DATATABLE_ICON: 'compare-events-empty-logo',
    EMPTY_DATATABLE_TITLE: 'compare-events-empty-title',
    EMPTY_DATATABLE_SUBTITLE: 'compare-events-empty-subtitle',

    EXPORT_AS_BUTTON: 'compare-events-export-as-button',
    TABLE_SEARCH_INPUT: 'compare-events-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_EVENT_LABEL: 'compare-events-label-event',
    COLUMN_NAME_EVENT_SORTABLE_ICON: 'compare-events-sortable-icon-event',
    COLUMN_NAME_COUNT_LABEL: 'compare-events-label-count',
    COLUMN_NAME_COUNT_SORTABLE_ICON: 'compare-events-sortable-icon-count',
    COLUMN_NAME_SUM_LABEL: 'compare-events-label-sum',
    COLUMN_NAME_SUM_SORTABLE_ICON: 'compare-events-sortable-icon-sum',
    COLUMN_NAME_DURATION_LABEL: 'compare-events-label-duration',
    COLUMN_NAME_DURATION_SORTABLE_ICON: 'compare-events-sortable-icon-duration',
    COLUMN_NAME_AVG_DURATION_LABEL: 'compare-events-label-avg.-duration',
    COLUMN_NAME_AVG_DURATION_SORTABLE_ICON: 'compare-events-sortable-icon-avg.-duration',

    //Columns' Rows' Datas Elements 
    EVENT: 'datatable-compare-events-name-' + index,
    COUNT: 'datatable-compare-events-count-' + index,
    SUM: 'datatable-compare-events-sum-' + index,
    DURATION: 'datatable-compare-events-duration-' + index,
    AVG_DURATION: 'datatable-compare-events-avg-duration-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'compare-events-datatable-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'compare-events-datatable-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'compare-events-datatable-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'compare-events-datatable-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'compare-events-datatable-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'compare-events-datatable-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'compare-events-datatable-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'compare-events-datatable-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'compare-events-datatable-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'compare-events-datatable-views-last-page-arrow-button'
});

module.exports = {
    eventsPageElements,
    eventStatsListBoxElements,
    eventStatsEChartElements,
    eventStatsDataTableElements,
    compareEventsEChartElements,
    compareEventsDataTableElements
};