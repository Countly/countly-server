import messagingPageElements from "../../../support/elements/dashboard/messaging/messaging";

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
        labelElement: messagingPageElements.TOTAL_APP_USERS_LABEL,
        labelText: "Total App Users"
    });

    cy.verifyElement({
        labelElement: messagingPageElements.NOTIFICATION_ENABLED_USERS_LABEL,
        labelText: "Notification-enabled Users"
    });

    cy.verifyElement({
        labelElement: messagingPageElements.ENABLED_USERS_PERCENTAGE_LABEL,
        labelText: "Enabled Users Percentage",
        tooltipElement: messagingPageElements.ENABLED_USERS_PERCENTAGE_PROGRESS_TOOLTIP,
        tooltipText: "Number of users who have agreed to receive notifications, expressed as a percentage over the total number of app users."
    });

    cy.verifyElement({
        element: messagingPageElements.ENABLED_USERS_PERCENTAGE_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: messagingPageElements.RESULTS_FOR_LABEL,
        labelText: "Results for"
    });

    cy.verifyElement({
        element: messagingPageElements.RESULTS_FOR_COMBOBOX,
    });

    cy.verifyElement({
        element: messagingPageElements.FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: messagingPageElements.EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: messagingPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: messagingPageElements.DATATABLE_SEARCH_INPUT,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: messagingPageElements.TOTAL_APP_USERS_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: messagingPageElements.NOTIFICATION_ENABLED_USERS_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: messagingPageElements.ENABLED_USERS_PERCENTAGE_NUMBER_LABEL,
        labelText: "0%",
    });
    
    cy.verifyElement({
        element: messagingPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: messagingPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: messagingPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements,
};