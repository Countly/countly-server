export const dashboardsMenuElements = (index = 0) => ({
    DASHBOARD_MENU_TITLE: "dashboard-menu-title",
    DASHBOARD_NEW_BUTTON: "add-dashboard-button",
    DASHBOARD_SEARCH_BOX: "dashboard-search-box",
    CUSTOM_DASHBOARD: "custom-dashboard-" + index
});

const customDashboardElements = {
    CUSTOM_DASHBOARD_TITLE: "dashboard-name",
    CUSTOM_DASHBOARD_CREATED_TIME_ICON: "dashboard-creation-time-icon",
    CUSTOM_DASHBOARD_CREATED_LABEL: "dashboard-created-label",
    CUSTOM_DASHBOARD_CREATED_TIME: "dashboard-creation-time",
    CUSTOM_DASHBOARD_CREATED_BY: "dashboard-creation-by",
    SELECT_DATE_RANGE: "dashboard-date-picker-pseudo-input",
    NEW_WIDGET_BUTTON: "add-widget-button",

    MORE_OPTIONS_BUTTON: "dashboard-more-option-button",
    MORE_OPTIONS_BUTTON_FULLSCREEN_OPTION: "dashboard-more-button-fullscreen-option",
    MORE_OPTIONS_BUTTON_EDIT_OPTION: "dashboard-more-button-edit-option",
    MORE_OPTIONS_BUTTON_CREATE_REPORTS_OPTION: "dashboard-more-button-create-email-reports-option",
    MORE_OPTIONS_BUTTON_DUPLICATE_OPTION: "dashboard-more-button-duplicate-option",
    MORE_OPTIONS_BUTTON_DELETE_OPTION: "dashboard-more-button-delete-option",

    CREATION_INFO: "dashboard-creation-info",
    CREATION_INFO_TIME_ICON: "dashboard-creation-time-icon",
    CREATION_INFO_CREATION_BY: "dashboard-creation-by",

    NO_WIDGET_ICON: "no-widget-icon",
    NO_WIDGET_TITLE: "empty-view-title",
    NO_WIDGET_SUBTITLE: "empty-view-subtitle",

    NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE: 'cly-notification-text',
    NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE_CLOSE_ICON: 'cly-notification-full-size-close-icon',
};

const customDashboardWidgetElements = (index = 0) => ({
    WIDGET_TITLE: "widget-title",
    WIDGET_APP_ICON: 'widget-app-icon',
    WIDGET_APP_NAME: 'widget-app-name',
    WIDGET_ITEM: 'widget-item-' + index,
    WIDGET_LABEL: 'widget-label-' + index,
    WIDGET_MORE_OPTIONS_BUTTON: 'cly-more-options-test-id-more-option-button'
});

