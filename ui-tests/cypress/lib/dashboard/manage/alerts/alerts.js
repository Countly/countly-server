import {
    alertsPageElements,
    alertDrawerPageElements,
    alertDataTableElements,
} from "../../../../support/elements/dashboard/manage/alerts/alerts";
const { FEATURE_TYPE, EMAIL_NOTIFICATION_TYPE, TRIGGER_METRICS } = require('../../../../support/constants');

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: alertsPageElements.PAGE_TITLE,
        labelText: "Alerts",
        tooltipElement: alertsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of all alerts set up. Create new alerts to receive emails when specific conditions related to metrics are met."
    });

    cy.verifyElement({
        element: alertsPageElements.ADD_NEW_ALERT_BUTTON,
        elementText: 'Add New Alert'
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: alertsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: alertsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: alertsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "Create new alerts to receive emails when specific conditions related to metrics are met.",
    });

    cy.verifyElement({
        element: alertsPageElements.EMPTY_TABLE_ADD_NEW_ALERT_LINK_BUTTON,
        elementText: '+ Create New Alert'
    });
};

const verifyEmptyTableElements = () => {

    cy.verifyElement({
        element: alertDataTableElements().EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: alertDataTableElements().EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: alertDataTableElements().EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const verifyAlertDrawerPageElements = ({
    alertName = null,
    application = null,
    dataType = null,
    subType = null,
    filterType = null,
    filterValue = null,
    triggerMetric = null,
    triggerVariable = null,
    triggerValue = null,
    triggerTime = null,
    emailNotificationType = EMAIL_NOTIFICATION_TYPE.TO_SPECIFIC_ADDRESS,
    email = [],
    isEditPage = false
}) => {

    if (!isEditPage) {
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_PAGE_TITLE,
            labelText: "Create New Alert"
        });
    }
    else {

        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_PAGE_TITLE,
            labelText: "Edit Your Alert"
        });
    }

    cy.verifyElement({
        element: alertDrawerPageElements.DRAWER_CLOSE_BUTTON,
    });

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_ALERT_NAME_LABEL,
        labelText: "Alert Name",
        element: alertDrawerPageElements.DRAWER_ALERT_NAME_INPUT,
        value: alertName,
        elementPlaceHolder: "Enter Alert Name"
    });

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_APPLICATION_LABEL,
        labelText: "Application",
        element: alertDrawerPageElements.DRAWER_APPLICATION_SELECT,
        value: application,
        elementPlaceHolder: "Select an Application"
    });

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_DATA_TYPE_LABEL,
        labelText: "Data Type",
        element: alertDrawerPageElements.DRAWER_DATA_TYPE_SELECT,
        value: dataType,
        elementPlaceHolder: "Select a data type"
    });

    if (dataType != null && subType != null) {
        if (dataType == FEATURE_TYPE.PROFILE_GROUPS || FEATURE_TYPE.EVENTS || FEATURE_TYPE.VIEWS) {
            cy.verifyElement({
                labelElement: alertDrawerPageElements.DRAWER_SUB_TYPE_LABEL,
                labelText: dataType.slice(0, -1), // Views -> View, Events -> Event, Profile Groups -> Profile Group
                element: alertDrawerPageElements.DRAWER_SUB_TYPE_SELECT,
                value: subType,
                elementPlaceHolder: "Select"
            });
        }
        else if (FEATURE_TYPE.RATING) {
            cy.verifyElement({
                labelElement: alertDrawerPageElements.DRAWER_SUB_TYPE_LABEL,
                labelText: 'Widget Name',
                element: alertDrawerPageElements.DRAWER_SUB_TYPE_SELECT,
                value: subType,
                elementPlaceHolder: "Select"
            });
        }
    }

    if (filterType != null || filterValue != null) {
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_FILTER_LABEL,
            labelText: 'Filter'
        });

        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_FILTER_IS_LABEL,
            labelText: 'is',
        });

        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_FILTER_CLOSE_ICON,
        });

        if (dataType == FEATURE_TYPE.CRASHES) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_CRASHES_INPUT,
                value: 'App Version',
            });

            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_CRASHES_SELECT,
                elementPlaceHolder: "Select",
                value: filterValue,
            });
        }
        else if (dataType == FEATURE_TYPE.EVENTS) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_EVENT_SELECT,
                elementPlaceHolder: "Select",
                value: filterType,
            });

            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_EVENT_INPUT,
                elementPlaceHolder: "String",
                value: filterValue,
            });
        }
        else if (dataType == FEATURE_TYPE.RATING) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_RATING_INPUT,
                value: 'Rating',
            });

            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_FILTER_RATING_SELECT,
                elementPlaceHolder: "Select",
                value: filterValue,
            });
        }
    }
    else if (dataType == FEATURE_TYPE.CRASHES || dataType == FEATURE_TYPE.EVENTS || dataType == FEATURE_TYPE.RATING) {
        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_ADD_FILTER_BUTTON,
            elementText: "+ Add Filter"
        });
    }

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_TRIGGER_LABEL,
        labelText: 'Trigger'
    });

    if (dataType == FEATURE_TYPE.CRASHES && triggerMetric == TRIGGER_METRICS.NEW_CRASH_ERROR) {
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_SEND_ALERT_IF_THERE_IS_A_LABEL,
            labelText: 'Send alert if there is a'
        });
    }
    else {
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_SEND_ALERT_IF_LABEL,
            labelText: 'Send alert if'
        });
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_IS_LABEL,
            labelText: 'is'
        });
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_BY_LABEL,
            labelText: 'by'
        });
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_IN_THE_LAST_LABEL,
            labelText: 'in the last'
        });
        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_TRIGGER_DOT_LABEL,
            labelText: '.'
        });

        if (triggerMetric != null) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_METRIC_SELECT,
                value: triggerMetric,
            });
        }
        else {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_METRIC_SELECT,
                elementPlaceHolder: 'metric',
                value: null
            });
        }

        if (triggerVariable != null) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_VARIABLE_SELECT,
                elementText: triggerVariable,
            });
        }
        else {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_VARIABLE_SELECT,
                elementPlaceHolder: 'variable',
                value: null
            });
        }

        if (triggerValue != null) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_VALUE_INPUT,
                elementPlaceHolder: 'value',
                value: triggerValue,
            });
        }
        else {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_VALUE_INPUT,
                elementPlaceHolder: 'value',
                value: '',
            });
        }

        if (triggerTime != null) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_TIME_SELECT,
                elementText: triggerTime,
            });
        }
        else {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_TRIGGER_TIME_SELECT,
                elementPlaceHolder: 'time',
                value: null
            });
        }
    }

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_EMAIL_NOTIFICATION_LABEL,
        labelText: "Email Notification",
    });

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_LABEL,
        labelText: "To specific address",
    });

    cy.verifyElement({
        labelElement: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_DO_NOT_SEND_LABEL,
        labelText: "Don't send for this alert",
    });

    if (emailNotificationType == EMAIL_NOTIFICATION_TYPE.TO_SPECIFIC_ADDRESS) {
        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_RADIO_BUTTON,
            isChecked: true
        });

        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_NOT_SEND_RADIO_BUTTON,
            isChecked: false
        });

        if (!isEditPage) {
            cy.verifyElement({
                element: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_EMAIL_SELECT,
                elementPlaceHolder: 'Enter email address',
            });
        }
        else {
            email.forEach(emailAddress => {
                cy.verifyElement({
                    element: alertDrawerPageElements.DRAWER_EDIT_EMAIL_NOTIF_TO_ADDRESS_EMAIL_INPUT,
                    elementPlaceHolder: 'Enter email address',
                    elementText: emailAddress
                });
            });
        }

    }
    else if (emailNotificationType == EMAIL_NOTIFICATION_TYPE.DO_NOT_SEND_FOR_THIS_ALERT) {
        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_RADIO_BUTTON,
            isChecked: false
        });

        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_NOT_SEND_RADIO_BUTTON,
            isChecked: true
        });

        cy.verifyElement({
            labelElement: alertDrawerPageElements.DRAWER_EMAIL_NOTIF_DO_NOT_SEND_INF_LABEL,
            labelText: 'This alert can only be used within\n                                    Hooks\n                                        to trigger actions.\n'
        });
    }

    cy.verifyElement({
        element: alertDrawerPageElements.DRAWER_CANCEL_BUTTON,
        elementText: "Cancel"
    });

    if (!isEditPage) {
        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_CREATE_BUTTON,
            elementText: "Create"
        });
    }
    else {
        cy.verifyElement({
            element: alertDrawerPageElements.DRAWER_CREATE_BUTTON,
            elementText: "Save Alert"
        });
    }
};

