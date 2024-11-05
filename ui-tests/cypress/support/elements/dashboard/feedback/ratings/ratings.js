export const ratingsPageElements = {
    PAGE_TITLE: 'ratings-header-title',
    PAGE_TITLE_TOOLTIP: 'ratings-header-tooltip',
    TAB_RATINGS: 'tab-ratings-tab-ratings-title',
    TAB_RATING_WIDGETS: 'tab-ratings-tab-rating-widgets-title',

    RESULTS_FOR_LABEL: 'ratings-result-for-label',
    FILTER_PARAMETERS_COMBOBOX: 'ratings-filter-parameters-dropdown-pseudo-input-label',
    FILTER_DATE_PICKER: 'ratings-date-range-select-dropdown-pseudo-input-label',

    DATATABLE_TAB_RATINGS: 'tab-ratings-data-table-tab-ratings-title',
    DATATABLE_TAB_COMMENTS: 'tab-ratings-data-table-tab-comments-title',
};

const ratingsMetricCardElements = {
    TOTAL_RATINGS_LABEL: 'metric-card-ratings-total-ratings-column-label',
    TOTAL_RATINGS_TOOLTIP: 'metric-card-ratings-total-ratings-column-tooltip',
    TOTAL_RATINGS_NUMBER_LABEL: 'metric-card-ratings-total-ratings-column-number',
    AVERAGE_RATINGS_SCORE_LABEL: 'metric-card-ratings-average-ratings-score-column-label',
    AVERAGE_RATINGS_SCORE_TOOLTIP: 'metric-card-ratings-average-ratings-score-column-tooltip',
    AVERAGE_RATINGS_SCORE_NUMBER_LABEL: 'metric-card-ratings-average-ratings-score-column-number',
};

const ratingsEChartElements = {
    ECHARTS: '.echarts',
    EMPTY_CHART_ICON: 'ratings-chart-empty-logo',
    EMPTY_CHART_TITLE: 'ratings-chart-empty-title',
    EMPTY_CHART_SUBTITLE: 'ratings-chart-empty-subtitle',

    MORE_BUTTON: 'ratings-chart-cly-chart-more-dropdown-more-option-button',
    RATING_ICON: 'ratings-chart-ratings-legend-icon',
    RATING: 'ratings-chart-ratings-legend-label',
};

const ratingsDataTableElements = (index = 0) => ({
    EXPORT_AS_BUTTON: 'ratings-data-table-export-as-button',
    TABLE_SEARCH_INPUT: 'ratings-data-table-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_RATING_NAME_LABEL: 'ratings-data-table-label-rating',
    COLUMN_NAME_RATING_NAME_SORTABLE_ICON: 'ratings-data-table-sortable-icon-rating',
    COLUMN_NAME_NUMBER_OF_RATINGS_LABEL: 'ratings-data-table-label-number-of-ratings',
    COLUMN_NAME_NUMBER_OF_RATINGS_SORTABLE_ICON: 'ratings-data-table-sortable-icon-number-of-ratings',
    COLUMN_NAME_PERCENTAGE_LABEL: 'ratings-data-table-label-percentage',
    COLUMN_NAME_PERCENTAGE_SORTABLE_ICON: 'ratings-data-table-sortable-icon-percentage',

    //Columns' Rows' Datas Elements 
    RATING_ICON: 'ratings-data-table-rating-' + index,
    RATING: 'ratings-data-table-rating-' + index,
    NUMBER_OF_RATINGS: 'ratings-data-table-number-of-rating-' + index,
    PERCENTAGE: 'ratings-data-table-percentage-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'ratings-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'ratings-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'ratings-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'ratings-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'ratings-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'ratings-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'ratings-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'ratings-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'ratings-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'ratings-views-last-page-arrow-button'
});

const commentsDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'ratings-comments-table-empty-logo',
    EMPTY_TABLE_TITLE: 'ratings-comments-table-empty-title',
    EMPTY_TABLE_SUBTITLE: 'ratings-comments-table-empty-subtitle',

    EXPORT_AS_BUTTON: 'ratings-comments-table-export-as-button',
    TABLE_SEARCH_INPUT: 'ratings-comments-table-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_COMMENT_NAME_LABEL: 'ratings-comments-table-label-comment',
    COLUMN_NAME_RATING_LABEL: 'ratings-comments-table-label-rating',
    COLUMN_NAME_RATING_SORTABLE_ICON: 'ratings-comments-table-sortable-icon-rating',
    COLUMN_NAME_TIME_LABEL: 'ratings-comments-table-label-time',
    COLUMN_NAME_TIME_SORTABLE_ICON: 'ratings-comments-table-sortable-icon-time',
    COLUMN_NAME_E_MAIL_LABEL: 'ratings-comments-table-label-e-mail',

    //Columns' Rows' Datas Elements 
    COMMENT: 'ratings-comment-table-comment-row-' + index,
    RATING_ICON: 'rating-color rating-comments-color-' + index,
    RATING: 'ratings-comment-table-rating-row-' + index,
    TIME: 'ratings-comment-table-time-row-' + index,
    E_MAIL: 'ratings-comment-table-email-row-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'ratings-comments-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'ratings-comments-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'ratings-comments-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'ratings-comments-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'ratings-comments-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'ratings-comments-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'ratings-comments-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'ratings-comments-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'ratings-comments-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'ratings-comments-views-last-page-arrow-button'
});

module.exports = {
    ratingsPageElements,
    ratingsMetricCardElements,
    ratingsEChartElements,
    ratingsDataTableElements,
    commentsDataTableElements
};