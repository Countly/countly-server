export const userManagementPageElements = {
    PAGE_TITLE: 'header-title',
    CREATE_USER_BUTTON: 'create-user-button',
    FILTER_USER_TYPE_SELECT: 'cly-input-dropdown-trigger-pseudo-input-label',
};

const usersDataTableElements = (index = 0) => ({

        TABLE_ROWS: '.el-table__row',
        EDIT_COLUMNS_BUTTON: 'cly-datatable-n-test-id-edit-columns-button',
        EXPORT_AS_BUTTON: 'cly-datatable-n-test-id-export-as-button',
        TABLE_SEARCH_INPUT: 'cly-datatable-n-test-id-datatable-search-input',
        COLUMN_NAME_USER_LABEL: 'cly-datatable-n-test-id-label-user',
        COLUMN_NAME_USER_SORTABLE_ICON: 'cly-datatable-n-test-id-sortable-icon-user',
        COLUMN_NAME_ROLE_LABEL: 'cly-datatable-n-test-id-label-role',
        COLUMN_NAME_ROLE_SORTABLE_ICON: 'cly-datatable-n-test-id-sortable-icon-role',
        COLUMN_NAME_EMAIL_LABEL: 'cly-datatable-n-test-id-label-e-mail',
        COLUMN_NAME_EMAIL_SORTABLE_ICON: 'cly-datatable-n-test-id-sortable-icon-e-mail',
        COLUMN_NAME_LAST_LOGIN_LABEL: 'cly-datatable-n-test-id-label-last-login',
        COLUMN_NAME_LAST_LOGIN_SORTABLE_ICON: 'cly-datatable-n-test-id-sortable-icon-last-login',

        //Columns' Rows' Datas Elements
        INTERNAL_NAME: 'users-data-table-user-role-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'cly-datatable-n-test-id-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'cly-datatable-n-test-id-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'cly-datatable-n-test-id-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'cly-datatable-n-test-id-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'cly-datatable-n-test-id-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'cly-datatable-n-test-id-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'cly-datatable-n-test-id-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'cly-datatable-n-test-id-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'cly-datatable-n-test-id-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'cly-datatable-n-test-id-last-page-arrow-button'
});

module.exports = {
    userManagementPageElements,
    usersDataTableElements
};