const clickAddNewAlertButton = () => {
    cy
        .elementExists(alertsPageElements.EMPTY_TABLE_ADD_NEW_ALERT_LINK_BUTTON)
        .then((isExists) => {
            if (isExists) {
                verifyEmptyPageElements();
                cy.clickElement(alertsPageElements.EMPTY_TABLE_ADD_NEW_ALERT_LINK_BUTTON);
            }
            else {
                cy.clickElement(alertsPageElements.ADD_NEW_ALERT_BUTTON);
            }
        });
};

//ALERT DRAWER 
const typeAlertName = (alertName) => {
    cy.typeInput(alertDrawerPageElements.DRAWER_ALERT_NAME_INPUT, alertName);
};

const selectApplication = (application) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_APPLICATION_SELECT, application);
};

const selectDataType = (dataType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_DATA_TYPE_SELECT, dataType);
};

const selectSubType = (subType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_SUB_TYPE_SELECT, subType);
};

const selectTriggerMetric = (metricType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_TRIGGER_METRIC_SELECT, metricType);
};

const selectTriggerVariable = (variableType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_TRIGGER_VARIABLE_SELECT, variableType);
};

const typeTriggerValue = (value) => {
    cy.typeInput(alertDrawerPageElements.DRAWER_TRIGGER_VALUE_INPUT, value);
};

