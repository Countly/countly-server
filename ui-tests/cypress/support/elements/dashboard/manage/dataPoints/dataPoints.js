export const dataPointsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    TOP_APPLICATIONS_BY_DATA_POINTS_LABEL: 'top-applications-by-data-points-in-the-last-two-hours-label',
};

const dataPointsMetricCardElements = (index = 0) => ({
    APP_NAME_LABEL: 'metric-card-datapoint-app-' + index + '-column-label',
    APP_NAME_VALUE_LABEL: 'metric-card-datapoint-app-' + index + '-column-number',
});

const dataPointsGraphElements = {
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
    ECHART: '.echarts',

    EMPTY_TABLE_ICON: 'chart-datapoint-empty-logo',
    EMPTY_TABLE_TITLE: 'chart-datapoint-empty-title',
    EMPTY_TABLE_SUBTITLE: 'chart-datapoint-empty-subtitle',
};

const dataPointsDataTableElements = (index = 0) => ({
    EXPORT_AS_BUTTON: 'datatable-apps-datapoint-export-as-button',
    DATATABLE_SEARCH_INPUT: 'datatable-apps-datapoint-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_APP_NAME_LABEL: 'datatable-apps-datapoint-label-app-name',
    COLUMN_NAME_APP_NAME_SORTABLE_ICON: 'datatable-apps-datapoint-sortable-icon-app-name',
    COLUMN_NAME_SESSIONS_LABEL: 'datatable-apps-datapoint-label-sessions',
    COLUMN_NAME_SESSIONS_TOOLTIP: 'datatable-apps-datapoint-tooltip-sessions',
    COLUMN_NAME_SESSIONS_SORTABLE_ICON: 'datatable-apps-datapoint-sortable-icon-sessions',
    COLUMN_NAME_NON_SESSIONS_DATA_POINTS_LABEL: 'datatable-apps-datapoint-label-non-session-data-points',
    COLUMN_NAME_NON_SESSIONS_DATA_POINTS_TOOLTIP: 'datatable-apps-datapoint-tooltip-non-session-datapoints',
    COLUMN_NAME_NON_SESSIONS_DATA_POINTS_SORTABLE_ICON: 'datatable-apps-datapoint-sortable-icon-non-session-data-points',
    COLUMN_NAME_TOTAL_DATA_POINTS_LABEL: 'datatable-apps-datapoint-label-total-data-points',
    COLUMN_NAME_TOTAL_DATA_POINTS_SORTABLE_ICON: 'datatable-apps-datapoint-sortable-icon-total-data-points',
    COLUMN_NAME_CHANGE_IN_DATA_POINTS_LABEL: 'datatable-apps-datapoint-label-change-in-data-points',
    COLUMN_NAME_CHANGE_IN_DATA_POINTS_SORTABLE_ICON: 'datatable-apps-datapoint-sortable-icon-change-in-data-points',

    //Columns' Rows' Datas Elements
    APP_NAME_ALL_DATAPOINTS: 'datatable-all-datapoints',
    APP_NAME: 'datatable-datapoints-app-name-' + index,
    SESSIONS: 'datatable-datapoints-sessions-' + index,
    NON_SESSIONS_DATA_POINTS: 'datatable-datapoints-no-session-datapoints-' + index,
    TOTAL_DATA_POINTS: 'datatable-datapoints-total-datapoints-' + index,
    CHANGE_IN_DATA_POINTS: 'datatable-datapoints-datapoint-change-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-apps-datapoint-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-apps-datapoint-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-apps-datapoint-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-apps-datapoint-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-apps-datapoint-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-apps-datapoint-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-apps-datapoint-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-apps-datapoint-groups-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-apps-datapoint-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-apps-datapoint-views-last-page-arrow-button'
});

module.exports = {
    dataPointsPageElements,
    dataPointsMetricCardElements,
    dataPointsGraphElements,
    dataPointsDataTableElements
};