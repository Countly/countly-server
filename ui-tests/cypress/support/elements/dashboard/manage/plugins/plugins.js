export const pluginsPageElements = {
    PAGE_TITLE: 'header-title',
    ALL_FEATURES_RADIO_BUTTON: 'all-features-radio-button',
    ENABLED_FEATURES_RADIO_BUTTON: 'enabled-features-radio-button',
    DISABLED_FEATURES_RADIO_BUTTON: 'disabled-features-radio-button',
};

const pluginsDataTableElements = (index = 0) => ({
    TABLE_ROWS: '.el-table__row',
    EXPORT_AS_BUTTON: 'datatable-features-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-features-datatable-search-input',

    COLUMN_NAME_FEATURE_NAME_LABEL: 'datatable-features-label-feature-name',
    COLUMN_NAME_FEATURE_NAME_SORTABLE_ICON: 'datatable-features-sortable-icon-feature-name',
    COLUMN_NAME_DESCRIPTION_LABEL: 'datatable-features-label-description',
    COLUMN_NAME_DEPENDENT_FEATURES_LABEL: 'datatable-features-label-dependent-features',

    //Columns' Rows' Datas Elements 
    STATUS: 'datatable-features-toggle-' + index + '-el-switch-wrapper',
    FEATURE_NAME: 'datatable-features-feature-name-' + index,
    DESCRIPTION: 'datatable-features-description-' + index,
    DEPENDENT_FEATURES: 'datatable-features-dependent-features-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-features-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-features-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-features-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-features-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-features-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-features-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-features-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-features-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-features-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-features-last-page-arrow-button'
});

module.exports = {
    pluginsPageElements,
    pluginsDataTableElements
};