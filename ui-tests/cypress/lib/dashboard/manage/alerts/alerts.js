import alertsPageElements from "../../../../support/elements/dashboard/manage/alerts/alerts";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: alertsPageElements.PAGE_TITLE,
        labelText: "Alerts",
        tooltipElement: alertsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of all alerts set up. Create new alerts to receive emails when<br /> specific conditions related to metrics are met."
    });

    cy.verifyElement({
        element: alertsPageElements.ADD_NEW_ALERT_BUTTON,
        elementText: 'Add New Alert'
    });
}

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

module.exports = {
    verifyEmptyPageElements
};