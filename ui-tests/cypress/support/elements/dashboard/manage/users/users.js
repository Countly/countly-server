export const usersPageElements = {
    PAGE_TITLE: 'header-title',
    CREATE_USER_BUTTON: 'create-user-button',
    FILTER_USER_TYPE_SELECT: 'cly-input-dropdown-trigger-pseudo-input-label',
};

const usersCreationPageElements = (appName) => ({
    FULL_NAME_LABEL: 'full-name-label',
    FULL_NAME_INPUT: 'full-name-input',
    USER_NAME_LABEL: 'user-name-label',
    USER_NAME_INPUT: 'user-name-input',
    PASSWORD_LABEL: 'password-label',
    PASSWORD_INPUT: 'password-input',
    GENERATE_PASSWORD_BUTTON: 'generate-password-button',
    EMAIL_LABEL: 'email-label',
    EMAIL_INPUT: 'email-input',
    GRANT_ADMIN_ACCESS_TO_APP_DROPDOWN: 'admin-access-to-app-dropdown',
    GRANT_USER_ACCESS_TO_APP_DROPDOWN: 'user-access-to-app-dropdown',
    ADMIN_ACCESS_TO_APP_DROPDOWN: 'admin-access-to-app-dropdown-checklistbox-' + appName + '-el-checkbox-label',
    USER_ACCESS_TO_APP_DROPDOWN: 'user-access-to-app-dropdown-checklistbox-' + appName + '-el-checkbox-label',
    DRAWER_CREATE_BUTTON: 'user-drawer-save-button',
    DRAWER_CANCEL_BUTTON: 'user-drawer-cancel-button',
    GLOBAL_ADMINISTRATOR_CHECKBOX_LABEL: 'global-administrator-el-checkbox-label',
    GLOBAL_ADMINISTRATOR_CHECKBOX_INPUT: 'global-administrator-el-checkbox-input',
    NOTIFICATION_USER_SAVED_MESSAGE: 'cly-notification-text',
    TABLE_SEARCH_INPUT: 'datatable-users-datatable-search-input',
    UPLOAD_IMAGE_DROPZONE: 'user-profile-picture-dropzone'
});

const usersDataTableElements = (index = 0) => ({
    EDIT_COLUMNS_BUTTON: 'datatable-users-edit-columns-button',
    EXPORT_AS_BUTTON: 'datatable-users-export-as-button',
    TABLE_SEARCH_INPUT: 'datatable-users-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_USER_LABEL: 'datatable-users-label-user',
    COLUMN_NAME_USER_SORTABLE_ICON: 'datatable-users-sortable-icon-user',
    COLUMN_NAME_ROLE_LABEL: 'datatable-users-label-role',
    COLUMN_NAME_ROLE_SORTABLE_ICON: 'datatable-users-sortable-icon-role',
    COLUMN_NAME_EMAIL_LABEL: 'datatable-users-label-e-mail',
    COLUMN_NAME_EMAIL_SORTABLE_ICON: 'datatable-users-sortable-icon-e-mail',
    COLUMN_NAME_LAST_LOGIN_LABEL: 'datatable-users-label-last-login',
    COLUMN_NAME_LAST_LOGIN_SORTABLE_ICON: 'datatable-users-sortable-icon-last-login',

    //Columns' Rows' Datas Elements
    USER: 'datatable-users-user-' + index,
    ROLE: 'datatable-users-role-' + index,
    EMAIL: 'datatable-users-email-' + index,
    LAST_LOGIN: 'datatable-users-last-login-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'datatable-users-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'datatable-users-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'datatable-users-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'datatable-users-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'datatable-users-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'datatable-users-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'datatable-users-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'datatable-users-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'datatable-users-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'datatable-users-last-page-arrow-button'
});

module.exports = {
    usersPageElements,
    usersDataTableElements,
    usersCreationPageElements
};