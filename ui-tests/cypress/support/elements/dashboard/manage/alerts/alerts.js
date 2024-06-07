export const alertsPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_TOOLTIP: 'header-title-tooltip',
    ADD_NEW_ALERT_BUTTON: 'add-new-alert-button',
    EMPTY_TABLE_ICON: 'alerts-table-empty-view-icon',
    EMPTY_TABLE_TITLE: 'alerts-table-empty-view-title',
    EMPTY_TABLE_SUBTITLE: 'alerts-table-empty-view-subtitle',
    EMPTY_TABLE_ADD_NEW_ALERT_LINK_BUTTON: 'alerts-table-empty-view-action-button',

    ACTIVE_ALERTS_LABEL: 'metric-card-active-alerts-column-label',
    ACTIVE_ALERTS_NUMBER_LABEL: 'metric-card-active-alerts-column-number',
    TOTAL_ALERTS_SENT_LABEL: 'metric-card-total-alerts-sent-column-label',
    TOTAL_ALERTS_SENT_NUMBER_LABEL: 'metric-card-total-alerts-sent-column-number',
    ALERTS_SENT_TODAY_LABEL: 'metric-card-alerts-sent-today-column-label',
    ALERTS_SENT_TODAY_NUMBER_LABEL: 'metric-card-alerts-sent-today-column-number',

    NOTIFICATION_ALERT_SAVED_MESSAGE: 'cly-notification-text',

    DELETE_ALERT_MODAL_TITLE: 'el-dialog-test-id-el-dialog-content-label',
    DELETE_ALERT_MODAL_CONTINUE_BUTTON: 'cly-confirm-test-id-cly-confirm-dialog-danger-button',
    DELETE_ALERT_MODAL_CANCEL_BUTTON: 'cly-confirm-test-id-cly-confirm-dialog-cancel-button',
    DELETE_ALERT_MODAL_CLOSE_BUTTON: 'el-dialog-test-id-el-dialog-close-button',
};

export const alertDrawerPageElements = {
    DRAWER_PAGE_TITLE: 'alert-drawer-header-title',
    DRAWER_CLOSE_BUTTON: 'alert-drawer-close-button',
    DRAWER_ALERT_NAME_LABEL: 'alert-name-header',
    DRAWER_ALERT_NAME_INPUT: 'alert-name-input',
    DRAWER_APPLICATION_LABEL: 'application-header',
    DRAWER_APPLICATION_SELECT: 'application-select',

    DRAWER_DATA_TYPE_LABEL: 'data-type-header',
    DRAWER_DATA_TYPE_SELECT: 'data-type-select',

    DRAWER_SUB_TYPE_LABEL: 'data-sub-type-header',
    DRAWER_SUB_TYPE_SELECT: 'data-sub-type-select',

    DRAWER_TRIGGER_LABEL: 'trigger-label',
    DRAWER_TRIGGER_SEND_ALERT_IF_LABEL: 'trigger-send-alert-if-label',
    DRAWER_TRIGGER_SEND_ALERT_IF_THERE_IS_A_LABEL: 'send-alert-if-there-is-a-label',
    DRAWER_TRIGGER_METRIC_SELECT: 'trigger-metric-select',
    DRAWER_TRIGGER_IS_LABEL: 'trigger-is-label',
    DRAWER_TRIGGER_VARIABLE_SELECT: 'trigger-variable-select',
    DRAWER_TRIGGER_BY_LABEL: 'trigger-by-label',
    DRAWER_TRIGGER_VALUE_INPUT: 'trigger-value-input',
    DRAWER_TRIGGER_PERCENTAGE_LABEL: 'trigger-percentage-label',
    DRAWER_TRIGGER_IN_THE_LAST_LABEL: 'trigger-in-the-last-label',
    DRAWER_TRIGGER_TIME_SELECT: 'trigger-time-select',
    DRAWER_TRIGGER_DOT_LABEL: 'trigger-dot-label',

    DRAWER_EMAIL_NOTIFICATION_LABEL: 'email-notification-label',
    DRAWER_EMAIL_NOTIF_TO_ADDRESS_LABEL: 'email-notification-specificaddress-el-radio-label',
    DRAWER_EMAIL_NOTIF_TO_ADDRESS_RADIO_BUTTON: 'email-notification-specificaddress-el-radio-wrapper',
    DRAWER_EMAIL_NOTIF_TO_GROUP_LABEL: 'email-notification-togroup-el-radio-label',
    DRAWER_EMAIL_NOTIF_TO_GROUP_RADIO_BUTTON: 'email-notification-togroup-el-radio-wrapper',
    DRAWER_EMAIL_NOTIF_DO_NOT_SEND_LABEL: 'email-notification-dontsend-el-radio-label',
    DRAWER_EMAIL_NOTIF_TO_NOT_SEND_RADIO_BUTTON: 'email-notification-dontsend-el-radio-wrapper',

    DRAWER_EMAIL_NOTIF_TO_ADDRESS_EMAIL_SELECT: 'email-address-select',
    DRAWER_EMAIL_NOTIF_TO_ADDRESS_EMAIL_INPUT: 'search-email-input',
    DRAWER_EDIT_EMAIL_NOTIF_TO_ADDRESS_EMAIL_INPUT: 'email-address-select-dropdown-el-select',

    DRAWER_EMAIL_NOTIF_TO_GROUP_GROUP_SELECT: 'choose-users-select-input',
    DRAWER_EMAIL_NOTIF_DO_NOT_SEND_INF_LABEL: 'set-the-user-group-permissions-tooltip',

    DRAWER_CREATE_BUTTON: 'alert-drawer-save-button',
    DRAWER_CANCEL_BUTTON: 'alert-drawer-cancel-button',

    //FILTER ELEMENTS
    DRAWER_ADD_FILTER_BUTTON: 'add-filter-button',
    DRAWER_FILTER_LABEL: 'filter-label',
    DRAWER_FILTER_IS_LABEL: 'is-label',
    DRAWER_FILTER_CLOSE_ICON: 'filter-close-icon',

    //CRASHES FILTER ELEMENTS
    DRAWER_FILTER_CRASHES_INPUT: 'alert-data-filter-key-crashes-label',
    DRAWER_FILTER_CRASHES_SELECT: 'alert-data-filter-key-crashes-select',

    //EVENTS FILTER ELEMENTS
    DRAWER_FILTER_EVENT_SELECT: 'alert-data-filter-key-event-select',
    DRAWER_FILTER_EVENT_INPUT: 'alert-data-filter-value-input',

    //RATING FILTER ELEMENTS
    DRAWER_FILTER_RATING_INPUT: 'alert-data-filter-key-rating-input',
    DRAWER_FILTER_RATING_SELECT: 'alert-data-filter-key-rating-select'
};

