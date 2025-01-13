export const dataPopulatorPageElements = {
    TAB_DATA_POPULATOR: '#tab-data-populator',
    TAB_TEMPLATES: '#tab-templates',
    TAB_POPULATE_WITH_TEMPLATE: 'tab-populate-with-template-title',
    TAB_POPULATE_WITH_ENVIRONMENT: 'tab-populate-with-environment-title'
};

export const populateWithTemplatePageElements = {
    //Data Populator -> Populate With Template
    DATA_POPULATOR_PAGE_TITLE: 'data-populator-header-title',
    DATA_POPULATOR_PAGE_TITLE_TOOLTIP: 'data-populator-header-title-tooltip',
    TEMPLATE_DATA_TEMPLATE_LABEL: 'populate-with-template-data-template-label',
    TEMPLATE_DATA_TEMPLATE_TOOLTIP: 'populate-with-template-data-template-tooltip',
    TEMPLATE_DATA_TEMPLATE_SELECT: 'data-populator-template-select',
    TEMPLATE_DATE_RANGE_LABEL: 'populate-with-template-data-range-label',
    TEMPLATE_DATE_RANGE_SELECT: 'populate-with-template-date-range-pseudo-input-label',
    TEMPLATE_DATE_RANGE_START_DATE: 'populate-with-template-date-range-in-between-start-date-input',
    TEMPLATE_DATE_RANGE_END_DATE: 'populate-with-template-date-range-in-between-end-date-input',
    TEMPLATE_DATE_RANGE_APPLY_BUTTON: 'populate-with-template-date-range-select-date-apply-range-button',
    TEMPLATE_NUMBER_OF_RUNS_LABEL: 'populate-with-template-number-of-runs-label',
    TEMPLATE_NUMBER_OF_RUNS_TOOLTIP: 'populate-with-template-number-of-runs-tooltip',
    TEMPLATE_NUMBER_OF_RUNS_10_LABEL: 'populate-with-template-select-number-of-runs-item-10',
    TEMPLATE_NUMBER_OF_RUNS_50_LABEL: 'populate-with-template-select-number-of-runs-item-50',
    TEMPLATE_NUMBER_OF_RUNS_100_LABEL: 'populate-with-template-select-number-of-runs-item-100',
    TEMPLATE_SAVE_ENVIRONMENT_SWITCHBOX: 'save-environment-el-switch-core',
    TEMPLATE_SAVE_ENVIRONMENT_LABEL: 'populate-with-template-save-environment-label',
    TEMPLATE_SAVE_ENVIRONMENT_TOOLTIP: 'populate-with-template-save-environment-tooltip',
    TEMPLATE_SAVE_ENVIRONMENT_INPUT: 'populate-with-template-save-environment-input',
    TEMPLATE_GENERATE_DEMO_DATA_BUTTON: 'populate-with-template-generate-demo-data-button'
};

export const populateWithEnvironmentPageElements = {
    //Data Populator -> Populate With Environment
    ENVIRONMENT_LABEL: 'populate-with-environment-environment-label',
    ENVIRONMENT_TOOLTIP: 'populate-with-environment-environment-tooltip',
    ENVIRONMENT_DATE_RANGE_LABEL: 'populate-with-environment-data-range-label',
    ENVIRONMENT_DATE_RANGE_SELECT: 'populate-with-environment-environment-select',
    ENVIRONMENT_DATE_RANGE_START_DATE: 'populate-with-environment-date-range-in-between-start-date-input',
    ENVIRONMENT_DATE_RANGE_END_DATE: 'populate-with-environment-date-range-in-between-end-date-input',
    ENVIRONMENT_DATE_RANGE_APPLY_BUTTON: 'populate-with-environment-data-range-select-date-apply-range-button',
    ENVIRONMENT_NUMBER_OF_RUNS_LABEL: 'populate-with-environment-number-of-runs-label',
    ENVIRONMENT_NUMBER_OF_RUNS_TOOLTIP: 'populate-with-environment-number-of-runs-tooltip',
    ENVIRONMENT_NUMBER_OF_RUNS_10_LABEL: 'populate-with-environment-select-number-of-runs-item-10',
    ENVIRONMENT_NUMBER_OF_RUNS_50_LABEL: 'populate-with-environment-select-number-of-runs-item-50',
    ENVIRONMENT_NUMBER_OF_RUNS_100_LABEL: 'populate-with-environment-select-number-of-runs-item-100',
    ENVIRONMENT_GENERATE_DEMO_DATA_BUTTON: 'populate-with-environment-generate-demo-data-button'
};