const selectTriggerTime = (timeType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_TRIGGER_TIME_SELECT, timeType);
};

const selectToSpecificAddress = (...emailAddress) => {
    cy.clickElement(alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_RADIO_BUTTON);
    cy.clickElement(alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_EMAIL_SELECT);
    cy.typeSelectInput(alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_ADDRESS_EMAIL_INPUT, ...emailAddress);
};

const selectDoNotSendEmail = () => {
    cy.clickElement(alertDrawerPageElements.DRAWER_EMAIL_NOTIF_TO_NOT_SEND_RADIO_BUTTON);
};

const clickAddFilterButton = () => {
    cy.clickElement(alertDrawerPageElements.DRAWER_ADD_FILTER_BUTTON);
};

const selectFilterCrashesAppVersion = (...appVersions) => {
    cy.selectCheckboxOption(alertDrawerPageElements.DRAWER_FILTER_CRASHES_SELECT, ...appVersions);
};

const selectEventFilter = (filterType) => {
    cy.selectListBoxItem(alertDrawerPageElements.DRAWER_FILTER_EVENT_SELECT, filterType);
};

const typeEventFilterValue = (value) => {
    cy.typeInput(alertDrawerPageElements.DRAWER_FILTER_EVENT_INPUT, value);
};

const selectFilterRatingPoints = (...ratingPoints) => {
    cy.selectCheckboxOption(alertDrawerPageElements.DRAWER_FILTER_RATING_SELECT, ...ratingPoints);
};

const clickCloseFilter = () => {
    cy.clickElement(alertDrawerPageElements.DRAWER_FILTER_CLOSE_ICON);
};

const clickCreateButton = () => {
    cy.clickElement(alertDrawerPageElements.DRAWER_CREATE_BUTTON);
};

const clickCancelButton = () => {
    cy.clickElement(alertDrawerPageElements.DRAWER_CANCEL_BUTTON);
};

const verifyAlertSavedNotification = () => {
    cy.verifyElement({
        labelElement: alertsPageElements.NOTIFICATION_ALERT_SAVED_MESSAGE,
        labelText: "Alert saved"
    });
};

const verifyAlertsMetricCardElements = ({
    activeAlertsNumber,
    totalAlertsSentNumber = 0,
    alertsSentTodayNumber = 0
}) => {

    cy.verifyElement({
        labelElement: alertsPageElements.ACTIVE_ALERTS_LABEL,
        labelText: "Active Alerts",
        element: alertsPageElements.ACTIVE_ALERTS_NUMBER_LABEL,
        elementText: activeAlertsNumber
    });

    cy.verifyElement({
        labelElement: alertsPageElements.TOTAL_ALERTS_SENT_LABEL,
        labelText: "Total Alerts Sent",
        element: alertsPageElements.TOTAL_ALERTS_SENT_NUMBER_LABEL,
        //elementText: totalAlertsSentNumber
    });

    cy.verifyElement({
        labelElement: alertsPageElements.ALERTS_SENT_TODAY_LABEL,
        labelText: "Alerts Sent Today",
        element: alertsPageElements.ALERTS_SENT_TODAY_NUMBER_LABEL,
        //elementText: alertsSentTodayNumber
    });
};