const customDashboardDrawerElements = {
    TITLE: "create-dashboard-drawer-header-title",
    CLOSE_BUTTON: "create-dashboard-drawer-close-button",

    DASHBOARD_NAME_LABEL: "dashboard-name-input-label-header",
    DASHBOARD_NAME_INPUT: "dashboard-name-input",

    DASHBOARD_VISIBILITY_LABEL: "dashboard-visibility-label",
    DASHBOARD_VISIBILITY_TOOLTIP: "dashboard-visibility-tooltip",

    DASHBOARD_VISIBILITY_RADIO_BUTTON_ALL_USERS_LABEL: "dashboard-visibility-option-all-users-el-radio-label",
    DASHBOARD_VISIBILITY_RADIO_BUTTON_ALL_USERS: "dashboard-visibility-option-all-users-el-radio-wrapper",
    DASHBOARD_VISIBILITY_RADIO_BUTTON_SOME_SPECIFIC_USERS_LABEL: "dashboard-visibility-option-selected-users-el-radio-label",
    DASHBOARD_VISIBILITY_RADIO_BUTTON_SOME_SPECIFIC_USERS: "dashboard-visibility-option-selected-users-el-radio-wrapper",
    DASHBOARD_VISIBILITY_RADIO_BUTTON_PRIVATE_LABEL: "dashboard-visibility-option-none-el-radio-label",
    DASHBOARD_VISIBILITY_RADIO_BUTTON_PRIVATE: "dashboard-visibility-option-none-el-radio-wrapper",

    DASHBOARD_USER_PERMISSIONS_LABEL: "dashboard-user-permissions-label",
    DASHBOARD_USER_PERMISSIONS_TOOLTIP: "dashboard-user-permissions-tooltip",
    DASHBOARD_EDIT_PERMISSIONS_LABEL: "dashboard-users-edit-permission-label-header",
    DASHBOARD_EDIT_PERMISSIONS_SUB_LABEL: "dashboard-users-edit-permission-label-sub-header",
    DASHBOARD_EDIT_PERMISSIONS_INPUT: "edit-permission-user-email-input",
    DASHBOARD_EDIT_PERMISSIONS_SEARCH_BOX: "search-email-input",
    DASHBOARD_VIEW_PERMISSIONS_LABEL: "dashboard-users-view-permission-label-header",
    DASHBOARD_VIEW_PERMISSIONS_SUB_LABEL: "dashboard-users-view-permission-label-sub-header",
    DASHBOARD_VIEW_PERMISSIONS_INPUT: "view-permission-user-email-input",
    DASHBOARD_VIEW_ONLY_PERMISSIONS_SEARCH_BOX: "search-email-input",

    DASHBOARD_ADDITIONAL_SETTINGS_LABEL: "dashboard-additional-settings-label",
    NOTIFY_VIA_EMAIL_CHECKBOX_LABEL: 'dashboard-send-email-checkbox-el-checkbox-label',
    NOTIFY_VIA_EMAIL_CHECKBOX_INPUT: 'dashboard-send-email-checkbox-el-checkbox-input',

    USE_REFRESH_RATE_CHECKBOX_LABEL: "dashboard-use-refresh-rate-checkbox-el-checkbox-label",
    USE_REFRESH_RATE_CHECKBOX_INPUT: "dashboard-use-refresh-rate-checkbox-el-checkbox-input",
    CUSTOM_REFRESH_RATE_TOOLTIP: "dashboard-custom-refresh-rate-tooltip",
    CUSTOM_REFRESH_RATE_INPUT: "dashboard-custom-refresh-rate-input",

    CANCEL_BUTTON: "create-dashboard-drawer-cancel-button",
    CREATE_BUTTON: "create-dashboard-drawer-save-button"
};

const newWidgetDrawerElements = {
    TITLE: "widget-drawer-header-title",
    CLOSE_BUTTON: "drawer-test-id-close-button",
    WIDGET_TYPE_LABEL: "widget-type-header",
    WIDGET_TYPE_SUB_LABEL: "widget-type-sub-header",

    WIDGET_TYPE_RADIO_BUTTON_ANALYTICS_LABEL: "widget-type-analytics-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_ANALYTICS: "widget-type-analytics-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_EVENTS_LABEL: "widget-type-events-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_EVENTS: "widget-type-events-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_NOTES_LABEL: "widget-type-note-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_NOTES: "widget-type-note-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_PUSH_NOTIFICATION_LABEL: "widget-type-push-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_PUSH_NOTIFICATION: "widget-type-push-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_TIMES_OF_DAY_LABEL: "widget-type-times-of-day-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_TIMES_OF_DAY: "widget-type-times-of-day-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_CRASHES_LABEL: "widget-type-crashes-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_CRASHES: "widget-type-crashes-el-radio-wrapper",
    WIDGET_TYPE_RADIO_BUTTON_SDK_LABEL: "widget-type-sdk-el-radio-label",
    WIDGET_TYPE_RADIO_BUTTON_SDK: "widget-type-sdk-el-radio-wrapper",

    SELECT_SOURCE_APP: "source-apps-select",

    VISUALIZATION_TYPE_ITEM_TIME_SERIES: "visualization-item-time-series",
    VISUALIZATION_TYPE_ITEM_BAR_CHART: "visualization-item-bar-chart",
    VISUALIZATION_TYPE_ITEM_NUMBER: "visualization-item-number",
    VISUALIZATION_TYPE_ITEM_TABLE: "visualization-item-table",

    SELECT_METRIC: "metric-select-input",

    CREATE_WIDGET_BUTTON: "widget-drawer-save-button",
    CANCEL_BUTTON: "widget-drawer-cancel-button"
};

module.exports = {
    dashboardsMenuElements,
    customDashboardElements,
    customDashboardWidgetElements,
    customDashboardDrawerElements,
    newWidgetDrawerElements
};