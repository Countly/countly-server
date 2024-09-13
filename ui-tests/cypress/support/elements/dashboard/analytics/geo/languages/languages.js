export const languagesPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    FILTER_DATE_PICKER: 'cly-datepicker-test-id-pseudo-input-label',

    TAB_COUNTRIES: 'tab-countries-title',
    TAB_LANGUAGES: 'tab-languages-title',
};

const languagesEGraphElements = (index = 0) => ({
    EMPTY_PIE_TOTAL_ICON: 'pie-total-empty-logo',
    EMPTY_PIE_TOTAL_TITLE: 'pie-total-empty-title',
    EMPTY_PIE_TOTAL_SUBTITLE: 'pie-total-empty-subtitle',
    EMPTY_PIE_NEW_ICON: 'pie-new-empty-logo',
    EMPTY_PIE_NEW_TITLE: 'pie-new-empty-title',
    EMPTY_PIE_NEW_SUBTITLE: 'pie-new-empty-subtitle',

    ECHARTS: '.cly-vue-chart',
    LANGUAGES_NAMES: '.cly-vue-chart-legend__s-title',
    LANGUAGES_VALUES: '.cly-vue-chart-legend__s-percentage',
    LANGUAGES_ICONS: '.cly-vue-chart-legend__s-rectangle',
});

const languagesDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'languages-empty-logo',
    EMPTY_TABLE_TITLE: 'languages-empty-title',
    EMPTY_TABLE_SUBTITLE: 'languages-empty-subtitle',

    EXPORT_AS_BUTTON: 'languages-export-as-button',
    TABLE_SEARCH_INPUT: 'languages-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_LANGUAGE_LABEL: 'languages-label-language',
    COLUMN_NAME_LANGUAGE_SORTABLE_ICON: 'languages-sortable-icon-language',
    COLUMN_NAME_TOTAL_SESSIONS_LABEL: 'languages-label-total-sessions',
    COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON: 'languages-sortable-icon-total-sessions',
    COLUMN_NAME_TOTAL_USERS_LABEL: 'languages-label-total-users',
    COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON: 'languages-sortable-icon-total-users',
    COLUMN_NAME_NEW_USERS_LABEL: 'languages-label-new-users',
    COLUMN_NAME_NEW_USERS_SORTABLE_ICON: 'languages-sortable-icon-new-users',

    //Columns' Rows' Datas Elements
    LANGUAGE: 'datatable-languages-language-' + index,
    TOTAL_SESSIONS: 'datatable-languages-total-session-' + index,
    TOTAL_SESSIONS_DIVIDER: 'datatable-languages-total-session-divider-' + index,
    TOTAL_SESSIONS_PERCENT: 'datatable-languages-total-session-percentage-' + index,
    TOTAL_SESSIONS_PROGRESS_BAR: 'datatable-languages-total-session-progress-bar-' + index,
    TOTAL_USERS: 'datatable-languages-total-users-' + index,
    TOTAL_USERS_DIVIDER: 'datatable-languages-total-users-divider-' + index,
    TOTAL_USERS_PERCENT: 'datatable-languages-total-users-percentage-' + index,
    TOTAL_USERS_PROGRESS_BAR: 'datatable-languages-total-users-progress-bar-' + index,
    NEW_USERS: 'datatable-languages-new-users-' + index,
    NEW_USERS_DIVIDER: 'datatable-languages-new-users-divider-' + index,
    NEW_USERS_PERCENT: 'datatable-languages-new-users-percentage-' + index,
    NEW_USERS_PROGRESS_BAR: 'datatable-languages-new-users-progress-bar-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'languages-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'languages-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'languages-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'languages-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'languages-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'languages-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'languages-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'languages-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'languages-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'languages-views-last-page-arrow-button'
});

module.exports = {
    languagesPageElements,
    languagesEGraphElements,
    languagesDataTableElements
};