const verifyAlertsDataFromTable = ({
    index,
    isActive,
    alertName,
    application,
    condition,
    createdBy = "devops+uitests@count.ly"
}) => {

    cy.verifyElement({
        element: alertDataTableElements().TABLE_APPLICATION_SELECT,
        elementPlaceHolder: 'All Applications',
    });

    cy.verifyElement({
        element: alertDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: alertDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: alertDataTableElements(index).COLUMN_NAME_ALERT_NAME_LABEL,
        isElementVisible: false,
        labelText: "Alert Name",
    });

    cy.verifyElement({
        labelElement: alertDataTableElements().COLUMN_NAME_APPLICATION_LABEL,
        isElementVisible: false,
        labelText: "Application",
    });

    cy.verifyElement({
        labelElement: alertDataTableElements().COLUMN_NAME_CONDITION_LABEL,
        isElementVisible: false,
        labelText: "Condition",
    });

    cy.verifyElement({
        labelElement: alertDataTableElements().COLUMN_NAME_CREATED_BY_LABEL,
        isElementVisible: false,
        labelText: "Created By",
    });

    cy.verifyElement({
        element: alertDataTableElements(index).STATUS_SWITCH_WRAPPER,
        isChecked: isActive
    });

    cy.verifyElement({
        element: alertDataTableElements(index).ALERT_NAME,
        elementText: alertName
    });

    cy.verifyElement({
        element: alertDataTableElements(index).APPLICATION,
        elementText: application
    });

    cy.verifyElement({
        element: alertDataTableElements(index).CONDITION,
        elementText: condition
    });

    cy.verifyElement({
        element: alertDataTableElements(index).CREATED_BY,
        elementText: createdBy
    });
};

const getActiveAlertsCount = () => {
    return cy
        .elementExists(alertsPageElements.EMPTY_TABLE_ADD_NEW_ALERT_LINK_BUTTON)
        .then((isExists) => {
            if (isExists) {
                return 0;
            }
            else {
                return cy.getElement(alertsPageElements.ACTIVE_ALERTS_NUMBER_LABEL)
                    .invoke('text')
                    .then((text) => {
                        return parseInt(text);
                    });
            }
        });
};

const searchAlertOnDataTable = (alertName) => {
    cy.typeInput(alertDataTableElements().TABLE_SEARCH_INPUT, alertName);
};

const clickEdit = (alertName) => {
    searchAlertOnDataTable(alertName);
    cy.clickDataTableMoreButtonItem(alertDataTableElements().MORE_EDIT_OPTION_BUTTON);
};

const deleteAlert = (alertName) => {
    searchAlertOnDataTable(alertName);
    cy.clickDataTableMoreButtonItem(alertDataTableElements().MORE_DELETE_OPTION_BUTTON);
    cy.verifyElement({
        labelElement: alertsPageElements.DELETE_ALERT_MODAL_TITLE,
        labelText: "Confirm to delete this alert?",
        element: alertsPageElements.DELETE_ALERT_MODAL_CLOSE_BUTTON,
    });
    cy.verifyElement({
        element: alertsPageElements.DELETE_ALERT_MODAL_CONTINUE_BUTTON,
        elementText: "Continue",
    });

    cy.verifyElement({
        element: alertsPageElements.DELETE_ALERT_MODAL_CANCEL_BUTTON,
        elementText: "Cancel",
    });

    cy.clickElement(alertsPageElements.DELETE_ALERT_MODAL_CONTINUE_BUTTON);
};

module.exports = {
    verifyEmptyPageElements,
    verifyAlertDrawerPageElements,
    clickAddNewAlertButton,
    typeAlertName,
    selectApplication,
    selectDataType,
    selectSubType,
    selectTriggerMetric,
    selectTriggerVariable,
    typeTriggerValue,
    selectTriggerTime,
    selectToSpecificAddress,
    selectDoNotSendEmail,
    clickCreateButton,
    clickCancelButton,
    clickAddFilterButton,
    selectFilterCrashesAppVersion,
    selectEventFilter,
    typeEventFilterValue,
    selectFilterRatingPoints,
    clickCloseFilter,
    verifyAlertSavedNotification,
    verifyAlertsMetricCardElements,
    verifyAlertsDataFromTable,
    verifyEmptyTableElements,
    searchAlertOnDataTable,
    clickEdit,
    deleteAlert,
    getActiveAlertsCount
};