export const popUpElements = {
    //Confirm Pop Up 
    CONFIRM_POP_UP_TITLE: 'cly-vue-confirm-dialog-test-id-cly-confirm-dialog-title-label',
    CONFIRM_POP_UP_SUB_TITLE: 'el-dialog-test-id-el-dialog-content-label',
    CONFIRM_POP_UP_SAVE_BUTTON: 'cly-vue-confirm-dialog-test-id-cly-confirm-dialog-save-button',
    CONFIRM_POP_UP_CANCEL_BUTTON: 'cly-vue-confirm-dialog-test-id-cly-confirm-dialog-cancel-button',

    //Generating Pop Up 
    GENERATING_POP_UP_IMAGE: 'generating-data-image',
    GENERATING_POP_UP_PROGRESS_BAR: 'generating-data-progress-bar',
    GENERATING_POP_UP_PROGRESS_WIDTH: 'generating-data-progress-bar-width',
    GENERATING_POP_UP_TITLE: 'generating-data-title',
    GENERATING_POP_UP_SUB_TITLE: 'generating-data-sub-title',
    GENERATING_POP_UP_STOP_BUTTON: 'populate-stop-button',

    //SUCCESS POP UP
    SUCCESS_POP_UP_SUCCESS_ICON: 'finished-success-icon',
    SUCCESS_POP_UP_TITLE: 'finished-confirm-title',
    SUCCESS_POP_UP_SUB_TITLE: 'finished-confirm-sub-title',
    SUCCESS_POP_UP_GO_TO_HOME_BUTTON: 'go-to-homepage-button',
    SUCCESS_POP_UP_STAY_IN_POPULATOR_BUTTON: 'stay-in-data-populator-button'
};

export const templatesPageElements = {
    //Templates
    TEMPLATES_PAGE_TITLE: 'templates-header-title',
    TEMPLATES_PAGE_TITLE_TOOLTIP: 'templates-header-title-tooltip',
    CREATE_NEW_TEMPLATE_BUTTON: 'create-new-template-button',
};

const templatesDataTableElements = (index = 0) => ({
    DATATABLE_SEARCH_INPUT: 'datatable-templates-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    //Columns' Labels
    COLUMN_NAME_TEMPLATE_LABEL: 'datatable-templates-label-template',
    COLUMN_NAME_TEMPLATE_SORTABLE_ICON: 'datatable-templates-sortable-icon-template',
    COLUMN_NAME_NUMBER_OF_USERS_LABEL: 'datatable-templates-label-number-of-users',
    COLUMN_NAME_NUMBER_OF_USERS_SORTABLE_ICON: 'datatable-templates-sortable-icon-number-of-users',
    COLUMN_NAME_NUMBER_OF_EVENTS_LABEL: 'datatable-templates-label-number-of-events',
    COLUMN_NAME_NUMBER_OF_EVENTS_SORTABLE_ICON: 'datatable-templates-sortable-icon-number-of-events',
    COLUMN_NAME_VIEWS_LABEL: 'datatable-templates-label-views',
    COLUMN_NAME_VIEWS_SORTABLE_ICON: 'datatable-templates-sortable-icon-views',
    COLUMN_NAME_SEQUENCES_LABEL: 'datatable-templates-label-sequences',
    COLUMN_NAME_SEQUENCES_SORTABLE_ICON: 'datatable-templates-sortable-icon-sequences',
    COLUMN_NAME_GENERATED_ON_LABEL: 'datatable-templates-label-generated-on',
    COLUMN_NAME_GENERATED_ON_SORTABLE_ICON: 'datatable-templates-sortable-icon-generated-on',

    //Columns' Rows' Datas Elements 
    TEMPLATE: 'datatable-templates-template-' + index,
    NUMBER_OF_USERS: 'datatable-templates-number-of-users-' + index,
    NUMBER_OF_EVENTS: 'datatable-templates-number-of-events-' + index,
    VIEWS: 'datatable-templates-views-' + index,
    SEQUENCES: 'datatable-templates-sequences-' + index,
    GENERATED_ON: 'datatable-templates-generated-on-' + index,
    MORE_BUTTON: 'datatable-templates-' + index + '-more-option-button',
    DUPLICATE_BUTTON: 'datatable-templates-duplicate-button-' + index,
    DELETE_BUTTON: 'datatable-templates-delete-button-' + index,
    EDIT_BUTTON: 'datatable-templates-edit-button-' + index,

    //Pagination Elements
    TEMPLATES_ITEMS_PER_PAGE_LABEL: 'datatable-templates-items-per-page-label',
    TEMPLATES_PER_PAGE_COUNT_SELECT: 'datatable-templates-items-per-page-count-select-input-pseudo-input-label',
    TEMPLATES_PER_PAGE_COUNT_SELECT_ICON: 'datatable-templates-items-per-page-count-select-icon',
    TEMPLATES_PER_PAGE_COUNT_LABEL: 'datatable-templates-items-per-page-count-select',
    TEMPLATES_PAGE_NUMBER_SELECT: 'datatable-templates-page-number-select-input-pseudo-input-label',
    TEMPLATES_PAGE_NUMBER_SELECT_ICON: 'datatable-templates-page-number-select-icon',
    TEMPLATES_FIRST_PAGE_ARROW_BUTTON: 'datatable-templates-first-page-arrow-button',
    TEMPLATES_PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-templates-previous-page-arrow-button',
    TEMPLATES_NEXT_PAGE_ARROW_BUTTON: 'datatable-templates-next-page-arrow-button',
    TEMPLATES_LAST_PAGE_ARROW_BUTTON: 'datatable-templates-last-page-arrow-button'
});

module.exports = {
    dataPopulatorPageElements,
    populateWithTemplatePageElements,
    populateWithEnvironmentPageElements,
    popUpElements,
    templatesPageElements,
    templatesDataTableElements
};