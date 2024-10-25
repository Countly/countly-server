export const datePresetsElements = {
    PAGE_TITLE: 'header-title',
    CREATE_DATE_PRESET_BUTTON: 'new-date-preset-button',
  }
  
  const datePresetsTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'datatable-date-presets-empty-logo',
    EMPTY_TABLE_TITLE: 'datatable-date-presets-empty-title',
    EMPTY_TABLE_SUBTITLE: 'datatable-date-presets-empty-subtitle',

    TABLE_ROWS: '.el-table__row',
    COLUMN_NAME_NAME_LABEL: 'datatable-date-presets-label-name',
    COLUMN_NAME_DATE_RANGE_LABEL: 'datatable-date-presets-label-date-range',
    COLUMN_NAME_OWNERT_LABEL: 'datatable-date-presets-label-owner',
    COLUMN_NAME_VISIBILITY_LABEL: 'datatable-date-presets-label-visibility',

    //Columns' Rows' Datas Elements
    NAME: 'datatable-date-presets-name-' + index,
    DATE_RANGE: 'datatable-date-presets-date-range-' + index,
    OWNER: 'datatable-date-presets-owner-' + index,
    VISIBILITY: 'datatable-date-presets-visibility-' + index,
    MORE_BUTTON: 'datatable-date-presets-' + index + '-more-option-button',
  
    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-date-presets-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-date-presets-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-date-presets-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-date-presets-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-date-presets-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-date-presets-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-date-presets-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-date-presets-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-date-presets-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-date-presets-last-page-arrow-button'
  });
  
  module.exports = {
    datePresetsElements,
    datePresetsTableElements
  };