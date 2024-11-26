import {
    messagingPageElements,
    messagingMetricCardElements,
    messagingChartElements,
    messagingDataTableElements
} from "../../../support/elements/dashboard/messaging/messaging";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: messagingPageElements.PAGE_TITLE,
        labelText: "Push Notifications"
    });

    cy.verifyElement({
        element: messagingPageElements.PAGE_TITLE_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: messagingPageElements.CREATE_NEW_MESSAGE_BUTTON,
        elementText: 'New Message'
    });

    cy.verifyElement({
        element: messagingPageElements.TAB_ONE_TIME_NOTIFICATIONS,
        elementText: "One-time Notifications",
    });

    cy.verifyElement({
        element: messagingPageElements.TAB_AUTOMATED_NOTIFICATIONS,
        elementText: "Automated Notifications",
    });

    cy.verifyElement({
        element: messagingPageElements.TAB_API_NOTIFICATIONS,
        elementText: "API Notifications",
    });

    cy.verifyElement({
        labelElement: messagingMetricCardElements.TOTAL_APP_USERS_LABEL,
        labelText: "Total App Users"
    });

    cy.verifyElement({
        labelElement: messagingMetricCardElements.NOTIFICATION_ENABLED_USERS_LABEL,
        labelText: "Notification-enabled Users"
    });

    cy.verifyElement({
        labelElement: messagingMetricCardElements.ENABLED_USERS_PERCENTAGE_LABEL,
        labelText: "Enabled Users Percentage",
        tooltipElement: messagingMetricCardElements.ENABLED_USERS_PERCENTAGE_PROGRESS_TOOLTIP,
        tooltipText: "Number of users who have agreed to receive notifications, expressed as a percentage over the total number of app users."
    });

    cy.verifyElement({
        element: messagingMetricCardElements.ENABLED_USERS_PERCENTAGE_PROGRESS_CIRCLE,
    });

    cy.clickElement(messagingPageElements.TAB_ONE_TIME_NOTIFICATIONS);

    cy.verifyElement({
        labelElement: messagingChartElements.FILTER_PARAMETERS_SELECT_LABEL,
        labelText: "One-time notifications for",
        element: messagingChartElements.FILTER_PARAMETERS_SELECT,
        elementText: "All Platforms"
    });

    cy.verifyElement({
        element: messagingDataTableElements().FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: messagingDataTableElements().EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_CAMPAIGN_NAME_LABEL,
        isElementVisible: false,
        elementText: "Notification name",
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_CAMPAIGN_NAME_SORTABLE_ICON,
        isElementVisible: false
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_STATUS_LABEL,
        elementText: "Status",
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_STATUS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_SENT_LABEL,
        elementText: "Sent",
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_SENT_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_ACTIONED_LABEL,
        elementText: "Actioned",
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_ACTIONED_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_DATE_SENT_SCHEDULED_LABEL,
        elementText: "Date Sent/Scheduled",
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_DATE_SENT_SCHEDULED_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: messagingDataTableElements().COLUMN_NAME_CREATED_LABEL,
        elementText: "Created",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyMessagingMetricCard({
        isEmpty: true,
    });

    verifyGraphElements({
        isEmpty: true,
    });

    verifyMessagingDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyMessagingMetricCard({
        isEmpty: false,
    });

    // verifyGraphElements({ //TODO: Data is not being generated with the populator. Need to generate the data
    //     isEmpty: false,
    // });

    verifyMessagingDataFromTable({
        isEmpty: false,
    });
};

const verifyGraphElements = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: messagingChartElements.EMPTY_CHART_ICON,
        });

        cy.verifyElement({
            labelElement: messagingChartElements.EMPTY_CHART_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: messagingChartElements.EMPTY_CHART_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: messagingChartElements.ECHART,
    });
};

const verifyMessagingMetricCard = ({
    isEmpty = false,
    totalAppUsersNumber = null,
    enabledUsersNumber = null,
    enabledUsersPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: messagingMetricCardElements.TOTAL_APP_USERS_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: messagingMetricCardElements.NOTIFICATION_ENABLED_USERS_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: messagingMetricCardElements.ENABLED_USERS_PERCENTAGE_NUMBER_LABEL,
            labelText: "0%",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingMetricCardElements.TOTAL_APP_USERS_NUMBER_LABEL,
        elementText: totalAppUsersNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingMetricCardElements.NOTIFICATION_ENABLED_USERS_NUMBER_LABEL,
        elementText: enabledUsersNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingMetricCardElements.ENABLED_USERS_PERCENTAGE_NUMBER_LABEL,
        elementText: enabledUsersPercentage,
    });
};

const verifyMessagingDataFromTable = ({
    index = 0,
    isEmpty = false,
    campaignName = null,
    platform = null,
    createdBy = null,
    status = null,
    sent = null,
    actionedNumber = null,
    actionedPercentage = null,
    dateSent = null,
    dateScheduled = null,
    createdDate = null,
    createdTime = null,
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: messagingDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: messagingDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: messagingDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).CAMPAIGN_NAME,
        elementText: campaignName
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).PLATFORM,
        elementText: platform
    });

    cy.verifyElement({
        element: messagingDataTableElements(index).CAMPAIGN_NAME_BLINKER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).CREATED_BY,
        elementText: createdBy
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).STATUS,
        elementText: status
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).SENT,
        elementText: sent
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).ACTIONED,
        elementText: actionedNumber
    });

    cy.verifyElement({
        element: messagingDataTableElements(index).ACTIONED_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).ACTIONED_PERCENTAGE,
        elementText: actionedPercentage
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).DATE_SENT,
        elementText: dateSent
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).SCHEDULED,
        elementText: dateScheduled
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).CREATED_DATE,
        elementText: createdDate
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: messagingDataTableElements(index).CREATED_TIME,
        elementText: createdTime
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyMessagingMetricCard,
    verifyGraphElements,
    verifyMessagingDataFromTable
};