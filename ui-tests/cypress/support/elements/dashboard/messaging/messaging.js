export const messagingPageElements = {
    PAGE_TITLE: 'header-title',
    PAGE_TITLE_GUIDE_BUTTON: 'view-guide-button',
    CREATE_NEW_MESSAGE_BUTTON: 'create-new-messsage-button'
};

const messagingMetricCardElements = {
    TOTAL_APP_USERS_LABEL: 'metric-card-total-app-users-column-label',
    TOTAL_APP_USERS_NUMBER_LABEL: 'metric-card-total-app-users-column-number',
    NOTIFICATION_ENABLED_USERS_LABEL: 'metric-card-notification-enabled-users-column-label',
    NOTIFICATION_ENABLED_USERS_NUMBER_LABEL: 'metric-card-notification-enabled-users-column-number',
    ENABLED_USERS_PERCENTAGE_LABEL: 'metric-card-enabled-users-percentage-column-label',
    ENABLED_USERS_PERCENTAGE_NUMBER_LABEL: 'metric-card-enabled-users-percentage-column-number',
    ENABLED_USERS_PERCENTAGE_PROGRESS_CIRCLE: 'el-progress-metric-card-enabled-users-percentage-column',
    ENABLED_USERS_PERCENTAGE_PROGRESS_TOOLTIP: 'metric-card-enabled-users-percentage-column-tooltip',
};

const messagingDataTableElements = (index = 0) => ({
    EMPTY_TABLE_ICON: 'messaging-empty-logo',
    EMPTY_TABLE_TITLE: 'messaging-empty-title',
    EMPTY_TABLE_SUBTITLE: 'messaging-empty-subtitle',

    RESULTS_FOR_LABEL: 'push-notifications-result-for-label',
    RESULTS_FOR_COMBOBOX: 'push-notifications-result-for-combobox',
    FILTER_PARAMETERS_SELECT: 'cly-multi-select-test-id-pseudo-input-label',
    EDIT_COLUMNS_BUTTON: 'cly-datatable-n-test-id-edit-columns-button',

    EXPORT_AS_BUTTON: 'messaging-export-as-button',
    TABLE_SEARCH_INPUT: 'messaging-datatable-search-input',
    TABLE_ROWS: '.el-table__row',

    COLUMN_NAME_CAMPAIGN_NAME_LABEL: 'messaging-label-campaign-name',
    COLUMN_NAME_CAMPAIGN_NAME_SORTABLE_ICON: 'messaging-sortable-icon-campaign-name',
    COLUMN_NAME_STATUS_LABEL: 'messaging-label-status',
    COLUMN_NAME_STATUS_SORTABLE_ICON: 'messaging-sortable-icon-status',
    COLUMN_NAME_SENT_LABEL: 'messaging-label-sent',
    COLUMN_NAME_SENT_SORTABLE_ICON: 'messaging-sortable-icon-sent',
    COLUMN_NAME_ACTIONED_LABEL: 'messaging-label-actioned',
    COLUMN_NAME_ACTIONED_SORTABLE_ICON: 'messaging-sortable-icon-actioned',
    COLUMN_NAME_DATE_SENT_SCHEDULED_LABEL: 'messaging-label-date-sent/scheduled',
    COLUMN_NAME_DATE_SENT_SCHEDULED_SORTABLE_ICON: 'messaging-sortable-icon-date-sent/scheduled',

    //Columns' Rows' Datas Elements 
    CAMPAIGN_NAME: 'datatable-messaging-campaign-name-' + index,
    PLATFORM: 'datatable-messaging-platform-name-' + index,
    CAMPAIGN_NAME_BLINKER: 'datatable-messaging-campaign-name-blinker-' + index,
    CREATED_BY: 'datatable-messaging-created-by-' + index,
    STATUS: 'datatable-messaging-status-' + index,
    SENT: 'datatable-messaging-sent-' + index,
    ACTIONED: 'datatable-messaging-actioned-value-' + index,
    ACTIONED_DIVIDER: 'datatable-messaging-actioned-divider-' + index,
    ACTIONED_PERCENTAGE: 'datatable-messaging-actioned-percentage-' + index,
    DATE_SENT: 'datatable-messaging-date-sent-' + index,
    SCHEDULED: 'datatable-messaging-scheduled-' + index,

    //PAGINATION ELEMENTS
    ITEMS_PER_PAGE_LABEL: 'messaging-items-per-page-label',
    PER_PAGE_COUNT_SELECT: 'messaging-items-per-page-count-select-input-pseudo-input-label',
    PER_PAGE_COUNT_SELECT_ICON: 'messaging-items-per-page-count-select-icon',
    PER_PAGE_COUNT_LABEL: 'messaging-items-per-page-count-select',
    PAGE_NUMBER_SELECT: 'messaging-page-number-select-input-pseudo-input-label',
    PAGE_NUMBER_SELECT_ICON: 'messaging-page-number-select-icon',
    FIRST_PAGE_ARROW_BUTTON: 'messaging-first-page-arrow-button',
    PREVIOUS_PAGE_ARROW_BUTTON: 'messaging-previous-page-arrow-button',
    NEXT_PAGE_ARROW_BUTTON: 'messaging-next-page-arrow-button',
    LAST_PAGE_ARROW_BUTTON: 'messaging-views-last-page-arrow-button'
});

module.exports = {
    messagingPageElements,
    messagingMetricCardElements,
    messagingDataTableElements
};