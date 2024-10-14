export const countriesPageElements = {
    TAB_COUNTRIES: 'tab-countries-title',
    TAB_LANGUAGES: 'tab-languages-title',

    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',
};

export const countriesMetricCardElements = {
    WORLD_MAP: 'cly-worldmap',

    TOTAL_SESSIONS_RADIO_BUTTON: 'cly-radio-button-box-total-sessions',
    TOTAL_SESSIONS_RADIO_BOX: 'cly-radio-box-total-sessions',
    TOTAL_SESSIONS_LABEL: 'cly-radio-label-total-sessions',
    TOTAL_SESSIONS_NUMBER: 'cly-radio-number-total-sessions',
    TOTAL_SESSIONS_TREND_ICON: 'cly-radio-trend-icon-total-sessions',
    TOTAL_SESSIONS_TREND_VALUE: 'cly-radio-trend-total-sessions',

    TOTAL_USERS_RADIO_BUTTON: 'cly-radio-button-box-total-users',
    TOTAL_USERS_RADIO_BOX: 'cly-radio-box-total-users',
    TOTAL_USERS_LABEL: 'cly-radio-label-total-users',
    TOTAL_USERS_NUMBER: 'cly-radio-number-total-users',
    TOTAL_USERS_TREND_ICON: 'cly-radio-trend-icon-total-users',
    TOTAL_USERS_TREND_VALUE: 'cly-radio-trend-total-users',

    NEW_USERS_RADIO_BUTTON: 'cly-radio-button-box-new-users',
    NEW_USERS_RADIO_BOX: 'cly-radio-box-new-users',
    NEW_USERS_LABEL: 'cly-radio-label-new-users',
    NEW_USERS_NUMBER: 'cly-radio-number-new-users',
    NEW_USERS_TREND_ICON: 'cly-radio-trend-icon-new-users',
    NEW_USERS_TREND_VALUE: 'cly-radio-trend-new-users',
};

const countriesDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'countries-empty-logo',
    EMPTY_TABLE_TITLE: 'countries-empty-title',
    EMPTY_TABLE_SUBTITLE: 'countries-empty-subtitle',

    EXPORT_AS_BUTTON: 'countries-export-as-button',
    TABLE_SEARCH_INPUT: 'countries-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_COUNTRY_LABEL: 'countries-label-country',
    COLUMN_NAME_COUNTRY_SORTABLE_ICON: 'countries-sortable-icon-country',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'countries-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'countries-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'countries-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'countries-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'countries-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'countries-sortable-icon-new-users',

    //Columns' Rows' Datas Elements 
    COUNTRY: 'datatable-countries-country-name-' + index,
    COUNTRY_FLAG: 'datatable-countries-country-flag-' + index,
    TOTAL_SESSIONS: 'datatable-countries-total-sessions-' + index,
    TOTAL_USERS: 'datatable-countries-total-users-' + index,
    NEW_USERS: 'datatable-countries-new-users-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'countries-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'countries-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'countries-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'countries-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'countries-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'countries-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'countries-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'countries-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'countries-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'countries-views-last-page-arrow-button'
});

module.exports = {
    countriesPageElements,
    countriesMetricCardElements,
    countriesDataTableElements
};