const alertDataTableElements = (index = 0) => {
    return {
        TABLE_ROWS: '.el-table__row',
        TABLE_APPLICATION_SELECT: 'select-app-combobox',
        EXPORT_AS_BUTTON: 'alerts-table-export-as-button',
        TABLE_SEARCH_INPUT: 'alerts-table-datatable-search-input',

        COLUMN_NAME_ALERT_NAME_LABEL: 'alerts-table-label-alert-name',
        COLUMN_NAME_ALERT_NAME_SORTABLE_ICON: 'alerts-table-sortable-icon-alert-name',
        COLUMN_NAME_APPLICATION_LABEL: 'alerts-table-label-application',
        COLUMN_NAME_APPLICATION_SORTABLE_ICON: 'alerts-table-sortable-icon-application',
        COLUMN_NAME_CONDITION_LABEL: 'alerts-table-label-condition',
        COLUMN_NAME_CONDITION_SORTABLE_ICON: 'alerts-table-sortable-icon-condition',
        COLUMN_NAME_CREATED_BY_LABEL: 'alerts-table-label-created-by',
        COLUMN_NAME_CREATED_BY_SORTABLE_ICON: 'alerts-table-sortable-icon-created-by',

        //Columns' Rows' Datas Elements 
        STATUS_SWITCH_WRAPPER: 'status-row-' + index + '-el-switch-wrapper',
        STATUS_SWITCH_INPUT: 'status-row-' + index + '-el-switch-input',
        ALERT_NAME: 'datatable-alert-name-' + index,
        APPLICATION: 'datatable-application-' + index,
        CONDITION: 'datatable-condition-' + index,
        CREATED_BY: 'datatable-created-by-' + index,
        MORE_OPTION_BUTTON: 'row-' + index + '-more-option-button',
        MORE_EDIT_OPTION_BUTTON: 'datatable-edit-button-' + index,
        MORE_DELETE_OPTION_BUTTON: 'datatable-delete-button-' + index,

        //PAGINATION ELEMENTS
        ITEMS_PER_PAGE_LABEL: 'alerts-table-items-per-page-label',
        PER_PAGE_COUNT_SELECT: 'alerts-table-items-per-page-count-select-input-pseudo-input-label',
        PER_PAGE_COUNT_SELECT_ICON: 'alerts-table-items-per-page-count-select-icon',
        PER_PAGE_COUNT_LABEL: 'alerts-table-items-per-page-count-select',
        PAGE_NUMBER_SELECT: 'alerts-table-page-number-select-input-pseudo-input-label',
        PAGE_NUMBER_SELECT_ICON: 'alerts-table-page-number-select-icon',
        FIRST_PAGE_ARROW_BUTTON: 'alerts-table-first-page-arrow-button',
        PREVIOUS_PAGE_ARROW_BUTTON: 'alerts-table-previous-page-arrow-button',
        NEXT_PAGE_ARROW_BUTTON: 'alerts-table-next-page-arrow-button',
        LAST_PAGE_ARROW_BUTTON: 'alerts-table-last-page-arrow-button',

        //EMPTY TABLE ELEMENTS
        EMPTY_TABLE_ICON: 'alerts-table-empty-logo',
        EMPTY_TABLE_TITLE: 'alerts-table-empty-title',
        EMPTY_TABLE_SUBTITLE: 'alerts-table-empty-subtitle'
    };
};

module.exports = {
    alertsPageElements,
    alertDrawerPageElements,
    alertDataTableElements
};